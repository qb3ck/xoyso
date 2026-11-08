/* Maths question of the day. One question per day per year group, from qotd/questions.json.
   Marks (right / wrong) are kept on the device and synced to the account like the other pages. */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const app = $('#app');
const KEY = 'qotd-progress';
const GROUPS = [['3primaria', '3º Primaria'], ['1eso', '1º ESO']];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const dayDiff = (a, b) => Math.round((parse(a) - parse(b)) / 864e5);
const session = () => { try { const o = JSON.parse(localStorage.getItem('geo.session')); return o && o.token ? o : null; } catch (e) { return null; } };
const load = () => { try { const o = JSON.parse(localStorage.getItem(KEY) || '{}'); return { owner: o.owner || null, d: o.d || {}, q: o.q || [], g: o.g || null }; } catch (e) { return { owner: null, d: {}, q: [], g: null }; } };
let DB = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { /* storage unavailable */ } };

let DATA = null, group = null, sel = null, shown = false, viewMonth = null;
const today = () => ymd(new Date());
const qFor = (g, date) => { const i = dayDiff(date, DATA.start); const list = DATA.groups[g]; return i >= 0 && i < list.length ? list[i] : null; };
const mark = (g, date) => DB.d[`${g}:${date}`] || null;

/* ---- account sync (progress rows qotd:<year>:<date>; the latest answer decides right/wrong) ---- */
let CFG = null, flushing = false;
async function rpc(fn, args) {
  CFG = CFG || await import('/config.js');
  const res = await fetch(`${CFG.SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: CFG.SUPABASE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
  const text = await res.text(), data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error((data && data.message) || 'error');
  return data;
}
async function flush() {
  const u = session(); if (!u || flushing || DB.owner !== u.username) return false; flushing = true;
  try { while (DB.q.length) { const e = DB.q[0]; await rpc('record_answer', { p_token: u.token, p_item_id: e.id, p_correct: e.c }); DB.q.shift(); save(); } return true; }
  catch (e) { return false; } finally { flushing = false; }
}
async function syncStart() {
  const u = session(); if (!u) return;
  try {
    if (DB.owner && DB.owner !== u.username) DB = { owner: null, d: {}, q: [], g: DB.g };   // another child used this device
    const remote = await rpc('get_progress', { p_token: u.token }), known = new Set(remote.items.map((i) => i.item_id));
    if (!DB.owner) { Object.entries(DB.d).forEach(([k, v]) => { if (!known.has('qotd:' + k)) DB.q.push({ id: 'qotd:' + k, c: v === 'r' }); }); DB.owner = u.username; save(); }
    if (!(await flush())) return;
    const fresh = await rpc('get_progress', { p_token: u.token });
    fresh.items.filter((i) => i.item_id.startsWith('qotd:') && i.correct + i.wrong > 0).forEach((i) => { DB.d[i.item_id.slice(5)] = i.streak > 0 ? 'r' : 'w'; });
    save(); render();
  } catch (e) { /* offline: keep working from this device */ }
}
function setMark(g, date, v) {
  DB.d[`${g}:${date}`] = v; const u = session();
  if (u && DB.owner === u.username) DB.q.push({ id: `qotd:${g}:${date}`, c: v === 'r' });
  save(); flush(); render();
}

/* ---- screens ---- */
function stars(n) { return `<span class="stars" aria-label="Difficulty ${n} of 3">${'★'.repeat(n)}<i>${'★'.repeat(3 - n)}</i></span>`; }
function longDate(s) { const d = parse(s); return `${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; }
function render() {
  const t = today(), n = DATA.groups[group].length;
  const dates = Array.from({ length: n }, (_, i) => ymd(new Date(parse(DATA.start).getTime() + i * 864e5)));
  const open = dates.filter((d) => d <= t);
  const done = open.filter((d) => mark(group, d)).length, right = open.filter((d) => mark(group, d) === 'r').length, missed = open.length - done;
  if (!sel || !qFor(group, sel) || sel > t) sel = open.includes(t) ? t : (open.length ? open[open.length - 1] : null);
  const todayOpen = dates.includes(t);
  if (!viewMonth) viewMonth = (sel || t).slice(0, 7);
  const q = sel ? qFor(group, sel) : null, m = q ? mark(group, sel) : null;
  const [vy, vm] = viewMonth.split('-').map(Number), first = new Date(vy, vm - 1, 1), lead = (first.getDay() + 6) % 7, dim = new Date(vy, vm, 0).getDate();
  const minM = DATA.start.slice(0, 7), maxM = dates[dates.length - 1].slice(0, 7);
  let cells = ''; for (let i = 0; i < lead; i++) cells += '<span class="day none"></span>';
  for (let d = 1; d <= dim; d++) {
    const ds = `${vy}-${pad(vm)}-${pad(d)}`, has = !!qFor(group, ds), fut = ds > t, mk = mark(group, ds);
    const cls = ['day', has ? 'q' : 'none-q', has && fut ? 'future' : '', has && !fut && !mk ? 'missed' : '', mk || '', ds === t ? 'today' : '', ds === sel ? 'sel' : ''].join(' ');
    cells += `<button class="${cls}" data-d="${ds}" ${has && !fut ? '' : 'disabled'} aria-label="${longDate(ds)}${mk ? (mk === 'r' ? ', right' : ', wrong') : has && !fut ? ', not done' : ''}">${d}${mk ? `<small>${mk === 'r' ? '✓' : '✗'}</small>` : ''}</button>`;
  }
  app.innerHTML = `<div class="crumbs"><a class="link" href="/">xoyso</a></div>
   <header class="hero"><h1>Maths question of the day</h1><p>Reto de mates del día. One new question every day. Work it out on paper, then check the answer and the working. Missed a day? Go back and do it from the calendar.</p></header>
   <div class="tabs" role="group" aria-label="Year">${GROUPS.map(([g, n2]) => `<button class="tab" data-g="${g}" aria-pressed="${g === group}">${n2}</button>`).join('')}</div>
   <div class="stats"><div class="stat hi"><b>${done}/${open.length}</b><span>questions done</span></div><div class="stat"><b>${right}</b><span>got right</span></div><div class="stat"><b>${missed}</b><span>still to do</span></div></div>
   ${q ? `<div class="panel qbox"><div class="qhead"><p class="eyebrow">${sel === t ? 'Today · ' : ''}${longDate(sel)}</p>${stars(q.d)}</div>
     <p class="qtext">${esc(q.q)}</p>
     ${shown ? `<div><p class="eyebrow">Answer</p><p class="answer">${esc(q.a)}</p></div><div><p class="eyebrow">Working</p><ol class="work">${q.work.map((w) => `<li>${esc(w)}</li>`).join('')}</ol></div>
       <div><p class="eyebrow">${m ? 'Marked: ' + (m === 'r' ? 'right' : 'wrong') + '. Tap to change.' : 'How did you do? Be honest.'}</p><div class="mark"><button class="btn ${m === 'r' ? 'on r' : ''}" data-m="r">✓ I got it right</button><button class="btn ${m === 'w' ? 'on w' : ''}" data-m="w">✗ I got it wrong</button></div></div>`
     : `<div class="how"><b>Do this</b><span>Work it out on paper first. Only then tap the button to see the answer and the working.</span></div><button class="btn primary" id="show">Show the answer and working</button>`}
    </div>` : `<div class="panel"><p class="clue">The first question appears on ${longDate(DATA.start)}.</p></div>`}
   <h2 class="sec">Calendar</h2>
   <div class="calnav"><button id="pm" aria-label="Previous month" ${viewMonth <= minM ? 'disabled' : ''}>‹</button><b style="font-family:var(--display);font-size:1.2rem">${MONTHS[vm - 1]} ${vy}</b><button id="nm" aria-label="Next month" ${viewMonth >= maxM ? 'disabled' : ''}>›</button></div>
   <div class="cal">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((x) => `<span class="dow">${x}</span>`).join('')}${cells}</div>
   <div class="leg"><span><i class="r"></i>Right</span><span><i class="w"></i>Wrong</span><span><i class="m"></i>Not done yet</span><span>Greyed days are not open yet</span></div>
   <p class="hint" style="margin-top:14px">${session() ? 'Your marks are saved to your account.' : 'Sign in on the main xoyso page to save your marks to your account.'}</p>`;
  app.querySelectorAll('.tab').forEach((b) => { b.onclick = () => { group = b.dataset.g; DB.g = group; save(); sel = null; shown = false; viewMonth = null; render(); }; });
  app.querySelectorAll('.day[data-d]').forEach((b) => { b.onclick = () => { sel = b.dataset.d; shown = false; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }; });
  if ($('#show')) $('#show').onclick = () => { shown = true; render(); };
  app.querySelectorAll('[data-m]').forEach((b) => { b.onclick = () => setMark(group, sel, b.dataset.m); });
  if ($('#pm')) $('#pm').onclick = () => { const d = new Date(vy, vm - 2, 1); viewMonth = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; render(); };
  if ($('#nm')) $('#nm').onclick = () => { const d = new Date(vy, vm, 1); viewMonth = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; render(); };
}
(async () => {
  try {
    DATA = await (await fetch('/qotd/questions.json')).json();
    const u = session(), yr = u && u.year; group = yr && DATA.groups[yr] ? yr : (DB.g && DATA.groups[DB.g] ? DB.g : '1eso');
    render(); syncStart();
  } catch (e) { app.innerHTML = '<p class="fb bad">Could not load the questions. Check your connection and refresh.</p>'; }
})();
