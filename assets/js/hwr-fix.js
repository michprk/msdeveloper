// Correcteur français pour la lecture de l'écriture : le modèle lit des lettres, le dictionnaire choisit le mot.
// « domain » → « demain », « revision » → « révision », « no yau » → « noyau », « historic » → « histoire ».
export const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/’/g, '\'').toLowerCase();

// Lettres qui se ressemblent à la main : les confondre coûte peu
const SIM = new Map();
for (const [a, b, c] of [['a', 'o', 0.35], ['e', 'o', 0.35], ['e', 'c', 0.35], ['a', 'e', 0.45], ['u', 'n', 0.35], ['u', 'v', 0.35], ['n', 'm', 0.45], ['r', 'v', 0.45], ['i', 'l', 0.3], ['l', '1', 0.2], ['i', '1', 0.3], ['o', '0', 0.2], ['g', 'q', 0.35], ['g', 'y', 0.4], ['g', 'c', 0.4], ['t', 'f', 0.45], ['h', 'b', 0.45], ['a', 'd', 0.45], ['k', 'h', 0.45], ['s', '5', 0.3], ['z', '2', 0.35], ['b', '6', 0.35], ['r', 'n', 0.45], ['c', 's', 0.5], ['y', 'j', 0.45], ['w', 'u', 0.5], ['h', 'n', 0.45], ['e', 'l', 0.5], ['j', 'i', 0.45], ['x', 'k', 0.5], ['q', 'a', 0.45], ['i', 'e', 0.5], ['t', 'l', 0.45], ['v', 'w', 0.4], ['c', 'o', 0.45]]) { SIM.set(a + b, c); SIM.set(b + a, c); }
const sub = (x, y) => (x === y ? 0 : SIM.get(x + y) ?? 1);
// Distance d'édition pondérée (avec inversion de deux lettres), arrêtée dès qu'elle dépasse max
export function dist(a, b, max = 9) {
  const n = a.length, m = b.length;
  if (Math.abs(n - m) * 0.8 > max) return max + 1;
  let pp = new Float32Array(m + 1), prev = new Float32Array(m + 1), cur = new Float32Array(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j * 0.8;
  for (let i = 1; i <= n; i++) {
    cur[0] = i * 0.8; let lo = cur[0];
    for (let j = 1; j <= m; j++) {
      let v = Math.min(prev[j] + 0.8, cur[j - 1] + 0.8, prev[j - 1] + sub(a[i - 1], b[j - 1]));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, pp[j - 2] + 0.6);
      cur[j] = v; if (v < lo) lo = v;
    }
    if (lo > max) return max + 1;
    [pp, prev, cur] = [prev, cur, pp];
  }
  return prev[m];
}

// Index du dictionnaire : forme sans accents → meilleur mot ; formes rangées par longueur
export function buildIndex(text, mine = []) {
  const byFold = new Map(), byLen = new Map();
  const add = (w, r, own) => {
    const f = fold(w); if (!f || f.length > 26) return;
    const cur = byFold.get(f);
    if (!cur || r < cur.r) byFold.set(f, { w, r, own: own || cur?.own });
    if (!cur) { const L = f.length; if (!byLen.has(L)) byLen.set(L, []); byLen.get(L).push(f); }
  };
  mine.forEach((w) => add(String(w).toLowerCase(), 30, 1));
  String(text).split('\n').forEach((w, r) => { w = w.trim(); if (w) add(w, r + 60, 0); });
  return { byFold, byLen };
}
const shape = (src, w) => (/^[A-ZÀ-Ý]/.test(src) ? w[0].toUpperCase() + w.slice(1) : w);
// Un mot lu → les mots du dictionnaire les plus proches (le premier est retenu)
export function fixWord(raw, idx, k = 3) {
  const m = /^([^\p{L}\d]*)([\p{L}\d'’-]*[\p{L}\d])([^\p{L}\d]*)$/u.exec(raw);
  if (!m) return { w: raw, d: 0, alts: [] };
  const [, pre, core, post0] = m;
  const post = post0.replace(/-+$/, '');
  if (/^\d+([.,:/h-]\d+)*$/.test(core)) return { w: pre + core + post, d: 0, alts: [] };
  const f = fold(core);
  const L = f.length;
  const thr = L <= 2 ? 0.45 : L <= 4 ? 1.05 : L <= 7 ? 1.7 : 2.4;
  const found = [];
  const hit = idx.byFold.get(f);
  if (hit) found.push({ w: hit.w, s: -1, d: 0 });
  let bound = thr;
  for (let len = Math.max(1, L - 2); len <= L + 2; len++) {
    for (const cand of idx.byLen.get(len) || []) {
      if (cand === f) continue;
      const d = dist(f, cand, bound);
      if (d > bound) continue;
      const e = idx.byFold.get(cand);
      found.push({ w: e.w, s: d + 0.06 * Math.log(e.r + 10) - (e.own ? 0.4 : 0), d });
    }
  }
  found.sort((a, b) => a.s - b.s);
  const uniq = [...new Map(found.map((x) => [x.w, x])).values()].slice(0, k);
  if (!uniq.length) return { w: pre + core + post, d: thr + 1, alts: [], unknown: 1 };
  return { w: pre + shape(core, uniq[0].w) + post, d: uniq[0].d, alts: uniq.slice(1).map((x) => pre + shape(core, x.w) + post) };
}
// Le modèle répète parfois la fin d'un mot après un point : « important. import »
function trimEcho(s) {
  const m = /^(.*?[.!?])\s+(.+)$/.exec(s);
  if (!m) return s;
  const head = fold(m[1]), tail = fold(m[2]).replace(/[.!?]$/, '');
  return tail.split(' ').every((t) => t.length >= 2 && head.includes(t.slice(0, Math.max(2, t.length - 1)))) ? m[1] : s;
}
// Une ligne lue → corrigée mot à mot ; mots coupés recollés (« dem ain » → « demain »)
export function fixLine(text, idx) {
  let s = trimEcho(String(text).replace(/\s+/g, ' ').trim());
  let toks = s.split(' ').filter(Boolean);
  if (toks.length <= 3 && toks.length) toks[toks.length - 1] = toks[toks.length - 1].replace(/[.,]$/, '');
  for (let i = 0; i < toks.length - 1; i++) {
    const a = fold(toks[i].replace(/[^\p{L}'-]/gu, '')), b = fold(toks[i + 1].replace(/[^\p{L}'-]/gu, ''));
    if (!a || !b) continue;
    const joined = idx.byFold.get(a + b);
    if (joined && (!idx.byFold.has(a) || !idx.byFold.has(b) || a.length < 3 || b.length < 3)) { toks.splice(i, 2, toks[i] + toks[i + 1]); i--; }
  }
  let cost = 0;
  const words = toks.map((t) => { const r = fixWord(t, idx); cost += r.d; return r; });
  const text2 = words.map((r) => r.w).join(' ').replace(/\s+([,.;:!?])/g, '$1');
  // Variantes : le mot le moins sûr remplacé par ses voisins
  const alts = [];
  const weak = words.map((r, i) => [r.d, i]).sort((a, b) => b[0] - a[0])[0];
  if (weak) words[weak[1]].alts.forEach((a) => { const w2 = words.map((r) => r.w); w2[weak[1]] = a; alts.push(w2.join(' ')); });
  return { text: text2, cost, alts };
}
// Lecture(s) du modèle → la meilleure une fois corrigée, et d'autres propositions
export function pickBest(cands, idx) {
  const res = [];
  cands.filter(Boolean).forEach((c, i) => {
    const r = fixLine(c, idx);
    if (r.text) res.push({ text: r.text, s: r.cost + i * 0.35 }, ...r.alts.map((a, k) => ({ text: a, s: r.cost + 0.5 + k * 0.2 + i * 0.35 })));
    const raw = String(c).trim().replace(/[.,]$/, '');
    if (raw && raw !== r.text) res.push({ text: raw, s: r.cost + 0.9 + i * 0.35 });
  });
  res.sort((a, b) => a.s - b.s);
  return [...new Map(res.map((x) => [x.text.toLowerCase(), x])).values()].slice(0, 4);
}
