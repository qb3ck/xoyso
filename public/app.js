import { MAP } from './map-data.js';
import { SUPABASE_URL, SUPABASE_KEY, TOPICS, SECTIONS, CONNECTIONS } from './config.js';

/* ---------------------------------------------------------------- helpers */
const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');
const SVGNS = 'http://www.w3.org/2000/svg';
const ROUND_LENGTH = 10;
const MASTERED_STREAK = 3;

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}
function s(tag, attrs = {}) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  return el;
}
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } },
};
let toastTimer;
function toast(msg, ms = 2200) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const plain = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

/* --- language: Spanish on screen, English on hover (title) or with the EN button --- */
let lang = store.get('geo.lang') === 'en' ? 'en' : 'es';
const L = (es, en) => (lang === 'es' ? es : en);             // plain string in the current language
const Lp = (pair) => L(pair[0], pair[1]);
function tr(es, en) {                                          // text that shows the other language on hover
  if (Array.isArray(es)) [es, en] = es;
  const el = h('span', { class: 'tr', 'data-es': es, 'data-en': en, title: L(en, es) });
  el.textContent = L(es, en); return el;
}
function setLang(l) {
  lang = l; store.set('geo.lang', l); document.documentElement.lang = l;
  document.querySelectorAll('.tr').forEach((el) => { el.textContent = L(el.dataset.es, el.dataset.en); el.title = L(el.dataset.en, el.dataset.es); });
  const b = $('#langBtn'); b.setAttribute('aria-pressed', String(l === 'en')); b.title = l === 'en' ? 'Volver a español' : 'Show in English';
  document.querySelectorAll('[data-ph-es]').forEach((el) => { el.placeholder = L(el.dataset.phEs, el.dataset.phEn); });
}

/* ------------------------------------------------------------ backend API */
const ERRORS = {
  wrong_login: ['El nombre y el PIN no coinciden. Inténtalo otra vez.', 'That name and PIN don’t match. Try again.'],
  username_taken: ['Ese nombre ya existe. Elige otro o entra con él.', 'That name is already taken. Pick another, or sign in.'],
  bad_username: ['El nombre puede tener letras, números y _ (de 2 a 20).', 'Names can use letters, numbers and _ (2–20 characters).'],
  bad_code: ['Ese código no es correcto. Pídeselo a tu familia.', 'That code isn’t right. Ask your family for it.'],
  wrong_pin: ['Ese no es tu PIN actual.', 'That isn’t your current PIN.'],
  bad_pin: ['El PIN tiene que tener de 4 a 6 cifras.', 'The PIN needs to be 4 to 6 digits.'],
  locked: ['Demasiados intentos. Espera 5 minutos.', 'Too many tries. Wait 5 minutes and try again.'],
  not_signed_in: ['Vuelve a entrar, por favor.', 'Please sign in again.'],
  offline: ['No hay conexión a internet. Revisa el wifi.', 'No internet connection. Check the Wi-Fi and try again.'],
  generic: ['Algo ha fallado. Inténtalo otra vez.', 'Something went wrong. Please try again.'],
};
async function api(fn, args) {
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
  } catch {
    throw Object.assign(new Error(Lp(ERRORS.offline)), { offline: true });
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const code = data?.message;
    const err = new Error(Lp(ERRORS[code] || ERRORS.generic));
    err.code = code; throw err;
  }
  return data;
}

/* ------------------------------------------------------- session/progress */
const state = {
  session: store.get('geo.session'), // { token, username }
  progress: new Map(),               // item_id -> { correct, wrong, streak }
};
const pendingKey = 'geo.pending';

async function loadProgress() {
  const data = await api('get_progress', { p_token: state.session.token });
  state.progress = new Map(data.items.map((r) => [r.item_id, r]));
  if (state.session && (data.year || null) !== (state.session.year || null)) { state.session.year = data.year || null; store.set('geo.session', state.session); }
}
function localRecord(itemId, correct) {
  const r = state.progress.get(itemId) || { item_id: itemId, correct: 0, wrong: 0, streak: 0 };
  if (correct) { r.correct++; r.streak++; } else { r.wrong++; r.streak = 0; }
  state.progress.set(itemId, r);
}
async function recordAnswer(itemId, correct) {
  localRecord(itemId, correct);
  const queue = store.get(pendingKey) || [];
  queue.push({ itemId, correct });
  store.set(pendingKey, queue);
  flushPending();
}
let flushing = false;
async function flushPending() {
  if (flushing || !state.session) return;
  flushing = true;
  try {
    let queue = store.get(pendingKey) || [];
    while (queue.length) {
      const { itemId, correct } = queue[0];
      await api('record_answer', { p_token: state.session.token, p_item_id: itemId, p_correct: correct });
      queue = (store.get(pendingKey) || []).slice(1);
      store.set(pendingKey, queue);
    }
  } catch (e) {
    if (e.code === 'not_signed_in') signOut(true);
    // offline: answers stay queued and are sent next time
  } finally { flushing = false; }
}
window.addEventListener('online', flushPending);

function stats(itemId) {
  return state.progress.get(itemId) || { correct: 0, wrong: 0, streak: 0 };
}
function level(itemId) {
  const p = stats(itemId);
  if (p.correct + p.wrong === 0) return 'new';
  if (p.streak >= MASTERED_STREAK) return 'mastered';
  return 'learning';
}
const LEVEL_LABEL = { new: ['Sin intentar', 'Not tried yet'], learning: ['Aprendiendo', 'Learning'], mastered: ['Dominado', 'Mastered'] };
function topicSummary(topic) {
  const levels = topic.items.map((it) => level(`${topic.id}:${it.id}`));
  return { mastered: levels.filter((l) => l === 'mastered').length, total: levels.length };
}
// Items he gets wrong, hasn't tried, or hasn't mastered come up more often.
function pickRound(topic, n) {
  const pool = topic.items.map((it) => {
    const p = stats(`${topic.id}:${it.id}`);
    const tries = p.correct + p.wrong;
    let w = 1;
    if (tries === 0) w += 2;
    w += 4 * (p.wrong / (tries + 1));
    if (p.streak < MASTERED_STREAK) w += 2 - Math.min(p.streak, 2) * 0.5;
    return { it, w };
  });
  const out = [];
  while (out.length < Math.min(n, topic.items.length)) {
    const total = pool.reduce((a, b) => a + b.w, 0);
    let r = Math.random() * total, i = 0;
    while ((r -= pool[i].w) > 0) i++;
    out.push(pool.splice(i, 1)[0].it);
  }
  return out;
}

/* ----------------------------------------------------------------- map view */
const parsed = new Map();
function geometry(key) {
  if (parsed.has(key)) return parsed.get(key);
  const item = MAP.items[key];
  const parts = item.d.split(/(?=M)/).map((seg) =>
    seg.replace(/[MZ]/g, '').split('L').map((p) => p.split(',').map(Number)));
  // label anchor: middle point of the longest part
  const longest = parts.reduce((a, b) => (b.length > a.length ? b : a));
  const g = { kind: item.kind, parts, box: item.box, inset: !!item.inset, anchor: item.a || longest[Math.floor(longest.length / 2)] };
  parsed.set(key, g); return g;
}
function distToSeg(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function inRing(px, py, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function distance(key, x, y) {
  const g = geometry(key);
  if (g.kind === 'point') return Math.hypot(x - g.parts[0][0][0], y - g.parts[0][0][1]);
  if (g.kind === 'area' && g.parts.some((r) => inRing(x, y, r))) return 0;
  let best = Infinity;
  for (const part of g.parts) for (let i = 1; i < part.length; i++) best = Math.min(best, distToSeg(x, y, part[i - 1], part[i]));
  return best;
}

class MapView {
  constructor(topic, { onTap, showCities = true, hide = false, blank = false } = {}) {
    this.topic = topic; this.onTap = onTap;
    this.full = [0, 0, MAP.width, MAP.height];
    this.vb = [...this.full];
    this.el = h('div', { class: 'map-wrap' });
    const svg = this.svg = s('svg', { class: `map${blank ? ' blank' : ''}${hide ? ' hide-items' : ''}${hide && topic.id === 'relief' ? ' hide-relief' : ''}`, viewBox: this.full.join(' '), role: 'img', 'aria-label': L('Mapa de España', 'Map of Spain') });
    svg.append(
      s('rect', { x: -200, y: -200, width: MAP.width + 400, height: MAP.height + 400, class: 'sea' }),
      s('path', { d: MAP.neighbours, class: 'land-other' }),
      s('path', { d: MAP.spain, class: 'land-spain' }),
      s('path', { d: MAP.bg.meseta, class: 'bg-meseta' }),
      s('path', { d: MAP.bg.depr, class: 'bg-depr' }),
      s('path', { d: MAP.bg.ranges, class: 'bg-ranges' }),
      s('path', { d: MAP.regions, class: 'regions' }),
    );
    this.areasG = s('g', { class: 'areas' }); svg.append(this.areasG);
    if (topic.id !== 'rivers') {   // rivers are always visible, so he can see them running between the mountains
      svg.append(s('path', { d: Object.entries(MAP.items).filter(([k]) => k.startsWith('rivers:')).map(([, v]) => v.d).join(''), class: 'bg-rivers' }));
    }
    const I = MAP.inset;
    svg.append(s('rect', { x: I.x, y: I.y, width: I.w, height: I.h, class: 'inset-box' }), s('path', { d: I.land, class: 'land-spain inset-land' }));
    const il = s('text', { x: I.x + I.w - 6, y: I.y + I.h - 6, class: 'inset-label' }); il.textContent = I.label; svg.append(il);
    this.labelsBg = s('g', { class: 'place-labels' });
    for (const c of MAP.countryLabels) {
      const t = s('text', { x: c.x, y: c.y, class: c.name === c.name.toUpperCase() ? 'country' : 'sea-label' }); t.textContent = c.name; this.labelsBg.append(t);
    }
    svg.append(this.labelsBg);
    this.itemsG = s('g', { class: 'items' });
    this.paths = new Map();
    for (const it of topic.items) {
      const key = `${topic.id}:${it.id}`; const item = MAP.items[key];
      if (!item) { console.warn('No map shape for', key); continue; }
      const p = s('path', { d: item.d, class: `item ${item.kind} t-${topic.id}`, 'data-id': it.id });
      this.paths.set(it.id, p); this.itemsG.append(p);
    }
    svg.append(this.itemsG);
    this.placesG = s('g', { class: 'places' }); svg.append(this.placesG);
    this.citiesG = s('g', { class: 'cities' });
    if (showCities) for (const c of MAP.cities) {
      const g = s('g', { transform: `translate(${c.x} ${c.y})` });
      g.append(s('circle', { r: 2.6, class: 'city-dot' }));
      const t = s('text', { x: 5, y: 3.5, class: 'city-label' }); t.textContent = c.name; g.append(t);
      this.citiesG.append(g);
    }
    svg.append(this.citiesG);
    this.zonesG = s('g', { class: 'zones' }); svg.append(this.zonesG);
    this.labelsG = s('g', { class: 'item-labels' });
    svg.append(this.labelsG);
    this.el.append(svg, this.controls());
    this.bindGestures();
    this.applyViewBox();
  }
  controls() {
    const btn = (label, title, fn) => h('button', { class: 'zoom-btn', title, 'aria-label': title, onclick: (e) => { e.stopPropagation(); fn(); } }, label);
    return h('div', { class: 'zoom-controls' },
      btn('+', L('Acercar', 'Zoom in'), () => this.zoomBy(0.7)),
      btn('−', L('Alejar', 'Zoom out'), () => this.zoomBy(1 / 0.7)),
      btn(h('span', { html: '<svg viewBox="0 0 20 20" width="18" height="18"><path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" fill="none" stroke="currentColor" stroke-width="2"/></svg>' }), L('Ver toda España', 'Show all of Spain'), () => this.reset(true)));
  }
  get k() { return this.vb[2] / MAP.width; } // 1 = fully zoomed out
  applyViewBox() {
    this.svg.setAttribute('viewBox', this.vb.map((v) => v.toFixed(2)).join(' '));
    const k = this.k;
    this.svg.style.setProperty('--k', k);
    this.citiesG.querySelectorAll('circle').forEach((c) => c.setAttribute('r', 2.6 * Math.sqrt(k)));
    this.citiesG.querySelectorAll('g').forEach((g) => {
      const t = g.querySelector('text'); t.setAttribute('x', 5 * k); t.setAttribute('y', 3.5 * k);
    });
  }
  clamp() {
    const [, , w, hgt] = this.vb; const minW = MAP.width / 8;
    if (w > MAP.width) { this.vb = [...this.full]; return; }
    if (w < minW) { const c = [this.vb[0] + w / 2, this.vb[1] + hgt / 2]; const f = minW / w; this.vb = [c[0] - minW / 2, c[1] - (hgt * f) / 2, minW, hgt * f]; }
    const [x, y, ww, hh] = this.vb;
    this.vb[0] = Math.max(-ww * 0.25, Math.min(x, MAP.width - ww * 0.75));
    this.vb[1] = Math.max(-hh * 0.25, Math.min(y, MAP.height - hh * 0.75));
  }
  zoomBy(f, cx, cy) {
    const [x, y, w, hgt] = this.vb;
    cx ??= x + w / 2; cy ??= y + hgt / 2;
    this.vb = [cx - (cx - x) * f, cy - (cy - y) * f, w * f, hgt * f];
    this.clamp(); this.applyViewBox();
  }
  animateTo(target, ms = 450) {
    const from = [...this.vb]; const t0 = performance.now();
    cancelAnimationFrame(this.anim);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms); const e = 1 - Math.pow(1 - t, 3);
      this.vb = from.map((v, i) => v + (target[i] - v) * e); this.applyViewBox();
      if (t < 1) this.anim = requestAnimationFrame(step);
    };
    this.anim = requestAnimationFrame(step);
  }
  reset(animate) { animate ? this.animateTo([...this.full]) : (this.vb = [...this.full], this.applyViewBox()); }
  // Zoom so that a small item is easy to see; big items keep the whole map.
  focus(itemId) {
    if (this.topic.id === 'rivers') { this.reset(true); return; }   // rivers: always keep the whole map in view
    const box = geometry(`${this.topic.id}:${itemId}`).box;
    const bw = box[2] - box[0], bh = box[3] - box[1];
    if (Math.max(bw, bh) > 220) { this.reset(true); return; }
    if (geometry(`${this.topic.id}:${itemId}`).inset) {
      const I = MAP.inset, w = I.w * 1.7, hgt = w * (MAP.height / MAP.width);
      const save = this.vb; this.vb = [I.x + I.w / 2 - w / 2, I.y + I.h / 2 - hgt / 2, w, hgt]; this.clamp(); const t = this.vb; this.vb = save;
      this.animateTo(t); return;
    }
    const w = Math.max(360, bw * 2.4), hgt = w * (MAP.height / MAP.width);
    const cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2;
    const target = [cx - w / 2, cy - hgt / 2, w, hgt];
    const save = this.vb; this.vb = target; this.clamp(); const t = this.vb; this.vb = save;
    this.animateTo(t);
  }
  toSvg(clientX, clientY) {
    const pt = this.svg.createSVGPoint(); pt.x = clientX; pt.y = clientY;
    const p = pt.matrixTransform(this.svg.getScreenCTM().inverse()); return [p.x, p.y];
  }
  pxPerUnit() { return this.svg.getBoundingClientRect().width / this.vb[2]; }
  hitTest(clientX, clientY, maxPx = 26) {
    const [x, y] = this.toSvg(clientX, clientY); const ppu = this.pxPerUnit();
    let best = null, bestD = Infinity;
    const I = MAP.inset, inInset = x >= I.x && x <= I.x + I.w && y >= I.y && y <= I.y + I.h;
    for (const it of this.topic.items) {
      if (!this.paths.has(it.id)) continue;
      if (geometry(`${this.topic.id}:${it.id}`).inset !== inInset) continue;   // Canary shapes only count inside the inset box
      const d = distance(`${this.topic.id}:${it.id}`, x, y) * ppu;
      if (d < bestD) { bestD = d; best = it.id; }
    }
    return bestD <= maxPx ? best : null;
  }
  bindGestures() {
    const svg = this.svg; const pointers = new Map(); let start = null, pinch = null;
    svg.addEventListener('pointerdown', (e) => {
      svg.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (pointers.size === 1) start = { x: e.clientX, y: e.clientY, t: performance.now(), vb: [...this.vb], moved: false };
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), vb: [...this.vb], c: this.toSvg((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) };
        if (start) start.moved = true;
      }
    });
    svg.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (pointers.size === 2 && pinch) {
        const [a, b] = [...pointers.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        const f = pinch.d / d; const [x, y, w, hgt] = pinch.vb; const [cx, cy] = pinch.c;
        this.vb = [cx - (cx - x) * f, cy - (cy - y) * f, w * f, hgt * f]; this.clamp(); this.applyViewBox();
      } else if (pointers.size === 1 && start) {
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (Math.hypot(dx, dy) > 8) start.moved = true;
        if (start.moved && this.k < 0.999) {
          const ppu = this.svg.getBoundingClientRect().width / start.vb[2];
          this.vb = [start.vb[0] - dx / ppu, start.vb[1] - dy / ppu, start.vb[2], start.vb[3]]; this.clamp(); this.applyViewBox();
        }
      }
    });
    const end = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 0 && start) {
        if (!start.moved && e.type === 'pointerup' && this.onTap) this.onTap(this.hitTest(e.clientX, e.clientY), e);
        start = null;
      }
    };
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
    svg.addEventListener('wheel', (e) => {
      e.preventDefault(); const [x, y] = this.toSvg(e.clientX, e.clientY);
      this.zoomBy(Math.exp(e.deltaY * 0.0015), x, y);
    }, { passive: false });
  }
  /* --- state of items --- */
  setClass(itemId, cls) { this.paths.get(itemId)?.setAttribute('class', `item ${MAP.items[`${this.topic.id}:${itemId}`].kind} t-${this.topic.id} ${cls || ''}`.trim()); if (cls) this.itemsG.append(this.paths.get(itemId)); }
  clearAll() { for (const id of this.paths.keys()) this.setClass(id, ''); this.labelsG.replaceChildren(); this.zonesG.replaceChildren(); }
  dimOthers(on) { this.itemsG.classList.toggle('dim', on); }
  label(itemId, text, cls = '') {
    this.labelsG.querySelector(`[data-id="${itemId}"]`)?.remove();
    const [x, y] = geometry(`${this.topic.id}:${itemId}`).anchor;
    const t = s('text', { x, y, class: `item-label ${cls}`, 'data-id': itemId }); t.textContent = text;
    this.labelsG.append(t);
  }
  // "Pointing" is forgiving: anywhere in the general area counts (in map units, so independent of zoom)
  tol(itemId) { const k = geometry(`${this.topic.id}:${itemId}`).kind; return k === 'area' ? 28 : k === 'point' ? 45 : 60; }
  near(itemId, x, y) { return distance(`${this.topic.id}:${itemId}`, x, y) <= this.tol(itemId); }
  zone(itemId) {   // draws the accepted area as a soft band/circle around the answer
    const key = `${this.topic.id}:${itemId}`, g = geometry(key), t = this.tol(itemId);
    const z = g.kind === 'point' ? s('circle', { cx: g.parts[0][0][0], cy: g.parts[0][0][1], r: t, class: 'zone' })
      : s('path', { d: MAP.items[key].d, class: `zone ${g.kind}`, style: `stroke-width:${t * 2}px` });
    this.zonesG.replaceChildren(z);
  }
  // --- clue helpers for the Conexiones questions ---
  showClue(q) {
    this.areasG.replaceChildren(...q.areas.map((a) => s('path', { d: MAP.areas[a], class: 'clue-area' })));
    this.placesG.replaceChildren(...q.places.flatMap((id) => {
      const pl = MAP.places[id], dot = s('circle', { cx: pl.x, cy: pl.y, r: 5 * Math.sqrt(this.k) + 1, class: 'place-dot' });
      const t = s('text', { x: pl.x + 8 * this.k, y: pl.y - 6 * this.k, class: 'place-label' }); t.textContent = pl.name; return [dot, t];
    }));
  }
  showRefs(q) {   // the items the question mentions, drawn and named
    for (const ref of q.refs) {
      const [tp, id] = ref.split(':');
      if (this.itemsG.querySelector(`[data-ref="${ref}"]`)) continue;
      this.drawShape(ref, 'ref').setAttribute('data-ref', ref);
      this.labelKey(ref, topicById(tp).items.find((x) => x.id === id).name, 'ref');
    }
  }
  drawShape(key, cls) {
    const item = MAP.items[key], [tp] = key.split(':');
    const el = s('path', { d: item.d, class: `item ${item.kind} t-${tp} ${cls}` }); this.itemsG.append(el); return el;
  }
  labelKey(key, text, cls = '') {
    const [x, y] = geometry(key).anchor, t = s('text', { x, y, class: `item-label ${cls}` }); t.textContent = text; this.labelsG.append(t);
  }
  marker(x, y, cls) { this.labelsG.append(s('circle', { cx: x, cy: y, r: 6 * this.k + 2, class: `tap-marker ${cls}` })); }
  removeLabel(itemId) { this.labelsG.querySelector(`[data-id="${itemId}"]`)?.remove(); }
}

/* ------------------------------------------------------------------ screens */
function setUserArea() {
  const signedIn = !!state.session;
  $('#userArea').hidden = !signedIn;
  if (signedIn) $('#userChip').textContent = state.session.username;
}
function screen(...children) { app.replaceChildren(...children); window.scrollTo(0, 0); }
const gd = (topic) => (topic.g === 'f' ? { el: 'la', un: 'una', o: 'a', cada: 'cada' } : { el: 'el', un: 'un', o: 'o', cada: 'cada' });
const art = (topic, it) => `${Lp(it.article || topic.article)} ${it.name}`;          // "el Ebro"
const artCap = (topic, it) => `${Lp(it.articleCap || topic.articleCap)} ${it.name}`; // "El Ebro"
const subsections = () => SECTIONS.flatMap((g) => g.children);
const sectionOf = (topic) => subsections().find((c) => c.topics.includes(topic)) || subsections()[0];
const scopedQuestions = (section) => CONNECTIONS.filter((q) => section.topics.some((t) => t.id === q.topic));
const examSize = (section) => Math.min(20, section.topics.reduce((n, t) => n + t.items.length, 0));
const bestKey = (section) => `geo.examBest.${section.id}`;
const tipEl = (it) => (it.tip ? h('div', { class: 'tip' },
  h('p', {}, h('strong', {}, tr('💡 Truco: ', '💡 Memory tip: ')), tr(it.tip)),
  it.silly ? h('p', { class: 'silly' }, h('strong', {}, tr('🤪 Para recordarlo: ', '🤪 Silly way to remember: ')), tr(it.silly)) : null) : null);
const both = (fn) => [((l) => { const o = lang; lang = l; const r = fn(); lang = o; return r; })('es'), ((l) => { const o = lang; lang = l; const r = fn(); lang = o; return r; })('en')];

function renderLogin(mode = 'signin', message = null) {
  setUserArea(); setCrumbs();
  let pin = '';
  const signin = mode === 'signin';
  const nameInput = h('input', { id: 'username', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', maxlength: 20,
    placeholder: L('p. ej. sam', 'e.g. sam'), 'data-ph-es': 'p. ej. sam', 'data-ph-en': 'e.g. sam' });
  const codeInput = h('input', { id: 'signupcode', inputmode: 'numeric', autocomplete: 'off', maxlength: 12, placeholder: '•••••' });
  const dots = h('div', { class: 'pin-dots', 'aria-label': 'PIN' });
  const err = h('p', { class: 'form-error', role: 'alert' }, message ? tr(message) : '');
  let year = null;
  const yearBtns = [['3primaria', ['3º Primaria', '3rd Primary']], ['1eso', ['1º ESO', '1st ESO']]].map(([id, t]) => h('button', { type: 'button', class: 'btn option', 'aria-pressed': 'false', onclick: (e) => { year = id; yearBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); err.replaceChildren(); } }, tr(t)));
  const yearRow = h('div', { class: 'row', role: 'group' }, ...yearBtns);
  const btnText = signin ? ['Entrar', 'Sign in'] : ['Crear jugador', 'Create player'];
  const submit = h('button', { class: 'btn primary wide', type: 'submit' }, tr(btnText));
  const drawDots = () => { dots.replaceChildren(...Array.from({ length: Math.max(4, pin.length) }, (_, i) => h('span', { class: i < pin.length ? 'on' : '' }))); };
  const press = (d) => { if (d === 'del') pin = pin.slice(0, -1); else if (pin.length < 6) pin += d; drawDots(); err.replaceChildren(); };
  const pad = h('div', { class: 'pinpad' },
    ...['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => h('button', { type: 'button', onclick: () => press(d) }, d)),
    h('span'), h('button', { type: 'button', onclick: () => press('0') }, '0'),
    h('button', { type: 'button', 'aria-label': L('Borrar', 'Delete'), onclick: () => press('del') }, '⌫'));
  document.onkeydown = (e) => {
    if (document.activeElement === nameInput || document.activeElement === codeInput) return;
    if (/^[0-9]$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del');
  };
  drawDots();
  const fail = (pair) => { err.replaceChildren(tr(pair)); };
  const form = h('form', { class: 'card login-card', onsubmit: async (e) => {
    e.preventDefault(); err.replaceChildren();
    const username = nameInput.value.trim().toLowerCase();
    if (!username) { fail(['Primero escribe tu nombre.', 'Type your name first.']); nameInput.focus(); return; }
    if (!signin && !codeInput.value.trim()) { fail(['Escribe el código de registro.', 'Enter the sign-up code.']); codeInput.focus(); return; }
    if (!signin && !year) { fail(['Elige tu curso.', 'Choose your year.']); return; }
    if (pin.length < 4) { fail(['Escribe un PIN de al menos 4 cifras.', 'Enter a PIN of at least 4 digits.']); return; }
    submit.disabled = true; submit.replaceChildren(tr('Un momento…', 'Just a moment…'));
    try {
      const res = await api(signin ? 'login_player' : 'register_player', signin ? { p_username: username, p_pin: pin } : { p_username: username, p_pin: pin, p_code: codeInput.value.trim(), p_year: year });
      state.session = { token: res.token, username: res.username, year: res.year || null }; store.set('geo.session', state.session);
      document.onkeydown = null;
      await loadProgress(); flushPending(); renderHome();
    } catch (ex) {
      fail(ERRORS[ex.code] || (ex.offline ? ERRORS.offline : ERRORS.generic)); pin = ''; drawDots();
      submit.disabled = false; submit.replaceChildren(tr(btnText));
    }
  } },
    h('h1', {}, tr(signin ? ['¡Hola! Entra', 'Hi! Sign in'] : ['Nuevo jugador', 'New player'])),
    h('p', { class: 'muted' }, tr(signin
      ? ['Entra para seguir donde lo dejaste.', 'Sign in to carry on where you left off.']
      : ['Elige un nombre y un PIN que recuerdes. Tu progreso se guarda con este nombre.', 'Choose a name and a PIN you’ll remember. Your progress is saved under this name.'])),
    h('label', { for: 'username' }, tr('Tu nombre', 'Your name')), nameInput,
    ...(signin ? [] : [h('label', { for: 'signupcode' }, tr('Código de registro', 'Sign-up code')), codeInput, h('label', {}, tr('¿En qué curso estás?', 'Which year are you in?')), yearRow]),
    h('label', {}, tr(signin ? ['PIN', 'PIN'] : ['Elige un PIN (de 4 a 6 cifras)', 'Choose a PIN (4–6 digits)'])), dots, pad, err, submit,
    h('button', { type: 'button', class: 'link-btn', onclick: () => renderLogin(signin ? 'signup' : 'signin') },
      tr(signin ? ['¿Primera vez? Crea un jugador', 'First time? Create a player'] : ['¿Ya tienes jugador? Entra', 'Already have a player? Sign in'])));
  screen(h('section', { class: 'login' }, h('div', { class: 'hero-map', html: heroMapSvg() }), form));
  nameInput.focus();
}
function renderChangePin() {
  setUserArea(); setCrumbs([{ t: ['Cambiar PIN', 'Change PIN'] }]);
  const steps = [
    { h: ['Tu PIN actual', 'Your current PIN'], b: ['Escríbelo para confirmar que eres tú.', 'Enter it to show it’s you.'] },
    { h: ['Nuevo PIN', 'New PIN'], b: ['Elige de 4 a 6 cifras que recuerdes.', 'Choose 4–6 digits you’ll remember.'] },
    { h: ['Repite el nuevo PIN', 'Repeat the new PIN'], b: ['Escríbelo otra vez.', 'Type it once more.'] }];
  let step = 0, pin = '', oldPin = '', newPin = '';
  const title = h('h1', {}), sub = h('p', { class: 'muted' }), dots = h('div', { class: 'pin-dots', 'aria-label': 'PIN' }), err = h('p', { class: 'form-error', role: 'alert' });
  const next = h('button', { class: 'btn primary wide', type: 'submit' });
  const draw = () => {
    title.replaceChildren(tr(steps[step].h)); sub.replaceChildren(tr(steps[step].b));
    dots.replaceChildren(...Array.from({ length: Math.max(4, pin.length) }, (_, i) => h('span', { class: i < pin.length ? 'on' : '' })));
    next.replaceChildren(tr(step === 2 ? ['Guardar PIN', 'Save PIN'] : ['Siguiente', 'Next']));
  };
  const press = (d) => { if (d === 'del') pin = pin.slice(0, -1); else if (pin.length < 6) pin += d; draw(); err.replaceChildren(); };
  const pad = h('div', { class: 'pinpad' },
    ...['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => h('button', { type: 'button', onclick: () => press(d) }, d)),
    h('span'), h('button', { type: 'button', onclick: () => press('0') }, '0'),
    h('button', { type: 'button', 'aria-label': L('Borrar', 'Delete'), onclick: () => press('del') }, '⌫'));
  document.onkeydown = (e) => { if (/^[0-9]$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del'); };
  const fail = (pair) => err.replaceChildren(tr(pair));
  const form = h('form', { class: 'card login-card', onsubmit: async (e) => {
    e.preventDefault(); err.replaceChildren();
    if (pin.length < 4) { fail(ERRORS.bad_pin); return; }
    if (step === 0) { oldPin = pin; pin = ''; step = 1; draw(); return; }
    if (step === 1) {
      if (pin === oldPin) { fail(['El PIN nuevo tiene que ser distinto.', 'The new PIN needs to be different.']); pin = ''; draw(); return; }
      newPin = pin; pin = ''; step = 2; draw(); return;
    }
    if (pin !== newPin) { fail(['Los dos PIN no coinciden. Empieza el nuevo otra vez.', 'The two PINs don’t match. Start the new one again.']); pin = ''; step = 1; draw(); return; }
    next.disabled = true;
    try {
      await api('change_pin', { p_token: state.session.token, p_old_pin: oldPin, p_new_pin: newPin });
      document.onkeydown = null; renderHome(); toast(L('PIN cambiado. En otros aparatos tendrás que entrar de nuevo.', 'PIN changed. On other devices you’ll need to sign in again.'), 4500);
    } catch (ex) {
      if (ex.code === 'wrong_pin') { oldPin = ''; newPin = ''; pin = ''; step = 0; draw(); }
      fail(ERRORS[ex.code] || (ex.offline ? ERRORS.offline : ERRORS.generic)); next.disabled = false;
    }
  } }, title, sub, dots, pad, err, next,
    h('button', { type: 'button', class: 'link-btn', onclick: () => { document.onkeydown = null; renderHome(); } }, tr('Cancelar', 'Cancel')));
  draw();
  screen(h('section', { class: 'login' }, form));
}
function heroMapSvg() {
  const rivers = Object.entries(MAP.items).filter(([k]) => k.startsWith('rivers:')).map(([, v]) => `<path d="${v.d}"/>`).join('');
  return `<svg viewBox="0 0 ${MAP.width} ${MAP.height}" aria-hidden="true"><path class="land-spain" d="${MAP.spain}"/><g class="hero-rivers">${rivers}</g></svg>`;
}

function sectionSummary(section) {
  return section.topics.reduce((acc, t) => { const x = topicSummary(t); return { mastered: acc.mastered + x.mastered, total: acc.total + x.total }; }, { mastered: 0, total: 0 });
}
// Navigation tree: year -> subject -> unit. Geography units live in SECTIONS; English units are separate pages.
const YEARS = [
  { id: '3prim', title: ['3º Primaria', '3rd Primary'], subjects: [
    { id: 'english', title: ['Inglés', 'English'], blurb: ['Ortografía y vocabulario', 'Spelling and vocabulary'], icon: 'Aa',
      units: [{ href: '/prefix', title: ['Prefijos re- e inter-', 'Prefixes re- and inter-'], blurb: ['19 palabras: juegos de ortografía.', '19 words: spelling games.'] },
        { href: '/subsuper', title: ['Sub- y super-', 'Sub- and super-'], blurb: ['Paso 1: la segunda parte de cada palabra.', 'Step 1: the second part of each word.'] }] },
    { id: 'lengua3', title: ['Lengua', 'Spanish language'], blurb: ['Ortografía: los acentos', 'Spelling: accents'], icon: 'Ñ',
      units: [{ href: '/acentos?n=3prim', title: ['Los acentos', 'Accents'], blurb: ['Sílaba tónica, agudas, llanas, esdrújulas y la tilde.', 'Stressed syllable, agudas, llanas, esdrújulas and the tilde.'] }] },
    { id: 'math3', title: ['Matemáticas', 'Maths'], blurb: ['Un reto cada día', 'A challenge every day'], icon: '+×',
      units: [{ href: '/maths-day', title: ['Reto de mates del día', 'Maths question of the day'], blurb: ['Una pregunta nueva cada día, con calendario.', 'A new question every day, with a calendar.'] }] },
    { id: 'pe', title: ['Educación Física', 'Physical Education'], blurb: ['El cuerpo humano', 'The human body'], icon: 'EF',
      units: [{ href: '/huesos', title: ['Los huesos', 'The bones'], blurb: ['14 huesos del esqueleto: arrastrar, encontrar y escribir.', '14 skeleton bones: drag, find and spell.'] }] }] },
  { id: '1eso', title: ['1º ESO', '1st ESO'], subjects: [
    { id: 'geo', title: ['Geografía', 'Geography'], blurb: ['Mapa físico y comunidades autónomas', 'Physical map and autonomous communities'], section: SECTIONS[0] },
    { id: 'math', title: ['Matemáticas', 'Maths'], blurb: ['Concurso de decimales de π', 'The π digits competition'], icon: 'π',
      units: [{ href: '/maths-day', title: ['Reto de mates del día', 'Maths question of the day'], blurb: ['Una pregunta nueva cada día, con calendario.', 'A new question every day, with a calendar.'] },
        { href: '/pi', title: ['Decimales de π', 'Digits of π'], blurb: ['Aprende, enlaza y recita los decimales en grupos.', 'Learn, link and recite the digits in groups.'] }] },
    { id: 'lengua', title: ['Lengua', 'Spanish language'], blurb: ['Ortografía: los acentos', 'Spelling: accents'], icon: 'Ñ',
      units: [{ href: '/acentos?n=1eso', title: ['Los acentos', 'Accents'], blurb: ['Reglas de la tilde, excepciones, diptongos, hiatos y tilde diacrítica.', 'Tilde rules, exceptions, diphthongs, hiatus and the diacritical accent.'] }] },
    { id: 'bio', title: ['Biología', 'Biology'], blurb: ['Unidades de repaso en inglés', 'Revision units in English'], icon: 'Bio',
      units: [{ href: '/biology', title: ['Unidades de Biología', 'Biology units'], blurb: ['Monera, Protoctista y Fungi, y las unidades que vengan.', 'Monera, Protoctista and Fungi, plus the units to come.'] }] }] },
];
for (const y of YEARS) for (const sub of y.subjects) { sub.year = y; if (sub.section) { sub.section.year = y; sub.section.subject = sub; } }
// Header trail: xoyso > year > subject > unit > topic. Each earlier step is a link; the last is the current page.
function setCrumbs(trail = []) {
  const nav = $('#crumbs'); nav.replaceChildren();
  const all = [{ plain: 'xoyso', fn: () => (state.session ? renderHome() : renderLogin()) }, ...trail];
  all.forEach((c, i) => {
    if (i) nav.append(h('span', { class: 'sep', 'aria-hidden': 'true' }, '›'));
    const last = i === all.length - 1, label = c.plain || tr(c.t);
    nav.append(!last && c.fn ? h('button', { class: 'crumb', onclick: c.fn }, label) : h('span', { class: 'crumb cur', 'aria-current': last ? 'page' : null }, label));
  });
}
const yearCrumb = (y) => ({ t: y.title, fn: () => renderYear(y) });
const subjectCrumb = (sub) => ({ t: sub.title, fn: sub.section ? () => renderGroup(sub.section) : () => renderSubject(sub) });
const card = (icon, title, blurb, extra = [], opts = {}) => h(opts.href ? 'a' : 'button', { class: 'card topic-card', href: opts.href, style: opts.href ? 'text-decoration:none;color:inherit' : null, onclick: opts.onclick },
  h('div', { class: 'topic-icon', html: icon }),
  h('div', { class: 'topic-text' }, h('h2', {}, tr(title)), h('p', { class: 'muted' }, tr(blurb)), ...extra));
const meterBits = ({ mastered, total }) => [h('div', { class: 'meter' }, h('span', { style: `width:${(100 * mastered) / total}%` })),
  h('p', { class: 'small' }, tr(`${mastered} de ${total} dominados`, `${mastered} of ${total} mastered`))];
const textIcon = (t) => `<span style="font:700 1.5rem var(--font,inherit)">${t}</span>`;
const YEAR_OF = { '3primaria': '3prim', '1eso': '1eso' };
async function chooseYear(db) {
  const prev = state.session.year; state.session.year = db; store.set('geo.session', state.session); renderHome();
  try { await api('set_year', { p_token: state.session.token, p_year: db }); } catch { state.session.year = prev; store.set('geo.session', state.session); toast(L('No se pudo guardar el curso. Inténtalo otra vez.', 'Could not save the year. Try again.'), 3000); renderHome(); }
}
function renderHome() {
  setUserArea(); document.onkeydown = null; setCrumbs();
  const mine = YEAR_OF[state.session.year];
  const ordered = [...YEARS].sort((a, b) => (b.id === mine) - (a.id === mine));
  const cards = ordered.map((y) => card(textIcon(y.id === '1eso' ? '1º' : '3º'), y.title, [(y.id === mine ? '★ Tu curso · ' : '') + y.subjects.map((x) => x.title[0]).join(' · '), (y.id === mine ? '★ Your year · ' : '') + y.subjects.map((x) => x.title[1]).join(' · ')], [], { onclick: () => renderYear(y), ...(y.id === mine ? { class: 'mine' } : {}) }));
  const pickYear = h('div', { class: 'card' }, h('h2', {}, tr(mine ? 'Cambiar de curso' : '¿En qué curso estás?', mine ? 'Change your year' : 'Which year are you in?')),
    h('p', { class: 'muted' }, tr('Te mostraremos primero tu curso. Los demás cursos siguen disponibles.', 'We will show your year first. The other years are still available.')),
    h('div', { class: 'row' }, ...[['3primaria', ['3º Primaria', '3rd Primary']], ['1eso', ['1º ESO', '1st ESO']]].map(([id, t]) => h('button', { class: `btn option ${state.session.year === id ? 'primary' : ''}`, onclick: () => chooseYear(id) }, tr(t)))));
  screen(h('section', { class: 'home' },
    h('h1', {}, tr(`¡Hola, ${state.session.username}!`, `Hi ${state.session.username}!`)),
    ...(mine ? [] : [pickYear]),
    h('a', { class: 'card topic-card', href: '/maths-day', style: 'text-decoration:none;color:inherit;display:block;margin:0 0 14px' }, h('h2', {}, tr('Reto de mates del día', 'Maths question of the day')), h('p', { class: 'muted' }, tr('Una pregunta nueva cada día. ¿La has hecho hoy?', 'A new question every day. Have you done today’s?'))),
    h('p', { class: 'muted lead' }, tr(mine ? 'Empieza por tu curso o elige otro.' : '¿De qué curso quieres repasar?', mine ? 'Start with your year, or pick another.' : 'Which year do you want to revise?')),
    h('div', { class: 'topic-grid' }, ...cards),
    ...(mine ? [h('details', { class: 'muted' }, h('summary', {}, tr('Cambiar mi curso', 'Change my year')), pickYear)] : [])));
}
function renderYear(year) {
  setUserArea(); document.onkeydown = null; setCrumbs([{ t: year.title }]);
  const cards = year.subjects.map((sub) => card(sub.section ? topicIcon('geo1eso') : textIcon(sub.icon), sub.title, sub.blurb, sub.section ? meterBits(sectionSummary(sub.section)) : [],
    { onclick: () => (sub.section ? renderGroup(sub.section) : renderSubject(sub)) }));
  screen(h('section', { class: 'home' },
    h('button', { class: 'back', onclick: renderHome }, '← ', tr('Inicio', 'Home')),
    h('h1', {}, tr(year.title)),
    h('p', { class: 'muted lead' }, tr('Elige una asignatura.', 'Choose a subject.')),
    h('div', { class: 'topic-grid' }, ...cards)));
}
function renderSubject(sub) {   // a subject whose units are separate pages
  setUserArea(); document.onkeydown = null; setCrumbs([yearCrumb(sub.year), { t: sub.title }]);
  const cards = sub.units.map((u) => card(textIcon(sub.icon), u.title, u.blurb, [], { href: u.href }));
  screen(h('section', { class: 'home' },
    h('button', { class: 'back', onclick: () => renderYear(sub.year) }, '← ', tr(sub.year.title)),
    h('h1', {}, tr(sub.title)),
    h('p', { class: 'muted lead' }, tr('Elige una unidad.', 'Choose a unit.')),
    h('div', { class: 'topic-grid' }, ...cards)));
}
function renderGroup(group) {
  setUserArea(); document.onkeydown = null; setCrumbs([yearCrumb(group.year), { t: group.subject.title }]);
  const cards = group.children.map((c) => {
    const { mastered, total } = sectionSummary(c);
    return h('button', { class: 'card topic-card', onclick: () => renderSection(c) },
      h('div', { class: 'topic-icon', html: topicIcon(c.icon) }),
      h('div', { class: 'topic-text' }, h('h2', {}, tr(c.title)), h('p', { class: 'muted' }, tr(c.blurb)),
        h('div', { class: 'meter' }, h('span', { style: `width:${(100 * mastered) / total}%` })),
        h('p', { class: 'small' }, tr(`${mastered} de ${total} dominados`, `${mastered} of ${total} mastered`))));
  });
  screen(h('section', { class: 'home' },
    h('button', { class: 'back', onclick: () => renderYear(group.year) }, '← ', tr(group.year.title)),
    h('h1', {}, tr(group.title)),
    h('p', { class: 'muted lead' }, tr('Elige una unidad.', 'Choose a unit.')),
    h('div', { class: 'topic-grid' }, ...cards)));
}
function renderSection(section) {
  setUserArea(); document.onkeydown = null; setCrumbs([yearCrumb(section.parent.year), subjectCrumb(section.parent.subject), { t: section.title }]);
  const cards = section.topics.map((t) => {
    const { mastered, total } = topicSummary(t);
    return h('button', { class: 'card topic-card', onclick: () => renderTopic(t) },
      h('div', { class: 'topic-icon', html: topicIcon(t.id) }),
      h('div', { class: 'topic-text' }, h('h2', {}, tr(t.title)), h('p', { class: 'muted' }, tr(t.blurb)),
        h('div', { class: 'meter' }, h('span', { style: `width:${(100 * mastered) / total}%` })),
        h('p', { class: 'small' }, tr(`${mastered} de ${total} dominados`, `${mastered} of ${total} mastered`))));
  });
  const bigCard = (icon, title, blurb, line, meter, fn) => h('button', { class: 'card topic-card special', onclick: fn },
    h('div', { class: 'topic-icon', html: topicIcon(icon) }),
    h('div', { class: 'topic-text' }, h('h2', {}, tr(title)), h('p', { class: 'muted' }, tr(blurb)), meter == null ? null : h('div', { class: 'meter' }, h('span', { style: `width:${100 * meter}%` })), h('p', { class: 'small' }, tr(line))));
  const qs = scopedQuestions(section), connMastered = qs.filter((q) => level(`conn:${q.id}`) === 'mastered').length, best = store.get(bestKey(section)), size = examSize(section);
  const specials = [
    bigCard('conn', ['Conexiones', 'Connections'], ['Relaciona lo que estudias entre sí, en un mapa en blanco.', 'Relate the things you’re studying to each other, on a blank map.'],
      [`${connMastered} de ${qs.length} dominadas`, `${connMastered} of ${qs.length} mastered`], connMastered / qs.length, () => startConnections(section)),
    bigCard('exam', ['Examen final', 'Final quiz'], [`${size} preguntas de todo este apartado. Cada vez salen otras.`, `${size} questions on this whole part. Different ones each time.`],
      best ? [`Mejor nota: ${best.score} / ${best.total}`, `Best score: ${best.score} / ${best.total}`] : ['Todavía no lo has hecho', 'Not tried yet'], null, () => startExam(section))];
  screen(h('section', { class: 'home' },
    h('button', { class: 'back', onclick: () => (section.parent ? renderGroup(section.parent) : renderHome()) }, '← ', tr(section.parent ? section.parent.title : ['Inicio', 'Home'])),
    h('h1', {}, tr(section.title)),
    h('p', { class: 'muted lead' }, tr('Elige un tema para repasar.', 'Choose a topic to revise.')),
    h('div', { class: 'topic-grid' }, ...cards, ...specials)));
}
function topicIcon(id) {
  if (id === 'geo1eso') return '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" stroke-width="4"/><path d="M7 24h34M24 7c-9 9-9 25 0 34M24 7c9 9 9 25 0 34" fill="none" stroke="currentColor" stroke-width="3"/></svg>';
  if (id === 'rivers') return '<svg viewBox="0 0 48 48"><path d="M6 12c10 0 10 9 20 9s9 15 16 15" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>';
  const stroke = 'fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"';
  if (id === 'peaks') return `<svg viewBox="0 0 48 48"><path d="M5 40L20 12l8 14 5-8 10 22z" ${stroke}/></svg>`;
  if (id === 'gulfs') return `<svg viewBox="0 0 48 48"><path d="M8 10c14 0 20 6 20 14S22 38 8 38" ${stroke}/><path d="M32 14c4 3 4 17 0 20" ${stroke}/></svg>`;
  if (id === 'capes') return `<svg viewBox="0 0 48 48"><path d="M6 40h14c4 0 6-3 6-8V16c0-4 3-6 7-6h9" ${stroke}/><circle cx="26" cy="16" r="3" fill="currentColor"/></svg>`;
  if (id === 'seas') return `<svg viewBox="0 0 48 48"><path d="M4 18c5-6 9 6 14 0s9 6 14 0 9 6 12 0M4 32c5-6 9 6 14 0s9 6 14 0 9 6 12 0" ${stroke}/></svg>`;
  if (id === 'islands') return `<svg viewBox="0 0 48 48"><path d="M10 30c0-8 8-12 14-12s14 4 14 12c0 5-6 6-14 6s-14-1-14-6z" ${stroke}/><circle cx="40" cy="12" r="3" fill="currentColor"/></svg>`;
  if (id === 'regions') return `<svg viewBox="0 0 48 48"><path d="M6 14l12-6 10 5 14-3v24l-12 6-10-5-14 4z M18 8v26 M28 13v26" ${stroke}/></svg>`;
  if (id === 'conn') return `<svg viewBox="0 0 48 48"><circle cx="12" cy="14" r="5" fill="currentColor"/><circle cx="36" cy="34" r="5" fill="currentColor"/><path d="M12 14c14 0 6 20 24 20" ${stroke}/></svg>`;
  if (id === 'exam') return `<svg viewBox="0 0 48 48"><rect x="9" y="6" width="30" height="36" rx="4" ${stroke}/><path d="M16 17h16M16 25h16M16 33h9" ${stroke}/></svg>`;
  if (id === 'relief') return `<svg viewBox="0 0 48 48"><path d="M4 36l9-14 6 8 8-16 7 12 6-5 4 15z" ${stroke}/></svg>`;
  return '<svg viewBox="0 0 48 48"><path d="M6 38l12-20 8 12 5-7 11 15z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/></svg>';
}

function renderTopic(topic) {
  setUserArea(); { const sec = sectionOf(topic); setCrumbs([yearCrumb(sec.parent.year), subjectCrumb(sec.parent.subject), { t: sec.title, fn: () => renderSection(sec) }, { t: topic.title }]); }
  const { mastered, total } = topicSummary(topic);
  const [nEs, nEn] = topic.noun;
  const mode = (title, desc, icon, fn, extra = '') => h('button', { class: `card mode-card ${extra}`, onclick: fn },
    h('div', { class: 'mode-icon', html: icon }), h('h3', {}, tr(title)), h('p', { class: 'muted' }, tr(desc)));
  screen(h('section', { class: 'topic' },
    h('button', { class: 'back', onclick: () => renderSection(sectionOf(topic)) }, '← ', tr(sectionOf(topic).title)),
    h('h1', {}, tr(topic.title)),
    h('p', { class: 'muted lead' }, tr(
      `Dominas ${mastered} de ${total}. Acierta uno ${MASTERED_STREAK} veces seguidas para dominarlo.`,
      `${mastered} of ${total} mastered. Get one right ${MASTERED_STREAK} times in a row to master it.`)),
    h('div', { class: 'mode-grid' },
      mode(['Aprender', 'Learn'], [`Explora el mapa y toca cada ${nEs} para ver su nombre.`, `Explore the map and tap each ${nEn} to see its name.`], ICONS.learn, () => renderLearn(topic)),
      mode(['Encuéntralo', 'Find it'], [`Ves un nombre y tocas ${gd(topic).el === 'la' ? 'esa' : 'ese'} ${nEs} en el mapa.`, `See a name, then tap that ${nEn} on the map.`], ICONS.find, () => startQuiz(topic, 'find'), 'accent'),
      mode(['Señálalo', 'Point to it'], ['Ves un nombre y señalas de memoria por dónde está, sin ayuda en el mapa. Vale con acercarte.', 'See a name and point from memory to where it is, with no help on the map. Close is good enough.'], ICONS.point, () => startQuiz(topic, 'point')),
      mode(['¿Cuál es?', 'Name it'], [`Se ilumina ${gd(topic).un} ${nEs}. Elige su nombre.`, `One ${nEn} lights up. Pick its name.`], ICONS.name, () => startQuiz(topic, 'choose')),
      mode(['Escríbelo', 'Spell it'], ['Como ¿Cuál es?, pero escribes tú el nombre, con sus tildes.', 'Like Name it, but you type the name, accents and all.'], ICONS.spell, () => startQuiz(topic, 'type')),
      mode(['Mi progreso', 'My progress'], ['Mira lo que ya dominas y lo que tienes que practicar.', 'See what you’ve mastered and what needs practice.'], ICONS.progress, () => renderProgress(topic)))));
}
const ICONS = {
  learn: '<svg viewBox="0 0 32 32"><path d="M4 7l8-3 8 3 8-3v21l-8 3-8-3-8 3z M12 4v21 M20 7v21" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
  find: '<svg viewBox="0 0 32 32"><circle cx="16" cy="13" r="6" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M16 29s-10-8.5-10-16a10 10 0 0120 0c0 7.5-10 16-10 16z" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
  name: '<svg viewBox="0 0 32 32"><rect x="4" y="6" width="24" height="6" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="4" y="14" width="24" height="6" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="4" y="22" width="24" height="6" rx="2" fill="currentColor" opacity=".35"/></svg>',
  spell: '<svg viewBox="0 0 32 32"><path d="M5 26l5-16h2l5 16 M7.5 20h7 M20 26V12m0 7c0-4 7-4 7 0v7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 7l3-3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  point: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-dasharray="4 3"/><circle cx="16" cy="16" r="3.5" fill="currentColor"/></svg>',
  progress: '<svg viewBox="0 0 32 32"><path d="M5 27V17 M12 27V10 M19 27V14 M26 27V5" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>',
};

/* --- learn --- */
function renderLearn(topic) {
  setUserArea();
  let selected = null, showAll = false;
  const card = h('div', { class: 'info-card' });
  const chips = h('div', { class: 'chips' });
  const map = new MapView(topic, { onTap: (id) => { if (id) select(id, false); } });
  const drawCard = () => {
    if (!selected) { card.replaceChildren(h('p', { class: 'muted' }, tr(`Toca ${gd(topic).un} ${topic.noun[0]} en el mapa o un nombre de abajo.`, `Tap a ${topic.noun[1]} on the map, or a name below.`))); return; }
    const it = topic.items.find((i) => i.id === selected);
    card.replaceChildren(h('p', { class: 'eyebrow' }, topic.groupLabel?.[it.group] ? tr(topic.groupLabel[it.group]) : ''), h('h2', { class: 'big-name' }, it.name), h('p', {}, tr(it.fact)), tipEl(it));
  };
  const select = (id, zoom) => {
    selected = id;
    map.clearAll(); if (showAll) labelAll();
    map.dimOthers(true); map.setClass(id, 'selected'); map.label(id, topic.items.find((i) => i.id === id).name, 'selected');
    if (zoom) map.focus(id);
    chips.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
    drawCard();
  };
  const labelAll = () => topic.items.forEach((it) => map.label(it.id, it.name));
  const groups = [...new Set(topic.items.map((i) => i.group))];
  for (const g of groups) {
    if (groups.length > 1) chips.append(h('p', { class: 'chip-group' }, topic.groupLabel?.[g] ? tr(topic.groupLabel[g]) : g));
    for (const it of topic.items.filter((i) => i.group === g)) chips.append(h('button', { class: 'chip', 'data-id': it.id, onclick: () => select(it.id, true) }, it.name));
  }
  const toggle = h('label', { class: 'toggle' }, h('input', { type: 'checkbox', onchange: (e) => {
    showAll = e.target.checked; map.clearAll(); map.dimOthers(false);
    if (showAll) labelAll();
    if (selected) select(selected, false);
  } }), ' ', tr('Ver todos los nombres', 'Show all names'));
  drawCard();
  screen(h('section', { class: 'play' },
    h('div', { class: 'play-head' }, h('button', { class: 'back', onclick: () => renderTopic(topic) }, '← ', tr('Volver', 'Back')), h('h1', {}, tr(topic.learnTitle)), toggle),
    h('div', { class: 'play-body' }, map.el, h('aside', { class: 'side' }, howBox('Toca un sitio en el mapa o un nombre de la lista. Léelo y apréndelo. Luego prueba “Encuéntralo”.', 'Tap a place on the map or a name in the list. Read it and learn it. Then try “Find it”.'), card, chips))));
}

/* --- quizzes --- */
function startQuiz(topic, mode) {
  const round = { topic, mode, items: pickRound(topic, ROUND_LENGTH), i: 0, score: 0, missed: [] };
  renderQuiz(round);
}
const howBox = (es, en) => h('div', { class: 'how' }, h('b', {}, tr('Haz esto', 'Do this')), h('span', {}, tr(es, en)));
const PRAISE = [['¡Muy bien!', 'Well done!'], ['¡Correcto!', 'Correct!'], ['¡Genial!', 'Great!'], ['¡Perfecto!', 'Perfect!'], ['¡Eso es!', 'That’s it!']];
function renderQuiz(round) {
  setUserArea();
  const { topic, mode } = round;
  const [nEs, nEn] = topic.noun;
  const progressBar = h('div', { class: 'round-bar' }, h('span'));
  const prompt = h('div', { class: 'prompt' });
  const answers = h('div', { class: 'answers' });
  const feedback = h('div', { class: 'feedback', 'aria-live': 'assertive' });
  const nextBtn = h('button', { class: 'btn primary wide', hidden: true, onclick: () => next() }, tr('Siguiente', 'Next'));
  let locked = false;
  const map = new MapView(topic, { onTap: (id, e) => onMapTap(id, e), hide: mode === 'point' });
  const current = () => round.items[round.i];
  const titles = { find: ['Encuéntralo', 'Find it'], point: ['Señálalo', 'Point to it'], choose: ['¿Cuál es?', 'Name it'], type: ['Escríbelo', 'Spell it'] };
  const hintBtn = (box) => { const b = h('button', { type: 'button', class: 'btn ghost', onclick: () => { if (locked) return; b.disabled = true; box.replaceChildren(h('strong', {}, tr('Pista: ', 'Hint: ')), tr(current().fact)); box.hidden = false; } }, tr('💡 Pista', '💡 Hint')); return b; };
  const dontKnow = () => h('button', { type: 'button', class: 'btn ghost', onclick: () => giveUp() }, tr('No lo sé', 'I don’t know'));

  function setup() {
    locked = false; feedback.replaceChildren(); feedback.className = 'feedback'; nextBtn.hidden = true;
    map.clearAll(); map.dimOthers(false); answers.replaceChildren();
    const box = h('div', { class: 'feedback hint', hidden: true });
    progressBar.firstChild.style.width = `${(100 * round.i) / round.items.length}%`;
    const it = current();
    const counter = h('p', { class: 'eyebrow' }, tr(`Pregunta ${round.i + 1} de ${round.items.length}`, `Question ${round.i + 1} of ${round.items.length}`));
    if (mode === 'find' || mode === 'point') {
      map.reset(true);
      const ask = mode === 'point' ? tr(`Señala ${gd(topic).el} ${nEs}`, `Point to the ${nEn}`) : tr(`Toca ${gd(topic).el} ${nEs}`, `Tap the ${nEn}`);
      prompt.replaceChildren(counter, howBox(mode === 'point' ? 'Toca en el mapa donde crees que está, de memoria. No hay ayuda. Vale con acercarte.' : 'Toca en el mapa el sitio que se nombra.', mode === 'point' ? 'Tap the map where you think it is, from memory. No help is shown. Close is good enough.' : 'Tap the named place on the map.'), h('p', { class: 'ask' }, ask), h('h2', { class: 'big-name' }, it.name));
      answers.append(h('div', { class: 'row' }, hintBtn(box), dontKnow()), box);
    } else {
      map.dimOthers(true); map.setClass(it.id, 'target'); map.focus(it.id);
      prompt.replaceChildren(counter, howBox(mode === 'choose' ? 'Mira el mapa y toca el nombre correcto.' : 'Mira el mapa, escribe el nombre con sus tildes y pulsa Comprobar.', mode === 'choose' ? 'Look at the map and tap the right name.' : 'Look at the map, type the name with its accents, then press Check.'), h('p', { class: 'ask' }, tr(`¿Qué ${nEs} está iluminad${gd(topic).o}?`, `Which ${nEn} is lit up?`)));
      if (mode === 'choose') {
        const others = shuffle(topic.items.filter((x) => x.id !== it.id));
        // include some options from the same group, so it isn't too easy
        const same = others.filter((x) => x.group === it.group).slice(0, 2);
        const opts = shuffle([it, ...same, ...others.filter((x) => !same.includes(x))].slice(0, 4));
        for (const o of opts) answers.append(h('button', { class: 'btn option', 'data-id': o.id, onclick: (e) => choose(o.id, e.currentTarget) }, o.name));
        answers.append(h('div', { class: 'row' }, hintBtn(box)), box);
      } else {
        const input = h('input', { class: 'spell-input', autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false',
          placeholder: L('Escribe el nombre…', 'Type the name…'), 'data-ph-es': 'Escribe el nombre…', 'data-ph-en': 'Type the name…', 'aria-label': L('Escribe el nombre', 'Type the name') });
        const accents = h('div', { class: 'accent-keys' }, ...['á', 'é', 'í', 'ó', 'ú', 'ñ'].map((ch) =>
          h('button', { type: 'button', class: 'key', onclick: () => { const p = input.selectionStart ?? input.value.length; input.value = input.value.slice(0, p) + ch + input.value.slice(input.selectionEnd ?? p); input.focus(); input.setSelectionRange(p + 1, p + 1); } }, ch)));
        const form = h('form', { class: 'spell-form', onsubmit: (e) => { e.preventDefault(); if (input.value.trim()) typed(input.value, input); } },
          input, accents, h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'submit' }, tr('Comprobar', 'Check')), hintBtn(box), dontKnow()));
        answers.append(form, box);
        setTimeout(() => input.focus({ preventScroll: true }), 50);
      }
    }
  }
  function correctFeedback() {
    round.score++;
    feedback.className = 'feedback good';
    feedback.replaceChildren(h('strong', {}, tr(pick(PRAISE))));
  }
  function wrongFeedback(pair) {
    round.missed.push(current());
    feedback.className = 'feedback bad'; feedback.replaceChildren(tr(pair), tipEl(current()));
  }
  function onPoint(ev) {
    const it = current(), [x, y] = map.toSvg(ev.clientX, ev.clientY);
    locked = true; answers.replaceChildren();
    if (map.near(it.id, x, y)) {
      map.zone(it.id); map.setClass(it.id, 'correct'); map.label(it.id, it.name, 'correct'); map.marker(x, y, 'ok');
      recordAnswer(`${topic.id}:${it.id}`, true); correctFeedback(); autoNext();
    } else {
      map.zone(it.id); map.marker(x, y, 'miss'); map.setClass(it.id, 'correct reveal'); map.label(it.id, it.name, 'correct');
      recordAnswer(`${topic.id}:${it.id}`, false);
      wrongFeedback(both(() => L(`Por ahí no. «${it.name}» se muestra en verde.`, `Not there. “${it.name}” is shown in green.`)));
      map.focus(it.id); nextBtn.hidden = false; nextBtn.focus();
    }
  }
  function onMapTap(id, ev) {
    if ((mode !== 'find' && mode !== 'point') || locked) return;
    if (mode === 'point') return onPoint(ev);
    if (!id) { toast(L(`Toca justo encima de ${gd(topic).un} ${nEs}. Si están muy juntos, acerca el mapa con +.`, `Tap right on a ${nEn}. If they’re close together, zoom in with +.`), 3000); return; }
    const it = current(); locked = true; answers.replaceChildren();
    if (id === it.id) {
      map.setClass(id, 'correct'); map.label(id, it.name, 'correct'); recordAnswer(`${topic.id}:${it.id}`, true); correctFeedback();
      autoNext();
    } else {
      const tapped = topic.items.find((x) => x.id === id);
      map.setClass(id, 'wrong'); map.label(id, tapped.name, 'wrong');
      map.setClass(it.id, 'correct reveal'); map.label(it.id, it.name, 'correct');
      recordAnswer(`${topic.id}:${it.id}`, false);
      wrongFeedback(both(() => L(`Has tocado: ${tapped.name}. La respuesta, ${it.name}, está en verde.`,
        `You tapped: ${tapped.name}. The answer, ${it.name}, is shown in green.`)));
      map.focus(it.id); nextBtn.hidden = false; nextBtn.focus();
    }
  }
  function choose(id, btn) {
    if (locked) return; locked = true; const it = current();
    answers.querySelectorAll('button').forEach((b) => { b.disabled = true; if (b.dataset.id === it.id) b.classList.add('right'); });
    map.setClass(it.id, 'correct'); map.label(it.id, it.name, 'correct');
    if (id === it.id) { recordAnswer(`${topic.id}:${it.id}`, true); correctFeedback(); autoNext(); }
    else {
      btn.classList.add('wrong'); recordAnswer(`${topic.id}:${it.id}`, false);
      wrongFeedback(both(() => L(`Respuesta: ${it.name}.`, `Answer: ${it.name}.`)));
      nextBtn.hidden = false; nextBtn.focus();
    }
  }
  function typed(value, input) {
    if (locked) return; const it = current();
    const names = [it.name, ...(it.alt || [])];
    const exact = names.some((n) => value.trim().toLowerCase() === n.toLowerCase());
    const close = names.some((n) => plain(value) === plain(n));
    locked = true; input.disabled = true; answers.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    map.setClass(it.id, 'correct'); map.label(it.id, it.name, 'correct');
    if (exact) { recordAnswer(`${topic.id}:${it.id}`, true); correctFeedback(); autoNext(); }
    else if (close) {
      // right answer, missing or wrong accent: counts as correct, but shows the spelling
      recordAnswer(`${topic.id}:${it.id}`, true); correctFeedback();
      feedback.append(h('span', { class: 'accent-note' }, tr('¡Ojo con la tilde! Se escribe ', 'Watch the accent! It’s spelt '), h('strong', {}, it.name)));
      nextBtn.hidden = false; nextBtn.focus();
    } else {
      recordAnswer(`${topic.id}:${it.id}`, false);
      wrongFeedback(both(() => L(`Respuesta: ${it.name}.`, `Answer: ${it.name}.`)));
      feedback.append(h('span', { class: 'small' }, ' ', tr(`Has escrito «${value.trim()}».`, `You wrote “${value.trim()}”.`)));
      nextBtn.hidden = false; nextBtn.focus();
    }
  }
  function giveUp() {
    if (locked) return; locked = true; const it = current(); answers.replaceChildren();
    map.setClass(it.id, 'correct reveal'); map.label(it.id, it.name, 'correct'); map.focus(it.id);
    recordAnswer(`${topic.id}:${it.id}`, false);
    wrongFeedback(both(() => L(`Aquí está: ${it.name}. Volverá a salir pronto.`, `Here it is: ${it.name}. It’ll come up again soon.`)));
    nextBtn.hidden = false; nextBtn.focus();
  }
  let autoTimer;
  function autoNext() { autoTimer = setTimeout(next, 1300); }
  function next() {
    clearTimeout(autoTimer);
    round.i++;
    if (round.i >= round.items.length) renderResults(round); else setup();
  }
  screen(h('section', { class: 'play' },
    h('div', { class: 'play-head' }, h('button', { class: 'back', onclick: () => { clearTimeout(autoTimer); renderTopic(topic); } }, '← ', tr('Parar', 'Stop')), h('h1', {}, tr(titles[mode])), progressBar),
    h('div', { class: 'play-body' }, map.el, h('aside', { class: 'side quiz-side' }, prompt, answers, feedback, nextBtn))));
  setup();
}
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function renderResults(round) {
  const { topic, score, items, missed } = round;
  const pct = score / items.length;
  const msg = pct === 1 ? ['¡Perfecto! ¡Todas bien!', 'Perfect! Full marks!']
    : pct >= 0.8 ? ['¡Muy bien! Buen trabajo.', 'Well done! Great work.']
      : pct >= 0.5 ? ['Buen intento. ¡Sigue así!', 'Good effort. Keep going!']
        : ['Sigue practicando. ¡Lo conseguirás!', 'Keep practising. You’ll get there!'];
  const uniqueMissed = [...new Map(missed.map((m) => [m.id, m])).values()];
  screen(h('section', { class: 'results' },
    h('div', { class: `card results-card ${pct === 1 ? 'perfect' : ''}` },
      pct === 1 ? h('div', { class: 'confetti', 'aria-hidden': 'true' }, ...Array.from({ length: 24 }, (_, i) => h('i', { style: `--i:${i}` }))) : null,
      h('p', { class: 'eyebrow' }, tr('Ronda terminada', 'Round complete')),
      h('div', { class: 'score' }, h('span', {}, String(score)), ` / ${items.length}`),
      h('p', { class: 'lead' }, tr(msg)),
      uniqueMissed.length ? h('div', {}, h('p', { class: 'muted' }, tr('Repasa estos:', 'Worth another look:')), h('div', { class: 'pill-row' }, ...uniqueMissed.map((m) => h('span', { class: 'pill' }, m.name)))) : null,
      h('div', { class: 'row center' },
        h('button', { class: 'btn primary', onclick: () => startQuiz(topic, round.mode) }, tr('Jugar otra vez', 'Play again')),
        h('button', { class: 'btn ghost', onclick: () => renderTopic(topic) }, tr('Elegir otro modo', 'Choose another mode'))))));
}

/* --- progress --- */
function renderProgress(topic) {
  setUserArea();
  const map = new MapView(topic, { onTap: () => {} });
  for (const it of topic.items) map.setClass(it.id, `lvl-${level(`${topic.id}:${it.id}`)}`);
  const order = { learning: 0, new: 1, mastered: 2 };
  const rows = topic.items
    .map((it) => ({ it, p: stats(`${topic.id}:${it.id}`), l: level(`${topic.id}:${it.id}`) }))
    .sort((a, b) => order[a.l] - order[b.l] || a.p.streak - b.p.streak);
  const { mastered, total } = topicSummary(topic);
  const list = h('div', { class: 'progress-list' }, ...rows.map(({ it, p, l }) => h('div', { class: `prog-row lvl-${l}` },
    h('span', { class: 'prog-name' }, it.name),
    h('span', { class: 'stars', 'aria-label': `${Math.min(p.streak, MASTERED_STREAK)} / ${MASTERED_STREAK}` }, ...Array.from({ length: MASTERED_STREAK }, (_, i) => h('i', { class: i < p.streak ? 'on' : '' }))),
    h('span', { class: 'prog-meta' }, l === 'new' ? tr(LEVEL_LABEL.new) : tr(`${p.correct} bien · ${p.wrong} mal`, `${p.correct} right · ${p.wrong} wrong`)))));
  const resetBtn = h('button', { class: 'link-btn danger', onclick: async () => {
    if (!confirm(L(`¿Borrar todo tu progreso de ${topic.title[0].toLowerCase()}? No se puede deshacer.`, `Reset all progress for ${topic.title[1].toLowerCase()}? This can’t be undone.`))) return;
    try { await api('reset_progress', { p_token: state.session.token, p_topic: topic.id }); await loadProgress(); renderProgress(topic); toast(L('Progreso borrado.', 'Progress reset.')); }
    catch (e) { toast(e.message); }
  } }, tr(`Borrar el progreso de ${topic.title[0].toLowerCase()}`, `Reset ${topic.title[1].toLowerCase()} progress`));
  screen(h('section', { class: 'play' },
    h('div', { class: 'play-head' }, h('button', { class: 'back', onclick: () => renderTopic(topic) }, '← ', tr('Volver', 'Back')),
      h('h1', {}, tr(`Mi progreso: ${topic.title[0]}`, `My progress: ${topic.title[1]}`))),
    h('div', { class: 'play-body' }, map.el, h('aside', { class: 'side' },
      h('div', { class: 'summary' }, h('div', { class: 'score small-score' }, h('span', {}, String(mastered)), ` / ${total}`), h('p', { class: 'muted' }, tr('dominados', 'mastered'))),
      h('div', { class: 'legend' }, h('span', { class: 'lg mastered' }, tr(LEVEL_LABEL.mastered)), h('span', { class: 'lg learning' }, tr(LEVEL_LABEL.learning)), h('span', { class: 'lg new' }, tr(LEVEL_LABEL.new))),
      list, resetBtn))));
}


/* ----------------------------------------------------- connections and final quiz */
const topicById = (id) => TOPICS.find((t) => t.id === id);
const CONN_TOPIC = { id: 'conn', items: [] };
const weightOf = (id) => {
  const p = stats(id), tries = p.correct + p.wrong; let w = 1;
  if (tries === 0) w += 2;
  w += 4 * (p.wrong / (tries + 1));
  if (p.streak < MASTERED_STREAK) w += 2 - Math.min(p.streak, 2) * 0.5;
  return w;
};
function weightedPick(list, idFn, n) {
  const pool = list.map((x) => ({ x, w: weightOf(idFn(x)) })), out = [];
  while (out.length < Math.min(n, list.length)) {
    const total = pool.reduce((a, b) => a + b.w, 0); let r = Math.random() * total, i = 0;
    while ((r -= pool[i].w) > 0 && i < pool.length - 1) i++;
    out.push(pool.splice(i, 1)[0].x);
  }
  return out;
}
function shell({ title, label, pct, back, backLabel, map, side }) {
  const bar = h('div', { class: 'round-bar' }, h('span', { style: `width:${100 * pct}%` }));
  screen(h('section', { class: 'play' },
    h('div', { class: 'play-head' }, h('button', { class: 'back', onclick: back }, '← ', tr(backLabel || ['Parar', 'Stop'])), h('h1', {}, tr(title)), bar),
    h('div', { class: 'play-body' }, map.el, h('aside', { class: 'side quiz-side' }, h('div', { class: 'prompt' }, h('p', { class: 'eyebrow' }, tr(label)), ...side.prompt), ...side.rest))));
}
function resultsScreen({ eyebrow, score, total, missed, extra, again, againLabel, back }) {
  const pct = score / total;
  const msg = pct === 1 ? ['¡Perfecto! ¡Todas bien!', 'Perfect! Full marks!'] : pct >= 0.8 ? ['¡Muy bien! Buen trabajo.', 'Well done! Great work.']
    : pct >= 0.5 ? ['Buen intento. ¡Sigue así!', 'Good effort. Keep going!'] : ['Sigue practicando. ¡Lo conseguirás!', 'Keep practising. You’ll get there!'];
  screen(h('section', { class: 'results' }, h('div', { class: `card results-card ${pct === 1 ? 'perfect' : ''}` },
    pct === 1 ? h('div', { class: 'confetti', 'aria-hidden': 'true' }, ...Array.from({ length: 24 }, (_, i) => h('i', { style: `--i:${i}` }))) : null,
    h('p', { class: 'eyebrow' }, tr(eyebrow)), h('div', { class: 'score' }, h('span', {}, String(score)), ` / ${total}`), h('p', { class: 'lead' }, tr(msg)),
    extra || null,
    missed.length ? h('div', {}, h('p', { class: 'muted' }, tr('Repasa estos:', 'Worth another look:')), h('div', { class: 'pill-row' }, ...missed.map((m) => h('span', { class: 'pill' }, m)))) : null,
    h('div', { class: 'row center' }, h('button', { class: 'btn primary', onclick: again }, tr(againLabel)), h('button', { class: 'btn ghost', onclick: back }, tr('Volver', 'Back'))))));
}

/* one multiple-choice "connection" question on a blank map. staged = clues appear after each wrong answer */
function connOptions(q) {
  const topic = topicById(q.topic), byId = (id) => topic.items.find((x) => x.id === id);
  if (q.opts) return shuffle(q.opts.map(byId));
  return shuffle([byId(q.answer), ...shuffle(q.pool).slice(0, 3).map(byId)]);
}
function askConn(q, { staged, title, label, pct, back, onDone }) {
  setUserArea();
  const topic = topicById(q.topic), ans = topic.items.find((i) => i.id === q.answer), key = `${q.topic}:${q.answer}`;
  const map = new MapView(CONN_TOPIC, { onTap: () => {}, blank: true, showCities: false });
  let stage = 0, wrongs = 0, locked = false, remaining = 0;
  const feedback = h('div', { class: 'feedback', 'aria-live': 'assertive' });
  const answers = h('div', { class: 'answers' });
  const nextBtn = h('button', { class: 'btn primary wide', hidden: true, onclick: () => onDone(wrongs === 0) }, tr('Siguiente', 'Next'));
  const say = (cls, ...kids) => { feedback.className = `feedback ${cls}`; feedback.replaceChildren(...kids); };
  const finish = (good) => {
    locked = true; map.showRefs(q); map.drawShape(key, good ? 'correct' : 'correct reveal'); map.labelKey(key, ans.name, 'correct');
    answers.querySelectorAll('button').forEach((b) => { b.disabled = true; if (b.dataset.id === q.answer) b.classList.add('right'); });
    recordAnswer(`conn:${q.id}`, good && wrongs === 0);
    if (good && wrongs === 0) say('good', h('strong', {}, tr(pick(PRAISE))), tipEl(ans));
    else if (good) say('good', h('strong', {}, tr('¡Bien! Lo has sacado con ayuda; volverá a salir.', 'Good! You got there with help; it’ll come up again.')), tipEl(ans));
    else say('bad', tr(both(() => L(`Respuesta: ${ans.name}.`, `Answer: ${ans.name}.`))), tipEl(ans));
    nextBtn.hidden = false; nextBtn.focus();
  };
  const steps = q.refs.length ? ['refs', 'shape'] : ['shape'];
  const advance = () => {   // reveal the next help; after the last help, show the answer
    const step = steps[stage++];
    if (step === 'refs') { map.showRefs(q); say('bad', tr('Casi. Mira el mapa: te enseño lo que se nombra en la pregunta.', 'Not quite. Look at the map: I’ll show you what the question mentions.')); }
    else if (step === 'shape') { map.drawShape(key, 'target'); say('bad', tr('Otra vez. Ahora ves la forma o la zona.', 'Try again. Now you can see the shape or the area.')); }
    else finish(false);
  };
  const pickOpt = (id, btn) => {
    if (locked) return;
    if (id === q.answer) return finish(true);
    wrongs++; btn.disabled = true; btn.classList.add('wrong');
    if (staged) advance(); else finish(false);
  };
  for (const o of connOptions(q)) { answers.append(h('button', { class: 'btn option', 'data-id': o.id, onclick: (e) => pickOpt(o.id, e.currentTarget) }, o.name)); remaining++; }
  const idk = h('button', { type: 'button', class: 'btn ghost', onclick: () => { if (locked) return; wrongs++; if (staged) advance(); else finish(false); } }, tr('No lo sé', 'I don’t know'));
  shell({ title, label, pct, back, map, side: { prompt: [howBox('Lee la pregunta y toca la respuesta correcta. Si fallas, te daré ayudas en el mapa.', 'Read the question and tap the right answer. If you miss, you get help on the map.'), h('h2', { class: 'question' }, tr(q.q))], rest: [answers, h('div', { class: 'row' }, idk), feedback, nextBtn] } });
}

/* connections round: 10 questions with staged clues */
function startConnections(section) {
  const qs = weightedPick(scopedQuestions(section), (q) => `conn:${q.id}`, 10);
  const run = (i, score, missed) => {
    if (i >= qs.length) return resultsScreen({ eyebrow: ['Ronda terminada', 'Round complete'], score, total: qs.length, missed, again: () => startConnections(section),
      againLabel: ['Jugar otra vez', 'Play again'], back: () => renderSection(section) });
    const q = qs[i], ans = topicById(q.topic).items.find((x) => x.id === q.answer);
    askConn(q, { staged: true, title: ['Conexiones', 'Connections'], label: [`Pregunta ${i + 1} de ${qs.length}`, `Question ${i + 1} of ${qs.length}`], pct: i / qs.length,
      back: () => renderSection(section), onDone: (ok) => run(i + 1, score + (ok ? 1 : 0), ok ? missed : [...missed, ans.name]) });
  };
  run(0, 0, []);
}

/* one single-attempt question about a single item (used by the final quiz) */
function askItem({ topic, it, mode }, { title, label, pct, back, onDone }) {
  setUserArea();
  const nEs = topic.noun[0], nEn = topic.noun[1];
  let locked = false;
  const feedback = h('div', { class: 'feedback', 'aria-live': 'assertive' });
  const answers = h('div', { class: 'answers' });
  const nextBtn = h('button', { class: 'btn primary wide', hidden: true }, tr('Siguiente', 'Next'));
  const map = new MapView(topic, { onTap: (id) => {
    if (mode !== 'find' || locked) return;
    if (!id) { toast(L('Toca justo encima. Si están muy juntos, acerca el mapa con +.', 'Tap right on it. If they’re close together, zoom in with +.'), 3000); return; }
    finish(id === it.id, id);
  } });
  function finish(ok, tappedId) {
    locked = true; answers.replaceChildren();
    if (!ok && tappedId) { const tp = topic.items.find((x) => x.id === tappedId); map.setClass(tappedId, 'wrong'); map.label(tappedId, tp.name, 'wrong'); }
    map.setClass(it.id, ok ? 'correct' : 'correct reveal'); map.label(it.id, it.name, 'correct');
    recordAnswer(`${topic.id}:${it.id}`, ok);
    if (ok) { feedback.className = 'feedback good'; feedback.replaceChildren(h('strong', {}, tr(pick(PRAISE)))); }
    else { feedback.className = 'feedback bad'; feedback.replaceChildren(tr(both(() => L(`Respuesta: ${it.name}.`, `Answer: ${it.name}.`))), tipEl(it)); map.focus(it.id); }
    nextBtn.onclick = () => onDone(ok); nextBtn.hidden = false; nextBtn.focus();
  }
  let ask;
  if (mode === 'find') { map.reset(true); ask = [howBox('Toca en el mapa el sitio que se nombra.', 'Tap the named place on the map.'), h('p', { class: 'ask' }, tr(`Toca ${gd(topic).el} ${nEs}`, `Tap the ${nEn}`)), h('h2', { class: 'big-name' }, it.name)]; }
  else {
    map.dimOthers(true); map.setClass(it.id, 'target'); map.focus(it.id);
    ask = [howBox(mode === 'choose' ? 'Mira el mapa y toca el nombre correcto.' : 'Mira el mapa, escribe el nombre con sus tildes y pulsa Comprobar.', mode === 'choose' ? 'Look at the map and tap the right name.' : 'Look at the map, type the name with its accents, then press Check.'), h('p', { class: 'ask' }, tr(`¿Qué ${nEs} está iluminad${gd(topic).o}?`, `Which ${nEn} is lit up?`))];
    if (mode === 'choose') {
      const others = shuffle(topic.items.filter((x) => x.id !== it.id)), same = others.filter((x) => x.group === it.group).slice(0, 2);
      for (const o of shuffle([it, ...same, ...others.filter((x) => !same.includes(x))].slice(0, 4)))
        answers.append(h('button', { class: 'btn option', 'data-id': o.id, onclick: (e) => {
          if (locked) return; const ok = o.id === it.id; if (!ok) e.currentTarget.classList.add('wrong');
          answers.querySelectorAll('button').forEach((b) => { b.disabled = true; if (b.dataset.id === it.id) b.classList.add('right'); }); finish(ok);
        } }, o.name));
    } else {
      const names = [it.name, ...(it.alt || [])];
      const input = h('input', { class: 'spell-input', autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false', placeholder: L('Escribe el nombre…', 'Type the name…'), 'data-ph-es': 'Escribe el nombre…', 'data-ph-en': 'Type the name…' });
      const keys = h('div', { class: 'accent-keys' }, ...['á', 'é', 'í', 'ó', 'ú', 'ñ'].map((ch) => h('button', { type: 'button', class: 'key', onclick: () => { const ps = input.selectionStart ?? input.value.length; input.value = input.value.slice(0, ps) + ch + input.value.slice(input.selectionEnd ?? ps); input.focus(); input.setSelectionRange(ps + 1, ps + 1); } }, ch)));
      answers.append(h('form', { class: 'spell-form', onsubmit: (e) => { e.preventDefault(); if (locked || !input.value.trim()) return; finish(names.some((n) => plain(input.value) === plain(n))); } },
        input, keys, h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'submit' }, tr('Comprobar', 'Check')))));
      setTimeout(() => input.focus({ preventScroll: true }), 50);
    }
  }
  shell({ title, label, pct, back, map, side: { prompt: ask, rest: [answers, feedback, nextBtn] } });
}

/* final quiz: 20 questions across everything; one attempt each; different questions each time */
const EXAM_LENGTH = 20;
function quotas(topics, n) {   // how many plain questions each topic gets: proportional to its size, at least one, never more than it has
  const total = topics.reduce((a, t) => a + t.items.length, 0), share = (t) => (n * t.items.length) / total;
  const q = new Map(topics.map((t) => [t.id, Math.max(1, Math.min(t.items.length, Math.floor(share(t))))]));
  const sum = () => [...q.values()].reduce((a, b) => a + b, 0);
  while (sum() < n) { const t = [...topics].filter((t) => q.get(t.id) < t.items.length).sort((a, b) => (share(b) - q.get(b.id)) - (share(a) - q.get(a.id)))[0]; if (!t) break; q.set(t.id, q.get(t.id) + 1); }
  while (sum() > n) { const t = [...topics].sort((a, b) => q.get(b.id) - q.get(a.id))[0]; if (q.get(t.id) <= 1) break; q.set(t.id, q.get(t.id) - 1); }
  return q;
}
function buildExam(section, withConn) {
  // plain questions (tap it / name it / spell it) spread over the section's topics; optionally 6 "which river passes through…" questions
  const lastKey = `geo.lastExam.${section.id}`, last = new Set(store.get(lastKey) || []);
  const pool = scopedQuestions(section), size = examSize(section), nConn = withConn ? Math.min(6, pool.length) : 0, nItems = size - nConn;
  const q = quotas(section.topics, nItems), items = [];
  for (const t of section.topics) {
    const n = q.get(t.id), fresh = t.items.filter((it) => !last.has(`${t.id}:${it.id}`));
    for (const it of weightedPick(fresh.length >= n ? fresh : t.items, (x) => `${t.id}:${x.id}`, n)) items.push({ kind: 'item', topic: t, it });
  }
  const modes = shuffle(items.map((_, i) => (i % 20 < 7 ? 'find' : i % 20 < 15 ? 'choose' : 'type')));
  shuffle(items).forEach((e, i) => { e.mode = modes[i]; });
  const conns = [];
  if (nConn) {
    const byTopic = new Map(), fresh = pool.filter((x) => !last.has(x.id));
    for (const x of shuffle(fresh.length >= nConn ? fresh : pool)) { if (!byTopic.has(x.topic)) byTopic.set(x.topic, []); byTopic.get(x.topic).push(x); }
    while (conns.length < nConn && [...byTopic.values()].some((a) => a.length))
      for (const arr of shuffle([...byTopic.values()])) if (arr.length && conns.length < nConn) conns.push({ kind: 'conn', q: arr.shift() });
  }
  return shuffle([...items, ...conns]);
}
/* setup screen: he chooses whether to include connection questions */
function startExam(section) {
  setUserArea();
  const box = h('input', { type: 'checkbox', id: 'withConn' }); box.checked = store.get('geo.examConn') !== false;
  screen(h('section', { class: 'results' }, h('div', { class: 'card results-card' },
    h('p', { class: 'eyebrow' }, tr('Examen final', 'Final quiz')),
    h('h2', {}, tr(`${examSize(section)} preguntas de todo este apartado`, `${examSize(section)} questions on this whole part`)),
    h('p', { class: 'muted' }, tr('Tocar, nombrar y escribir. Un solo intento por pregunta y sin pistas.', 'Tap, name and spell. One try per question and no hints.')),
    h('label', { class: 'toggle examopt', for: 'withConn' }, box, ' ', section.id === 'comunidades' ? tr('Incluir 6 preguntas de conexiones (por ejemplo «¿qué comunidad no tiene costa?»)', 'Include 6 connection questions (e.g. “which community has no coast?”)') : tr('Incluir 6 preguntas de conexiones (por ejemplo «¿qué río desemboca en el Mediterráneo?»)', 'Include 6 connection questions (e.g. “which river flows into the Mediterranean?”)')),
    h('div', { class: 'row center' },
      h('button', { class: 'btn primary', onclick: () => { store.set('geo.examConn', box.checked); runExam(section, box.checked); } }, tr('Empezar', 'Start')),
      h('button', { class: 'btn ghost', onclick: () => renderSection(section) }, tr('Volver', 'Back'))))));
}
function runExam(section, withConn) {
  const entries = buildExam(section, withConn);
  store.set(`geo.lastExam.${section.id}`, entries.map((e) => (e.kind === 'conn' ? e.q.id : `${e.topic.id}:${e.it.id}`)));
  const results = [];
  const run = (i) => {
    if (i >= entries.length) return examResults(section, results, withConn);
    const e = entries[i], common = { title: ['Examen final', 'Final quiz'], label: [`Pregunta ${i + 1} de ${entries.length}`, `Question ${i + 1} of ${entries.length}`], pct: i / entries.length,
      back: () => { if (confirm(L('¿Salir del examen? Perderás esta ronda.', 'Leave the quiz? You’ll lose this round.'))) renderSection(section); } };
    if (e.kind === 'conn') {
      const ans = topicById(e.q.topic).items.find((x) => x.id === e.q.answer);
      askConn(e.q, { ...common, staged: false, onDone: (ok) => { results.push({ topic: e.q.topic, ok, name: ans.name }); run(i + 1); } });
    } else askItem(e, { ...common, onDone: (ok) => { results.push({ topic: e.topic.id, ok, name: e.it.name }); run(i + 1); } });
  };
  run(0);
}
function examResults(section, results, withConn) {
  const score = results.filter((r) => r.ok).length;
  const prev = store.get(bestKey(section)), better = !prev || score / results.length > prev.score / prev.total, best = better ? { score, total: results.length } : prev; store.set(bestKey(section), best);
  const rows = section.topics.map((t) => { const rs = results.filter((r) => r.topic === t.id); return rs.length ? h('div', { class: 'break-row' }, h('span', {}, tr(t.title)), h('strong', {}, `${rs.filter((r) => r.ok).length} / ${rs.length}`)) : null; });
  resultsScreen({ eyebrow: ['Examen terminado', 'Quiz complete'], score, total: results.length, missed: [...new Set(results.filter((r) => !r.ok).map((r) => r.name))],
    extra: h('div', { class: 'breakdown' }, ...rows, h('p', { class: 'small' }, tr(`Mejor nota: ${best.score} / ${best.total}`, `Best score: ${best.score} / ${best.total}`))),
    again: () => runExam(section, withConn), againLabel: ['Otro examen', 'Another quiz'], back: () => renderSection(section) });
}

/* -------------------------------------------------------------------- boot */
async function signOut(expired) {
  const token = state.session?.token;
  state.session = null; state.progress = new Map(); store.del('geo.session'); store.del(pendingKey);
  if (token && !expired) api('logout_player', { p_token: token }).catch(() => {});
  renderLogin('signin', expired ? ERRORS.not_signed_in : null);
}
$('#logoutBtn').addEventListener('click', () => signOut(false));
$('#userChip').addEventListener('click', () => { if (state.session) renderChangePin(); });
$('#langBtn').addEventListener('click', () => setLang(lang === 'es' ? 'en' : 'es'));
setLang(lang);
$('#homeBtn').addEventListener('click', () => (state.session ? renderHome() : renderLogin()));

(async function boot() {
  if (!state.session) return renderLogin();
  setUserArea();
  app.replaceChildren(h('p', { class: 'loading' }, L('Cargando…', 'Loading…')));
  try { await loadProgress(); flushPending(); renderHome(); }
  catch (e) {
    if (e.code === 'not_signed_in') signOut(true);
    else { renderHome(); toast(e.message, 4000); }
  }
})();
