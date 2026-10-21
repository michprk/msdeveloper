// Conversion Notion ↔ MindView (1.12).
// Notion → notes : titres, paragraphes, listes, cases à cocher, citations, encadrés, code, bascules, tableaux,
// images (en lien), mentions de pages (en liens), séparateurs ; colonnes et blocs synchronisés sont aplatis.
// Un bloc non pris en charge est gardé en texte brut, avec une mention discrète (champ `src`) : rien n'est perdu.
// MindView → Notion : l'inverse, en respectant les limites de l'API (2 000 caractères par texte, 100 éléments).
import { esc } from '../ui.js';
import { clean, hasFormat } from '../rich.js';

// ---------- Texte enrichi ----------
const COLOR = { gray: '#676d7e', brown: '#8f6420', orange: '#f08c00', yellow: '#b08800', green: '#2f9e44', blue: '#155eef', purple: '#7048e8', pink: '#c2255c', red: '#d92d20' };
const BG = { gray: '#e9ecef', brown: '#f1e4d3', orange: '#ffe8cc', yellow: '#ffe066', green: '#b2f2bb', blue: '#a5d8ff', purple: '#d0bfff', pink: '#fcc2d7', red: '#ffc9c9' };
export const plainOf = (rich = []) => rich.map((r) => r.plain_text ?? r.text?.content ?? '').join('');
export function richToHtml(rich = []) {
  const html = rich.map((r) => {
    let s = esc(r.plain_text ?? r.text?.content ?? '').replace(/\n/g, '<br>');
    const a = r.annotations || {};
    if (a.code) s = `<span style="font-family:ui-monospace, monospace">${s}</span>`;
    if (a.bold) s = `<b>${s}</b>`;
    if (a.italic) s = `<i>${s}</i>`;
    if (a.underline) s = `<u>${s}</u>`;
    if (a.strikethrough) s = `<s>${s}</s>`;
    const c = a.color || 'default';
    if (c.endsWith('_background') && BG[c.replace('_background', '')]) s = `<span style="background-color:${BG[c.replace('_background', '')]}">${s}</span>`;
    else if (COLOR[c]) s = `<span style="color:${COLOR[c]}">${s}</span>`;
    const href = r.href || r.text?.link?.url;
    if (href) s = `<a href="${esc(href)}">${s}</a>`;
    return s;
  }).join('');
  return clean(html);
}
const pageUrl = (id) => `https://www.notion.so/${String(id).replace(/-/g, '')}`;
const link = (url, label) => `<a href="${esc(url)}">${esc(label)}</a>`;
const TONE = (color = '') => (/green|yellow/.test(color) ? 'lime' : /red|pink/.test(color) ? 'rose' : /purple/.test(color) ? 'lav' : /brown|orange/.test(color) ? 'sand' : '');

// Texte brut d'un bloc et de ses enfants (pour les bascules et les blocs non pris en charge)
function textTree(b) {
  const d = b[b.type] || {};
  const own = d.rich_text ? plainOf(d.rich_text) : d.title || d.expression || d.url || '';
  return [own, ...(b.children || []).map(textTree)].filter(Boolean).join('\n');
}

// ---------- Notion → blocs MindView ----------
export function fromNotion(blocks = [], ctx = { unsupported: [] }) {
  const out = [];
  const add = (t, rich, extra = {}) => { const h = richToHtml(rich); out.push({ t, x: plainOf(rich), ...(hasFormat(h) ? { h } : {}), ...extra }); };
  const keep = (b, text) => { ctx.unsupported.push(b.type); out.push({ t: 'p', x: text || `(bloc ${b.type})`, src: b.type }); };
  for (const b of blocks) {
    const d = b[b.type] || {};
    switch (b.type) {
      case 'paragraph': add('p', d.rich_text); if (b.children) out.push(...fromNotion(b.children, ctx)); break;
      case 'heading_1': add('h1', d.rich_text); if (b.children) out.push(...fromNotion(b.children, ctx)); break;
      case 'heading_2': case 'heading_3': add('h2', d.rich_text); if (b.children) out.push(...fromNotion(b.children, ctx)); break;
      case 'bulleted_list_item': add('ul', d.rich_text); if (b.children) out.push(...fromNotion(b.children, ctx)); break;
      case 'numbered_list_item': add('ol', d.rich_text); if (b.children) out.push(...fromNotion(b.children, ctx)); break;
      case 'to_do': add('todo', d.rich_text, { c: !!d.checked }); if (b.children) out.push(...fromNotion(b.children, ctx)); break;
      case 'quote': add('quote', d.rich_text); break;
      case 'callout': add('callout', d.rich_text, TONE(d.color) ? { v: TONE(d.color) } : {}); if (b.children) out.push(...fromNotion(b.children, ctx)); break;
      case 'code': out.push({ t: 'code', x: plainOf(d.rich_text), ...(d.language && d.language !== 'plain text' ? { v: d.language } : {}) }); break;
      case 'toggle': { const h = richToHtml(d.rich_text); out.push({ t: 'toggle', x: plainOf(d.rich_text), ...(hasFormat(h) ? { h } : {}), a: (b.children || []).map(textTree).join('\n') }); break; }
      case 'table': {
        const rows = (b.children || []).filter((r) => r.type === 'table_row').map((r) => r.table_row.cells.map(plainOf));
        if (rows.length) out.push({ t: 'table', rows: rows.length > 1 ? rows : [rows[0].map((_, i) => `Colonne ${i + 1}`), rows[0]], x: rows.flat().filter(Boolean).join(' · ') });
        break;
      }
      case 'image': {
        const url = d.type === 'external' ? d.external?.url : d.file?.url;
        const cap = plainOf(d.caption) || 'Image';
        if (url) out.push({ t: 'p', x: `Image : ${cap}`, h: clean(`Image : ${link(url, cap)}`), src: 'image' }); else keep(b, cap);
        break;
      }
      case 'bookmark': case 'link_preview': case 'embed': case 'video': case 'pdf': case 'file': case 'audio': {
        const url = d.url || (d.type === 'external' ? d.external?.url : d.file?.url);
        const label = plainOf(d.caption) || d.name || url || b.type;
        if (url) { out.push({ t: 'p', x: label, h: clean(link(url, label)), src: b.type }); if (!['bookmark', 'link_preview'].includes(b.type)) ctx.unsupported.push(b.type); } else keep(b, label);
        break;
      }
      case 'divider': out.push({ t: 'divider', x: '' }); break;
      case 'child_page': out.push({ t: 'p', x: `Page : ${d.title || 'Sans titre'}`, h: clean(`Page : ${link(pageUrl(b.id), d.title || 'Sans titre')}`) }); break;
      case 'child_database': out.push({ t: 'p', x: `Base : ${d.title || 'Sans titre'}`, h: clean(`Base : ${link(pageUrl(b.id), d.title || 'Sans titre')}`) }); break;
      case 'column_list': case 'column': case 'synced_block': out.push(...fromNotion(b.children || [], ctx)); break;
      case 'equation': keep(b, d.expression); break;
      case 'table_of_contents': case 'breadcrumb': break; // aucun contenu à garder
      default: keep(b, textTree(b));
    }
  }
  return out;
}
export const titleOf = (obj) => {
  if (!obj) return '';
  if (obj.object === 'database') return plainOf(obj.title) || 'Base sans titre';
  return plainOf(Object.values(obj.properties || {}).find((x) => x.type === 'title')?.title) || 'Sans titre';
};
export const iconOf = (obj) => (obj?.icon?.type === 'emoji' ? obj.icon.emoji : '');

// ---------- MindView → Notion ----------
const MAX = 2000;
const chunk = (s) => { const out = []; for (let i = 0; i < s.length; i += MAX) out.push(s.slice(i, i + MAX)); return out.length ? out : ['']; };
const txt = (content, a = {}, href = null) => ({ type: 'text', text: { content, link: href ? { url: href } : null }, annotations: { bold: !!a.b, italic: !!a.i, strikethrough: !!a.s, underline: !!a.u, code: !!a.code, color: 'default' } });
// Texte enrichi Notion depuis le HTML nettoyé d'un bloc (gras, italique, souligné, barré, liens)
export function htmlToRich(html, plain = '') {
  if (!html) return plain ? chunk(plain).map((c) => txt(c)) : [];
  const tpl = document.createElement('template');
  tpl.innerHTML = clean(html);
  const segs = [];
  const walk = (node, a, href) => {
    for (const n of node.childNodes) {
      if (n.nodeType === 3) { if (n.textContent) segs.push([n.textContent, a, href]); continue; }
      if (n.nodeType !== 1) continue;
      if (n.tagName === 'BR') { segs.push(['\n', a, href]); continue; }
      const na = { ...a };
      if (n.tagName === 'B') na.b = 1; if (n.tagName === 'I') na.i = 1; if (n.tagName === 'U') na.u = 1; if (n.tagName === 'S') na.s = 1;
      if (n.tagName === 'SPAN' && /monospace/.test(n.getAttribute('style') || '')) na.code = 1;
      if (n.tagName === 'SPAN' && /underline/.test(n.getAttribute('style') || '')) na.u = 1;
      walk(n, na, n.tagName === 'A' ? n.getAttribute('href') : href);
    }
  };
  walk(tpl.content, {}, null);
  const out = [];
  for (const [s, a, href] of segs) for (const c of chunk(s)) out.push(txt(c, a, href));
  return out.slice(0, 100);
}
const rtOf = (b, k = 'x') => htmlToRich(k === 'a' ? b.ha : b.h, b[k] || '');
const COLOR_OF = { lime: 'green_background', rose: 'red_background', lav: 'purple_background', sand: 'brown_background' };
const nb = (type, data) => ({ object: 'block', type, [type]: data });
export function toNotion(page, { progress } = {}) {
  const out = [];
  for (const b of page.blocks || []) {
    switch (b.t) {
      case 'h1': out.push(nb('heading_1', { rich_text: rtOf(b) })); break;
      case 'h2': out.push(nb('heading_2', { rich_text: rtOf(b) })); break;
      case 'todo': out.push(nb('to_do', { rich_text: rtOf(b), checked: !!b.c })); break;
      case 'ul': out.push(nb('bulleted_list_item', { rich_text: rtOf(b) })); break;
      case 'ol': out.push(nb('numbered_list_item', { rich_text: rtOf(b) })); break;
      case 'quote': out.push(nb('quote', { rich_text: rtOf(b) })); break;
      case 'callout': out.push(nb('callout', { rich_text: rtOf(b), icon: { type: 'emoji', emoji: b.v === 'rose' ? '⚠️' : b.v === 'lime' ? '⭐' : '💡' }, color: COLOR_OF[b.v] || 'blue_background' })); break;
      case 'divider': out.push(nb('divider', {})); break;
      case 'code': out.push(nb('code', { rich_text: chunk(b.x || '').map((c) => txt(c)), language: 'plain text' })); break;
      case 'toggle': out.push(nb('toggle', { rich_text: rtOf(b), children: (b.a || '').split('\n').filter(Boolean).slice(0, 100).map((l) => nb('paragraph', { rich_text: chunk(l).map((c) => txt(c)) })) })); break;
      case 'qa': out.push(nb('toggle', { rich_text: rtOf(b), children: [nb('paragraph', { rich_text: rtOf(b, 'a') })] })); break;
      case 'def': out.push(nb('paragraph', { rich_text: [txt(`${b.x || ''} : `, { b: 1 }), ...rtOf(b, 'a')].slice(0, 100) })); break;
      case 'table': {
        const rows = (b.rows || []).filter((r) => r.length);
        if (!rows.length) break;
        const w = Math.max(...rows.map((r) => r.length));
        out.push(nb('table', { table_width: w, has_column_header: true, has_row_header: false, children: rows.slice(0, 100).map((r) => nb('table_row', { cells: Array.from({ length: w }, (_, i) => chunk(String(r[i] ?? '')).map((c) => txt(c))) })) }));
        break;
      }
      case 'prog': if (progress) out.push(nb('paragraph', { rich_text: [txt(`Avancement : ${progress(page).pct} %`, { b: 1 })] })); break;
      default: out.push(nb('paragraph', { rich_text: rtOf(b) }));
    }
  }
  return out;
}

// ---------- Tâches ↔ lignes d'une base ----------
const DONE = /termin|fait|done|complet|fini|^ok$/i;
const TODO = /faire|to ?do|not started|pas commenc|backlog|^nouveau/i;
// Repère les propriétés utiles d'une base : titre, statut (statut, sélection ou case), date, matière
export function detectMap(db) {
  const props = Object.entries(db.properties || {}).map(([name, p]) => ({ name, ...p }));
  const by = (types, re) => props.find((p) => types.includes(p.type) && (!re || re.test(p.name))) || null;
  const status = by(['status'], null) || by(['checkbox'], /fait|done|termin|statut|status/i) || by(['select'], /statut|status|état|etat/i) || by(['checkbox'], null);
  const date = by(['date'], /échéance|echeance|date|due|pour|deadline/i) || by(['date'], null);
  const subject = by(['select', 'multi_select', 'rich_text'], /mati[eè]re|subject|cours|discipline/i);
  return { title: props.find((p) => p.type === 'title')?.name || '', status: status?.name || '', statusType: status?.type || '', date: date?.name || '', subject: subject?.name || '', subjectType: subject?.type || '', options: status?.[status.type]?.options?.map((o) => o.name) || [] };
}
const dayStr = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const parseDate = (s) => { if (!s) return null; if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getTime(); } const t = Date.parse(s); return Number.isFinite(t) ? t : null; };
const hasTime = (t) => { const d = new Date(t); return d.getHours() || d.getMinutes(); };
export function taskFromRow(row, map) {
  const P = row.properties || {};
  const st = map.status && P[map.status];
  const done = !st ? false : st.type === 'checkbox' ? !!st.checkbox : DONE.test((st.status || st.select)?.name || '');
  const dt = map.date && P[map.date]?.date?.start;
  const sp = map.subject && P[map.subject];
  const subjectName = !sp ? '' : sp.type === 'select' ? sp.select?.name || '' : sp.type === 'multi_select' ? sp.multi_select?.[0]?.name || '' : plainOf(sp.rich_text);
  return { title: plainOf(P[map.title]?.title) || 'Sans titre', done, due: parseDate(dt), subjectName };
}
export function rowProps(f, map) {
  const props = { [map.title]: { title: [txt(String(f.title || 'Sans titre').slice(0, MAX))] } };
  if (map.status) {
    if (map.statusType === 'checkbox') props[map.status] = { checkbox: !!f.done };
    else {
      const opts = map.options || [];
      const name = f.done ? opts.find((o) => DONE.test(o)) || opts[opts.length - 1] : opts.find((o) => TODO.test(o)) || opts.find((o) => !DONE.test(o)) || opts[0];
      if (name) props[map.status] = map.statusType === 'status' ? { status: { name } } : { select: { name } };
    }
  }
  if (map.date) props[map.date] = { date: f.due ? { start: hasTime(f.due) ? new Date(f.due).toISOString() : dayStr(f.due) } : null };
  if (map.subject && f.subjectName !== undefined) {
    props[map.subject] = map.subjectType === 'select' ? { select: f.subjectName ? { name: f.subjectName.slice(0, 100) } : null }
      : map.subjectType === 'multi_select' ? { multi_select: f.subjectName ? [{ name: f.subjectName.slice(0, 100) }] : [] }
        : { rich_text: f.subjectName ? [txt(f.subjectName)] : [] };
  }
  return props;
}
// Empreinte des champs synchronisés (pour savoir ce qui a changé de chaque côté)
export const sigOf = (f) => JSON.stringify([String(f.title || '').trim(), !!f.done, f.due ? (hasTime(f.due) ? new Date(f.due).toISOString().slice(0, 16) : dayStr(f.due)) : '', f.subjectName || '']);
export const pageTitleProp = (title) => ({ title: { title: [txt(String(title || 'Sans titre').slice(0, MAX))] } });
