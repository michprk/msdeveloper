// Notes : des pages et sous-pages faites de blocs (texte, titres, cases à cocher, listes,
// citation, encadré, séparateur, question / réponse). « / » ouvre le menu des blocs ;
// les raccourcis Markdown marchent aussi (# titre, - liste, [] case, > citation).
// Tout s'enregistre au fil de la frappe, sans rechargement de l'écran.
import { S, update, on, can, addPage, getPage, getProspect, getProject, pageFamily, canAddPage, bid, addTask, LIMITS } from '../store.js';
import { ic, esc, register, toast, sheet, sheetHead, closeSheet, confirmSheet, ago, dateLong, copyText, download, select } from '../ui.js';
import { pageHead, paywall } from './common.js';
import { TEMPLATES, template } from '../data/templates.js';

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
  ['divider', 'Séparateur', 'divider', '---'],
];
const BL = Object.fromEntries(BLOCKS.map((b) => [b[0], b]));
const PAGE_ICONS = ['page', 'note', 'folder', 'briefcase', 'calendar', 'target', 'checkSquare', 'book', 'cards', 'users', 'star', 'flag', 'globe', 'camera', 'house', 'store', 'sun', 'inbox', 'bolt', 'compass'];
const PH = { p: 'Écrivez, ou tapez « / » pour choisir un bloc', h1: 'Titre', h2: 'Sous-titre', todo: 'À faire', ul: 'Élément', ol: 'Élément', quote: 'Citation', callout: 'À retenir' };
const MD = [[/^#\s/, 'h1'], [/^##\s/, 'h2'], [/^[-*]\s/, 'ul'], [/^1[.)]\s/, 'ol'], [/^\[ ?\]\s/, 'todo'], [/^>\s/, 'quote'], [/^!\s/, 'callout'], [/^\?\?\s/, 'qa']];

export const pageText = (p) => [p.title, ...p.blocks.map((b) => [b.x, b.a].filter(Boolean).join(' '))].join(' ');
export const qaCards = (p) => p.blocks.filter((b) => b.t === 'qa' && (b.x || '').trim() && (b.a || '').trim());
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
  return addPage({ title, icon: t.icon === 'page' ? 'page' : t.icon, parent, prospectId, projectId, tpl: t.id, blocks: t.blocks.map(([type, x, a]) => ({ id: bid(), t: type, x: x || '', ...(type === 'todo' ? { c: false } : {}), ...(type === 'qa' ? { a: a || '' } : {}) })) });
}
function limitSheet() {
  sheet(`${sheetHead('Cinq pages dans la version gratuite')}<div class="sheet-body">${paywall('notesUnlimited', { compact: true })}<p class="sheet-note">Vos ${S().pages.length} pages restent modifiables. Vous pouvez aussi supprimer une page pour en créer une autre.</p></div>`, { cls: 'sheet-sm' });
}
export function templatesSheet(opts = {}) {
  sheet(`${sheetHead('Nouvelle page', 'Partez d\'une page vierge ou d\'un modèle')}<div class="sheet-body"><div class="tpl-grid">${TEMPLATES.map((t) => `<button class="tpl" data-act="page-new" data-tpl="${t.id}" ${opts.parent ? `data-parent="${opts.parent}"` : ''} ${opts.prospectId ? `data-pid="${opts.prospectId}"` : ''}><span class="tpl-ic">${ic(t.icon)}</span><b>${esc(t.name)}</b><span>${esc(t.desc)}</span></button>`).join('')}</div></div>`, { cls: 'sheet-tall' });
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
    <div class="tpl-grid">${TEMPLATES.map((t) => `<button class="tpl" data-act="page-new" data-tpl="${t.id}"><span class="tpl-ic">${ic(t.icon)}</span><b>${esc(t.name)}</b><span>${esc(t.desc)}</span></button>`).join('')}</div>`;
  return { title: 'Notes', tab: 'notes', fab: 'page-templates', html };
}

// ---------- Éditeur ----------
function blockHtml(b, n) {
  const tb = (cls = '', k = 'x', ph = PH[b.t] || '') => `<textarea class="blk-in ${cls}" rows="1" data-k="${k}" placeholder="${esc(ph)}" spellcheck="true" aria-label="${esc(BL[b.t]?.[1] || 'Texte')}">${esc(b[k] || '')}</textarea>`;
  const lead = b.t === 'todo' ? `<button class="tick blk-ck ${b.c ? 'is-done' : ''}" data-act="blk-check" aria-pressed="${!!b.c}" aria-label="Cocher"></button>`
    : b.t === 'ul' ? '<span class="blk-bul" aria-hidden="true"></span>'
      : b.t === 'ol' ? `<span class="blk-num" aria-hidden="true">${n}.</span>`
        : b.t === 'callout' ? `<span class="blk-cic">${ic('callout')}</span>` : '';
  const body = b.t === 'divider' ? '<hr class="blk-hr">'
    : b.t === 'qa' ? `<div class="qa-w"><span class="qa-k">Question</span>${tb('qa-q', 'x', 'La question')}<span class="qa-k">Réponse</span>${tb('qa-a', 'a', 'La réponse')}</div>`
      : tb();
  return `<div class="blk blk-${b.t} ${b.c ? 'is-done' : ''}" data-bid="${b.id}"><button class="blk-h" data-act="blk-menu" aria-label="Options du bloc" tabindex="-1">${ic('drag')}</button>${lead}${body}</div>`;
}
function blocksHtml(p) {
  let n = 0;
  return p.blocks.map((b) => { n = b.t === 'ol' ? n + 1 : 0; return blockHtml(b, n); }).join('');
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
    <article class="note" data-pid="${p.id}">
      ${crumbs.length ? `<p class="note-crumbs">${crumbs.map((c) => `<a href="#/note/${c.id}">${esc(c.title || 'Sans titre')}</a>`).join('<span>/</span>')}</p>` : ''}
      <button class="note-icon" data-act="page-icon" data-id="${p.id}" aria-label="Changer l'icône">${ic(p.icon || 'page')}</button>
      <textarea class="note-title" rows="1" placeholder="Sans titre" aria-label="Titre de la page" maxlength="140">${esc(p.title)}</textarea>
      <p class="note-meta"><span class="note-saved">Enregistrée</span> · modifiée ${ago(p.updatedAt)} · <span class="note-words">${words(p)} mot${words(p) > 1 ? 's' : ''}</span>${pr ? ` · <a href="#/fiche/${pr.id}">${ic('user')}${esc(pr.entreprise)}</a>` : ''}</p>
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
  const page = () => getPage(pid);
  const title = root.querySelector('.note-title');
  let slashFor = null, slashIdx = 0;

  const fit = () => root.querySelectorAll('.note textarea').forEach(autosize);
  requestAnimationFrame(fit);
  const flash = () => { saved.textContent = 'Enregistrement…'; clearTimeout(saveT); saveT = setTimeout(() => { saved.textContent = 'Enregistrée'; const w = words(page()); root.querySelector('.note-words').textContent = `${w} mot${w > 1 ? 's' : ''}`; }, 500); };
  const paint = (focusId, pos = 'end', k = 'x') => {
    wrap.innerHTML = blocksHtml(page());
    fit();
    if (focusId) focusBlock(focusId, pos, k);
  };
  const focusBlock = (id, pos = 'end', k = 'x') => {
    const el = wrap.querySelector(`.blk[data-bid="${id}"] textarea[data-k="${k}"]`) || wrap.querySelector(`.blk[data-bid="${id}"] textarea`);
    if (!el) return;
    el.focus();
    const p = pos === 'end' ? el.value.length : pos === 'start' ? 0 : Math.min(pos, el.value.length);
    el.setSelectionRange(p, p);
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
      const b = p.blocks[i];
      b.x = (b.x || '').replace(/^\/\S*\s?/, '');
      b.t = t;
      if (t === 'todo') b.c = !!b.c;
      if (t === 'qa') b.a = b.a || '';
      if (t === 'divider') { b.x = ''; const nb = { id: bid(), t: 'p', x: '' }; p.blocks.splice(i + 1, 0, nb); focusId = nb.id; }
    });
    closeSlash(); paint(focusId);
    flash();
  };
  slash.addEventListener('pointerdown', (e) => e.preventDefault());
  slash.addEventListener('click', (e) => { const b = e.target.closest('.slash-i'); if (b && slashFor) applyType(slashFor, b.dataset.t); });

  wrap.addEventListener('input', (e) => {
    const ta = e.target.closest('textarea'); if (!ta) return;
    const blk = ta.closest('.blk'); const id = blk.dataset.bid; const k = ta.dataset.k;
    autosize(ta);
    const v = ta.value;
    // Raccourcis Markdown en début de bloc
    if (k === 'x') {
      const b = page().blocks.find((x) => x.id === id);
      if (v === '---' || v === '—-') { mutate(pid, (p) => { p.blocks.find((x) => x.id === id).x = ''; }); applyType(id, 'divider'); return; }
      for (const [re, t] of MD) {
        if (re.test(v) && b.t === 'p') { const rest = v.replace(re, ''); const caret = Math.max(0, ta.selectionStart - (v.length - rest.length)); mutate(pid, (p) => { p.blocks.find((x) => x.id === id).x = rest; }); applyType(id, t); focusBlock(id, caret); return; }
      }
      if (v.startsWith('/') && !/\s/.test(v.slice(1, 12)) && b.t !== 'qa') openSlash(id, v.slice(1)); else if (slashFor) closeSlash();
    }
    mutate(pid, (p) => { const b = p.blocks.find((x) => x.id === id); if (b) b[k] = v; });
    flash();
  });

  wrap.addEventListener('keydown', (e) => {
    const ta = e.target.closest('textarea'); if (!ta) return;
    const blk = ta.closest('.blk'); const id = blk.dataset.bid; const k = ta.dataset.k;
    const p = page(); const i = p.blocks.findIndex((b) => b.id === id); const b = p.blocks[i];
    if (slashFor && !slash.hidden) {
      const items = [...slash.querySelectorAll('.slash-i')];
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); slashIdx = (slashIdx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; openSlash(slashFor, ta.value.slice(1)); return; }
      if (e.key === 'Enter') { e.preventDefault(); applyType(slashFor, items[slashIdx]?.dataset.t || 'p'); return; }
      if (e.key === 'Escape') { e.preventDefault(); closeSlash(); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      if (b.t === 'qa' && k === 'x') { focusBlock(id, 'end', 'a'); return; }
      const pos = ta.selectionStart;
      const before = ta.value.slice(0, pos), after = ta.value.slice(ta.selectionEnd);
      const listy = ['ul', 'ol', 'todo', 'qa'].includes(b.t);
      if (listy && !ta.value.trim() && (b.t !== 'qa' || !(b.x || '').trim())) { mutate(pid, (pp) => { const x = pp.blocks[i]; x.t = 'p'; x.x = ''; delete x.a; }); paint(id, 'start'); return; }
      const nb = { id: bid(), t: listy ? b.t : 'p', x: b.t === 'qa' ? '' : after, ...(b.t === 'todo' ? { c: false } : {}), ...(b.t === 'qa' ? { a: '' } : {}) };
      mutate(pid, (pp) => { if (b.t !== 'qa') pp.blocks[i].x = before; pp.blocks.splice(i + 1, 0, nb); });
      paint(nb.id, 'start'); flash();
      return;
    }
    if (e.key === 'Backspace' && ta.selectionStart === 0 && ta.selectionEnd === 0) {
      if (k === 'a') { e.preventDefault(); focusBlock(id, 'end', 'x'); return; }
      if (b.t !== 'p') { e.preventDefault(); mutate(pid, (pp) => { const x = pp.blocks[i]; if (x.t === 'qa') x.x = [x.x, x.a].filter(Boolean).join(' '); x.t = 'p'; delete x.a; }); paint(id, 'start'); flash(); return; }
      const prev = p.blocks[i - 1];
      if (!prev) return;
      e.preventDefault();
      if (prev.t === 'divider') { mutate(pid, (pp) => { pp.blocks.splice(i - 1, 1); }); paint(id, 'start'); flash(); return; }
      const join = (prev.t === 'qa' ? prev.a : prev.x || '').length;
      mutate(pid, (pp) => { const pv = pp.blocks[i - 1]; if (pv.t === 'qa') pv.a = (pv.a || '') + b.x; else pv.x = (pv.x || '') + b.x; pp.blocks.splice(i, 1); });
      paint(prev.id, join, prev.t === 'qa' ? 'a' : 'x'); flash();
      return;
    }
    if (e.key === 'ArrowUp' && ta.selectionStart === 0 && i > 0) {
      const prev = [...p.blocks.slice(0, i)].reverse().find((x) => x.t !== 'divider');
      if (prev) { e.preventDefault(); focusBlock(prev.id, 'end', prev.t === 'qa' ? 'a' : 'x'); }
    }
    if (e.key === 'ArrowDown' && ta.selectionEnd === ta.value.length) {
      const next = p.blocks.slice(i + 1).find((x) => x.t !== 'divider');
      if (next) { e.preventDefault(); focusBlock(next.id, 'start'); }
    }
  });
  wrap.addEventListener('focusout', () => setTimeout(() => { if (!wrap.contains(document.activeElement)) closeSlash(); }, 120));
  const onResize = () => fit();
  window.addEventListener('resize', onResize);
  return () => { window.removeEventListener('resize', onResize); delete root._paint; };
}

// ---------- Menus ----------
function blockMenu(pid, id) {
  const p = getPage(pid); const b = p.blocks.find((x) => x.id === id);
  sheet(`${sheetHead('Bloc', esc(BL[b.t]?.[1] || ''))}<div class="sheet-body">
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
const toMarkdown = (p) => [`# ${p.title || 'Sans titre'}`, '', ...(() => { let n = 0; return p.blocks.map((b) => { n = b.t === 'ol' ? n + 1 : 0; return { p: b.x, h1: `## ${b.x}`, h2: `### ${b.x}`, todo: `- [${b.c ? 'x' : ' '}] ${b.x}`, ul: `- ${b.x}`, ol: `${n}. ${b.x}`, quote: `> ${b.x}`, callout: `> **${b.x}**`, divider: '---', qa: `**Q :** ${b.x}\n**R :** ${b.a || ''}` }[b.t] ?? b.x; }); })()].join('\n');
function pageMenu(id) {
  const p = getPage(id);
  const fam = pageFamily(id);
  const parents = S().pages.filter((x) => !fam.includes(x.id));
  sheet(`${sheetHead('Page', esc(p.title || 'Sans titre'))}<div class="sheet-body">
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
    const c = addPage({ ...copy, title: `${p.title || 'Sans titre'} (copie)`, fav: false, createdAt: Date.now(), updatedAt: Date.now(), blocks: p.blocks.map((x) => ({ ...x, id: bid() })) });
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
    mutate(pid, (p) => { const x = p.blocks.find((y) => y.id === id); x.t = t; if (t === 'todo') x.c = !!x.c; if (t === 'qa') x.a = x.a || ''; if (t === 'divider') x.x = ''; });
    closeSheet(); setTimeout(() => repaint(id), 230);
  },
  'blk-move': (b) => {
    const { pid, bid: id } = b.dataset; const d = +b.dataset.d;
    mutate(pid, (p) => { const i = p.blocks.findIndex((x) => x.id === id); const j = i + d; if (j < 0 || j >= p.blocks.length) return; const [x] = p.blocks.splice(i, 1); p.blocks.splice(j, 0, x); });
    closeSheet(); setTimeout(() => repaint(id), 230);
  },
  'blk-dup': (b) => {
    const { pid, bid: id } = b.dataset; const nid = bid();
    mutate(pid, (p) => { const i = p.blocks.findIndex((x) => x.id === id); p.blocks.splice(i + 1, 0, { ...p.blocks[i], id: nid }); });
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
