// Notes : des pages et sous-pages faites de blocs (texte, titres, cases à cocher, listes,
// citation, encadré, séparateur, question / réponse). « / » ouvre le menu des blocs ;
// les raccourcis Markdown marchent aussi (# titre, - liste, [] case, > citation).
// Tout s'enregistre au fil de la frappe, sans rechargement de l'écran.
import { S, update, on, can, schoolOnly, addPage, getPage, getProspect, getProject, pageFamily, canAddPage, bid, addTask, LIMITS } from '../store.js';
import { ic, esc, register, toast, sheet, sheetHead, closeSheet, confirmSheet, ago, dateLong, copyText, download, select } from '../ui.js';
import { pageHead, paywall } from './common.js';
import { clean, plain, hasFormat, caretOffset, caretAtEnd, setCaret, splitAtCaret, wrapSelection } from '../rich.js';
import { mountCanvas, FONTS, FONT_GROUPS } from '../draw.js';
import { dataSheet } from './boards.js';
import { TEMPLATES, template } from '../data/templates.js';
// Modèles proposés : à l'école d'abord ceux qui servent aux cours ; jamais de compte rendu client sans CRM
const SCHOOL_ORDER = ['vierge', 'cours', 'revision', 'planning', 'vocab', 'semaine', 'journal', 'checklist', 'idees', 'objectifs', 'budget', 'code', 'projet', 'reunion'];
const tplList = () => (schoolOnly() ? SCHOOL_ORDER.map((id) => TEMPLATES.find((t) => t.id === id)).filter(Boolean) : TEMPLATES.filter((t) => t.id !== 'rdv' || on('clients')));

export const BLOCKS = [
  ['p', 'Texte', 'text', 'Un paragraphe'],
  ['h1', 'Grand titre', 'heading', '# + espace'],
  ['h2', 'Sous-titre', 'heading', '## + espace'],
  ['todo', 'Case à cocher', 'checkSquare', '[] + espace'],
  ['ul', 'Liste à puces', 'list', '- + espace'],
  ['ol', 'Liste numérotée', 'listNum', '1. + espace'],
  ['quote', 'Citation', 'quote', '> + espace'],
  ['callout', 'Encadré', 'callout', '! + espace'],
  ['qa', 'Question / réponse', 'cards', '?? + espace — pour réviser en quiz'],
  ['def', 'Définition', 'book', 'Un terme et sa définition : devient une carte'],
  ['table', 'Tableau', 'grid', 'Lignes et colonnes : planning, vocabulaire'],
  ['prog', 'Avancement', 'chart', 'La barre des cases cochées de la page'],
  ['divider', 'Séparateur', 'divider', '---'],
];
// Encadrés : quatre tons, chacun avec son icône
const TONES = { '': ['Information', 'callout'], lime: ['À retenir', 'star'], rose: ['Attention', 'flag'], lav: ['Astuce', 'bolt'], sand: ['Exemple', 'book'] };
// Couvertures de page
export const COVERS = [['', 'Aucune'], ['bleu', 'Bleu'], ['lime', 'Citron'], ['lavande', 'Lavande'], ['sable', 'Sable'], ['nuit', 'Nuit'], ['rose', 'Rose']];
// Changer le type d'un bloc en gardant ce qui peut l'être
function setType(b, t) {
  if (!b) return;
  if (t === 'table' && !b.rows) { b.rows = [[b.x || 'Colonne 1', 'Colonne 2'], ['', '']]; b.x = ''; delete b.h; }
  if (t !== 'table') delete b.rows;
  b.t = t;
  if (t === 'todo') b.c = !!b.c;
  if (isQA(b)) b.a = b.a || '';
  if (t !== 'callout') delete b.v;
  if (t === 'divider' || t === 'prog') { b.x = ''; delete b.h; }
}
// Tableau : la colonne « Fait » (ou « ✓ ») devient une colonne de cases à cocher
const doneCol = (rows) => (rows?.[0] || []).findIndex((h) => /^(fait|✓|ok|done)$/i.test(String(h).trim()));
// Avancement : cases à cocher de la page + lignes cochées des tableaux
export function progress(p) {
  let n = 0, d = 0;
  for (const b of p.blocks) {
    if (b.t === 'todo' && ((b.x || '').trim() || b.c)) { n++; if (b.c) d++; }
    if (b.t === 'table') { const c = doneCol(b.rows); if (c >= 0) b.rows.slice(1).forEach((r) => { if (r.some((v, j) => j !== c && String(v).trim())) { n++; if (r[c]) d++; } }); }
  }
  return { n, d, pct: n ? Math.round((d / n) * 100) : 0 };
}
const progInner = (p) => { const { n, d, pct } = progress(p); return n ? `<span class="prog-h"><b>Avancement</b><span>${d} sur ${n} terminé${d > 1 ? 's' : ''}</span><em>${pct} %</em></span><span class="prog-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></span>` : '<span class="prog-h"><b>Avancement</b><span>Ajoutez des cases à cocher : la barre se remplit toute seule.</span></span><span class="prog-bar"><i style="width:0"></i></span>'; };
const refreshProgress = (p) => document.querySelectorAll('.blk-prog .prog-w').forEach((el) => { el.innerHTML = progInner(p); });
const BL = Object.fromEntries(BLOCKS.map((b) => [b[0], b]));
const PAGE_ICONS = ['page', 'note', 'folder', 'briefcase', 'calendar', 'target', 'checkSquare', 'book', 'cards', 'users', 'star', 'flag', 'globe', 'camera', 'house', 'store', 'sun', 'inbox', 'bolt', 'compass'];
const PH = { p: 'Écrivez, ou tapez « / » pour choisir un bloc', h1: 'Titre', h2: 'Sous-titre', todo: 'À faire', ul: 'Élément', ol: 'Élément', quote: 'Citation', callout: 'À retenir' };
const MD = [[/^#\s/, 'h1'], [/^##\s/, 'h2'], [/^[-*]\s/, 'ul'], [/^1[.)]\s/, 'ol'], [/^\[ ?\]\s/, 'todo'], [/^>\s/, 'quote'], [/^!\s/, 'callout'], [/^\?\?\s/, 'qa']];

export const pageText = (p) => [p.title, ...p.blocks.map((b) => [b.x, b.a].filter(Boolean).join(' '))].join(' ');
export const isQA = (b) => b?.t === 'qa' || b?.t === 'def';
export const qaCards = (p) => p.blocks.filter((b) => isQA(b) && (b.x || '').trim() && (b.a || '').trim());
const words = (p) => pageText(p).split(/\s+/).filter(Boolean).length - (p.title ? p.title.split(/\s+/).length : 0);
const trail = (p) => { const out = []; let x = p; let g = 0; while (x?.parent && g++ < 6) { x = getPage(x.parent); if (x) out.unshift(x); } return out; };

// ---------- Création ----------
const capFirst = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export function newPage(tplId = 'vierge', { parent = null, prospectId = null, projectId = null } = {}) {
  if (!canAddPage()) { limitSheet(); return null; }
  const t = template(tplId);
  const d = new Date();
  let title = t.title || '';
  if (t.date) {
    const day = new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'long' }).format(d);
    title = tplId === 'journal' ? capFirst(dateLong(d.getTime()).toLowerCase()) : tplId === 'semaine' ? `${title}${new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'long' }).format(d.getTime() - ((d.getDay() + 6) % 7) * 864e5)}` : `${title}${day}`;
  }
  if (t.month) title = `${title}${new Intl.DateTimeFormat('fr-BE', { month: 'long', year: 'numeric' }).format(d)}`;
  if (t.client && prospectId) title = `${title}${getProspect(prospectId)?.entreprise || ''}`;
  if (projectId && t.id === 'projet') title = `Notes — ${getProject(projectId)?.name || ''}`;
  return addPage({ title, icon: t.icon === 'page' ? 'page' : t.icon, cover: t.cover || '', parent, prospectId, projectId, tpl: t.id, blocks: t.blocks.map(mkBlock) });
}
// Un bloc de modèle : [type, texte, réponse] ou { t, x, h (mis en forme), a, ha, st, v, c, rows }
const untag = (h) => String(h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
function mkBlock(e) {
  const o = Array.isArray(e) ? { t: e[0], x: e[1] || '', ...(e[0] === 'qa' || e[0] === 'def' ? { a: e[2] || '' } : {}) } : { ...e };
  if (o.h && !o.x) o.x = untag(o.h);
  if (o.ha && !o.a) o.a = untag(o.ha);
  if (o.st) o.st = { ...o.st };
  if (o.rows) o.rows = o.rows.map((r) => [...r]);
  return { id: bid(), x: '', ...o, ...(o.t === 'todo' ? { c: !!o.c } : {}), ...(isQA(o) ? { a: o.a || '' } : {}) };
}
function limitSheet() {
  sheet(`${sheetHead('Cinq pages dans la version gratuite')}<div class="sheet-body">${paywall('notesUnlimited', { compact: true })}<p class="sheet-note">Vos ${S().pages.length} pages restent modifiables. Vous pouvez aussi supprimer une page pour en créer une autre.</p></div>`, { cls: 'sheet-sm' });
}
export function templatesSheet(opts = {}) {
  sheet(`${sheetHead('Nouvelle page', 'Partez d\'une page vierge ou d\'un modèle')}<div class="sheet-body"><div class="tpl-grid">${tplList().map((t) => `<button class="tpl" data-act="page-new" data-tpl="${t.id}" ${opts.parent ? `data-parent="${opts.parent}"` : ''} ${opts.prospectId ? `data-pid="${opts.prospectId}"` : ''}><span class="tpl-cv cv-${t.cover || 'none'}"></span><span class="tpl-ic">${ic(t.icon)}</span><b>${esc(t.name)}</b><span>${esc(t.desc)}</span></button>`).join('')}</div></div>`, { cls: 'sheet-tall' });
}

// ---------- Accueil des notes ----------
export function notesHome(params, q) {
  const s = S();
  const pages = s.pages;
  const free = !can('notesUnlimited');
  const favs = pages.filter((p) => p.fav);
  const recent = [...pages].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);
  const roots = pages.filter((p) => !p.parent || !getPage(p.parent)).sort((a, b) => b.updatedAt - a.updatedAt);
  const kids = (id) => pages.filter((p) => p.parent === id).sort((a, b) => a.createdAt - b.createdAt);
  const row = (p, depth = 0) => `<li><a class="row page-row" href="#/note/${p.id}" data-name="${esc(pageText(p).toLowerCase())}" style="--d:${depth}">
      <span class="menu-ic">${ic(p.icon || 'page')}</span>
      <span class="row-b"><b>${esc(p.title || 'Sans titre')}${p.demo ? '<span class="tag">Exemple</span>' : ''}</b><span>${ago(p.updatedAt)}${kids(p.id).length ? ` · ${kids(p.id).length} sous-page${kids(p.id).length > 1 ? 's' : ''}` : ''}${qaCards(p).length ? ` · ${qaCards(p).length} carte${qaCards(p).length > 1 ? 's' : ''}` : ''}${p.prospectId && getProspect(p.prospectId) ? ` · ${esc(getProspect(p.prospectId).entreprise)}` : ''}</span></span>
      ${p.fav ? ic('star', 'fav-ic') : ''}${ic('chevR', 'chev')}</a></li>${depth < 2 ? kids(p.id).map((c) => row(c, depth + 1)).join('') : ''}`;
  const html = `
    ${pageHead('Notes', { kicker: pages.length ? `${pages.length} page${pages.length > 1 ? 's' : ''}${free ? ` sur ${LIMITS.freePages} (version gratuite)` : ''}` : 'Vos pages, vos idées, vos comptes rendus', actions: `<button class="icon-btn" data-act="page-templates" aria-label="Modèles" title="Modèles">${ic('layers')}</button><button class="btn btn-primary fab-dup" data-act="page-new" data-tpl="vierge">${ic('plus')}<span>Page</span></button>` })}
    ${!pages.length ? `<section class="card notes-empty rise">
        <span class="empty-ic">${ic('page')}</span>
        <p class="empty-t">Votre première page</p>
        <p class="empty-p">Une page peut contenir du texte, des cases à cocher, des listes, des questions à réviser et d'autres pages.</p>
        <div class="demo-preview dp-page" aria-hidden="true"><span class="tag">Exemple</span>
          <p class="dp-pt"><span class="dp-pic">${ic('users')}</span>Réunion de lancement</p>
          <p class="dp-h2">Décisions</p><p class="dp-li">Site en ligne avant le 15</p><p class="dp-li">Séance photo mardi matin</p>
          <p class="dp-h2">Actions</p><div class="dp-row"><span class="tick is-done"></span><span><b>Envoyer la maquette</b></span></div><div class="dp-row"><span class="tick"></span><span><b>Réserver le photographe</b></span></div>
        </div>
        <button class="btn btn-primary btn-lg" data-act="page-new" data-tpl="reunion">${ic('plus')}<span>Créer ma première page</span></button>
        <p class="oe-foot">Ou partez d'un des modèles ci-dessous.</p>
      </section>` : `
    <div class="search rise"><span class="search-ic">${ic('search')}</span><input class="inp" type="search" placeholder="Chercher dans vos pages" data-filter=".page-row" aria-label="Chercher dans vos pages"></div>
    <p class="muted center filter-empty" hidden>Aucune page ne contient ce mot.</p>
    ${favs.length ? `<h2 class="sec-title">Favoris</h2><div class="hscroll">${favs.map((p) => `<a class="mini-card page-card" href="#/note/${p.id}">${ic(p.icon || 'page')}<b>${esc(p.title || 'Sans titre')}</b><span>${ago(p.updatedAt)}</span></a>`).join('')}</div>` : ''}
    ${pages.length > 6 ? `<h2 class="sec-title">Récentes</h2><div class="hscroll">${recent.map((p) => `<a class="mini-card page-card" href="#/note/${p.id}">${ic(p.icon || 'page')}<b>${esc(p.title || 'Sans titre')}</b><span>${ago(p.updatedAt)}</span></a>`).join('')}</div>` : ''}
    <h2 class="sec-title">Toutes les pages</h2>
    <ul class="rows card pages-tree rise">${roots.map((p) => row(p)).join('')}</ul>`}
    <h2 class="sec-title">Modèles</h2>
    <div class="tpl-grid">${tplList().map((t) => `<button class="tpl" data-act="page-new" data-tpl="${t.id}"><span class="tpl-cv cv-${t.cover || 'none'}"></span><span class="tpl-ic">${ic(t.icon)}</span><b>${esc(t.name)}</b><span>${esc(t.desc)}</span></button>`).join('')}</div>`;
  return { title: 'Notes', tab: 'notes', fab: 'page-templates', html };
}

// ---------- Éditeur ----------
// Chaque bloc est un champ de texte mis en forme (gras, italique, souligné, barré, couleurs,
// surligneur, souligné rouge, police, taille), avec cadre et alignement par bloc. Par-dessus la
// page, un calque de dessin : stylo, surligneur, formes, flèches, bulles, coches, post-it.
const TC = [['#131a2a', 'Encre'], ['#155eef', 'Bleu'], ['#d92d20', 'Rouge'], ['#2f9e44', 'Vert'], ['#616b33', 'Olive'], ['#f08c00', 'Orange'], ['#7048e8', 'Violet'], ['#8f6420', 'Brun'], ['#676d7e', 'Gris']];
const HC = [['#ffe066', 'Jaune'], ['#b2f2bb', 'Vert'], ['#a5d8ff', 'Bleu'], ['#ffc9c9', 'Rose'], ['#d0bfff', 'Violet'], ['transparent', 'Sans surlignage']];
const FRAMES = [['', 'Sans cadre'], ['ink', 'Cadre encre'], ['blue', 'Cadre bleu'], ['olive', 'Cadre olive'], ['red', 'Cadre rouge'], ['sand', 'Cadre sable'], ['fill', 'Fond bleu clair']];
const htmlText = (html) => { const t = document.createElement('template'); t.innerHTML = String(html || '').replace(/<br\s*\/?>/gi, '\n'); return t.content.textContent; };
const blockInner = (b, k) => { const hk = k === 'a' ? 'ha' : 'h'; return b[hk] ? clean(b[hk]) : esc(b[k] || '').replace(/\n/g, '<br>'); };
function tableHtml(b) {
  const rows = b.rows?.length ? b.rows : [['', ''], ['', '']];
  const dc = doneCol(rows);
  const cell = (v, r, c) => (r && c === dc
    ? `<td class="tbl-done"><button class="tick tbl-ck ${v ? 'is-done' : ''}" data-act="tbl-check" data-r="${r}" data-c="${c}" aria-pressed="${!!v}" aria-label="Ligne ${r} terminée"></button></td>`
    : `<${r ? 'td' : 'th'}><div class="blk-in tbl-c" contenteditable="true" data-k="c${r}_${c}" spellcheck="true" role="textbox" aria-label="${r ? `Ligne ${r}, colonne ${c + 1}` : `Titre de la colonne ${c + 1}`}">${esc(v)}</div></${r ? 'td' : 'th'}>`);
  return `<div class="tbl-w"><div class="tbl-s"><table class="tbl"><thead><tr>${rows[0].map((v, c) => cell(v, 0, c)).join('')}</tr></thead>
    <tbody>${rows.slice(1).map((r, i) => `<tr class="${dc >= 0 && r[dc] ? 'is-done' : ''}">${r.map((v, c) => cell(v, i + 1, c)).join('')}</tr>`).join('')}</tbody></table></div>
    <div class="tbl-acts"><button class="tbl-a" data-act="tbl-add" data-w="row">${ic('plus')}Ligne</button><button class="tbl-a" data-act="tbl-add" data-w="col">${ic('plus')}Colonne</button><button class="tbl-a" data-act="tbl-del" data-w="row">${ic('minus')}Ligne</button><button class="tbl-a" data-act="tbl-del" data-w="col">${ic('minus')}Colonne</button><span class="tbl-tip">Une colonne nommée « Fait » devient des cases à cocher.</span></div></div>`;
}
function blockHtml(b, n, p) {
  const ce = (cls, k, ph) => `<div class="blk-in ${cls}" contenteditable="true" data-k="${k}" data-ph="${esc((k === 'a' ? b.pha : b.ph) || ph)}" spellcheck="true" role="textbox" aria-multiline="true" aria-label="${esc(BL[b.t]?.[1] || 'Texte')}">${blockInner(b, k)}</div>`;
  const lead = b.t === 'todo' ? `<button class="tick blk-ck ${b.c ? 'is-done' : ''}" data-act="blk-check" aria-pressed="${!!b.c}" aria-label="Cocher"></button>`
    : b.t === 'ul' ? '<span class="blk-bul" aria-hidden="true"></span>'
      : b.t === 'ol' ? `<span class="blk-num" aria-hidden="true">${n}.</span>`
        : b.t === 'callout' ? `<span class="blk-cic" title="${TONES[b.v || '']?.[0] || ''}">${ic(TONES[b.v || '']?.[1] || 'callout')}</span>` : '';
  const body = b.t === 'divider' ? '<hr class="blk-hr">'
    : b.t === 'qa' ? `<div class="qa-w"><span class="qa-k">Question</span>${ce('qa-q', 'x', 'La question')}<span class="qa-k">Réponse</span>${ce('qa-a', 'a', 'La réponse')}</div>`
      : b.t === 'def' ? `<div class="qa-w def-w">${ce('qa-q def-t', 'x', 'Le terme')}${ce('qa-a def-d', 'a', 'Sa définition')}</div>`
        : b.t === 'table' ? tableHtml(b)
          : b.t === 'prog' ? `<div class="prog-w">${progInner(p)}</div>`
            : ce('', 'x', PH[b.t] || '');
  const st = b.st || {};
  return `<div class="blk blk-${b.t} ${b.ph || b.pha ? 'has-ph' : ''} ${b.c ? 'is-done' : ''} ${b.v ? `tone-${b.v}` : ''} ${st.fr ? `fr fr-${st.fr}` : ''} ${st.al ? `al-${st.al}` : ''}" data-bid="${b.id}"><button class="blk-h" data-act="blk-menu" aria-label="Options du bloc" tabindex="-1">${ic('drag')}</button>${lead}${body}</div>`;
}
function blocksHtml(p) {
  let n = 0;
  return p.blocks.map((b) => { n = b.t === 'ol' ? n + 1 : 0; return blockHtml(b, n, p); }).join('');
}
const swatchPop = (cmd, list) => `<div class="nt-pop" data-pop="${cmd}" hidden>${list.map(([c, l]) => `<button type="button" class="nt-sw ${c === 'transparent' ? 'is-none' : ''}" data-fmt="${cmd}" data-v="${c}" title="${l}" aria-label="${l}" style="--c:${c}"></button>`).join('')}</div>`;
const lockIc = () => (can('notesDraw') ? '' : `<i class="nt-lock">${ic('lock')}</i>`);
function formatBar() {
  return `<div class="nt-bar" role="toolbar" aria-label="Mise en forme">
    <div class="nt-fmt">
      <label class="nt-s"><select data-fmt="block" aria-label="Type de bloc"><option value="">Bloc</option>${BLOCKS.filter(([t]) => t !== 'divider').map(([t, l]) => `<option value="${t}">${l}</option>`).join('')}</select></label>
      <label class="nt-s">${lockIc()}<select data-fmt="font" aria-label="Police"><option value="">Police</option>${FONT_GROUPS.map((g) => `<optgroup label="${g}">${Object.values(FONTS).filter((v) => v[3] === g).map(([l, f]) => `<option value="${esc(f)}">${l}</option>`).join('')}</optgroup>`).join('')}</select></label>
      <label class="nt-s">${lockIc()}<select data-fmt="size" aria-label="Taille"><option value="">Taille</option>${[['2', 'Petit'], ['3', 'Normal'], ['5', 'Grand'], ['6', 'Très grand']].map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
      <i class="nt-sep"></i>
      <button type="button" class="nt-b" data-fmt="b" title="Gras (Ctrl B)" aria-label="Gras">${ic('bold')}</button>
      <button type="button" class="nt-b" data-fmt="i" title="Italique (Ctrl I)" aria-label="Italique">${ic('italic')}</button>
      <button type="button" class="nt-b" data-fmt="u" title="Souligné (Ctrl U)" aria-label="Souligné">${ic('underline')}</button>
      <button type="button" class="nt-b" data-fmt="s" title="Barré" aria-label="Barré">${ic('strike')}</button>
      <i class="nt-sep"></i>
      <span class="nt-pw"><button type="button" class="nt-b" data-fmt="pop" data-v="color" title="Couleur du texte" aria-label="Couleur du texte"><span class="nt-a">A</span>${lockIc()}</button>${swatchPop('color', TC)}</span>
      <span class="nt-pw"><button type="button" class="nt-b" data-fmt="pop" data-v="hl" title="Surligner" aria-label="Surligner">${ic('highlighter')}${lockIc()}</button>${swatchPop('hl', HC)}</span>
      <button type="button" class="nt-b nt-red" data-fmt="red" title="Souligner en rouge" aria-label="Souligner en rouge">${ic('underline')}${lockIc()}</button>
      <span class="nt-pw"><button type="button" class="nt-b" data-fmt="pop" data-v="frame" title="Encadrer le bloc" aria-label="Encadrer le bloc">${ic('frame')}${lockIc()}</button><div class="nt-pop nt-frames" data-pop="frame" hidden>${FRAMES.map(([v, l]) => `<button type="button" class="nt-fr fr-${v || 'none'}" data-fmt="frame" data-v="${v}">${l}</button>`).join('')}</div></span>
      <button type="button" class="nt-b" data-fmt="align" title="Alignement du bloc" aria-label="Alignement">${ic('align')}</button>
      <button type="button" class="nt-b" data-fmt="clear" title="Effacer la mise en forme" aria-label="Effacer la mise en forme">${ic('x')}</button>
    </div>
    <button type="button" class="btn btn-sm nt-drawbtn" data-fmt="draw" aria-pressed="false">${ic('pen')}<span>Dessiner sur la page</span>${lockIc()}</button>
  </div>
  <div class="nt-draw" hidden><div class="dw-tools nt-dtools" role="toolbar" aria-label="Outils de dessin"></div><div class="dw-props nt-dprops" role="toolbar" aria-label="Réglages du dessin"></div><button type="button" class="btn btn-primary btn-sm nt-done" data-fmt="draw">${ic('check')}<span>Terminé</span></button></div>`;
}

export function noteView([id]) {
  const p = getPage(id);
  if (!p) return { title: 'Page', tab: 'notes', html: `${pageHead('Page introuvable', { back: '#/notes' })}<div class="empty"><span class="empty-ic">${ic('page')}</span><p class="empty-t">Cette page n'existe plus</p><p class="empty-p">Elle a peut-être été supprimée.</p><a class="btn btn-ghost" href="#/notes">Toutes les pages</a></div>` };
  const crumbs = trail(p);
  const kids = S().pages.filter((x) => x.parent === id);
  const pr = p.prospectId && getProspect(p.prospectId);
  const cards = qaCards(p).length;
  const html = `
    <div class="note-bar">
      <a class="ph-back" href="${crumbs.length ? `#/note/${crumbs[crumbs.length - 1].id}` : '#/notes'}">${ic('chevL')}<span>${crumbs.length ? esc(crumbs[crumbs.length - 1].title || 'Sans titre') : 'Notes'}</span></a>
      <div class="note-acts">
        ${cards ? `<a class="btn btn-soft btn-sm" href="#/quiz/note/${p.id}?restart=1">${ic('cards')}<span>Réviser · ${cards}</span></a>` : ''}
        <button class="icon-btn ${p.fav ? 'is-on' : ''}" data-act="page-fav" data-id="${p.id}" aria-pressed="${!!p.fav}" aria-label="${p.fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${ic('star')}</button>
        <button class="icon-btn" data-act="page-menu" data-id="${p.id}" aria-label="Options de la page">${ic('more')}</button>
      </div>
    </div>
    ${formatBar()}
    <article class="note ${p.cover ? 'has-cover' : ''}" data-pid="${p.id}">
      <div class="nt-ink" aria-hidden="${(p.ink || []).length ? 'false' : 'true'}"></div>
      ${crumbs.length ? `<p class="note-crumbs">${crumbs.map((c) => `<a href="#/note/${c.id}">${esc(c.title || 'Sans titre')}</a>`).join('<span>/</span>')}</p>` : ''}
      ${p.cover ? `<button class="note-cover cv-${esc(p.cover)}" data-act="page-cover" data-id="${p.id}" aria-label="Changer la couverture"></button>` : ''}
      <button class="note-icon" data-act="page-icon" data-id="${p.id}" aria-label="Changer l'icône">${ic(p.icon || 'page')}</button>
      <textarea class="note-title" rows="1" placeholder="Sans titre" aria-label="Titre de la page" maxlength="140">${esc(p.title)}</textarea>
      <p class="note-meta"><span class="note-saved">Enregistrée</span> · modifiée ${ago(p.updatedAt)} · <span class="note-words">${words(p)} mot${words(p) > 1 ? 's' : ''}</span>${pr ? ` · <a href="#/fiche/${pr.id}">${ic('user')}${esc(pr.entreprise)}</a>` : ''}${(p.ink || []).length ? ` · ${ic('pen')} ${(p.ink || []).length} annotation${(p.ink || []).length > 1 ? 's' : ''}` : ''}</p>
      <div class="blocks" role="list">${blocksHtml(p)}</div>
      <button class="add-blk" data-act="blk-add-end">${ic('plus')}<span>Ajouter un bloc</span></button>
      <section class="subpages">
        <header><h2>Sous-pages</h2><button class="link" data-act="page-sub" data-id="${p.id}">${ic('plus')}Sous-page</button></header>
        ${kids.length ? `<ul class="rows">${kids.map((k) => `<li><a class="row" href="#/note/${k.id}"><span class="menu-ic">${ic(k.icon || 'page')}</span><span class="row-b"><b>${esc(k.title || 'Sans titre')}</b><span>${ago(k.updatedAt)}</span></span>${ic('chevR', 'chev')}</a></li>`).join('')}</ul>` : '<p class="muted-s">Rangez ici les pages qui dépendent de celle-ci : un projet et ses comptes rendus, un cours et ses chapitres.</p>'}
      </section>
      <div class="slash" role="listbox" aria-label="Choisir un bloc" hidden></div>
    </article>`;
  return { title: p.title || 'Sans titre', tab: 'notes', html, after: (root) => editor(root, p.id) };
}

// ---------- Comportement de l'éditeur ----------
let saveT = null;
const autosize = (el) => { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; };
function mutate(pid, fn, { soft = true } = {}) {
  update((s) => { const p = s.pages.find((x) => x.id === pid); if (!p) return; fn(p); p.updatedAt = Date.now(); }, { silent: soft });
}
function editor(root, pid) {
  const art = root.querySelector('.note');
  const wrap = root.querySelector('.blocks');
  const slash = root.querySelector('.slash');
  const saved = root.querySelector('.note-saved');
  const bar = root.querySelector('.nt-bar');
  const drawPanel = root.querySelector('.nt-draw');
  const page = () => getPage(pid);
  const title = root.querySelector('.note-title');
  let slashFor = null, slashIdx = 0, lastEl = null, savedRange = null;

  requestAnimationFrame(() => autosize(title));
  const flash = () => { saved.textContent = 'Enregistrement…'; clearTimeout(saveT); saveT = setTimeout(() => { saved.textContent = 'Enregistrée'; const nw = root.querySelector('.note-words'); if (nw && page()) { const w = words(page()); nw.textContent = `${w} mot${w > 1 ? 's' : ''}`; } }, 500); };
  const elOf = (id, k = 'x') => wrap.querySelector(`.blk[data-bid="${id}"] [data-k="${k}"]`) || wrap.querySelector(`.blk[data-bid="${id}"] [contenteditable]`);
  const focusBlock = (id, pos = 'end', k = 'x') => { const el = elOf(id, k); if (el) setCaret(el, pos); };
  const paint = (focusId, pos = 'end', k = 'x') => { wrap.innerHTML = blocksHtml(page()); if (focusId) focusBlock(focusId, pos, k); };
  // Enregistre le contenu d'un champ : texte brut (recherche, export, révision) + mise en forme
  const save = (el) => {
    const id = el.closest('.blk')?.dataset.bid; if (!id) return;
    const k = el.dataset.k, hk = k === 'a' ? 'ha' : 'h';
    const text = plain(el);
    // Cellule de tableau : texte brut, et le texte de tout le tableau pour la recherche
    const cm = /^c(\d+)_(\d+)$/.exec(k);
    if (cm) { mutate(pid, (p) => { const b = p.blocks.find((x) => x.id === id); if (!b?.rows?.[cm[1]]) return; b.rows[cm[1]][cm[2]] = text; b.x = b.rows.flat().filter(Boolean).join(' · '); }); flash(); return; }
    const html = clean(el.innerHTML);
    mutate(pid, (p) => { const b = p.blocks.find((x) => x.id === id); if (!b) return; b[k] = text; if (hasFormat(html)) b[hk] = html; else delete b[hk]; });
    flash();
  };
  root._paint = paint;
  if (!page().title) setTimeout(() => title.focus(), 60);
  else if (page().tpl && page().blocks.every((b) => !b.x)) setTimeout(() => focusBlock(page().blocks.find((b) => b.t !== 'divider' && b.t !== 'h2' && b.t !== 'callout')?.id || page().blocks[0]?.id), 60);

  title.addEventListener('input', () => { autosize(title); mutate(pid, (p) => { p.title = title.value.replace(/\n/g, ' '); }); document.title = `${title.value || 'Sans titre'} · MindView`; flash(); });
  title.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const b = page().blocks[0]; if (b) focusBlock(b.id, 'start'); } });

  // Menu « / »
  const openSlash = (bidv, q) => {
    const list = BLOCKS.filter(([, l, , h]) => !q || (l + ' ' + h).toLowerCase().includes(q.toLowerCase()));
    if (!list.length) return closeSlash();
    slashFor = bidv; slashIdx = Math.min(slashIdx, list.length - 1);
    slash.innerHTML = list.map(([t, l, i, h], k) => `<button class="slash-i ${k === slashIdx ? 'is-on' : ''}" role="option" aria-selected="${k === slashIdx}" data-t="${t}"><span class="slash-ic">${ic(i)}</span><span><b>${l}</b><em>${esc(h)}</em></span></button>`).join('');
    const blk = wrap.querySelector(`.blk[data-bid="${bidv}"]`).getBoundingClientRect();
    const ar = art.getBoundingClientRect();
    slash.style.left = `${Math.max(0, Math.min(blk.left - ar.left + 24, ar.width - 280))}px`;
    slash.style.top = `${blk.bottom - ar.top + 4}px`;
    slash.hidden = false;
  };
  const closeSlash = () => { slash.hidden = true; slashFor = null; slashIdx = 0; };
  const applyType = (bidv, t) => {
    let focusId = bidv;
    mutate(pid, (p) => {
      const i = p.blocks.findIndex((b) => b.id === bidv);
      const b = p.blocks[i]; if (!b) return;
      if (/^\/\S*/.test(b.x || '')) { b.x = (b.x || '').replace(/^\/\S*\s?/, ''); delete b.h; }
      setType(b, t);
      if (t === 'divider' || t === 'prog') { const nb = { id: bid(), t: 'p', x: '' }; p.blocks.splice(i + 1, 0, nb); focusId = nb.id; }
    });
    closeSlash(); paint(focusId);
    flash();
  };
  slash.addEventListener('pointerdown', (e) => e.preventDefault());
  slash.addEventListener('click', (e) => { const b = e.target.closest('.slash-i'); if (b && slashFor) applyType(slashFor, b.dataset.t); });

  wrap.addEventListener('input', (e) => {
    const el = e.target.closest('[contenteditable]'); if (!el) return;
    const id = el.closest('.blk').dataset.bid, k = el.dataset.k;
    if (k === 'x') {
      const b = page().blocks.find((x) => x.id === id);
      const v = plain(el);
      if (v === '---' || v === '—-') { mutate(pid, (p) => { const x = p.blocks.find((y) => y.id === id); x.x = ''; delete x.h; }); applyType(id, 'divider'); return; }
      for (const [re, t] of MD) {
        if (re.test(v) && b.t === 'p') { const rest = v.replace(re, ''); const caret = Math.max(0, caretOffset(el) - (v.length - rest.length)); mutate(pid, (p) => { const x = p.blocks.find((y) => y.id === id); x.x = rest; delete x.h; }); applyType(id, t); focusBlock(id, caret); return; }
      }
      if (v.startsWith('/') && !/\s/.test(v.slice(1, 12)) && !isQA(b)) openSlash(id, v.slice(1)); else if (slashFor) closeSlash();
    }
    save(el);
  });
  wrap.addEventListener('paste', (e) => {
    const el = e.target.closest('[contenteditable]'); if (!el) return;
    e.preventDefault();
    const t = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, t);
  });
  wrap.addEventListener('keydown', (e) => {
    const el = e.target.closest('[contenteditable]'); if (!el) return;
    const id = el.closest('.blk').dataset.bid, k = el.dataset.k;
    const p = page(); const i = p.blocks.findIndex((b) => b.id === id); const b = p.blocks[i];
    // Tableau : Entrée descend d'une ligne (et en ajoute une en bas), le reste reste natif
    if (b.t === 'table') {
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
      e.preventDefault();
      const [r, c] = k.slice(1).split('_').map(Number);
      const go = () => wrap.querySelector(`.blk[data-bid="${id}"] [data-k="c${r + 1}_${c}"]`)?.focus();
      if (r + 1 < b.rows.length) { go(); return; }
      mutate(pid, (pp) => { const x = pp.blocks[i]; x.rows.push(x.rows[0].map(() => '')); });
      paint(); go(); flash();
      return;
    }
    if (slashFor && !slash.hidden) {
      const items = [...slash.querySelectorAll('.slash-i')];
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); slashIdx = (slashIdx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; openSlash(slashFor, plain(el).slice(1)); return; }
      if (e.key === 'Enter') { e.preventDefault(); applyType(slashFor, items[slashIdx]?.dataset.t || 'p'); return; }
      if (e.key === 'Escape') { e.preventDefault(); closeSlash(); return; }
    }
    const mod = e.ctrlKey || e.metaKey;
    if (mod && ['b', 'i', 'u'].includes(e.key.toLowerCase())) { e.preventDefault(); fmt(e.key.toLowerCase()); return; }
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      if (isQA(b) && k === 'x') { focusBlock(id, 'end', 'a'); return; }
      const listy = ['ul', 'ol', 'todo', 'qa', 'def'].includes(b.t);
      if (listy && !plain(el).trim() && (!isQA(b) || !(b.x || '').trim())) { mutate(pid, (pp) => { const x = pp.blocks[i]; x.t = 'p'; x.x = ''; delete x.h; delete x.a; delete x.ha; }); paint(id, 'start'); return; }
      const afterHtml = isQA(b) ? '' : splitAtCaret(el);
      if (!isQA(b)) save(el);
      const nb = { id: bid(), t: listy ? b.t : 'p', x: htmlText(afterHtml), ...(hasFormat(afterHtml) ? { h: afterHtml } : {}), ...(b.t === 'todo' ? { c: false } : {}), ...(isQA(b) ? { a: '' } : {}) };
      mutate(pid, (pp) => { pp.blocks.splice(i + 1, 0, nb); });
      paint(nb.id, 'start'); flash();
      return;
    }
    const sel = getSelection();
    if (e.key === 'Backspace' && sel.isCollapsed && caretOffset(el) === 0) {
      if (k === 'a') { e.preventDefault(); focusBlock(id, 'end', 'x'); return; }
      if (b.t !== 'p') { e.preventDefault(); mutate(pid, (pp) => { const x = pp.blocks[i]; if (isQA(x)) { x.x = [x.x, x.a].filter(Boolean).join(' '); delete x.ha; } x.t = 'p'; delete x.a; }); paint(id, 'start'); flash(); return; }
      const prev = p.blocks[i - 1];
      if (!prev || prev.t === 'table' || prev.t === 'prog') return;
      e.preventDefault();
      if (prev.t === 'divider') { mutate(pid, (pp) => { pp.blocks.splice(i - 1, 1); }); paint(id, 'start'); flash(); return; }
      const pk = isQA(prev) ? 'a' : 'x';
      const join = (prev[pk] || '').length;
      const merged = blockInner(prev, pk) + clean(el.innerHTML);
      mutate(pid, (pp) => { const pv = pp.blocks[i - 1]; const hk = pk === 'a' ? 'ha' : 'h'; pv[pk] = htmlText(merged); if (hasFormat(merged)) pv[hk] = merged; else delete pv[hk]; pp.blocks.splice(i, 1); });
      paint(prev.id, join, pk); flash();
      return;
    }
    if (e.key === 'ArrowUp' && sel.isCollapsed && caretOffset(el) === 0 && i > 0) {
      const prev = [...p.blocks.slice(0, i)].reverse().find((x) => x.t !== 'divider');
      if (prev) { e.preventDefault(); focusBlock(prev.id, 'end', isQA(prev) ? 'a' : 'x'); }
    }
    if (e.key === 'ArrowDown' && caretAtEnd(el)) {
      const next = p.blocks.slice(i + 1).find((x) => x.t !== 'divider');
      if (next) { e.preventDefault(); focusBlock(next.id, 'start'); }
    }
  });
  wrap.addEventListener('focusin', (e) => { const el = e.target.closest('[contenteditable]'); if (el) lastEl = el; });
  wrap.addEventListener('focusout', () => setTimeout(() => { if (!wrap.contains(document.activeElement)) closeSlash(); }, 120));
  const onSel = () => { const s = getSelection(); if (s.rangeCount && lastEl && lastEl.contains(s.anchorNode)) savedRange = s.getRangeAt(0).cloneRange(); };
  document.addEventListener('selectionchange', onSel);

  // Barre de mise en forme
  const popClose = () => bar.querySelectorAll('.nt-pop').forEach((x) => { x.hidden = true; });
  const restore = () => {
    if (!lastEl || !document.contains(lastEl)) return false;
    const s = getSelection();
    if (s.rangeCount && lastEl.contains(s.anchorNode)) return true;
    lastEl.focus({ preventScroll: true });
    if (savedRange && document.contains(savedRange.startContainer)) { s.removeAllRanges(); s.addRange(savedRange); }
    return true;
  };
  const curBlock = () => lastEl?.closest('.blk')?.dataset.bid;
  function fmt(cmd, v) {
    if (['font', 'size', 'color', 'hl', 'red', 'frame', 'draw', 'pop'].includes(cmd) && !can('notesDraw')) { popClose(); sheet(`${sheetHead('Éditeur complet')}<div class="sheet-body">${paywall('notesDraw', { compact: true })}</div>`, { cls: 'sheet-sm' }); return; }
    if (cmd === 'pop') {
      const pop = bar.querySelector(`[data-pop="${v}"]`); const was = pop.hidden; popClose(); pop.hidden = !was;
      // La barre (flou d'arrière-plan) sert de repère aux menus : on les place sous leur bouton
      const br = bar.getBoundingClientRect(), bt = bar.querySelector(`[data-fmt="pop"][data-v="${v}"]`).getBoundingClientRect();
      pop.style.left = `${Math.max(4, Math.min(bt.left - br.left, br.width - pop.offsetWidth - 4))}px`; pop.style.top = `${bt.bottom - br.top}px`;
      return;
    }
    popClose();
    if (cmd === 'draw') { toggleDraw(); return; }
    const id = curBlock();
    if (cmd === 'block') { if (id) applyType(id, v); return; }
    if (cmd === 'frame' || cmd === 'align') {
      if (!id) { toast('Placez le curseur dans un bloc.'); return; }
      mutate(pid, (p) => { const x = p.blocks.find((y) => y.id === id); x.st = { ...(x.st || {}) }; if (cmd === 'frame') x.st.fr = v; else x.st.al = x.st.al === 'center' ? 'right' : x.st.al === 'right' ? '' : 'center'; if (!x.st.fr) delete x.st.fr; if (!x.st.al) delete x.st.al; });
      const off = lastEl ? caretOffset(lastEl) : 0; const k = lastEl?.dataset.k || 'x';
      paint(id, off, k); flash();
      return;
    }
    if (!restore()) { toast('Sélectionnez d\'abord du texte dans la page.'); return; }
    const exec = (c, val = null, css = false) => { document.execCommand('styleWithCSS', false, css); document.execCommand(c, false, val); };
    if (cmd === 'b') exec('bold');
    else if (cmd === 'i') exec('italic');
    else if (cmd === 'u') exec('underline');
    else if (cmd === 's') exec('strikeThrough');
    else if (cmd === 'clear') exec('removeFormat');
    else if (cmd === 'color') exec('foreColor', v, true);
    else if (cmd === 'hl') exec('hiliteColor', v, true);
    else if (cmd === 'font') exec('fontName', v, true);
    else if (cmd === 'size') exec('fontSize', v, true);
    else if (cmd === 'red') { if (!wrapSelection({ 'text-decoration-line': 'underline', 'text-decoration-color': '#d92d20', 'text-decoration-thickness': '2px' })) toast('Sélectionnez les mots à souligner.'); }
    if (lastEl) save(lastEl);
  }
  bar.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
  bar.addEventListener('click', (e) => { const b = e.target.closest('[data-fmt]'); if (b && b.tagName === 'BUTTON') fmt(b.dataset.fmt, b.dataset.v); });
  bar.addEventListener('change', (e) => { const s2 = e.target.closest('select[data-fmt]'); if (s2 && s2.value) { const v = s2.value; s2.value = ''; fmt(s2.dataset.fmt, v); } });
  const outside = (e) => { if (!e.target.closest('.nt-pw')) popClose(); };
  document.addEventListener('pointerdown', outside);

  // Calque de dessin sur la page
  const ink = mountCanvas({
    stage: root.querySelector('.nt-ink'), tools: root.querySelector('.nt-dtools'), props: root.querySelector('.nt-dprops'),
    mode: 'overlay', items: page().ink || [], bg: 'blank',
    onChange: (items) => { mutate(pid, (p) => { p.ink = items; }); flash(); },
    onEditData: (it, done) => dataSheet(it, done),
  });
  function toggleDraw(force) {
    const on2 = force ?? drawPanel.hidden;
    drawPanel.hidden = !on2; bar.hidden = on2;
    art.classList.toggle('is-drawing', on2);
    ink.setActive(on2);
    if (on2) { ink.setTool('pen'); toast('Dessinez, surlignez, encadrez directement sur la page. « Terminé » pour revenir au texte.', { title: 'Mode dessin', ms: 2600 }); }
  }
  drawPanel.addEventListener('click', (e) => { const b = e.target.closest('.nt-done'); if (b) toggleDraw(false); });
  ink.setActive(false);

  return () => { ink.destroy(); document.removeEventListener('selectionchange', onSel); document.removeEventListener('pointerdown', outside); delete root._paint; };
}

// ---------- Menus ----------
function blockMenu(pid, id) {
  const p = getPage(pid); const b = p.blocks.find((x) => x.id === id);
  sheet(`${sheetHead('Bloc', esc(BL[b.t]?.[1] || ''))}<div class="sheet-body">
    ${b.t === 'callout' ? `<p class="field-l">Ton de l'encadré</p><div class="blk-types">${Object.entries(TONES).map(([v, [l, i]]) => `<button class="chip-btn tone-chip tone-${v || 'info'} ${(b.v || '') === v ? 'is-on' : ''}" data-act="blk-tone" data-pid="${pid}" data-bid="${id}" data-v="${v}">${ic(i)}${l}</button>`).join('')}</div>` : ''}
    <p class="field-l">Transformer en</p>
    <div class="blk-types">${BLOCKS.map(([t, l, i]) => `<button class="chip-btn ${t === b.t ? 'is-on' : ''}" data-act="blk-type" data-pid="${pid}" data-bid="${id}" data-t="${t}">${ic(i)}${l}</button>`).join('')}</div>
    <div class="btn-list">
      ${(b.x || '').trim() && on('organiser') ? `<button class="btn btn-ghost" data-act="blk-task" data-pid="${pid}" data-bid="${id}">${ic('checkSquare')}<span>Créer une tâche avec ce texte</span></button>` : ''}
      <button class="btn btn-ghost" data-act="blk-move" data-pid="${pid}" data-bid="${id}" data-d="-1">${ic('arrowL', 'rot90')}<span>Monter</span></button>
      <button class="btn btn-ghost" data-act="blk-move" data-pid="${pid}" data-bid="${id}" data-d="1">${ic('arrowR', 'rot90')}<span>Descendre</span></button>
      <button class="btn btn-ghost" data-act="blk-dup" data-pid="${pid}" data-bid="${id}">${ic('copy')}<span>Dupliquer</span></button>
      <button class="btn btn-danger-ghost" data-act="blk-del" data-pid="${pid}" data-bid="${id}">${ic('trash')}<span>Supprimer le bloc</span></button>
    </div></div>`, { cls: 'sheet-sm' });
}
const mdTable = (rows = []) => (rows.length ? [rows[0], rows[0].map(() => '---'), ...rows.slice(1)].map((r) => `| ${r.map((v) => String(v).replace(/\|/g, '/')).join(' | ')} |`).join('\n') : '');
const toMarkdown = (p) => [`# ${p.title || 'Sans titre'}`, '', ...(() => { let n = 0; return p.blocks.map((b) => { n = b.t === 'ol' ? n + 1 : 0; return { p: b.x, h1: `## ${b.x}`, h2: `### ${b.x}`, todo: `- [${b.c ? 'x' : ' '}] ${b.x}`, ul: `- ${b.x}`, ol: `${n}. ${b.x}`, quote: `> ${b.x}`, callout: `> **${b.x}**`, divider: '---', qa: `**Q :** ${b.x}\n**R :** ${b.a || ''}`, def: `**${b.x}** : ${b.a || ''}`, table: mdTable(b.rows), prog: `Avancement : ${progress(p).pct} %` }[b.t] ?? b.x; }); })()].join('\n');
function pageMenu(id) {
  const p = getPage(id);
  const fam = pageFamily(id);
  const parents = S().pages.filter((x) => !fam.includes(x.id));
  sheet(`${sheetHead('Page', esc(p.title || 'Sans titre'))}<div class="sheet-body">
    <p class="field-l">Couverture</p><div class="cv-pick">${COVERS.map(([v, l]) => `<button class="cv-sw cv-${v || 'none'} ${(p.cover || '') === v ? 'is-on' : ''}" data-act="page-cover-set" data-id="${id}" data-v="${v}" aria-label="${l}" title="${l}"></button>`).join('')}</div>
    <label class="field"><span class="field-l">Ranger dans</span>${select('parent', [['', 'Aucune page (à la racine)'], ...parents.map((x) => [x.id, x.title || 'Sans titre'])], p.parent || '', `data-act-change="page-parent" data-id="${id}"`)}</label>
    ${on('clients') && can('crm') ? `<label class="field"><span class="field-l">Liée à la fiche</span>${select('pid', [['', 'Aucune'], ...S().prospects.map((x) => [x.id, x.entreprise])], p.prospectId || '', `data-act-change="page-link" data-id="${id}"`)}</label>` : ''}
    ${S().projects.length ? `<label class="field"><span class="field-l">Projet</span>${select('project', [['', 'Aucun projet'], ...S().projects.map((x) => [x.id, x.name])], p.projectId || '', `data-act-change="page-project" data-id="${id}"`)}</label>` : ''}
    <div class="btn-list">
      <button class="btn btn-ghost" data-act="page-dup" data-id="${id}">${ic('copy')}<span>Dupliquer</span></button>
      <button class="btn btn-ghost" data-act="page-copy" data-id="${id}">${ic('note')}<span>Copier le texte (Markdown)</span></button>
      <button class="btn btn-ghost" data-act="page-export" data-id="${id}">${ic('download')}<span>Télécharger (.md)</span></button>
      <button class="btn btn-danger-ghost" data-act="page-del" data-id="${id}">${ic('trash')}<span>Supprimer${fam.length > 1 ? ` (et ${fam.length - 1} sous-page${fam.length > 2 ? 's' : ''})` : ''}</span></button>
    </div></div>`, { cls: 'sheet-sm' });
}

const repaint = (focusId) => { const v = document.querySelector('#view'); if (v?._paint) v._paint(focusId); else window.dispatchEvent(new Event('ms:rerender')); };
const curPid = () => document.querySelector('.note')?.dataset.pid;
register({
  'page-new': (b) => {
    closeSheet(null, true);
    const p = newPage(b.dataset.tpl || 'vierge', { parent: b.dataset.parent || null, prospectId: b.dataset.pid || null, projectId: b.dataset.project || null });
    if (p) location.hash = `#/note/${p.id}`;
  },
  'page-templates': () => templatesSheet(),
  'page-sub': (b) => templatesSheet({ parent: b.dataset.id }),
  'page-fav': (b) => { const on2 = !getPage(b.dataset.id).fav; mutate(b.dataset.id, (p) => { p.fav = on2; }, { soft: false }); toast(on2 ? 'Ajoutée aux favoris' : 'Retirée des favoris', { ms: 1300 }); },
  'page-menu': (b) => pageMenu(b.dataset.id),
  'page-icon': (b) => sheet(`${sheetHead('Icône de la page')}<div class="sheet-body"><div class="icon-grid">${PAGE_ICONS.map((i) => `<button class="icon-btn" data-act="page-icon-set" data-id="${b.dataset.id}" data-i="${i}" aria-label="${i}">${ic(i)}</button>`).join('')}</div></div>`, { cls: 'sheet-sm' }),
  'page-icon-set': (b) => { mutate(b.dataset.id, (p) => { p.icon = b.dataset.i; }, { soft: false }); closeSheet(); },
  'page-parent': (el) => { mutate(el.dataset.id, (p) => { p.parent = el.value || null; }, { soft: false }); closeSheet(); toast(el.value ? 'Page rangée' : 'Page remise à la racine', { ms: 1400 }); },
  'page-project': (el) => { mutate(el.dataset.id, (p) => { p.projectId = el.value || null; }, { soft: false }); toast(el.value ? 'Page rangée dans le projet' : 'Page retirée du projet', { ms: 1400 }); },
  'page-link': (el) => { mutate(el.dataset.id, (p) => { p.prospectId = el.value || null; }, { soft: false }); toast(el.value ? 'Page liée à la fiche' : 'Lien retiré', { ms: 1400 }); },
  'page-dup': (b) => {
    if (!canAddPage()) { closeSheet(null, true); limitSheet(); return; }
    const p = getPage(b.dataset.id);
    const { id: _old, ...copy } = JSON.parse(JSON.stringify(p));
    const c = addPage({ ...copy, title: `${p.title || 'Sans titre'} (copie)`, fav: false, createdAt: Date.now(), updatedAt: Date.now(), blocks: copy.blocks.map((x) => ({ ...x, id: bid() })) });
    closeSheet(); location.hash = `#/note/${c.id}`; toast('Page dupliquée');
  },
  'page-copy': (b) => { copyText(toMarkdown(getPage(b.dataset.id)), 'Texte copié, prêt à coller'); closeSheet(); },
  'page-export': (b) => { const p = getPage(b.dataset.id); download(`${(p.title || 'page').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 60)}.md`, toMarkdown(p), 'text/markdown;charset=utf-8'); closeSheet(); toast('Le fichier est dans vos téléchargements.', { title: 'Page téléchargée' }); },
  'page-del': async (b) => {
    const p = getPage(b.dataset.id);
    const fam = pageFamily(p.id);
    closeSheet(null, true);
    if (!await confirmSheet({ title: `Supprimer « ${esc(p.title || 'Sans titre')} » ?`, text: fam.length > 1 ? `Ses ${fam.length - 1} sous-page${fam.length > 2 ? 's' : ''} seront supprimées aussi.` : 'Vous pourrez annuler juste après.', ok: 'Supprimer', danger: true })) return;
    const removed = S().pages.filter((x) => fam.includes(x.id));
    update((s) => { s.pages = s.pages.filter((x) => !fam.includes(x.id)); });
    location.hash = p.parent && getPage(p.parent) ? `#/note/${p.parent}` : '#/notes';
    toast(`« ${esc(p.title || 'Sans titre')} »`, { title: 'Page supprimée', action: 'Annuler', onAction: () => update((s) => { s.pages.push(...removed); }), ms: 5000 });
  },
  'blk-menu': (b) => blockMenu(curPid(), b.closest('.blk').dataset.bid),
  'blk-check': (b) => {
    const id = b.closest('.blk').dataset.bid;
    let val = false;
    mutate(curPid(), (p) => { const x = p.blocks.find((y) => y.id === id); x.c = !x.c; val = x.c; });
    b.classList.toggle('is-done', val); b.setAttribute('aria-pressed', val); b.closest('.blk').classList.toggle('is-done', val);
    refreshProgress(getPage(curPid()));
  },
  'blk-tone': (b) => { const { pid, bid: id, v } = b.dataset; mutate(pid, (p) => { const x = p.blocks.find((y) => y.id === id); if (v) x.v = v; else delete x.v; }); closeSheet(); setTimeout(() => repaint(id), 230); },
  'page-cover': (b) => pageMenu(b.dataset.id),
  'page-cover-set': (b) => { mutate(b.dataset.id, (p) => { p.cover = b.dataset.v; }, { soft: false }); closeSheet(); },
  // Tableau : cocher une ligne, ajouter ou retirer une ligne ou une colonne
  'tbl-check': (b) => {
    const id = b.closest('.blk').dataset.bid, r = +b.dataset.r, c = +b.dataset.c;
    let val = '';
    mutate(curPid(), (p) => { const x = p.blocks.find((y) => y.id === id); val = x.rows[r][c] ? '' : '✓'; x.rows[r][c] = val; });
    b.classList.toggle('is-done', !!val); b.setAttribute('aria-pressed', !!val); b.closest('tr').classList.toggle('is-done', !!val);
    refreshProgress(getPage(curPid()));
  },
  'tbl-add': (b) => {
    const pid = curPid(), id = b.closest('.blk').dataset.bid, w = b.dataset.w;
    let focus = '';
    mutate(pid, (p) => { const x = p.blocks.find((y) => y.id === id); if (w === 'row') { x.rows.push(x.rows[0].map(() => '')); focus = `c${x.rows.length - 1}_0`; } else if (x.rows[0].length < 8) { x.rows.forEach((r, k) => r.push(k ? '' : `Colonne ${r.length + 1}`)); focus = `c0_${x.rows[0].length - 1}`; } });
    repaint(); document.querySelector(`.blk[data-bid="${id}"] [data-k="${focus}"]`)?.focus();
  },
  'tbl-del': (b) => {
    const pid = curPid(), id = b.closest('.blk').dataset.bid, w = b.dataset.w;
    mutate(pid, (p) => { const x = p.blocks.find((y) => y.id === id); if (w === 'row' && x.rows.length > 2) x.rows.pop(); if (w === 'col' && x.rows[0].length > 1) x.rows.forEach((r) => r.pop()); x.x = x.rows.flat().filter(Boolean).join(' · '); });
    repaint();
  },
  'blk-add-end': () => {
    const pid = curPid(); const nb = { id: bid(), t: 'p', x: '' };
    const last = getPage(pid).blocks.at(-1);
    if (last && last.t === 'p' && !last.x) { repaint(last.id); return; }
    mutate(pid, (p) => { p.blocks.push(nb); });
    repaint(nb.id);
  },
  'blk-type': (b) => {
    const { pid, bid: id, t } = b.dataset;
    mutate(pid, (p) => { setType(p.blocks.find((y) => y.id === id), t); });
    closeSheet(); setTimeout(() => repaint(id), 230);
  },
  'blk-move': (b) => {
    const { pid, bid: id } = b.dataset; const d = +b.dataset.d;
    mutate(pid, (p) => { const i = p.blocks.findIndex((x) => x.id === id); const j = i + d; if (j < 0 || j >= p.blocks.length) return; const [x] = p.blocks.splice(i, 1); p.blocks.splice(j, 0, x); });
    closeSheet(); setTimeout(() => repaint(id), 230);
  },
  'blk-dup': (b) => {
    const { pid, bid: id } = b.dataset; const nid = bid();
    mutate(pid, (p) => { const i = p.blocks.findIndex((x) => x.id === id); p.blocks.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(p.blocks[i])), id: nid }); });
    closeSheet(); setTimeout(() => repaint(nid), 230);
  },
  'blk-del': (b) => {
    const { pid, bid: id } = b.dataset;
    const p = getPage(pid); const i = p.blocks.findIndex((x) => x.id === id); const x = p.blocks[i];
    mutate(pid, (pp) => { pp.blocks.splice(i, 1); if (!pp.blocks.length) pp.blocks.push({ id: bid(), t: 'p', x: '' }); });
    closeSheet(); setTimeout(() => repaint(), 230);
    toast('Bloc supprimé', { action: 'Annuler', onAction: () => { mutate(pid, (pp) => { pp.blocks.splice(i, 0, x); }); repaint(x.id); } });
  },
  'blk-task': (b) => {
    const { pid, bid: id } = b.dataset;
    const x = getPage(pid).blocks.find((y) => y.id === id);
    addTask({ title: x.x.trim().slice(0, 200), notes: `Depuis la page « ${getPage(pid).title || 'Sans titre'} »` });
    closeSheet(); toast(`« ${esc(x.x.trim().slice(0, 60))} »`, { title: 'Tâche créée', action: 'Voir', onAction: () => { location.hash = '#/taches'; } });
  },
});
