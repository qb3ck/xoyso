/* Year-round schedule. The first questions are hand-picked (questions.json); after that each day's question is made by a generator,
   chosen to fit the weekday (Mon-Tue 1 star, Wed-Thu 2 stars, Fri-Sun 3 stars) and seeded by group and day so everyone sees the same one. */
const DAYS = 365;
const NEWD = {
  '3primaria': { pWeigh: 3, pStairs: 3, pDigCount: 3, pCoinMix: 3, pTimesTable: 3, pTwoPieces: 3, pSkip: 1, pShareEq: 1, pMinutes: 1 },
  '1eso': { eLCM: 1, ePercentOf: 1, eNeg: 1, eProp: 1, eAreaTri: 1, eDivCount: 3, eDigitsAll: 3, eTrailing: 3, ePaths: 3, eRound: 2 },
  '5primaria': { p5Prop: 2, p5LShape: 2, p5Double: 1, p5Meet: 3 },
};
const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const seedOf = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const SCHED = {};
function yearSchedule(g, list, startDate) {   // returns the generated days (index >= list.length)
  if (SCHED[g]) return SCHED[g];
  const diff = { ...NEWD[g] }; list.forEach((x) => { if (x.g) diff[x.g] = x.d; });
  const keys = Object.keys(diff).filter((k) => G[k]), out = [], recent = [], texts = [];
  const orig = Math.random;
  try {
    for (let j = list.length; j < DAYS; j++) {
      const wd = new Date(startDate.getTime() + j * 864e5).getDay();   // 0 = Sunday
      const t = wd === 1 || wd === 2 ? 1 : wd === 3 || wd === 4 ? 2 : 3;
      let pool = keys.filter((k) => diff[k] === t); if (pool.length < 3) pool = keys.filter((k) => Math.abs(diff[k] - t) <= 1);
      const R = Math.min(8, pool.length - 1), ok = pool.filter((k) => !recent.slice(-R).includes(k)), cand = ok.length ? ok : pool;
      let key, r = null;
      for (let attempt = 0; attempt < 8; attempt++) {
        Math.random = mulberry(seedOf(`${g}|${j}|${attempt}`));
        key = cand[Math.floor(Math.random() * cand.length)];
        r = G[key](); if (!texts.slice(-60).includes(r.q)) break;
      }
      recent.push(key); texts.push(r.q); out.push({ d: diff[key], q: r.q, a: r.a, work: r.work, g: key });
    }
  } finally { Math.random = orig; }
  return (SCHED[g] = out);
}
if (typeof module !== 'undefined') module.exports = { yearSchedule, DAYS };
