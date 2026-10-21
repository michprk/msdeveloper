// Texte mis en forme des pages de notes : nettoyage du HTML (liste blanche stricte : gras,
// italique, souligné, barré, couleurs, surlignage, police, taille) et outils de curseur.
// Le HTML enregistré est toujours repassé ici à l'affichage : un fichier importé ne peut rien injecter.
import { esc } from './ui.js';

const TAGS = { B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u', S: 's', STRIKE: 's', DEL: 's', BR: 'br', SPAN: 'span', FONT: 'span', MARK: 'mark', SUB: 'sub', SUP: 'sup', A: 'a' };
const COLOR = /^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(,\s*[\d.]+\s*)?\)|transparent)$/i;
const STYLE = {
  color: COLOR,
  'background-color': COLOR,
  'font-family': /^[\w\s,'"-]{1,120}$/,
  'font-size': /^(xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large|\d{1,2}(\.\d)?(px|em|rem))$/,
  'font-weight': /^(bold|normal|[1-9]00)$/,
  'font-style': /^(italic|normal)$/,
  'text-decoration-line': /^(underline|line-through|none)( (underline|line-through))?$/,
  'text-decoration-color': COLOR,
  'text-decoration-thickness': /^\d{1,2}(\.\d)?px$/,
  'text-decoration-style': /^(solid|wavy|double|dotted|dashed)$/,
};
const SIZES = { 1: 'x-small', 2: 'small', 3: 'medium', 4: 'large', 5: 'x-large', 6: 'xx-large', 7: 'xxx-large' };

export function clean(html) {
  if (!html) return '';
  const t = document.createElement('template');
  t.innerHTML = String(html);
  const walk = (node) => [...node.childNodes].map((n) => {
    if (n.nodeType === 3) return esc(n.textContent);
    if (n.nodeType !== 1) return '';
    if (/^(SCRIPT|STYLE|TEMPLATE|IFRAME|OBJECT|EMBED|NOSCRIPT|SVG|MATH|TITLE|HEAD)$/.test(n.tagName.toUpperCase())) return '';
    const tag = TAGS[n.tagName];
    if (n.tagName === 'DIV' || n.tagName === 'P') return `${walk(n)}<br>`;
    const inner = walk(n);
    if (!tag) return inner;
    if (tag === 'br') return '<br>';
    // Liens (1.12, imports Notion) : seulement http(s), ouverts dans un nouvel onglet, sans attribut de plus
    if (tag === 'a') {
      const href = (n.getAttribute('href') || '').trim();
      return /^https?:\/\/[^\s"'<>]+$/i.test(href) ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${inner}</a>` : inner;
    }
    const parts = [];
    if (n.tagName === 'FONT') {
      const c = n.getAttribute('color'); if (c && COLOR.test(c)) parts.push(['color', c]);
      const f = n.getAttribute('face'); if (f && STYLE['font-family'].test(f)) parts.push(['font-family', f]);
      const s = n.getAttribute('size'); if (SIZES[s]) parts.push(['font-size', SIZES[s]]);
    }
    for (const p of n.style || []) {
      const v = n.style.getPropertyValue(p).trim();
      if (STYLE[p]?.test(v)) parts.push([p, v]);
    }
    const style = parts.map(([k, v]) => `${k}:${v.replace(/"/g, '\'')}`).join(';');
    if ((tag === 'span') && !style) return inner;
    return `<${tag}${style ? ` style="${esc(style)}"` : ''}>${inner}</${tag}>`;
  }).join('');
  return walk(t.content).replace(/(<br>)+$/, '');
}
// Texte brut (recherche, export, cartes de révision)
export const plain = (el) => (el.innerText || '').replace(/ /g, ' ').replace(/\n$/, '');
export const hasFormat = (html) => /<(b|i|u|s|span|mark|sub|sup|a)\b/.test(html || '');

// Curseur : position en nombre de caractères dans un élément modifiable
export function caretOffset(el) {
  const s = getSelection();
  if (!s.rangeCount || !el.contains(s.anchorNode)) return 0;
  const r = s.getRangeAt(0).cloneRange();
  r.selectNodeContents(el);
  r.setEnd(s.getRangeAt(0).startContainer, s.getRangeAt(0).startOffset);
  return r.toString().length;
}
export function caretAtEnd(el) {
  const s = getSelection();
  if (!s.rangeCount || !s.isCollapsed) return false;
  const r = s.getRangeAt(0).cloneRange();
  r.selectNodeContents(el);
  r.setStart(s.getRangeAt(0).endContainer, s.getRangeAt(0).endOffset);
  return r.toString().length === 0;
}
export function setCaret(el, off = 'end') {
  el.focus({ preventScroll: true });
  const s = getSelection();
  const r = document.createRange();
  if (off === 'end' || off === 'start') { r.selectNodeContents(el); r.collapse(off === 'start'); s.removeAllRanges(); s.addRange(r); return; }
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n, left = off;
  while ((n = w.nextNode())) {
    if (left <= n.length) { r.setStart(n, left); r.collapse(true); s.removeAllRanges(); s.addRange(r); return; }
    left -= n.length;
  }
  r.selectNodeContents(el); r.collapse(false); s.removeAllRanges(); s.addRange(r);
}
// Coupe le contenu au curseur : renvoie le HTML après le curseur (retiré de l'élément)
export function splitAtCaret(el) {
  const s = getSelection();
  if (!s.rangeCount) return '';
  const r = s.getRangeAt(0);
  r.deleteContents();
  const after = document.createRange();
  after.setStart(r.startContainer, r.startOffset);
  after.setEnd(el, el.childNodes.length);
  const box = document.createElement('div');
  box.append(after.extractContents());
  return clean(box.innerHTML);
}
// Entoure la sélection d'un style (souligné rouge, surlignage personnalisé…)
export function wrapSelection(style) {
  const s = getSelection();
  if (!s.rangeCount || s.isCollapsed) return false;
  const r = s.getRangeAt(0);
  const span = document.createElement('span');
  Object.entries(style).forEach(([k, v]) => span.style.setProperty(k, v));
  span.append(r.extractContents());
  r.insertNode(span);
  s.removeAllRanges();
  const nr = document.createRange(); nr.selectNodeContents(span); s.addRange(nr);
  return true;
}
