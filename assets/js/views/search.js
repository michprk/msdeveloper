// Recherche globale (Ctrl/⌘ K) et feuille « Créer » (bouton + de la navigation).
import { S, on, can, DAY, startOfDay, startOfMonth, getProject, getProspect, projectProgress, quoteTotals, QUOTE_STATUS } from '../store.js';
import { ic, esc, eur, register, sheet, sheetHead, closeSheet, when, ago, dateShort } from '../ui.js';
import { allSectors } from '../data/scripts.js';
import { SITUATIONS } from '../data/situations.js';
import { QUIZZES } from '../data/quizzes.js';
import { GUIDES } from '../data/guides.js';
import { pageText } from './notes.js';
import { quickAdd } from './tasks.js';
import { toFollow } from './quotes.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const SCREENS = [
  ['Aujourd\'hui', '#/', 'home'], ['Vue d\'ensemble — chiffres', '#/apercu', 'chart'], ['Notifications', '#/notifications', 'bell'], ['Tâches', '#/taches', 'checkSquare', 'organiser'], ['Projets', '#/projets', 'folder'], ['Calendrier — mois, semaine, jour', '#/agenda', 'calendar', 'organiser'], ['Tableau blanc', '#/tableaux', 'compose', 'organiser'], ['Mes études', '#/etudes', 'book', 'etudes'], ['Emploi du temps', '#/etudes/emploi', 'calendar', 'etudes'], ['Examens', '#/etudes/examens', 'target', 'etudes'], ['Moyennes', '#/etudes/moyennes', 'award', 'etudes'], ['Révision espacée', '#/etudes/revision', 'cards', 'etudes'], ['Mode concentration', '#/concentration', 'hourglass', 'etudes'], ['Notes', '#/notes', 'page', 'organiser'],
  ['Clients — CRM', '#/crm', 'users', 'clients'], ['Devis', '#/devis', 'invoice', 'clients'], ['Personnaliser le CRM', '#/crm/personnaliser', 'sliders', 'clients'], ['Scripts', '#/scripts', 'script', 'prospecter'], ['Session d\'appels', '#/appel', 'headset', 'prospecter'],
  ['Quiz', '#/quiz', 'quiz', 'apprendre'], ['Académie', '#/academie', 'book', 'apprendre'], ['Connecteurs — Canva, Figma, Notion', '#/connecteurs', 'plug'], ['Abonnement', '#/abonnement', 'diamond'], ['Compte et réglages', '#/reglages', 'sliders'],
  ['Sauvegarde et données', '#/reglages?s=donnees', 'download'], ['Confidentialité — RGPD', '#/confidentialite', 'shield'],
];

// Filtres : type, période, statut (selon le type) et priorité (tâches)
const TYPES = [['', 'Tout'], ['tache', 'Tâches'], ['projet', 'Projets'], ['fiche', 'Clients et prospects'], ['devis', 'Devis'], ['page', 'Pages']];
const DATES = [['', 'Toutes les dates'], ['today', 'Aujourd\'hui'], ['week', '7 prochains jours'], ['late', 'En retard'], ['month', 'Ce mois-ci']];
const STATUS_BY = {
  '': [['', 'Tous les statuts'], ['open', 'À faire ou en cours'], ['done', 'Terminé ou accepté']],
  tache: [['', 'Tous les statuts'], ['todo', 'À faire'], ['doing', 'En cours'], ['done', 'Terminée']],
  projet: [['', 'Tous les statuts'], ['actif', 'En cours'], ['pause', 'En pause'], ['termine', 'Terminé']],
  devis: [['', 'Tous les statuts'], ['brouillon', 'Brouillon'], ['envoye', 'Envoyé'], ['relancer', 'À relancer'], ['accepte', 'Accepté'], ['refuse', 'Refusé']],
  fiche: [['', 'Tous'], ['prospect', 'Prospects'], ['client', 'Clients']],
  page: [['', 'Toutes']],
};
const PRIOS = [['', 'Toutes priorités'], ['2', 'Urgente'], ['1', 'Importante'], ['0', 'Normale']];
const OPEN = ['todo', 'doing', 'actif', 'pause', 'brouillon', 'envoye', 'prospect'];
const DONE = ['done', 'termine', 'accepte', 'client'];

function inDate(d, date, { late = false, ref = null } = {}) {
  if (!date) return true;
  const t0 = startOfDay();
  if (date === 'late') return late;
  if (!d) return false;
  if (date === 'today') return d >= t0 && d < t0 + DAY;
  if (date === 'week') return d >= t0 && d < t0 + 7 * DAY;
  if (date === 'month') { const m = startOfMonth(); const next = new Date(m); next.setMonth(next.getMonth() + 1); return (d >= m && d < next.getTime()) || (ref && ref >= m); }
  return true;
}
const stOk = (st, want) => !want || (want === 'open' ? st.some((x) => OPEN.includes(x)) : want === 'done' ? st.some((x) => DONE.includes(x)) : st.includes(want));

// Toutes les entrées cherchables, avec leurs champs de filtre
function items() {
  const s = S(), now = Date.now(), t0 = startOfDay();
  const out = [];
  s.tasks.forEach((t) => {
    const pr = t.projectId && getProject(t.projectId);
    const st = t.done ? 'done' : t.status === 'doing' ? 'doing' : 'todo';
    const timed = t.due && (new Date(t.due).getHours() || new Date(t.due).getMinutes());
    out.push({ type: 'tache', g: 'Tâches', txt: `${t.title} ${t.notes || ''} ${pr?.name || ''} ${(t.sub || []).map((x) => x.x).join(' ')}`, d: t.due, ref: t.doneAt || t.createdAt, late: !t.done && t.due && t.due < (timed ? now : t0), st: [st], prio: t.prio || 0, order: (t.done ? 1e15 : 0) + (t.due || 9e14),
      t: t.title, sub: [t.done ? 'Terminée' : st === 'doing' ? 'En cours' : t.due ? when(t.due) : 'Sans date', pr?.name].filter(Boolean).join(' · '), i: 'checkSquare', act: 'task-open', id: t.id });
  });
  if (on('organiser') || s.projects.length) s.projects.forEach((p) => {
    const g = projectProgress(p.id);
    out.push({ type: 'projet', g: 'Projets', txt: `${p.name} ${p.desc || ''} ${getProspect(p.prospectId)?.entreprise || ''}`, d: p.due, ref: p.createdAt, late: p.status !== 'termine' && p.due && p.due < t0, st: [p.status || 'actif'], order: p.due || 9e14,
      t: p.name, sub: `${g.pct} % · ${g.done} / ${g.total} tâches${p.due ? ` · échéance ${dateShort(p.due)}` : ''}`, i: p.icon || 'folder', h: `#/projet/${p.id}` });
  });
  if (can('crm')) s.prospects.forEach((p) => {
    out.push({ type: 'fiche', g: s.crm.noun || 'Fiches', txt: `${p.entreprise} ${p.contact} ${p.ville} ${p.email} ${p.tel} ${(p.tags || []).join(' ')} ${p.notes || ''}`, d: p.next?.due, ref: p.updatedAt, late: p.next?.due && p.next.due < now, st: [p.type === 'client' ? 'client' : 'prospect', p.stage], order: -(p.updatedAt || 0),
      t: p.entreprise, sub: [p.type === 'client' ? 'Client' : 'Prospect', p.contact, p.ville, p.next?.due ? `relance ${when(p.next.due)}` : ''].filter(Boolean).join(' · '), i: 'user', h: `#/fiche/${p.id}` });
  });
  if (can('quote')) s.quotes.forEach((q) => {
    const fl = toFollow(q);
    out.push({ type: 'devis', g: 'Devis', txt: `${q.num} ${q.client} ${q.title} ${(q.lines || []).map((l) => l.label).join(' ')}`, d: q.sentAt || q.createdAt, ref: q.updatedAt, late: fl, st: [q.status, ...(fl ? ['relancer'] : [])], order: -(q.updatedAt || 0),
      t: `${q.num}${q.client ? ` · ${q.client}` : ''}`, sub: `${eur(quoteTotals(q).ttc)} · ${QUOTE_STATUS[q.status][0]}${fl ? ' · à relancer' : ''}`, i: 'invoice', h: `#/devis/${q.id}` });
  });
  s.pages.forEach((p) => out.push({ type: 'page', g: 'Pages', txt: pageText(p), d: p.updatedAt, ref: p.updatedAt, st: [], order: -(p.updatedAt || 0), t: p.title || 'Sans titre', sub: `Page · ${ago(p.updatedAt)}`, i: p.icon || 'page', h: `#/note/${p.id}` }));
  return out;
}

function results(q, f = {}) {
  const n = norm(q).trim();
  const filtered = !!(f.type || f.date || f.st || f.prio !== '' && f.prio != null);
  if (!n && !filtered) return [];
  const hit = (txt) => !n || norm(txt).includes(n);
  const groups = [];
  const max = filtered ? 12 : 5;
  const push = (label, list) => { if (list.length) groups.push([label, list.slice(0, max), list.length]); };
  if (!filtered) push('Écrans', SCREENS.filter(([l, , , m]) => (!m || on(m)) && hit(l)).map(([l, h, i]) => ({ t: l, h, i })));
  const all = items().filter((it) => (!f.type || it.type === f.type)
    && (!f.date || inDate(it.d, f.date, it))
    && (!f.st || stOk(it.st, f.st))
    && (f.prio === '' || f.prio == null || (it.type === 'tache' && String(it.prio) === f.prio))
    && hit(it.txt));
  const order = ['tache', 'projet', 'fiche', 'devis', 'page'];
  order.forEach((ty) => { const list = all.filter((x) => x.type === ty).sort((a, b) => a.order - b.order); if (list.length) push(list[0].g, list); });
  if (!filtered && on('prospecter')) {
    push('Scripts', [
      ...allSectors().filter((x) => hit(`${x.name} ${x.plural} ${x.search || ''}`)).map((x) => ({ t: x.name, sub: 'Scripts du secteur', i: x.icon, h: `#/scripts/${x.id}` })),
      ...SITUATIONS.filter((x) => hit(`${x.title} ${x.when}`)).map((x) => ({ t: x.title, sub: 'Situation délicate', i: x.icon, h: `#/script/sit.${x.id}` })),
    ]);
  }
  if (!filtered) {
    push('Quiz', QUIZZES.filter((x) => hit(`${x.title} ${x.desc}`)).map((x) => ({ t: x.title, sub: `${x.qs.length} questions`, i: x.icon, h: `#/quiz/${x.id}?restart=1` })));
    push('Guides', GUIDES.filter((g) => hit(`${g.title} ${g.intro}`)).map((g) => ({ t: g.title, sub: `${g.cat} · ${g.min} min`, i: 'book', h: `#/academie/${g.id}` })));
  }
  return groups;
}
export { results as searchResults };

const HINT = 'Tâches, projets, clients, devis, pages et leur contenu, scripts, quiz et écrans. Les filtres fonctionnent aussi sans texte.';
export function searchSheet(preset = {}) {
  const f = { type: '', date: '', st: '', prio: '', ...preset };
  const opts = (list, v) => list.map(([k, l]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${esc(l)}</option>`).join('');
  const d = sheet(`<div class="srch">
      <div class="search srch-in"><span class="search-ic">${ic('search')}</span><input class="inp" type="search" placeholder="Chercher une tâche, un projet, un client, un devis…" aria-label="Rechercher partout" autofocus enterkeyhint="go"><button class="btn-text" data-act="close-sheet">Annuler</button></div>
      <div class="srch-f" role="group" aria-label="Filtres">
        <label class="chip-sel">${ic('filter')}<select data-f="type" aria-label="Type">${opts(TYPES, f.type)}</select></label>
        <label class="chip-sel">${ic('calendar')}<select data-f="date" aria-label="Période">${opts(DATES, f.date)}</select></label>
        <label class="chip-sel"><select data-f="st" aria-label="Statut">${opts(STATUS_BY[f.type] || STATUS_BY[''], f.st)}</select></label>
        <label class="chip-sel" ${f.type && f.type !== 'tache' ? 'hidden' : ''}>${ic('flag')}<select data-f="prio" aria-label="Priorité">${opts(PRIOS, f.prio)}</select></label>
        <button class="link srch-clear" data-srch-clear hidden>Effacer les filtres</button>
      </div>
      <div class="srch-r" role="listbox" aria-label="Résultats"><p class="srch-hint">${ic('search')}<span>${HINT}</span></p></div>
    </div>`, { cls: 'sheet-search' });
  const inp = d.querySelector('input');
  const box = d.querySelector('.srch-r');
  const fbox = d.querySelector('.srch-f');
  let sel = 0;
  const syncF = () => {
    fbox.querySelectorAll('select').forEach((x) => x.closest('.chip-sel').classList.toggle('is-on', !!x.value));
    fbox.querySelector('[data-f="prio"]').closest('.chip-sel').hidden = !!f.type && f.type !== 'tache';
    fbox.querySelector('[data-srch-clear]').hidden = !(f.type || f.date || f.st || f.prio);
  };
  const draw = () => {
    syncF();
    const g = results(inp.value, f);
    const any = inp.value.trim() || f.type || f.date || f.st || f.prio;
    if (!any) { box.innerHTML = `<p class="srch-hint">${ic('search')}<span>${HINT}</span></p>`; return; }
    if (!g.length) { box.innerHTML = `<p class="srch-hint">${ic('x')}<span>${inp.value.trim() ? `Rien ne correspond à « ${esc(inp.value.trim())} »` : 'Rien ne correspond à ces filtres'}.</span></p>`; return; }
    let k = 0;
    box.innerHTML = g.map(([label, list, total]) => `<p class="srch-g">${esc(label)}${total > list.length ? ` <span>${list.length} sur ${total}</span>` : ` <span>${total}</span>`}</p>${list.map((it) => {
      const cls = `srch-i ${k === sel ? 'is-on' : ''}`; const idx = k++;
      const inner = `<span class="menu-ic">${ic(it.i)}</span><span class="row-b"><b>${esc(it.t)}</b>${it.sub ? `<span>${esc(it.sub)}</span>` : ''}</span>`;
      return it.act ? `<button class="${cls}" role="option" data-k="${idx}" data-act="${it.act}" data-id="${it.id}">${inner}</button>` : `<a class="${cls}" role="option" data-k="${idx}" href="${it.h}">${inner}</a>`;
    }).join('')}`).join('');
  };
  fbox.addEventListener('change', (e) => {
    const k = e.target.dataset.f; if (!k) return;
    f[k] = e.target.value;
    if (k === 'type') { f.st = ''; fbox.querySelector('[data-f="st"]').innerHTML = opts(STATUS_BY[f.type] || STATUS_BY[''], ''); if (f.type && f.type !== 'tache') { f.prio = ''; fbox.querySelector('[data-f="prio"]').value = ''; } }
    sel = 0; draw();
  });
  fbox.querySelector('[data-srch-clear]').addEventListener('click', () => { Object.assign(f, { type: '', date: '', st: '', prio: '' }); fbox.querySelectorAll('select').forEach((x) => { x.value = ''; }); fbox.querySelector('[data-f="st"]').innerHTML = opts(STATUS_BY[''], ''); sel = 0; draw(); });
  inp.addEventListener('input', () => { sel = 0; draw(); });
  inp.addEventListener('keydown', (e) => {
    const list = [...box.querySelectorAll('.srch-i')];
    if (!list.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length;
      list.forEach((x, i) => x.classList.toggle('is-on', i === sel)); list[sel].scrollIntoView({ block: 'nearest' });
    }
    if (e.key === 'Enter') { e.preventDefault(); list[sel].click(); }
  });
  box.addEventListener('click', (e) => { const a = e.target.closest('a.srch-i'); if (a) closeSheet(null, true); });
  if (f.type || f.date || f.st || f.prio) draw();
  setTimeout(() => inp.focus(), 30);
}

export function createSheet() {
  const items = [
    on('organiser') && ['page-new', 'page', 'Page de notes', 'Vierge, ou à partir d\'un modèle', { tpl: 'vierge' }],
    on('organiser') && ['page-templates', 'layers', 'Depuis un modèle', 'Réunion, projet, journal, révision…'],
    on('clients') && (can('crm') ? ['prospect-new', 'users', 'Fiche', S().crm.noun || 'Clients', {}] : ['go', 'users', 'Fiche', 'CRM inclus dans Pro', { h: '#/crm' }]),
    on('prospecter') && ['go', 'headset', 'Session d\'appels', 'Le script pas à pas', { h: '#/appel' }],
    on('apprendre') && ['go', 'quiz', 'Quiz', 'Vos quiz sur Quizlet, vos cartes de révision', { h: '#/quiz' }],
  ].filter(Boolean);
  sheet(`${sheetHead('Créer')}<div class="sheet-body">
      ${on('organiser') ? `<p class="field-l">Une tâche</p>${quickAdd({ placeholder: 'Ex. « Appeler Marc demain 14h #travail »' })}` : ''}
      <div class="create-grid">${items.map(([act, i, t, sub, data = {}]) => `<button class="create-i" data-act="${act}" ${data.tpl ? `data-tpl="${data.tpl}"` : ''} ${data.h ? `data-h="${data.h}"` : ''}><span class="menu-ic">${ic(i)}</span><span class="row-b"><b>${esc(t)}</b><span>${esc(sub)}</span></span></button>`).join('')}</div>
    </div>`, { cls: 'sheet-sm' });
}

register({
  search: () => searchSheet(),
  create: () => createSheet(),
  go: (b) => { closeSheet(null, true); location.hash = b.dataset.h; },
});
