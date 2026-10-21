// MindView — démarrage, coquille, routeur, navigation par modules, événements délégués.
import { S, update, onChange, access, billing, trialLeft, PLANS, on, schoolOnly, syncBilling, dayKey } from './store.js';
import { ic, logoMark } from './icons.js';
import { actions, forms, esc, toast, avatar, validateForm, fieldError, setFieldError, refreshNeeds, saveDraft, register } from './ui.js';
import { home } from './views/home.js';
import { notificationsView, unreadCount, unreadUrgent } from './views/notifications.js';
import { onboarding, startOnboarding, isReplay, loginView, resumeAfterAuth } from './views/onboarding.js';
import { needsLogin, loggedIn, afterAuthReturn } from './auth.js';
import { startSync } from './sync.js';
import { startReminders } from './notify.js';
import { bootLock } from './lock.js';
import { accessLabel } from './views/common.js';
import { cloudUser, refreshSubscription, checkActivation, track, takeAuthReturn, finishAuthReturn, cloudMessage, cloudMock } from './cloud.js';
import { authButton, newPasswordSheet } from './views/account.js';
import { t as tr } from './strings.js';

// ---------- Écrans chargés à la demande (1.17) ----------
// Au démarrage : seulement l'accueil, la connexion, les notifications et le cœur de l'application.
// Un autre écran est téléchargé à sa première ouverture ; tous les autres le sont ensuite au premier geste
// (ou après 8 secondes), pour que chaque bouton réponde tout de suite.
const LAZY = {
  overview: './views/overview.js', tasks: './views/tasks.js', agenda: './views/agenda.js', notes: './views/notes.js',
  quiz: './views/quiz.js', scripts: './views/scripts.js', call: './views/call.js', crm: './views/crm.js',
  projects: './views/projects.js', quotes: './views/quotes.js', connect: './views/connect.js', privacy: './views/privacy.js',
  studies: './views/studies.js', boards: './views/boards.js', billing: './views/billing.js', tools: './views/tools.js',
  tools2: './views/tools2.js', pages: './views/pages.js', search: './views/search.js', notion: './views/notion.js',
};
const mods = {}, pending = {};
function load(key) {
  if (mods[key]) return Promise.resolve(mods[key]);
  return (pending[key] ||= import(LAZY[key]).then((m) => {
    mods[key] = m;
    if (key === 'call') m.setCallRerender(rerender);
    return m;
  }).catch((e) => { delete pending[key]; throw e; }));
}
let all = null, allDone = false;
const loadAll = () => (all ||= Promise.all(Object.keys(LAZY).map(load)).then(() => { allDone = true; }).catch((e) => { all = null; throw e; }));
const lazy = (key, name) => ({ key, name });

const ROUTES = [
  [/^(accueil)?$/, home],
  [/^apercu$/, lazy('overview', 'overview')],
  [/^taches$/, lazy('tasks', 'tasksView')],
  [/^agenda$/, lazy('agenda', 'agenda')],
  [/^notes$/, lazy('notes', 'notesHome')],
  [/^note\/([\w-]+)$/, lazy('notes', 'noteView')],
  [/^quiz$/, lazy('quiz', 'quizHome')],
  [/^quiz\/note\/([\w-]+)$/, lazy('quiz', 'quizCards')],
  [/^quiz\/edit\/([\w-]+)$/, lazy('quiz', 'quizEdit')],
  [/^quiz\/([\w-]+)$/, lazy('quiz', 'quizPlay')],
  [/^scripts$/, lazy('scripts', 'library')],
  [/^scripts\/([\w-]+)$/, lazy('scripts', 'sectorPage')],
  [/^script\/([\w.-]+)$/, lazy('scripts', 'reader')],
  [/^appel$/, lazy('call', 'callView')],
  [/^crm$/, lazy('crm', 'crmView')],
  [/^crm\/personnaliser$/, lazy('crm', 'crmSettings')],
  [/^fiche\/([\w-]+)$/, lazy('crm', 'fiche')],
  [/^projets$/, lazy('projects', 'projectsView')],
  [/^projet\/([\w-]+)$/, lazy('projects', 'projectView')],
  [/^devis$/, lazy('quotes', 'quotesView')],
  [/^devis\/([\w-]+)$/, lazy('quotes', 'quoteView')],
  [/^notifications$/, notificationsView],
  [/^connecteurs$/, lazy('connect', 'connectorsView')],
  [/^confidentialite$/, lazy('privacy', 'privacyView')],
  [/^etudes$/, lazy('studies', 'studiesView')],
  [/^etudes\/emploi$/, lazy('studies', 'timetableView')],
  [/^etudes\/examens$/, lazy('studies', 'examsView')],
  [/^etudes\/moyennes$/, lazy('studies', 'gradesView')],
  [/^etudes\/revision$/, lazy('studies', 'revisionView')],
  [/^concentration$/, lazy('studies', 'focusView')],
  [/^tableaux$/, lazy('boards', 'boardsView')],
  [/^tableau\/([\w-]+)$/, lazy('boards', 'boardView')],
  [/^outils$/, lazy('tools', 'hub')],
  [/^outils\/devis$/, lazy('quotes', 'quotesView')],
  [/^outils\/messages$/, lazy('tools', 'messages')],
  [/^outils\/audit$/, lazy('tools', 'audit')],
  [/^outils\/import$/, lazy('tools', 'importView')],
  [/^outils\/entrainement$/, lazy('tools2', 'training')],
  [/^outils\/stats$/, lazy('tools2', 'stats')],
  [/^outils\/mes-scripts$/, lazy('tools2', 'myScripts')],
  [/^outils\/mes-scripts\/([\w-]+)$/, lazy('tools2', 'myScriptEdit')],
  [/^outils\/secteur\/([\w-]+)$/, lazy('tools2', 'sectorEdit')],
  [/^academie$/, lazy('pages', 'academy')],
  [/^academie\/([\w-]+)$/, lazy('pages', 'guide')],
  [/^abonnement$/, lazy('billing', 'plans')],
  [/^(reglages|compte)$/, lazy('pages', 'settings')],
  [/^plus$/, lazy('pages', 'more')],
  [/^bienvenue$/, onboarding],
  [/^connexion$/, loginView],
];

// ---------- Navigation : seulement les modules utilisés ----------
const noun = () => S().crm.noun || 'Clients';
const TAB_DEFS = [
  ['taches', 'Tâches', 'checkSquare', '#/taches', 'organiser'],
  ['etudes', 'Études', 'book', '#/etudes', 'etudes'],
  ['crm', noun, 'users', '#/crm', 'clients'],
  ['notes', 'Notes', 'page', '#/notes', 'organiser'],
  ['scripts', 'Scripts', 'script', '#/scripts', 'prospecter'],
  ['appel', 'Appeler', 'phone', '#/appel', 'prospecter'],
  ['quiz', 'Quiz', 'quiz', '#/quiz', 'apprendre'],
  ['academie', 'Académie', 'book', '#/academie', 'apprendre'],
];
const label = (l) => (typeof l === 'function' ? l() : l);
function tabs() {
  const mid = TAB_DEFS.filter((t) => on(t[4]) && !(t[0] === 'academie' && schoolOnly())).slice(0, 3);
  return [['accueil', 'Aujourd\'hui', 'home', '#/'], ...mid, ['plus', 'Plus', 'grid', '#/plus']];
}
// Menu latéral (1.10) : une dizaine d'entrées visibles au départ. Études et Entrepreneur sont des sections
// repliables (fermées par défaut, ouvertes quand on est sur l'un de leurs écrans) ; un module désactivé disparaît.
// Choix mémorisé s'il existe ; sinon la section s'ouvre quand on est sur l'un de ses écrans
const navOpen = (k, active) => { const o = S().prefs.navOpen || {}; return k in o ? !!o[k] : active; };
function side() {
  const cur = navFor(parseHash().path, parseHash().query);
  const sec = (key, title, href, items) => ({ key, title, href, items, open: navOpen(key, items.some((x) => x[0] === cur)) });
  return [
    { items: [['accueil', 'Aujourd\'hui', 'home', '#/'], ['apercu', 'Vue d\'ensemble', 'chart', '#/apercu'], ['taches', 'Tâches', 'checkSquare', '#/taches'], ['agenda', 'Calendrier', 'calendar', '#/agenda'], ['notes', 'Notes', 'page', '#/notes'], ['tableaux', 'Tableau blanc', 'compose', '#/tableaux'], ['projets', 'Projets', 'folder', '#/projets']] },
    on('etudes') && sec('etudes', 'Études', '#/etudes', [['emploi', 'Emploi du temps', 'calendar', '#/etudes/emploi'], ['examens', 'Examens', 'target', '#/etudes/examens'], ['moyennes', 'Moyennes', 'award', '#/etudes/moyennes'], ['revision', 'Révision espacée', 'cards', '#/etudes/revision'], ['concentration', 'Concentration', 'hourglass', '#/concentration'], ['quiz', 'Quiz', 'quiz', '#/quiz']]),
    on('entrepreneur') && sec('entrepreneur', 'Entrepreneur', '#/crm', [['crm', noun(), 'users', '#/crm'], ['devis', 'Devis', 'invoice', '#/devis'], ['scripts', 'Scripts', 'script', '#/scripts'], ['appel', 'Session d\'appels', 'headset', '#/appel'], ['stats', 'Statistiques', 'chart', '#/outils/stats'], ['outils', 'Outils', 'briefcase', '#/outils'], ['academie', 'Académie', 'book', '#/academie'], ...(on('etudes') ? [] : [['quiz', 'Quiz', 'quiz', '#/quiz']])]),
    { items: [['connecteurs', 'Connecteurs', 'plug', '#/connecteurs']] },
  ].filter(Boolean);
}
function navFor(path, q = {}) {
  const STUDY = { etudes: 'etudes', 'etudes/emploi': 'emploi', 'etudes/examens': 'examens', 'etudes/moyennes': 'moyennes', 'etudes/revision': 'revision', concentration: 'concentration' };
  if (STUDY[path]) return STUDY[path];
  if (path === 'connecteurs') return 'connecteurs';
  if (path.startsWith('tableau')) return 'tableaux';
  if (!path || path === 'accueil') return 'accueil';
  if (path === 'taches') return 'taches';
  if (path === 'agenda') return 'agenda';
  if (path === 'notes') return 'notes';
  if (path.startsWith('note/')) return `note:${path.slice(5)}`;
  if (path.startsWith('quiz')) return 'quiz';
  if (path.startsWith('crm') || path.startsWith('fiche')) return 'crm';
  if (path.startsWith('script')) return 'scripts';
  if (path === 'outils/devis' || path.startsWith('devis')) return 'devis';
  if (path.startsWith('projet')) return 'projets';
  if (path === 'outils/stats') return 'stats';
  if (path.startsWith('outils')) return 'outils';
  if (path.startsWith('academie')) return 'academie';
  if (['reglages', 'compte', 'abonnement'].includes(path)) return 'compte';
  return path.split('/')[0];
}

const root = document.getElementById('app');
root.innerHTML = `
  <a class="skip" href="#view" data-act="skip-main">Aller au contenu</a>
  <div class="offline-bar" role="status">${ic('globe')}<span>${tr('app.offline')}</span></div>
  <div class="shell">
    <aside class="side" aria-label="Navigation principale">
      <div class="side-head"><a class="side-brand" href="#/">${logoMark()}<span>Mind<b>View</b></span></a><a class="side-bell" data-nav="notifications" href="#/notifications" aria-label="Notifications">${ic('bell')}<b class="nav-badge" hidden></b></a></div>
      <div class="side-top"><button class="side-cta" data-act="create">${ic('plus')}<span>Nouveau</span></button><button class="side-search" data-act="search" aria-label="Rechercher (Ctrl K)">${ic('search')}<span>Rechercher</span><kbd>${/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'} K</kbd></button></div>
      <div class="side-groups"></div>
      <div class="side-foot"></div>
    </aside>
    <main class="main" id="view" tabindex="-1"></main>
    <button class="fab" data-act="create" aria-label="Créer : tâche, page, fiche">${ic('plus')}</button>
    <nav class="tabbar" aria-label="Navigation"></nav>
  </div>`;
const view = document.getElementById('view');
const sideGroups = root.querySelector('.side-groups');
const tabbar = root.querySelector('.tabbar');

function parseHash() {
  const raw = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [path, qs] = raw.split('?');
  return { path: path.replace(/\/$/, ''), query: Object.fromEntries(new URLSearchParams(qs || '')) };
}

let cleanup = null, lastPath = null, lastHash = null, lastDay = dayKey(), navSig = '';

function sideFoot() {
  const s = S(), p = s.profile, a = access(), st = billing();
  return `${['trial', 'trialing', 'trial_canceling'].includes(st) && !s.sub.demo ? `<a class="side-trial" href="#/abonnement"><span>${ic('hourglass')}${st === 'trial' ? 'Essai gratuit' : `Essai ${PLANS[s.sub.plan].name}`}</span><b>${trialLeft()} jour${trialLeft() > 1 ? 's' : ''} restant${trialLeft() > 1 ? 's' : ''}</b><i style="--p:${(trialLeft() / 7) * 100}%"></i></a>`
    : st === 'past_due' ? `<a class="side-trial is-warn" href="#/abonnement"><span>${ic('bell')}Paiement refusé</span><b>Régler pour garder ${PLANS[a].name}</b></a>`
      : a === 'free' && !s.sub.demo ? `<a class="side-trial" href="#/abonnement"><span>${ic('diamond')}${tr('ov.goPro')}</span><b>Notion, révision espacée, tableaux illimités · ${PLANS.pro.price.toFixed(2).replace('.', ',')} € par mois</b></a>` : ''}
    <a class="side-me" data-nav="compte" href="#/reglages">${avatar(p.prenom || 'M S')}<span><b>${esc(p.prenom || tr('app.account'))}</b><span>${esc(accessLabel())}</span></span>${ic('sliders', 'side-me-ic')}</a>
    ${authButton('side-auth')}`;
}
function drawNav() {
  const t = tabs();
  const sig = JSON.stringify([t.map((x) => [x[0], label(x[1])]), side(), sideFoot()]);
  if (sig === navSig) return;
  navSig = sig;
  tabbar.style.gridTemplateColumns = `repeat(${t.length}, 1fr)`;
  tabbar.innerHTML = t.map(([id, l, i, h]) => `<a class="tab" data-nav="${id}" href="${h}"><span class="tab-ic">${ic(i)}</span><span>${esc(label(l))}</span></a>`).join('');
  const links = (items) => items.map(([id, l, i, h]) => `<a class="side-i" data-nav="${id}" href="${h}">${ic(i)}<span>${esc(l)}</span></a>`).join('');
  sideGroups.innerHTML = side().map((g) => (g.key
    ? `<div class="side-sec ${g.open ? 'is-open' : ''}"><div class="side-sh"><a class="side-g" href="${g.href}">${esc(g.title)}</a><button class="side-tg" data-act="nav-toggle" data-g="${g.key}" aria-expanded="${g.open}" aria-controls="sg-${g.key}" aria-label="${g.open ? 'Replier' : 'Déplier'} ${esc(g.title)}">${ic('chevD')}</button></div>
      <nav class="side-nav" id="sg-${g.key}" aria-label="${esc(g.title)}" ${g.open ? '' : 'hidden'}>${links(g.items)}</nav></div>`
    : `<nav class="side-nav" aria-label="Navigation">${links(g.items)}</nav>`)).join('');
  const n = unreadCount();
  const bell = root.querySelector('.side-bell');
  bell.querySelector('.nav-badge').hidden = !n;
  bell.querySelector('.nav-badge').classList.toggle('is-info', !unreadUrgent());
  bell.querySelector('.nav-badge').textContent = n > 99 ? '99+' : n;
  bell.setAttribute('aria-label', n ? `Notifications : ${n} non lue${n > 1 ? 's' : ''}` : 'Notifications');
  root.querySelector('.side-foot').innerHTML = sideFoot();
}

// Entrée active du menu et de la barre d'onglets
function markNav(path, query) {
  const navId = navFor(path, query);
  const tabIds = tabs().map((t) => t[0]);
  const tabId = tabIds.includes(navId) ? navId : ['emploi', 'examens', 'moyennes', 'revision', 'concentration', 'quiz'].includes(navId) && tabIds.includes('etudes') ? 'etudes' : navId === 'agenda' && tabIds.includes('taches') ? 'taches' : navId.startsWith('note:') && tabIds.includes('notes') ? 'notes' : navId === 'accueil' ? 'accueil' : 'plus';
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const isOn = a.classList.contains('tab') ? a.dataset.nav === tabId : a.dataset.nav === navId || (navId.startsWith('note:') && a.dataset.nav === 'notes');
    a.classList.toggle('is-on', isOn);
    if (isOn) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}
// Replier / déplier une section du menu (mémorisé sur l'appareil)
register({
  // « Aller au contenu » (clavier) : le focus passe sur l'écran, sans changer d'adresse (le routeur lit le #)
  'skip-main': () => view.focus(),
  'nav-toggle': (b) => {
    const k = b.dataset.g, open = b.getAttribute('aria-expanded') !== 'true';
    update((s) => { s.prefs.navOpen = { ...(s.prefs.navOpen || {}), [k]: open }; }, { silent: true });
    navSig = ''; drawNav();
    const { path, query } = parseHash(); markNav(path, query);
    root.querySelector(`.side-tg[data-g="${k}"]`)?.focus();
  },
});

function render({ keepScroll = false } = {}) {
  const { path, query } = parseHash();
  // Un compte existe sur cet appareil et personne n'est connecté : écran de connexion d'abord
  if (needsLogin() && path !== 'connexion') { location.replace('#/connexion'); return; }
  if (path === 'connexion' && !needsLogin() && S().onboarded && loggedIn()) { location.replace('#/'); return; }
  if (!S().onboarded && !['bienvenue', 'connexion'].includes(path)) {
    // Lien partagé (défi de quiz…) ouvert par quelqu'un de nouveau : on y revient après l'accueil
    if (path) { try { sessionStorage.setItem('msdev:after-onb', location.hash); } catch (e) { /* rien */ } }
    location.replace('#/bienvenue'); return;
  }
  if (S().onboarded && path === 'bienvenue' && !isReplay()) { location.replace('#/'); return; }
  if (path === 'appel' && lastPath !== 'appel') mods.call?.resetCall();
  let v = null;
  for (const [re, f] of ROUTES) {
    const m = path.match(re);
    if (!m) continue;
    if (typeof f === 'function') v = f(m.slice(1), query);
    else if (mods[f.key]) v = mods[f.key][f.name](m.slice(1), query);
    else {
      // Premier passage sur cet écran : on le charge (fine barre en haut de l'écran), puis on l'affiche
      const wanted = location.hash;
      document.body.classList.add('is-loading');
      load(f.key).then(() => { document.body.classList.remove('is-loading'); if (location.hash === wanted) render({ keepScroll }); })
        .catch(() => { document.body.classList.remove('is-loading'); toast(tr('app.loadFail'), { title: 'Hors connexion', ms: 5000 }); });
      return;
    }
    break;
  }
  if (!v) { location.replace('#/'); return; }
  cleanup?.(); cleanup = null;
  const changed = location.hash !== lastHash;
  const y = window.scrollY;
  document.body.dataset.mode = v.full === true ? 'full' : v.full || '';
  document.body.dataset.fab = v.fab ? '1' : '';
  const fab = root.querySelector('.fab');
  fab.dataset.act = typeof v.fab === 'string' ? v.fab : 'create';
  if (query.l) fab.dataset.list = query.l; else delete fab.dataset.list;
  fab.setAttribute('aria-label', { 'task-new': 'Nouvelle tâche', 'prospect-new': 'Nouvelle fiche', 'page-templates': 'Nouvelle page', 'project-new': 'Nouveau projet', 'quote-new': 'Nouveau devis' }[fab.dataset.act] || 'Créer : tâche, projet, page, fiche');
  document.title = v.title === 'Aujourd\'hui' ? 'MindView' : `${v.title} · MindView`;
  view.innerHTML = v.html;
  view.classList.toggle('view-in', changed);
  if (changed) { void view.offsetWidth; view.classList.add('view-anim'); setTimeout(() => view.classList.remove('view-anim'), 600); }
  drawNav();
  markNav(path, query);
  if (v.after) cleanup = v.after(view) || null;
  if (changed && !keepScroll) { window.scrollTo(0, 0); if (lastHash !== null) view.focus({ preventScroll: true }); }
  else window.scrollTo(0, y);
  lastPath = path; lastHash = location.hash; lastDay = dayKey();
}

// Pendant la frappe dans une page de notes, on ne redessine pas l'écran (le curseur resterait perdu).
// … et pendant qu'on dessine sur un tableau blanc ou qu'on écrit dans un texte du dessin.
const editing = () => !!document.activeElement?.closest?.('.note, .bd-ed') || !!document.querySelector('.dw-edit');
let queued = false;
const rerender = () => { if (queued) return; queued = true; queueMicrotask(() => { queued = false; if (editing()) { drawNav(); return; } render({ keepScroll: true }); }); };
onChange(rerender);
window.addEventListener('ms:rerender', rerender);
window.addEventListener('hashchange', () => render());

// ---------- Événements délégués ----------
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || !el.dataset.act || el.disabled) return;
  const act = el.dataset.act;
  if (actions[act]) { e.preventDefault(); actions[act](el, e); return; }
  // Bouton d'un écran pas encore chargé : on charge tout, puis on lance l'action (ou on suit le lien)
  if (allDone) return;
  e.preventDefault();
  loadAll().then(() => { if (actions[act]) actions[act](el, e); else if (el.href) location.href = el.href; }).catch(() => toast(tr('app.loadFail'), { title: 'Hors connexion', ms: 5000 }));
});
// Même filet pour les formulaires et les changements (cases, fichiers) d'un écran pas encore chargé
const later = (fn) => (allDone ? null : loadAll().then(fn).catch(() => null));

document.addEventListener('submit', (e) => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  if (f.hasAttribute('data-validate') && !validateForm(f)) return;
  const data = Object.fromEntries(new FormData(f));
  if (forms[f.dataset.form]) forms[f.dataset.form](data, f, e);
  else later(() => forms[f.dataset.form]?.(data, f, e));
});
// Validation au fil de la saisie : message sous le champ quitté, bouton activé quand c'est possible
document.addEventListener('focusout', (e) => {
  const el = e.target;
  if (el.matches?.('form[data-validate] input, form[data-validate] textarea') && el.value) setFieldError(el, fieldError(el));
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-act-change]');
  if (el) { if (actions[el.dataset.actChange]) actions[el.dataset.actChange](el, e); else later(() => actions[el.dataset.actChange]?.(el, e)); return; }
  const f = e.target.closest('form[data-autosave]');
  if (f) forms[f.dataset.form]?.(Object.fromEntries(new FormData(f)), f, e);
  const d = e.target.closest('form[data-draft]');
  if (d) saveDraft(d);
});
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-act-input]');
  if (el) actions[el.dataset.actInput]?.(el, e);
  const vf = e.target.closest('form[data-validate]');
  if (vf) { refreshNeeds(vf); if (e.target.getAttribute('aria-invalid')) setFieldError(e.target, fieldError(e.target)); }
  const d = e.target.closest('form[data-draft]');
  if (d) saveDraft(d);

  const flt = e.target.closest('[data-filter]');
  if (flt) {
    const q = flt.value.trim().toLowerCase();
    const items = document.querySelectorAll(flt.dataset.filter);
    let any = false;
    items.forEach((it) => {
      it.dataset.hideQ = q && !(it.dataset.name || it.textContent.toLowerCase()).includes(q) ? '1' : '';
      const hide = !!(it.dataset.hideQ || it.dataset.hideG);
      (it.closest('li') && it.closest('.rows') ? it.closest('li') : it).hidden = hide;
      if (!hide) any = true;
    });
    document.querySelector('.filter-empty')?.toggleAttribute('hidden', any || !items.length);
  }
});
// Ctrl/⌘ K : recherche partout
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && S().onboarded) { e.preventDefault(); load('search').then((m) => m.searchSheet()); }
});

// ---------- Thème et animations ----------
const mqDark = matchMedia('(prefers-color-scheme: dark)');
function applyPrefs() {
  const p = S().prefs;
  const dark = p.theme === 'dark' || (p.theme === 'auto' && mqDark.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.motion = p.motion === 'reduce' ? 'reduce' : 'full';
  document.documentElement.dataset.text = p.textSize || 'm';
  try { localStorage.setItem('msdev:theme', p.theme); } catch (e) { /* rien */ }
  document.querySelectorAll('meta[name=theme-color]').forEach((m) => m.setAttribute('content', dark ? '#0A1325' : '#F5F1E9'));
}
onChange(applyPrefs);
mqDark.addEventListener?.('change', applyPrefs);
applyPrefs();

// ---------- Installation & mise à jour ----------
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.__installPrompt = e; });
window.addEventListener('appinstalled', () => toast('MindView est installée.'));
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  // Enregistré après le chargement : la mise en cache hors ligne ne ralentit pas le premier affichage
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state !== 'installed' || !navigator.serviceWorker.controller) return;
        // Juste après l'ouverture : mise à jour immédiate ; sinon, on propose.
        if (performance.now() < 10000) w.postMessage('skip');
        else toast('Une nouvelle version est prête.', { title: 'Mise à jour', action: 'Mettre à jour', onAction: () => w.postMessage('skip') });
      });
    });
  }).catch(() => {}));
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded && !editing()) { reloaded = true; location.reload(); } });
}

// ---------- Retour dans l'application ----------
// Abonnement à jour (renouvellement, fin d'essai), nouveau jour → écran Aujourd'hui recalculé.
let lastCloud = Date.now();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !S().onboarded) return;
  if (cloudUser()) { track('active_day'); if (Date.now() - lastCloud > 10 * 60e3) { lastCloud = Date.now(); refreshSubscription().catch(() => null); } }
  autoNotion();
  const billed = syncBilling();
  if (!billed && dayKey() !== lastDay && !editing()) render({ keepScroll: true });
});

// ---------- Retour d'un lien e-mail ou de Google (1.15) ----------
// Lu avant le premier affichage : l'adresse est nettoyée tout de suite (jetons retirés).
const authBack = takeAuthReturn();

// ---------- Écran d'ouverture ----------
// Accueil rejoué : demandé par ?accueil, ou réglage « Rejouer l'accueil à chaque ouverture ».
let seen = false;
try { seen = !!sessionStorage.getItem('msdev:intro'); } catch (e) { /* rien */ }
const replay = S().onboarded && (new URLSearchParams(location.search).has('accueil') || (S().prefs.replayIntro && !seen));
if (replay) { startOnboarding(true); history.replaceState(null, '', location.pathname + '#/bienvenue'); }
const splash = document.getElementById('splash');
syncBilling();
// Retour de la page de paiement Stripe (?checkout=ok ou ?checkout=annule) : l'abonnement est
// confirmé par le serveur (webhook) quelques secondes plus tard, on attend qu'il apparaisse.
const back = new URLSearchParams(location.search).get('checkout');
if (back) {
  history.replaceState(null, '', location.pathname + location.hash);
  if (back === 'ok') (async () => {
    for (let i = 0; i < 8; i++) {
      const row = await refreshSubscription().catch(() => null);
      if (row && ['active', 'trialing'].includes(row.status)) { toast(`Toutes les fonctions ${PLANS[row.plan]?.name || ''} sont ouvertes.`, { title: 'Paiement confirmé' }); return; }
      await new Promise((r) => setTimeout(r, 2000));
    }
    toast(tr('app.payPending'), { title: 'Presque fini', ms: 5000 });
  })();
  else setTimeout(() => toast('Paiement annulé : rien n\'a été prélevé.', { title: 'Abonnement' }), 600);
} else if (cloudUser()) refreshSubscription().catch(() => null);
if (cloudUser()) track('active_day');
onChange(() => checkActivation());
render();
if (authBack) {
  finishAuthReturn(authBack).then(async (r) => {
    await afterAuthReturn(r);
    if (r.type === 'recovery') { render(); newPasswordSheet(true); return; }
    if (!S().onboarded) { resumeAfterAuth(); location.hash = '#/bienvenue'; render(); return; }
    render();
    toast(r.type === 'signup' ? tr('acc.confirmed') : `Connecté avec ${esc(r.user.email)}.`, { title: r.type === 'signup' ? 'Adresse confirmée' : 'Bon retour' });
  }).catch((e) => toast(cloudMessage(e), { title: 'Lien de connexion', ms: 6000 }));
} else if (cloudUser()) startSync();
// Serveur factice : bien visible, pour ne jamais le confondre avec le vrai
if (cloudMock()) document.body.classList.add('is-cloud-mock');
// Notion : retour de connexion (?code=…&state=…) et synchro discrète, seulement si Notion est relié
if (new URLSearchParams(location.search).has('state')) load('notion').then((m) => m.handleNotionReturn());
function autoNotion() { if (S().notion?.connected) import('./notion/sync.js').then((m) => m.maybeAutoSync()).catch(() => null); }
autoNotion();
// Les autres écrans se chargent au premier geste (ou après 8 s), hors du chemin du premier affichage
const warm = () => { ['pointerdown', 'keydown', 'touchstart'].forEach((t) => removeEventListener(t, warm, true)); loadAll().catch(() => null); };
['pointerdown', 'keydown', 'touchstart'].forEach((t) => addEventListener(t, warm, { capture: true, passive: true }));
setTimeout(warm, 8000);
startReminders();
bootLock();

// ---------- Connexion réseau ----------
// Tout fonctionne hors ligne ; on le dit simplement quand la connexion tombe.
const net = () => document.body.classList.toggle('is-offline', !navigator.onLine);
net();
window.addEventListener('offline', () => { net(); toast(tr('app.offlineToast'), { title: 'Hors connexion', ms: 4000 }); });
window.addEventListener('online', () => { net(); toast('Connexion rétablie.', { ms: 1500 }); });
if (splash) {
  // Première ouverture : l'écran de bienvenue joue lui-même l'animation du logo.
  if (!S().onboarded || replay) splash.remove();
  else setTimeout(() => { splash.classList.add('out'); setTimeout(() => splash.remove(), 600); }, 900);
}
