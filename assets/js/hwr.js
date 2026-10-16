// Lecture de l'écriture à la main, sur l'appareil : rien n'est envoyé.
// 1) Si le navigateur sait lire l'écriture (API Handwriting Recognition, Chrome sur ChromeOS / Android), on s'en sert.
// 2) Sinon, moteur intégré : les traits sont redressés et découpés en morceaux, chaque groupe de morceaux est
//    comparé à des modèles de lettres (nuage de points, méthode $P), puis le dictionnaire français choisit
//    le mot le plus probable par programmation dynamique. Les mots de l'utilisateur sont prioritaires.

// N : points par nuage (P.n)
const K = 5; // morceaux au plus par lettre
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const ACC = 'éèêëàâùûüçôîïÿ';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const PUNCT = ".,'-?!:/";
export const CHARSET = LOWER + ACC + UPPER + DIGITS + PUNCT;
const CI = Object.fromEntries([...CHARSET].map((c, i) => [c, i]));
const NC = CHARSET.length;
const BASE_OF = { é: 'e', è: 'e', ê: 'e', ë: 'e', à: 'a', â: 'a', ù: 'u', û: 'u', ü: 'u', ç: 'c', ô: 'o', î: 'i', ï: 'i', ÿ: 'y' };
const ACCENTED = Object.entries(BASE_OF).reduce((m, [a, b]) => ((m[b] ||= []).push(a), m), {});

// Réglages (ajustés sur le banc d'essai tools/hwr-eval.html)
export const P = { pScale: 9, zone: 0.75, width: 0.7, offset: -0.4, prior: 0.1, accentMiss: 0.32, accentWrong: 0.18, capMid: 0.6, capFirst: 0.05, raw: 0.55, gap: 0.85, segk: 0.8, prefilter: 30, wcap: 2.5, fScale: 2, n: 20, starts: 2 };

// ---------- Géométrie ----------
const len = (s) => { let L = 0; for (let i = 1; i < s.length; i++) L += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); return L; };
function resampleStroke(s, step) {
  if (s.length < 2) return s.map((p) => [p[0], p[1]]);
  const out = [[s[0][0], s[0][1]]]; let acc = 0;
  let prev = [s[0][0], s[0][1]];
  for (let i = 1; i < s.length; i++) {
    let cur = [s[i][0], s[i][1]];
    let d = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
    while (acc + d >= step && d > 0) {
      const t = (step - acc) / d;
      const q = [prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])];
      out.push(q); prev = q; d = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]); acc = 0;
    }
    acc += d; prev = cur;
  }
  const l = s[s.length - 1];
  if (Math.hypot(out[out.length - 1][0] - l[0], out[out.length - 1][1] - l[1]) > step * 0.3) out.push([l[0], l[1]]);
  return out;
}
// Nuage de n points répartis sur tous les traits
function cloud(strokes, n = P.n) {
  const total = strokes.reduce((a, s) => a + len(s), 0);
  const pts = [];
  if (total < 1e-6) { const all = strokes.flat(); for (let i = 0; i < n; i++) { const p = all[i % all.length]; pts.push([p[0], p[1]]); } return pts; }
  const I = total / (n - 1);
  for (const s of strokes) {
    if (s.length === 1 || len(s) < 1e-6) { pts.push([s[0][0], s[0][1]]); continue; }
    pts.push(...resampleStroke(s, I));
  }
  while (pts.length > n) pts.splice(Math.floor(pts.length / 2), 1);
  while (pts.length < n) pts.push(pts[pts.length - 1]);
  return pts;
}
function normCloud(pts) {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const [x, y] of pts) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  const sc = Math.max(maxx - minx, maxy - miny) || 1;
  let cx = 0, cy = 0;
  for (const [x, y] of pts) { cx += x; cy += y; }
  cx /= pts.length; cy /= pts.length;
  const a = new Float32Array(pts.length * 2);
  pts.forEach(([x, y], i) => { a[i * 2] = (x - cx) / sc; a[i * 2 + 1] = (y - cy) / sc; });
  return a;
}
// $P : appariement glouton des deux nuages (Vatavu, Anthony, Wobbrock, 2012)
const matched = new Uint8Array(64);
function cloudDistance(a, b, n, start) {
  matched.fill(0, 0, n);
  let sum = 0, i = start;
  do {
    let min = Infinity, idx = 0;
    const ax = a[i * 2], ay = a[i * 2 + 1];
    for (let j = 0; j < n; j++) {
      if (matched[j]) continue;
      const dx = ax - b[j * 2], dy = ay - b[j * 2 + 1];
      const d = dx * dx + dy * dy;
      if (d < min) { min = d; idx = j; }
    }
    matched[idx] = 1;
    sum += (1 - ((i - start + n) % n) / n) * Math.sqrt(min);
    i = (i + 1) % n;
  } while (i !== start);
  return sum;
}
function pDist(a, b) {
  const n = a.length / 2, step = Math.max(1, Math.floor(n / P.starts));
  let min = Infinity;
  for (let i = 0; i < n; i += step) { const d = Math.min(cloudDistance(a, b, n, i), cloudDistance(b, a, n, i)); if (d < min) min = d; }
  return min / n;
}
const box = (pts) => {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const p of pts) { if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0]; if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1]; }
  return { minx, miny, maxx, maxy, w: maxx - minx, h: maxy - miny };
};
// Orientation des traits par zone (5 × 5 cases, 4 orientations sans sens) : décrit la forme d'une lettre
// indépendamment du sens dans lequel on l'a tracée. Vecteur normé, comparé par distance euclidienne.
const G = 5;
function dirFeat(strokes) {
  const b = box(strokes.flat());
  const s = Math.max(b.w, b.h) || 1, ox = (b.minx + b.maxx) / 2 - s / 2, oy = (b.miny + b.maxy) / 2 - s / 2;
  const f = new Float32Array(G * G * 4);
  for (const st of strokes) {
    const r = resampleStroke(st, s / 24);
    for (let i = 1; i < r.length; i++) {
      const dx = r[i][0] - r[i - 1][0], dy = r[i][1] - r[i - 1][1];
      const L = Math.hypot(dx, dy); if (L < 1e-9) continue;
      let a = Math.atan2(dy, dx); if (a < 0) a += Math.PI; if (a >= Math.PI) a -= Math.PI;
      const o = (a / Math.PI) * 4, o0 = Math.floor(o) % 4, o1 = (o0 + 1) % 4, wo = o - Math.floor(o);
      const gx = (((r[i][0] + r[i - 1][0]) / 2 - ox) / s) * G - 0.5, gy = (((r[i][1] + r[i - 1][1]) / 2 - oy) / s) * G - 0.5;
      const x0 = Math.floor(gx), y0 = Math.floor(gy), wx = gx - x0, wy = gy - y0;
      for (const [cx, cy, w] of [[x0, y0, (1 - wx) * (1 - wy)], [x0 + 1, y0, wx * (1 - wy)], [x0, y0 + 1, (1 - wx) * wy], [x0 + 1, y0 + 1, wx * wy]]) {
        if (cx < 0 || cy < 0 || cx >= G || cy >= G || w <= 0) continue;
        const k = (cy * G + cx) * 4;
        f[k + o0] += L * w * (1 - wo); f[k + o1] += L * w * wo;
      }
    }
  }
  let n = 0; for (let i = 0; i < f.length; i++) { f[i] = Math.sqrt(f[i]); n += f[i] * f[i]; }
  n = Math.sqrt(n) || 1; for (let i = 0; i < f.length; i++) f[i] /= n;
  return f;
}
const fDist = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) { const x = a[i] - b[i]; d += x * x; } return Math.sqrt(d); };
const median = (a) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
function wmedian(vals, ws) {
  const idx = vals.map((_, i) => i).sort((i, j) => vals[i] - vals[j]);
  const tot = ws.reduce((a, b) => a + b, 0); let acc = 0;
  for (const i of idx) { acc += ws[i]; if (acc >= tot / 2) return vals[i]; }
  return 0;
}

// Inclinaison de l'écriture (angle des traits presque verticaux)
export function slantOf(strokes, step) {
  const vals = [], ws = [];
  for (const s0 of strokes) {
    const s = resampleStroke(s0, step);
    for (let i = 1; i < s.length; i++) {
      let dx = s[i][0] - s[i - 1][0], dy = s[i][1] - s[i - 1][1];
      if (dy > 0) { dx = -dx; dy = -dy; }
      const L = Math.hypot(dx, dy); if (L < 1e-9) continue;
      const a = Math.atan2(dx, -dy);
      if (Math.abs(a) < 0.8) { vals.push(a); ws.push(L); }
    }
  }
  return vals.length > 3 ? Math.max(-0.6, Math.min(0.75, wmedian(vals, ws))) : 0;
}
export const shear = (strokes, a, y0) => { const t = Math.tan(a); return strokes.map((s) => s.map((p) => [p[0] + t * (p[1] - y0), p[1], p[2]])); };

// Ligne de base et hauteur d'x : médianes des creux et des sommets des traits
export function lineMetrics(strokes) {
  const b = box(strokes.flat());
  const H = Math.max(b.h, 1e-3);
  const hy = H * 0.05;
  const bottoms = [], tops = [];
  for (const s0 of strokes) {
    const s = resampleStroke(s0, H / 40);
    if (s.length < 3) continue;
    let dir = 0, ext = s[0][1];
    for (let i = 1; i < s.length; i++) {
      const y = s[i][1];
      if (dir >= 0) { if (y > ext) ext = y; else if (ext - y > hy) { if (dir === 1) bottoms.push(ext); dir = -1; ext = y; } if (dir === 0 && y > ext) dir = 1; }
      else { if (y < ext) ext = y; else if (y - ext > hy) { tops.push(ext); dir = 1; ext = y; } }
    }
    if (dir === 1) bottoms.push(ext); else if (dir === -1) tops.push(ext);
    const ys = s.map((p) => p[1]);
    if (s[0][1] <= Math.min(...ys.slice(0, 4))) tops.push(s[0][1]);
  }
  let base = median(bottoms), mean = median(tops);
  let xh = base - mean;
  if (!(xh > H * 0.22)) { xh = H * 0.55; base = b.maxy - H * 0.18; }
  if (xh > H) xh = H;
  return { base, xh, box: b };
}

// ---------- Modèles de lettres ----------
let MODEL = null;
async function model() {
  if (MODEL) return MODEL;
  const [{ default: G }, { default: LEX }] = await Promise.all([import('./data/hwr-glyphs.js'), import('./data/hwr-lexique.js')]);
  const T = [];
  for (const [c, list] of Object.entries(G.chars)) {
    if (CI[c] === undefined) continue;
    for (const enc of list) {
      const strokes = enc.map((s) => { const out = []; for (let i = 0; i < s.length; i += 2) out.push([s[i] / 50, s[i + 1] / 50]); return out; });
      const bx = box(strokes.flat());
      T.push({ c: CI[c], cl: normCloud(cloud(strokes)), df: dirFeat(strokes), top: bx.miny, bot: bx.maxy, w: bx.w, h: bx.h, ns: Math.max(1, segment(strokes).segs.length) });
    }
  }
  MODEL = { T, lex: buildLex(LEX) };
  return MODEL;
}
// Dictionnaire : un mot par ligne, du plus fréquent au moins fréquent
const ALPHA = LOWER + ACC + "-'";
const AI = Object.fromEntries([...ALPHA].map((c, i) => [c, i]));
function buildLex(text) {
  const words = [];
  text.split('\n').forEach((w, rank) => {
    w = w.trim().replace(/œ/g, 'oe').replace(/æ/g, 'ae');
    if (!w || ![...w].every((c) => AI[c] !== undefined)) return;
    words.push({ w, a: Uint8Array.from([...w].map((c) => AI[c])), r: rank });
  });
  return words;
}
const userLex = (list) => {
  const seen = new Set(), out = [];
  for (const raw of list || []) {
    const w = String(raw).toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').trim();
    if (w.length < 2 || w.length > 24 || seen.has(w) || ![...w].every((c) => AI[c] !== undefined)) continue;
    seen.add(w); out.push({ w, a: Uint8Array.from([...w].map((c) => AI[c])), r: 40, mine: 1 });
  }
  return out;
};

// ---------- Découpage ----------
// Une ligne d'écriture, normalisée : hauteur d'x = 1, ligne de base à y = 0
function segment(strokes) {
  const segs = [], marks = [];
  strokes.forEach((s0, si) => {
    const s = resampleStroke(s0, 0.07);
    const b = box(s);
    if (Math.max(b.w, b.h) < 0.45 && b.maxy < -0.5) { marks.push({ pts: s, b, si }); return; }
    // Coupes aux creux (bas des liaisons de l'écriture attachée) et aux reprises vers le haut
    // Trait lissé (le tremblement du doigt ne doit pas créer de faux creux), creux marqué des deux côtés
    const ys = s.map((p, i) => (s[Math.max(0, i - 2)][1] + s[Math.max(0, i - 1)][1] + p[1] + s[Math.min(s.length - 1, i + 1)][1] + s[Math.min(s.length - 1, i + 2)][1]) / 5);
    const W = 4, cuts = [0];
    for (let i = W; i < s.length - W; i++) {
      const y = ys[i];
      let ok = y > -0.45 && s[i + W][0] > s[i][0] - 0.02 && i - cuts[cuts.length - 1] > W;
      for (let j = i - W; ok && j <= i + W; j++) if (ys[j] > y) ok = false;
      if (!ok) continue;
      let upL = 0, upR = 0;
      for (let j = Math.max(0, i - 8); j < i; j++) upL = Math.max(upL, y - ys[j]);
      for (let j = i + 1; j <= Math.min(s.length - 1, i + 8); j++) upR = Math.max(upR, y - ys[j]);
      if (upL > 0.12 && upR > 0.12) cuts.push(i);
    }
    cuts.push(s.length - 1);
    for (let k = 0; k < cuts.length - 1; k++) {
      const part = s.slice(cuts[k], cuts[k + 1] + 1);
      const last = segs[segs.length - 1];
      if (len(part) < 0.22 && last && last.si === si) { last.pts.push(...part.slice(1)); last.b = box(last.pts); continue; }
      segs.push({ pts: part, b: box(part), si });
    }
  });
  segs.forEach((g) => { g.cx = (g.b.minx + g.b.maxx) / 2; g.marks = []; });
  segs.sort((a, b) => a.cx - b.cx);
  // Les points, accents et apostrophes se rattachent au morceau qu'ils surplombent
  const apos = [];
  for (const m of marks) {
    const mc = (m.b.minx + m.b.maxx) / 2;
    let best = null, bd = Infinity;
    for (const g of segs) { const d = mc < g.b.minx ? g.b.minx - mc : mc > g.b.maxx ? mc - g.b.maxx : 0; if (d < bd) { bd = d; best = g; } }
    if (best && bd < 0.3) best.marks.push(m.pts); else apos.push({ x: mc, pts: m.pts });
  }
  return { segs, apos };
}
// Mots : un écart nettement plus grand que les écarts entre lettres
function words(segs, apos) {
  if (!segs.length) return [];
  const gaps = [];
  let right = segs[0].b.maxx;
  for (let i = 1; i < segs.length; i++) { gaps.push(segs[i].b.minx - right); right = Math.max(right, segs[i].b.maxx); }
  let th = P.gap;
  const pos = gaps.filter((g) => g > 0.05).sort((a, b) => a - b);
  if (pos.length >= 3) {
    let bj = 0, bi = -1;
    for (let i = 1; i < pos.length; i++) { const j = pos[i] - pos[i - 1]; if (j > bj) { bj = j; bi = i; } }
    if (bi > 0 && pos[bi] > pos[bi - 1] * 2.2 && bj > 0.35) th = Math.min(1.8, Math.max(P.gap, (pos[bi] + pos[bi - 1]) / 2));
  }
  const out = [[segs[0]]];
  for (let i = 1; i < segs.length; i++) {
    const ap = apos.find((a) => a.x > segs[i - 1].b.maxx - 0.1 && a.x < segs[i].b.minx + 0.1);
    if (gaps[i - 1] > th || ap) { if (ap) out[out.length - 1].apos = 1; out.push([segs[i]]); } else out[out.length - 1].push(segs[i]);
  }
  // Un morceau isolé et étroit (jambage de « p », barre de « t » levée…) rejoint le mot le plus proche
  const wb = (g) => ({ l: Math.min(...g.map((s) => s.b.minx)), r: Math.max(...g.map((s) => s.b.maxx)) });
  for (let i = 0; i < out.length && out.length > 1; i++) {
    const g = out[i], b = wb(g);
    if (g.length > 2 || b.r - b.l > 1.1 || g.apos || out[i - 1]?.apos) continue;
    const dl = i > 0 ? b.l - wb(out[i - 1]).r : Infinity, dr = i < out.length - 1 ? wb(out[i + 1]).l - b.r : Infinity;
    if (Math.min(dl, dr) > 1.05) continue;
    if (dl <= dr) out[i - 1].push(...g); else out[i + 1].unshift(...g);
    out.splice(i--, 1);
  }
  return out;
}

// ---------- Coût de chaque groupe de morceaux pour chaque caractère ----------
function costTable(segs, T) {
  const n = segs.length;
  const C = new Float32Array(n * K * NC).fill(9);
  for (let i = 0; i < n; i++) {
    for (let k = 1; k <= K && i + k <= n; k++) {
      const grp = segs.slice(i, i + k);
      const strokes = []; grp.forEach((g) => { strokes.push(g.pts); g.marks.forEach((m) => strokes.push(m)); });
      const b = box(strokes.flat());
      if (b.w > 3.6 || (k > 1 && grp.some((g, j) => j && g.b.minx - Math.max(...grp.slice(0, j).map((x) => x.b.maxx)) > 0.7))) continue;
      const cl = normCloud(cloud(strokes)), df = dirFeat(strokes);
      // Premier passage rapide (nuage de 12 points, modèles de hauteur plausible), passage précis sur les meilleurs
      const cheap = [];
      T.forEach((t, ti) => {
        const z = Math.abs(b.miny - t.top) + Math.abs(b.maxy - t.bot);
        if (z > 2.2) return;
        cheap.push([fDist(df, t.df) * P.fScale + z * P.zone + P.width * Math.min(P.wcap, Math.abs(Math.log((b.w + 0.25) / (t.w + 0.25))) * 1.6), ti]);
      });
      cheap.sort((x, y) => x[0] - y[0]);
      cheap.length = Math.min(cheap.length, P.prefilter);
      const base = (i * K + (k - 1)) * NC;
      for (const [, ti] of cheap) {
        const t = T[ti];
        const zone = P.zone * (Math.min(1.4, Math.abs(b.miny - t.top)) + Math.min(1.4, Math.abs(b.maxy - t.bot)));
        const wd = P.width * Math.min(P.wcap, Math.abs(Math.log((b.w + 0.25) / (t.w + 0.25))) * 1.6);
        const sp = P.segk * Math.max(0, k - t.ns);
        const v = P.pScale * pDist(cl, t.cl) + P.fScale * fDist(df, t.df) + zone + wd + sp;
        if (v < C[base + t.c]) C[base + t.c] = v;
      }
    }
  }
  return C;
}
const cAt = (C, i, k, c) => C[(i * K + (k - 1)) * NC + c];
// Coût d'une lettre du dictionnaire (accents oubliés, majuscule en début de mot)
function letterCost(C, i, k, a, first) {
  const ch = ALPHA[a];
  if (ch === '-' || ch === "'") return cAt(C, i, k, CI[ch]);
  const base = BASE_OF[ch];
  let v = cAt(C, i, k, CI[ch]);
  if (base) { v = Math.min(v, cAt(C, i, k, CI[base]) + P.accentMiss); for (const o of ACCENTED[base]) if (o !== ch) v = Math.min(v, cAt(C, i, k, CI[o]) + P.accentWrong); }
  else if (ACCENTED[ch]) for (const o of ACCENTED[ch]) v = Math.min(v, cAt(C, i, k, CI[o]) + P.accentWrong);
  const up = (base || ch).toUpperCase();
  if (CI[up] !== undefined) v = Math.min(v, cAt(C, i, k, CI[up]) + (first ? P.capFirst : P.capMid));
  if (ch === 'o') v = Math.min(v, cAt(C, i, k, CI['0']) + 0.3);
  if (ch === 'l') v = Math.min(v, cAt(C, i, k, CI['1']) + 0.4, cAt(C, i, k, CI.I) + 0.2);
  return v;
}

// Meilleurs mots du dictionnaire pour une suite de morceaux
function lexBest(C, n, lex, top = 6) {
  const LC = new Float32Array(n * K * ALPHA.length * 2);
  for (let i = 0; i < n; i++) for (let k = 1; k <= K && i + k <= n; k++) for (let a = 0; a < ALPHA.length; a++) {
    const o = ((i * K + (k - 1)) * ALPHA.length + a) * 2;
    LC[o] = letterCost(C, i, k, a, false); LC[o + 1] = i === 0 ? letterCost(C, i, k, a, true) : LC[o];
  }
  const width = Math.max(1, n);
  const best = [];
  let worst = Infinity;
  const D = new Float32Array((n + 1) * 26);
  for (const e of lex) {
    const L = e.a.length;
    if (L > n || L * K < n || L > 24) continue;
    if (Math.abs(L - width * 0.75) > Math.max(3, width * 0.6)) continue;
    D.fill(Infinity, 0, (n + 1) * (L + 1));
    D[0] = 0;
    let alive = true;
    for (let l = 1; l <= L && alive; l++) {
      alive = false;
      const a = e.a[l - 1];
      for (let j = l; j <= n; j++) {
        let m = Infinity;
        for (let k = 1; k <= K && j - k >= l - 1; k++) {
          const prev = D[(l - 1) * (n + 1) + j - k]; if (prev === Infinity) continue;
          const v = prev + LC[(((j - k) * K + (k - 1)) * ALPHA.length + a) * 2 + (l === 1 ? 1 : 0)] + P.offset;
          if (v < m) m = v;
        }
        D[l * (n + 1) + j] = m;
        if (m < worst) alive = true;
      }
    }
    const raw = D[L * (n + 1) + n];
    if (raw === Infinity) continue;
    const s = raw + P.prior * Math.log(e.r + 30) - (e.mine ? 0.4 : 0);
    if (best.length < top || s < worst) {
      best.push({ w: e.w, s, raw });
      best.sort((x, y) => x.s - y.s);
      if (best.length > top) best.pop();
      worst = best.length >= top ? best[best.length - 1].s : Infinity;
    }
  }
  return best;
}
// Lecture lettre à lettre, sans dictionnaire (chiffres, noms propres, mots inconnus)
function rawBest(C, n, set) {
  const D = new Float32Array(n + 1).fill(Infinity), back = new Int16Array(n + 1), bc = new Int16Array(n + 1);
  D[0] = 0;
  for (let j = 1; j <= n; j++) for (let k = 1; k <= K && j - k >= 0; k++) {
    if (D[j - k] === Infinity) continue;
    let mc = Infinity, ci = 0;
    for (const c of set) { const v = cAt(C, j - k, k, c); if (v < mc) { mc = v; ci = c; } }
    const v = D[j - k] + mc + P.offset;
    if (v < D[j]) { D[j] = v; back[j] = k; bc[j] = ci; }
  }
  let s = '', j = n;
  while (j > 0) { s = CHARSET[bc[j]] + s; j -= back[j]; }
  return { w: s, s: D[n] };
}
const SET_ALL = [...CHARSET].map((c) => CI[c]);
const SET_NUM = [...(DIGITS + ".,:/-")].map((c) => CI[c]);

// ---------- Lecture d'une ligne ----------
// Mise à l'échelle d'une ligne : redressée, hauteur d'x = 1, ligne de base à 0 (même calcul pour les modèles)
export function prepLine(strokes0) {
  const { base, xh } = lineMetrics(strokes0);
  const sl = slantOf(strokes0, xh / 8);
  const st = shear(strokes0, sl, base);
  const bx = box(st.flat());
  const f = (p) => [(p[0] - bx.minx) / xh, (p[1] - base) / xh];
  return { strokes: st.map((s) => s.map(f)), base, xh, sl, f };
}
function readLine(strokes0, M, lex) {
  const { strokes, base, xh, sl } = prepLine(strokes0);
  const { segs, apos } = segment(strokes);
  const groups = words(segs, apos);
  const parts = groups.map((g) => {
    const C = costTable(g, M.T);
    const n = g.length;
    const L = lexBest(C, n, lex);
    const R = rawBest(C, n, SET_ALL);
    const num = rawBest(C, n, SET_NUM);
    let cands = L.map((x) => ({ w: x.w, s: x.raw, lex: 1, sc: x.s }));
    const numLike = num.s <= R.s + 0.6 && /\d/.test(num.w);
    if (numLike) cands.unshift({ w: num.w, s: num.s, sc: num.s - 0.5 });
    cands.push({ w: R.w, s: R.s, sc: R.s + P.raw * n });
    cands.sort((a, b) => a.sc - b.sc);
    // Majuscule en tête si la première lettre est nettement une capitale
    cands = cands.map((c) => {
      if (!c.lex) return c;
      const f = c.w[0], up = (BASE_OF[f] || f).toUpperCase();
      if (CI[up] === undefined) return c;
      let bestLow = Infinity, bestUp = Infinity;
      for (let k = 1; k <= K && k <= n; k++) { bestLow = Math.min(bestLow, cAt(C, 0, k, CI[f])); bestUp = Math.min(bestUp, cAt(C, 0, k, CI[up])); }
      return bestUp + 0.15 < bestLow && g[0].b.miny < -1.25 ? { ...c, w: up + c.w.slice(1) } : c;
    });
    const seen = new Set();
    const alts = cands.filter((c) => (seen.has(c.w) ? false : seen.add(c.w))).slice(0, 4).map((c) => c.w);
    return { alts, apos: g.apos };
  });
  const join = (pick) => parts.map((p, i) => p.alts[pick[i] || 0] + (p.apos ? "'" : i < parts.length - 1 ? ' ' : '')).join('');
  const text = join([]);
  const alts = [text];
  parts.forEach((p, i) => p.alts.slice(1, 3).forEach((_, k) => { const pick = []; pick[i] = k + 1; alts.push(join(pick)); }));
  return { text, alts: [...new Set(alts)].slice(0, 4), xh, base, slant: sl };
}
// Plusieurs lignes : on regroupe les traits par bandes horizontales
function splitLines(strokes) {
  const items = strokes.map((s) => ({ s, b: box(s) }));
  const ref = median(items.map((x) => Math.max(x.b.h, x.b.w))) || 1;
  // Les grands traits forment les lignes (projection verticale) ; points, accents et barres s'y rattachent ensuite
  const big = items.filter((x) => Math.max(x.b.h, x.b.w) >= ref * 0.45).sort((a, b) => a.b.miny - b.b.miny);
  const lines = [];
  for (const it of big) {
    const l = lines.find((L) => Math.min(L.bot, it.b.maxy) - Math.max(L.top, it.b.miny) > -ref * 0.15);
    if (l) { l.items.push(it); l.top = Math.min(l.top, it.b.miny); l.bot = Math.max(l.bot, it.b.maxy); }
    else lines.push({ items: [it], top: it.b.miny, bot: it.b.maxy });
  }
  // Deux bandes qui se chevauchent beaucoup ne font qu'une ligne
  lines.sort((a, b) => a.top - b.top);
  for (let i = 1; i < lines.length; i++) {
    const a = lines[i - 1], b = lines[i];
    if (b.top < a.bot - Math.min(a.bot - a.top, b.bot - b.top) * 0.3) { a.items.push(...b.items); a.bot = Math.max(a.bot, b.bot); lines.splice(i--, 1); }
  }
  // Une bande très basse (accent appuyé, barre, point) juste au-dessus ou au-dessous d'une ligne lui appartient
  for (let i = 0; i < lines.length && lines.length > 1; i++) {
    const a = lines[i];
    if (a.bot - a.top > ref * 0.6) continue;
    let bj = -1, bd = Infinity;
    lines.forEach((b, j) => { if (j === i || b.bot - b.top <= ref * 0.6) return; const d = a.bot < b.top ? b.top - a.bot : a.top > b.bot ? a.top - b.bot : 0; if (d < bd) { bd = d; bj = j; } });
    if (bj >= 0 && bd < ref * 1.2) { const b = lines[bj]; b.items.push(...a.items); b.top = Math.min(b.top, a.top); b.bot = Math.max(b.bot, a.bot); lines.splice(i--, 1); }
  }
  for (const it of items) {
    if (big.includes(it)) continue;
    const cy = (it.b.miny + it.b.maxy) / 2;
    let best = lines[0], bd = Infinity;
    // Un petit trait au-dessus d'une ligne lui appartient (point, accent) : on favorise la ligne en dessous
    for (const L of lines) { const d = cy < L.top ? (L.top - cy) * 0.6 : cy > L.bot ? cy - L.bot : 0; if (d < bd) { bd = d; best = L; } }
    if (best) best.items.push(it); else lines.push({ items: [it], top: it.b.miny, bot: it.b.maxy });
  }
  return lines.map((l) => l.items.map((x) => x.s));
}

// ---------- Point d'entrée ----------
let native;
async function nativeRecognizer() {
  if (native !== undefined) return native;
  native = null;
  try {
    if (navigator.createHandwritingRecognizer) {
      const q = await navigator.queryHandwritingRecognizer?.({ languages: ['fr'] });
      if (q) native = await navigator.createHandwritingRecognizer({ languages: ['fr'] });
    }
  } catch (e) { native = null; }
  return native;
}
// strokes : [[[x, y, t], ...], ...] en coordonnées quelconques. words : vocabulaire de l'utilisateur.
export async function recognize(strokes, { words: mine = [], local = false } = {}) {
  strokes = strokes.filter((s) => s && s.length).map((s) => s.map((p) => [+p[0], +p[1], +p[2] || 0]));
  if (!strokes.length) return { text: '', alts: [], engine: 'none' };
  if (!local) {
    const r = await nativeRecognizer();
    if (r) {
      try {
        const d = r.startDrawing({ recognitionType: 'text', inputType: 'touch', alternatives: 3 });
        for (const s of strokes) { const hs = new HandwritingStroke(); s.forEach((p, i) => hs.addPoint({ x: p[0], y: p[1], t: p[2] || i * 8 })); d.addStroke(hs); }
        const pred = await d.getPrediction(); d.clear?.();
        if (pred?.length) return { text: pred[0].text, alts: pred.map((p) => p.text).slice(0, 4), engine: 'native', ...lineMetrics(strokes) };
      } catch (e) { /* moteur intégré */ }
    }
  }
  const M = await model();
  const lex = mine.length ? [...userLex(mine), ...M.lex] : M.lex;
  const lines = splitLines(strokes).map((ls) => readLine(ls, M, lex));
  const first = lines[0];
  return { text: lines.map((l) => l.text).join('\n'), alts: lines.length === 1 ? first.alts : [lines.map((l) => l.text).join('\n')], engine: 'local', xh: first.xh, base: first.base, slant: first.slant, lines: lines.length };
}
// Alignement détaillé d'un mot (banc d'essai)
function align(C, n, word) {
  const a = [...word].map((c) => AI[c]); const L = a.length;
  const D = Array.from({ length: L + 1 }, () => new Array(n + 1).fill(Infinity)), B = Array.from({ length: L + 1 }, () => new Array(n + 1).fill(0));
  D[0][0] = 0;
  for (let l = 1; l <= L; l++) for (let j = l; j <= n; j++) for (let k = 1; k <= K && j - k >= l - 1; k++) {
    const v = D[l - 1][j - k] + letterCost(C, j - k, k, a[l - 1], l === 1) + P.offset;
    if (v < D[l][j]) { D[l][j] = v; B[l][j] = k; }
  }
  const path = []; let j = n;
  for (let l = L; l > 0; l--) { const k = B[l][j]; path.unshift(`${word[l - 1]}[${j - k}+${k}]=${(letterCost(C, j - k, k, a[l - 1], l === 1)).toFixed(2)}`); j -= k; }
  return `${word}: ${D[L][n].toFixed(2)} ${path.join(' ')}`;
}
// Pour le banc d'essai
export const _test = { align, dirFeat, model, readLine, segment, lineMetrics, costTable, normCloud, cloud, pDist, buildLex, P };
export const preload = () => model();
export const hasNative = async () => !!(await nativeRecognizer());
