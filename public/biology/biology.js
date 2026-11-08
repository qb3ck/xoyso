/* Biology revision engine. A unit is a JSON file (see unit2.json) listed in units.json.
   Add a unit: drop unitN.json in this folder and add one line to units.json. */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (a, n) => shuffle(a).slice(0, n);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const KEY = 'bio-progress';
const store = { get() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }, set(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* storage unavailable */ } } };
let DB = store.get(), UNITS = [], U = null;
const prog = () => (DB[U.id] = DB[U.id] || { best: {}, runs: {} });
function record(act, pct) { const p = prog(); p.runs[act] = (p.runs[act] || 0) + 1; if (pct > (p.best[act] || 0)) p.best[act] = pct; store.set(DB); }

/* topic tracking for Guide my learning: prog().topics[k] = {n: answers seen, r: last 20 results (1/0)} */
function note(k, ok) {
  if (!k) return; const t = (prog().topics = prog().topics || {}); const o = (t[k] = t[k] || { n: 0, r: [] }); o.n++; o.r.push(ok ? 1 : 0); if (o.r.length > 20) o.r.shift();
  const u = session(); if (u && DB.sync && DB.sync.owner === u.username) DB.sync.q.push({ id: `bio:${U.id}:${k}`, c: !!ok });   // owner not set yet: the start-up sync uploads it
  store.set(DB); syncFlush();
}
/* ---- account sync: each topic answer is a Supabase progress row bio:<unit>:<topic>, like the spelling words ---- */
const session = () => { try { const o = JSON.parse(localStorage.getItem('geo.session')); return o && o.token ? o : null; } catch (e) { return null; } };
let CFG = null, flushing = false;
async function rpc(fn, args) {
  CFG = CFG || await import('/config.js');
  const res = await fetch(`${CFG.SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: CFG.SUPABASE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
  const text = await res.text(), data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error((data && data.message) || 'error');
  return data;
}
async function syncFlush() {
  const u = session(); if (!u || flushing || !DB.sync || DB.sync.owner !== u.username) return false; flushing = true;
  try { while (DB.sync.q.length) { const e = DB.sync.q[0]; await rpc('record_answer', { p_token: u.token, p_item_id: e.id, p_correct: e.c }); DB.sync.q.shift(); store.set(DB); } return true; }
  catch (e) { return false; } finally { flushing = false; }
}
async function syncStart() {
  const u = session(); if (!u) return;
  try {
    if (DB.sync && DB.sync.owner && DB.sync.owner !== u.username) { Object.values(DB).forEach((p) => { if (p && p.topics) delete p.topics; }); DB.sync = null; }   // a different child used this device
    if (!DB.sync || !DB.sync.owner) {   // first time for this child: upload the topic history already on this device
      const remote = await rpc('get_progress', { p_token: u.token }), known = new Set(remote.items.map((i) => i.item_id)); const q = [];
      Object.entries(DB).forEach(([uid, p]) => { if (p && p.topics) Object.entries(p.topics).forEach(([k, o]) => { if (!known.has(`bio:${uid}:${k}`)) o.r.forEach((c) => q.push({ id: `bio:${uid}:${k}`, c: !!c })); }); });
      DB.sync = { owner: u.username, q }; store.set(DB);
    }
    if (!(await syncFlush())) return;
    const fresh = await rpc('get_progress', { p_token: u.token });
    fresh.items.filter((i) => i.item_id.startsWith('bio:' + U.id + ':')).forEach((i) => {
      const k = i.item_id.split(':')[2], n = i.correct + i.wrong, t = (prog().topics = prog().topics || {});
      if (t[k] && t[k].n >= n) return;   // this device already knows at least as much
      const w = Math.min(20, n), good = Math.round((i.correct / n) * w);
      t[k] = { n, r: [...Array(w - good).fill(0), ...Array(good).fill(1)] };
    });
    store.set(DB); if ($('#guideRoot')) RUN.guide();
  } catch (e) { /* offline: keep working from this device */ }
}

const ACTS = {
  guide: { name: 'Guide my learning', icon: '🧭', blurb: 'See what you know, what needs work, and what to do next.' },
  focus: { name: 'Topic practice', icon: '◎', blurb: '' },
  sort: { name: 'Sort it', icon: '⇅', blurb: 'Which group does each statement describe?' },
  features: { name: 'Features table', icon: '▦', blurb: 'Mark each box with a tick or a cross.' },
  label: { name: 'Label the drawing', icon: '✎', blurb: 'Name the shapes and parts.' },
  cloze: { name: 'Complete the notes', icon: '…', blurb: 'Fill the gaps with the right words.' },
  pdfexam: { name: 'Exam paper', icon: '📝', blurb: '20 mixed questions from the two PDFs. Your best score is saved.' },
  xfeatures: { name: 'Exam: features table', icon: '▦', blurb: 'Tick or cross each box, using only the PDFs.' },
  xcloze: { name: 'Exam: complete the notes', icon: '…', blurb: 'The summary notes with gaps to fill.' },
  xlabel: { name: 'Exam: label the diagrams', icon: '✎', blurb: 'The diagrams from the summary notes.' },
  xspell: { name: 'Exam: spell the labels', icon: 'Abc', blurb: 'Type the names on the PDF diagrams. Spelling counts.' },
  xlearn: { name: 'Exam: written answers', icon: '⟳', blurb: 'Exam-style questions. Write on paper, then check.' },
  spell: { name: 'Spell the labels', icon: 'Abc', blurb: 'Type the names on the drawings. Spelling counts.' },
  riddles: { name: 'Who am I?', icon: '?', blurb: 'Fewer clues means more points.' },
  order: { name: 'Put in order', icon: '1·2·3', blurb: 'Steps of reproduction in the right order.' },
  learn: { name: 'Learn the answers', icon: '⟳', blurb: 'Try it from memory first. Peek at the points only if you need to. Then redo the gaps.' },
  explain: { name: 'Explain it', icon: '✍', blurb: 'Answer as in the exam, then check the key points.' },
  vocab: { name: 'Vocabulary', icon: 'Aa', blurb: 'Key terms and what they mean.' },
  exam: { name: 'Final exam', icon: '★', blurb: 'A mixed test. Your best score is saved.' },
};

const app = $('#app');
const how = (tag, text) => `<div class="how"><b>${tag}</b><span>${text}</span></div>`;
/* what to do in each activity: shown as a numbered "How it works" screen the first time, and as a highlighted box during it */
const HOW = {
  learn: ['Write what you know about the question on paper. The key points are hidden. If you do not know it yet, tap Show me the points, read them, cover them, and try again.', 'Press I\'ve written it. The key points appear.', 'Tick the points you included. Questions with gaps come round again until you have them.'],
  sort: ['Read the statement.', 'Tap the group it describes.', 'If you are wrong, the right group is shown. Remember it for next time.'],
  features: ['Look at each feature in the list.', 'In every box tap ✓ if the group has it or ✗ if not. Every box needs an answer.', 'Press Check. Green is right, red is wrong.'],
  label: ['Look at the picture and its numbers.', 'Tap a word, then tap the number it belongs to.', 'Press Check. The right names are shown for any mistakes.'],
  cloze: ['Read the sentence with its gaps.', 'Tap a word, then tap the gap it fits.', 'Press Check. The right words are shown for any mistakes.'],
  spell: ['Look at the drawing and its numbers.', 'Type the name for each number. Spelling counts.', 'Press Check. Spelling slips and the right spelling are shown.'],
  riddles: ['Read the first clue.', 'Guess as early as you can. Fewer clues means more points.', 'Tap Another clue only if you need one.'],
  order: ['Read the steps. They are in a mixed-up order.', 'Tap them in the order they happen.', 'Press Check. Tap a chosen step to take it back.'],
  vocab: ['Read the question.', 'Tap the right answer.', 'If you are wrong, the right answer is shown. Remember it.'],
  explain: ['Read the question.', 'Write your answer on paper, in 2 or 3 sentences.', 'Show the key points and tick the ones you included. Be honest.'],
  exam: ['Answer 20 questions from every activity.', 'Tap the best answer each time.', 'Your best score is saved. Check the review list at the end.'],
};
HOW.xfeatures = HOW.features; HOW.xcloze = HOW.cloze; HOW.xlabel = HOW.label; HOW.xspell = HOW.spell; HOW.xlearn = HOW.learn;
HOW.pdfexam = ['Answer 20 questions taken from the concept map and the summary notes.', 'Tap the best answer each time.', 'Your best score is saved. Check the review list at the end.'];
const HOWQ = { feeding: 'Tap how it gets its food.', importance: 'Tap Helpful or Harmful.', tf: 'Tap True or False. Then read the reason that appears.', pdftf: 'Tap True or False. Then read the reason that appears.', pdf: 'Tap the best answer. Then read the reason that appears.' };
const seen = (k) => { try { return !!JSON.parse(localStorage.getItem('bio-seen') || '{}')[k]; } catch (e) { return false; } };
const markSeen = (k) => { try { const o = JSON.parse(localStorage.getItem('bio-seen') || '{}'); o[k] = 1; localStorage.setItem('bio-seen', JSON.stringify(o)); } catch (e) { /* storage unavailable */ } };
const stepsHtml = (arr) => `<ol class="steps">${arr.map((t, i) => `<li><i>${i + 1}</i><span>${['READ', 'DO', 'CHECK'][i] ? '' : ''}${esc(t)}</span></li>`).join('')}</ol>`;
const bk = (it) => it.pg ? `<p class="hint" style="margin:0">📖 In the book: ${esc(it.pg)}</p>` : '';
const hintUi = (it) => it.hint ? '<button class="btn" id="hint">💡 Hint: what to include</button><div id="hb" style="width:100%"></div>' : '';
const wireHint = (it) => { const b = $('#hint'); if (b) b.onclick = () => { $('#hb').innerHTML = how('Hint', esc(it.hint)); b.hidden = true; }; };
const topBar = (left, right = '') => `<div class="top">${left}<span class="eyebrow">${right}</span></div>`;
const link = (href, text) => `<a class="link" href="${href}">${text}</a>`;

/* ---------- lists ---------- */
function listHome() {
  document.title = 'Biology · xoyso';
  app.innerHTML = `${link('/', '← xoyso')}<header class="hero"><h1>Biology</h1><p>1º ESO. Pick a unit to revise.</p></header>
   <div class="grid">${UNITS.map((u) => { const b = DB[u.id] && DB[u.id].best && DB[u.id].best.exam; return `<a class="act main" href="?u=${u.id}" style="text-decoration:none;color:inherit"><h3>${esc(u.title)}</h3><p>${esc(u.blurb)}</p>${b ? `<span class="pill">Exam best ${b}%</span>` : ''}</a>`; }).join('')}</div>`;
}
function unitHome() {
  document.title = U.short + ' · Biology';
  const best = prog().best;
  const cardOf = (a, main) => `<button class="act ${main ? 'main' : ''}" data-a="${a}"><span class="demo">${ACTS[a].icon}</span><h3>${ACTS[a].name}</h3><p>${ACTS[a].blurb}</p>${best[a] != null ? `<span class="pill">Best ${best[a]}%</span>` : ''}</button>`;
  const ex = (U.examActs || []).filter((a) => ACTS[a]);
  const rest = U.activities.filter((a) => ACTS[a] && a !== 'guide');
  app.innerHTML = `<div class="crumbs">${link('/', 'xoyso')}<span class="hint">›</span>${link('/biology', 'Biology')}</div>
   <header class="hero"><h1>${esc(U.title)}</h1><p>${esc(U.blurb)}</p></header>
   ${ACTS.guide && U.activities.includes('guide') ? `<div class="grid">${cardOf('guide', true)}</div>` : ''}
   ${ex.length ? `<div class="row" style="justify-content:flex-start;margin-top:14px"><button class="btn primary" id="nxt">➜ What should I try next?</button></div><h2 class="sec" style="margin:18px 0 4px">Exam practice</h2><p class="hint" style="margin:0 0 8px">Built only from the concept map and the summary notes, which is what the exam covers. Where to read more in the book: ${esc(U.bookpages || '')}.</p><div class="grid">${ex.map((a) => cardOf(a, a === 'pdfexam')).join('')}</div>` : ''}
   <h2 class="sec" style="margin:18px 0 4px">${ex.length ? 'More revision (from the book)' : 'Activities'}</h2><div class="grid">${rest.map((a) => cardOf(a, a === 'exam')).join('')}</div>`;
  app.querySelectorAll('[data-a]').forEach((b) => { b.onclick = () => RUN[b.dataset.a](); });
  if ($('#nxt')) $('#nxt').onclick = () => RUN.next();
  scrollTo(0, 0);
}
const finishCard = (act, label, pct, extra = '', again) => {
  record(act, pct);
  app.innerHTML = `<div class="panel"><p class="eyebrow">${ACTS[act].name}</p><div class="big">${label}</div><p class="clue">${pct >= 90 ? 'Brilliant!' : pct >= 60 ? 'Good work. Run it again to lock it in.' : 'Keep going: do the notes round once more, then try again.'} Best so far: ${prog().best[act]}%.</p>${extra}
   <div class="row"><button class="btn primary" id="again">Again</button>${U.examActs ? '<button class="btn" id="nxs">What should I try next?</button>' : ''}<button class="btn" id="hm">Unit home</button></div></div>`;
  $('#again').onclick = again; $('#hm').onclick = unitHome; if ($('#nxs')) $('#nxs').onclick = () => RUN.next();
};

/* ---------- multiple-choice runner (sort, vocab, exam) ---------- */
function quiz(act, qs) {
  let i = 0, score = 0; const missed = [];
  const ask = () => {
    const q = qs[i]; let done = false;
    app.innerHTML = `${topBar('<button class="link" id="stop">← Stop</button>', `${ACTS[act].name} · ${i + 1} of ${qs.length}`)}<div class="track"><i style="width:${(i / qs.length) * 100}%"></i></div>
     <div class="panel">${how('Do this', HOWQ[act.replace('q-', '')] || (HOW[act] ? HOW[act][1] : 'Tap the right answer.'))}<p class="prompt">${q.prompt}</p>${q.pg ? `<p class="hint" style="margin:0">📖 In the book: ${esc(q.pg)}</p>` : ''}<div class="opts">${q.opts.map((o, k) => `<button class="o" data-k="${k}">${esc(o)}</button>`).join('')}</div><div class="fb" id="fb"></div></div>`;
    $('#stop').onclick = unitHome;
    app.querySelectorAll('.o').forEach((b) => {
      b.onclick = () => {
        if (done) return; done = true;
        const ok = q.opts[+b.dataset.k] === q.answer;
        app.querySelectorAll('.o').forEach((x) => { x.disabled = true; if (q.opts[+x.dataset.k] === q.answer) x.classList.add('ok'); });
        if (!ok) b.classList.add('no');
        if (ok) score++; else missed.push(q); note(q.k, ok);
        $('#fb').className = 'fb ' + (ok ? 'good' : 'bad'); $('#fb').textContent = (ok ? 'Correct!' : 'The answer is: ' + q.answer + '.') + (q.why ? ' ' + q.why : '');
        const nx = document.createElement('button'); nx.className = 'btn primary'; nx.id = 'nxq'; nx.textContent = i + 1 >= qs.length ? 'Finish' : 'Next'; nx.onclick = () => { i++; i < qs.length ? ask() : end(); };
        $('#fb').after(nx); nx.focus({ preventScroll: true }); nx.scrollIntoView({ block: 'nearest' });
      };
    });
  };
  const end = () => {
    const pct = Math.round((score / qs.length) * 100);
    finishCard(act, `${score}/${qs.length}`, pct, missed.length ? `<div class="card" style="text-align:left;width:100%"><b>To review</b><ul>${missed.map((q) => `<li>${q.prompt.replace(/<[^>]+>/g, '')} <b>${esc(q.answer)}</b></li>`).join('')}</ul></div>` : '', () => RUN[act]());
  };
  ask();
}
const quizQ = (set, n) => sample(set.items, n).map((it) => ({ prompt: esc(it.q), opts: it.opts, answer: it.a, why: it.why, k: it.k, pg: it.pg }));
const catName = (id) => U.categories.find((c) => c.id === id).name;
const sortQ = (n) => sample(U.sort, n).map(([t, c]) => ({ prompt: `Which group? <br><span style="font-family:var(--body);font-weight:800">${esc(t)}</span>`, opts: U.categories.map((x) => x.name), answer: catName(c), k: c }));
const vocabQ = (n) => sample(U.vocab, n).map(([en, def, es], k) => {
  const hasEs = es !== undefined; // Spanish column is optional per unit
  const others = (idx) => shuffle(U.vocab.filter((v) => v[0] !== en)).slice(0, 3).map((v) => v[idx]);
  const mode = k % (hasEs ? 3 : 2);
  if (mode === 0) return { prompt: `Which term means: <em>${esc(def)}</em>?`, opts: shuffle([en, ...others(0)]), answer: en, k: 'v' };
  if (mode === 1) return { prompt: `What does <b>${esc(en)}</b> mean?`, opts: shuffle([def, ...others(1)]), answer: def, k: 'v' };
  return { prompt: `Spanish for <b>${esc(en)}</b>?`, opts: shuffle([es, ...others(2)]), answer: es, k: 'v' };
});
const riddleQ = (n) => { const all = U.riddles.map((r) => cap(r.a)); return sample(U.riddles, n).map((r) => ({ prompt: 'Who am I?<br><span style="font-family:var(--body);font-weight:700;font-size:1rem">' + r.clues.map(esc).join(' ') + '</span>', opts: shuffle(all), answer: cap(r.a), k: r.k })); };


/* numbered pins sit beside the thing they name (px,py) with a leader line to the target (x,y), so they never hide what is being tested */
function addPins(box, d, onTap) {
  const vb = box.querySelector('svg').viewBox.baseVal, W = vb.width, H = vb.height;
  const ns = 'http://www.w3.org/2000/svg', ov = document.createElementNS(ns, 'svg'); ov.setAttribute('viewBox', `0 0 ${W} ${H}`); ov.setAttribute('class', 'lead');
  ov.innerHTML = d.labels.map((l) => (l.px != null ? `<line x1="${l.px}" y1="${l.py}" x2="${l.x}" y2="${l.y}" stroke="#d9480f" stroke-width="2"/>` : '') + `<circle cx="${l.x}" cy="${l.y}" r="3.5" fill="#d9480f" stroke="#fff" stroke-width="1.2"/>`).join('');
  box.appendChild(ov);
  d.labels.forEach((l, k) => { const b = document.createElement('button'); b.className = 'pin'; b.textContent = k + 1; b.style.left = ((l.px != null ? l.px : l.x) / W) * 100 + '%'; b.style.top = ((l.py != null ? l.py : l.y) / H) * 100 + '%'; b.setAttribute('aria-label', 'Label ' + (k + 1)); b.onclick = () => onTap && onTap(k); box.appendChild(b); });
}


/* "What should I try next?": picks one exam-review activity from how he is doing, with the reason */
function topicStats() { const T = U.topics || [], tp = prog().topics || {}; return T.map((t) => { const o = tp[t.id]; const pct = o && o.n >= 5 ? Math.round((o.r.reduce((a, b) => a + b, 0) / o.r.length) * 100) : null; return { t, pct }; }); }
function nextStep() {
  const ex = (U.examActs || []).filter((a) => ACTS[a] && a !== 'pdfexam'), runs = prog().runs, best = prog().best, nm = (a) => ACTS[a].name;
  const ORDER = ['xlearn', 'q-pdf', 'xcloze', 'xfeatures', 'xlabel', 'xspell', 'q-pdftf'].filter((a) => ex.includes(a));
  const tried = ORDER.filter((a) => runs[a]), untried = ORDER.filter((a) => !runs[a]);
  const wk = topicStats().filter((x) => x.pct != null && ['m', 'p', 'a', 'f'].includes(x.t.id)).sort((a, b) => a.pct - b.pct)[0];
  const weakAct = tried.filter((a) => best[a] < 60).sort((a, b) => best[a] - best[b])[0];
  if (!tried.length && !runs.pdfexam) return { go: ORDER[0], why: 'You have not started the exam review yet. Begin by writing what you know from memory, then use the points and the book pages to fill the gaps. It shows you straight away what you still need to learn.' };
  if (weakAct) return { go: weakAct, why: `Your best on ${nm(weakAct)} is ${best[weakAct]}%, so this is where most marks are being lost. Do it again, and read the book page shown on each question before you answer.` };
  if (wk && wk.pct < 60) return { go: 'focus:' + wk.t.id, why: `${wk.t.name} is your weakest topic: you are getting ${wk.pct}% of those answers right. Ten questions on just ${wk.t.name} will help most.` };
  if (untried.length) return { go: untried[0], why: `You have not tried ${nm(untried[0])} yet. ${{ xlearn: 'It practises the written answers, which are the longest marks in the exam.', 'q-pdf': 'It checks the facts from the concept map and the summary notes.', xcloze: 'It tests the exact wording of the summary notes.', xfeatures: 'It makes you compare all four groups side by side.', xlabel: 'The exam is likely to ask you to label diagrams.', xspell: 'Spelling is marked, and this practises the diagram words.', 'q-pdftf': 'It catches the small facts that are easy to mix up.' }[untried[0]] || ''}` };
  const mid = tried.filter((a) => best[a] < 85).sort((a, b) => best[a] - best[b])[0];
  if (mid) return { go: mid, why: `Your best on ${nm(mid)} is ${best[mid]}%. You are close: one more go should push it above 85%.` };
  if (wk && wk.pct < 85) return { go: 'focus:' + wk.t.id, why: `${wk.t.name} is still your weakest topic (${wk.pct}%). Ten more questions on it will close the gap.` };
  if (!runs.pdfexam || best.pdfexam < 85) return { go: 'pdfexam', why: runs.pdfexam ? `Your best on the Exam paper is ${best.pdfexam}%. You are doing well on the parts, so try the mixed paper again.` : 'You have done well on all the parts. Now try the mixed Exam paper, which is the closest to the real thing.' };
  return { go: 'pdfexam', why: `You are doing really well (Exam paper best ${best.pdfexam}%). Keep it fresh with another Exam paper tomorrow.` };
}
const goTo = (g) => (g.startsWith('focus:') ? RUN.focus(g.slice(6)) : RUN[g]());
const goName = (g) => (g.startsWith('focus:') ? `Practise ${(U.topics.find((x) => x.id === g.slice(6)) || {}).name}` : ACTS[g].name);

/* ---------- activities ---------- */
const RUN = {
  sort: () => quiz('sort', sortQ(Math.min(12, U.sort.length))),
  vocab: () => quiz('vocab', vocabQ(Math.min(12, U.vocab.length))),
  exam: () => {
    const pool = (U.quizzes || []).flatMap((z) => z.items.map((it) => ({ prompt: esc(it.q), opts: it.opts, answer: it.a, why: it.why, k: it.k, pg: it.pg })));
    const qs = [...sortQ(Math.min(6, U.sort.length)), ...vocabQ(Math.min(4, U.vocab.length)), ...sample(pool, Math.min(8, pool.length)), ...(U.riddles ? riddleQ(Math.min(2, U.riddles.length)) : [])];
    quiz('exam', shuffle(qs));
  },


  /* ---------- Guide my learning ---------- */  next() {
    const n = nextStep();
    app.innerHTML = `${topBar('<button class="link" id="stop">← Unit home</button>', 'What should I try next?')}<div class="panel"><p class="eyebrow">I suggest</p><h2 class="sec" style="margin:0">${esc(goName(n.go))}</h2>${how('Why', esc(n.why))}
     <div class="row"><button class="btn primary" id="go">Start: ${esc(goName(n.go))}</button><button class="btn" id="gd">See all my progress</button></div></div>`;
    $('#stop').onclick = unitHome; $('#go').onclick = () => goTo(n.go); $('#gd').onclick = () => RUN.guide(); scrollTo(0, 0);
  },

  guide() {
    const T = U.topics || [], tp = prog().topics || {}, runs = prog().runs, best = prog().best;
    const stat = (t) => { const o = tp[t.id]; if (!o || o.n < 5) return { n: o ? o.n : 0, pct: null, tag: 'Not enough yet', cls: 'none' }; const pct = Math.round((o.r.reduce((a, b) => a + b, 0) / o.r.length) * 100); return { n: o.n, pct, tag: pct >= 85 ? 'Strong' : pct >= 60 ? 'Getting there' : 'Needs focus', cls: pct >= 85 ? 'good' : pct >= 60 ? 'mid' : 'bad' }; };
    const S = T.map((t) => ({ t, ...stat(t) }));
    const known = S.filter((x) => x.pct != null).sort((a, b) => a.pct - b.pct);
    const acts = [...(U.examActs || []), ...U.activities].filter((a) => ACTS[a] && !['guide', 'focus', 'exam', 'pdfexam'].includes(a));
    const plan = [];
    known.filter((x) => x.pct < 85).slice(0, 2).forEach((x) => plan.push({ go: 'focus:' + x.t.id, text: `Practise ${x.t.name} (10 questions)`, why: `You are at ${x.pct}% on ${x.t.name}.` }));
    if (known.some((x) => x.pct < 60 && ['m', 'p', 'a', 'f'].includes(x.t.id)) && !plan.some((p) => p.go === 'learn')) plan.push({ go: 'learn', text: 'Learn the answers', why: 'Read the key points again, then write them from memory.' });
    S.filter((x) => x.pct == null).slice(0, 2).forEach((x) => plan.push({ go: 'focus:' + x.t.id, text: `Try ${x.t.name} questions`, why: 'You have not answered enough of these yet for me to tell.' }));
    acts.filter((a) => !runs[a] && !plan.some((p) => p.go === a)).slice(0, 2).forEach((a) => plan.push({ go: a, text: `Try ${ACTS[a].name}`, why: 'You have not done this one yet.' }));
    acts.filter((a) => runs[a] && best[a] < 70).slice(0, 2).forEach((a) => plan.push({ go: a, text: `Do ${ACTS[a].name} again`, why: `Your best is ${best[a]}%.` }));
    if (!plan.length) plan.push({ go: U.examActs ? 'pdfexam' : 'exam', text: U.examActs ? 'Take the Exam paper' : 'Take the Final exam', why: (best.pdfexam != null ? `Your best is ${best.pdfexam}%. ` : '') + 'You are doing well. Test yourself.' });
    const first = plan[0];
    const total = Object.values(tp).reduce((a, o) => a + o.n, 0);
    app.innerHTML = `${topBar('<button class="link" id="stop">← Unit home</button>', 'Guide my learning')}
     <div class="panel" id="guideRoot"><h2 class="sec" style="margin:0">Your progress by topic</h2>
     ${total < 5 ? how('Start here', 'I have not seen enough answers yet. Do a few activities and come back. Learn the answers and Sort it are good ones to start with.') : how('Do this next', esc(first.text) + '. ' + esc(first.why))}
     <div class="slots">${S.map((x) => `<div class="slot" style="flex-direction:column;align-items:stretch;gap:6px"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(x.t.name)}</b><span class="pill">${x.tag}${x.pct != null ? ' · ' + x.pct + '%' : ''}</span></div><div class="track" style="margin:0"><i style="width:${x.pct || 0}%;${x.cls === 'bad' ? 'background:#c0392b' : x.cls === 'mid' ? 'background:#d68910' : ''}"></i></div></div>`).join('')}</div>
     <h2 class="sec" style="margin:14px 0 0">What to do</h2>
     <div class="slots">${plan.slice(0, 5).map((p, k) => `<button class="slot" data-go="${p.go}" style="text-align:left"><span class="num">${k + 1}</span><span><b>${esc(p.text)}</b><br><span class="hint">${esc(p.why)}</span></span></button>`).join('')}</div>
     <p class="hint">${session() ? 'Saved to your account, so it follows you to other devices.' : 'Sign in on the main xoyso page to save this to your account.'} Topic marks come from your last 20 answers on each topic, across all the activities. For Learn the answers and Explain it they come from the points you ticked.</p>
     <div class="row"><button class="btn" id="rs">Start my guide again</button></div></div>`;
    $('#stop').onclick = unitHome;
    app.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => { const g = b.dataset.go; g.startsWith('focus:') ? RUN.focus(g.slice(6)) : RUN[g](); }; });
    $('#rs').onclick = () => { if (confirm('Clear the topic marks for this unit? Your best scores stay.')) { delete prog().topics; if (DB.sync) DB.sync.q = DB.sync.q.filter((e) => !e.id.startsWith('bio:' + U.id + ':')); store.set(DB); const u = session(); if (u) rpc('reset_progress', { p_token: u.token, p_topic: 'bio:' + U.id }).catch(() => {}); RUN.guide(); } };
    scrollTo(0, 0);
  },

  focus(t) {
    if (t) RUN.focus.t = t; t = RUN.focus.t; const T = (U.topics || []).find((x) => x.id === t);
    const pool = [];
    (U.quizzes || []).forEach((z) => z.items.filter((it) => it.k === t).forEach((it) => pool.push({ prompt: esc(it.q), opts: it.opts, answer: it.a, why: it.why, k: t, pg: it.pg })));
    U.sort.filter(([, c]) => c === t).forEach(([x, c]) => pool.push({ prompt: `Which group? <br><span style="font-family:var(--body);font-weight:800">${esc(x)}</span>`, opts: U.categories.map((y) => y.name), answer: catName(c), k: t }));
    if (t === 'v') pool.push(...vocabQ(U.vocab.length));
    U.riddles.filter((r) => r.k === t).forEach((r) => pool.push(riddleQ(U.riddles.length).find((q) => q.answer === cap(r.a)) || riddleQ(1)[0]));
    ACTS.focus.name = 'Practise ' + (T ? T.name : 'topic');
    quiz('focus', sample(pool, Math.min(10, pool.length)));
  },

  xfeatures: () => RUN.features(U.pdffeatures, 'xfeatures'),
  xcloze: () => RUN.cloze(U.pdfcloze, 'xcloze'),
  xlabel: () => RUN.label(U.drawings.filter((d) => d.pdf), 'xlabel'),
  xspell: () => RUN.spell(U.drawings.filter((d) => d.pdf), 'xspell'),
  xlearn: () => RUN.learn(U.explain.filter((x) => x.src === 'pdf'), 'xlearn'),
  pdfexam: () => { const pool = (U.quizzes || []).filter((z) => z.id === 'pdf' || z.id === 'pdftf').flatMap((z) => z.items.map((it) => ({ prompt: esc(it.q), opts: it.opts, answer: it.a, why: it.why, k: it.k, pg: it.pg }))); quiz('pdfexam', sample(pool, Math.min(20, pool.length))); },

  features(rowsIn, actIn) {
    const act = actIn || 'features', cats = U.categories, rows = rowsIn || U.features;
    app.innerHTML = `${topBar('<button class="link" id="stop">← Stop</button>', 'Features table')}<div class="panel">${act === 'xfeatures' && U.bookpages ? `<p class="hint" style="margin:0">📖 In the book: ${esc(U.bookpages)}</p>` : ''}${how('Do this', 'In every box tap ✓ if the group has the feature or ✗ if it does not. Every box needs an answer. A feature can belong to more than one group.')}
     <table class="grid2"><thead><tr><th></th>${cats.map((c) => `<th>${esc(c.name)}</th>`).join('')}</tr></thead><tbody>
     ${rows.map(([f], r) => `<tr><td>${esc(f)}</td>${cats.map((c, k) => `<td data-r="${r}" data-k="${k}"><button class="tk" data-v="1" aria-label="${esc(f)}: ${esc(c.name)} yes">✓</button><button class="tk" data-v="0" aria-label="${esc(f)}: ${esc(c.name)} no">✗</button></td>`).join('')}</tr>`).join('')}</tbody></table>
     <div class="fb" id="fb"></div><div class="row"><button class="btn primary" id="chk">Check</button></div></div>`;
    $('#stop').onclick = unitHome;
    app.querySelectorAll('td[data-r]').forEach((td) => td.querySelectorAll('.tk').forEach((b) => { b.onclick = () => { td.dataset.v = b.dataset.v; td.querySelectorAll('.tk').forEach((x) => x.classList.toggle('on', x === b)); }; }));
    $('#chk').onclick = () => {
      const blank = app.querySelectorAll('td[data-r]:not([data-v])').length;
      if (blank) { $('#fb').className = 'fb bad'; $('#fb').textContent = `Tap ✓ or ✗ in every box first. ${blank} still empty.`; return; }
      let right = 0; const total = rows.length * cats.length;
      app.querySelectorAll('td[data-r]').forEach((td) => { const ok = (td.dataset.v === '1') === !!rows[+td.dataset.r][1][+td.dataset.k]; note(cats[+td.dataset.k].id, ok); if (ok) right++; td.className = ok ? 'ok' : 'no'; td.querySelectorAll('.tk').forEach((b) => (b.disabled = true)); });
      const pct = Math.round((right / total) * 100);
      $('#fb').className = 'fb ' + (pct === 100 ? 'good' : 'bad'); $('#fb').textContent = `${right} of ${total} boxes right.`;
      $('#chk').textContent = 'Finish'; $('#chk').onclick = () => finishCard(act, `${right}/${total}`, pct, '<p class="hint">Green boxes were right, red were wrong. Look at the red ones before you go again.</p>', () => RUN[act]());
    };
  },

  label(listIn, actIn) {
    const act = actIn || 'label', ds = shuffle(listIn || U.drawings); let i = 0, right = 0, total = 0;
    const next = () => { if (i >= ds.length) { finishCard(act, `${right}/${total}`, Math.round((right / total) * 100), '', () => RUN[act]()); return; } draw(ds[i]); };
    const draw = (d) => {
      const bank = shuffle(d.labels.map((l) => l.a)); const placed = d.labels.map(() => null); let selChip = null;
      app.innerHTML = `${topBar('<button class="link" id="stop">← Stop</button>', `Label the drawing · ${i + 1} of ${ds.length}`)}<div class="panel"><h2 class="sec" style="margin:0">${esc(d.title)}</h2>${d.pg ? `<p class="hint" style="margin:0">📖 In the book: ${esc(d.pg)}</p>` : ''}
       <div class="pic pinbox" id="pic">${d.svg}</div>
       ${how('Do this', 'Tap a word, then tap the number it belongs to. Tap a filled number to take its word back.')}
       <div class="chips" id="bank"></div><div class="slots" id="slots"></div><div class="fb" id="fb"></div><div class="row"><button class="btn primary" id="chk">Check</button></div></div>`;
      $('#stop').onclick = unitHome;
      addPins($('#pic'), d, (k) => put(k));
      const render = () => {
        $('#bank').innerHTML = bank.map((w) => `<button class="chip ${placed.includes(w) ? 'used' : ''} ${selChip === w ? 'sel' : ''}" data-w="${esc(w)}">${esc(w)}</button>`).join('');
        $('#slots').innerHTML = d.labels.map((l, k) => `<button class="slot" data-k="${k}"><span class="num">${k + 1}</span>${placed[k] ? esc(placed[k]) : '<span class="hint">tap to fill</span>'}</button>`).join('');
        $('#bank').querySelectorAll('.chip').forEach((c) => { c.onclick = () => { if (c.classList.contains('used')) return; selChip = selChip === c.dataset.w ? null : c.dataset.w; render(); }; });
        $('#slots').querySelectorAll('.slot').forEach((s) => { s.onclick = () => put(+s.dataset.k); });
      };
      const put = (k) => { if (placed[k]) { placed[k] = null; } else if (selChip) { placed[k] = selChip; selChip = null; } render(); };
      render();
      $('#chk').onclick = () => {
        if (placed.includes(null)) { $('#fb').className = 'fb bad'; $('#fb').textContent = 'Fill every number first.'; return; }
        let r = 0; $('#slots').querySelectorAll('.slot').forEach((s, k) => { const ok = placed[k] === d.labels[k].a; if (ok) r++; note(d.k, ok); s.className = 'slot ' + (ok ? 'ok' : 'no'); if (!ok) s.innerHTML += ` <span class="hint">→ ${esc(d.labels[k].a)}</span>`; s.disabled = true; });
        right += r; total += d.labels.length; i++;
        $('#fb').className = 'fb ' + (r === d.labels.length ? 'good' : 'bad'); $('#fb').textContent = `${r} of ${d.labels.length} right.`;
        $('#chk').textContent = i >= ds.length ? 'Finish' : 'Next drawing'; $('#chk').onclick = next;
      };
    };
    next();
  },


  spell(listIn, actIn) {
    const act = actIn || 'spell', ds = shuffle((listIn || U.drawings).filter((d) => d.labels.every((l) => l.a.split(' ').length <= 2))); let i = 0, right = 0, total = 0;
    const norm = (x) => x.toLowerCase().replace(/\s+/g, ' ').trim();
    const dist = (a, b) => { const m = [...Array(a.length + 1)].map((_, r) => [r, ...Array(b.length).fill(0)]); for (let c = 1; c <= b.length; c++) m[0][c] = c; for (let r = 1; r <= a.length; r++) for (let c = 1; c <= b.length; c++) m[r][c] = Math.min(m[r - 1][c] + 1, m[r][c - 1] + 1, m[r - 1][c - 1] + (a[r - 1] === b[c - 1] ? 0 : 1)); return m[a.length][b.length]; };
    const next = () => { if (i >= ds.length) { finishCard(act, `${right}/${total}`, Math.round((right / total) * 100), '<p class="hint">Look at the red ones and say each word out loud, letter by letter.</p>', () => RUN[act]()); return; } draw(ds[i]); };
    const draw = (d) => {
      app.innerHTML = `${topBar('<button class="link" id="stop">← Stop</button>', `Spell the labels · ${i + 1} of ${ds.length}`)}<div class="panel"><h2 class="sec" style="margin:0">${esc(d.title)}</h2>${d.pg ? `<p class="hint" style="margin:0">📖 In the book: ${esc(d.pg)}</p>` : ''}<div class="pic pinbox" id="pic">${d.svg}</div>
       ${how('Do this', 'Type the name for each number. Spelling counts. The number of letters is shown in each box.')}
       <div class="slots" id="slots">${d.labels.map((l, k) => `<label class="slot"><span class="num">${k + 1}</span><input class="sp" data-k="${k}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${l.a.replace(/ /g, '').length} letters" style="flex:1;min-width:0;font:700 1.05rem var(--body);padding:8px;border:2px solid var(--line,#d6e0e8);border-radius:10px"></label>`).join('')}</div>
       <div class="fb" id="fb"></div><div class="row"><button class="btn primary" id="chk">Check</button></div></div>`;
      $('#stop').onclick = unitHome; addPins($('#pic'), d, (k) => app.querySelector(`.sp[data-k="${k}"]`).focus());
      $('#chk').onclick = () => {
        const ins = [...app.querySelectorAll('.sp')];
        if (ins.some((x) => !x.value.trim())) { $('#fb').className = 'fb bad'; $('#fb').textContent = 'Type a name for every number first.'; return; }
        let r = 0;
        ins.forEach((x, k) => { const want = d.labels[k].a, got = norm(x.value), ok = got === norm(want); if (ok) r++; note(d.k, ok); x.disabled = true; const slot = x.closest('.slot'); slot.className = 'slot ' + (ok ? 'ok' : 'no'); if (!ok) slot.insertAdjacentHTML('beforeend', ` <span class="hint">${dist(got, norm(want)) <= 2 ? 'Spelling slip. ' : ''}→ ${esc(want)}</span>`); });
        right += r; total += d.labels.length; i++;
        $('#fb').className = 'fb ' + (r === d.labels.length ? 'good' : 'bad'); $('#fb').textContent = `${r} of ${d.labels.length} spelt right.`;
        $('#chk').textContent = i >= ds.length ? 'Finish' : 'Next drawing'; $('#chk').onclick = next;
      };
      const f = app.querySelector('.sp'); if (f) f.focus({ preventScroll: true });
    };
    next();
  },

  cloze(srcIn, actIn) {
    const act = actIn || 'cloze', items = shuffle(srcIn || U.cloze).slice(0, srcIn ? 6 : 5); let i = 0, right = 0, total = 0;
    const next = () => { if (i >= items.length) { finishCard(act, `${right}/${total}`, Math.round((right / total) * 100), '', () => RUN[act]()); return; } draw(items[i][0], items[i][1] || [], items[i][2], items[i][3]); };
    const draw = (text, extra, topic, pg) => {
      // gaps look like {word} or {word~tag}; gaps with the same tag are interchangeable (e.g. "A and B"), so either order is right
      const answers = [], tags = []; const parts = text.split(/\{([^}]+)\}/); // odd indexes are gaps
      parts.forEach((p, k) => { if (k % 2) { const [a, t] = p.split('~'); answers.push(a); tags.push(t || null); parts[k] = a; } });
      const bank = shuffle([...parts.filter((_, k) => k % 2), ...(extra.length ? extra : sample(U.cloze.flatMap((c) => c[0].match(/\{[^}~]+/g) || []).map((x) => x.slice(1)).filter((x) => !answers.includes(x)), 3))]); const filled = []; let sel = null;
      const accepts = (k, w) => w === answers[k] || (tags[k] && answers.some((a, j) => tags[j] === tags[k] && a === w));
      app.innerHTML = `${topBar('<button class="link" id="stop">← Stop</button>', `Complete the notes · ${i + 1} of ${items.length}`)}<div class="panel">${how('Do this', 'Tap a word, then tap the gap it fits. Tap a filled gap to take the word back.')}${pg ? `<p class="hint" style="margin:0">📖 In the book: ${esc(pg)}</p>` : ''}<p class="cloze" id="txt"></p><div class="chips" id="bank"></div><div class="fb" id="fb"></div><div class="row"><button class="btn primary" id="chk">Check</button></div></div>`;
      $('#stop').onclick = unitHome;
      const render = () => {
        let g = -1; $('#txt').innerHTML = parts.map((p, k) => { if (!(k % 2)) return esc(p); g++; return `<span class="gap ${sel === 'g' + g ? 'act' : ''}" data-g="${g}">${filled[g] ? esc(filled[g]) : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</span>`; }).join('');
        $('#bank').innerHTML = bank.map((w) => `<button class="chip ${Object.values(filled).includes(w) ? 'used' : ''} ${sel === w ? 'sel' : ''}" data-w="${esc(w)}">${esc(w)}</button>`).join('');
        $('#bank').querySelectorAll('.chip').forEach((c) => { c.onclick = () => { if (c.classList.contains('used')) return; sel = sel === c.dataset.w ? null : c.dataset.w; render(); }; });
        $('#txt').querySelectorAll('.gap').forEach((e) => { e.onclick = () => { const k = +e.dataset.g; if (filled[k]) { delete filled[k]; } else if (sel) { filled[k] = sel; sel = null; } render(); }; });
      };
      render();
      $('#chk').onclick = () => {
        if (answers.some((_, k) => !filled[k])) { $('#fb').className = 'fb bad'; $('#fb').textContent = 'Fill every gap first.'; return; }
        let r = 0; $('#txt').querySelectorAll('.gap').forEach((e) => { const k = +e.dataset.g; const ok = accepts(k, filled[k]); if (ok) r++; note(topic, ok); e.classList.add(ok ? 'ok' : 'no'); e.onclick = null; if (!ok) e.innerHTML += ` → ${esc(answers[k])}`; });
        right += r; total += answers.length; i++;
        $('#fb').className = 'fb ' + (r === answers.length ? 'good' : 'bad'); $('#fb').textContent = (r === answers.length ? 'All right!' : 'Not quite: the right words are shown.');
        $('#chk').textContent = i >= items.length ? 'Finish' : 'Next'; $('#chk').onclick = next;
      };
    };
    next();
  },

  riddles() {
    const rs = sample(U.riddles, Math.min(5, U.riddles.length)); const opts = U.riddles.map((r) => cap(r.a)); let i = 0, pts = 0;
    const MAX = 5;
    const ask = () => {
      const r = rs[i]; let shown = 1, done = false;
      app.innerHTML = `${topBar('<button class="link" id="stop">← Stop</button>', `Who am I? · ${i + 1} of ${rs.length}`)}<div class="track"><i style="width:${(i / rs.length) * 100}%"></i></div>
       <div class="panel">${how('Do this', 'Guess as early as you can: fewer clues means more points. Tap Another clue only if you need one.')}<ul class="clues" id="cl"></ul><button class="btn" id="more">Another clue (worth less)</button><div class="opts" id="op">${shuffle(opts).map((o) => `<button class="o" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div><div class="fb" id="fb"></div></div>`;
      $('#stop').onclick = unitHome;
      const clues = () => { $('#cl').innerHTML = r.clues.slice(0, shown).map((c) => `<li>${esc(c)}</li>`).join(''); $('#more').disabled = shown >= r.clues.length; };
      clues(); $('#more').onclick = () => { shown++; clues(); };
      app.querySelectorAll('.o').forEach((b) => { b.onclick = () => {
        if (done) return;
        if (b.dataset.o === cap(r.a)) { done = true; const got = Math.max(1, MAX + 1 - shown); pts += got; note(r.k, got >= 3); b.classList.add('ok'); app.querySelectorAll('.o').forEach((x) => (x.disabled = true)); $('#more').disabled = true; $('#fb').className = 'fb good'; $('#fb').textContent = `Yes! ${got} point${got > 1 ? 's' : ''}.`; setTimeout(() => { i++; i < rs.length ? ask() : finishCard('riddles', `${pts}/${rs.length * MAX}`, Math.round((pts / (rs.length * MAX)) * 100), '', RUN.riddles); }, 1100); }
        else { b.classList.add('no'); b.disabled = true; if (shown < r.clues.length) { shown++; clues(); } $('#fb').className = 'fb bad'; $('#fb').textContent = 'Not that one. Here is another clue.'; }
      }; });
    };
    ask();
  },

  learn(pre, actIn) {
    const lact = actIn || 'learn';
    const sets = [['Exam questions from the PDFs', U.explain.filter((x) => x.src === 'pdf')], ['Page 60: Summarising', U.explain.filter((x) => x.src === 'p60')], ['Questions from the other pages', U.explain.filter((x) => x.src !== 'p60' && x.src !== 'pdf')]].filter((x) => x[1].length);
    const chooser = () => {
      app.innerHTML = `${topBar('<button class="link" id="stop">← Back</button>', 'Learn the answers')}<div class="panel"><p class="prompt">Learn the answers</p>
       ${how('How it works', 'Try each question from memory first.')}${stepsHtml(HOW.learn)}
       <div class="opts">${sets.map((x, k) => `<button class="o" data-k="${k}">${esc(x[0])} (${x[1].length} questions)</button>`).join('')}${sets.length > 1 ? `<button class="o" data-k="all">Everything (${U.explain.length} questions)</button>` : ''}</div></div>`;
      $('#stop').onclick = unitHome;
      app.querySelectorAll('.o').forEach((b) => { b.onclick = () => run(b.dataset.k === 'all' ? [...U.explain] : [...sets[+b.dataset.k][1]], true); });
    };
    const run = (list, first) => {
      let i = 0, got = 0, total = 0; const gaps = [];
      const item = () => {
        const it = list[i], n = it.points.length, head = `${topBar('<button class="link" id="stop">← Stop</button>', `Learn · ${i + 1} of ${list.length}`)}<div class="track"><i style="width:${(i / list.length) * 100}%"></i></div>`;
        const write = (peeked) => {
          app.innerHTML = `${head}<div class="panel"><p class="prompt">${esc(it.q)}</p>${bk(it)}${peeked ? how('Step 2 of 3 · Write', 'The points are hidden. Write your answer on paper from memory.') : how('Step 1 of 2 · Write on paper', 'Write what you know on paper first. The points are hidden. Then tap the first button. If you do not know it yet, tap the second button.')}${hintUi(it)}<button class="btn primary" id="chk">I've written it. Check my answer</button>${peeked ? '' : '<button class="btn" id="peek">I don\'t know this yet. Show me the points</button>'}</div>`;
          $('#stop').onclick = unitHome; wireHint(it);
          if (!peeked) $('#peek').onclick = read;
          $('#chk').onclick = () => check('', peeked);
        };
        const read = () => {
          app.innerHTML = `${head}<div class="panel"><p class="prompt">${esc(it.q)}</p>${bk(it)}${how('Step 1 of 3 · Read', 'Read the key points and make sure you understand them.')}<ol class="clues">${it.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ol><button class="btn primary" id="cov">Cover it. I'll write it from memory</button></div>`;
          $('#stop').onclick = unitHome; $('#cov').onclick = () => write(true); scrollTo(0, 0);
        };
        const check = (mine, peeked) => {
          app.innerHTML = `${head}<div class="panel"><p class="prompt">${esc(it.q)}</p>${bk(it)}${how(peeked ? 'Step 3 of 3 · Check' : 'Step 2 of 2 · Check', 'Tick the key points your answer included. Be honest.')}${mine ? `<div class="card" style="text-align:left;width:100%"><b>Your answer</b><p style="margin:4px 0 0;white-space:pre-wrap">${esc(mine)}</p></div>` : ''}
           <div class="slots">${it.points.map((p) => `<label class="slot" style="cursor:pointer"><input type="checkbox" style="width:22px;height:22px;flex:none"><span>${esc(p)}</span></label>`).join('')}</div><div class="row"><button class="btn primary" id="nx">${i + 1 >= list.length ? 'Finish' : 'Next question'}</button></div></div>`;
          $('#stop').onclick = unitHome; scrollTo(0, 0);
          $('#nx').onclick = () => { app.querySelectorAll('.slot input').forEach((c) => note(it.k, c.checked)); const t = app.querySelectorAll('.slot input:checked').length; got += t; total += n; if (t < n) gaps.push(it); i++; i < list.length ? item() : end(); };
        };
        write(false);
      };
      const end = () => {
        const pct = Math.round((got / total) * 100); if (first) record(lact, pct);
        app.innerHTML = `<div class="panel"><p class="eyebrow">${esc(ACTS[lact].name)}</p><div class="big">${got}/${total}</div><p class="clue">key points remembered${gaps.length ? `. ${gaps.length} question${gaps.length > 1 ? 's' : ''} had gaps.` : '. You had them all!'}</p>
         ${gaps.length ? `<div class="card" style="text-align:left;width:100%"><b>Go again on</b><ul>${gaps.map((g) => `<li>${esc(g.q)}</li>`).join('')}</ul></div>` : ''}
         <div class="row">${gaps.length ? '<button class="btn primary" id="redo">Redo the gaps</button>' : ''}<button class="btn ${gaps.length ? '' : 'primary'}" id="hm">Unit home</button></div></div>`;
        if (gaps.length) $('#redo').onclick = () => run(gaps, false);
        $('#hm').onclick = unitHome;
      };
      item();
    };
    pre ? run(pre, true) : chooser();
  },

  explain() {
    const items = sample(U.explain, Math.min(6, U.explain.length)); let i = 0, got = 0, total = 0;
    const ask = () => {
      const it = items[i];
      app.innerHTML = `${topBar('<button class="link" id="stop">← Stop</button>', `Explain it · ${i + 1} of ${items.length}`)}<div class="panel"><p class="prompt">${esc(it.q)}</p>${bk(it)}<p class="hint">${it.src === 'pdf' ? 'From the concept map and summary notes (the PDFs).' : 'From the book, ' + (it.src === 'p60' ? 'page 60 (Summarising)' : 'page ' + it.src.slice(1)) + '.'}</p>
       ${how('Step 1 of 2 · Write on paper', 'Write your answer on paper first, in 2 or 3 sentences. No peeking. Then show the key points.')}
       ${hintUi(it)}<button class="btn primary" id="show">Show the key points</button><div id="kp" style="width:100%"></div></div>`;
      $('#stop').onclick = unitHome;
      wireHint(it);
      $('#show').onclick = () => {
        $('#show').hidden = true; if ($('#hint')) $('#hint').hidden = true;
        $('#kp').innerHTML = `${how('Step 2 of 2', 'Tick each point your answer included. Be honest: this is how you find what to revise.')}<div class="slots">${it.points.map((p, k) => `<label class="slot" style="cursor:pointer"><input type="checkbox" data-k="${k}" style="width:22px;height:22px;flex:none"><span>${esc(p)}</span></label>`).join('')}</div><div class="row" style="margin-top:12px"><button class="btn primary" id="nx">${i + 1 >= items.length ? 'Finish' : 'Next question'}</button></div>`;
        $('#nx').onclick = () => { app.querySelectorAll('#kp input').forEach((c) => note(it.k, c.checked)); got += app.querySelectorAll('#kp input:checked').length; total += it.points.length; i++; i < items.length ? ask() : finishCard('explain', `${got}/${total}`, Math.round((got / total) * 100), '<p class="hint">This score is marked by you. Revise the points you missed, then try again.</p>', RUN.explain); };
        $('#kp').scrollIntoView({ block: 'nearest' });
      };
    };
    ask();
  },

  order() {
    const items = shuffle(U.order); let i = 0, right = 0, total = 0;
    const next = () => { if (i >= items.length) { finishCard('order', `${right}/${total}`, Math.round((right / total) * 100), '', RUN.order); return; } draw(items[i]); };
    const draw = (it) => {
      const pool = shuffle(it.steps); const chosen = [];
      app.innerHTML = `${topBar('<button class="link" id="stop">← Stop</button>', `Put in order · ${i + 1} of ${items.length}`)}<div class="panel"><h2 class="sec" style="margin:0">${esc(it.title)}</h2>${how('Do this', 'Tap the steps in the order they happen. Tap a chosen step to take it back.')}<div class="opts" id="pool"></div><div class="slots" id="got"></div><div class="fb" id="fb"></div><div class="row"><button class="btn primary" id="chk">Check</button></div></div>`;
      $('#stop').onclick = unitHome;
      const render = () => {
        $('#pool').innerHTML = pool.filter((s) => !chosen.includes(s)).map((s) => `<button class="step" data-s="${esc(s)}">${esc(s)}</button>`).join('');
        $('#got').innerHTML = chosen.map((s, k) => `<button class="step" data-c="${esc(s)}"><span class="num">${k + 1}</span>${esc(s)}</button>`).join('');
        $('#pool').querySelectorAll('.step').forEach((b) => { b.onclick = () => { chosen.push(b.dataset.s); render(); }; });
        $('#got').querySelectorAll('.step').forEach((b) => { b.onclick = () => { chosen.splice(chosen.indexOf(b.dataset.c), 1); render(); }; });
      };
      render();
      $('#chk').onclick = () => {
        if (chosen.length < it.steps.length) { $('#fb').className = 'fb bad'; $('#fb').textContent = 'Choose all the steps first.'; return; }
        let r = 0; $('#got').querySelectorAll('.step').forEach((b, k) => { const ok = chosen[k] === it.steps[k]; if (ok) r++; note(it.k, ok); b.className = 'step ' + (ok ? 'ok' : 'no'); b.disabled = true; if (!ok) b.innerHTML += ` <span class="hint">→ step ${k + 1}: ${esc(it.steps[k])}</span>`; });
        right += r; total += it.steps.length; i++;
        $('#fb').className = 'fb ' + (r === it.steps.length ? 'good' : 'bad'); $('#fb').textContent = `${r} of ${it.steps.length} in the right place.`;
        $('#chk').textContent = i >= items.length ? 'Finish' : 'Next'; $('#chk').onclick = next;
      };
    };
    next();
  },
};

/* ---------- first-time "How it works" screen for every activity ---------- */
function wrapIntros() {
  Object.keys(RUN).forEach((k) => {
    if (RUN[k].wrapped || ['guide', 'focus', 'next'].includes(k)) return; const raw = RUN[k];
    RUN[k] = (...a) => {
      const steps = HOW[k] || HOW[k.replace('q-', '')] || (ACTS[k] ? [ACTS[k].blurb, HOWQ[k.replace('q-', '')] || 'Tap the right answer.', 'Read what appears after each answer.'] : null);
      if (a.length || seen(k) || !steps) return raw(...a);
      app.innerHTML = `<div class="panel"><p class="eyebrow">How it works</p><h1 style="margin:0">${esc((ACTS[k] || {}).name || '')}</h1>${how('Read this first', 'It takes 10 seconds and makes the activity much more useful.')}${stepsHtml(steps)}
        <div class="row"><button class="btn primary" id="go">Got it. Start</button><button class="btn" id="bk">Back</button></div></div>`;
      $('#go').onclick = () => { markSeen(k); raw(); }; $('#bk').onclick = unitHome; scrollTo(0, 0);
    };
    RUN[k].wrapped = true;
  });
}
/* ---------- boot ---------- */
(async () => {
  try {
    UNITS = await (await fetch('/biology/units.json')).json();
    const id = new URLSearchParams(location.search).get('u'); const meta = UNITS.find((u) => u.id === id);
    if (meta) { U = await (await fetch('/biology/' + meta.file)).json(); U.id = meta.id; (U.quizzes || []).forEach((z) => { ACTS['q-' + z.id] = { name: z.name, icon: z.icon, blurb: z.blurb }; RUN['q-' + z.id] = () => quiz('q-' + z.id, quizQ(z, Math.min(10, z.items.length))); }); wrapIntros(); unitHome(); syncStart(); } else listHome();
  } catch (e) { app.innerHTML = '<p class="fb bad">Could not load the unit. Check your connection and refresh.</p>'; }
})();
