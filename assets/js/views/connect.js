// Connecteurs : tout ce qui marche dès maintenant, sans compte en ligne.
// - Liens reconnus (Notion, Figma, Canva, Miro, Google Docs/Sheets/Slides, YouTube, Loom, GitHub…)
//   rangés dans un projet ou une fiche, avec aperçu intégré à la demande quand le service le permet.
// - Imports : pages Notion (.md ou .zip d'export), agendas (.ics), Trello (.json), Todoist et
//   Excel / Google Sheets / Notion base de données (.csv), cartes Quizlet (copier-coller).
// - Exports : agenda (.ics), toutes les pages pour Notion (.zip de .md), tâches (.csv), cartes Anki (.txt).
// La synchronisation automatique demandera des comptes en ligne et les autorisations officielles
// de chaque service (OAuth côté serveur, voir SECURITE.md).
import { S, update, uid, can, canAddPage, addPage, bid, getProject, addTask, newProject, canAddProject, startOfDay, DAY } from '../store.js';
import { ic, esc, register, toast, sheet, sheetHead, closeSheet, confirmSheet, field, input, select, download, ago } from '../ui.js';
import { pageHead, paywall } from './common.js';

export const SERVICES = {
  notion: { name: 'Notion', tone: 'grey', l: 'N', hint: 'Pages et bases de données' },
  figma: { name: 'Figma', tone: 'navy', l: 'F', embed: true, hint: 'Maquettes, prototypes, FigJam' },
  canva: { name: 'Canva', tone: 'sky', l: 'C', embed: true, hint: 'Visuels, présentations, réseaux sociaux' },
  miro: { name: 'Miro', tone: 'sand', l: 'M', embed: true, hint: 'Tableaux collaboratifs' },
  gdocs: { name: 'Google Docs', tone: 'blue', l: 'D', embed: true, hint: 'Documents' },
  gsheets: { name: 'Google Sheets', tone: 'olive', l: 'S', embed: true, hint: 'Feuilles de calcul' },
  gslides: { name: 'Google Slides', tone: 'sand', l: 'P', embed: true, hint: 'Présentations' },
  drive: { name: 'Google Drive', tone: 'olive', l: 'G', hint: 'Fichiers et dossiers' },
  youtube: { name: 'YouTube', tone: 'rose', l: '▶', embed: true, hint: 'Vidéos, cours en ligne' },
  loom: { name: 'Loom', tone: 'blue', l: 'L', embed: true, hint: 'Vidéos d\'écran' },
  github: { name: 'GitHub', tone: 'navy', l: 'GH', hint: 'Code, tickets, versions' },
  trello: { name: 'Trello', tone: 'blue', l: 'T', hint: 'Tableaux de tâches' },
  web: { name: 'Lien', tone: 'sand', l: '↗', hint: 'N\'importe quelle page' },
};
export function detect(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const h = u.hostname.replace(/^www\./, '');
  const kind = /(^|\.)figma\.com$/.test(h) ? 'figma' : /(^|\.)canva\.com$/.test(h) || h === 'canva.link' ? 'canva' : /(^|\.)notion\.(so|site)$/.test(h) ? 'notion'
    : /(^|\.)miro\.com$/.test(h) ? 'miro' : h === 'docs.google.com' && /\/document\//.test(u.pathname) ? 'gdocs' : h === 'docs.google.com' && /\/spreadsheets\//.test(u.pathname) ? 'gsheets' : h === 'docs.google.com' && /\/presentation\//.test(u.pathname) ? 'gslides'
      : /^(docs|drive|sheets|slides)\.google\.com$/.test(h) ? 'drive' : /(^|\.)youtube\.com$/.test(h) || h === 'youtu.be' ? 'youtube' : /(^|\.)loom\.com$/.test(h) ? 'loom'
        : /(^|\.)github\.com$/.test(h) ? 'github' : /(^|\.)trello\.com$/.test(h) ? 'trello' : 'web';
  return { kind, url: u.href, host: h };
}
// Adresse d'aperçu officielle de chaque service (le fichier doit être partagé « avec le lien »)
export function embedUrl(l) {
  const u = l.url;
  if (l.kind === 'figma' && /figma\.com\/(file|design|proto|board|slides)\//.test(u)) return `https://www.figma.com/embed?embed_host=mindview&url=${encodeURIComponent(u)}`;
  if (l.kind === 'canva') { const m = u.match(/canva\.com\/design\/([\w-]+)\/([\w-]+)/); if (m) return `https://www.canva.com/design/${m[1]}/${m[2]}/view?embed`; }
  if (l.kind === 'miro') { const m = u.match(/miro\.com\/app\/board\/([\w=-]+)/); if (m) return `https://miro.com/app/live-embed/${m[1]}/`; }
  if (['gdocs', 'gsheets', 'gslides'].includes(l.kind)) { const m = u.match(/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([\w-]+)/); if (m) return `https://docs.google.com/${m[1]}/d/${m[2]}/preview`; }
  if (l.kind === 'youtube') { const m = u.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/); if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}`; }
  if (l.kind === 'loom') { const m = u.match(/loom\.com\/share\/([\w-]+)/); if (m) return `https://www.loom.com/embed/${m[1]}`; }
  return '';
}
const target = (s, kind, id) => (kind === 'project' ? s.projects : kind === 'task' ? s.tasks : s.prospects).find((x) => x.id === id);
export const svcBadge = (k, cls = '') => `<span class="svc svc-${k} k-${(SERVICES[k] || CX[k] || SERVICES.web).tone} ${cls}" aria-hidden="true">${(SERVICES[k] || CX[k] || SERVICES.web).l}</span>`;
const mark = (k, n = 1) => update((s) => { s.cx = { ...(s.cx || {}), [k]: { at: Date.now(), n: ((s.cx || {})[k]?.n || 0) + n } }; }, { silent: true });

let shown = new Set();
export function linksBlock(kind, id, links = []) {
  return `<section class="card links-card rise">
    <header class="card-h"><div><h2>Fichiers et liens</h2><p>${links.length ? `${links.length} lien${links.length > 1 ? 's' : ''}` : 'Notion, Figma, Canva, Google, Miro, YouTube…'}</p></div><button class="link" data-act="link-add" data-kind="${kind}" data-id="${id}">${ic('plus')}Lien</button></header>
    ${links.length ? `<ul class="rows links">${links.filter((l) => detect(l.url) && SERVICES[l.kind]).map((l) => {
      const emb = embedUrl(l);
      return `<li class="lk">
        <div class="lk-r"><a class="row" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${svcBadge(l.kind)}<span class="row-b"><b>${esc(l.label || SERVICES[l.kind].name)}</b><span>${esc(SERVICES[l.kind].name)} · ${esc(detect(l.url)?.host || '')}</span></span>${ic('external', 'chev')}</a>
          <button class="icon-btn sm" data-act="link-del" data-kind="${kind}" data-id="${id}" data-l="${l.id}" aria-label="Retirer le lien « ${esc(l.label || SERVICES[l.kind].name)} »">${ic('x')}</button></div>
        ${emb ? (shown.has(l.id) ? `<div class="lk-embed ${l.kind === 'youtube' || l.kind === 'loom' ? 'is-video' : ''}"><iframe src="${esc(emb)}" title="Aperçu ${esc(SERVICES[l.kind].name)}" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div><button class="link" data-act="link-embed" data-l="${l.id}">Masquer l'aperçu</button>`
          : `<button class="link" data-act="link-embed" data-l="${l.id}">${ic('eye')}Afficher l'aperçu</button>`) : ''}
      </li>`;
    }).join('')}</ul>` : `<div class="lk-empty">${['notion', 'figma', 'canva', 'gdocs', 'miro', 'youtube'].map((k) => svcBadge(k)).join('')}<p>Collez le lien d'un fichier : il s'ouvre en un geste pour le modifier dans son application.</p></div>`}
  </section>`;
}

function linkSheet(kind, id, svc = '') {
  const s = SERVICES[svc];
  sheet(`${sheetHead(s && svc !== 'web' ? `Ajouter un lien ${s.name}` : 'Ajouter un lien', 'Le fichier reste dans son application : ici, vous le retrouvez au bon endroit.')}
    <form class="sheet-body form" data-form="link" data-kind="${kind}" data-id="${id}" data-validate novalidate>
      ${field('Adresse du fichier', input('url', '', `type="url" required autofocus inputmode="url" placeholder="${{ canva: 'https://www.canva.com/design/…', notion: 'https://www.notion.so/…', miro: 'https://miro.com/app/board/…', youtube: 'https://www.youtube.com/watch?v=…', gdocs: 'https://docs.google.com/document/d/…' }[svc] || 'https://www.figma.com/design/…'}"`), svc === 'canva' || svc === 'miro' || svc?.startsWith('g') ? 'Pour l\'aperçu : partagez le fichier « avec toute personne disposant du lien ».' : 'Dans l\'application : Partager → Copier le lien.')}
      ${field('Nom (facultatif)', input('label', '', 'maxlength="60" placeholder="Maquette page d\'accueil, Cours d\'histoire, Logo…"'))}
      <button class="btn btn-primary btn-block" type="submit" data-needs="url" disabled>Ajouter</button>
    </form>`, { cls: 'sheet-sm' });
}
function pickProject(svc) {
  const list = S().projects.filter((p) => p.status !== 'termine');
  sheet(`${sheetHead(`Relier ${SERVICES[svc]?.name || 'un fichier'} à un projet`)}<div class="sheet-body">
    ${list.length ? `<ul class="rows">${list.map((p) => `<li><button class="row" data-act="link-add" data-kind="project" data-id="${p.id}" data-svc="${svc}"><span class="menu-ic">${ic(p.icon || 'folder')}</span><span class="row-b"><b>${esc(p.name)}</b><span>${(p.links || []).length} lien${(p.links || []).length > 1 ? 's' : ''}</span></span>${ic('chevR', 'chev')}</button></li>`).join('')}</ul>`
      : `<p class="sheet-p">Créez d'abord un projet : examen, site, client, événement…</p><button class="btn btn-primary btn-block" data-act="go-projects">${ic('plus')}<span>Créer un projet</span></button>`}
  </div>`, { cls: 'sheet-sm' });
}

// ---------- Formats de fichiers ----------
// Markdown (export Notion) → page
export function mdToPage(md, fallback = 'Page importée') {
  const lines = String(md).replace(/\r/g, '').split('\n');
  let title = '';
  const blocks = [];
  for (const raw of lines) {
    const x = raw.trimEnd();
    if (!x.trim()) continue;
    let m;
    if (!title && (m = x.match(/^#\s+(.+)/))) { title = m[1].trim(); continue; }
    const clean = (t) => t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/`([^`]+)`/g, '$1').trim();
    if ((m = x.match(/^#{1,2}\s+(.+)/))) blocks.push({ t: 'h1', x: clean(m[1]) });
    else if ((m = x.match(/^#{3,6}\s+(.+)/))) blocks.push({ t: 'h2', x: clean(m[1]) });
    else if ((m = x.match(/^\s*[-*]\s+\[( |x|X)\]\s*(.*)/))) blocks.push({ t: 'todo', x: clean(m[2]), c: m[1] !== ' ' });
    else if ((m = x.match(/^\s*[-*+]\s+(.*)/))) blocks.push({ t: 'ul', x: clean(m[1]) });
    else if ((m = x.match(/^\s*\d+[.)]\s+(.*)/))) blocks.push({ t: 'ol', x: clean(m[1]) });
    else if ((m = x.match(/^>\s?(.*)/))) blocks.push({ t: 'quote', x: clean(m[1]) });
    else if (/^(-{3,}|\*{3,}|_{3,})$/.test(x.trim())) blocks.push({ t: 'divider', x: '' });
    else if (/^\|/.test(x.trim())) { if (!/^\|?\s*:?-{2,}/.test(x.trim())) blocks.push({ t: 'p', x: x.split('|').map((c) => c.trim()).filter(Boolean).join(' · ') }); }
    else blocks.push({ t: 'p', x: clean(x) });
  }
  return { title: (title || fallback).slice(0, 120), blocks: (blocks.length ? blocks : [{ t: 'p', x: '' }]).slice(0, 400).map((b) => ({ id: bid(), ...b, x: String(b.x).slice(0, 4000) })) };
}
const pageMd = (p) => { let n = 0; return [`# ${p.title || 'Sans titre'}`, '', ...p.blocks.map((b) => { n = b.t === 'ol' ? n + 1 : 0; return { p: b.x, h1: `## ${b.x}`, h2: `### ${b.x}`, todo: `- [${b.c ? 'x' : ' '}] ${b.x}`, ul: `- ${b.x}`, ol: `${n}. ${b.x}`, quote: `> ${b.x}`, callout: `> **${b.x}**`, divider: '---', qa: `**Q :** ${b.x}\n**R :** ${b.a || ''}` }[b.t] ?? b.x; })].join('\n'); };

// Agenda : tâches datées → .ics
export function tasksIcs() {
  const pad = (n) => String(n).padStart(2, '0');
  const utc = (t) => { const d = new Date(t); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`; };
  const day = (t) => { const d = new Date(t); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`; };
  const txt = (s) => String(s || '').replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const s = S();
  const list = s.tasks.filter((t) => !t.done && t.due);
  const ev = list.map((t) => {
    const d = new Date(t.due);
    const timed = d.getHours() || d.getMinutes();
    const pr = t.projectId && getProject(t.projectId);
    return ['BEGIN:VEVENT', `UID:${t.id}@mindview`, `DTSTAMP:${utc(Date.now())}`,
      timed ? `DTSTART:${utc(t.due)}` : `DTSTART;VALUE=DATE:${day(t.due)}`, timed ? `DTEND:${utc(t.due + 30 * 60e3)}` : `DTEND;VALUE=DATE:${day(t.due + DAY)}`,
      `SUMMARY:${txt(t.title)}`, (t.notes || pr) ? `DESCRIPTION:${txt([pr ? `Projet : ${pr.name}` : '', t.notes].filter(Boolean).join('\n'))}` : '', 'END:VEVENT'].filter(Boolean).join('\r\n');
  });
  const exams = s.exams.filter((x) => x.date >= startOfDay()).map((x) => ['BEGIN:VEVENT', `UID:${x.id}@mindview`, `DTSTAMP:${utc(Date.now())}`, `DTSTART;VALUE=DATE:${day(x.date)}`, `DTEND;VALUE=DATE:${day(x.date + DAY)}`, `SUMMARY:${txt(`Examen : ${x.title}`)}`, 'END:VEVENT'].join('\r\n'));
  return { n: list.length + exams.length, text: ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//M&S Design//MindView//FR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:MindView', ...ev, ...exams, 'END:VCALENDAR'].join('\r\n') };
}
// .ics → tâches (Google Agenda, Apple Calendrier, Outlook)
export function parseIcs(text) {
  const lines = String(text).replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
  const out = []; let cur = null;
  const val = (l) => l.slice(l.indexOf(':') + 1).replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
  const date = (l) => {
    const v = l.slice(l.indexOf(':') + 1).trim();
    const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
    if (!m) return null;
    if (!m[4]) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
    return m[7] ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime();
  };
  for (const l of lines) {
    if (l === 'BEGIN:VEVENT' || l === 'BEGIN:VTODO') cur = {};
    else if ((l === 'END:VEVENT' || l === 'END:VTODO') && cur) { if (cur.title) out.push(cur); cur = null; }
    else if (cur && /^SUMMARY[;:]/.test(l)) cur.title = val(l).trim().slice(0, 200);
    else if (cur && /^(DTSTART|DUE)[;:]/.test(l)) cur.due = date(l);
    else if (cur && /^DESCRIPTION[;:]/.test(l)) cur.notes = val(l).trim().slice(0, 2000);
    else if (cur && /^STATUS:COMPLETED/.test(l)) cur.done = true;
  }
  return out;
}
// CSV (Excel, Google Sheets, Notion base de données, Todoist) → lignes
export function parseCsv(text) {
  const src = String(text).replace(/^﻿/, '');
  const head = src.split(/\r?\n/)[0] || '';
  const d = [';', '\t', ','].map((c) => [c, head.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; continue; }
    if (c === '"') q = true; else if (c === d) { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && src[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
function csvToTasks(rows) {
  if (rows.length < 2) return [];
  const h = rows[0].map(norm);
  const col = (...names) => h.findIndex((x) => names.some((n) => x === n || x.startsWith(n)));
  const iT = col('content', 'titre', 'title', 'tache', 'task', 'name', 'nom', 'intitule', 'a faire');
  const iD = col('date', 'echeance', 'due', 'deadline', 'pour le');
  const iP = col('priorit', 'priority');
  const iS = col('statut', 'status', 'etat');
  const iN = col('description', 'notes', 'note', 'details');
  const iType = col('type');
  const parseDate = (v) => {
    const x = String(v || '').trim(); if (!x) return null;
    let m = x.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (m) return new Date(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)).getTime();
    m = x.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)).getTime();
    const t = Date.parse(x); return Number.isFinite(t) ? t : null;
  };
  return rows.slice(1).filter((r) => iType < 0 || !r[iType] || norm(r[iType]) === 'task').map((r) => {
    const title = (r[iT >= 0 ? iT : 0] || '').trim();
    const st = norm(r[iS]);
    const p = norm(r[iP]);
    return title && {
      title: title.slice(0, 200), due: parseDate(r[iD]), notes: iN >= 0 ? (r[iN] || '').slice(0, 2000) : '',
      prio: /urgent|haute|high|^1$|^4$|p1/.test(p) ? 2 : /moyenne|medium|^2$|^3$|p2|important/.test(p) ? 1 : 0,
      done: /fait|termine|done|complete|ok/.test(st), status: /cours|progress|doing/.test(st) ? 'doing' : 'todo',
    };
  }).filter(Boolean).slice(0, 1000);
}
// Trello (Menu → Imprimer, exporter → Exporter en JSON) → projet + tâches
function trelloToTasks(json) {
  const lists = Object.fromEntries((json.lists || []).map((l) => [l.id, l]));
  return { name: json.name || 'Tableau Trello', tasks: (json.cards || []).filter((c) => !c.closed).slice(0, 1000).map((c) => {
    const ln = norm(lists[c.idList]?.name);
    return { title: String(c.name || '').slice(0, 200), notes: String(c.desc || '').slice(0, 2000), due: c.due ? Date.parse(c.due) : null, done: !!c.dueComplete || /fait|termine|done|fini/.test(ln), status: /cours|doing|progress/.test(ln) ? 'doing' : 'todo' };
  }).filter((t) => t.title) };
}
// Quizlet (Exporter : « terme », tabulation, « définition ») → page de questions / réponses
function quizletToBlocks(text) {
  return String(text).replace(/\r/g, '').split('\n').map((l) => {
    const m = l.split(/\t| - | – |;/);
    return m.length >= 2 ? { id: bid(), t: 'qa', x: m[0].trim().slice(0, 500), a: m.slice(1).join(' ').trim().slice(0, 1000) } : null;
  }).filter((b) => b && b.x && b.a).slice(0, 500);
}

// ---------- Fichiers .zip (sans bibliothèque) ----------
async function unzip(buf) {
  const dv = new DataView(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('zip');
  const n = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const out = [];
  for (let k = 0; k < n && k < 4000; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), local = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(new Uint8Array(buf, p + 46, nl));
    p += 46 + nl + el + cl;
    const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    out.push({ name, method, data: new Uint8Array(buf, start, csize) });
  }
  return out;
}
// Taille maximale décompressée par fichier : un .zip piégé ne peut pas saturer la mémoire
const MAX_OUT = 25e6;
async function inflate(e) {
  if (e.method === 0) return e.data;
  if (e.method !== 8 || typeof DecompressionStream === 'undefined') throw new Error('deflate');
  const reader = new Blob([e.data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const chunks = []; let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.length;
    if (n > MAX_OUT) { await reader.cancel(); throw new Error('trop-gros'); }
    chunks.push(value);
  }
  const out = new Uint8Array(n); let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}
let CRC = null;
function crc32(b) {
  if (!CRC) CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0;
}
function zip(files) {
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  const d = new Date(), dosT = (d.getHours() << 11) | (d.getMinutes() << 5), dosD = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  files.forEach((f) => {
    const name = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, dosT, 2], [12, dosD, 2], [14, crc, 4], [18, data.length, 4], [22, data.length, 4], [26, name.length, 2], [28, 0, 2]].forEach(([o, v, s]) => (s === 4 ? lh.setUint32(o, v, true) : lh.setUint16(o, v, true)));
    parts.push(lh.buffer, name, data);
    const ch = new DataView(new ArrayBuffer(46));
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, dosT, 2], [14, dosD, 2], [16, crc, 4], [20, data.length, 4], [24, data.length, 4], [28, name.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, off, 4]].forEach(([o, v, s]) => (s === 4 ? ch.setUint32(o, v, true) : ch.setUint16(o, v, true)));
    central.push(ch.buffer, name);
    off += 30 + name.length + data.length;
  });
  const size = central.reduce((n, b) => n + (b.byteLength ?? b.length), 0);
  const end = new DataView(new ArrayBuffer(22));
  [[0, 0x06054b50, 4], [8, files.length, 2], [10, files.length, 2], [12, size, 4], [16, off, 4]].forEach(([o, v, s]) => (s === 4 ? end.setUint32(o, v, true) : end.setUint16(o, v, true)));
  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
}
const saveBlob = (name, blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); };
const fileName = (s) => String(s || 'page').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 60);

// Pages Notion : fichiers .md, ou l'export .zip complet (y compris les .zip imbriqués)
async function importNotionFiles(files) {
  let n = 0, stop = false, skipped = 0;
  const addMd = (text, name) => {
    if (!canAddPage()) { stop = true; return; }
    const { title, blocks } = mdToPage(text, name.split('/').pop().replace(/\.(md|markdown|txt)$/i, '').replace(/\s[0-9a-f]{32}$/i, ''));
    addPage({ title, icon: 'page', blocks }); n++;
  };
  for (const f of files) {
    if (stop) break;
    if (/\.zip$/i.test(f.name)) {
      if (f.size > 2e8) { skipped++; continue; }
      const queue = [await f.arrayBuffer()]; let nested = 0;
      while (queue.length && !stop) {
        for (const e of await unzip(queue.shift())) {
          if (stop) break;
          if (/\.zip$/i.test(e.name)) { if (++nested > 40) { skipped++; continue; } const d = await inflate(e); queue.push(d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength)); }
          else if (/\.(md|markdown)$/i.test(e.name)) addMd(new TextDecoder().decode(await inflate(e)), e.name);
          else skipped++;
        }
      }
    } else if (f.size < 2e6) addMd(await f.text(), f.name);
  }
  return { n, stop, skipped };
}

// ---------- L'écran Connecteurs ----------
const CX = {
  notion: { name: 'Notion', tone: 'grey', l: 'N', cat: 'docs' },
  gdocs: { name: 'Google Docs, Sheets, Slides', tone: 'blue', l: 'G', cat: 'docs' },
  figma: { name: 'Figma', tone: 'navy', l: 'F', cat: 'design' },
  canva: { name: 'Canva', tone: 'sky', l: 'C', cat: 'design' },
  miro: { name: 'Miro', tone: 'sand', l: 'M', cat: 'design' },
  agenda: { name: 'Google Agenda, Apple Calendrier, Outlook', tone: 'blue', l: '31', cat: 'agenda' },
  trello: { name: 'Trello', tone: 'blue', l: 'T', cat: 'tasks' },
  todoist: { name: 'Todoist', tone: 'rose', l: 'Td', cat: 'tasks' },
  excel: { name: 'Excel, Google Sheets, CSV', tone: 'olive', l: 'X', cat: 'tasks' },
  quizlet: { name: 'Quizlet', tone: 'navy', l: 'Q', cat: 'study' },
  anki: { name: 'Anki', tone: 'sky', l: 'A', cat: 'study' },
  youtube: { name: 'YouTube, Loom', tone: 'rose', l: '▶', cat: 'video' },
  github: { name: 'GitHub', tone: 'navy', l: 'GH', cat: 'code' },
};
const CATS = [['docs', 'Notes et documents'], ['design', 'Design et schémas'], ['agenda', 'Agendas'], ['tasks', 'Tâches'], ['study', 'Révisions'], ['video', 'Vidéos'], ['code', 'Code']];
export function connectorsView(params, q = {}) {
  const s = S();
  const pro = can('connectors');
  const used = (k) => s.cx?.[k];
  const links = (kinds) => [...s.projects, ...s.prospects].reduce((n, x) => n + (x.links || []).filter((l) => kinds.includes(l.kind)).length, 0);
  const lock = pro ? '' : '<span class="badge b-pro">Pro</span>';
  const fileBtn = (act, label, accept, icon = 'upload', primary = true) => `<label class="btn ${primary ? 'btn-primary' : 'btn-ghost'} btn-sm ${pro ? '' : 'is-locked'}">${ic(icon)}<span>${label}</span>${lock}<input type="file" accept="${accept}" ${act === 'cx-notion' ? 'multiple' : ''} hidden data-act-change="${pro ? act : 'cx-locked'}" ${pro ? '' : 'disabled'}></label>`;
  const btn = (act, label, icon, primary = false, attrs = '') => `<button class="btn ${primary ? 'btn-primary' : 'btn-ghost'} btn-sm" data-act="${act}" ${attrs}>${ic(icon)}<span>${label}</span></button>`;
  const proBtn = (act, label, icon, primary = false, attrs = '') => `<button class="btn ${primary ? 'btn-primary' : 'btn-ghost'} btn-sm" data-act="${pro ? act : 'cx-locked'}" ${attrs}>${ic(icon)}<span>${label}</span>${lock}</button>`;
  const card = (k, text, acts, status = '') => `<section class="card cx rise ${q.c === k || (q.c === 'google' && k === 'gdocs') ? 'is-focus' : ''}" id="cx-${k}">
    <header class="cx-h">${svcBadge(k, 'svc-lg')}<div><h2>${CX[k].name}</h2><p>${status || (used(k) ? `Dernière utilisation ${ago(used(k).at)}` : 'Prêt à utiliser')}</p></div>${used(k) || status.includes('lien') ? `<span class="chip t-olive">${ic('check')}Utilisé</span>` : ''}</header>
    <p class="cx-p">${text}</p><div class="cx-a">${acts}</div></section>`;
  const C = {
    notion: card('notion', 'Venez de Notion avec toutes vos pages : dans Notion, Paramètres → Exporter tout l\'espace en « Markdown & CSV », puis importez le fichier .zip tel quel. Et dans l\'autre sens, exportez toutes vos pages MindView pour Notion.', `${fileBtn('cx-notion', 'Importer l\'export Notion (.zip ou .md)', '.zip,.md,.markdown,.txt,application/zip,text/markdown')}${proBtn('cx-notion-out', 'Exporter mes pages pour Notion', 'download')}${btn('cx-pick', 'Relier une page Notion', 'link', false, 'data-svc="notion"')}`),
    gdocs: card('gdocs', 'Un document, une feuille de calcul ou une présentation Google, rangé dans le projet qui le concerne, avec un aperçu lisible sans quitter MindView.', `${btn('cx-pick', 'Relier un document', 'link', true, 'data-svc="gdocs"')}${fileBtn('cx-csv', 'Importer des tâches (.csv)', '.csv,.tsv,.txt,text/csv', 'upload', false)}`, links(['gdocs', 'gsheets', 'gslides', 'drive']) ? `${links(['gdocs', 'gsheets', 'gslides', 'drive'])} lien(s)` : ''),
    figma: card('figma', 'Collez le lien d\'une maquette, d\'un prototype ou d\'un FigJam : il s\'ouvre dans Figma pour le modifier, avec un aperçu intégré si vous le demandez.', btn('cx-pick', 'Relier à un projet', 'link', true, 'data-svc="figma"'), links(['figma']) ? `${links(['figma'])} lien(s)` : ''),
    canva: card('canva', 'Visuels, présentations, publications : chaque design partagé s\'ouvre dans Canva, avec un aperçu dans le projet.', btn('cx-pick', 'Relier à un projet', 'link', true, 'data-svc="canva"'), links(['canva']) ? `${links(['canva'])} lien(s)` : ''),
    miro: card('miro', 'Vos tableaux Miro dans vos projets, avec un aperçu en direct. Pour dessiner seul, le tableau blanc de MindView est là.', `${btn('cx-pick', 'Relier un tableau', 'link', true, 'data-svc="miro"')}<a class="btn btn-ghost btn-sm" href="#/tableaux">${ic('compose')}<span>Tableau blanc</span></a>`, links(['miro']) ? `${links(['miro'])} lien(s)` : ''),
    agenda: card('agenda', 'Envoyez vos tâches datées et vos examens dans votre agenda, ou récupérez les événements de votre agenda comme tâches. Le fichier .ics s\'ouvre avec n\'importe quel agenda.', `${btn('cx-ics', 'Exporter vers mon agenda (.ics)', 'download', true)}${fileBtn('cx-ics-in', 'Importer un agenda (.ics)', '.ics,text/calendar', 'upload', false)}`),
    trello: card('trello', 'Dans Trello : Menu → Imprimer, exporter et partager → Exporter en JSON. Le tableau devient un projet, chaque carte une tâche, avec ses dates.', fileBtn('cx-trello', 'Importer un tableau (.json)', '.json,application/json')),
    todoist: card('todoist', 'Dans Todoist : les trois points d\'un projet → Exporter en modèle (CSV). Les tâches arrivent avec leurs dates et priorités.', fileBtn('cx-csv', 'Importer des tâches (.csv)', '.csv,text/csv')),
    excel: card('excel', 'Une liste de tâches dans un tableur : une colonne « Titre » (ou « Tâche »), et si vous voulez « Date », « Priorité », « Statut », « Notes ». Fonctionne aussi avec une base de données Notion exportée en CSV.', `${fileBtn('cx-csv', 'Importer (.csv)', '.csv,.tsv,.txt,text/csv')}${proBtn('cx-csv-out', 'Exporter mes tâches (.csv)', 'download')}`),
    quizlet: card('quizlet', 'Dans Quizlet : … → Exporter, puis copiez le texte. Chaque terme et sa définition deviennent une carte de révision, avec la révision espacée.', proBtn('cx-quizlet', 'Coller des cartes Quizlet', 'cards', true)),
    anki: card('anki', 'Envoyez les questions / réponses de vos pages vers Anki : Fichier → Importer, séparateur tabulation.', proBtn('cx-anki', 'Exporter mes cartes pour Anki', 'download')),
    youtube: card('youtube', 'Un cours en vidéo ou une explication enregistrée : collez le lien dans un projet, la vidéo se lit dans l\'aperçu.', btn('cx-pick', 'Relier une vidéo', 'link', true, 'data-svc="youtube"'), links(['youtube', 'loom']) ? `${links(['youtube', 'loom'])} lien(s)` : ''),
    github: card('github', 'Le dépôt de votre projet de code, à côté de ses tâches et de ses notes.', btn('cx-pick', 'Relier un dépôt', 'link', true, 'data-svc="github"'), links(['github']) ? `${links(['github'])} lien(s)` : ''),
  };
  const html = `${pageHead('Connecteurs', { kicker: 'Vos outils, reliés à MindView' })}
    <p class="lead">Importez ce que vous avez déjà ailleurs, rangez vos fichiers au bon endroit, et renvoyez vos tâches vers votre agenda. Tout se fait ici, en un geste.</p>
    <nav class="chips-row cx-nav" aria-label="Catégories">${CATS.map(([k, l]) => `<a class="chip-btn" href="#/connecteurs?c=${Object.keys(CX).find((x) => CX[x].cat === k)}">${l}</a>`).join('')}</nav>
    ${CATS.map(([k, l]) => `<h2 class="sec-title">${l}</h2><div class="cx-grid">${Object.keys(CX).filter((x) => CX[x].cat === k).map((x) => C[x]).join('')}</div>`).join('')}
    <section class="card cx-soon rise">${ic('refresh')}<div><b>Synchronisation automatique</b><p>Pour qu'un changement fait dans Notion, Google ou Canva apparaisse tout seul ici (et inversement), il faut un compte MindView en ligne et l'autorisation officielle de chaque service, que vous donnerez vous-même. C'est prévu avec les comptes en ligne. D'ici là, les imports et exports ci-dessus font le lien, et rien ne quitte votre appareil sans votre geste.</p></div></section>`;
  return {
    title: 'Connecteurs', tab: 'plus', html,
    after(root) { if (q.c) root.querySelector(`#cx-${q.c === 'google' ? 'gdocs' : q.c}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }); },
  };
}
const quizletSheet = () => sheet(`${sheetHead('Cartes Quizlet', 'Un terme et sa définition par ligne, séparés par une tabulation')}
  <form class="sheet-body form" data-form="cx-quizlet">
    ${field('Titre de la page', input('title', 'Révision', 'maxlength="80"'))}
    ${field('Cartes', '<textarea class="inp" name="raw" rows="8" required placeholder="1789&#9;Prise de la Bastille&#10;Napoléon&#9;Empereur des Français en 1804"></textarea>', 'Dans Quizlet : … → Exporter → Copier le texte, puis collez ici.')}
    <button class="btn btn-primary btn-block" type="submit">Créer les cartes</button>
  </form>`, { cls: 'sheet-sm' });
const readText = (el) => el.files?.[0]?.text?.() ?? Promise.resolve('');

register({
  'link-add': (b) => linkSheet(b.dataset.kind, b.dataset.id, b.dataset.svc || ''),
  'link-del': async (b) => {
    const { kind, id, l } = b.dataset;
    const t = target(S(), kind, id);
    const lk = (t?.links || []).find((x) => x.id === l);
    if (!lk || !await confirmSheet({ title: `Retirer « ${esc(lk.label || SERVICES[lk.kind]?.name || 'ce lien')} » ?`, text: 'Seul le lien est retiré : le fichier reste intact dans son application.', ok: 'Retirer', danger: true })) return;
    update((s) => { const x = target(s, kind, id); x.links = (x.links || []).filter((y) => y.id !== l); });
    toast('Lien retiré');
  },
  'link-embed': (b) => { const id = b.dataset.l; if (shown.has(id)) shown.delete(id); else shown.add(id); window.dispatchEvent(new Event('ms:rerender')); },
  'cx-pick': (b) => pickProject(b.dataset.svc),
  'cx-locked': () => sheet(`${sheetHead('Connecteurs')}<div class="sheet-body">${paywall('connectors', { compact: true })}</div>`, { cls: 'sheet-sm' }),
  'cx-ics': () => {
    const { n, text } = tasksIcs();
    if (!n) { toast('Donnez une date à vos tâches : elles pourront aller dans votre agenda.', { title: 'Aucune tâche datée' }); return; }
    download('mindview-agenda.ics', text, 'text/calendar;charset=utf-8'); mark('agenda');
    toast(`Ouvrez le fichier avec votre agenda pour y ajouter ${n} élément${n > 1 ? 's' : ''}.`, { title: 'Fichier agenda prêt' });
  },
  'cx-ics-in': async (el) => {
    const evs = parseIcs(await readText(el)); el.value = '';
    const from = startOfDay() - 7 * DAY;
    const keep = evs.filter((e) => !e.due || e.due >= from).slice(0, 500);
    if (!keep.length) { toast('Aucun événement récent ou à venir dans ce fichier.', { title: 'Import agenda' }); return; }
    keep.forEach((e) => addTask({ title: e.title, due: e.due, notes: e.notes || '', done: !!e.done, doneAt: e.done ? Date.now() : null, status: e.done ? 'done' : 'todo' }));
    mark('agenda', keep.length);
    toast(`${keep.length} événement${keep.length > 1 ? 's' : ''} ajouté${keep.length > 1 ? 's' : ''} comme tâches.`, { title: 'Agenda importé', action: 'Calendrier', onAction: () => { location.hash = '#/agenda'; } });
  },
  'cx-notion': async (el) => {
    const files = [...(el.files || [])]; el.value = '';
    try {
      const { n, stop, skipped } = await importNotionFiles(files);
      if (n) mark('notion', n);
      if (n) toast(`${n} page${n > 1 ? 's' : ''} importée${n > 1 ? 's' : ''} dans Notes${skipped ? ` (${skipped} fichier${skipped > 1 ? 's' : ''} non textuel${skipped > 1 ? 's' : ''} ignoré${skipped > 1 ? 's' : ''})` : ''}${stop ? ' — la version gratuite s\'arrête à 5 pages' : ''}.`, { title: 'Import Notion', action: 'Voir', onAction: () => { location.hash = '#/notes'; }, ms: 5000 });
      else toast(stop ? 'La version gratuite garde 5 pages : passez à Pro pour en importer davantage.' : 'Aucune page Markdown trouvée dans ce fichier.', { title: 'Import Notion' });
    } catch (e) { toast('Ce fichier ne peut pas être lu. Exportez depuis Notion en « Markdown & CSV ».', { title: 'Import Notion' }); }
  },
  'cx-notion-out': () => {
    const pages = S().pages;
    if (!pages.length) { toast('Aucune page à exporter.'); return; }
    const used = {};
    const files = pages.map((p) => { let n = fileName(p.title || 'Sans titre'); used[n] = (used[n] || 0) + 1; if (used[n] > 1) n += ` (${used[n]})`; return { name: `${n}.md`, text: pageMd(p) }; });
    saveBlob('mindview-pages-notion.zip', zip(files)); mark('notion');
    toast(`${files.length} pages dans un .zip : dans Notion, Importer → Texte et Markdown.`, { title: 'Export pour Notion' });
  },
  'cx-csv': async (el) => {
    const tasks = csvToTasks(parseCsv(await readText(el))); el.value = '';
    if (!tasks.length) { toast('Aucune tâche reconnue : il faut une ligne d\'en-tête avec une colonne « Titre » ou « Tâche ».', { title: 'Import CSV', ms: 4500 }); return; }
    tasks.forEach((t) => addTask({ ...t, doneAt: t.done ? Date.now() : null, status: t.done ? 'done' : t.status }));
    mark('excel', tasks.length);
    toast(`${tasks.length} tâche${tasks.length > 1 ? 's' : ''} importée${tasks.length > 1 ? 's' : ''}.`, { title: 'Import CSV', action: 'Voir', onAction: () => { location.hash = '#/taches'; } });
  },
  'cx-csv-out': () => {
    const q2 = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const pad = (n) => String(n).padStart(2, '0');
    const d = (t) => (t ? `${pad(new Date(t).getDate())}/${pad(new Date(t).getMonth() + 1)}/${new Date(t).getFullYear()} ${pad(new Date(t).getHours())}:${pad(new Date(t).getMinutes())}` : '');
    const rows = [['Titre', 'Date', 'Priorité', 'Statut', 'Projet', 'Notes'], ...S().tasks.map((t) => [t.title, d(t.due), ['Normale', 'Importante', 'Urgente'][t.prio || 0], t.done ? 'Terminée' : t.status === 'doing' ? 'En cours' : 'À faire', getProject(t.projectId)?.name || '', t.notes || ''])];
    download('mindview-taches.csv', `﻿${rows.map((r) => r.map(q2).join(';')).join('\r\n')}`, 'text/csv;charset=utf-8'); mark('excel');
    toast('Fichier .csv prêt : il s\'ouvre dans Excel, Numbers ou Google Sheets.', { title: 'Tâches exportées' });
  },
  'cx-trello': async (el) => {
    let json; try { json = JSON.parse(await readText(el)); } catch (e) { json = null; } el.value = '';
    if (!json?.cards) { toast('Ce fichier n\'est pas un export Trello (.json).', { title: 'Import Trello' }); return; }
    const { name, tasks } = trelloToTasks(json);
    let projectId = null;
    if (canAddProject()) { const pr = newProject({ name, icon: 'board', tone: 'blue' }); projectId = pr.id; update((s) => { s.projects.unshift(pr); }, { silent: true }); }
    tasks.forEach((t, k) => addTask({ ...t, projectId, doneAt: t.done ? Date.now() : null, status: t.done ? 'done' : t.status, createdAt: Date.now() + k }));
    mark('trello', tasks.length);
    toast(`${tasks.length} carte${tasks.length > 1 ? 's' : ''} importée${tasks.length > 1 ? 's' : ''}${projectId ? ` dans le projet « ${esc(name)} »` : ''}.`, { title: 'Import Trello', action: projectId ? 'Ouvrir' : '', onAction: projectId ? () => { location.hash = `#/projet/${projectId}`; } : undefined });
  },
  'cx-quizlet': () => quizletSheet(),
  'cx-anki': () => {
    const cards = S().pages.flatMap((p) => p.blocks.filter((b) => b.t === 'qa' && (b.x || '').trim() && (b.a || '').trim()).map((b) => [b.x, b.a, p.title || 'MindView']));
    if (!cards.length) { toast('Aucune question / réponse dans vos pages. Ajoutez un bloc « Question / réponse » (tapez ?? puis espace).', { title: 'Export Anki', ms: 4500 }); return; }
    const clean = (v) => String(v).replace(/[\t\r\n]+/g, ' ');
    download('mindview-cartes-anki.txt', cards.map((c) => `${clean(c[0])}\t${clean(c[1])}\t${clean(c[2]).replace(/\s+/g, '_')}`).join('\n'), 'text/plain;charset=utf-8'); mark('anki');
    toast(`${cards.length} carte${cards.length > 1 ? 's' : ''} : dans Anki, Fichier → Importer, séparateur tabulation.`, { title: 'Cartes exportées' });
  },
}, {
  link: (d, f) => {
    const det = detect((d.url || '').trim());
    if (!det) { toast('Collez une adresse complète, qui commence par https://', { title: 'Lien non reconnu' }); return; }
    const { kind, id } = f.dataset;
    update((s) => { const x = target(s, kind, id); if (!x) return; x.links = [...(x.links || []), { id: 'lk-' + uid(), kind: det.kind, url: det.url, label: (d.label || '').trim().slice(0, 60), at: Date.now() }]; });
    closeSheet();
    toast(embedUrl({ kind: det.kind, url: det.url }) ? 'Touchez « Afficher l\'aperçu » pour le voir ici.' : `Il s'ouvre dans ${SERVICES[det.kind].name} en un geste.`, { title: `Lien ${SERVICES[det.kind].name} ajouté` });
  },
  'cx-quizlet': (d) => {
    const blocks = quizletToBlocks(d.raw || '');
    if (!blocks.length) { toast('Aucune carte reconnue : un terme et sa définition par ligne, séparés par une tabulation.', { title: 'Cartes Quizlet' }); return; }
    if (!canAddPage()) { closeSheet(); toast('La version gratuite garde 5 pages.', { title: 'Cartes Quizlet' }); return; }
    const p = addPage({ title: `${(d.title || 'Révision').trim().slice(0, 80)}`, icon: 'cards', blocks: [{ id: bid(), t: 'callout', x: 'Cartes importées de Quizlet : révisez-les avec « Réviser », ou dans la révision espacée.' }, ...blocks] });
    mark('quizlet', blocks.length);
    closeSheet(); location.hash = `#/note/${p.id}`;
    toast(`${blocks.length} carte${blocks.length > 1 ? 's' : ''} prête${blocks.length > 1 ? 's' : ''} à réviser.`, { title: 'Cartes Quizlet' });
  },
});
export { zip as zipFiles, unzip, importNotionFiles, trelloToTasks, quizletToBlocks, csvToTasks };
