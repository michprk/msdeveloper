// Recherche globale (Ctrl/⌘ K) et feuille « Créer » (bouton + de la navigation).
import { S, on, can } from '../store.js';
import { ic, esc, register, sheet, sheetHead, closeSheet, when } from '../ui.js';
import { allSectors } from '../data/scripts.js';
import { SITUATIONS } from '../data/situations.js';
import { QUIZZES } from '../data/quizzes.js';
import { GUIDES } from '../data/guides.js';
import { pageText } from './notes.js';
import { quickAdd } from './tasks.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const SCREENS = [
  ['Aujourd\'hui', '#/', 'home'], ['Tâches', '#/taches', 'checkSquare', 'organiser'], ['Agenda', '#/agenda', 'calendar', 'organiser'], ['Notes', '#/notes', 'page', 'organiser'],
  ['Clients — CRM', '#/crm', 'users', 'clients'], ['Personnaliser le CRM', '#/crm/personnaliser', 'sliders', 'clients'], ['Scripts', '#/scripts', 'script', 'prospecter'], ['Session d\'appels', '#/appel', 'headset', 'prospecter'],
  ['Quiz', '#/quiz', 'quiz', 'apprendre'], ['Académie', '#/academie', 'book', 'apprendre'], ['Abonnement', '#/abonnement', 'diamond'], ['Compte et réglages', '#/reglages', 'sliders'], ['Sauvegarde et données', '#/reglages?s=donnees', 'download'],
];

function results(q) {
  const s = S(); const n = norm(q).trim();
  if (!n) return [];
  const hit = (txt) => norm(txt).includes(n);
  const groups = [];
  const push = (label, items) => { if (items.length) groups.push([label, items.slice(0, 5), items.length]); };
  push('Écrans', SCREENS.filter(([l, , , m]) => (!m || on(m)) && hit(l)).map(([l, h, i]) => ({ t: l, h, i })));
  push('Tâches', s.tasks.filter((t) => hit(`${t.title} ${t.notes || ''}`)).sort((a, b) => a.done - b.done).map((t) => ({ t: t.title, sub: t.done ? 'Terminée' : t.due ? when(t.due) : 'Sans date', i: 'checkSquare', act: 'task-open', id: t.id })));
  push('Pages', s.pages.filter((p) => hit(pageText(p))).map((p) => ({ t: p.title || 'Sans titre', sub: 'Page', i: p.icon || 'page', h: `#/note/${p.id}` })));
  if (can('crm')) push(s.crm.noun || 'Fiches', s.prospects.filter((p) => hit(`${p.entreprise} ${p.contact} ${p.ville} ${p.email} ${p.tel} ${(p.tags || []).join(' ')}`)).map((p) => ({ t: p.entreprise, sub: [p.contact, p.ville].filter(Boolean).join(' · '), i: 'user', h: `#/fiche/${p.id}` })));
  if (on('prospecter')) {
    push('Scripts', [
      ...allSectors().filter((x) => hit(`${x.name} ${x.plural} ${x.search || ''}`)).map((x) => ({ t: x.name, sub: 'Scripts du secteur', i: x.icon, h: `#/scripts/${x.id}` })),
      ...SITUATIONS.filter((x) => hit(`${x.title} ${x.when}`)).map((x) => ({ t: x.title, sub: 'Situation délicate', i: x.icon, h: `#/script/sit.${x.id}` })),
    ]);
  }
  push('Quiz', QUIZZES.filter((x) => hit(`${x.title} ${x.desc}`)).map((x) => ({ t: x.title, sub: `${x.qs.length} questions`, i: x.icon, h: `#/quiz/${x.id}?restart=1` })));
  push('Guides', GUIDES.filter((g) => hit(`${g.title} ${g.intro}`)).map((g) => ({ t: g.title, sub: `${g.cat} · ${g.min} min`, i: 'book', h: `#/academie/${g.id}` })));
  return groups;
}

export function searchSheet() {
  const d = sheet(`<div class="srch">
      <div class="search srch-in"><span class="search-ic">${ic('search')}</span><input class="inp" type="search" placeholder="Chercher une tâche, une page, une fiche…" aria-label="Rechercher partout" autofocus enterkeyhint="go"><button class="btn-text" data-act="close-sheet">Annuler</button></div>
      <div class="srch-r" role="listbox" aria-label="Résultats"><p class="srch-hint">${ic('search')}<span>Tâches, pages et leur contenu, fiches, scripts, quiz, guides et écrans de l'application.</span></p></div>
    </div>`, { cls: 'sheet-search' });
  const inp = d.querySelector('input');
  const box = d.querySelector('.srch-r');
  let sel = 0;
  const draw = () => {
    const g = results(inp.value);
    if (!inp.value.trim()) { box.innerHTML = `<p class="srch-hint">${ic('search')}<span>Tâches, pages et leur contenu, fiches, scripts, quiz, guides et écrans de l'application.</span></p>`; return; }
    if (!g.length) { box.innerHTML = `<p class="srch-hint">${ic('x')}<span>Rien ne correspond à « ${esc(inp.value.trim())} ».</span></p>`; return; }
    let k = 0;
    box.innerHTML = g.map(([label, items, total]) => `<p class="srch-g">${esc(label)}${total > items.length ? ` <span>${total}</span>` : ''}</p>${items.map((it) => {
      const cls = `srch-i ${k === sel ? 'is-on' : ''}`; const idx = k++;
      const inner = `<span class="menu-ic">${ic(it.i)}</span><span class="row-b"><b>${esc(it.t)}</b>${it.sub ? `<span>${esc(it.sub)}</span>` : ''}</span>`;
      return it.act ? `<button class="${cls}" role="option" data-k="${idx}" data-act="${it.act}" data-id="${it.id}">${inner}</button>` : `<a class="${cls}" role="option" data-k="${idx}" href="${it.h}">${inner}</a>`;
    }).join('')}`).join('');
  };
  inp.addEventListener('input', () => { sel = 0; draw(); });
  inp.addEventListener('keydown', (e) => {
    const items = [...box.querySelectorAll('.srch-i')];
    if (!items.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((x, i) => x.classList.toggle('is-on', i === sel)); items[sel].scrollIntoView({ block: 'nearest' });
    }
    if (e.key === 'Enter') { e.preventDefault(); items[sel].click(); }
  });
  box.addEventListener('click', (e) => { const a = e.target.closest('a.srch-i'); if (a) closeSheet(null, true); });
  setTimeout(() => inp.focus(), 30);
}

export function createSheet() {
  const items = [
    on('organiser') && ['page-new', 'page', 'Page de notes', 'Vierge, ou à partir d\'un modèle', { tpl: 'vierge' }],
    on('organiser') && ['page-templates', 'layers', 'Depuis un modèle', 'Réunion, projet, journal, révision…'],
    on('clients') && (can('crm') ? ['prospect-new', 'users', 'Fiche', S().crm.noun || 'Clients', {}] : ['go', 'users', 'Fiche', 'CRM inclus dans Pro', { h: '#/crm' }]),
    on('prospecter') && ['go', 'headset', 'Session d\'appels', 'Le script pas à pas', { h: '#/appel' }],
    on('apprendre') && ['go', 'quiz', 'Quiz', can('myQuiz') ? 'Vos propres questions' : 'Inclus dans Pro', { h: '#/quiz/nouveau' }],
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
