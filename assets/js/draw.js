// Moteur de dessin partagé : le tableau blanc (zoom, déplacement de la vue) et le dessin posé sur les pages de notes.
// Tout est vectoriel (SVG) : encre à épaisseur variable, écriture à la main transformée en texte, surligneur de toutes
// les couleurs, gomme précise, formes parfaites (gardez le doigt appuyé), volumes (cube, cylindre, cône…), textes mis
// en forme comme dans un traitement de texte, cases à cocher, post-it, bulles, graphiques et frises d'évolution.
import { ic, esc } from './ui.js';
import { clean } from './rich.js';

export const INK = [['#131a2a', 'Encre'], ['#155eef', 'Bleu'], ['#0f1e3d', 'Bleu nuit'], ['#d92d20', 'Rouge'], ['#2f9e44', 'Vert'], ['#616b33', 'Olive'], ['#f08c00', 'Orange'], ['#7048e8', 'Violet'], ['#e64980', 'Rose'], ['#8f6420', 'Brun'], ['#868e96', 'Gris'], ['#ffffff', 'Blanc']];
export const MARK = [['#ffe066', 'Jaune'], ['#8ce99a', 'Vert'], ['#74c0fc', 'Bleu'], ['#faa2c1', 'Rose'], ['#ffc078', 'Orange'], ['#b197fc', 'Violet'], ['#63e6be', 'Turquoise'], ['#ff8787', 'Rouge']];
export const FILLS = [['', 'Aucun'], ['#ffffff', 'Blanc'], ['#fff3bf', 'Jaune'], ['#d3f9d8', 'Vert'], ['#dbe4ff', 'Bleu'], ['#ffe3e3', 'Rose'], ['#ede7da', 'Sable'], ['#e5dbff', 'Violet'], ['#ffd8a8', 'Orange'], ['#0f1e3d', 'Bleu nuit']];
// Bibliothèque de polices : [nom, pile de polices, fichier (pour l'export en image), famille]
const F = (name, stack, file, group) => [name, stack, file, group];
export const FONTS = {
  sans: F('Instrument Sans', "'Instrument Sans', 'Segoe UI', system-ui, sans-serif", 'instrument-sans-400-700-latin.woff2', 'Classiques'),
  serif: F('Fraunces', "Fraunces, Georgia, 'Times New Roman', serif", 'fraunces-normal-300-700-latin.woff2', 'Classiques'),
  lora: F('Lora', "Lora, Georgia, serif", 'lora.woff2', 'Classiques'),
  playfair: F('Playfair Display', "'Playfair Display', Georgia, serif", 'playfair-display.woff2', 'Classiques'),
  slab: F('Roboto Slab', "'Roboto Slab', Georgia, serif", 'roboto-slab.woff2', 'Classiques'),
  nunito: F('Nunito', "Nunito, system-ui, sans-serif", 'nunito.woff2', 'Classiques'),
  montserrat: F('Montserrat', "Montserrat, system-ui, sans-serif", 'montserrat.woff2', 'Classiques'),
  hand: F('Caveat', "Caveat, 'Segoe Print', 'Bradley Hand', cursive", 'caveat-400-700-latin.woff2', 'Écriture à la main'),
  cursive: F('Playwrite (attachée)', "'Playwrite FR Moderne', 'Segoe Script', cursive", 'playwrite-fr-moderne-100-400.woff2', 'Écriture à la main'),
  print: F('Playpen (appliquée)', "'Playpen Sans', 'Comic Sans MS', sans-serif", 'playpen-sans-100-800-latin.woff2', 'Écriture à la main'),
  indie: F('Indie Flower', "'Indie Flower', cursive", 'indie-flower.woff2', 'Écriture à la main'),
  patrick: F('Patrick Hand', "'Patrick Hand', cursive", 'patrick-hand.woff2', 'Écriture à la main'),
  kalam: F('Kalam', "Kalam, cursive", 'kalam.woff2', 'Écriture à la main'),
  shadows: F('Shadows Into Light', "'Shadows Into Light', cursive", 'shadows-into-light.woff2', 'Écriture à la main'),
  gloria: F('Gloria Hallelujah', "'Gloria Hallelujah', cursive", 'gloria-hallelujah.woff2', 'Écriture à la main'),
  architect: F('Architects Daughter', "'Architects Daughter', cursive", 'architects-daughter.woff2', 'Écriture à la main'),
  gochi: F('Gochi Hand', "'Gochi Hand', cursive", 'gochi-hand.woff2', 'Écriture à la main'),
  reenie: F('Reenie Beanie', "'Reenie Beanie', cursive", 'reenie-beanie.woff2', 'Écriture à la main'),
  homemade: F('Homemade Apple', "'Homemade Apple', cursive", 'homemade-apple.woff2', 'Écriture à la main'),
  dancing: F('Dancing Script', "'Dancing Script', cursive", 'dancing-script.woff2', 'Écriture à la main'),
  satisfy: F('Satisfy', "Satisfy, cursive", 'satisfy.woff2', 'Écriture à la main'),
  marker: F('Permanent Marker', "'Permanent Marker', cursive", 'permanent-marker.woff2', 'Titres'),
  amatic: F('Amatic SC', "'Amatic SC', cursive", 'amatic-sc.woff2', 'Titres'),
  pacifico: F('Pacifico', "Pacifico, cursive", 'pacifico.woff2', 'Titres'),
  lobster: F('Lobster', "Lobster, cursive", 'lobster.woff2', 'Titres'),
  bebas: F('Bebas Neue', "'Bebas Neue', Impact, sans-serif", 'bebas-neue.woff2', 'Titres'),
  lexend: F('Lexend', "Lexend, system-ui, sans-serif", 'lexend.woff2', 'Très lisibles (dyslexie)'),
  atkinson: F('Atkinson Hyperlegible', "'Atkinson Hyperlegible', system-ui, sans-serif", 'atkinson-hyperlegible.woff2', 'Très lisibles (dyslexie)'),
  mono: F('Machine à écrire', 'ui-monospace, Menlo, Consolas, monospace', '', 'Machine à écrire'),
  spacemono: F('Space Mono', "'Space Mono', ui-monospace, monospace", 'space-mono.woff2', 'Machine à écrire'),
};
export const FONT_GROUPS = ['Écriture à la main', 'Classiques', 'Titres', 'Très lisibles (dyslexie)', 'Machine à écrire'];
// Les trois écritures proposées d'office pour l'outil Écriture (toutes les autres restent au choix)
export const HAND_FONTS = ['hand', 'cursive', 'print'];
export const HAND_NICK = { hand: 'Naturelle', cursive: 'Attachée', print: 'Appliquée' };
// Graphiques : la palette catégorielle de l'application (validée en clair, avec étiquettes)
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];
// Outils : [id, nom, icône, raccourci]
const DOCK = [['select', 'Choisir', 'cursor', 'V'], ['pen', 'Stylo', 'pen', 'P'], ['write', 'Écriture', 'signature', 'W'], ['highlighter', 'Surligneur', 'highlighter', 'M'], ['eraser', 'Gomme', 'eraser', 'E'], ['shape', 'Formes', 'shapes', 'R'], ['text', 'Texte', 'text', 'T'], ['list', 'Cases', 'listCheck', 'C'], ['sticky', 'Post-it', 'sticky', 'N']];
const MORE = [['bubble', 'Bulle', 'message', 'B'], ['underline', 'Souligner', 'underline', 'U'], ['stamp', 'Tampon', 'check', 'K'], ['chart', 'Graphique', 'chart', 'G'], ['timeline', 'Frise', 'trend', 'J'], ['hand', 'Déplacer', 'hand', 'H']];
export const TOOLS = [...DOCK, ...MORE];
export const SHAPES = [['rect', 'Carré'], ['rrect', 'Arrondi'], ['ellipse', 'Rond'], ['tri', 'Triangle'], ['rtri', 'Triangle rectangle'], ['diamond', 'Losange'], ['para', 'Parallélogramme'], ['trap', 'Trapèze'], ['pent', 'Pentagone'], ['hex', 'Hexagone'], ['oct', 'Octogone'], ['star', 'Étoile'], ['heart', 'Cœur'], ['cloud', 'Nuage'], ['barrow', 'Grosse flèche'], ['plus', 'Croix'], ['line', 'Trait'], ['arrow', 'Flèche'], ['darrow', 'Double flèche'], ['curve', 'Flèche courbe']];
const LINE_K = ['line', 'arrow', 'darrow', 'curve'];
// Volumes : plus proposés, encore dessinés pour les anciens tableaux
const VOLUMES = ['cube', 'pave', 'cyl', 'cone', 'sphere', 'pyr'];
const KNOWN_K = [...SHAPES.map(([k]) => k), ...VOLUMES];
const HINTS = {
  select: 'Touchez un élément pour le choisir, glissez pour le déplacer. Double-touchez un texte pour l\'écrire.',
  pen: 'Dessinez. Gardez le doigt appuyé à la fin d\'un trait : il devient une forme parfaite (rond, carré, triangle, trait droit).',
  write: 'Écrivez avec le doigt ou le stylet, puis levez-le : votre écriture devient du texte au bout d\'une seconde.',
  highlighter: 'Surlignez. Gardez appuyé à la fin pour un trait bien droit.',
  eraser: 'Passez sur un trait pour l\'effacer. En mode « Objet entier », tout l\'élément touché disparaît.',
  shape: 'Choisissez une forme, puis glissez sur la feuille pour la tracer à la bonne taille.',
  text: 'Touchez la feuille pour écrire au clavier. Tirez sur les bords pour élargir le cadre.',
  list: 'Touchez la feuille pour créer une liste de cases à cocher. Une ligne par case.',
  sticky: 'Touchez ou glissez pour poser un post-it.',
  bubble: 'Glissez pour dessiner une bulle.', underline: 'Glissez sous un mot pour le souligner.', stamp: 'Touchez pour poser le symbole.',
  chart: 'Glissez pour placer le graphique, puis « Données » pour saisir les valeurs.', timeline: 'Glissez pour placer la frise, puis « Données » pour les étapes.', hand: 'Glissez pour déplacer la vue.',
};
const DEF = {
  select: { lasso: 0 }, pen: { c: '#131a2a', w: 3.5, pt: 'bille' }, write: { c: '#131a2a', font: 'hand' }, highlighter: { c: '#ffe066', w: 20 }, underline: { c: '#d92d20', w: 3 },
  eraser: { mode: 'precise', r: 14 },
  shape: { k: 'rect', c: '#155eef', w: 2.5, f: '', dash: 0, vol: 1 },
  text: { c: '#131a2a', size: 24, font: 'sans', b: 0, i: 0, u: 0, s: 0, frame: 0, bg: '' },
  list: { c: '#1baf7a', size: 20, font: 'sans' },
  sticky: { f: '#fff3bf', size: 20, font: 'hand' }, bubble: { c: '#131a2a', f: '#ffffff', size: 20, font: 'sans' },
  stamp: { c: '#2f9e44', kind: 'check' }, chart: { kind: 'bar' }, timeline: { c: '#155eef' },
};
const r1 = (n) => Math.round(n * 10) / 10;
const nid = () => 'd' + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 7);
const clone = (x) => JSON.parse(JSON.stringify(x));
const LBL = 'font-family=\'"Instrument Sans", system-ui, sans-serif\'';

// ---------- Couleurs ----------
function shade(hex, amt) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return hex;
  const n = parseInt(m[1], 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = amt > 0 ? 255 : 0, k = Math.abs(amt);
  r = Math.round(r + (t - r) * k); g = Math.round(g + (t - g) * k); b = Math.round(b + (t - b) * k);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// ---------- Encre : contour à épaisseur variable (pression du stylet, ou vitesse du geste) ----------
function smoothPath(q) {
  if (q.length < 3) return q.map((p, i) => `${i ? 'L' : 'M'}${r1(p[0])} ${r1(p[1])}`).join('');
  let d = `M${r1(q[0][0])} ${r1(q[0][1])}`;
  for (let i = 1; i < q.length - 1; i++) d += `Q${r1(q[i][0])} ${r1(q[i][1])} ${r1((q[i][0] + q[i + 1][0]) / 2)} ${r1((q[i][1] + q[i + 1][1]) / 2)}`;
  const l = q[q.length - 1];
  return `${d}L${r1(l[0])} ${r1(l[1])}`;
}
// Types de stylo : bille (régulier), plume (épaisseur selon le sens du trait), pinceau (très expressif), feutre (constant)
export const PENS = [['bille', 'Bille'], ['plume', 'Plume'], ['pinceau', 'Pinceau'], ['feutre', 'Feutre']];
export function inkPath(raw, size, type = 'bille') {
  if (!raw.length) return '';
  const pts = [];
  let px = raw[0][0], py = raw[0][1];
  for (const p of raw) { px += (p[0] - px) * 0.6; py += (p[1] - py) * 0.6; pts.push([px, py, p[2]]); }
  const last = raw[raw.length - 1]; pts.push([last[0], last[1], last[2]]);
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = L[L.length - 1];
  if (total < size * 0.4) { const r = size * 0.55, [x, y] = pts[0]; return `M${r1(x - r)} ${r1(y)}a${r1(r)} ${r1(r)} 0 1 0 ${r1(r * 2)} 0a${r1(r)} ${r1(r)} 0 1 0 ${r1(-r * 2)} 0Z`; }
  let pr = 0.6;
  const R = pts.map((p, i) => {
    let pressure;
    if (p[2] > 0) pressure = p[2];
    else { const d = i ? (L[i] - L[i - 1]) / size : 0; const target = 1 - Math.min(1, d / 2.4); pr += (target - pr) * 0.28; pressure = pr; }
    let r;
    if (type === 'feutre') r = size / 2;
    else if (type === 'pinceau') r = (size / 2) * (0.22 + 1.05 * pressure);
    else if (type === 'plume') { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const ang = Math.atan2(b[1] - a[1], b[0] - a[0]); r = (size / 2) * (0.28 + 0.95 * Math.abs(Math.sin(ang - Math.PI / 4))) * (0.8 + 0.3 * pressure); }
    else r = (size / 2) * (0.5 + 0.55 * pressure);
    if (type !== 'feutre') r *= Math.min(0.62 + 0.38 * Math.min(1, L[i] / (size * 2.2)), 0.3 + 0.7 * Math.min(1, (total - L[i]) / (size * 3)));
    return Math.max(0.4, r);
  });
  const left = [], right = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    left.push([pts[i][0] - dy * R[i], pts[i][1] + dx * R[i]]); right.push([pts[i][0] + dy * R[i], pts[i][1] - dx * R[i]]);
  }
  const re = right[right.length - 1], ls = left[0], Re = R[R.length - 1], R0 = R[0];
  return `${smoothPath(left)}A${r1(Re)} ${r1(Re)} 0 0 0 ${r1(re[0])} ${r1(re[1])}${smoothPath(right.reverse()).replace(/^M/, 'L')}A${r1(R0)} ${r1(R0)} 0 0 0 ${r1(ls[0])} ${r1(ls[1])}Z`;
}
const head = (x1, y1, x2, y2, w, c) => {
  const a = Math.atan2(y2 - y1, x2 - x1), L = 10 + w * 3, s = 0.45;
  return `<path d="M${r1(x2 - L * Math.cos(a - s))} ${r1(y2 - L * Math.sin(a - s))}L${x2} ${y2}L${r1(x2 - L * Math.cos(a + s))} ${r1(y2 - L * Math.sin(a + s))}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
};

// ---------- Textes ----------
const textHtml = (it) => (it.html ? clean(it.html) : it.txt ? esc(it.txt).replace(/\n/g, '<br>') : '');
export const fontOf = (k) => (FONTS[k] || FONTS.sans)[1];
function textStyle(it, extra = '') {
  const deco = [it.u ? 'underline' : '', it.s ? 'line-through' : ''].filter(Boolean).join(' ');
  return `font-family:${fontOf(it.font)};font-size:${it.size || 18}px;color:${it.c || '#131a2a'};font-weight:${it.b ? 700 : 400};font-style:${it.i ? 'italic' : 'normal'};text-decoration:${deco ? `${deco} ${it.uc || it.c || '#131a2a'} 2px` : 'none'};text-align:${it.al || 'left'};${it.frame ? `border:2.5px solid ${it.fc || it.c || '#131a2a'};border-radius:10px;padding:8px 12px;` : ''}${extra}`;
}
const fo = (it, x, y, w, h, extra = '') => `<foreignObject x="${r1(x)}" y="${r1(y)}" width="${r1(Math.max(10, w))}" height="${r1(Math.max(10, h))}"><div xmlns="http://www.w3.org/1999/xhtml" class="dw-t" style="${textStyle(it, extra)}">${it.bg && (it.txt || it.html) ? `<span style="background:${it.bg};padding:1px 4px;border-radius:4px;-webkit-box-decoration-break:clone;box-decoration-break:clone">${textHtml(it)}</span>` : textHtml(it)}</div></foreignObject>`;

// Retire une propriété de style des passages mis en forme (pour appliquer un réglage à tout le texte)
function stripStyle(html, prop) {
  const t = document.createElement('template'); t.innerHTML = html;
  t.content.querySelectorAll('[style]').forEach((el) => { el.style[prop] = ''; if (prop === 'color') el.style.webkitTextFillColor = ''; });
  t.content.querySelectorAll('font').forEach((el) => { if (prop === 'color') el.removeAttribute('color'); if (prop === 'fontFamily') el.removeAttribute('face'); if (prop === 'fontSize') el.removeAttribute('size'); });
  return clean(t.innerHTML);
}

// ---------- Graphiques et frises ----------
function chartSvg(it) {
  const { x, y, w, h } = it;
  const data = (it.data || []).filter((d) => d && (d.l || d.v));
  const pad = 14, top = it.title ? 34 : 14, bottom = it.kind === 'pie' ? 14 : 30;
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#ffffff" stroke="#e3ddd1"/>`;
  if (it.title) out += `<text x="${x + pad}" y="${y + 22}" ${LBL} font-size="14" font-weight="700" fill="#131a2a">${esc(it.title)}</text>`;
  if (!data.length) return out + `<text x="${x + w / 2}" y="${y + h / 2}" text-anchor="middle" ${LBL} font-size="13" fill="#676d7e">Touchez « Données » pour saisir les valeurs</text>`;
  const max = Math.max(1, ...data.map((d) => Number(d.v) || 0));
  const fmt = (v) => String(Math.round((Number(v) || 0) * 100) / 100).replace('.', ',');
  const lbl = `${LBL} font-size="11.5" fill="#394155"`;
  if (it.kind === 'pie') {
    const tot = data.reduce((n, d) => n + Math.max(0, Number(d.v) || 0), 0) || 1;
    const R = Math.max(10, Math.min((w - pad * 2) * 0.32, (h - top - bottom) / 2)), cx = x + pad + R, cy = y + top + (h - top - bottom) / 2;
    let a = -Math.PI / 2;
    data.forEach((d, i) => {
      const v = Math.max(0, Number(d.v) || 0), da = (v / tot) * Math.PI * 2; if (!v) return;
      const x1 = cx + R * Math.cos(a), y1 = cy + R * Math.sin(a), x2 = cx + R * Math.cos(a + da), y2 = cy + R * Math.sin(a + da);
      out += da >= Math.PI * 2 - 1e-6 ? `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${SERIES[i % 6]}"/>` : `<path d="M${cx} ${cy}L${r1(x1)} ${r1(y1)}A${R} ${R} 0 ${da > Math.PI ? 1 : 0} 1 ${r1(x2)} ${r1(y2)}Z" fill="${SERIES[i % 6]}" stroke="#ffffff" stroke-width="2"/>`;
      a += da;
    });
    data.forEach((d, i) => { const ly = y + top + 8 + i * 20; out += `<rect x="${cx + R + 18}" y="${ly - 9}" width="10" height="10" rx="3" fill="${SERIES[i % 6]}"/><text x="${cx + R + 34}" y="${ly}" ${lbl}>${esc(d.l || '')} · ${Math.round(((Number(d.v) || 0) / tot) * 100)} %</text>`; });
    return out;
  }
  const px = x + pad + 6, pw = w - pad * 2 - 6, py = y + top, ph = h - top - bottom;
  for (let k = 0; k <= 4; k++) { const gy = r1(py + ph - (ph * k) / 4); out += `<line x1="${px}" y1="${gy}" x2="${px + pw}" y2="${gy}" stroke="#ede7da" stroke-width="1"/>`; }
  const n = data.length, slot = pw / n;
  if (it.kind === 'line') {
    const Q = data.map((d, i) => [r1(px + slot * i + slot / 2), r1(py + ph - ((Number(d.v) || 0) / max) * ph)]);
    out += `<path d="${Q.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join('')}" fill="none" stroke="${SERIES[0]}" stroke-width="2.5" stroke-linejoin="round"/>`;
    Q.forEach((p, i) => { out += `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${SERIES[0]}" stroke="#ffffff" stroke-width="2"/><text x="${p[0]}" y="${p[1] - 10}" text-anchor="middle" ${lbl} font-weight="600">${fmt(data[i].v)}</text>`; });
  } else {
    const bw = Math.min(56, slot * 0.62);
    data.forEach((d, i) => {
      const v = Number(d.v) || 0, bh = (v / max) * ph, bx = r1(px + slot * i + (slot - bw) / 2), by = r1(py + ph - bh);
      out += `<path d="M${bx} ${py + ph}V${r1(by + Math.min(4, bh))}Q${bx} ${by} ${bx + Math.min(4, bw / 2)} ${by}H${r1(bx + bw - Math.min(4, bw / 2))}Q${r1(bx + bw)} ${by} ${r1(bx + bw)} ${r1(by + Math.min(4, bh))}V${py + ph}Z" fill="${SERIES[(it.multi ? i : 0) % 6]}"/>`;
      out += `<text x="${r1(bx + bw / 2)}" y="${by - 6}" text-anchor="middle" ${lbl} font-weight="600">${fmt(v)}</text>`;
    });
  }
  data.forEach((d, i) => { out += `<text x="${r1(px + slot * i + slot / 2)}" y="${py + ph + 18}" text-anchor="middle" ${lbl}>${esc(String(d.l || '').slice(0, 14))}</text>`; });
  out += `<line x1="${px}" y1="${py + ph}" x2="${px + pw}" y2="${py + ph}" stroke="#a8a39a" stroke-width="1"/>`;
  return out;
}
function timelineSvg(it) {
  const { x, y, w } = it, c = it.c || '#155eef';
  const steps = (it.steps || []).filter((s) => s && (s.l || s.d));
  const midY = y + 60, n = Math.max(1, steps.length);
  let out = `<line x1="${x}" y1="${midY}" x2="${x + w}" y2="${midY}" stroke="${c}" stroke-width="3" stroke-linecap="round"/>${head(x, midY, x + w, midY, 3, c)}`;
  if (!steps.length) return out + `<text x="${x + w / 2}" y="${midY + 30}" text-anchor="middle" ${LBL} font-size="13" fill="#676d7e">Touchez « Données » pour ajouter les étapes</text>`;
  steps.forEach((s, i) => {
    const sx = r1(x + 24 + ((w - 64) * (n === 1 ? 0.5 : i / (n - 1)))), up = i % 2 === 0;
    out += `<circle cx="${sx}" cy="${midY}" r="8" fill="#ffffff" stroke="${c}" stroke-width="3"/>`;
    out += `<text x="${sx}" y="${up ? midY - 30 : midY + 42}" text-anchor="middle" ${LBL} font-size="14" font-weight="700" fill="#131a2a">${esc(String(s.l || '').slice(0, 26))}</text>`;
    if (s.d) out += `<text x="${sx}" y="${up ? midY - 14 : midY + 26}" text-anchor="middle" ${LBL} font-size="12" fill="#676d7e">${esc(String(s.d).slice(0, 20))}</text>`;
  });
  return out;
}
const STAMPS = {
  check: (s, c) => `<path d="M${s * 0.16} ${s * 0.55}L${s * 0.42} ${s * 0.8}L${s * 0.86} ${s * 0.2}" fill="none" stroke="${c}" stroke-width="${s * 0.13}" stroke-linecap="round" stroke-linejoin="round"/>`,
  cross: (s, c) => `<path d="M${s * 0.2} ${s * 0.2}L${s * 0.8} ${s * 0.8}M${s * 0.8} ${s * 0.2}L${s * 0.2} ${s * 0.8}" fill="none" stroke="${c}" stroke-width="${s * 0.13}" stroke-linecap="round"/>`,
  star: (s, c) => { const p = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? s * 0.2 : s * 0.48; return `${r1(s / 2 + r * Math.cos(a))} ${r1(s / 2 + r * Math.sin(a))}`; }); return `<path d="M${p.join('L')}Z" fill="${c}"/>`; },
  question: (s, c) => `<circle cx="${s / 2}" cy="${s / 2}" r="${s * 0.46}" fill="${c}"/><text x="${s / 2}" y="${s * 0.68}" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="${s * 0.56}" fill="#ffffff">?</text>`,
  important: (s, c) => `<circle cx="${s / 2}" cy="${s / 2}" r="${s * 0.46}" fill="${c}"/><text x="${s / 2}" y="${s * 0.7}" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="${s * 0.6}" fill="#ffffff">!</text>`,
  heart: (s, c) => `<path d="M${s / 2} ${s * 0.86}C${s * 0.1} ${s * 0.58} ${s * 0.04} ${s * 0.3} ${s * 0.2} ${s * 0.18}C${s * 0.34} ${s * 0.08} ${s * 0.46} ${s * 0.16} ${s / 2} ${s * 0.28}C${s * 0.54} ${s * 0.16} ${s * 0.66} ${s * 0.08} ${s * 0.8} ${s * 0.18}C${s * 0.96} ${s * 0.3} ${s * 0.9} ${s * 0.58} ${s / 2} ${s * 0.86}Z" fill="${c}"/>`,
};
export const STAMP_KINDS = [['check', '✓ Coche'], ['cross', '✗ Croix'], ['star', '★ Étoile'], ['heart', '♥ Cœur'], ['question', '? Question'], ['important', '! Important']];

// ---------- Formes et volumes ----------
const P2 = (x, y) => `${r1(x)} ${r1(y)}`;
const polyD = (pts, close = true) => `M${pts.map(([x, y]) => P2(x, y)).join('L')}${close ? 'Z' : ''}`;
function shapeSvg(it) {
  const { x, y, w2: w, h } = it, c = it.c || '#155eef', sw = it.w || 2.5, f = it.f || '';
  const dashA = it.dash ? ` stroke-dasharray="${sw * 3} ${sw * 2.4}"` : '';
  const hid = ` stroke-dasharray="${Math.max(4, sw * 2.2)} ${Math.max(3, sw * 1.8)}"`;
  const vol = it.vol && VOLUMES.includes(it.k);
  const base = f || (vol ? '#dbe4ff' : '');
  const lit = base ? shade(base, 0.45) : 'none', dark = base ? shade(base, -0.12) : 'none';
  const S = (d, fill = 'none', extra = '') => `<path d="${d}" fill="${fill}"${fill !== 'none' && vol ? ' fill-opacity=".88"' : ''} stroke="${c}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${extra}/>`;
  const E = (cx, cy, rx, ry, half) => (half === 'front' ? `M${P2(cx - rx, cy)}A${r1(rx)} ${r1(ry)} 0 0 0 ${P2(cx + rx, cy)}` : `M${P2(cx - rx, cy)}A${r1(rx)} ${r1(ry)} 0 0 1 ${P2(cx + rx, cy)}`);
  switch (it.k) {
    case 'tri': return S(polyD([[x + w / 2, y], [x + w, y + h], [x, y + h]]), f || 'none', dashA);
    case 'diamond': return S(polyD([[x + w / 2, y], [x + w, y + h / 2], [x + w / 2, y + h], [x, y + h / 2]]), f || 'none', dashA);
    case 'hex': return S(polyD([[x + w * 0.25, y], [x + w * 0.75, y], [x + w, y + h / 2], [x + w * 0.75, y + h], [x + w * 0.25, y + h], [x, y + h / 2]]), f || 'none', dashA);
    case 'star': return S(polyD(Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, k = i % 2 ? 0.4 : 1; return [x + w / 2 + (w / 2) * k * Math.cos(a), y + h * 0.53 + (h * 0.53) * k * Math.sin(a)]; })), f || 'none', dashA);
    case 'rtri': return S(polyD([[x, y], [x + w, y + h], [x, y + h]]), f || 'none', dashA);
    case 'para': return S(polyD([[x + w * 0.24, y], [x + w, y], [x + w * 0.76, y + h], [x, y + h]]), f || 'none', dashA);
    case 'trap': return S(polyD([[x + w * 0.22, y], [x + w * 0.78, y], [x + w, y + h], [x, y + h]]), f || 'none', dashA);
    case 'pent': return S(polyD(Array.from({ length: 5 }, (_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return [x + w / 2 + (w / 2) * Math.cos(a), y + h * 0.52 + (h * 0.52) * Math.sin(a)]; })), f || 'none', dashA);
    case 'oct': { const c2 = Math.min(w, h) * 0.29; return S(polyD([[x + c2, y], [x + w - c2, y], [x + w, y + c2], [x + w, y + h - c2], [x + w - c2, y + h], [x + c2, y + h], [x, y + h - c2], [x, y + c2]]), f || 'none', dashA); }
    case 'heart': { const X = (u) => r1(x + (u / 100) * w), Y = (v) => r1(y + (v / 90) * h); return S(`M${X(50)} ${Y(88)}C${X(18)} ${Y(66)} ${X(0)} ${Y(46)} ${X(0)} ${Y(26)}C${X(0)} ${Y(8)} ${X(14)} ${Y(0)} ${X(28)} ${Y(0)}C${X(39)} ${Y(0)} ${X(46)} ${Y(6)} ${X(50)} ${Y(14)}C${X(54)} ${Y(6)} ${X(61)} ${Y(0)} ${X(72)} ${Y(0)}C${X(86)} ${Y(0)} ${X(100)} ${Y(8)} ${X(100)} ${Y(26)}C${X(100)} ${Y(46)} ${X(82)} ${Y(66)} ${X(50)} ${Y(88)}Z`, f || 'none', dashA); }
    case 'cloud': { const X = (u) => r1(x + (u / 100) * w), Y = (v) => r1(y + (v / 60) * h); return S(`M${X(22)} ${Y(58)}C${X(6)} ${Y(58)} ${X(0)} ${Y(42)} ${X(12)} ${Y(34)}C${X(4)} ${Y(20)} ${X(20)} ${Y(6)} ${X(34)} ${Y(14)}C${X(40)} ${Y(0)} ${X(62)} ${Y(0)} ${X(68)} ${Y(12)}C${X(80)} ${Y(4)} ${X(98)} ${Y(14)} ${X(92)} ${Y(30)}C${X(102)} ${Y(38)} ${X(96)} ${Y(58)} ${X(80)} ${Y(58)}Z`, f || 'none', dashA); }
    case 'barrow': return S(polyD([[x, y + h * 0.3], [x + w * 0.6, y + h * 0.3], [x + w * 0.6, y], [x + w, y + h / 2], [x + w * 0.6, y + h], [x + w * 0.6, y + h * 0.7], [x, y + h * 0.7]]), f || 'none', dashA);
    case 'plus': { const t = Math.min(w, h) * 0.32, cx = x + w / 2, cy = y + h / 2; return S(polyD([[cx - t / 2, y], [cx + t / 2, y], [cx + t / 2, cy - t / 2], [x + w, cy - t / 2], [x + w, cy + t / 2], [cx + t / 2, cy + t / 2], [cx + t / 2, y + h], [cx - t / 2, y + h], [cx - t / 2, cy + t / 2], [x, cy + t / 2], [x, cy - t / 2], [cx - t / 2, cy - t / 2]]), f || 'none', dashA); }
    case 'cube': case 'pave': {
      const d = Math.min(w, h) * 0.3;
      const F = [[x, y + d], [x + w - d, y + d], [x + w - d, y + h], [x, y + h]], B = F.map(([px, py]) => [px + d, py - d]);
      // Arêtes cachées en pointillés (perspective cavalière, comme en classe), faces légèrement transparentes
      return `${S(`M${P2(...B[3])}L${P2(...B[0])}M${P2(...B[3])}L${P2(...B[2])}M${P2(...B[3])}L${P2(...F[3])}`, 'none', hid + ' opacity="0.75"')}`
        + `${S(polyD([F[0], B[0], B[1], F[1]]), base ? lit : 'none')}${S(polyD([F[1], B[1], B[2], F[2]]), base ? dark : 'none')}${S(polyD(F), base || 'none')}`;
    }
    case 'cyl': {
      const ry = Math.min(h * 0.16, w * 0.28), rx = w / 2, cx = x + w / 2, ty = y + ry, by = y + h - ry;
      return `${S(E(cx, by, rx, ry, 'back'), 'none', hid + ' opacity="0.75"')}${S(`M${P2(x, ty)}L${P2(x, by)}A${r1(rx)} ${r1(ry)} 0 0 0 ${P2(x + w, by)}L${P2(x + w, ty)}`, base ? dark : 'none')}<ellipse cx="${r1(cx)}" cy="${r1(ty)}" rx="${r1(rx)}" ry="${r1(ry)}" fill="${base ? lit : 'none'}" stroke="${c}" stroke-width="${sw}"/>${base ? `<path d="M${P2(x + w * 0.2, ty + ry)}L${P2(x + w * 0.2, by + ry * 0.6)}" stroke="#ffffff" stroke-opacity=".45" stroke-width="${Math.max(3, w * 0.07)}" stroke-linecap="round" fill="none"/>` : ''}`;
    }
    case 'cone': {
      const ry = Math.min(h * 0.14, w * 0.26), rx = w / 2, cx = x + w / 2, by = y + h - ry;
      return `${S(E(cx, by, rx, ry, 'back'), 'none', hid + ' opacity="0.75"')}${S(`M${P2(cx, y)}L${P2(x, by)}A${r1(rx)} ${r1(ry)} 0 0 0 ${P2(x + w, by)}Z`, base || 'none')}${base ? `<path d="M${P2(cx, y + h * 0.08)}L${P2(x + w * 0.28, by + ry * 0.5)}" stroke="#ffffff" stroke-opacity=".4" stroke-width="${Math.max(3, w * 0.06)}" stroke-linecap="round" fill="none"/>` : ''}`;
    }
    case 'sphere': {
      const rx = w / 2, ry = h / 2, cx = x + rx, cy = y + ry, ey = Math.max(4, ry * 0.26);
      return `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(rx)}" ry="${r1(ry)}" fill="${base || 'none'}"${base ? ' fill-opacity=".88"' : ''} stroke="${c}" stroke-width="${sw}"/>${S(E(cx, cy, rx, ey, 'back'), 'none', hid + ' opacity="0.6"')}${base ? `<ellipse cx="${r1(cx - rx * 0.32)}" cy="${r1(cy - ry * 0.36)}" rx="${r1(rx * 0.3)}" ry="${r1(ry * 0.2)}" fill="#ffffff" opacity=".5" transform="rotate(-30 ${r1(cx - rx * 0.32)} ${r1(cy - ry * 0.36)})"/>` : ''}${S(E(cx, cy, rx, ey, 'front'))}`;
    }
    case 'pyr': {
      const dy = h * 0.22, A = [x + w * 0.5, y], FL = [x, y + h], FR = [x + w * 0.74, y + h], BR = [x + w, y + h - dy], BL = [x + w * 0.26, y + h - dy];
      return `${S(`M${P2(...BL)}L${P2(...FL)}M${P2(...BL)}L${P2(...BR)}M${P2(...BL)}L${P2(...A)}`, 'none', hid + ' opacity="0.75"')}${S(polyD([A, FR, BR]), base ? dark : 'none')}${S(polyD([A, FL, FR]), base || 'none')}`;
    }
    default: return '';
  }
}

// ---------- Vérification des données (une sauvegarde importée ne peut rien injecter) ----------
const SAFE_C = /^(#[0-9a-f]{3,8}|transparent|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(,\s*[\d.]+\s*)?\))$/i;
const NUMS = ['x', 'y', 'w', 'h', 'w2', 'x1', 'y1', 'x2', 'y2', 's', 'size', 'o', 'round', 'dash', 'arrow', 'vol', 'frame', 'sh', 'bend'];
function safe(raw) {
  const it = { ...raw };
  for (const k of ['c', 'f', 'bg', 'tc', 'uc', 'fc']) if (it[k] != null && it[k] !== '' && !SAFE_C.test(String(it[k]))) it[k] = k === 'f' || k === 'bg' ? '' : '#131a2a';
  for (const k of NUMS) if (it[k] != null) it[k] = Number.isFinite(+it[k]) ? +it[k] : 0;
  it.id = String(it.id || '').replace(/[^\w-]/g, '');
  for (const k of ['a1', 'a2', 'g']) if (it[k] != null) it[k] = String(it[k]).replace(/[^\w-]/g, '');
  if (it.font && !FONTS[it.font]) it.font = 'sans';
  if (it.pt && !PENS.some(([k]) => k === it.pt)) it.pt = 'bille';
  if (it.al && !['left', 'center', 'right'].includes(it.al)) it.al = 'left';
  if (it.kind != null && !/^[a-z]{2,12}$/.test(it.kind)) it.kind = '';
  if (it.k != null && !KNOWN_K.includes(it.k)) it.k = 'rect';
  if (it.pts) it.pts = (Array.isArray(it.pts) ? it.pts : []).map((p) => (p[2] > 0 ? [+p[0] || 0, +p[1] || 0, Math.min(1, +p[2])] : [+p[0] || 0, +p[1] || 0]));
  if (it.rows) it.rows = (Array.isArray(it.rows) ? it.rows : []).slice(0, 60).map((r) => ({ t: String(r?.t || '').slice(0, 300), d: r?.d ? 1 : 0 }));
  return it;
}

const shadowAttr = (it) => (it.sh ? ' filter="url(#dw-shadow)"' : '');
// Trait droit ou courbe : la courbe passe par le milieu décalé de « bend » (perpendiculaire au trait)
export function lineGeo(it) {
  const mx = (it.x1 + it.x2) / 2, my = (it.y1 + it.y2) / 2;
  if (!it.bend) return { d: `M${it.x1} ${it.y1}L${it.x2} ${it.y2}`, cx: mx, cy: my, qx: null, qy: null };
  const dx = it.x2 - it.x1, dy = it.y2 - it.y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const qx = r1(mx + nx * it.bend * 2), qy = r1(my + ny * it.bend * 2);
  return { d: `M${it.x1} ${it.y1}Q${qx} ${qy} ${it.x2} ${it.y2}`, cx: r1(mx + nx * it.bend), cy: r1(my + ny * it.bend), qx, qy };
}
// Point d'accroche d'une flèche sur le bord d'un élément, en direction d'un autre point
const BINDABLE = ['rect', 'ellipse', 'shape', 'poly', 'text', 'sticky', 'bubble', 'list', 'check', 'stamp', 'chart', 'timeline'];
function anchor(target, toward, gap = 7) {
  const b = bbox(target), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  let dx = toward[0] - cx, dy = toward[1] - cy;
  const L = Math.hypot(dx, dy); if (L < 1) return [r1(cx), r1(cy)];
  let k;
  if (target.t === 'ellipse') k = 1 / Math.sqrt((dx * dx) / ((b.w / 2) ** 2 || 1) + (dy * dy) / ((b.h / 2) ** 2 || 1));
  else k = Math.min(dx ? (b.w / 2) / Math.abs(dx) : Infinity, dy ? (b.h / 2) / Math.abs(dy) : Infinity);
  return [r1(cx + dx * k + (dx / L) * gap), r1(cy + dy * k + (dy / L) * gap)];
}
const centerOf = (it) => { const b = bbox(it); return [b.x + b.w / 2, b.y + b.h / 2]; };
// Recalcule les extrémités des flèches accrochées (tableau ouvert, miniatures, export)
export function settle(list) {
  const by = new Map(list.map((x) => [x.id, x]));
  for (const it of list) {
    if (it.t !== 'line' || !(it.a1 || it.a2)) continue;
    const A = it.a1 && by.get(it.a1), B = it.a2 && by.get(it.a2);
    if (it.a1 && !A) delete it.a1; if (it.a2 && !B) delete it.a2;
    const g = lineGeo(it);
    const towardA = it.bend ? [g.qx, g.qy] : B ? centerOf(B) : [it.x2, it.y2];
    const towardB = it.bend ? [g.qx, g.qy] : A ? centerOf(A) : [it.x1, it.y1];
    if (A) [it.x1, it.y1] = anchor(A, towardA);
    if (B) [it.x2, it.y2] = anchor(B, towardB);
  }
  return list;
}
export function renderItem(raw) {
  const it = safe(raw);
  const hit = (inner) => `<g class="dw-i${it.hw ? ' is-hw' : ''}" data-id="${it.id}"${shadowAttr(it)}>${inner}</g>`;
  switch (it.t) {
    case 'pen': {
      const pts = it.pts || [];
      if (!pts.length) return '';
      if (it.hl) { const d = smoothPath(pts); return hit(`<path d="${d}" fill="none" stroke="transparent" stroke-width="${(it.w || 18) + 10}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${it.c}" stroke-width="${it.w}" stroke-linecap="round" stroke-linejoin="round" opacity="${it.o ?? 0.5}" style="mix-blend-mode:multiply"/>`); }
      const d = inkPath(pts, it.w || 3, it.pt);
      return hit(`<path d="${smoothPath(pts)}" fill="none" stroke="transparent" stroke-width="${(it.w || 3) + 16}" stroke-linecap="round"/><path d="${d}" fill="${it.c}" opacity="${it.o ?? 1}"/>`);
    }
    case 'line': {
      const dash = it.dash ? ` stroke-dasharray="${it.w * 3} ${it.w * 2.4}"` : '';
      const g = lineGeo(it);
      return hit(`<path d="${g.d}" fill="none" stroke="transparent" stroke-width="${it.w + 16}"/><path d="${g.d}" fill="none" stroke="${it.c}" stroke-width="${it.w}" stroke-linecap="round"${dash}/>${it.arrow ? head(g.qx ?? it.x1, g.qy ?? it.y1, it.x2, it.y2, it.w, it.c) : ''}${it.arrow === 2 ? head(g.qx ?? it.x2, g.qy ?? it.y2, it.x1, it.y1, it.w, it.c) : ''}`);
    }
    case 'poly': {
      const pts = it.pts || []; if (pts.length < 2) return '';
      return hit(`<path d="${polyD(pts, !!it.closed)}" fill="${it.f || (it.closed ? 'transparent' : 'none')}" stroke="${it.c}" stroke-width="${it.w}" stroke-linejoin="round" stroke-linecap="round"${it.dash ? ` stroke-dasharray="${it.w * 3} ${it.w * 2.4}"` : ''}/>`);
    }
    case 'rect': case 'ellipse': {
      const dash = it.dash ? ` stroke-dasharray="${it.w * 3} ${it.w * 2.4}"` : '';
      const common = `fill="${it.f || 'transparent'}" stroke="${it.c}" stroke-width="${it.w}"${dash}`;
      const shape = it.t === 'rect' ? `<rect x="${it.x}" y="${it.y}" width="${Math.max(1, it.w2)}" height="${Math.max(1, it.h)}" rx="${it.round ?? 8}" ${common}/>` : `<ellipse cx="${r1(it.x + it.w2 / 2)}" cy="${r1(it.y + it.h / 2)}" rx="${Math.max(1, it.w2 / 2)}" ry="${Math.max(1, it.h / 2)}" ${common}/>`;
      return hit(`${shape}${it.txt || it.html ? fo({ ...it, c: it.tc || '#131a2a', frame: 0, bg: '' }, it.x + 8, it.y + 8, it.w2 - 16, it.h - 16, 'display:flex;align-items:center;justify-content:center;text-align:center;height:100%;') : ''}`);
    }
    case 'shape': return hit(`<rect x="${it.x}" y="${it.y}" width="${Math.max(1, it.w2)}" height="${Math.max(1, it.h)}" fill="transparent"/>${shapeSvg(it)}${it.txt || it.html ? fo({ ...it, c: it.tc || '#131a2a', frame: 0, bg: '' }, it.x + 8, it.y + it.h * 0.25, it.w2 - 16, it.h * 0.6, 'display:flex;align-items:center;justify-content:center;text-align:center;height:100%;') : ''}`);
    case 'text': return hit(`<rect x="${it.x}" y="${it.y}" width="${it.w2}" height="${it.h}" fill="transparent"/>${fo(it, it.x, it.y, it.w2, it.h)}`);
    case 'sticky': return hit(`<rect x="${it.x + 3}" y="${it.y + 5}" width="${it.w2}" height="${it.h}" rx="4" fill="rgba(15,30,61,.12)"/><rect x="${it.x}" y="${it.y}" width="${it.w2}" height="${it.h}" rx="4" fill="${it.f || '#fff3bf'}"/>${fo({ ...it, c: it.c || '#131a2a' }, it.x + 12, it.y + 12, it.w2 - 24, it.h - 24)}`);
    case 'bubble': {
      const { x, y, w2: w, h } = it, R = 14, tx = x + Math.min(48, w * 0.25);
      const d = `M${x + R} ${y}H${x + w - R}Q${x + w} ${y} ${x + w} ${y + R}V${y + h - R}Q${x + w} ${y + h} ${x + w - R} ${y + h}H${tx + 26}L${tx} ${y + h + 22}L${tx + 6} ${y + h}H${x + R}Q${x} ${y + h} ${x} ${y + h - R}V${y + R}Q${x} ${y} ${x + R} ${y}Z`;
      return hit(`<path d="${d}" fill="${it.f || '#ffffff'}" stroke="${it.c || '#131a2a'}" stroke-width="2.2" stroke-linejoin="round"/>${fo({ ...it, frame: 0, bg: '' }, x + 14, y + 10, w - 28, h - 20)}`);
    }
    case 'check': {
      const s = it.s || 28;
      return hit(`<g transform="translate(${it.x} ${it.y})"><rect width="${s}" height="${s}" rx="${s * 0.22}" fill="${it.done ? it.c : '#ffffff'}" stroke="${it.c}" stroke-width="2.4"/>${it.done ? STAMPS.check(s, '#ffffff') : ''}</g>${it.txt ? fo({ ...it, c: '#131a2a', size: it.size || 18, frame: 0, bg: '', u: 0 }, it.x + s + 10, it.y - 2, it.w2 || 220, s + 8, `${it.done ? 'text-decoration:line-through;color:#676d7e;' : ''}`) : ''}`);
    }
    case 'list': {
      const size = it.size || 20, lh = Math.round(size * 1.7), s = Math.round(size * 1.05), c = it.c || '#1baf7a';
      const rows = it.rows?.length ? it.rows : [{ t: '', d: 0 }];
      let out = `<rect x="${it.x}" y="${it.y}" width="${it.w2}" height="${rows.length * lh}" fill="transparent"/>`;
      rows.forEach((r, i) => {
        const by = it.y + i * lh + (lh - s) / 2;
        out += `<g class="dw-tick" data-row="${i}"><rect x="${it.x}" y="${r1(by)}" width="${s}" height="${s}" rx="${r1(s * 0.24)}" fill="${r.d ? c : '#ffffff'}" stroke="${c}" stroke-width="2.2"/>${r.d ? `<g transform="translate(${it.x} ${r1(by)})">${STAMPS.check(s, '#ffffff')}</g>` : ''}</g>`;
        out += fo({ ...it, c: r.d ? '#868e96' : '#131a2a', frame: 0, bg: '', txt: r.t || (rows.length === 1 && !r.t ? '' : ''), html: '' }, it.x + s + 10, it.y + i * lh, it.w2 - s - 10, lh, `line-height:${lh}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${r.d ? 'text-decoration:line-through;' : ''}`);
      });
      return hit(out);
    }
    case 'stamp': return hit(`<g transform="translate(${it.x} ${it.y})"><rect width="${it.s}" height="${it.s}" fill="transparent"/>${(Object.hasOwn(STAMPS, it.kind) ? STAMPS[it.kind] : STAMPS.check)(it.s, it.c)}</g>`);
    case 'chart': return hit(chartSvg({ ...it, w: it.w2 }));
    case 'timeline': return hit(`<rect x="${it.x}" y="${it.y}" width="${it.w2}" height="${it.h}" fill="transparent"/>${timelineSvg({ ...it, w: it.w2 })}`);
    default: return '';
  }
}
const listH = (it) => Math.round((it.size || 20) * 1.7) * Math.max(1, it.rows?.length || 1);
// Boîte englobante (coordonnées du monde)
export function bbox(it) {
  if (it.t === 'pen' || it.t === 'poly') { const pts = it.pts || [[0, 0]]; const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); const m = (it.w || 3) / 2; return { x: Math.min(...xs) - m, y: Math.min(...ys) - m, w: Math.max(...xs) - Math.min(...xs) + m * 2, h: Math.max(...ys) - Math.min(...ys) + m * 2 }; }
  if (it.t === 'line') { const g = lineGeo(it); const xs = [it.x1, it.x2, g.cx], ys = [it.y1, it.y2, g.cy]; const x = Math.min(...xs), y = Math.min(...ys); return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }; }
  if (it.t === 'check') return { x: it.x, y: it.y, w: (it.s || 28) + (it.txt ? 10 + (it.w2 || 220) : 0), h: it.s || 28 };
  if (it.t === 'stamp') return { x: it.x, y: it.y, w: it.s, h: it.s };
  if (it.t === 'bubble') return { x: it.x, y: it.y, w: it.w2, h: it.h + 22 };
  if (it.t === 'list') return { x: it.x, y: it.y, w: it.w2, h: listH(it) };
  return { x: it.x, y: it.y, w: it.w2, h: it.h };
}
export function itemsBox(items) {
  if (!items.length) return { x: 0, y: 0, w: 800, h: 500 };
  const bs = items.map(bbox);
  const x = Math.min(...bs.map((b) => b.x)), y = Math.min(...bs.map((b) => b.y));
  return { x, y, w: Math.max(...bs.map((b) => b.x + b.w)) - x, h: Math.max(...bs.map((b) => b.y + b.h)) - y };
}
function moveItem(it, dx, dy) {
  if (it.t === 'pen' || it.t === 'poly') it.pts = it.pts.map((p) => [r1(p[0] + dx), r1(p[1] + dy), ...(p.length > 2 ? [p[2]] : [])]);
  else if (it.t === 'line') { it.x1 = r1(it.x1 + dx); it.y1 = r1(it.y1 + dy); it.x2 = r1(it.x2 + dx); it.y2 = r1(it.y2 + dy); }
  else { it.x = r1(it.x + dx); it.y = r1(it.y + dy); }
}
// Redimensionner d'après l'ancienne boîte et la nouvelle
function scaleItem(it, o, from, to) {
  const sx = to.w / Math.max(1, from.w), sy = to.h / Math.max(1, from.h);
  const X = (x) => r1(to.x + (x - from.x) * sx), Y = (y) => r1(to.y + (y - from.y) * sy);
  if (it.t === 'pen' || it.t === 'poly') it.pts = o.pts.map((p) => [X(p[0]), Y(p[1]), ...(p.length > 2 ? [p[2]] : [])]);
  else if (it.t === 'line') { it.x1 = X(o.x1); it.y1 = Y(o.y1); it.x2 = X(o.x2); it.y2 = Y(o.y2); }
  else if (it.t === 'check' || it.t === 'stamp') { it.x = X(o.x); it.y = Y(o.y); it.s = Math.max(14, r1((o.s || 28) * Math.min(sx, sy))); }
  else if (it.t === 'list') { it.x = X(o.x); it.y = Y(o.y); it.w2 = Math.max(80, r1(o.w2 * sx)); it.size = Math.max(10, Math.min(72, r1((o.size || 20) * sy))); }
  else { it.x = X(o.x); it.y = Y(o.y); it.w2 = Math.max(20, r1(o.w2 * sx)); it.h = Math.max(it.t === 'timeline' ? 120 : 20, r1(o.h * sy)); }
}

// ---------- Formes parfaites : un trait tenu à la fin est remplacé par la forme reconnue ----------
function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  let md = 0, mi = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = L < 1e-6 ? Math.hypot(pts[i][0] - a[0], pts[i][1] - a[1]) : Math.abs((b[0] - a[0]) * (a[1] - pts[i][1]) - (a[0] - pts[i][0]) * (b[1] - a[1])) / L;
    if (d > md) { md = d; mi = i; }
  }
  if (md <= eps) return [a, b];
  return [...simplify(pts.slice(0, mi + 1), eps).slice(0, -1), ...simplify(pts.slice(mi), eps)];
}
export function snapShape(pts) {
  if (pts.length < 4) return null;
  let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const [x0, y0] = pts[0], [xn, yn] = pts[pts.length - 1];
  const chord = Math.hypot(xn - x0, yn - y0);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const b = { x: Math.min(...xs), y: Math.min(...ys) }; b.w = Math.max(...xs) - b.x; b.h = Math.max(...ys) - b.y;
  const size = Math.max(b.w, b.h);
  if (size < 12) return null;
  if (chord / L > 0.9) {
    // Trait droit : horizontal ou vertical s'il en est proche
    let [ax, ay, bx, by] = [x0, y0, xn, yn];
    const ang = Math.atan2(by - ay, bx - ax), deg = Math.abs((ang * 180) / Math.PI) % 180;
    if (deg < 7 || deg > 173) by = ay = (ay + by) / 2; else if (Math.abs(deg - 90) < 7) bx = ax = (ax + bx) / 2;
    return { kind: 'line', x1: r1(ax), y1: r1(ay), x2: r1(bx), y2: r1(by) };
  }
  const closed = Math.hypot(xn - x0, yn - y0) < Math.max(size * 0.28, L * 0.12);
  if (!closed) return null;
  const ring = [...pts, pts[0]];
  const poly = simplify(ring, size * 0.09);
  let corners = poly.slice(0, -1);
  // Coins presque alignés retirés
  corners = corners.filter((p, i) => { const a = corners[(i - 1 + corners.length) % corners.length], c = corners[(i + 1) % corners.length]; const v1 = [p[0] - a[0], p[1] - a[1]], v2 = [c[0] - p[0], c[1] - p[1]]; const cos = (v1[0] * v2[0] + v1[1] * v2[1]) / ((Math.hypot(...v1) * Math.hypot(...v2)) || 1); return cos < 0.94; });
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2, rx = b.w / 2 || 1, ry = b.h / 2 || 1;
  const eErr = pts.reduce((s, [x, y]) => s + Math.abs(Math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2) - 1), 0) / pts.length;
  if (corners.length === 3) return { kind: 'poly', pts: corners.map(([x, y]) => [r1(x), r1(y)]) };
  if (corners.length === 4) {
    const axis = corners.every(([x, y]) => (Math.abs(x - b.x) < size * 0.14 || Math.abs(x - b.x - b.w) < size * 0.14) && (Math.abs(y - b.y) < size * 0.14 || Math.abs(y - b.y - b.h) < size * 0.14));
    if (axis) { const sq = Math.abs(b.w - b.h) < size * 0.12; const s = (b.w + b.h) / 2; return { kind: 'rect', x: r1(b.x), y: r1(b.y), w2: r1(sq ? s : b.w), h: r1(sq ? s : b.h) }; }
    return { kind: 'poly', pts: corners.map(([x, y]) => [r1(x), r1(y)]) };
  }
  if (eErr < 0.16) { const round = Math.abs(b.w - b.h) < size * 0.14; const s = (b.w + b.h) / 2; return { kind: 'ellipse', x: r1(round ? cx - s / 2 : b.x), y: r1(round ? cy - s / 2 : b.y), w2: r1(round ? s : b.w), h: r1(round ? s : b.h) }; }
  if (corners.length === 5 || corners.length === 6) return { kind: 'poly', pts: corners.map(([x, y]) => [r1(x), r1(y)]) };
  return null;
}

// ---------- Lecture de l'écriture (fil séparé si possible) ----------
// Moteur précis (TrOCR, installé une fois sur l'appareil) ; sinon moteur simple. Rien ne quitte l'appareil.
let worker = null, wseq = 0;
let clip = null; // presse-papiers du tableau blanc (partagé entre tableaux)
const waiting = new Map();
function hwrWorker() {
  if (worker !== null) return worker;
  try {
    worker = new Worker(new URL('./hwr-worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const w = waiting.get(e.data.id); if (!w) return;
      if (e.data.progress != null && !('r' in e.data) && !e.data.error) { w.onProgress?.(e.data.progress, e.data.loaded); return; }
      waiting.delete(e.data.id); if (e.data.error) w.rej(new Error(e.data.error)); else w.res(e.data.r);
    };
    worker.onerror = () => { worker = false; for (const w of waiting.values()) w.rej(new Error('worker')); waiting.clear(); };
  } catch (e) { worker = false; }
  return worker;
}
const ask = (msg, onProgress) => new Promise((res, rej) => { const w = hwrWorker(); if (!w) { rej(new Error('worker')); return; } const id = ++wseq; waiting.set(id, { res, rej, onProgress }); w.postMessage({ id, ...msg }); });
const OCR_KEY = 'msdev:ocr';
export const ocrReady = () => { try { return localStorage.getItem(OCR_KEY) === '1'; } catch (e) { return false; } };
let installing = null;
export function installOCR(onProgress) {
  if (!installing) {
    installing = ask({ kind: 'install' }, onProgress).then(() => { try { localStorage.setItem(OCR_KEY, '1'); } catch (e) { /* préférence locale */ } return true; });
    installing.catch(() => { installing = null; });
  } else if (onProgress) { for (const w of waiting.values()) if (!w.onProgress) w.onProgress = onProgress; }
  return installing;
}
export const ocrInstalling = () => !!installing && !ocrReady();
// Une ligne d'écriture en image : traits noirs, épaisseur proportionnée à la hauteur d'x
function inkImage(strokes, xh) {
  const pts = strokes.flat();
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const [x, y] of pts) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  const h = Math.max(8, maxy - miny), pad = h * 0.25;
  const sc = 64 / h;
  const c = document.createElement('canvas');
  c.width = Math.min(2400, Math.ceil((maxx - minx + pad * 2) * sc)); c.height = Math.ceil((h + pad * 2) * sc);
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#000'; g.lineCap = g.lineJoin = 'round';
  g.lineWidth = Math.max(2.4, Math.min(5, (xh || h * 0.45) * sc * 0.115));
  for (const s of strokes) {
    g.beginPath();
    s.forEach(([x, y], i) => { const X = (x - minx + pad) * sc, Y = (y - miny + pad) * sc; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); });
    if (s.length === 1) g.lineTo((s[0][0] - minx + pad) * sc + 0.5, (s[0][1] - miny + pad) * sc);
    g.stroke();
  }
  const d = g.getImageData(0, 0, c.width, c.height);
  return { data: d.data.buffer, w: c.width, h: c.height };
}
// Une longue ligne est coupée aux grands espaces (le modèle lit mieux des morceaux courts)
function chunks(strokes, xh) {
  const items = strokes.map((s) => { const xs = s.map((p) => p[0]); return { s, l: Math.min(...xs), r: Math.max(...xs) }; }).sort((a, b) => a.l - b.l);
  const ys = strokes.flat().map((p) => p[1]); const H = Math.max(...ys) - Math.min(...ys) || 1;
  const out = []; let cur = [], right = -Infinity, left = 0;
  for (const it of items) {
    const gap = it.l - right;
    if (cur.length && gap > xh * 0.7 && (right - left) / H > 7) { out.push(cur); cur = []; }
    if (!cur.length) left = it.l;
    cur.push(it.s); right = Math.max(right, it.r);
  }
  if (cur.length) out.push(cur);
  return out;
}
export async function readInk(strokes, words = []) {
  const H = await import('./hwr.js');
  if (await H.hasNative()) return H.recognize(strokes, { words });
  if (ocrReady()) {
    try {
      const lines = H.splitLines(strokes);
      const parts = [];
      for (const ls of lines) { const { xh } = H.lineMetrics(ls); parts.push(chunks(ls, xh).map((c) => inkImage(c, xh))); }
      const flat = parts.flat();
      const r = await ask({ kind: 'ocr', lines: flat, words });
      // Morceaux d'une même ligne : réunis avec un espace, lignes séparées par un retour
      if (flat.length > 1 && parts.some((p) => p.length > 1)) {
        const t = r.text.split('\n'); let k = 0;
        r.text = parts.map((p) => t.slice(k, k += p.length).join(' ')).join('\n'); r.alts = [r.text];
      }
      return { ...r, ...H.lineMetrics(lines[0]) };
    } catch (e) { /* moteur simple */ }
  }
  try { const r = await ask({ strokes, words }); return { ...r, simple: 1 }; } catch (e) { /* lecture directe */ }
  return { ...(await H.recognize(strokes, { words, local: true })), simple: 1 };
}
export function warmInk() { if (ocrReady()) installOCR(); else { const w = hwrWorker(); if (w) w.postMessage({ id: 0, warm: 1 }); } }
// Proportions d'une police (pour poser le texte à la hauteur de l'écriture)
const metricCache = {};
async function fontMetrics(key) {
  if (metricCache[key]) return metricCache[key];
  const fam = fontOf(key);
  try { await document.fonts?.load(`40px ${fam}`); } catch (e) { /* police système */ }
  const c = document.createElement('canvas').getContext('2d');
  c.font = `100px ${fam}`;
  const m = c.measureText('xhgé');
  const x = c.measureText('x').actualBoundingBoxAscent / 100 || 0.45;
  metricCache[key] = { x, asc: (m.fontBoundingBoxAscent || m.actualBoundingBoxAscent || 80) / 100, desc: (m.fontBoundingBoxDescent || 25) / 100 };
  return metricCache[key];
}

// ---------- Montage d'une zone de dessin ----------
// stage : élément qui reçoit le SVG ; tools : barre d'outils ; props : réglages de l'outil ; mode : 'board' ou 'overlay'
export function mountCanvas({ stage, tools, props, mode = 'board', items = [], cam = { x: 0, y: 0, z: 1 }, bg = 'dots', onChange, onEditData, onActive, onHistory, words, onLearn }) {
  let list = clone(items);
  let view = { ...cam };
  let tool = 'select';
  let sel = new Set();
  const style = clone(DEF);
  const undoS = [], redoS = [];
  let action = null, editing = null, space = false, active = mode === 'board', trayOpen = '';
  let pending = null; // écriture à la main en attente de lecture
  let lastPen = 0; // dernier contact au stylet (paume ignorée)
  const pointers = new Map();
  stage.innerHTML = `<svg class="dw-svg" xmlns="http://www.w3.org/2000/svg" tabindex="0" aria-label="${mode === 'board' ? 'Tableau blanc' : 'Dessin sur la page'}">
    <defs><pattern id="dw-dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.3" fill="#d9d2c4"/></pattern><pattern id="dw-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#e6e0d4" stroke-width="1"/></pattern><pattern id="dw-lines" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M0 31.5H32" fill="none" stroke="#dbe4ff" stroke-width="1.2"/></pattern><pattern id="dw-seyes" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M0 7.5H32M0 15.5H32M0 23.5H32" stroke="#e7ecfb" stroke-width="1"/><path d="M0 31.5H32" stroke="#b9c7f5" stroke-width="1.2"/><path d="M31.5 0V32" stroke="#f3d6db" stroke-width="1"/></pattern><filter id="dw-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#0f1e3d" flood-opacity=".18"/></filter></defs>
    <rect class="dw-bg" fill="${bg === 'blank' ? 'transparent' : `url(#dw-${String(bg).replace(/[^a-z]/g, '')})`}"/><g class="dw-items"></g><g class="dw-live"></g><g class="dw-guides"></g><g class="dw-selg"></g>
  </svg><div class="dw-selbar" hidden></div><div class="dw-pop" hidden></div><p class="dw-tip" aria-live="polite"></p>`;
  const svg = stage.querySelector('svg');
  const gItems = svg.querySelector('.dw-items'), gLive = svg.querySelector('.dw-live'), gSel = svg.querySelector('.dw-selg'), gGuides = svg.querySelector('.dw-guides'), bgRect = svg.querySelector('.dw-bg');
  const selbar = stage.querySelector('.dw-selbar'), pop = stage.querySelector('.dw-pop'), tip = stage.querySelector('.dw-tip');
  const emit = () => onChange?.(clone(list), { ...view });
  const history = () => onHistory?.({ undo: undoS.length > 0, redo: redoS.length > 0 });
  const snapshot = () => { undoS.push(JSON.stringify(list)); if (undoS.length > 100) undoS.shift(); redoS.length = 0; history(); };
  const byId = (id) => list.find((x) => x.id === id);
  const selected = () => list.filter((x) => sel.has(x.id));

  // ----- Vue -----
  const rect = () => svg.getBoundingClientRect();
  function fitView() {
    const r = rect();
    if (mode === 'overlay') view = { x: 0, y: 0, z: r.width / 1000 || 1 };
    const w = r.width / view.z, h = r.height / view.z;
    svg.setAttribute('viewBox', `${r1(view.x)} ${r1(view.y)} ${r1(w)} ${r1(h)}`);
    bgRect.setAttribute('x', view.x - 2); bgRect.setAttribute('y', view.y - 2); bgRect.setAttribute('width', w + 4); bgRect.setAttribute('height', h + 4);
    zoomLabel(); placeSelbar();
  }
  const toWorld = (cx, cy) => { const r = rect(); return [r1(view.x + (cx - r.left) / view.z), r1(view.y + (cy - r.top) / view.z)]; };
  const toScreen = (x, y) => { const r = rect(); return [r.left + (x - view.x) * view.z, r.top + (y - view.y) * view.z]; };
  function zoomAt(f, cx, cy) {
    const [wx, wy] = toWorld(cx, cy);
    view.z = Math.min(5, Math.max(0.1, view.z * f));
    const r = rect();
    view.x = wx - (cx - r.left) / view.z; view.y = wy - (cy - r.top) / view.z;
    fitView(); paintSel(); queueEmit();
  }

  // ----- Rendu -----
  // Flèches accrochées : elles suivent les éléments qu'elles relient
  const reroute = () => settle(list);
  // Élément sous le doigt auquel une flèche peut s'accrocher
  function bindTarget(cx, cy, exclude) {
    for (const el of document.elementsFromPoint(cx, cy)) {
      if (!gItems.contains(el)) continue;
      const id = el.closest('.dw-i')?.dataset.id; const it = id && id !== exclude && byId(id);
      if (it && BINDABLE.includes(it.t)) return it;
    }
    return null;
  }
  function showBind(it) {
    if (!it) { gGuides.innerHTML = ''; return; }
    const b = bbox(it), m = 6 / view.z;
    gGuides.innerHTML = `<rect class="dw-bind" x="${b.x - m}" y="${b.y - m}" width="${b.w + m * 2}" height="${b.h + m * 2}" rx="${10 / view.z}" stroke-width="${2.5 / view.z}"/>`;
  }
  function paint() { reroute(); gItems.innerHTML = list.map(renderItem).join(''); if (editing?.rich) gItems.querySelector(`[data-id="${editing.id}"]`)?.setAttribute('opacity', '0'); paintSel(); }
  function paintSel() {
    if (!sel.size || editing) { gSel.innerHTML = ''; selbarHtml(); return; }
    const its = selected();
    const k = 1 / view.z;
    let out = '';
    const handle = (h, x, y, shape = 'sq') => (shape === 'dot' ? `<circle class="dw-h" data-h="${h}" cx="${x}" cy="${y}" r="${8 * k}" stroke-width="${2 * k}"/>` : `<rect class="dw-h" data-h="${h}" x="${x - 7 * k}" y="${y - 7 * k}" width="${14 * k}" height="${14 * k}" rx="${4 * k}" stroke-width="${2 * k}"/>`);
    if (its.length === 1 && its[0].t === 'line') {
      const it = its[0];
      const g = lineGeo(it);
      out = `<path d="${g.d}" class="dw-box" fill="none" stroke-width="${1.2 * k}" stroke-dasharray="${5 * k} ${4 * k}"/>` + handle('p1', it.x1, it.y1, 'dot') + handle('p2', it.x2, it.y2, 'dot') + `<circle class="dw-h is-bend" data-h="bend" cx="${g.cx}" cy="${g.cy}" r="${6.5 * k}" stroke-width="${2 * k}"/>`;
    } else {
      const b = itemsBox(its), m = 6 * k;
      out = `<rect class="dw-box" x="${b.x - m}" y="${b.y - m}" width="${b.w + m * 2}" height="${b.h + m * 2}" stroke-width="${1.5 * k}" stroke-dasharray="${5 * k} ${4 * k}"/>`;
      // Texte, liste, post-it : poignées latérales pour élargir sans déformer
      const sideOnly = its.length === 1 && ['text', 'list'].includes(its[0].t);
      const hs = sideOnly ? [['w', b.x - m, b.y + b.h / 2], ['e', b.x + b.w + m, b.y + b.h / 2], ['se', b.x + b.w + m, b.y + b.h + m]] : [['nw', b.x - m, b.y - m], ['ne', b.x + b.w + m, b.y - m], ['sw', b.x - m, b.y + b.h + m], ['se', b.x + b.w + m, b.y + b.h + m], ['e', b.x + b.w + m, b.y + b.h / 2], ['s', b.x + b.w / 2, b.y + b.h + m]];
      out += hs.map(([h, x, y]) => handle(h, x, y)).join('');
    }
    gSel.innerHTML = out;
    selbarHtml();
  }
  let emitT = 0;
  const queueEmit = () => { clearTimeout(emitT); emitT = setTimeout(emit, 250); };
  const commit = () => { paint(); emit(); history(); };

  // ----- Petites aides -----
  let tipT = 0;
  const seenTips = new Set();
  function showTip(text, ms = 4200) { if (!text) return; tip.textContent = text; tip.classList.add('is-on'); clearTimeout(tipT); tipT = setTimeout(() => tip.classList.remove('is-on'), ms); }
  const swatch = (key, c, cur, name, cls = '') => `<button type="button" class="dw-c ${String(cur) === c ? 'is-on' : ''} ${c === '' ? 'is-none' : ''} ${cls}" data-set="${key}" data-v="${c}" title="${name}" aria-label="${name}" aria-pressed="${String(cur) === c}" style="--c:${c || 'transparent'}"></button>`;
  const customColor = (key, cur) => `<label class="dw-c is-custom" title="Autre couleur" aria-label="Autre couleur"><input type="color" data-set="${key}" value="${/^#[0-9a-f]{6}$/i.test(cur || '') ? cur : '#155eef'}"></label>`;
  const swatches = (key, arr, cur, max = 99) => `<span class="dw-sw">${arr.slice(0, max).map(([c, n]) => swatch(key, c, cur, n)).join('')}${customColor(key, cur)}</span>`;
  const sizeDots = (key, arr, cur, c) => `<span class="dw-sw">${arr.map((w) => `<button type="button" class="dw-size ${Number(cur) === w ? 'is-on' : ''}" data-set="${key}" data-v="${w}" title="Épaisseur ${w}" aria-label="Épaisseur ${w}"><i style="width:${Math.min(22, 4 + w * 0.9)}px;height:${Math.min(22, 4 + w * 0.9)}px;background:${c || '#131a2a'}"></i></button>`).join('')}</span>`;
  const seg = (key, opts, cur) => `<span class="dw-seg">${opts.map(([v, l]) => `<button type="button" class="${String(cur) === String(v) ? 'is-on' : ''}" data-set="${key}" data-v="${v}">${l}</button>`).join('')}</span>`;
  // Choix de police : un bouton qui ouvre la bibliothèque, chaque nom écrit dans sa propre police
  const fontSel = (cur) => `<button type="button" class="dw-fontbtn" data-popup="font" title="Police" aria-label="Police : ${esc((FONTS[cur] || FONTS.sans)[0])}" style="font-family:${fontOf(cur)}"><span>${esc((FONTS[cur] || FONTS.sans)[0])}</span>${ic('chevD')}</button>`;
  const sizeSel = (cur) => `<span class="dw-num"><button type="button" data-step="size" data-v="-2" aria-label="Plus petit">${ic('minus')}</button><label><select data-set="size" aria-label="Taille du texte">${[12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 80, 96].map((s) => `<option value="${s}" ${Number(cur || 18) === s ? 'selected' : ''}>${s}</option>`).join('')}${[12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 80, 96].includes(Number(cur)) ? '' : `<option value="${cur}" selected>${cur}</option>`}</select></label><button type="button" data-step="size" data-v="2" aria-label="Plus grand">${ic('plus')}</button></span>`;
  const tog = (k, on, label, icon) => `<button type="button" class="dw-tog ${on ? 'is-on' : ''}" data-tog="${k}" title="${label}" aria-label="${label}" aria-pressed="${!!on}">${icon}</button>`;
  const sep = '<i class="dw-sep"></i>';
  const lbl = (t) => `<span class="dw-lbl">${t}</span>`;

  // ----- Barre d'outils -----
  function toolsBar() {
    if (!tools) return;
    const dock = DOCK.filter(([id]) => mode === 'board' || !['list'].includes(id));
    const inMore = MORE.some(([id]) => id === tool);
    tools.innerHTML = dock.map(([id, label, icon, key]) => `<button type="button" class="dw-tool ${tool === id ? 'is-on' : ''}" data-tool="${id}" title="${label} (${key})" aria-pressed="${tool === id}">${ic(icon)}<span>${label}</span></button>`).join('')
      + `<button type="button" class="dw-tool ${inMore || trayOpen === 'more' ? 'is-on' : ''}" data-tool="more" aria-expanded="${trayOpen === 'more'}" title="Bulle, souligner, tampon, graphique, frise…">${ic(inMore ? MORE.find(([id]) => id === tool)[2] : 'more')}<span>${inMore ? MORE.find(([id]) => id === tool)[1] : 'Plus'}</span></button>`;
  }
  // Réglages de l'outil choisi (couleur, épaisseur, police…)
  function trayHtml() {
    if (!props) return;
    const t = tool, st = style[t] || {};
    let html = '';
    if (trayOpen === 'more') {
      html = `<span class="dw-grid">${MORE.filter(([id]) => mode === 'board' || id !== 'hand').map(([id, label, icon]) => `<button type="button" class="dw-pick ${tool === id ? 'is-on' : ''}" data-tool="${id}">${ic(icon)}<span>${label}</span></button>`).join('')}</span>`;
    } else if (t === 'select') {
      const locked = list.some((x) => x.lock), clipN = getClip()?.length;
      html = `${seg('lasso', [[0, `${ic('cursor')}Cadre`], [1, `${ic('lasso')}Lasso`]], +style.select.lasso ? 1 : 0)}${clipN ? `${sep}<button type="button" class="dw-btn" data-cmd="paste">${ic('paste')}<span>Coller</span></button>` : ''}${locked ? `${sep}<button type="button" class="dw-btn" data-cmd="unlockall">${ic('unlock')}<span>Déverrouiller tout</span></button>` : ''}`;
    } else if (t === 'pen') html = `${seg('pt', PENS, st.pt || 'bille')}${sep}${swatches('c', INK, st.c, 9)}${sep}${sizeDots('w', [2, 3.5, 5, 8, 13], st.w, st.c)}`;
    else if (t === 'write') html = `${aiChip()}${sep}<span class="dw-fonts">${HAND_FONTS.map((k) => `<button type="button" class="dw-font ${st.font === k ? 'is-on' : ''}" data-set="font" data-v="${k}" style="font-family:${fontOf(k)};font-size:${{ hand: 25, cursive: 15, print: 18 }[k]}px" aria-pressed="${st.font === k}">Bonjour<small>${HAND_NICK[k]}</small></button>`).join('')}${fontSel(st.font)}</span>${sep}${swatches('c', INK, st.c, 6)}`;
    else if (t === 'highlighter') html = `${swatches('c', MARK, st.c)}${sep}${sizeDots('w', [10, 20, 32], st.w, st.c)}`;
    else if (t === 'underline') html = `${swatches('c', INK, st.c, 6)}${sep}${sizeDots('w', [2, 3, 5], st.w, st.c)}`;
    else if (t === 'eraser') html = `${seg('mode', [['precise', 'Précise'], ['object', 'Objet entier']], st.mode)}${sep}${seg('r', [[8, 'Fine'], [14, 'Moyenne'], [28, 'Large']], st.r)}`;
    else if (t === 'shape') {
      html = `<span class="dw-shapes">${SHAPES.map(([k, n], i) => `${i === 16 ? `<span class="dw-shapes-l">Traits</span>` : ''}<button type="button" class="dw-shp ${st.k === k ? 'is-on' : ''}" data-set="k" data-v="${k}" title="${n}" aria-label="${n}" aria-pressed="${st.k === k}"><svg viewBox="-4 -4 48 48" aria-hidden="true">${shapePreview(k)}</svg></button>`).join('')}</span>${sep}${lbl('Trait')}${swatches('c', INK, st.c, 6)}${sep}${lbl('Fond')}${swatches('f', FILLS, st.f || '', 7)}${sep}${sizeDots('w', [1.5, 2.5, 4, 6], st.w, st.c)}${tog('dash', st.dash, 'Pointillés', '┄')}${VOLUMES.includes(st.k) ? tog('vol', st.vol, 'Relief et ombres', ic('cube')) : ''}`;
    }
    else if (t === 'text') html = `${fontSel(st.font)}${sizeSel(st.size)}${sep}${swatches('c', INK, st.c, 6)}${sep}${tog('b', st.b, 'Gras', ic('bold'))}${tog('i', st.i, 'Italique', ic('italic'))}${tog('u', st.u, 'Souligné', ic('underline'))}${tog('frame', st.frame, 'Encadrer', ic('frame'))}`;
    else if (t === 'list') html = `${fontSel(st.font)}${sizeSel(st.size)}${sep}${swatches('c', [['#1baf7a', 'Vert'], ['#155eef', 'Bleu'], ['#d92d20', 'Rouge'], ['#f08c00', 'Orange'], ['#7048e8', 'Violet'], ['#131a2a', 'Encre']], st.c)}`;
    else if (t === 'sticky') html = `${swatches('f', FILLS.slice(2, 9), st.f)}${sep}${fontSel(st.font)}`;
    else if (t === 'bubble') html = `${swatches('c', INK, st.c, 6)}${sep}${lbl('Fond')}${swatches('f', FILLS.slice(1, 7), st.f)}`;
    else if (t === 'stamp') html = `<span class="dw-seg">${STAMP_KINDS.map(([k, n]) => `<button type="button" class="${st.kind === k ? 'is-on' : ''}" data-set="kind" data-v="${k}">${n}</button>`).join('')}</span>${sep}${swatches('c', INK, st.c, 6)}`;
    else if (t === 'chart') html = seg('kind', [['bar', 'Barres'], ['line', 'Courbe'], ['pie', 'Secteurs']], st.kind || 'bar');
    else if (t === 'timeline') html = swatches('c', INK, st.c, 6);
    props.innerHTML = html ? `<div class="dw-tray-in">${html}</div>` : '';
    props.hidden = !html;
  }
  function shapePreview(k) {
    if (k === 'line') return '<line x1="2" y1="38" x2="38" y2="2" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>';
    if (k === 'arrow' || k === 'darrow') return `<line x1="4" y1="36" x2="36" y2="4" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M22 4h14v14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${k === 'darrow' ? '<path d="M18 36H4V22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' : ''}`;
    if (k === 'rect') return '<rect x="3" y="3" width="34" height="34" rx="2" fill="none" stroke="currentColor" stroke-width="3"/>';
    if (k === 'rrect') return '<rect x="3" y="5" width="34" height="30" rx="9" fill="none" stroke="currentColor" stroke-width="3"/>';
    if (k === 'curve') return '<path d="M4 34Q6 6 34 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M24 1l10 5-8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
    if (k === 'ellipse') return '<circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="3"/>';
    return shapeSvg({ k, x: 2, y: 2, w2: 36, h: 36, c: 'currentColor', w: 2.6, f: VOLUMES.includes(k) ? '#dbe4ff' : '', vol: 1 }).replace(/stroke="currentColor"/g, 'stroke="currentColor"');
  }

  // ----- Barre de l'élément choisi : au-dessus de la sélection -----
  function selbarHtml() {
    const its = selected();
    if (!its.length || editing && !editing.rich) { if (!editing) { selbar.hidden = true; closePop(); } return; }
    const one = its.length === 1 ? its[0] : null;
    const t = editing ? byId(editing.id)?.t : one ? (one.t === 'pen' ? (one.hl ? 'highlighter' : 'pen') : one.t) : 'multi';
    const st = editing ? byId(editing.id) || {} : one || {};
    let html = '';
    const colorBtn = (key, label, cur, palette) => `<button type="button" class="dw-cbtn" data-popup="${key}" data-pal="${palette}" title="${label}" aria-label="${label}"><i style="--c:${cur || 'transparent'}" class="${cur ? '' : 'is-none'}"></i><span>${label}</span></button>`;
    if (one?.hw && !editing) html += `<span class="dw-hw">${ic('magic')}<span class="dw-hw-l">Lu :</span>${(one.hw.alts || []).slice(0, 4).map((a, i) => `<button type="button" class="dw-alt ${i === 0 && a === one.txt ? 'is-on' : a === one.txt ? 'is-on' : ''}" data-alt="${i}">${esc(a)}</button>`).join('')}<button type="button" class="dw-alt is-edit" data-cmd="edit">${ic('edit')}Corriger</button><button type="button" class="dw-alt" data-cmd="ink" title="Remettre mon écriture">${ic('undo')}Mon écriture</button></span>${sep}`;
    if (['pen', 'underline', 'line'].includes(t)) html += (t === 'pen' ? seg('pt', PENS, st.pt || 'bille') : '') + colorBtn('c', 'Couleur', st.c, 'ink') + sizeDots('w', [2, 3.5, 5, 8, 13], st.w, st.c);
    else if (t === 'highlighter') html += colorBtn('c', 'Couleur', st.c, 'mark') + sizeDots('w', [10, 20, 32], st.w, st.c);
    else if (['rect', 'ellipse', 'shape', 'poly'].includes(t)) html += colorBtn('c', 'Trait', st.c, 'ink') + colorBtn('f', 'Fond', st.f || '', 'fill') + sizeDots('w', [1.5, 2.5, 4, 6], st.w, st.c) + tog('dash', st.dash, 'Pointillés', '┄') + (t === 'shape' && VOLUMES.includes(st.k) ? tog('vol', st.vol, 'Relief', ic('cube')) : '') + tog('sh', st.sh, 'Ombre', ic('shadow'));
    else if (['text', 'sticky', 'bubble'].includes(t)) {
      html += `${fontSel(st.font)}${sizeSel(st.size)}${colorBtn('c', 'Couleur', st.c, 'ink')}${tog('b', st.b, 'Gras', ic('bold'))}${tog('i', st.i, 'Italique', ic('italic'))}${tog('u', st.u, 'Souligné', ic('underline'))}${tog('s', st.s, 'Barré', ic('strike'))}`;
      if (t === 'text') html += `${colorBtn('bg', 'Surligner', st.bg || '', 'mark0')}${tog('bul', /^• /.test(st.txt || ''), 'Liste à puces', ic('bullets'))}${tog('al', st.al && st.al !== 'left', 'Alignement', ic('align'))}${tog('frame', st.frame, 'Encadrer', ic('frame'))}${st.frame ? colorBtn('fc', 'Cadre', st.fc || st.c, 'ink') : ''}${tog('sh', st.sh, 'Ombre', ic('shadow'))}`;
      else if (t === 'sticky') html += colorBtn('f', 'Papier', st.f, 'sticky');
      else html += colorBtn('f', 'Fond', st.f, 'fill');
    }
    else if (t === 'list') html += `${fontSel(st.font)}${sizeSel(st.size)}${colorBtn('c', 'Cases', st.c, 'ink')}<button type="button" class="dw-btn" data-cmd="edit">${ic('edit')}<span>Modifier</span></button><button type="button" class="dw-btn" data-cmd="rowadd">${ic('plus')}<span>Case</span></button>`;
    else if (t === 'check') html += colorBtn('c', 'Couleur', st.c, 'ink');
    else if (t === 'stamp') html += `<span class="dw-seg">${STAMP_KINDS.map(([k, n]) => `<button type="button" class="${st.kind === k ? 'is-on' : ''}" data-set="kind" data-v="${k}">${n.split(' ')[0]}</button>`).join('')}</span>${colorBtn('c', 'Couleur', st.c, 'ink')}`;
    else if (t === 'chart' || t === 'timeline') html += `<button type="button" class="dw-btn" data-cmd="data">${ic('edit')}<span>Données</span></button>${t === 'chart' ? seg('kind', [['bar', 'Barres'], ['line', 'Courbe'], ['pie', 'Secteurs']], st.kind || 'bar') : colorBtn('c', 'Couleur', st.c, 'ink')}`;
    else if (t === 'multi') {
      // Plusieurs éléments : aligner, répartir, grouper
      const grouped = its.every((x) => x.g && x.g === its[0].g);
      html += `<span class="dw-lbl">${its.length} éléments</span>${colorBtn('c', 'Couleur', '', 'ink')}${sep}${[['al-l', 'alL', 'Aligner à gauche'], ['al-c', 'alCx', 'Centrer'], ['al-r', 'alR', 'Aligner à droite'], ['al-t', 'alT', 'Aligner en haut'], ['al-m', 'alCy', 'Centrer verticalement'], ['al-b', 'alB', 'Aligner en bas']].map(([c, i, l]) => `<button type="button" class="dw-tog" data-cmd="${c}" title="${l}" aria-label="${l}">${ic(i)}</button>`).join('')}${its.length > 2 ? `<button type="button" class="dw-tog" data-cmd="dist-h" title="Répartir horizontalement" aria-label="Répartir horizontalement">${ic('distH')}</button><button type="button" class="dw-tog" data-cmd="dist-v" title="Répartir verticalement" aria-label="Répartir verticalement">${ic('distV')}</button>` : ''}${sep}<button type="button" class="dw-btn" data-cmd="${grouped ? 'ungroup' : 'group'}">${ic('group')}<span>${grouped ? 'Dégrouper' : 'Grouper'}</span></button>`;
    }
    if (!editing) html += `${sep}<button type="button" class="dw-tog" data-cmd="copy" title="Copier (Ctrl C)" aria-label="Copier">${ic('paste')}</button><button type="button" class="dw-tog" data-cmd="lock" title="Verrouiller : l'élément ne bouge plus" aria-label="Verrouiller">${ic('lock')}</button><button type="button" class="dw-tog" data-cmd="front" title="Devant" aria-label="Mettre devant">${ic('layers')}</button><button type="button" class="dw-tog" data-cmd="dup" title="Dupliquer (Ctrl D)" aria-label="Dupliquer">${ic('copy')}</button><button type="button" class="dw-tog is-danger" data-cmd="del" title="Supprimer (Suppr)" aria-label="Supprimer">${ic('trash')}</button>`;
    else html += `${sep}<button type="button" class="dw-btn is-primary" data-cmd="done">${ic('check')}<span>OK</span></button>`;
    selbar.innerHTML = `<div class="dw-selbar-in">${html}</div>`;
    selbar.hidden = false;
    placeSelbar();
  }
  function placeSelbar() {
    if (selbar.hidden) return;
    const its = editing ? [byId(editing.id)].filter(Boolean) : selected();
    if (!its.length) return;
    const sr = stage.getBoundingClientRect();
    const b = itemsBox(its);
    const [x1, y1] = toScreen(b.x, b.y), [x2, y2] = toScreen(b.x + b.w, b.y + b.h);
    const bw = selbar.offsetWidth, bh = selbar.offsetHeight;
    const narrow = sr.width < 560;
    let left = narrow ? 8 : Math.min(Math.max(8, (x1 + x2) / 2 - sr.left - bw / 2), sr.width - bw - 8);
    let top = y1 - sr.top - bh - 14;
    if (top < 8) top = Math.min(y2 - sr.top + 18, sr.height - bh - 8);
    if (narrow) top = 8;
    selbar.style.left = `${Math.max(8, left)}px`; selbar.style.top = `${Math.max(8, top)}px`;
  }
  // Palette de couleurs en fenêtre
  function openPop(btn) {
    const key = btn.dataset.popup, pal = btn.dataset.pal;
    const its = editing ? [byId(editing.id)] : selected();
    const cur = its[0]?.[key] || '';
    const arr = { ink: INK, mark: MARK, mark0: [['', 'Aucun'], ...MARK], fill: FILLS, sticky: FILLS.slice(2, 9) }[pal] || INK;
    if (key === 'font') {
      // Bibliothèque de polices, rangée par familles ; l'écriture à la main d'abord pour l'outil Écriture
      const curF = cur || style[tool]?.font || 'sans';
      const groups = FONT_GROUPS;
      pop.innerHTML = `<div class="dw-pop-in dw-fontpop"><p>Police</p>${groups.map((g) => `<div class="dw-fg"><span>${g}</span>${Object.entries(FONTS).filter(([, v]) => v[3] === g).map(([k, v]) => `<button type="button" class="dw-fo ${k === curF ? 'is-on' : ''}" data-set="font" data-v="${k}" style="font-family:${v[1]}">${esc(v[0])}</button>`).join('')}</div>`).join('')}</div>`;
    } else pop.innerHTML = `<div class="dw-pop-in"><p>${esc(btn.title)}</p><span class="dw-sw is-grid">${arr.map(([c, n]) => swatch(key, c, cur, n)).join('')}${customColor(key, cur)}</span></div>`;
    pop.hidden = false;
    const sr = stage.getBoundingClientRect(), br = btn.getBoundingClientRect();
    pop.style.left = `${Math.max(8, Math.min(br.left - sr.left, sr.width - pop.offsetWidth - 8))}px`;
    pop.style.top = `${br.bottom - sr.top + 8 + pop.offsetHeight > sr.height ? br.top - sr.top - pop.offsetHeight - 8 : br.bottom - sr.top + 8}px`;
  }
  function closePop() { pop.hidden = true; pop.innerHTML = ''; }

  // ----- Modifier les réglages -----
  function applyProp(k, v) {
    const its = editing ? [byId(editing.id)].filter(Boolean) : selected();
    const num = ['w', 'size', 'r'].includes(k);
    if (editing?.rich) { const e0 = byId(editing.id); if (e0) { const h0 = clean(editing.el.innerHTML).replace(/(<br>)+$/, ''); e0.txt = (editing.el.innerText || '').replace(/\s+$/, ''); if (/<(b|i|u|s|span|mark|sub|sup)\b/.test(h0)) e0.html = h0; else delete e0.html; } }
    const val = num ? Number(v) : v;
    if (editing?.rich && editing.el && ['c', 'bg', 'font', 'size'].includes(k) && hasRange()) {
      // Texte sélectionné dans le cadre : mise en forme du passage seulement
      restoreRange();
      document.execCommand('styleWithCSS', false, true);
      if (k === 'c') document.execCommand('foreColor', false, v);
      if (k === 'bg') document.execCommand('hiliteColor', false, v || 'transparent');
      if (k === 'font') document.execCommand('fontName', false, fontOf(v));
      if (k === 'size') wrapSize(val);
      saveRange(); return;
    }
    if (its.length) {
      snapshot();
      its.forEach((it) => {
        if (k === 'k' && it.t !== 'shape') return;
        it[k] = val;
        // « Changer tout » : la couleur, la police ou la taille choisies s'appliquent aussi aux passages déjà mis en forme
        if (it.html && ['c', 'font', 'size'].includes(k)) it.html = stripStyle(it.html, { c: 'color', font: 'fontFamily', size: 'fontSize' }[k]);
        if (it.t === 'text' && !editing && ['size', 'font', 'frame'].includes(k)) it.h = measure(it);
      });
      commit();
      if (editing?.rich) { if (['c', 'font', 'size'].includes(k)) editing.el.innerHTML = textHtml(byId(editing.id)); styleEditor(); }
    } else if (style[tool]) { style[tool][k] = val; if (k === 'k' && tool === 'shape') trayHtml(); }
    trayHtml(); if (its.length) selbarHtml();
  }
  function toggleProp(k) {
    const its = editing ? [byId(editing.id)].filter(Boolean) : selected();
    if (editing?.rich && editing.el && ['b', 'i', 'u', 's'].includes(k) && hasRange()) {
      restoreRange(); document.execCommand({ b: 'bold', i: 'italic', u: 'underline', s: 'strikeThrough' }[k]); saveRange(); return;
    }
    if (editing && k === 'bul') { const id = editing.id; finishEdit(); sel = new Set([id]); return toggleProp(k); }
    const flip = (o) => {
      if (k === 'al') o.al = !o.al || o.al === 'left' ? 'center' : o.al === 'center' ? 'right' : 'left';
      else if (k === 'bul') {
        // Liste à puces : une puce par ligne (ou on les retire toutes)
        const lines = String(o.txt || '').split('\n');
        const on2 = lines.filter((l) => l.trim()).every((l) => /^• /.test(l));
        o.txt = lines.map((l) => (on2 ? l.replace(/^• /, '') : l.trim() ? `• ${l.replace(/^• /, '')}` : l)).join('\n');
        delete o.html;
      } else o[k] = o[k] ? 0 : 1;
    };
    if (its.length) { snapshot(); its.forEach((it) => { flip(it); if (it.t === 'text' && !editing) it.h = measure(it); }); commit(); if (editing) styleEditor(); selbarHtml(); } else if (style[tool]) { flip(style[tool]); trayHtml(); }
  }
  function setTool(t) {
    if (t === 'more') { trayOpen = trayOpen === 'more' ? '' : 'more'; toolsBar(); trayHtml(); return; }
    finishEdit(); flushInk(); trayOpen = '';
    tool = t; if (t !== 'select') sel.clear();
    svg.dataset.tool = t; toolsBar(); trayHtml(); paintSel();
    if (t === 'write') { warmInk(); if (!ocrReady() && !ocrInstalling()) offerOCR(); }
    if (!seenTips.has(t)) { seenTips.add(t); showTip(HINTS[t]); }
  }
  // Coller : au même endroit décalé si l'original est là, sinon au centre de la vue ; liens et groupes recréés
  const getClip = () => { if (clip) return clip; try { return JSON.parse(localStorage.getItem('msdev:wb-clip') || 'null'); } catch (e) { return null; } };
  function paste() {
    const src = getClip(); if (!src?.length) return;
    snapshot();
    const ids = new Map(src.map((x) => [x.id, nid()])), groups = new Map();
    const b = itemsBox(src), r = rect();
    const here = src.some((x) => byId(x.id));
    const dx = here ? 24 : view.x + r.width / view.z / 2 - b.w / 2 - b.x, dy = here ? 24 : view.y + r.height / view.z / 2 - b.h / 2 - b.y;
    const copies = src.map((x) => {
      const y = clone(x); y.id = ids.get(x.id); delete y.hw; delete y.lock; delete y.ink;
      for (const k of ['a1', 'a2']) if (y[k]) { if (ids.has(y[k])) y[k] = ids.get(y[k]); else delete y[k]; }
      if (y.g) { if (!groups.has(y.g)) groups.set(y.g, nid()); y.g = groups.get(y.g); }
      moveItem(y, dx, dy); return y;
    });
    list.push(...copies);
    if (tool !== 'select') setTool('select');
    sel = new Set(copies.map((x) => x.id)); commit();
  }
  // Un élément d'un groupe : tout le groupe
  const groupIds = (id) => { const it = byId(id); return it?.g ? list.filter((x) => x.g === it.g).map((x) => x.id) : [id]; };
  function command(c) {
    // Grouper, verrouiller, aligner, répartir, copier, coller
    if (c === 'group' && sel.size > 1) { snapshot(); const g = nid(); selected().forEach((x) => { x.g = g; }); commit(); showTip('Groupé : ces éléments se choisissent et se déplacent ensemble.'); }
    if (c === 'ungroup' && sel.size) { snapshot(); selected().forEach((x) => { delete x.g; }); commit(); }
    if (c === 'lock' && sel.size) { snapshot(); selected().forEach((x) => { x.lock = 1; }); sel.clear(); commit(); showTip('Verrouillé : il ne bouge plus. Pour le libérer : outil Choisir → Déverrouiller tout.'); trayHtml(); }
    if (c === 'unlockall' && list.some((x) => x.lock)) { snapshot(); list.forEach((x) => { delete x.lock; }); commit(); trayHtml(); showTip('Tous les éléments sont déverrouillés.'); }
    if (c.startsWith('al-') && sel.size > 1) {
      snapshot();
      const its = selected(), B = itemsBox(its);
      its.forEach((it) => {
        const b = bbox(it);
        const dx = c === 'al-l' ? B.x - b.x : c === 'al-r' ? B.x + B.w - b.x - b.w : c === 'al-c' ? B.x + B.w / 2 - b.x - b.w / 2 : 0;
        const dy = c === 'al-t' ? B.y - b.y : c === 'al-b' ? B.y + B.h - b.y - b.h : c === 'al-m' ? B.y + B.h / 2 - b.y - b.h / 2 : 0;
        moveItem(it, dx, dy);
      });
      commit();
    }
    if ((c === 'dist-h' || c === 'dist-v') && sel.size > 2) {
      snapshot();
      const hz = c === 'dist-h';
      const its = selected().map((it) => ({ it, b: bbox(it) })).sort((a, b) => (hz ? a.b.x - b.b.x : a.b.y - b.b.y));
      const f0 = its[0].b, fl = its[its.length - 1].b;
      const span = hz ? fl.x + fl.w - f0.x : fl.y + fl.h - f0.y;
      const gap = (span - its.reduce((s, o) => s + (hz ? o.b.w : o.b.h), 0)) / (its.length - 1);
      let pos = hz ? f0.x : f0.y;
      its.forEach((o) => { const d = pos - (hz ? o.b.x : o.b.y); moveItem(o.it, hz ? d : 0, hz ? 0 : d); pos += (hz ? o.b.w : o.b.h) + gap; });
      commit();
    }
    if (c === 'copy' && sel.size) {
      clip = clone(selected());
      try { localStorage.setItem('msdev:wb-clip', JSON.stringify(clip)); } catch (e) { /* presse-papiers de la session seulement */ }
      showTip(`${clip.length > 1 ? `${clip.length} éléments copiés` : 'Copié'}. Collez ici ou dans un autre tableau : outil Choisir → Coller (Ctrl V).`);
    }
    if (c === 'paste') paste();
    if (c === 'undo' && undoS.length) { finishEdit(); redoS.push(JSON.stringify(list)); list = JSON.parse(undoS.pop()); sel.clear(); commit(); }
    if (c === 'redo' && redoS.length) { finishEdit(); undoS.push(JSON.stringify(list)); list = JSON.parse(redoS.pop()); sel.clear(); commit(); }
    if (c === 'del' && sel.size) { snapshot(); list = list.filter((x) => !sel.has(x.id)); sel.clear(); commit(); }
    if (c === 'dup' && sel.size) { snapshot(); const copies = selected().map((x) => { const y = clone(x); y.id = nid(); delete y.hw; moveItem(y, 24, 24); return y; }); list.push(...copies); sel = new Set(copies.map((x) => x.id)); commit(); }
    if (c === 'front' && sel.size) { snapshot(); list = [...list.filter((x) => !sel.has(x.id)), ...selected()]; commit(); }
    if (c === 'back' && sel.size) { snapshot(); list = [...selected(), ...list.filter((x) => !sel.has(x.id))]; commit(); }
    if (c === 'data') { const it = selected()[0]; if (it) openData(it); }
    if (c === 'edit') { const it = selected()[0]; if (it) startEdit(it); }
    if (c === 'done') finishEdit();
    if (c === 'rowadd') { const it = selected()[0]; if (it?.t === 'list') { snapshot(); it.rows = [...(it.rows || []), { t: '', d: 0 }]; commit(); startEdit(it); } }
    if (c === 'ocr-install') startInstall();
    if (c === 'ocr-later') { stage.querySelector('.dw-card')?.remove(); try { localStorage.setItem('msdev:ocr-asked', '1'); } catch (e) { /* préférence locale */ } }
    if (c === 'ink') { const it = selected()[0]; if (it?.hw?.ink) { snapshot(); const back = it.hw.ink.map((x) => ({ ...x, id: nid() })); list = list.filter((x) => x.id !== it.id).concat(back); sel = new Set(back.map((x) => x.id)); commit(); showTip('Votre écriture est revenue telle quelle.'); } }
  }
  function chooseAlt(i) {
    const it = selected()[0]; if (!it?.hw) return;
    const txt = it.hw.alts[i]; if (txt == null) return;
    snapshot(); it.txt = txt; delete it.html; it.w2 = Math.max(it.w2, measureW(it) + 12); it.h = measure(it); commit();
    onLearn?.(txt);
  }
  function openData(it) {
    onEditData?.(clone(it), (patch) => { snapshot(); Object.assign(byId(it.id) || {}, patch); commit(); });
  }

  // ----- Mesure d'un texte (hauteur selon la largeur) -----
  function measureBox(it, width) {
    const d = document.createElement('div');
    d.className = 'dw-t dw-measure';
    d.setAttribute('style', `${textStyle(it)}position:absolute;visibility:hidden;left:-9999px;top:0;${width ? `width:${width}px;` : 'width:max-content;white-space:pre;'}`);
    d.innerHTML = textHtml(it) || '&nbsp;';
    stage.append(d);
    const r = { w: d.offsetWidth, h: d.offsetHeight };
    d.remove();
    return r;
  }
  const measure = (it) => Math.max(Math.round((it.size || 18) * 1.4), measureBox(it, it.w2).h + 2);
  const measureW = (it) => measureBox(it, 0).w;

  // ----- Édition du texte : un cadre posé sur l'élément, comme dans un traitement de texte -----
  let savedRange = null;
  const hasRange = () => { const s = window.getSelection(); const live = s.rangeCount && editing?.el?.contains(s.getRangeAt(0).commonAncestorContainer) ? s.getRangeAt(0) : null; const r = live || savedRange; return !!(r && !r.collapsed && editing?.el?.contains(r.commonAncestorContainer)); };
  const saveRange = () => { const s = window.getSelection(); if (s.rangeCount && editing?.el?.contains(s.getRangeAt(0).commonAncestorContainer)) savedRange = s.getRangeAt(0).cloneRange(); };
  const restoreRange = () => { if (!savedRange || !editing?.el?.contains(savedRange.commonAncestorContainer)) return; const s = window.getSelection(); s.removeAllRanges(); s.addRange(savedRange); };
  function wrapSize(px) {
    const s = window.getSelection(); if (!s.rangeCount) return;
    const r = s.getRangeAt(0); if (r.collapsed) return;
    const span = document.createElement('span'); span.style.fontSize = `${px}px`;
    try { span.append(r.extractContents()); r.insertNode(span); s.removeAllRanges(); const nr = document.createRange(); nr.selectNodeContents(span); s.addRange(nr); } catch (e) { /* sélection complexe */ }
  }
  function styleEditor() {
    if (!editing) return;
    const it = byId(editing.id); if (!it) return;
    const el = editing.el;
    const pad = it.t === 'sticky' ? 12 : it.t === 'bubble' ? 14 : ['rect', 'ellipse', 'shape'].includes(it.t) ? 8 : 0;
    const b = bbox(it);
    const [sx, sy] = toScreen(b.x, b.y);
    const sr = stage.getBoundingClientRect();
    const z = view.z;
    Object.assign(el.style, {
      left: `${sx - sr.left + pad * z}px`, top: `${sy - sr.top + pad * z}px`,
      width: `${Math.max(120, (b.w - pad * 2) * z)}px`, minHeight: `${Math.max(30, (it.t === 'text' ? (it.size || 18) * 1.4 : b.h - pad * 2) * z)}px`,
      fontFamily: fontOf(it.font), fontSize: `${(it.size || 18) * z}px`, fontWeight: it.b ? 700 : 400, fontStyle: it.i ? 'italic' : 'normal',
      textDecoration: [it.u ? 'underline' : '', it.s ? 'line-through' : ''].filter(Boolean).join(' ') || 'none',
      color: it.c || '#131a2a', textAlign: it.al || 'left',
      border: it.t === 'text' && it.frame ? `${2.5 * z}px solid ${it.fc || it.c || '#131a2a'}` : '', padding: it.t === 'text' && it.frame ? `${8 * z}px ${12 * z}px` : '',
    });
  }
  function startEdit(it) {
    finishEdit(); closePop();
    sel = new Set([it.id]);
    if (it.t === 'list' || it.t === 'check') return startListEdit(it);
    const el = document.createElement('div');
    el.className = 'dw-edit';
    el.contentEditable = 'true';
    el.setAttribute('role', 'textbox'); el.setAttribute('aria-multiline', 'true');
    el.dataset.ph = 'Écrivez…';
    el.innerHTML = textHtml(it);
    stage.append(el);
    editing = { id: it.id, el, rich: true, before: JSON.stringify(it) };
    paint();
    styleEditor();
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); finishEdit(); }
      if ((e.ctrlKey || e.metaKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) { e.preventDefault(); document.execCommand({ b: 'bold', i: 'italic', u: 'underline' }[e.key.toLowerCase()]); }
      e.stopPropagation();
    });
    el.addEventListener('input', () => { if (it.t === 'text') { const w = Math.max(it.w2, Math.min(900, measureBox({ ...it, html: clean(el.innerHTML), txt: el.innerText }, 0).w + 8)); if (w > it.w2 && !it.fixedW) { it.w2 = w; styleEditor(); } } });
    el.addEventListener('keyup', saveRange); el.addEventListener('mouseup', saveRange); el.addEventListener('touchend', () => setTimeout(saveRange, 10));
    el.addEventListener('blur', () => setTimeout(() => { if (editing?.el === el && !stage.contains(document.activeElement) && !selbar.contains(document.activeElement)) finishEdit(); }, 120));
    requestAnimationFrame(() => { el.focus(); const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); });
    selbarHtml();
  }
  function startListEdit(it) {
    const ta = document.createElement('textarea');
    ta.className = 'dw-edit is-list';
    const rows = it.t === 'list' ? it.rows || [] : [{ t: it.txt || '', d: it.done }];
    ta.value = rows.map((r) => r.t).join('\n');
    ta.placeholder = 'Une ligne par case…';
    stage.append(ta);
    editing = { id: it.id, el: ta, list: true, before: JSON.stringify(it), done: rows.map((r) => r) };
    const b = bbox(it), [sx, sy] = toScreen(b.x, b.y), sr = stage.getBoundingClientRect(), z = view.z;
    const size = it.size || 20, lh = Math.round(size * 1.7);
    Object.assign(ta.style, { left: `${sx - sr.left + (size * 1.05 + 10) * z}px`, top: `${sy - sr.top}px`, width: `${Math.max(160, (b.w - size * 1.05 - 10) * z)}px`, fontFamily: fontOf(it.font), fontSize: `${size * z}px`, lineHeight: `${lh * z}px` });
    const fit = () => { ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight + 2}px`; };
    ta.addEventListener('input', fit);
    ta.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); finishEdit(); } e.stopPropagation(); });
    ta.addEventListener('blur', () => setTimeout(() => { if (editing?.el === ta && !selbar.contains(document.activeElement)) finishEdit(); }, 120));
    requestAnimationFrame(() => { fit(); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); });
    selbar.hidden = true;
  }
  function finishEdit() {
    if (!editing) return;
    const { id, el, before } = editing; const wasList = editing.list; const doneRows = editing.done;
    editing = null; savedRange = null;
    const it = byId(id);
    if (it) {
      if (wasList) {
        const lines = el.value.replace(/\s+$/, '').split('\n');
        const old = doneRows || [];
        if (it.t === 'list') it.rows = lines.map((t, i) => ({ t: t.trim(), d: old.find((r) => r.t === t.trim())?.d || (old[i]?.t === t.trim() ? old[i].d : 0) }));
        else { it.txt = lines.join(' ').trim(); }
        if (it.t === 'list' && !it.rows.some((r) => r.t)) list = list.filter((x) => x.id !== id);
      } else {
        const html = clean(el.innerHTML).replace(/(<br>)+$/, '');
        const txt = (el.innerText || '').replace(/ /g, ' ').replace(/\s+$/, '');
        if (/<(b|i|u|s|span|mark|sub|sup)\b/.test(html)) { it.html = html; it.txt = txt; } else { delete it.html; it.txt = txt; }
        if (it.hw && txt !== it.hw.alts?.[0]) { onLearn?.(txt); }
        if (!txt && it.t === 'text') list = list.filter((x) => x.id !== id);
        else if (it.t === 'text') it.h = measure(it);
        else if (['sticky', 'bubble'].includes(it.t)) it.h = Math.max(it.h, measureBox({ ...it, frame: 0 }, it.w2 - (it.t === 'sticky' ? 24 : 28)).h + 26);
      }
      if (JSON.stringify(byId(id) || {}) !== before) { undoS.push(JSON.stringify(list.map((x) => (x.id === id ? JSON.parse(before) : x)).concat(byId(id) ? [] : [JSON.parse(before)]))); redoS.length = 0; }
    }
    el.remove(); commit();
  }

  // ----- Création selon l'outil -----
  function create(t, x, y) {
    const s = style[t] || {};
    const id = nid();
    if (t === 'pen' || t === 'write') return { id, t: 'pen', pts: [[x, y]], c: s.c, w: t === 'write' ? 3 : s.w, ...(t === 'write' ? { ink: 1 } : { pt: s.pt || 'bille' }) };
    if (t === 'highlighter') return { id, t: 'pen', pts: [[x, y]], c: s.c, w: s.w, o: 0.5, hl: 1 };
    if (t === 'underline') return { id, t: 'pen', pts: [[x, y]], c: s.c, w: s.w, under: 1 };
    if (t === 'shape') {
      const k = s.k;
      if (LINE_K.includes(k)) return { id, t: 'line', x1: x, y1: y, x2: x, y2: y, c: s.c, w: s.w, arrow: k === 'arrow' || k === 'curve' ? 1 : k === 'darrow' ? 2 : 0, dash: s.dash || 0, ...(k === 'curve' ? { curve: 1 } : {}) };
      if (k === 'rect' || k === 'ellipse' || k === 'rrect') return { id, t: k === 'rrect' ? 'rect' : k, ...(k === 'rrect' ? { round: 22 } : k === 'rect' ? { round: 3 } : {}), x, y, w2: 0, h: 0, c: s.c, w: s.w, f: s.f || '', dash: s.dash || 0, size: 18, font: 'sans' };
      return { id, t: 'shape', k, x, y, w2: 0, h: 0, c: s.c, w: s.w, f: s.f || '', dash: s.dash || 0, vol: s.vol, size: 18, font: 'sans' };
    }
    if (t === 'text') return { id, t: 'text', x, y: y - (s.size || 24) * 0.7, w2: 280, h: Math.round((s.size || 24) * 1.4), txt: '', c: s.c, size: s.size, font: s.font, b: s.b, i: s.i, u: s.u, frame: s.frame };
    if (t === 'list') return { id, t: 'list', x, y: y - (s.size || 20), w2: 320, rows: [{ t: '', d: 0 }], c: s.c, size: s.size, font: s.font };
    if (t === 'sticky') return { id, t: 'sticky', x, y, w2: 0, h: 0, txt: '', f: s.f, size: s.size, font: s.font, c: '#131a2a' };
    if (t === 'bubble') return { id, t: 'bubble', x, y, w2: 0, h: 0, txt: '', f: s.f, c: s.c, size: s.size, font: s.font };
    if (t === 'stamp') return { id, t: 'stamp', x: x - 18, y: y - 18, s: 36, c: s.c, kind: s.kind };
    if (t === 'chart') return { id, t: 'chart', x, y, w2: 0, h: 0, kind: s.kind || 'bar', title: 'Mon graphique', data: [{ l: 'Lun', v: 3 }, { l: 'Mar', v: 5 }, { l: 'Mer', v: 4 }, { l: 'Jeu', v: 7 }] };
    if (t === 'timeline') return { id, t: 'timeline', x, y, w2: 0, h: 120, c: s.c, steps: [{ l: 'Début', d: '' }, { l: 'Étape 2', d: '' }, { l: 'Aujourd\'hui', d: '' }] };
    return null;
  }
  const MIN = { rect: [140, 100], ellipse: [120, 120], shape: [140, 140], sticky: [200, 170], bubble: [240, 90], chart: [380, 240], timeline: [560, 120] };

  // ----- Lecture précise : le modèle s'installe une fois sur l'appareil -----
  let ocrPct = null;
  function aiChip() {
    if (ocrReady()) return `<span class="dw-ai is-ok">${ic('check')}<span>Lecture précise</span></span>`;
    if (ocrPct != null || ocrInstalling()) { const p = Math.round((ocrPct || 0) * 100); return `<span class="dw-ai is-busy" style="--p:${p}%"><span>Installation ${p} %</span></span>`; }
    return `<button type="button" class="dw-ai is-off" data-cmd="ocr-install">${ic('download')}<span>Installer la lecture précise</span></button>`;
  }
  function offerOCR() {
    let asked = false;
    try { asked = localStorage.getItem('msdev:ocr-asked') === '1'; } catch (e) { asked = false; }
    if (asked || stage.querySelector('.dw-card')) return;
    stage.insertAdjacentHTML('beforeend', `<div class="dw-card" role="dialog" aria-label="Lecture précise de l'écriture"><div class="dw-card-in">
      <span class="dw-card-ic">${ic('signature')}</span>
      <h3>Lecture précise de l'écriture</h3>
      <p>Pour que votre écriture devienne le bon texte, MindView installe une seule fois un modèle d'intelligence artificielle entraîné sur de vraies écritures : environ 90 Mo, de préférence en Wi-Fi. Il reste sur votre appareil, rien n'est envoyé.</p>
      <div class="dw-card-bar" hidden><i></i></div>
      <div class="dw-card-a"><button type="button" class="btn btn-primary" data-cmd="ocr-install">${ic('download')}<span>Installer maintenant</span></button><button type="button" class="btn btn-ghost" data-cmd="ocr-later">Plus tard</button></div>
    </div></div>`);
  }
  function paintCard(state) {
    const card = stage.querySelector('.dw-card'); if (!card) return;
    const bar = card.querySelector('.dw-card-bar'), a = card.querySelector('.dw-card-a');
    if (state === 'done') { card.querySelector('h3').textContent = 'Lecture précise prête'; card.querySelector('p').textContent = 'Écrivez, levez le doigt : votre écriture devient du texte.'; bar.hidden = true; a.innerHTML = ''; setTimeout(() => card.remove(), 1600); return; }
    if (state === 'fail') { bar.hidden = true; a.innerHTML = `<button type="button" class="btn btn-primary" data-cmd="ocr-install">Réessayer</button><button type="button" class="btn btn-ghost" data-cmd="ocr-later">Plus tard</button>`; return; }
    const p = Math.round((ocrPct || 0) * 100);
    bar.hidden = false; bar.querySelector('i').style.width = `${p}%`;
    a.innerHTML = `<p class="dw-card-p">Installation… ${p} %. Vous pouvez continuer à dessiner pendant ce temps.</p>`;
  }
  function startInstall() {
    if (ocrReady()) return;
    ocrPct = ocrPct || 0; if (tool === 'write') trayHtml(); paintCard();
    installOCR((p) => { ocrPct = p; if (tool === 'write') trayHtml(); paintCard(); })
      .then(() => { ocrPct = null; if (tool === 'write') trayHtml(); paintCard('done'); showTip('Lecture précise installée : écrivez, votre écriture devient du texte.'); })
      .catch(() => { ocrPct = null; if (tool === 'write') trayHtml(); paintCard('fail'); showTip('Installation interrompue (connexion ?). Réessayez depuis l\'outil Écriture.'); });
  }
  stage.addEventListener('click', (e) => { const b = e.target.closest('.dw-card [data-cmd]'); if (b) command(b.dataset.cmd); });

  // ----- Écriture à la main → texte -----
  const inkBox = (ids) => itemsBox(ids.map(byId).filter(Boolean));
  function queueInk(it) {
    if (!pending) pending = { ids: [], t: 0 };
    pending.ids.push(it.id);
    clearTimeout(pending.t);
    pending.t = setTimeout(convertInk, 850);
  }
  function flushInk() { if (pending) { clearTimeout(pending.t); convertInk(); } }
  async function convertInk() {
    const p = pending; pending = null;
    if (!p) return;
    const inks = p.ids.map(byId).filter(Boolean);
    if (!inks.length) return;
    const strokes = inks.map((x) => x.pts.map((q, i) => [q[0], q[1], i * 10]));
    const b = itemsBox(inks);
    gLive.innerHTML = `<rect class="dw-reading" x="${b.x - 6}" y="${b.y - 6}" width="${b.w + 12}" height="${b.h + 12}" rx="10"/><text class="dw-reading-t" x="${b.x - 4}" y="${b.y - 12}" font-size="${13 / view.z}">Lecture…</text>`;
    let r;
    try { r = await readInk(strokes, typeof words === 'function' ? words() : words || []); } catch (e) { r = null; }
    gLive.innerHTML = '';
    if (!r?.text?.trim()) { inks.forEach((x) => delete x.ink); emit(); showTip('Écriture non reconnue : elle reste dessinée. Écrivez un peu plus grand, en lettres bien formées.'); return; }
    if (!inks.every((x) => byId(x.id))) return;
    const font = style.write.font;
    const m = await fontMetrics(font);
    const xh = r.xh || b.h * 0.45;
    const size = Math.max(14, Math.min(140, Math.round(xh / m.x)));
    const lineH = size * 1.35;
    const baseOff = (lineH - (m.asc + m.desc) * size) / 2 + m.asc * size;
    const base = r.base ?? b.y + b.h * 0.75;
    const it = { id: nid(), t: 'text', x: r1(b.x), y: r1(base - baseOff), w2: 0, h: 0, txt: r.text, c: inks[0].c, size, font, hw: { alts: r.alts || [r.text], ink: inks.map((x) => { const y = clone(x); delete y.ink; return y; }) } };
    it.w2 = Math.max(Math.round(b.w), measureW(it) + 16);
    it.h = measure(it);
    snapshot();
    list = list.filter((x) => !p.ids.includes(x.id));
    list.push(it);
    // Fondu : l'écriture s'efface, le texte apparaît à sa place
    gLive.innerHTML = `<g class="dw-fade">${inks.map(renderItem).join('')}</g>`;
    setTimeout(() => { if (gLive.querySelector('.dw-fade')) gLive.innerHTML = ''; }, 520);
    paint();
    gItems.querySelector(`[data-id="${it.id}"]`)?.classList.add('dw-pop');
    emit(); history();
    if (r.simple && !seenTips.has('hw-simple')) { seenTips.add('hw-simple'); showTip('Lecture simple : installez la lecture précise (outil Écriture) pour que votre écriture soit lue sans erreur.', 6000); }
    else if (!seenTips.has('hw-done')) { seenTips.add('hw-done'); showTip('Mal lu ? Passez en mode Choisir et touchez le texte : autres lectures, correction au clavier, ou retour à votre écriture.', 6000); }
  }

  // ----- Gomme précise -----
  function eraseAlong(ax, ay, bx, by) {
    const r = (style.eraser.r || 14) / view.z;
    const dist = (px, py) => { const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy; const t = L2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L2)) : 0; return Math.hypot(px - ax - t * dx, py - ay - t * dy); };
    let changed = false;
    const out = [];
    for (const it of list) {
      if (it.t !== 'pen' || it.lock || style.eraser.mode === 'object') { out.push(it); continue; }
      const bb = bbox(it);
      if (bb.x > Math.max(ax, bx) + r + it.w || bb.x + bb.w < Math.min(ax, bx) - r - it.w || bb.y > Math.max(ay, by) + r + it.w || bb.y + bb.h < Math.min(ay, by) - r - it.w) { out.push(it); continue; }
      const reach = r + (it.w || 3) / 2;
      const keep = it.pts.map((q) => dist(q[0], q[1]) > reach);
      if (keep.every(Boolean)) { out.push(it); continue; }
      changed = true;
      let run = [];
      const flush = () => { if (run.length > 1) out.push({ ...it, id: nid(), pts: run }); run = []; };
      it.pts.forEach((q, i) => { if (keep[i]) run.push(q); else flush(); });
      flush();
    }
    if (changed) { if (!action.done) { snapshot(); action.done = true; } list = out; paint(); }
    // Les autres éléments s'effacent en entier quand la gomme passe dessus
    const [sx, sy] = toScreen(bx, by);
    const id = hitItem(sx, sy);
    const it = id && byId(id);
    if (it && (it.t !== 'pen' || style.eraser.mode === 'object')) { if (!action.done) { snapshot(); action.done = true; } list = list.filter((x) => x.id !== id); paint(); }
  }

  // ----- Guides d'alignement pendant un déplacement -----
  function snapMove(dx, dy) {
    const its = selected(); if (!its.length) return [dx, dy];
    const b = itemsBox(its), tol = 6 / view.z;
    const others = list.filter((x) => !sel.has(x.id) && x.t !== 'pen').slice(0, 300).map(bbox);
    const xs = [b.x + dx, b.x + b.w / 2 + dx, b.x + b.w + dx], ys = [b.y + dy, b.y + b.h / 2 + dy, b.y + b.h + dy];
    let bx = null, by = null, gx = null, gy = null;
    for (const o of others) {
      for (const cx of [o.x, o.x + o.w / 2, o.x + o.w]) for (const x of xs) { const d = cx - x; if (Math.abs(d) < tol && (bx === null || Math.abs(d) < Math.abs(bx))) { bx = d; gx = cx; } }
      for (const cy of [o.y, o.y + o.h / 2, o.y + o.h]) for (const y of ys) { const d = cy - y; if (Math.abs(d) < tol && (by === null || Math.abs(d) < Math.abs(by))) { by = d; gy = cy; } }
    }
    const k = 1 / view.z, r = rect();
    gGuides.innerHTML = `${gx !== null ? `<line x1="${gx}" x2="${gx}" y1="${view.y}" y2="${view.y + r.height / view.z}" class="dw-guide" stroke-width="${k}"/>` : ''}${gy !== null ? `<line y1="${gy}" y2="${gy}" x1="${view.x}" x2="${view.x + r.width / view.z}" class="dw-guide" stroke-width="${k}"/>` : ''}`;
    return [dx + (bx || 0), dy + (by || 0)];
  }

  // ----- Pointeur -----
  const hitItem = (cx, cy) => {
    // Un élément verrouillé ne se choisit plus et ne s'efface plus (sauf « Déverrouiller tout »)
    for (const el of document.elementsFromPoint(cx, cy)) { if (!svg.contains(el)) continue; const g = el.closest('.dw-i'); if (g && !byId(g.dataset.id)?.lock) return g.dataset.id; }
    return null;
  };
  const drawing = () => ['pen', 'write', 'highlighter', 'underline', 'eraser'].includes(tool);
  const tickAt = (e) => e.target.closest?.('.dw-tick') || document.elementsFromPoint(e.clientX, e.clientY).map((el) => el.closest?.('.dw-tick')).find(Boolean) || null;
  function onDown(e) {
    if (!active) return;
    if (e.target.closest('.dw-edit, .dw-selbar, .dw-pop, .dw-zoom')) return;
    if (e.pointerType === 'pen') lastPen = Date.now();
    else if (e.pointerType === 'touch' && Date.now() - lastPen < 1500 && drawing()) return; // la paume posée pendant qu'on écrit au stylet
    closePop();
    svg.focus({ preventScroll: true });
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    try { svg.setPointerCapture(e.pointerId); } catch (err) { /* pointeur déjà relâché */ }
    if (pointers.size === 2 && mode === 'board') {
      // Deux doigts : on abandonne le trait commencé et on zoome / déplace la vue
      if (action?.kind === 'draw') gLive.innerHTML = '';
      const [a, b] = [...pointers.values()]; action = { kind: 'pinch', d: Math.hypot(a[0] - b[0], a[1] - b[1]), mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2 }; return;
    }
    if (pointers.size > 1) return;
    if (editing) { finishEdit(); if (tool === 'select') { action = null; return; } }
    const [x, y] = toWorld(e.clientX, e.clientY);
    if (mode === 'board' && (tool === 'hand' || space || e.button === 1)) { action = { kind: 'pan', cx: e.clientX, cy: e.clientY, vx: view.x, vy: view.y }; return; }
    if (tool === 'select') {
      const h = e.target.closest('.dw-h') || document.elementsFromPoint(e.clientX, e.clientY).find((el) => el.classList?.contains('dw-h'));
      if (h) { snapshot(); const its = selected(); action = { kind: 'resize', h: h.dataset.h, from: itemsBox(its), orig: its.map(clone), sx: x, sy: y }; return; }
      const id = hitItem(e.clientX, e.clientY);
      if (id) {
        const it = byId(id);
        // Case d'une liste : un toucher suffit pour cocher
        const box = tickAt(e);
        if (box && it?.t === 'list' && sel.size <= 1) { action = { kind: 'tick', id, row: +box.dataset.row, sx: x, sy: y }; return; }
        const grp = groupIds(id);
        if (e.shiftKey) { const all = grp.every((g) => sel.has(g)); grp.forEach((g) => (all ? sel.delete(g) : sel.add(g))); } else if (!sel.has(id)) sel = new Set(grp);
        paintSel();
        action = { kind: 'move', sx: x, sy: y, lx: x, ly: y, moved: false, id, tx: 0, ty: 0 };
        return;
      }
      if (!e.shiftKey) sel.clear();
      // Au doigt, glisser sur le vide déplace la vue ; à la souris, cela sélectionne une zone
      if (e.pointerType === 'touch' && mode === 'board' && !+style.select.lasso) { paintSel(); action = { kind: 'pan', cx: e.clientX, cy: e.clientY, vx: view.x, vy: view.y }; return; }
      action = +style.select.lasso ? { kind: 'lasso', pts: [[x, y]] } : { kind: 'marquee', sx: x, sy: y }; paintSel();
      return;
    }
    if (tool === 'eraser') { action = { kind: 'erase', done: false, lx: x, ly: y }; eraseAlong(x, y, x, y); return; }
    if (tool === 'list') {
      const id = hitItem(e.clientX, e.clientY); const ex = id && byId(id);
      if (ex?.t === 'list') { const box = tickAt(e); if (box) { snapshot(); ex.rows[+box.dataset.row].d = ex.rows[+box.dataset.row].d ? 0 : 1; commit(); return; } startEdit(ex); return; }
    }
    if (tool === 'text') {
      const id = hitItem(e.clientX, e.clientY); const ex = id && byId(id);
      if (ex && ['text', 'sticky', 'bubble', 'rect', 'ellipse', 'shape'].includes(ex.t)) { startEdit(ex); return; }
    }
    if (tool === 'write' && pending) {
      // Un trait loin de l'écriture en cours : on lit d'abord ce qui précède
      const b = inkBox(pending.ids);
      const lh = Math.max(30, b.h);
      if (x < b.x - lh * 2 || x > b.x + b.w + lh * 2.5 || y < b.y - lh * 1.2 || y > b.y + b.h + lh * 1.2) flushInk(); else clearTimeout(pending.t);
    }
    const it = create(tool, x, y);
    if (!it) return;
    if (e.pointerType === 'pen' && e.pressure > 0 && it.t === 'pen' && !it.hl) it.pts[0][2] = r1(e.pressure);
    if (['stamp', 'text', 'list'].includes(tool)) {
      snapshot(); list.push(it); paint();
      if (tool !== 'stamp') startEdit(it); else emit();
      return;
    }
    if (it.t === 'line') { const from = bindTarget(e.clientX, e.clientY, it.id); if (from) it.a1 = from.id; }
    action = { kind: 'draw', it, sx: x, sy: y, last: Date.now(), lx: e.clientX, ly: e.clientY, type: e.pointerType };
  }
  let holdT = 0;
  function armHold() {
    clearTimeout(holdT);
    if (!action || action.kind !== 'draw' || action.it.t !== 'pen' || action.it.ink) return;
    holdT = setTimeout(() => {
      if (!action || action.kind !== 'draw' || action.snapped) return;
      const sh = snapShape(action.it.pts);
      if (!sh) return;
      action.snapped = sh;
      gLive.innerHTML = renderItem(snappedItem(action.it, sh));
      gLive.firstElementChild?.classList.add('dw-snap');
    }, 460);
  }
  function snappedItem(it, sh) {
    const base = { id: it.id, c: it.c, w: it.hl ? it.w : Math.max(2, it.w * 0.8) };
    if (it.hl || it.under) return sh.kind === 'line' ? { ...it, pts: [[sh.x1, sh.y1], [sh.x2, sh.y2]] } : it;
    if (sh.kind === 'line') return { ...base, t: 'line', x1: sh.x1, y1: sh.y1, x2: sh.x2, y2: sh.y2, arrow: 0, dash: 0 };
    if (sh.kind === 'poly') return { ...base, t: 'poly', pts: sh.pts, closed: 1, f: '' };
    return { ...base, t: sh.kind, x: sh.x, y: sh.y, w2: sh.w2, h: sh.h, f: '', dash: 0, size: 18, font: 'sans' };
  }
  function onMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (!action) return;
    e.preventDefault();
    if (action.kind === 'pinch') {
      const [a, b] = [...pointers.values()]; if (!b) return;
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      view.x -= (mx - action.mx) / view.z; view.y -= (my - action.my) / view.z;
      action.mx = mx; action.my = my;
      zoomAt(d / action.d, mx, my); action.d = d;
      return;
    }
    if (action.kind === 'pan') { view.x = action.vx - (e.clientX - action.cx) / view.z; view.y = action.vy - (e.clientY - action.cy) / view.z; fitView(); paintSel(); return; }
    const evs = e.getCoalescedEvents?.() || [];
    const [x, y] = toWorld(e.clientX, e.clientY);
    if (action.kind === 'erase') { for (const ce of evs.length ? evs : [e]) { const [ex, ey] = toWorld(ce.clientX, ce.clientY); eraseAlong(action.lx, action.ly, ex, ey); action.lx = ex; action.ly = ey; } eraserCursor(x, y); return; }
    if (action.kind === 'tick') return;
    if (action.kind === 'move') {
      if (!action.moved && Math.hypot(x - action.sx, y - action.sy) * view.z < 4) return;
      if (!action.moved) {
        snapshot(); action.moved = true; selbar.hidden = true;
        // Une flèche déplacée seule se décroche des éléments qu'elle reliait
        selected().forEach((it) => { if (it.t === 'line') { if (it.a1 && !sel.has(it.a1)) delete it.a1; if (it.a2 && !sel.has(it.a2)) delete it.a2; } });
      }
      const [dx, dy] = snapMove(x - action.sx - action.tx, y - action.sy - action.ty);
      selected().forEach((it) => moveItem(it, dx, dy));
      action.tx += dx; action.ty += dy; paint();
      return;
    }
    if (action.kind === 'resize') {
      const f = action.from; let { x: X1, y: Y1 } = f; let X2 = f.x + f.w, Y2 = f.y + f.h;
      const its = selected();
      if (action.h === 'p1' || action.h === 'p2') {
        // Extrémité déplacée : décrochée, puis accrochée à l'élément sur lequel on la pose
        const it = its[0];
        if (action.h === 'p1') { delete it.a1; it.x1 = x; it.y1 = y; } else { delete it.a2; it.x2 = x; it.y2 = y; }
        action.bind = bindTarget(e.clientX, e.clientY, it.id); paint(); showBind(action.bind); return;
      }
      if (action.h === 'bend') {
        const it = its[0], dx = it.x2 - it.x1, dy = it.y2 - it.y1, L = Math.hypot(dx, dy) || 1;
        const v = ((x - (it.x1 + it.x2) / 2) * -dy + (y - (it.y1 + it.y2) / 2) * dx) / L;
        it.bend = Math.abs(v) < 6 / view.z ? 0 : r1(v); paint(); return;
      }
      const one = its.length === 1 ? its[0] : null;
      if (one && ['text', 'list'].includes(one.t) && action.h !== 'se') {
        // Élargir un texte : la largeur change, les lignes se recomposent
        const o = action.orig[0];
        if (action.h === 'e') one.w2 = Math.max(60, r1(o.w2 + (x - action.sx)));
        else { const nw = Math.max(60, r1(o.w2 - (x - action.sx))); one.x = r1(o.x + o.w2 - nw); one.w2 = nw; }
        one.fixedW = 1;
        if (one.t === 'text') one.h = measure(one);
        paint(); return;
      }
      if (one && one.t === 'text' && action.h === 'se') {
        const o = action.orig[0], k = Math.max(0.2, (x - o.x) / Math.max(1, o.w2));
        one.size = Math.max(8, Math.min(200, Math.round((o.size || 18) * k))); one.w2 = Math.max(60, r1(o.w2 * k)); one.h = measure(one); paint(); return;
      }
      if (action.h.includes('w')) X1 = Math.min(x, X2 - 10); if (action.h.includes('e')) X2 = Math.max(x, X1 + 10);
      if (action.h.includes('n')) Y1 = Math.min(y, Y2 - 10); if (action.h.includes('s')) Y2 = Math.max(y, Y1 + 10);
      if (e.shiftKey || (one && one.t === 'shape' && one.k === 'cube') || (one && ['check', 'stamp'].includes(one.t))) { const k = Math.max((X2 - X1) / f.w, (Y2 - Y1) / f.h); if (action.h.includes('w')) X1 = X2 - f.w * k; else X2 = X1 + f.w * k; if (action.h.includes('n')) Y1 = Y2 - f.h * k; else Y2 = Y1 + f.h * k; }
      const to = { x: X1, y: Y1, w: X2 - X1, h: Y2 - Y1 };
      its.forEach((it, i) => { const o = action.orig[i]; const ob = bbox(o); const nb = { x: to.x + (ob.x - f.x) * (to.w / f.w), y: to.y + (ob.y - f.y) * (to.h / f.h), w: ob.w * (to.w / f.w), h: ob.h * (to.h / f.h) }; scaleItem(it, o, ob, nb); });
      paint();
      return;
    }
    if (action.kind === 'lasso') {
      const l = action.pts[action.pts.length - 1]; if (Math.hypot(x - l[0], y - l[1]) * view.z > 3) action.pts.push([x, y]);
      gLive.innerHTML = `<path class="dw-marq" d="M${action.pts.map((p) => p.join(' ')).join('L')}Z" stroke-width="${1.5 / view.z}" stroke-dasharray="${6 / view.z} ${4 / view.z}"/>`;
      return;
    }
    if (action.kind === 'marquee') {
      const k = 1 / view.z;
      gLive.innerHTML = `<rect class="dw-marq" x="${Math.min(x, action.sx)}" y="${Math.min(y, action.sy)}" width="${Math.abs(x - action.sx)}" height="${Math.abs(y - action.sy)}" stroke-width="${k}"/>`;
      action.x = x; action.y = y;
      return;
    }
    if (action.kind === 'draw') {
      const it = action.it;
      if (it.t === 'pen') {
        for (const ce of evs.length ? evs : [e]) {
          const [cx, cy] = toWorld(ce.clientX, ce.clientY);
          const l = it.pts[it.pts.length - 1];
          if (Math.hypot(cx - l[0], cy - l[1]) * view.z > 1.2) it.pts.push(ce.pointerType === 'pen' && ce.pressure > 0 && !it.hl ? [cx, cy, r1(ce.pressure)] : [cx, cy]);
        }
        if (Math.hypot(e.clientX - action.lx, e.clientY - action.ly) > 4) { action.lx = e.clientX; action.ly = e.clientY; if (action.snapped) { action.snapped = null; } armHold(); }
        if (!action.snapped) gLive.innerHTML = renderItem(it.under ? straight(it) : it);
      } else if (it.t === 'line') { it.x2 = x; it.y2 = y; if (e.shiftKey) { const a = Math.round(Math.atan2(y - it.y1, x - it.x1) / (Math.PI / 4)) * (Math.PI / 4), L = Math.hypot(x - it.x1, y - it.y1); it.x2 = r1(it.x1 + L * Math.cos(a)); it.y2 = r1(it.y1 + L * Math.sin(a)); } if (it.curve) it.bend = r1(Math.hypot(it.x2 - it.x1, it.y2 - it.y1) * 0.22); const tg = bindTarget(e.clientX, e.clientY, it.id); action.bind = tg && tg.id !== it.a1 ? tg : null; showBind(action.bind); if (it.a1 && byId(it.a1)) [it.x1, it.y1] = anchor(byId(it.a1), it.bend ? [it.x2, it.y2] : [x, y]); gLive.innerHTML = renderItem(it); }
      else { let w = x - action.sx, h = y - action.sy; if (e.shiftKey || (it.t === 'shape' && it.k === 'cube')) { const m = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m; } it.x = Math.min(action.sx, action.sx + w); it.y = Math.min(action.sy, action.sy + h); it.w2 = Math.abs(w); it.h = it.t === 'timeline' ? 120 : Math.abs(h); gLive.innerHTML = renderItem(it); }
    }
  }
  // Souligner : un trait bien droit (horizontal s'il en est proche)
  function straight(it) {
    const a = it.pts[0], b = it.pts[it.pts.length - 1];
    const deg = Math.abs((Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI) % 180;
    const y2 = deg < 10 || deg > 170 ? a[1] : b[1];
    return { ...it, pts: [[a[0], a[1]], [b[0], y2]] };
  }
  let eraserEl = null;
  function eraserCursor(x, y) {
    if (!eraserEl) { eraserEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); eraserEl.setAttribute('class', 'dw-eraser'); svg.append(eraserEl); }
    eraserEl.setAttribute('cx', x); eraserEl.setAttribute('cy', y); eraserEl.setAttribute('r', (style.eraser.r || 14) / view.z); eraserEl.setAttribute('stroke-width', 1.5 / view.z);
  }
  function onUp(e) {
    pointers.delete(e.pointerId);
    clearTimeout(holdT);
    if (eraserEl) { eraserEl.remove(); eraserEl = null; }
    gGuides.innerHTML = '';
    if (!action) return;
    const a = action;
    if (a.kind === 'pinch') { if (pointers.size < 2) { action = null; queueEmit(); } return; }
    action = null;
    if (a.kind !== 'draw') gLive.innerHTML = '';
    if (a.kind === 'pan') { queueEmit(); return; }
    if (a.kind === 'erase') { if (a.done) commit(); return; }
    if (a.kind === 'tick') { const it = byId(a.id); if (it?.rows?.[a.row]) { snapshot(); it.rows[a.row].d = it.rows[a.row].d ? 0 : 1; commit(); } return; }
    if (a.kind === 'move') {
      if (a.moved) commit();
      else { const it = byId(a.id); if (it?.t === 'check' && sel.size === 1) { snapshot(); it.done = it.done ? 0 : 1; commit(); } else selbarHtml(); }
      return;
    }
    if (a.kind === 'resize') {
      if (a.bind && (a.h === 'p1' || a.h === 'p2')) { const it = selected()[0]; if (it) { if (a.h === 'p1' && a.bind.id !== it.a2) it.a1 = a.bind.id; if (a.h === 'p2' && a.bind.id !== it.a1) it.a2 = a.bind.id; } }
      commit(); return;
    }
    if (a.kind === 'lasso') {
      // Lasso : les éléments dont le centre est dans le tracé
      const P = a.pts, inside = ([px, py]) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c; } return c; };
      if (P.length > 2) list.forEach((it) => { if (!it.lock && inside(centerOf(it))) groupIds(it.id).forEach((g) => sel.add(g)); });
      paintSel(); return;
    }
    if (a.kind === 'marquee') {
      if (a.x !== undefined) { const m = { x: Math.min(a.x, a.sx), y: Math.min(a.y, a.sy), w: Math.abs(a.x - a.sx), h: Math.abs(a.y - a.sy) }; list.forEach((it) => { const b = bbox(it); if (!it.lock && b.x < m.x + m.w && b.x + b.w > m.x && b.y < m.y + m.h && b.y + b.h > m.y) groupIds(it.id).forEach((g) => sel.add(g)); }); }
      paintSel(); return;
    }
    if (a.kind === 'draw') {
      let it = a.it;
      gLive.innerHTML = '';
      if (it.t === 'pen' && it.pts.length === 1) it.pts.push([it.pts[0][0] + 0.4, it.pts[0][1] + 0.4]);
      if (it.under) { it = straight(it); delete it.under; if (Math.hypot(it.pts[1][0] - it.pts[0][0], it.pts[1][1] - it.pts[0][1]) < 6) it.pts[1] = [it.pts[0][0] + 140, it.pts[0][1]]; }
      if (a.snapped) it = snappedItem(it, a.snapped);
      if (it.t === 'line') { if (a.bind) it.a2 = a.bind.id; delete it.curve; }
      if (it.t === 'line' && Math.hypot(it.x2 - it.x1, it.y2 - it.y1) < 6) { it.x2 = it.x1 + 140; it.y2 = it.y1; }
      if (MIN[it.t] && (it.w2 < 12 || (it.t !== 'timeline' && it.h < 12))) { it.w2 = MIN[it.t][0]; it.h = MIN[it.t][1]; if (it.t === 'shape' || it.t === 'rect' || it.t === 'ellipse') { it.x -= it.w2 / 2; it.y -= it.h / 2; } }
      snapshot(); list.push(it); paint(); emit();
      if (it.ink) queueInk(it);
      if (['sticky', 'bubble'].includes(it.t)) startEdit(it);
      if (['chart', 'timeline'].includes(it.t)) { sel = new Set([it.id]); paintSel(); }
      if (a.snapped && !seenTips.has('snap')) { seenTips.add('snap'); showTip('Forme parfaite. Elle se déplace et s\'agrandit avec l\'outil Choisir.'); }
    }
  }
  function onDbl(e) {
    if (!active) return;
    const id = hitItem(e.clientX, e.clientY);
    const it = id && byId(id);
    if (!it) { if (tool === 'select') { const [x, y] = toWorld(e.clientX, e.clientY); const t = create('text', x, y); snapshot(); list.push(t); paint(); startEdit(t); } return; }
    if (['text', 'sticky', 'bubble', 'check', 'list', 'rect', 'ellipse', 'shape'].includes(it.t)) startEdit(it);
    else if (['chart', 'timeline'].includes(it.t)) openData(it);
  }
  function onWheel(e) {
    if (mode !== 'board' || !active) return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.0022), e.clientX, e.clientY);
    else { view.x += e.deltaX / view.z; view.y += e.deltaY / view.z; fitView(); paintSel(); queueEmit(); }
  }
  function onKey(e) {
    if (!active || editing) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    if (mode === 'overlay' && !svg.contains(document.activeElement) && document.activeElement !== document.body) return;
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === ' ' && mode === 'board') { space = true; svg.dataset.tool = 'hand'; e.preventDefault(); return; }
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); command(e.shiftKey ? 'redo' : 'undo'); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); command('redo'); return; }
    if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); command('dup'); return; }
    if (mod && e.key.toLowerCase() === 'c' && sel.size) { e.preventDefault(); command('copy'); return; }
    if (mod && e.key.toLowerCase() === 'v') { e.preventDefault(); command('paste'); return; }
    if (mod && e.key.toLowerCase() === 'g') { e.preventDefault(); command(e.shiftKey ? 'ungroup' : 'group'); return; }
    if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); sel = new Set(list.map((x) => x.id)); setTool('select'); paintSel(); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel.size) { e.preventDefault(); command('del'); return; }
    if (e.key === 'Escape') { sel.clear(); closePop(); setTool('select'); return; }
    if (e.key === 'Enter' && sel.size === 1) { const it = selected()[0]; if (['text', 'sticky', 'bubble', 'check', 'list'].includes(it.t)) { e.preventDefault(); startEdit(it); } return; }
    if (!mod && !e.altKey && e.key.length === 1) { const t = TOOLS.find(([, , , k]) => k.toLowerCase() === e.key.toLowerCase()); if (t && (mode === 'board' || t[0] !== 'hand')) { setTool(t[0]); e.preventDefault(); } }
    if (sel.size && e.key.startsWith('Arrow')) { e.preventDefault(); snapshot(); const d = e.shiftKey ? 10 : 1; selected().forEach((it) => moveItem(it, e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0, e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0)); commit(); }
  }
  const onKeyUp = (e) => { if (e.key === ' ' && space) { space = false; svg.dataset.tool = tool; } };

  // ----- Clics dans les barres -----
  const barClick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tool) { setTool(b.dataset.tool); return; }
    if (b.dataset.popup) { if (!pop.hidden && pop.dataset.key === b.dataset.popup) closePop(); else { openPop(b); pop.dataset.key = b.dataset.popup; } return; }
    if (b.dataset.set) { applyProp(b.dataset.set, b.dataset.v); if (b.closest('.dw-pop')) closePop(); return; }
    if (b.dataset.tog) { toggleProp(b.dataset.tog); return; }
    if (b.dataset.step) { const its = editing ? [byId(editing.id)] : selected(); const cur = (its[0] || style[tool] || {}).size || 18; applyProp('size', Math.max(8, Math.min(200, cur + Number(b.dataset.v) * (cur >= 40 ? 4 : 1)))); return; }
    if (b.dataset.alt) { chooseAlt(+b.dataset.alt); return; }
    if (b.dataset.cmd) command(b.dataset.cmd);
  };
  const barChange = (e) => { const s2 = e.target.closest('[data-set]'); if (s2 && (s2.tagName === 'SELECT' || s2.type === 'color')) { applyProp(s2.dataset.set, s2.value); if (s2.type === 'color' && s2.closest('.dw-pop')) closePop(); } };
  const keepFocus = (e) => { if (editing && e.target.closest('button, .dw-c')) { saveRange(); e.preventDefault(); } };
  for (const el of [tools, props, selbar, pop].filter(Boolean)) { el.addEventListener('click', barClick); el.addEventListener('change', barChange); el.addEventListener('pointerdown', keepFocus); }
  selbar.addEventListener('pointerdown', (e) => e.stopPropagation());

  // ----- Zoom (tableau blanc) -----
  let zoomEl = null;
  function zoomLabel() { if (zoomEl) zoomEl.querySelector('.dw-zv').textContent = `${Math.round(view.z * 100)} %`; }
  if (mode === 'board') {
    zoomEl = document.createElement('div');
    zoomEl.className = 'dw-zoom';
    zoomEl.innerHTML = `<button type="button" data-z="out" aria-label="Dézoomer">${ic('minus')}</button><button type="button" class="dw-zv" data-z="reset" aria-label="Zoom à 100 %">100 %</button><button type="button" data-z="in" aria-label="Zoomer">${ic('plus')}</button><button type="button" data-z="fit" aria-label="Tout afficher">${ic('fit')}</button>`;
    stage.append(zoomEl);
    zoomEl.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const r = rect();
      if (b.dataset.z === 'in') zoomAt(1.25, r.left + r.width / 2, r.top + r.height / 2);
      if (b.dataset.z === 'out') zoomAt(0.8, r.left + r.width / 2, r.top + r.height / 2);
      if (b.dataset.z === 'reset') zoomAt(1 / view.z, r.left + r.width / 2, r.top + r.height / 2);
      if (b.dataset.z === 'fit') fitAll();
    });
  }
  function fitAll() {
    const r = rect();
    if (!list.length) { view = { x: 0, y: 0, z: 1 }; fitView(); return; }
    const b = itemsBox(list), m = 60;
    view.z = Math.min(2, Math.max(0.1, Math.min(r.width / (b.w + m * 2), r.height / (b.h + m * 2))));
    view.x = b.x - m - (r.width / view.z - (b.w + m * 2)) / 2; view.y = b.y - m - (r.height / view.z - (b.h + m * 2)) / 2;
    fitView(); paintSel(); queueEmit();
  }

  svg.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  svg.addEventListener('dblclick', onDbl);
  svg.addEventListener('wheel', onWheel, { passive: false });
  const noTouchScroll = (e) => { if (active) e.preventDefault(); };
  svg.addEventListener('touchstart', noTouchScroll, { passive: false });
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  const ro = new ResizeObserver(() => fitView());
  ro.observe(svg);
  svg.dataset.tool = tool;
  fitView(); paint(); toolsBar(); trayHtml(); history();

  return {
    setActive(on) { active = on; svg.classList.toggle('is-active', on); if (!on) { finishEdit(); flushInk(); sel.clear(); paintSel(); } onActive?.(on); },
    setTool,
    fitAll,
    command,
    items: () => clone(list),
    setBg(b) { bgRect.setAttribute('fill', b === 'blank' ? 'transparent' : `url(#dw-${String(b).replace(/[^a-z]/g, '')})`); },
    exportSVG: () => exportSVG(list),
    flush() { finishEdit(); flushInk(); },
    destroy() { finishEdit(); flushInk(); clearTimeout(emitT); emit(); ro.disconnect(); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp); },
  };
}

// ---------- Export : un fichier SVG autonome (fond clair), une image PNG ----------
const DEFS = '<defs><filter id="dw-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#0f1e3d" flood-opacity=".18"/></filter></defs>';
export function exportSVG(items, { pad = 40, bg = '#fffdf8', css = '' } = {}) {
  const b = itemsBox(items);
  const x = b.x - pad, y = b.y - pad, w = Math.max(200, b.w + pad * 2), h = Math.max(150, b.h + pad * 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${Math.round(w)}" height="${Math.round(h)}">${css ? `<style>${css}</style>` : ''}${DEFS}<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bg}"/>${items.map(renderItem).join('')}</svg>`;
}
// Les polices utilisées sont intégrées à l'image (sinon le texte retomberait sur une police système)
const FONT_FILES = Object.fromEntries(Object.entries(FONTS).filter(([, v]) => v[2]).map(([k, v]) => [k, [v[1].split(',')[0].replace(/['"]/g, '').trim(), v[2]]]));
async function fontCss(items) {
  const used = new Set(items.map((it) => it.font || 'sans'));
  if (items.some((it) => ['chart', 'timeline'].includes(it.t))) used.add('sans');
  let css = '';
  for (const k of used) {
    const f = FONT_FILES[k]; if (!f) continue;
    try {
      const buf = await (await fetch(new URL(`../fonts/${f[1]}`, import.meta.url))).arrayBuffer();
      let bin = ''; const u8 = new Uint8Array(buf); for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
      css += `@font-face{font-family:"${f[0]}";src:url(data:font/woff2;base64,${btoa(bin)}) format("woff2");}`;
    } catch (e) { /* police non intégrée */ }
  }
  return css;
}
export async function exportSVGFull(items) { return exportSVG(items, { css: await fontCss(items) }); }
export async function exportPNG(items, scale = 2) {
  const svgText = exportSVG(items, { css: await fontCss(items) });
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }));
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.width * scale; c.height = img.height * scale;
        const g = c.getContext('2d'); g.scale(scale, scale); g.drawImage(img, 0, 0);
        c.toBlob((blob) => { URL.revokeObjectURL(url); blob ? resolve(blob) : reject(new Error('png')); }, 'image/png');
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('svg')); };
    img.src = url;
  });
}
