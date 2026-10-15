// Moteur de dessin partagé : le tableau blanc (zoom, déplacement de la vue) et les annotations
// posées sur les pages de notes. Tout est vectoriel (SVG) : stylo, surligneur, gomme, soulignement,
// traits, flèches, formes, textes mis en forme, post-it, bulles, cases à cocher, coches, graphiques
// et frises d'évolution. Annuler / refaire, sélection multiple, poignées, raccourcis clavier.
import { ic, esc } from './ui.js';

export const INK = [['#131a2a', 'Encre'], ['#155eef', 'Bleu'], ['#0f1e3d', 'Bleu nuit'], ['#d92d20', 'Rouge'], ['#2f9e44', 'Vert'], ['#616b33', 'Olive'], ['#f08c00', 'Orange'], ['#7048e8', 'Violet'], ['#8f6420', 'Brun'], ['#ffffff', 'Blanc']];
export const MARK = [['#ffe066', 'Jaune'], ['#b2f2bb', 'Vert'], ['#a5d8ff', 'Bleu'], ['#ffc9c9', 'Rose'], ['#d0bfff', 'Violet']];
export const FILLS = [['', 'Aucun'], ['#ffffff', 'Blanc'], ['#fff3bf', 'Jaune'], ['#d3f9d8', 'Vert'], ['#dbe4ff', 'Bleu'], ['#ffe3e3', 'Rose'], ['#ede7da', 'Sable'], ['#0f1e3d', 'Bleu nuit']];
export const FONTS = { sans: ['Sans', "'Instrument Sans', 'Segoe UI', system-ui, sans-serif"], serif: ['Serif', "Fraunces, Georgia, 'Times New Roman', serif"], mono: ['Machine', 'ui-monospace, Menlo, Consolas, monospace'], hand: ['Manuscrite', "'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive"] };
// Graphiques : la palette catégorielle de l'application (validée en clair, avec étiquettes)
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];
export const TOOLS = [
  ['select', 'Sélection', 'cursor', 'V', 1], ['hand', 'Déplacer la vue', 'hand', 'H', 1],
  ['pen', 'Stylo', 'pen', 'P', 2], ['highlighter', 'Surligneur', 'highlighter', 'M', 2], ['underline', 'Souligner en rouge', 'underline', 'U', 2], ['eraser', 'Gomme', 'eraser', 'E', 2],
  ['line', 'Trait', 'line', 'L', 3], ['arrow', 'Flèche', 'arrowR', 'A', 3], ['rect', 'Carré, encadré', 'square', 'R', 3], ['ellipse', 'Cercle', 'circle', 'O', 3],
  ['text', 'Texte', 'text', 'T', 4], ['sticky', 'Post-it', 'sticky', 'N', 4], ['bubble', 'Bulle', 'message', 'B', 4], ['check', 'Case à cocher', 'checkSquare', 'C', 4], ['stamp', 'Coche, croix, étoile', 'check', 'K', 4],
  ['chart', 'Graphique', 'chart', 'G', 5], ['timeline', 'Évolution, frise', 'trend', 'J', 5],
];
const DEF = {
  pen: { c: '#131a2a', w: 3 }, highlighter: { c: '#ffe066', w: 18 }, underline: { c: '#d92d20', w: 3 },
  line: { c: '#131a2a', w: 2.5, dash: 0 }, arrow: { c: '#131a2a', w: 2.5, dash: 0 },
  rect: { c: '#155eef', w: 2.5, f: '', dash: 0 }, ellipse: { c: '#155eef', w: 2.5, f: '', dash: 0 },
  text: { c: '#131a2a', size: 22, font: 'sans', b: 0, i: 0, u: 0, frame: 0, bg: '' }, sticky: { f: '#fff3bf', size: 18, font: 'hand' }, bubble: { c: '#131a2a', f: '#ffffff', size: 18, font: 'sans' },
  check: { c: '#1baf7a' }, stamp: { c: '#2f9e44', kind: 'check' }, chart: { kind: 'bar' }, timeline: { c: '#155eef' },
};
const r1 = (n) => Math.round(n * 10) / 10;
const nid = () => 'd' + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 7);
const clone = (x) => JSON.parse(JSON.stringify(x));
const BOXY = ['rect', 'ellipse', 'text', 'sticky', 'bubble', 'chart', 'timeline'];

// ---------- Dessin de chaque élément ----------
function penPath(pts) {
  if (!pts.length) return '';
  if (pts.length < 3) { const [x, y] = pts[0]; const [x2, y2] = pts[pts.length - 1]; return `M${x} ${y}L${x2 + 0.01} ${y2}`; }
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[i + 1]; d += `Q${x1} ${y1} ${r1((x1 + x2) / 2)} ${r1((y1 + y2) / 2)}`; }
  const l = pts[pts.length - 1]; return `${d}L${l[0]} ${l[1]}`;
}
const head = (x1, y1, x2, y2, w, c) => {
  const a = Math.atan2(y2 - y1, x2 - x1), L = 10 + w * 3, s = 0.45;
  return `<path d="M${r1(x2 - L * Math.cos(a - s))} ${r1(y2 - L * Math.sin(a - s))}L${x2} ${y2}L${r1(x2 - L * Math.cos(a + s))} ${r1(y2 - L * Math.sin(a + s))}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
};
const textHtml = (it) => (it.txt ? esc(it.txt).replace(/\n/g, '<br>') : '');
const fo = (it, x, y, w, h, extra = '') => {
  const font = FONTS[it.font || 'sans']?.[1] || FONTS.sans[1];
  const st = `font-family:${font};font-size:${it.size || 18}px;color:${it.c || '#131a2a'};font-weight:${it.b ? 700 : 400};font-style:${it.i ? 'italic' : 'normal'};text-decoration:${it.u ? `underline ${it.uc || it.c || '#131a2a'} 2px` : 'none'};text-align:${it.al || 'left'};${it.frame ? `border:2px solid ${it.c || '#131a2a'};border-radius:8px;padding:8px 10px;` : ''}${extra}`;
  return `<foreignObject x="${x}" y="${y}" width="${Math.max(10, w)}" height="${Math.max(10, h)}"><div xmlns="http://www.w3.org/1999/xhtml" class="dw-t" style="${st}">${it.bg && it.txt ? `<span style="background:${it.bg};padding:1px 3px;border-radius:3px;-webkit-box-decoration-break:clone;box-decoration-break:clone">${textHtml(it)}</span>` : textHtml(it)}</div></foreignObject>`;
};
function chartSvg(it) {
  const { x, y, w, h } = it;
  const data = (it.data || []).filter((d) => d && (d.l || d.v));
  const pad = 14, top = it.title ? 34 : 14, bottom = it.kind === 'pie' ? 14 : 30;
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#ffffff" stroke="#e3ddd1"/>`;
  if (it.title) out += `<text x="${x + pad}" y="${y + 22}" font-family='"Instrument Sans", system-ui, sans-serif' font-size="14" font-weight="700" fill="#131a2a">${esc(it.title)}</text>`;
  if (!data.length) return out + `<text x="${x + w / 2}" y="${y + h / 2}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" fill="#676d7e">Double-cliquez pour saisir les données</text>`;
  const max = Math.max(1, ...data.map((d) => Number(d.v) || 0));
  const fmt = (v) => String(Math.round((Number(v) || 0) * 100) / 100).replace('.', ',');
  const lbl = `font-family='"Instrument Sans", system-ui, sans-serif' font-size="11.5" fill="#394155"`;
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
    const P = data.map((d, i) => [r1(px + slot * i + slot / 2), r1(py + ph - ((Number(d.v) || 0) / max) * ph)]);
    out += `<path d="${P.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join('')}" fill="none" stroke="${SERIES[0]}" stroke-width="2.5" stroke-linejoin="round"/>`;
    P.forEach((p, i) => { out += `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${SERIES[0]}" stroke="#ffffff" stroke-width="2"/><text x="${p[0]}" y="${p[1] - 10}" text-anchor="middle" ${lbl} font-weight="600">${fmt(data[i].v)}</text>`; });
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
  if (!steps.length) return out + `<text x="${x + w / 2}" y="${midY + 30}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" fill="#676d7e">Double-cliquez pour ajouter les étapes</text>`;
  steps.forEach((s, i) => {
    const sx = r1(x + 24 + ((w - 64) * (n === 1 ? 0.5 : i / (n - 1)))), up = i % 2 === 0;
    out += `<circle cx="${sx}" cy="${midY}" r="8" fill="#ffffff" stroke="${c}" stroke-width="3"/>`;
    out += `<text x="${sx}" y="${up ? midY - 30 : midY + 42}" text-anchor="middle" font-family='"Instrument Sans", system-ui, sans-serif' font-size="14" font-weight="700" fill="#131a2a">${esc(String(s.l || '').slice(0, 26))}</text>`;
    if (s.d) out += `<text x="${sx}" y="${up ? midY - 14 : midY + 26}" text-anchor="middle" font-family='"Instrument Sans", system-ui, sans-serif' font-size="12" fill="#676d7e">${esc(String(s.d).slice(0, 20))}</text>`;
  });
  return out;
}
const STAMPS = {
  check: (s, c) => `<path d="M${s * 0.16} ${s * 0.55}L${s * 0.42} ${s * 0.8}L${s * 0.86} ${s * 0.2}" fill="none" stroke="${c}" stroke-width="${s * 0.13}" stroke-linecap="round" stroke-linejoin="round"/>`,
  cross: (s, c) => `<path d="M${s * 0.2} ${s * 0.2}L${s * 0.8} ${s * 0.8}M${s * 0.8} ${s * 0.2}L${s * 0.2} ${s * 0.8}" fill="none" stroke="${c}" stroke-width="${s * 0.13}" stroke-linecap="round"/>`,
  star: (s, c) => { const p = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? s * 0.2 : s * 0.48; return `${r1(s / 2 + r * Math.cos(a))} ${r1(s / 2 + r * Math.sin(a))}`; }); return `<path d="M${p.join('L')}Z" fill="${c}"/>`; },
  question: (s, c) => `<circle cx="${s / 2}" cy="${s / 2}" r="${s * 0.46}" fill="${c}"/><text x="${s / 2}" y="${s * 0.68}" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="${s * 0.56}" fill="#ffffff">?</text>`,
  important: (s, c) => `<circle cx="${s / 2}" cy="${s / 2}" r="${s * 0.46}" fill="${c}"/><text x="${s / 2}" y="${s * 0.7}" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="${s * 0.6}" fill="#ffffff">!</text>`,
};
// Un élément peut venir d'une sauvegarde importée : couleurs, nombres et choix sont vérifiés avant d'être écrits dans le SVG
const SAFE_C = /^(#[0-9a-f]{3,8}|transparent|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(,\s*[\d.]+\s*)?\))$/i;
const NUMS = ['x', 'y', 'w', 'h', 'w2', 'x1', 'y1', 'x2', 'y2', 's', 'size', 'o', 'round', 'dash', 'arrow'];
function safe(raw) {
  const it = { ...raw };
  for (const k of ['c', 'f', 'bg', 'tc', 'uc']) if (it[k] != null && it[k] !== '' && !SAFE_C.test(String(it[k]))) it[k] = k === 'f' || k === 'bg' ? '' : '#131a2a';
  for (const k of NUMS) if (it[k] != null) it[k] = Number.isFinite(+it[k]) ? +it[k] : 0;
  it.id = String(it.id || '').replace(/[^\w-]/g, '');
  if (it.font && !FONTS[it.font]) it.font = 'sans';
  if (it.al && !['left', 'center', 'right'].includes(it.al)) it.al = 'left';
  if (it.kind != null && !/^[a-z]{2,12}$/.test(it.kind)) it.kind = '';
  if (it.pts) it.pts = (Array.isArray(it.pts) ? it.pts : []).map((p) => [+p[0] || 0, +p[1] || 0]);
  return it;
}

export function renderItem(raw) {
  const it = safe(raw);
  const hit =(inner, w) => `<g class="dw-i" data-id="${it.id}">${inner}${w ? '' : ''}</g>`;
  switch (it.t) {
    case 'pen': {
      const d = penPath(it.pts || []);
      const hl = it.hl ? ' style="mix-blend-mode:multiply"' : '';
      return hit(`<path d="${d}" fill="none" stroke="transparent" stroke-width="${(it.w || 3) + 14}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${it.c}" stroke-width="${it.w}" stroke-linecap="round" stroke-linejoin="round" opacity="${it.o ?? 1}"${hl}/>`);
    }
    case 'line': {
      const dash = it.dash ? ` stroke-dasharray="${it.w * 3} ${it.w * 2.4}"` : '';
      return hit(`<line x1="${it.x1}" y1="${it.y1}" x2="${it.x2}" y2="${it.y2}" stroke="transparent" stroke-width="${it.w + 14}"/><line x1="${it.x1}" y1="${it.y1}" x2="${it.x2}" y2="${it.y2}" stroke="${it.c}" stroke-width="${it.w}" stroke-linecap="round"${dash}/>${it.arrow ? head(it.x1, it.y1, it.x2, it.y2, it.w, it.c) : ''}${it.arrow === 2 ? head(it.x2, it.y2, it.x1, it.y1, it.w, it.c) : ''}`);
    }
    case 'rect': case 'ellipse': {
      const dash = it.dash ? ` stroke-dasharray="${it.w * 3} ${it.w * 2.4}"` : '';
      const common = `fill="${it.f || 'transparent'}" stroke="${it.c}" stroke-width="${it.w}"${dash}`;
      const shape = it.t === 'rect' ? `<rect x="${it.x}" y="${it.y}" width="${Math.max(1, it.w2)}" height="${Math.max(1, it.h)}" rx="${it.round ?? 8}" ${common}/>` : `<ellipse cx="${r1(it.x + it.w2 / 2)}" cy="${r1(it.y + it.h / 2)}" rx="${Math.max(1, it.w2 / 2)}" ry="${Math.max(1, it.h / 2)}" ${common}/>`;
      return hit(`${shape}${it.txt ? fo({ ...it, c: it.tc || '#131a2a', frame: 0, bg: '' }, it.x + 8, it.y + 8, it.w2 - 16, it.h - 16, 'display:flex;align-items:center;justify-content:center;text-align:center;height:100%;') : ''}`);
    }
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
    case 'stamp': return hit(`<g transform="translate(${it.x} ${it.y})"><rect width="${it.s}" height="${it.s}" fill="transparent"/>${(Object.hasOwn(STAMPS, it.kind) ? STAMPS[it.kind] : STAMPS.check)(it.s, it.c)}</g>`);
    case 'chart': return hit(chartSvg({ ...it, w: it.w2 }));
    case 'timeline': return hit(`<rect x="${it.x}" y="${it.y}" width="${it.w2}" height="${it.h}" fill="transparent"/>${timelineSvg({ ...it, w: it.w2 })}`);
    default: return '';
  }
}
// Boîte englobante (coordonnées du monde)
export function bbox(it) {
  if (it.t === 'pen') { const xs = it.pts.map((p) => p[0]), ys = it.pts.map((p) => p[1]); const m = (it.w || 3) / 2; return { x: Math.min(...xs) - m, y: Math.min(...ys) - m, w: Math.max(...xs) - Math.min(...xs) + m * 2, h: Math.max(...ys) - Math.min(...ys) + m * 2 }; }
  if (it.t === 'line') return { x: Math.min(it.x1, it.x2), y: Math.min(it.y1, it.y2), w: Math.abs(it.x2 - it.x1), h: Math.abs(it.y2 - it.y1) };
  if (it.t === 'check') return { x: it.x, y: it.y, w: (it.s || 28) + (it.txt ? 10 + (it.w2 || 220) : 0), h: it.s || 28 };
  if (it.t === 'stamp') return { x: it.x, y: it.y, w: it.s, h: it.s };
  if (it.t === 'bubble') return { x: it.x, y: it.y, w: it.w2, h: it.h + 22 };
  return { x: it.x, y: it.y, w: it.w2, h: it.h };
}
export function itemsBox(items) {
  if (!items.length) return { x: 0, y: 0, w: 800, h: 500 };
  const bs = items.map(bbox);
  const x = Math.min(...bs.map((b) => b.x)), y = Math.min(...bs.map((b) => b.y));
  return { x, y, w: Math.max(...bs.map((b) => b.x + b.w)) - x, h: Math.max(...bs.map((b) => b.y + b.h)) - y };
}
function moveItem(it, dx, dy) {
  if (it.t === 'pen') it.pts = it.pts.map(([x, y]) => [r1(x + dx), r1(y + dy)]);
  else if (it.t === 'line') { it.x1 = r1(it.x1 + dx); it.y1 = r1(it.y1 + dy); it.x2 = r1(it.x2 + dx); it.y2 = r1(it.y2 + dy); }
  else { it.x = r1(it.x + dx); it.y = r1(it.y + dy); }
}
// Redimensionner d'après l'ancienne boîte et la nouvelle
function scaleItem(it, o, from, to) {
  const sx = to.w / Math.max(1, from.w), sy = to.h / Math.max(1, from.h);
  const X = (x) => r1(to.x + (x - from.x) * sx), Y = (y) => r1(to.y + (y - from.y) * sy);
  if (it.t === 'pen') it.pts = o.pts.map(([x, y]) => [X(x), Y(y)]);
  else if (it.t === 'line') { it.x1 = X(o.x1); it.y1 = Y(o.y1); it.x2 = X(o.x2); it.y2 = Y(o.y2); }
  else if (it.t === 'check' || it.t === 'stamp') { it.x = X(o.x); it.y = Y(o.y); it.s = Math.max(14, r1((o.s || 28) * Math.min(sx, sy))); }
  else { it.x = X(o.x); it.y = Y(o.y); it.w2 = Math.max(20, r1(o.w2 * sx)); it.h = Math.max(it.t === 'timeline' ? 120 : 20, r1(o.h * sy)); }
}

// ---------- Montage d'une zone de dessin ----------
// stage : élément qui reçoit le SVG ; tools / props : barres d'outils ; mode : 'board' ou 'overlay'
export function mountCanvas({ stage, tools, props, mode = 'board', items = [], cam = { x: 0, y: 0, z: 1 }, bg = 'dots', onChange, onEditData, onActive }) {
  let list = clone(items);
  let view = { ...cam };
  let tool = 'select';
  let sel = new Set();
  let style = clone(DEF);
  const undoS = [], redoS = [];
  let action = null, editing = null, space = false, active = mode === 'board';
  const pointers = new Map();
  stage.innerHTML = `<svg class="dw-svg" xmlns="http://www.w3.org/2000/svg" tabindex="0" aria-label="${mode === 'board' ? 'Tableau blanc' : 'Annotations de la page'}">
    <defs><pattern id="dw-dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.3" fill="#d9d2c4"/></pattern><pattern id="dw-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#e6e0d4" stroke-width="1"/></pattern><pattern id="dw-lines" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M0 31.5H32" fill="none" stroke="#dbe4ff" stroke-width="1.2"/></pattern></defs>
    <rect class="dw-bg" fill="${bg === 'blank' ? 'transparent' : `url(#dw-${String(bg).replace(/[^a-z]/g, '')})`}"/><g class="dw-items"></g><g class="dw-live"></g><g class="dw-selg"></g>
  </svg>`;
  const svg = stage.querySelector('svg');
  const gItems = svg.querySelector('.dw-items'), gLive = svg.querySelector('.dw-live'), gSel = svg.querySelector('.dw-selg'), bgRect = svg.querySelector('.dw-bg');
  const emit = () => onChange?.(clone(list), { ...view });
  const snapshot = () => { undoS.push(JSON.stringify(list)); if (undoS.length > 80) undoS.shift(); redoS.length = 0; };
  const byId = (id) => list.find((x) => x.id === id);
  const selected = () => list.filter((x) => sel.has(x.id));

  // Vue
  const rect = () => svg.getBoundingClientRect();
  function fitView() {
    const r = rect();
    if (mode === 'overlay') view = { x: 0, y: 0, z: r.width / 1000 || 1 };
    const w = r.width / view.z, h = r.height / view.z;
    svg.setAttribute('viewBox', `${r1(view.x)} ${r1(view.y)} ${r1(w)} ${r1(h)}`);
    bgRect.setAttribute('x', view.x - 2); bgRect.setAttribute('y', view.y - 2); bgRect.setAttribute('width', w + 4); bgRect.setAttribute('height', h + 4);
    zoomLabel();
  }
  const toWorld = (cx, cy) => { const r = rect(); return [r1(view.x + (cx - r.left) / view.z), r1(view.y + (cy - r.top) / view.z)]; };
  const toScreen = (x, y) => { const r = rect(); return [r.left + (x - view.x) * view.z, r.top + (y - view.y) * view.z]; };
  function zoomAt(f, cx, cy) {
    const [wx, wy] = toWorld(cx, cy);
    view.z = Math.min(4, Math.max(0.15, view.z * f));
    const r = rect();
    view.x = wx - (cx - r.left) / view.z; view.y = wy - (cy - r.top) / view.z;
    fitView(); paintSel(); queueEmit();
  }

  // Rendu
  function paint() { gItems.innerHTML = list.map(renderItem).join(''); paintSel(); }
  function paintSel() {
    if (!sel.size || editing) { gSel.innerHTML = ''; propsBar(); return; }
    const its = selected();
    const k = 1 / view.z;
    let out = '';
    if (its.length === 1 && its[0].t === 'line') {
      const it = its[0];
      out = [['p1', it.x1, it.y1], ['p2', it.x2, it.y2]].map(([h, x, y]) => `<circle class="dw-h" data-h="${h}" cx="${x}" cy="${y}" r="${7 * k}" stroke-width="${2 * k}"/>`).join('');
    } else {
      const b = itemsBox(its), m = 6 * k;
      out = `<rect class="dw-box" x="${b.x - m}" y="${b.y - m}" width="${b.w + m * 2}" height="${b.h + m * 2}" stroke-width="${1.5 * k}" stroke-dasharray="${5 * k} ${4 * k}"/>`;
      out += [['nw', b.x - m, b.y - m], ['ne', b.x + b.w + m, b.y - m], ['sw', b.x - m, b.y + b.h + m], ['se', b.x + b.w + m, b.y + b.h + m]].map(([h, x, y]) => `<rect class="dw-h" data-h="${h}" x="${x - 6 * k}" y="${y - 6 * k}" width="${12 * k}" height="${12 * k}" rx="${3 * k}" stroke-width="${2 * k}"/>`).join('');
    }
    gSel.innerHTML = out;
    propsBar();
  }
  let emitT = 0;
  const queueEmit = () => { clearTimeout(emitT); emitT = setTimeout(emit, 250); };
  const commit = () => { paint(); emit(); };

  // Barre d'outils
  function toolsBar() {
    if (!tools) return;
    let g = 0;
    tools.innerHTML = TOOLS.filter(([id]) => mode === 'board' || id !== 'hand').map(([id, label, icon, key, grp]) => { const sep = grp !== g && g ? '<i class="dw-sep"></i>' : ''; g = grp; return `${sep}<button type="button" class="dw-tool ${tool === id ? 'is-on' : ''}" data-tool="${id}" title="${label} (${key})" aria-label="${label}" aria-pressed="${tool === id}">${ic(icon)}</button>`; }).join('')
      + `<i class="dw-sep"></i><button type="button" class="dw-tool" data-cmd="undo" title="Annuler (Ctrl Z)" aria-label="Annuler" ${undoS.length ? '' : 'disabled'}>${ic('undo')}</button><button type="button" class="dw-tool" data-cmd="redo" title="Rétablir (Ctrl Y)" aria-label="Rétablir" ${redoS.length ? '' : 'disabled'}>${ic('redo')}</button>`;
  }
  const swatches = (key, list2, cur, cls = '') => `<span class="dw-sw ${cls}">${list2.map(([c, n]) => `<button type="button" class="dw-c ${String(cur) === c ? 'is-on' : ''} ${c === '' ? 'is-none' : ''}" data-set="${key}" data-v="${c}" title="${n}" aria-label="${n}" style="--c:${c || 'transparent'}"></button>`).join('')}</span>`;
  function propsBar() {
    if (!props) return;
    const its = selected();
    const t = its.length ? its[0].t === 'pen' ? (its[0].hl ? 'highlighter' : 'pen') : its[0].t === 'line' ? (its[0].arrow ? 'arrow' : 'line') : its[0].t : tool;
    const st = its.length ? its[0] : style[t] || {};
    const has = (k) => (its.length ? its.every((x) => k in x || ['c', 'f'].includes(k)) : k in (style[t] || {}));
    let html = '';
    if (['pen', 'underline', 'line', 'arrow', 'rect', 'ellipse', 'bubble', 'check', 'stamp', 'timeline', 'text'].includes(t)) html += swatches('c', INK, st.c);
    if (t === 'highlighter') html += swatches('c', MARK, st.c);
    if (['pen', 'highlighter', 'underline', 'line', 'arrow', 'rect', 'ellipse'].includes(t)) html += `<label class="dw-f">${ic('line')}<select data-set="w" aria-label="Épaisseur">${[1, 2, 2.5, 3, 5, 8, 12, 18, 26].map((w) => `<option value="${w}" ${Number(st.w) === w ? 'selected' : ''}>${w}</option>`).join('')}</select></label>`;
    if (['rect', 'ellipse', 'sticky', 'bubble'].includes(t)) html += `<span class="dw-lbl">Fond</span>${swatches('f', t === 'sticky' ? FILLS.slice(1) : FILLS, st.f || '')}`;
    if (['line', 'arrow', 'rect', 'ellipse'].includes(t)) html += `<button type="button" class="dw-tog ${st.dash ? 'is-on' : ''}" data-tog="dash" title="Pointillés">┄</button>`;
    if (t === 'arrow' || (t === 'line' && its.length)) html += `<button type="button" class="dw-tog ${st.arrow === 2 ? 'is-on' : ''}" data-tog="arrow2" title="Double flèche">↔</button>`;
    if (['text', 'sticky', 'bubble', 'check', 'rect', 'ellipse'].includes(t)) {
      html += `<label class="dw-f"><select data-set="font" aria-label="Police">${Object.entries(FONTS).map(([k, [n]]) => `<option value="${k}" ${(st.font || 'sans') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`;
      html += `<label class="dw-f"><select data-set="size" aria-label="Taille">${[12, 14, 16, 18, 22, 28, 36, 48, 64].map((s) => `<option value="${s}" ${Number(st.size || 18) === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>`;
      html += ['b', 'i', 'u'].map((k) => `<button type="button" class="dw-tog ${st[k] ? 'is-on' : ''}" data-tog="${k}" title="${{ b: 'Gras', i: 'Italique', u: 'Souligné' }[k]}">${ic({ b: 'bold', i: 'italic', u: 'underline' }[k])}</button>`).join('');
    }
    if (t === 'text') {
      html += `<button type="button" class="dw-tog ${st.frame ? 'is-on' : ''}" data-tog="frame" title="Encadrer">${ic('frame')}</button><button type="button" class="dw-tog" data-tog="al" title="Alignement">${ic('align')}</button>`;
      html += `<span class="dw-lbl">Surligner</span>${swatches('bg', [['', 'Aucun'], ...MARK], st.bg || '')}`;
    }
    if (t === 'stamp') html += `<label class="dw-f"><select data-set="kind" aria-label="Symbole">${[['check', '✓ Coche'], ['cross', '✗ Croix'], ['star', '★ Étoile'], ['question', '? Question'], ['important', '! Important']].map(([k, n]) => `<option value="${k}" ${st.kind === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`;
    if (t === 'chart') html += `<label class="dw-f"><select data-set="kind" aria-label="Type de graphique">${[['bar', 'Barres'], ['line', 'Courbe'], ['pie', 'Secteurs']].map(([k, n]) => `<option value="${k}" ${(st.kind || 'bar') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`;
    if (its.length === 1 && ['chart', 'timeline'].includes(its[0].t)) html += `<button type="button" class="dw-btn" data-cmd="data">${ic('edit')}<span>Données</span></button>`;
    if (its.length) html += `<i class="dw-sep"></i><button type="button" class="dw-tog" data-cmd="front" title="Premier plan">⤒</button><button type="button" class="dw-tog" data-cmd="back" title="Arrière-plan">⤓</button><button type="button" class="dw-tog" data-cmd="dup" title="Dupliquer (Ctrl D)">${ic('copy')}</button><button type="button" class="dw-tog is-danger" data-cmd="del" title="Supprimer (Suppr)">${ic('trash')}</button>`;
    if (!html) html = `<span class="dw-hint">${{ select: 'Cliquez pour choisir un élément, glissez pour en choisir plusieurs. Double-cliquez sur un texte pour l\'écrire.', hand: 'Glissez pour déplacer la vue. Molette + Ctrl pour zoomer.', eraser: 'Passez sur un trait ou une forme pour l\'effacer.' }[t] || ''}</span>`;
    props.innerHTML = html;
    has('c');
  }
  function applyProp(k, v) {
    const its = selected();
    const t = tool;
    const fix = (o) => {
      if (k === 'w' || k === 'size') o[k] = Number(v);
      else o[k] = v;
    };
    if (its.length) { snapshot(); its.forEach((it) => { if (k === 'c' && it.t === 'pen' && it.hl) it.c = v; else fix(it); }); commit(); }
    else if (style[t]) fix(style[t]);
    propsBar(); toolsBar();
  }
  function toggleProp(k) {
    const its = selected();
    const flip = (o) => {
      if (k === 'arrow2') o.arrow = o.arrow === 2 ? 1 : 2;
      else if (k === 'al') o.al = o.al === 'center' ? 'right' : o.al === 'right' ? 'left' : 'center';
      else o[k] = o[k] ? 0 : 1;
    };
    if (its.length) { snapshot(); its.forEach(flip); commit(); } else if (style[tool]) flip(style[tool]);
    propsBar();
  }
  function setTool(t) { finishEdit(); tool = t; if (t !== 'select') sel.clear(); svg.dataset.tool = t; toolsBar(); paintSel(); }
  function command(c) {
    if (c === 'undo' && undoS.length) { redoS.push(JSON.stringify(list)); list = JSON.parse(undoS.pop()); sel.clear(); commit(); toolsBar(); }
    if (c === 'redo' && redoS.length) { undoS.push(JSON.stringify(list)); list = JSON.parse(redoS.pop()); sel.clear(); commit(); toolsBar(); }
    if (c === 'del' && sel.size) { snapshot(); list = list.filter((x) => !sel.has(x.id)); sel.clear(); commit(); toolsBar(); }
    if (c === 'dup' && sel.size) { snapshot(); const copies = selected().map((x) => { const y = clone(x); y.id = nid(); moveItem(y, 24, 24); return y; }); list.push(...copies); sel = new Set(copies.map((x) => x.id)); commit(); }
    if (c === 'front' && sel.size) { snapshot(); list = [...list.filter((x) => !sel.has(x.id)), ...selected()]; commit(); }
    if (c === 'back' && sel.size) { snapshot(); list = [...selected(), ...list.filter((x) => !sel.has(x.id))]; commit(); }
    if (c === 'data') { const it = selected()[0]; if (it) openData(it); }
  }
  function openData(it) {
    onEditData?.(clone(it), (patch) => { snapshot(); Object.assign(byId(it.id) || {}, patch); commit(); });
  }

  // Texte : un champ posé sur l'élément, à la bonne taille
  function startEdit(it) {
    finishEdit();
    const b = bbox(it);
    const [sx, sy] = toScreen(it.t === 'check' ? it.x + (it.s || 28) + 10 : b.x, b.y);
    const sr = stage.getBoundingClientRect();
    const ta = document.createElement('textarea');
    ta.className = 'dw-edit';
    ta.value = it.txt || '';
    ta.placeholder = it.t === 'check' ? 'À faire…' : 'Écrivez…';
    const font = FONTS[it.font || 'sans']?.[1] || FONTS.sans[1];
    const pad = it.t === 'sticky' ? 12 : it.t === 'bubble' ? 14 : it.t === 'text' && it.frame ? 10 : 0;
    Object.assign(ta.style, {
      left: `${sx - sr.left + pad * view.z}px`, top: `${sy - sr.top + pad * view.z}px`,
      width: `${Math.max(120, ((it.t === 'check' ? it.w2 || 220 : b.w) - pad * 2) * view.z)}px`, minHeight: `${Math.max(30, ((it.t === 'check' ? it.s || 28 : b.h) - pad * 2) * view.z)}px`,
      fontFamily: font, fontSize: `${(it.size || 18) * view.z}px`, fontWeight: it.b ? 700 : 400, fontStyle: it.i ? 'italic' : 'normal', color: it.t === 'check' ? '#131a2a' : it.c || '#131a2a', textAlign: it.al || 'left',
    });
    stage.append(ta);
    editing = { id: it.id, ta, before: it.txt || '' };
    gSel.innerHTML = '';
    const fit = () => { ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight}px`; };
    ta.addEventListener('input', fit);
    ta.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); finishEdit(); } e.stopPropagation(); });
    ta.addEventListener('blur', () => setTimeout(() => { if (editing?.ta === ta) finishEdit(); }, 60));
    requestAnimationFrame(() => { fit(); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); });
  }
  function finishEdit() {
    if (!editing) return;
    const { id, ta, before } = editing; editing = null;
    const it = byId(id);
    const v = ta.value.replace(/\s+$/, '');
    if (it) {
      if (v !== before) { undoS.push(JSON.stringify(list.map((x) => (x.id === id ? { ...x, txt: before } : x)))); redoS.length = 0; }
      if (!v && it.t === 'text') list = list.filter((x) => x.id !== id);
      else {
        it.txt = v;
        if (it.t === 'text') it.h = Math.max(it.size * 1.5, r1(ta.scrollHeight / view.z + (it.frame ? 20 : 0)));
        if (['sticky', 'bubble'].includes(it.t)) it.h = Math.max(it.h, r1(ta.scrollHeight / view.z + 24));
      }
    }
    ta.remove(); commit(); toolsBar();
  }

  // Création selon l'outil
  function create(t, x, y) {
    const s = style[t] || {};
    const id = nid();
    if (t === 'pen' || t === 'highlighter') return { id, t: 'pen', pts: [[x, y]], c: s.c, w: s.w, o: t === 'highlighter' ? 0.45 : 1, hl: t === 'highlighter' ? 1 : 0 };
    if (t === 'underline') return { id, t: 'line', x1: x, y1: y, x2: x, y2: y, c: s.c, w: s.w, arrow: 0, dash: 0, under: 1 };
    if (t === 'line' || t === 'arrow') return { id, t: 'line', x1: x, y1: y, x2: x, y2: y, c: s.c, w: s.w, arrow: t === 'arrow' ? 1 : 0, dash: s.dash || 0 };
    if (t === 'rect' || t === 'ellipse') return { id, t, x, y, w2: 0, h: 0, c: s.c, w: s.w, f: s.f || '', dash: s.dash || 0, size: 18, font: 'sans' };
    if (t === 'text') return { id, t: 'text', x, y, w2: 320, h: 36, txt: '', c: s.c, size: s.size, font: s.font, b: s.b, i: s.i, u: s.u, frame: s.frame, bg: s.bg };
    if (t === 'sticky') return { id, t: 'sticky', x, y, w2: 0, h: 0, txt: '', f: s.f, size: s.size, font: s.font, c: '#131a2a' };
    if (t === 'bubble') return { id, t: 'bubble', x, y, w2: 0, h: 0, txt: '', f: s.f, c: s.c, size: s.size, font: s.font };
    if (t === 'check') return { id, t: 'check', x, y, s: 26, c: s.c, done: 0, txt: '', w2: 260, size: 18 };
    if (t === 'stamp') return { id, t: 'stamp', x: x - 18, y: y - 18, s: 36, c: s.c, kind: s.kind };
    if (t === 'chart') return { id, t: 'chart', x, y, w2: 0, h: 0, kind: s.kind || 'bar', title: 'Mon graphique', data: [{ l: 'Lun', v: 3 }, { l: 'Mar', v: 5 }, { l: 'Mer', v: 4 }, { l: 'Jeu', v: 7 }] };
    if (t === 'timeline') return { id, t: 'timeline', x, y, w2: 0, h: 120, c: s.c, steps: [{ l: 'Début', d: '' }, { l: 'Étape 2', d: '' }, { l: 'Aujourd\'hui', d: '' }] };
    return null;
  }
  const MIN = { rect: [140, 90], ellipse: [120, 120], sticky: [200, 160], bubble: [240, 90], chart: [380, 240], timeline: [560, 120] };

  // ---------- Pointeur ----------
  const hitItem = (cx, cy) => {
    for (const el of document.elementsFromPoint(cx, cy)) { if (!svg.contains(el)) continue; const g = el.closest('.dw-i'); if (g) return g.dataset.id; }
    return null;
  };
  function onDown(e) {
    if (!active) return;
    if (e.target.closest('.dw-edit')) return;
    svg.focus({ preventScroll: true });
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    try { svg.setPointerCapture(e.pointerId); } catch (err) { /* pointeur déjà relâché */ }
    if (pointers.size === 2 && mode === 'board') { const [a, b] = [...pointers.values()]; action = { kind: 'pinch', d: Math.hypot(a[0] - b[0], a[1] - b[1]), mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2 }; gLive.innerHTML = ''; return; }
    if (pointers.size > 1) return;
    if (editing) finishEdit();
    const [x, y] = toWorld(e.clientX, e.clientY);
    if (mode === 'board' && (tool === 'hand' || space || e.button === 1)) { action = { kind: 'pan', cx: e.clientX, cy: e.clientY, vx: view.x, vy: view.y }; return; }
    if (tool === 'select') {
      const h = e.target.closest('.dw-h');
      if (h) { snapshot(); const its = selected(); action = { kind: 'resize', h: h.dataset.h, from: itemsBox(its), orig: its.map(clone), sx: x, sy: y }; return; }
      const id = hitItem(e.clientX, e.clientY);
      if (id) {
        if (e.shiftKey) { if (sel.has(id)) sel.delete(id); else sel.add(id); } else if (!sel.has(id)) sel = new Set([id]);
        paintSel();
        action = { kind: 'move', sx: x, sy: y, lx: x, ly: y, moved: false, id };
        return;
      }
      if (!e.shiftKey) sel.clear();
      action = { kind: 'marquee', sx: x, sy: y }; paintSel();
      return;
    }
    if (tool === 'eraser') { action = { kind: 'erase', done: false }; eraseAt(e.clientX, e.clientY); return; }
    const it = create(tool, x, y);
    if (!it) return;
    if (['check', 'stamp', 'text'].includes(tool)) {
      snapshot(); list.push(it); paint();
      if (tool === 'text' || tool === 'check') startEdit(it); else emit();
      toolsBar();
      return;
    }
    action = { kind: 'draw', it, sx: x, sy: y };
  }
  function eraseAt(cx, cy) {
    const id = hitItem(cx, cy);
    if (!id) return;
    if (!action?.done) { snapshot(); action.done = true; }
    list = list.filter((x) => x.id !== id); paint();
  }
  function onMove(e) {
    if (!pointers.has(e.pointerId)) {
      if (active && tool === 'eraser') svg.style.cursor = '';
      return;
    }
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
    const [x, y] = toWorld(e.clientX, e.clientY);
    if (action.kind === 'erase') { eraseAt(e.clientX, e.clientY); return; }
    if (action.kind === 'move') {
      const dx = x - action.lx, dy = y - action.ly;
      if (!action.moved && Math.hypot(x - action.sx, y - action.sy) * view.z < 3) return;
      if (!action.moved) { snapshot(); action.moved = true; }
      selected().forEach((it) => moveItem(it, dx, dy));
      action.lx = x; action.ly = y; paint();
      return;
    }
    if (action.kind === 'resize') {
      const f = action.from; let { x: X1, y: Y1 } = f; let X2 = f.x + f.w, Y2 = f.y + f.h;
      const its = selected();
      if (action.h === 'p1' || action.h === 'p2') { const it = its[0]; if (action.h === 'p1') { it.x1 = x; it.y1 = y; } else { it.x2 = x; it.y2 = y; } paint(); return; }
      if (action.h.includes('w')) X1 = Math.min(x, X2 - 10); if (action.h.includes('e')) X2 = Math.max(x, X1 + 10);
      if (action.h.includes('n')) Y1 = Math.min(y, Y2 - 10); if (action.h.includes('s')) Y2 = Math.max(y, Y1 + 10);
      if (e.shiftKey) { const k = Math.max((X2 - X1) / f.w, (Y2 - Y1) / f.h); if (action.h.includes('w')) X1 = X2 - f.w * k; else X2 = X1 + f.w * k; if (action.h.includes('n')) Y1 = Y2 - f.h * k; else Y2 = Y1 + f.h * k; }
      const to = { x: X1, y: Y1, w: X2 - X1, h: Y2 - Y1 };
      its.forEach((it, i) => { const o = action.orig[i]; const ob = bbox(o); const nb = { x: to.x + (ob.x - f.x) * (to.w / f.w), y: to.y + (ob.y - f.y) * (to.h / f.h), w: ob.w * (to.w / f.w), h: ob.h * (to.h / f.h) }; scaleItem(it, o, ob, nb); });
      paint();
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
      if (it.t === 'pen') { const l = it.pts[it.pts.length - 1]; if (Math.hypot(x - l[0], y - l[1]) * view.z > 1.6) it.pts.push([x, y]); }
      else if (it.t === 'line') { it.x2 = x; it.y2 = y; if (it.under) it.y2 = it.y1; else if (e.shiftKey) { const a = Math.round(Math.atan2(y - it.y1, x - it.x1) / (Math.PI / 4)) * (Math.PI / 4), L = Math.hypot(x - it.x1, y - it.y1); it.x2 = r1(it.x1 + L * Math.cos(a)); it.y2 = r1(it.y1 + L * Math.sin(a)); } }
      else { let w = x - action.sx, h = y - action.sy; if (e.shiftKey) { const m = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m; } it.x = Math.min(action.sx, action.sx + w); it.y = Math.min(action.sy, action.sy + h); it.w2 = Math.abs(w); it.h = it.t === 'timeline' ? 120 : Math.abs(h); }
      gLive.innerHTML = renderItem(it);
    }
  }
  function onUp(e) {
    pointers.delete(e.pointerId);
    if (!action) return;
    const a = action;
    if (a.kind === 'pinch') { if (pointers.size < 2) { action = null; queueEmit(); } return; }
    action = null;
    gLive.innerHTML = '';
    if (a.kind === 'pan') { queueEmit(); return; }
    if (a.kind === 'erase') { if (a.done) { emit(); toolsBar(); } return; }
    if (a.kind === 'move') {
      if (a.moved) { emit(); toolsBar(); }
      else { const it = byId(a.id); if (it?.t === 'check' && sel.size === 1) { snapshot(); it.done = it.done ? 0 : 1; commit(); } }
      return;
    }
    if (a.kind === 'resize') { emit(); toolsBar(); return; }
    if (a.kind === 'marquee') {
      if (a.x !== undefined) { const m = { x: Math.min(a.x, a.sx), y: Math.min(a.y, a.sy), w: Math.abs(a.x - a.sx), h: Math.abs(a.y - a.sy) }; list.forEach((it) => { const b = bbox(it); if (b.x < m.x + m.w && b.x + b.w > m.x && b.y < m.y + m.h && b.y + b.h > m.y) sel.add(it.id); }); }
      paintSel(); return;
    }
    if (a.kind === 'draw') {
      const it = a.it;
      if (it.t === 'pen' && it.pts.length === 1) it.pts.push([it.pts[0][0] + 0.5, it.pts[0][1] + 0.5]);
      if (it.t === 'line' && Math.hypot(it.x2 - it.x1, it.y2 - it.y1) < 6) { it.x2 = it.x1 + (it.under ? 160 : 120); if (!it.under) it.y2 = it.y1; }
      if (MIN[it.t] && (it.w2 < 12 || (it.t !== 'timeline' && it.h < 12))) { it.w2 = MIN[it.t][0]; it.h = MIN[it.t][1]; }
      snapshot(); list.push(it); paint(); emit(); toolsBar();
      if (['sticky', 'bubble'].includes(it.t)) startEdit(it);
      if (['chart', 'timeline'].includes(it.t)) { sel = new Set([it.id]); paintSel(); }
    }
  }
  function onDbl(e) {
    if (!active) return;
    const id = hitItem(e.clientX, e.clientY);
    const it = id && byId(id);
    if (!it) { if (tool === 'select') { const [x, y] = toWorld(e.clientX, e.clientY); const t = create('text', x, y); snapshot(); list.push(t); paint(); startEdit(t); } return; }
    if (['text', 'sticky', 'bubble', 'check', 'rect', 'ellipse'].includes(it.t)) startEdit(it);
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
    if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); sel = new Set(list.map((x) => x.id)); setTool('select'); paintSel(); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel.size) { e.preventDefault(); command('del'); return; }
    if (e.key === 'Escape') { sel.clear(); setTool('select'); return; }
    if (e.key === 'Enter' && sel.size === 1) { const it = selected()[0]; if (['text', 'sticky', 'bubble', 'check'].includes(it.t)) { e.preventDefault(); startEdit(it); } return; }
    if (!mod && !e.altKey && e.key.length === 1) { const t = TOOLS.find(([, , , k]) => k.toLowerCase() === e.key.toLowerCase()); if (t && (mode === 'board' || t[0] !== 'hand')) { setTool(t[0]); e.preventDefault(); } }
    if (sel.size && e.key.startsWith('Arrow')) { e.preventDefault(); snapshot(); const d = e.shiftKey ? 10 : 1; selected().forEach((it) => moveItem(it, e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0, e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0)); commit(); }
  }
  const onKeyUp = (e) => { if (e.key === ' ' && space) { space = false; svg.dataset.tool = tool; } };

  // Barres : clics
  tools?.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.tool) setTool(b.dataset.tool); if (b.dataset.cmd) command(b.dataset.cmd); });
  props?.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.set) applyProp(b.dataset.set, b.dataset.v); if (b.dataset.tog) toggleProp(b.dataset.tog); if (b.dataset.cmd) command(b.dataset.cmd); });
  props?.addEventListener('change', (e) => { const s2 = e.target.closest('select[data-set]'); if (s2) applyProp(s2.dataset.set, s2.value); });
  props?.addEventListener('pointerdown', (e) => { if (editing && e.target.closest('button, select')) e.preventDefault(); });

  // Zoom (tableau blanc)
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
    view.z = Math.min(2, Math.max(0.15, Math.min(r.width / (b.w + m * 2), r.height / (b.h + m * 2))));
    view.x = b.x - m - (r.width / view.z - (b.w + m * 2)) / 2; view.y = b.y - m - (r.height / view.z - (b.h + m * 2)) / 2;
    fitView(); paintSel(); queueEmit();
  }

  svg.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  svg.addEventListener('dblclick', onDbl);
  svg.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  const ro = new ResizeObserver(() => fitView());
  ro.observe(svg);
  svg.dataset.tool = tool;
  fitView(); paint(); toolsBar(); propsBar();

  return {
    setActive(on) { active = on; svg.classList.toggle('is-active', on); if (!on) { finishEdit(); sel.clear(); paintSel(); } onActive?.(on); },
    setTool,
    fitAll,
    items: () => clone(list),
    setBg(b) { bgRect.setAttribute('fill', b === 'blank' ? 'transparent' : `url(#dw-${b})`); },
    exportSVG: () => exportSVG(list),
    destroy() { finishEdit(); clearTimeout(emitT); emit(); ro.disconnect(); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp); },
  };
}

// Export : un fichier SVG autonome (fond blanc), ou une image PNG
export function exportSVG(items, { pad = 40, bg = '#fffdf8' } = {}) {
  const b = itemsBox(items);
  const x = b.x - pad, y = b.y - pad, w = Math.max(200, b.w + pad * 2), h = Math.max(150, b.h + pad * 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${Math.round(w)}" height="${Math.round(h)}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bg}"/>${items.map(renderItem).join('')}</svg>`;
}
export function exportPNG(items, scale = 2) {
  return new Promise((resolve, reject) => {
    const svgText = exportSVG(items);
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
