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

const ACTS = {
  sort: { name: 'Sort it', icon: '⇅', blurb: 'Which group does each statement describe?' },
  features: { name: 'Features table', icon: '▦', blurb: 'Tick every group that has the feature.' },
  label: { name: 'Label the drawing', icon: '✎', blurb: 'Name the shapes and parts.' },
  cloze: { name: 'Complete the notes', icon: '…', blurb: 'Fill the gaps with the right words.' },
  riddles: { name: 'Who am I?', icon: '?', blurb: 'Fewer clues means more points.' },
  order: { name: 'Put in order', icon: '1·2·3', blurb: 'Steps of reproduction in the right order.' },
  learn: { name: 'Learn the answers', icon: '⟳', blurb: 'Read it, cover it, write it, check it. Then redo the gaps.' },
  explain: { name: 'Explain it', icon: '✍', blurb: 'Answer as in the exam, then check the key points.' },
  vocab: { name: 'Vocabulary', icon: 'Aa', blurb: 'Key terms and what they mean.' },
  exam: { name: 'Final exam', icon: '★', blurb: 'A mixed test. Your best score is saved.' },
};

const app = $('#app');
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
  const avail = U.activities.filter((a) => ACTS[a]);
  const best = prog().best;
  app.innerHTML = `<div class="crumbs">${link('/', 'xoyso')}<span class="hint">›</span>${link('/biology', 'Biology')}</div>
   <header class="hero"><h1>${esc(U.title)}</h1><p>${esc(U.blurb)}</p></header>
   <div class="grid">${avail.map((a) => `<button class="act ${a === 'exam' ? 'main' : ''}" data-a="${a}"><span class="demo">${ACTS[a].icon}</span><h3>${ACTS[a].name}</h3><p>${ACTS[a].blurb}</p>${best[a] != null ? `<span class="pill">Best ${best[a]}%</span>` : ''}</button>`).join('')}</div>`;
  app.querySelectorAll('[data-a]').forEach((b) => { b.onclick = () => RUN[b.dataset.a](); });
  scrollTo(0, 0);
}
const finishCard = (act, label, pct, extra = '', again) => {
  record(act, pct);
  app.innerHTML = `<div class="panel"><p class="eyebrow">${ACTS[act].name}</p><div class="big">${label}</div><p class="clue">${pct >= 90 ? 'Brilliant!' : pct >= 60 ? 'Good work. Run it again to lock it in.' : 'Keep going: do the notes round once more, then try again.'} Best so far: ${prog().best[act]}%.</p>${extra}
   <div class="row"><button class="btn primary" id="again">Again</button><button class="btn" id="hm">Unit home</button></div></div>`;
  $('#again').onclick = again; $('#hm').onclick = unitHome;
};

/* ---------- multiple-choice runner (sort, vocab, exam) ---------- */
function quiz(act, qs) {
  let i = 0, score = 0; const missed = [];
  const ask = () => {
    const q = qs[i]; let done = false;
    app.innerHTML = `${topBar('<button class="link" id="stop">← Stop</button>', `${ACTS[act].name} · ${i + 1} of ${qs.length}`)}<div class="track"><i style="width:${(i / qs.length) * 100}%"></i></div>
     <div class="panel"><p class="prompt">${q.prompt}</p><div class="opts">${q.opts.map((o, k) => `<button class="o" data-k="${k}">${esc(o)}</button>`).join('')}</div><div class="fb" id="fb"></div></div>`;
    $('#stop').onclick = unitHome;
    app.querySelectorAll('.o').forEach((b) => {
      b.onclick = () => {
        if (done) return; done = true;
        const ok = q.opts[+b.dataset.k] === q.answer;
        app.querySelectorAll('.o').forEach((x) => { x.disabled = true; if (q.opts[+x.dataset.k] === q.answer) x.classList.add('ok'); });
        if (!ok) b.classList.add('no');
        if (ok) score++; else missed.push(q);
        $('#fb').className = 'fb ' + (ok ? 'good' : 'bad'); $('#fb').textContent = (ok ? 'Correct!' : 'The answer is: ' + q.answer + '.') + (q.why ? ' ' + q.why : '');
        setTimeout(() => { i++; i < qs.length ? ask() : end(); }, q.why ? 3200 : ok ? 700 : 1800);
      };
    });
  };
  const end = () => {
    const pct = Math.round((score / qs.length) * 100);
    finishCard(act, `${score}/${qs.length}`, pct, missed.length ? `<div class="card" style="text-align:left;width:100%"><b>To review</b><ul>${missed.map((q) => `<li>${q.prompt.replace(/<[^>]+>/g, '')} <b>${esc(q.answer)}</b></li>`).join('')}</ul></div>` : '', () => RUN[act]());
  };
  ask();
}
const quizQ = (set, n) => sample(set.items, n).map((it) => ({ prompt: esc(it.q), opts: it.opts, answer: it.a, why: it.why }));
const catName = (id) => U.categories.find((c) => c.id === id).name;
const sortQ = (n) => sample(U.sort, n).map(([t, c]) => ({ prompt: `Which group? <br><span style="font-family:var(--body);font-weight:800">${esc(t)}</span>`, opts: U.categories.map((x) => x.name), answer: catName(c) }));
const vocabQ = (n) => sample(U.vocab, n).map(([en, def, es], k) => {
  const hasEs = es !== undefined; // Spanish column is optional per unit
  const others = (idx) => shuffle(U.vocab.filter((v) => v[0] !== en)).slice(0, 3).map((v) => v[idx]);
  const mode = k % (hasEs ? 3 : 2);
  if (mode === 0) return { prompt: `Which term means: <em>${esc(def)}</em>?`, opts: shuffle([en, ...others(0)]), answer: en };
  if (mode === 1) return { prompt: `What does <b>${esc(en)}</b> mean?`, opts: shuffle([def, ...others(1)]), answer: def };
  return { prompt: `Spanish for <b>${esc(en)}</b>?`, opts: shuffle([es, ...others(2)]), answer: es };
});
const riddleQ = (n) => { const all = U.riddles.map((r) => cap(r.a)); return sample(U.riddles, n).map((r) => ({ prompt: 'Who am I?<br><span style="font-family:var(--body);font-weight:700;font-size:1rem">' + r.clues.map(esc).join(' ') + '</span>', opts: shuffle(all), answer: cap(r.a) })); };

/* ---------- activities ---------- */
const RUN = {
  sort: () => quiz('sort', sortQ(Math.min(12, U.sort.length))),
  vocab: () => quiz('vocab', vocabQ(Math.min(12, U.vocab.length))),
  exam: () => {
    const pool = (U.quizzes || []).flatMap((z) => z.items.map((it) => ({ prompt: esc(it.q), opts: it.opts, answer: it.a, why: it.why })));
    const qs = [...sortQ(Math.min(6, U.sort.length)), ...vocabQ(Math.min(4, U.vocab.length)), ...sample(pool, Math.min(8, pool.length)), ...(U.riddles ? riddleQ(Math.min(2, U.riddles.length)) : [])];
    quiz('exam', shuffle(qs));
  },

  features() {
    const cats = U.categories, rows = U.features;
    app.innerHTML = `${topBar('<button class="link" id="stop">← Stop</button>', 'Features table')}<div class="panel"><p class="clue">Tick every group that has each feature. A feature can belong to more than one group.</p>
     <table class="grid2"><thead><tr><th></th>${cats.map((c) => `<th>${esc(c.name)}</th>`).join('')}</tr></thead><tbody>
     ${rows.map(([f], r) => `<tr><td>${esc(f)}</td>${cats.map((c, k) => `<td data-r="${r}" data-k="${k}"><input type="checkbox" aria-label="${esc(f)}: ${esc(c.name)}"></td>`).join('')}</tr>`).join('')}</tbody></table>
     <div class="fb" id="fb"></div><div class="row"><button class="btn primary" id="chk">Check</button></div></div>`;
    $('#stop').onclick = unitHome;
    $('#chk').onclick = () => {
      let right = 0; const total = rows.length * cats.length;
      app.querySelectorAll('td[data-r]').forEach((td) => { const ok = td.firstChild.checked === !!rows[+td.dataset.r][1][+td.dataset.k]; if (ok) right++; td.className = ok ? 'ok' : 'no'; td.firstChild.disabled = true; });
      const pct = Math.round((right / total) * 100);
      $('#fb').className = 'fb ' + (pct === 100 ? 'good' : 'bad'); $('#fb').textContent = `${right} of ${total} boxes right.`;
      $('#chk').textContent = 'Finish'; $('#chk').onclick = () => finishCard('features', `${right}/${total}`, pct, '<p class="hint">Green boxes were right, red were wrong. Look at the red ones before you go again.</p>', RUN.features);
    };
  },

  label() {
    const ds = shuffle(U.drawings); let i = 0, right = 0, total = 0;
    const next = () => { if (i >= ds.length) { finishCard('label', `${right}/${total}`, Math.round((right / total) * 100), '', RUN.label); return; } draw(ds[i]); };
    const draw = (d) => {
      const bank = shuffle(d.labels.map((l) => l.a)); const placed = d.labels.map(() => null); let selChip = null;
      app.innerHTML = `${topBar('<button class="link" id="stop">← Stop</button>', `Label the drawing · ${i + 1} of ${ds.length}`)}<div class="panel"><h2 class="sec" style="margin:0">${esc(d.title)}</h2>
       <div class="pic pinbox" id="pic">${d.svg}</div>
       <p class="hint">Tap a word, then tap the number it belongs to. Tap a filled number to take its word back.</p>
       <div class="chips" id="bank"></div><div class="slots" id="slots"></div><div class="fb" id="fb"></div><div class="row"><button class="btn primary" id="chk">Check</button></div></div>`;
      $('#stop').onclick = unitHome;
      const vb = $('#pic svg').viewBox.baseVal;
      d.labels.forEach((l, k) => { const b = document.createElement('button'); b.className = 'pin'; b.textContent = k + 1; b.style.left = (l.x / vb.width) * 100 + '%'; b.style.top = (l.y / vb.height) * 100 + '%'; b.setAttribute('aria-label', 'Label ' + (k + 1)); b.onclick = () => put(k); $('#pic').appendChild(b); });
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
        let r = 0; $('#slots').querySelectorAll('.slot').forEach((s, k) => { const ok = placed[k] === d.labels[k].a; if (ok) r++; s.className = 'slot ' + (ok ? 'ok' : 'no'); if (!ok) s.innerHTML += ` <span class="hint">→ ${esc(d.labels[k].a)}</span>`; s.disabled = true; });
        right += r; total += d.labels.length; i++;
        $('#fb').className = 'fb ' + (r === d.labels.length ? 'good' : 'bad'); $('#fb').textContent = `${r} of ${d.labels.length} right.`;
        $('#chk').textContent = i >= ds.length ? 'Finish' : 'Next drawing'; $('#chk').onclick = next;
      };
    };
    next();
  },

  cloze() {
    const items = shuffle(U.cloze).slice(0, 5); let i = 0, right = 0, total = 0;
    const next = () => { if (i >= items.length) { finishCard('cloze', `${right}/${total}`, Math.round((right / total) * 100), '', RUN.cloze); return; } draw(items[i][0]); };
    const draw = (text) => {
      const answers = []; const parts = text.split(/\{([^}]+)\}/); // odd indexes are gaps
      const bank = shuffle(parts.filter((_, k) => k % 2).map((x) => x)); const filled = []; let sel = null;
      parts.forEach((p, k) => { if (k % 2) answers.push(p); });
      app.innerHTML = `${topBar('<button class="link" id="stop">← Stop</button>', `Complete the notes · ${i + 1} of ${items.length}`)}<div class="panel"><p class="cloze" id="txt"></p><div class="chips" id="bank"></div><div class="fb" id="fb"></div><div class="row"><button class="btn primary" id="chk">Check</button></div></div>`;
      $('#stop').onclick = unitHome;
      const render = () => {
        let g = -1; $('#txt').innerHTML = parts.map((p, k) => { if (!(k % 2)) return esc(p); g++; return `<span class="gap ${sel === 'g' + g ? 'act' : ''}" data-g="${g}">${filled[g] ? esc(filled[g]) : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</span>`; }).join('');
        $('#bank').innerHTML = bank.map((w) => `<button class="chip ${Object.values(filled).includes(w) ? 'used' : ''} ${sel === w ? 'sel' : ''}" data-w="${esc(w)}">${esc(w)}</button>`).join('');
        $('#bank').querySelectorAll('.chip').forEach((c) => { c.onclick = () => { if (c.classList.contains('used')) return; sel = sel === c.dataset.w ? null : c.dataset.w; render(); }; });
        $('#txt').querySelectorAll('.gap').forEach((e) => { e.onclick = () => { const k = +e.dataset.g; if (filled[k]) { delete filled[k]; } else if (sel && !sel.startsWith('g')) { filled[k] = sel; sel = null; } render(); }; });
      };
      render();
      $('#chk').onclick = () => {
        if (answers.some((_, k) => !filled[k])) { $('#fb').className = 'fb bad'; $('#fb').textContent = 'Fill every gap first.'; return; }
        let r = 0; $('#txt').querySelectorAll('.gap').forEach((e) => { const k = +e.dataset.g; const ok = filled[k] === answers[k]; if (ok) r++; e.classList.add(ok ? 'ok' : 'no'); e.onclick = null; if (!ok) e.innerHTML += ` → ${esc(answers[k])}`; });
        right += r; total += answers.length; i++;
        $('#fb').className = 'fb ' + (r === answers.length ? 'good' : 'bad'); $('#fb').textContent = r === answers.length ? 'All right!' : 'Not quite: the right words are shown.';
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
       <div class="panel"><ul class="clues" id="cl"></ul><button class="btn" id="more">Another clue (worth less)</button><div class="opts" id="op">${shuffle(opts).map((o) => `<button class="o" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div><div class="fb" id="fb"></div></div>`;
      $('#stop').onclick = unitHome;
      const clues = () => { $('#cl').innerHTML = r.clues.slice(0, shown).map((c) => `<li>${esc(c)}</li>`).join(''); $('#more').disabled = shown >= r.clues.length; };
      clues(); $('#more').onclick = () => { shown++; clues(); };
      app.querySelectorAll('.o').forEach((b) => { b.onclick = () => {
        if (done) return;
        if (b.dataset.o === cap(r.a)) { done = true; const got = Math.max(1, MAX + 1 - shown); pts += got; b.classList.add('ok'); app.querySelectorAll('.o').forEach((x) => (x.disabled = true)); $('#more').disabled = true; $('#fb').className = 'fb good'; $('#fb').textContent = `Yes! ${got} point${got > 1 ? 's' : ''}.`; setTimeout(() => { i++; i < rs.length ? ask() : finishCard('riddles', `${pts}/${rs.length * MAX}`, Math.round((pts / (rs.length * MAX)) * 100), '', RUN.riddles); }, 1100); }
        else { b.classList.add('no'); b.disabled = true; if (shown < r.clues.length) { shown++; clues(); } $('#fb').className = 'fb bad'; $('#fb').textContent = 'Not that one. Here is another clue.'; }
      }; });
    };
    ask();
  },

  learn() {
    const sets = [['Page 60: Summarising', U.explain.filter((x) => x.src === 'p60')], ['Questions from the other pages', U.explain.filter((x) => x.src !== 'p60')]].filter((x) => x[1].length);
    const chooser = () => {
      app.innerHTML = `${topBar('<button class="link" id="stop">← Back</button>', 'Learn the answers')}<div class="panel"><p class="prompt">Learn the answers</p>
       <p class="clue">For each question: read the key points, cover them, write your answer from memory, then check. Questions with gaps come round again until you have them.</p>
       <div class="opts">${sets.map((x, k) => `<button class="o" data-k="${k}">${esc(x[0])} (${x[1].length} questions)</button>`).join('')}${sets.length > 1 ? `<button class="o" data-k="all">Everything (${U.explain.length} questions)</button>` : ''}</div></div>`;
      $('#stop').onclick = unitHome;
      app.querySelectorAll('.o').forEach((b) => { b.onclick = () => run(b.dataset.k === 'all' ? [...U.explain] : [...sets[+b.dataset.k][1]], true); });
    };
    const run = (list, first) => {
      let i = 0, got = 0, total = 0; const gaps = [];
      const item = () => {
        const it = list[i], n = it.points.length, head = `${topBar('<button class="link" id="stop">← Stop</button>', `Learn · ${i + 1} of ${list.length}`)}<div class="track"><i style="width:${(i / list.length) * 100}%"></i></div>`;
        app.innerHTML = `${head}<div class="panel"><p class="prompt">${esc(it.q)}</p><p class="hint">Step 1 of 3: read and understand the key points.</p><ol class="clues">${it.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ol><button class="btn primary" id="cov">Cover it. I'll write it from memory</button></div>`;
        $('#stop').onclick = unitHome;
        $('#cov').onclick = () => {
          app.innerHTML = `${head}<div class="panel"><p class="prompt">${esc(it.q)}</p><p class="hint">Step 2 of 3: write or say your answer from memory, with no peeking.</p><textarea class="ta" id="ans" rows="5" placeholder="Your answer"></textarea><button class="btn primary" id="chk">Check my answer</button></div>`;
          $('#stop').onclick = unitHome; $('#ans').focus({ preventScroll: true });
          $('#chk').onclick = () => {
            const mine = $('#ans').value.trim();
            app.innerHTML = `${head}<div class="panel"><p class="prompt">${esc(it.q)}</p><p class="hint">Step 3 of 3: tick the key points your answer included.</p>${mine ? `<div class="card" style="text-align:left;width:100%"><b>Your answer</b><p style="margin:4px 0 0;white-space:pre-wrap">${esc(mine)}</p></div>` : ''}
             <div class="slots">${it.points.map((p, k) => `<label class="slot" style="cursor:pointer"><input type="checkbox" style="width:22px;height:22px;flex:none"><span>${esc(p)}</span></label>`).join('')}</div><div class="row"><button class="btn primary" id="nx">${i + 1 >= list.length ? 'Finish' : 'Next question'}</button></div></div>`;
            $('#stop').onclick = unitHome;
            $('#nx').onclick = () => { const t = app.querySelectorAll('.slot input:checked').length; got += t; total += n; if (t < n) gaps.push(it); i++; i < list.length ? item() : end(); };
          };
        };
      };
      const end = () => {
        const pct = Math.round((got / total) * 100); if (first) record('learn', pct);
        app.innerHTML = `<div class="panel"><p class="eyebrow">Learn the answers</p><div class="big">${got}/${total}</div><p class="clue">key points remembered${gaps.length ? `. ${gaps.length} question${gaps.length > 1 ? 's' : ''} had gaps.` : '. You had them all!'}</p>
         ${gaps.length ? `<div class="card" style="text-align:left;width:100%"><b>Go again on</b><ul>${gaps.map((g) => `<li>${esc(g.q)}</li>`).join('')}</ul></div>` : ''}
         <div class="row">${gaps.length ? '<button class="btn primary" id="redo">Redo the gaps</button>' : ''}<button class="btn ${gaps.length ? '' : 'primary'}" id="hm">Unit home</button></div></div>`;
        if (gaps.length) $('#redo').onclick = () => run(gaps, false);
        $('#hm').onclick = unitHome;
      };
      item();
    };
    chooser();
  },

  explain() {
    const items = sample(U.explain, Math.min(6, U.explain.length)); let i = 0, got = 0, total = 0;
    const ask = () => {
      const it = items[i];
      app.innerHTML = `${topBar('<button class="link" id="stop">← Stop</button>', `Explain it · ${i + 1} of ${items.length}`)}<div class="panel"><p class="prompt">${esc(it.q)}</p><p class="hint">From the book, ${it.src === 'p60' ? 'page 60 (Summarising)' : 'page ' + it.src.slice(1)}.</p>
       <p class="hint">Write or say your answer first, in 2 or 3 sentences. Then check it against the key points.</p>
       <textarea class="ta" id="ans" rows="4" placeholder="Your answer (optional, it is not saved)"></textarea><button class="btn primary" id="show">Show the key points</button><div id="kp" style="width:100%"></div></div>`;
      $('#stop').onclick = unitHome;
      $('#show').onclick = () => {
        $('#show').hidden = true;
        $('#kp').innerHTML = `<p class="hint">Tick each point your answer included. Be honest: this is how you find what to revise.</p><div class="slots">${it.points.map((p, k) => `<label class="slot" style="cursor:pointer"><input type="checkbox" data-k="${k}" style="width:22px;height:22px;flex:none"><span>${esc(p)}</span></label>`).join('')}</div><div class="row" style="margin-top:12px"><button class="btn primary" id="nx">${i + 1 >= items.length ? 'Finish' : 'Next question'}</button></div>`;
        $('#nx').onclick = () => { got += app.querySelectorAll('#kp input:checked').length; total += it.points.length; i++; i < items.length ? ask() : finishCard('explain', `${got}/${total}`, Math.round((got / total) * 100), '<p class="hint">This score is marked by you. Revise the points you missed, then try again.</p>', RUN.explain); };
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
      app.innerHTML = `${topBar('<button class="link" id="stop">← Stop</button>', `Put in order · ${i + 1} of ${items.length}`)}<div class="panel"><h2 class="sec" style="margin:0">${esc(it.title)}</h2><p class="hint">Tap the steps in the order they happen. Tap a chosen step to take it back.</p><div class="opts" id="pool"></div><div class="slots" id="got"></div><div class="fb" id="fb"></div><div class="row"><button class="btn primary" id="chk">Check</button></div></div>`;
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
        let r = 0; $('#got').querySelectorAll('.step').forEach((b, k) => { const ok = chosen[k] === it.steps[k]; if (ok) r++; b.className = 'step ' + (ok ? 'ok' : 'no'); b.disabled = true; if (!ok) b.innerHTML += ` <span class="hint">→ step ${k + 1}: ${esc(it.steps[k])}</span>`; });
        right += r; total += it.steps.length; i++;
        $('#fb').className = 'fb ' + (r === it.steps.length ? 'good' : 'bad'); $('#fb').textContent = `${r} of ${it.steps.length} in the right place.`;
        $('#chk').textContent = i >= items.length ? 'Finish' : 'Next'; $('#chk').onclick = next;
      };
    };
    next();
  },
};

/* ---------- boot ---------- */
(async () => {
  try {
    UNITS = await (await fetch('/biology/units.json')).json();
    const id = new URLSearchParams(location.search).get('u'); const meta = UNITS.find((u) => u.id === id);
    if (meta) { U = await (await fetch('/biology/' + meta.file)).json(); U.id = meta.id; (U.quizzes || []).forEach((z) => { ACTS['q-' + z.id] = { name: z.name, icon: z.icon, blurb: z.blurb }; RUN['q-' + z.id] = () => quiz('q-' + z.id, quizQ(z, Math.min(10, z.items.length))); }); unitHome(); } else listHome();
  } catch (e) { app.innerHTML = '<p class="fb bad">Could not load the unit. Check your connection and refresh.</p>'; }
})();
