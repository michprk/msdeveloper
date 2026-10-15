// Connecteurs : relier un projet ou une fiche à ses fichiers Canva, Figma, Notion, Drive, GitHub…
// Ce qui marche dès maintenant, sans compte en ligne : liens reconnus et ouverts en un geste,
// aperçu intégré Figma / Canva à la demande, import de pages Notion (Markdown), export des
// tâches datées vers un agenda (.ics). La synchronisation automatique demandera des comptes
// en ligne et les autorisations officielles de chaque service (voir SECURITE.md).
import { S, update, uid, canAddPage, addPage, bid, getProject } from '../store.js';
import { ic, esc, register, toast, sheet, sheetHead, closeSheet, confirmSheet, field, input, download } from '../ui.js';
import { pageHead } from './common.js';

export const SERVICES = {
  figma: { name: 'Figma', tone: 'navy', l: 'F', embed: true, hint: 'Maquettes, prototypes, tableaux blancs' },
  canva: { name: 'Canva', tone: 'sky', l: 'C', embed: true, hint: 'Visuels, présentations, réseaux sociaux' },
  notion: { name: 'Notion', tone: 'grey', l: 'N', hint: 'Pages et bases de données' },
  drive: { name: 'Google Drive', tone: 'olive', l: 'D', hint: 'Docs, Sheets, Slides, dossiers' },
  github: { name: 'GitHub', tone: 'navy', l: 'G', hint: 'Code, tickets, versions' },
  web: { name: 'Lien', tone: 'sand', l: '↗', hint: 'N\'importe quelle page' },
};
export function detect(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const h = u.hostname.replace(/^www\./, '');
  const kind = /(^|\.)figma\.com$/.test(h) ? 'figma' : /(^|\.)canva\.com$/.test(h) || h === 'canva.link' ? 'canva' : /(^|\.)notion\.(so|site)$/.test(h) ? 'notion'
    : /^(docs|drive|sheets|slides)\.google\.com$/.test(h) ? 'drive' : /(^|\.)github\.com$/.test(h) ? 'github' : 'web';
  return { kind, url: u.href, host: h };
}
// Adresse d'aperçu : Figma fournit une page d'intégration officielle ; Canva aussi pour un
// design partagé « Toute personne disposant du lien ».
export function embedUrl(l) {
  if (l.kind === 'figma' && /figma\.com\/(file|design|proto|board|slides)\//.test(l.url)) return `https://www.figma.com/embed?embed_host=msdeveloper&url=${encodeURIComponent(l.url)}`;
  if (l.kind === 'canva') { const m = l.url.match(/canva\.com\/design\/([\w-]+)\/([\w-]+)/); if (m) return `https://www.canva.com/design/${m[1]}/${m[2]}/view?embed`; }
  return '';
}
const target = (s, kind, id) => (kind === 'project' ? s.projects : kind === 'task' ? s.tasks : s.prospects).find((x) => x.id === id);
export const svcBadge = (k, cls = '') => `<span class="svc svc-${k} k-${SERVICES[k].tone} ${cls}" aria-hidden="true">${SERVICES[k].l}</span>`;

let shown = new Set();
export function linksBlock(kind, id, links = []) {
  return `<section class="card links-card rise">
    <header class="card-h"><div><h2>Fichiers et liens</h2><p>${links.length ? `${links.length} lien${links.length > 1 ? 's' : ''}` : 'Canva, Figma, Notion, Drive, GitHub…'}</p></div><button class="link" data-act="link-add" data-kind="${kind}" data-id="${id}">${ic('plus')}Lien</button></header>
    ${links.length ? `<ul class="rows links">${links.filter((l) => detect(l.url) && SERVICES[l.kind]).map((l) => {
      const emb = embedUrl(l);
      return `<li class="lk">
        <div class="lk-r"><a class="row" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${svcBadge(l.kind)}<span class="row-b"><b>${esc(l.label || SERVICES[l.kind].name)}</b><span>${esc(SERVICES[l.kind].name)} · ${esc(detect(l.url)?.host || '')}</span></span>${ic('external', 'chev')}</a>
          <button class="icon-btn sm" data-act="link-del" data-kind="${kind}" data-id="${id}" data-l="${l.id}" aria-label="Retirer le lien « ${esc(l.label || SERVICES[l.kind].name)} »">${ic('x')}</button></div>
        ${emb ? (shown.has(l.id) ? `<div class="lk-embed"><iframe src="${esc(emb)}" title="Aperçu ${esc(SERVICES[l.kind].name)}" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" allowfullscreen></iframe></div><button class="link" data-act="link-embed" data-l="${l.id}">Masquer l'aperçu</button>`
          : `<button class="link" data-act="link-embed" data-l="${l.id}">${ic('eye')}Afficher l'aperçu</button>`) : ''}
      </li>`;
    }).join('')}</ul>` : `<div class="lk-empty">${['figma', 'canva', 'notion', 'drive'].map((k) => svcBadge(k)).join('')}<p>Collez le lien d'un fichier : il s'ouvre en un geste pour le modifier dans son application.</p></div>`}
  </section>`;
}

function linkSheet(kind, id, svc = '') {
  const s = SERVICES[svc];
  sheet(`${sheetHead(s && svc !== 'web' ? `Ajouter un lien ${s.name}` : 'Ajouter un lien', 'Le fichier reste dans son application : ici, vous le retrouvez au bon endroit.')}
    <form class="sheet-body form" data-form="link" data-kind="${kind}" data-id="${id}" data-validate novalidate>
      ${field('Adresse du fichier', input('url', '', `type="url" required autofocus inputmode="url" placeholder="${svc === 'canva' ? 'https://www.canva.com/design/…' : svc === 'notion' ? 'https://www.notion.so/…' : 'https://www.figma.com/design/…'}"`), svc === 'canva' ? 'Pour l\'aperçu : dans Canva, Partager → « Toute personne disposant du lien ».' : 'Dans l\'application : Partager → Copier le lien.')}
      ${field('Nom (facultatif)', input('label', '', 'maxlength="60" placeholder="Maquette page d\'accueil, Logo, Cahier des charges…"'))}
      <button class="btn btn-primary btn-block" type="submit" data-needs="url" disabled>Ajouter</button>
    </form>`, { cls: 'sheet-sm' });
}
function pickProject(svc) {
  const list = S().projects.filter((p) => p.status !== 'termine');
  sheet(`${sheetHead(`Relier ${SERVICES[svc].name} à un projet`)}<div class="sheet-body">
    ${list.length ? `<ul class="rows">${list.map((p) => `<li><button class="row" data-act="link-add" data-kind="project" data-id="${p.id}" data-svc="${svc}"><span class="menu-ic">${ic(p.icon || 'folder')}</span><span class="row-b"><b>${esc(p.name)}</b><span>${(p.links || []).length} lien${(p.links || []).length > 1 ? 's' : ''}</span></span>${ic('chevR', 'chev')}</button></li>`).join('')}</ul>`
      : `<p class="sheet-p">Créez d'abord un projet : examen, site, client, événement…</p><button class="btn btn-primary btn-block" data-act="go-projects">${ic('plus')}<span>Créer un projet</span></button>`}
  </div>`, { cls: 'sheet-sm' });
}

// Markdown (export Notion « Markdown & CSV ») → blocs de page
export function mdToPage(md, fallback = 'Page importée') {
  const lines = String(md).replace(/\r/g, '').split('\n');
  let title = '';
  const blocks = [];
  for (let raw of lines) {
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

// Tâches datées → fichier .ics (Google Agenda, Apple Calendrier, Outlook)
export function tasksIcs() {
  const pad = (n) => String(n).padStart(2, '0');
  const utc = (t) => { const d = new Date(t); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`; };
  const day = (t) => { const d = new Date(t); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`; };
  const txt = (s) => String(s || '').replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const list = S().tasks.filter((t) => !t.done && t.due);
  const ev = list.map((t) => {
    const d = new Date(t.due);
    const timed = d.getHours() || d.getMinutes();
    const pr = t.projectId && getProject(t.projectId);
    return ['BEGIN:VEVENT', `UID:${t.id}@msdeveloper`, `DTSTAMP:${utc(Date.now())}`,
      timed ? `DTSTART:${utc(t.due)}` : `DTSTART;VALUE=DATE:${day(t.due)}`, timed ? `DTEND:${utc(t.due + 30 * 60e3)}` : `DTEND;VALUE=DATE:${day(t.due + 864e5)}`,
      `SUMMARY:${txt(t.title)}`, (t.notes || pr) ? `DESCRIPTION:${txt([pr ? `Projet : ${pr.name}` : '', t.notes].filter(Boolean).join('\n'))}` : '', 'END:VEVENT'].filter(Boolean).join('\r\n');
  });
  return { n: list.length, text: ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//M&S Design//M&S Developer//FR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:M&S Developer', ...ev, 'END:VCALENDAR'].join('\r\n') };
}

export function connectorsView() {
  const s = S();
  const count = (k) => [...s.projects, ...s.prospects].reduce((n, x) => n + (x.links || []).filter((l) => l.kind === k).length, 0);
  const card = (k, body, acts) => `<section class="card cx rise"><header class="cx-h">${svcBadge(k, 'svc-lg')}<div><h2>${SERVICES[k].name}</h2><p>${SERVICES[k].hint}${count(k) ? ` · ${count(k)} lien${count(k) > 1 ? 's' : ''}` : ''}</p></div></header><p class="cx-p">${body}</p><div class="cx-a">${acts}</div></section>`;
  const html = `${pageHead('Connecteurs', { kicker: 'Vos outils, rangés dans vos projets', back: '#/plus' })}
    <p class="lead">Gardez vos fichiers dans les applications que vous aimez, et retrouvez-les au bon endroit : dans le projet ou la fiche client concernés, à un geste de les modifier.</p>
    <div class="cx-grid">
      ${card('figma', 'Collez le lien d\'une maquette ou d\'un prototype : il s\'ouvre dans Figma pour le modifier, avec un aperçu intégré si vous le demandez.', `<button class="btn btn-primary btn-sm" data-act="cx-pick" data-svc="figma">${ic('link')}<span>Relier à un projet</span></button>`)}
      ${card('canva', 'Visuels, présentations, publications : chaque design partagé s\'ouvre dans Canva, avec un aperçu dans le projet.', `<button class="btn btn-primary btn-sm" data-act="cx-pick" data-svc="canva">${ic('link')}<span>Relier à un projet</span></button>`)}
      ${card('notion', 'Venez de Notion avec vos pages : exportez-les en « Markdown & CSV », décompressez, puis importez les fichiers .md ici. Et dans l\'autre sens, chaque page se télécharge en .md, que Notion importe tel quel.', `<label class="btn btn-primary btn-sm">${ic('upload')}<span>Importer des pages .md</span><input type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" multiple hidden data-act-change="cx-notion"></label><button class="btn btn-ghost btn-sm" data-act="cx-pick" data-svc="notion">${ic('link')}<span>Relier une page</span></button>`)}
      ${card('drive', 'Un Google Doc, une feuille de calcul ou un dossier partagé, rangé dans le projet qui le concerne.', `<button class="btn btn-ghost btn-sm" data-act="cx-pick" data-svc="drive">${ic('link')}<span>Relier à un projet</span></button>`)}
      ${card('github', 'Le dépôt de votre projet de code, à côté de ses tâches et de ses notes.', `<button class="btn btn-ghost btn-sm" data-act="cx-pick" data-svc="github">${ic('link')}<span>Relier à un projet</span></button>`)}
      <section class="card cx rise"><header class="cx-h"><span class="svc svc-lg k-blue" aria-hidden="true">${ic('calendar')}</span><div><h2>Agenda</h2><p>Google Agenda, Apple Calendrier, Outlook</p></div></header>
        <p class="cx-p">Exportez vos tâches datées dans un fichier .ics, puis ouvrez-le avec votre agenda : elles y apparaissent à leur date et à leur heure.</p>
        <div class="cx-a"><button class="btn btn-ghost btn-sm" data-act="cx-ics">${ic('download')}<span>Exporter mes tâches (.ics)</span></button></div></section>
    </div>
    <section class="card cx-soon rise">${ic('refresh')}<div><b>Synchronisation automatique</b><p>Pour qu'un changement fait dans Canva, Figma ou Notion apparaisse tout seul ici (et inversement), il faut un compte M&amp;S en ligne et l'autorisation officielle de chaque service, que vous donnerez vous-même. C'est prévu avec les comptes en ligne. D'ici là, rien ne quitte votre appareil sans votre geste.</p></div></section>`;
  return { title: 'Connecteurs', tab: 'plus', html };
}

register({
  'link-add': (b) => linkSheet(b.dataset.kind, b.dataset.id, b.dataset.svc || ''),
  'link-del': async (b) => {
    const { kind, id, l } = b.dataset;
    const t = target(S(), kind, id);
    const lk = (t?.links || []).find((x) => x.id === l);
    if (!lk || !await confirmSheet({ title: `Retirer « ${esc(lk.label || SERVICES[lk.kind].name)} » ?`, text: 'Seul le lien est retiré : le fichier reste intact dans son application.', ok: 'Retirer', danger: true })) return;
    update((s) => { const x = target(s, kind, id); x.links = (x.links || []).filter((y) => y.id !== l); });
    toast('Lien retiré');
  },
  'link-embed': (b) => { const id = b.dataset.l; if (shown.has(id)) shown.delete(id); else shown.add(id); window.dispatchEvent(new Event('ms:rerender')); },
  'cx-pick': (b) => pickProject(b.dataset.svc),
  'cx-ics': () => {
    const { n, text } = tasksIcs();
    if (!n) { toast('Donnez une date à vos tâches : elles pourront aller dans votre agenda.', { title: 'Aucune tâche datée' }); return; }
    download('taches-msdeveloper.ics', text, 'text/calendar;charset=utf-8');
    toast(`Ouvrez le fichier avec votre agenda pour y ajouter ${n} tâche${n > 1 ? 's' : ''}.`, { title: 'Fichier agenda prêt' });
  },
  'cx-notion': async (el) => {
    const files = [...(el.files || [])].filter((f) => f.size < 2e6);
    let n = 0, stop = false;
    for (const f of files) {
      if (!canAddPage()) { stop = true; break; }
      const { title, blocks } = mdToPage(await f.text(), f.name.replace(/\.(md|markdown|txt)$/i, '').replace(/\s[0-9a-f]{32}$/i, ''));
      addPage({ title, icon: 'page', blocks });
      n++;
    }
    el.value = '';
    if (n) toast(stop ? `${n} page${n > 1 ? 's' : ''} importée${n > 1 ? 's' : ''} : la version gratuite s'arrête à 10 pages.` : `${n} page${n > 1 ? 's' : ''} importée${n > 1 ? 's' : ''} dans Notes.`, { title: 'Import Notion', action: 'Voir', onAction: () => { location.hash = '#/notes'; } });
    else toast(stop ? 'La version gratuite garde 10 pages : passez à Pro pour en importer davantage.' : 'Aucun fichier .md lisible.', { title: 'Import Notion' });
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
});
