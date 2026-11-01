import { MAP } from './map-data.js';
import { SUPABASE_URL, SUPABASE_KEY, TOPICS, SECTIONS } from './config.js';

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
  constructor(topic, { onTap, showCities = true } = {}) {
    this.topic = topic; this.onTap = onTap;
    this.full = [0, 0, MAP.width, MAP.height];
    this.vb = [...this.full];
    this.el = h('div', { class: 'map-wrap' });
    const svg = this.svg = s('svg', { class: 'map', viewBox: this.full.join(' '), role: 'img', 'aria-label': L('Mapa de España', 'Map of Spain') });
    svg.append(
      s('rect', { x: -200, y: -200, width: MAP.width + 400, height: MAP.height + 400, class: 'sea' }),
      s('path', { d: MAP.neighbours, class: 'land-other' }),
      s('path', { d: MAP.spain, class: 'land-spain' }),
      s('path', { d: MAP.bg.meseta, class: 'bg-meseta' }),
      s('path', { d: MAP.bg.depr, class: 'bg-depr' }),
      s('path', { d: MAP.bg.ranges, class: 'bg-ranges' }),
      s('path', { d: MAP.regions, class: 'regions' }),
    );
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
    this.citiesG = s('g', { class: 'cities' });
    if (showCities) for (const c of MAP.cities) {
      const g = s('g', { transform: `translate(${c.x} ${c.y})` });
      g.append(s('circle', { r: 2.6, class: 'city-dot' }));
      const t = s('text', { x: 5, y: 3.5, class: 'city-label' }); t.textContent = c.name; g.append(t);
      this.citiesG.append(g);
    }
    svg.append(this.citiesG);
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
  clearAll() { for (const id of this.paths.keys()) this.setClass(id, ''); this.labelsG.replaceChildren(); }
  dimOthers(on) { this.itemsG.classList.toggle('dim', on); }
  label(itemId, text, cls = '') {
    this.labelsG.querySelector(`[data-id="${itemId}"]`)?.remove();
    const [x, y] = geometry(`${this.topic.id}:${itemId}`).anchor;
    const t = s('text', { x, y, class: `item-label ${cls}`, 'data-id': itemId }); t.textContent = text;
    this.labelsG.append(t);
  }
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
const sectionOf = (topic) => SECTIONS.find((s) => s.topics.includes(topic)) || SECTIONS[0];
const tipEl = (it) => (it.tip ? h('div', { class: 'tip' },
  h('p', {}, h('strong', {}, tr('💡 Truco: ', '💡 Memory tip: ')), tr(it.tip)),
  it.silly ? h('p', { class: 'silly' }, h('strong', {}, tr('🤪 Para recordarlo: ', '🤪 Silly way to remember: ')), tr(it.silly)) : null) : null);
const both = (fn) => [((l) => { const o = lang; lang = l; const r = fn(); lang = o; return r; })('es'), ((l) => { const o = lang; lang = l; const r = fn(); lang = o; return r; })('en')];

function renderLogin(mode = 'signin', message = null) {
  setUserArea();
  let pin = '';
  const signin = mode === 'signin';
  const nameInput = h('input', { id: 'username', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', maxlength: 20,
    placeholder: L('p. ej. sam', 'e.g. sam'), 'data-ph-es': 'p. ej. sam', 'data-ph-en': 'e.g. sam' });
  const dots = h('div', { class: 'pin-dots', 'aria-label': 'PIN' });
  const err = h('p', { class: 'form-error', role: 'alert' }, message ? tr(message) : '');
  const btnText = signin ? ['Entrar', 'Sign in'] : ['Crear jugador', 'Create player'];
  const submit = h('button', { class: 'btn primary wide', type: 'submit' }, tr(btnText));
  const drawDots = () => { dots.replaceChildren(...Array.from({ length: Math.max(4, pin.length) }, (_, i) => h('span', { class: i < pin.length ? 'on' : '' }))); };
  const press = (d) => { if (d === 'del') pin = pin.slice(0, -1); else if (pin.length < 6) pin += d; drawDots(); err.replaceChildren(); };
  const pad = h('div', { class: 'pinpad' },
    ...['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => h('button', { type: 'button', onclick: () => press(d) }, d)),
    h('span'), h('button', { type: 'button', onclick: () => press('0') }, '0'),
    h('button', { type: 'button', 'aria-label': L('Borrar', 'Delete'), onclick: () => press('del') }, '⌫'));
  document.onkeydown = (e) => {
    if (document.activeElement === nameInput) return;
    if (/^[0-9]$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del');
  };
  drawDots();
  const fail = (pair) => { err.replaceChildren(tr(pair)); };
  const form = h('form', { class: 'card login-card', onsubmit: async (e) => {
    e.preventDefault(); err.replaceChildren();
    const username = nameInput.value.trim().toLowerCase();
    if (!username) { fail(['Primero escribe tu nombre.', 'Type your name first.']); nameInput.focus(); return; }
    if (pin.length < 4) { fail(['Escribe un PIN de al menos 4 cifras.', 'Enter a PIN of at least 4 digits.']); return; }
    submit.disabled = true; submit.replaceChildren(tr('Un momento…', 'Just a moment…'));
    try {
      const res = await api(signin ? 'login_player' : 'register_player', { p_username: username, p_pin: pin });
      state.session = { token: res.token, username: res.username }; store.set('geo.session', state.session);
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
    h('label', {}, tr(signin ? ['PIN', 'PIN'] : ['Elige un PIN (de 4 a 6 cifras)', 'Choose a PIN (4–6 digits)'])), dots, pad, err, submit,
    h('button', { type: 'button', class: 'link-btn', onclick: () => renderLogin(signin ? 'signup' : 'signin') },
      tr(signin ? ['¿Primera vez? Crea un jugador', 'First time? Create a player'] : ['¿Ya tienes jugador? Entra', 'Already have a player? Sign in'])));
  screen(h('section', { class: 'login' }, h('div', { class: 'hero-map', html: heroMapSvg() }), form));
  nameInput.focus();
}
function heroMapSvg() {
  const rivers = Object.entries(MAP.items).filter(([k]) => k.startsWith('rivers:')).map(([, v]) => `<path d="${v.d}"/>`).join('');
  return `<svg viewBox="0 0 ${MAP.width} ${MAP.height}" aria-hidden="true"><path class="land-spain" d="${MAP.spain}"/><g class="hero-rivers">${rivers}</g></svg>`;
}

function sectionSummary(section) {
  return section.topics.reduce((acc, t) => { const x = topicSummary(t); return { mastered: acc.mastered + x.mastered, total: acc.total + x.total }; }, { mastered: 0, total: 0 });
}
function renderHome() {
  setUserArea(); document.onkeydown = null;
  const cards = SECTIONS.map((sec) => {
    const { mastered, total } = sectionSummary(sec);
    return h('button', { class: 'card topic-card', onclick: () => renderSection(sec) },
      h('div', { class: 'topic-icon', html: topicIcon('geo1eso') }),
      h('div', { class: 'topic-text' }, h('h2', {}, tr(sec.title)), h('p', { class: 'muted' }, tr(sec.blurb)),
        h('div', { class: 'meter' }, h('span', { style: `width:${(100 * mastered) / total}%` })),
        h('p', { class: 'small' }, tr(`${mastered} de ${total} dominados`, `${mastered} of ${total} mastered`))));
  });
  screen(h('section', { class: 'home' },
    h('h1', {}, tr(`¡Hola, ${state.session.username}!`, `Hi ${state.session.username}!`)),
    h('p', { class: 'muted lead' }, tr('¿Qué quieres repasar hoy?', 'What do you want to revise today?')),
    h('div', { class: 'topic-grid' }, ...cards)));
}
function renderSection(section) {
  setUserArea(); document.onkeydown = null;
  const cards = section.topics.map((t) => {
    const { mastered, total } = topicSummary(t);
    return h('button', { class: 'card topic-card', onclick: () => renderTopic(t) },
      h('div', { class: 'topic-icon', html: topicIcon(t.id) }),
      h('div', { class: 'topic-text' }, h('h2', {}, tr(t.title)), h('p', { class: 'muted' }, tr(t.blurb)),
        h('div', { class: 'meter' }, h('span', { style: `width:${(100 * mastered) / total}%` })),
        h('p', { class: 'small' }, tr(`${mastered} de ${total} dominados`, `${mastered} of ${total} mastered`))));
  });
  screen(h('section', { class: 'home' },
    h('button', { class: 'back', onclick: renderHome }, '← ', tr('Inicio', 'Home')),
    h('h1', {}, tr(section.title)),
    h('p', { class: 'muted lead' }, tr('Elige un tema para repasar.', 'Choose a topic to revise.')),
    h('div', { class: 'topic-grid' }, ...cards)));
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
  if (id === 'relief') return `<svg viewBox="0 0 48 48"><path d="M4 36l9-14 6 8 8-16 7 12 6-5 4 15z" ${stroke}/></svg>`;
  return '<svg viewBox="0 0 48 48"><path d="M6 38l12-20 8 12 5-7 11 15z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/></svg>';
}

function renderTopic(topic) {
  setUserArea();
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
      mode(['¿Cuál es?', 'Name it'], [`Se ilumina ${gd(topic).un} ${nEs}. Elige su nombre.`, `One ${nEn} lights up. Pick its name.`], ICONS.name, () => startQuiz(topic, 'choose')),
      mode(['Escríbelo', 'Spell it'], ['Como ¿Cuál es?, pero escribes tú el nombre, con sus tildes.', 'Like Name it, but you type the name, accents and all.'], ICONS.spell, () => startQuiz(topic, 'type')),
      mode(['Mi progreso', 'My progress'], ['Mira lo que ya dominas y lo que tienes que practicar.', 'See what you’ve mastered and what needs practice.'], ICONS.progress, () => renderProgress(topic)))));
}
const ICONS = {
  learn: '<svg viewBox="0 0 32 32"><path d="M4 7l8-3 8 3 8-3v21l-8 3-8-3-8 3z M12 4v21 M20 7v21" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
  find: '<svg viewBox="0 0 32 32"><circle cx="16" cy="13" r="6" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M16 29s-10-8.5-10-16a10 10 0 0120 0c0 7.5-10 16-10 16z" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
  name: '<svg viewBox="0 0 32 32"><rect x="4" y="6" width="24" height="6" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="4" y="14" width="24" height="6" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="4" y="22" width="24" height="6" rx="2" fill="currentColor" opacity=".35"/></svg>',
  spell: '<svg viewBox="0 0 32 32"><path d="M5 26l5-16h2l5 16 M7.5 20h7 M20 26V12m0 7c0-4 7-4 7 0v7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 7l3-3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
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
    h('div', { class: 'play-body' }, map.el, h('aside', { class: 'side' }, card, chips))));
}

/* --- quizzes --- */
function startQuiz(topic, mode) {
  const round = { topic, mode, items: pickRound(topic, ROUND_LENGTH), i: 0, score: 0, missed: [] };
  renderQuiz(round);
}
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
  const map = new MapView(topic, { onTap: (id) => onMapTap(id) });
  const current = () => round.items[round.i];
  const titles = { find: ['Encuéntralo', 'Find it'], choose: ['¿Cuál es?', 'Name it'], type: ['Escríbelo', 'Spell it'] };
  const hintBtn = (box) => { const b = h('button', { type: 'button', class: 'btn ghost', onclick: () => { if (locked) return; b.disabled = true; box.replaceChildren(h('strong', {}, tr('Pista: ', 'Hint: ')), tr(current().fact)); box.hidden = false; } }, tr('💡 Pista', '💡 Hint')); return b; };
  const dontKnow = () => h('button', { type: 'button', class: 'btn ghost', onclick: () => giveUp() }, tr('No lo sé', 'I don’t know'));

  function setup() {
    locked = false; feedback.replaceChildren(); feedback.className = 'feedback'; nextBtn.hidden = true;
    map.clearAll(); map.dimOthers(false); answers.replaceChildren();
    const box = h('div', { class: 'feedback hint', hidden: true });
    progressBar.firstChild.style.width = `${(100 * round.i) / round.items.length}%`;
    const it = current();
    const counter = h('p', { class: 'eyebrow' }, tr(`Pregunta ${round.i + 1} de ${round.items.length}`, `Question ${round.i + 1} of ${round.items.length}`));
    if (mode === 'find') {
      map.reset(true);
      prompt.replaceChildren(counter, h('p', { class: 'ask' }, tr(`Toca ${gd(topic).el} ${nEs}`, `Tap the ${nEn}`)), h('h2', { class: 'big-name' }, it.name));
      answers.append(h('div', { class: 'row' }, hintBtn(box), dontKnow()), box);
    } else {
      map.dimOthers(true); map.setClass(it.id, 'target'); map.focus(it.id);
      prompt.replaceChildren(counter, h('p', { class: 'ask' }, tr(`¿Qué ${nEs} está iluminad${gd(topic).o}?`, `Which ${nEn} is lit up?`)));
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
  function onMapTap(id) {
    if (mode !== 'find' || locked) return;
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

/* -------------------------------------------------------------------- boot */
async function signOut(expired) {
  const token = state.session?.token;
  state.session = null; state.progress = new Map(); store.del('geo.session'); store.del(pendingKey);
  if (token && !expired) api('logout_player', { p_token: token }).catch(() => {});
  renderLogin('signin', expired ? ERRORS.not_signed_in : null);
}
$('#logoutBtn').addEventListener('click', () => signOut(false));
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
