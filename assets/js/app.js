// MindView — démarrage, coquille, routeur, navigation par modules, événements délégués.
import { S, onChange, access, billing, trialLeft, PLANS, on, schoolOnly, syncBilling, dayKey } from './store.js';
import { ic, logoMark } from './icons.js';
import { actions, forms, esc, toast, avatar, validateForm, fieldError, setFieldError, refreshNeeds, saveDraft } from './ui.js';
import { home } from './views/home.js';
import { library, sectorPage, reader } from './views/scripts.js';
import { callView, setCallRerender, resetCall } from './views/call.js';
import { crmView, fiche, crmSettings } from './views/crm.js';
import { agenda } from './views/agenda.js';
import { projectsView, projectView } from './views/projects.js';
import { quotesView, quoteView } from './views/quotes.js';
import { notificationsView, unreadCount } from './views/notifications.js';
import { connectorsView } from './views/connect.js';
import { privacyView } from './views/privacy.js';
import { studiesView, timetableView, examsView, gradesView, revisionView, focusView } from './views/studies.js';
import { tasksView } from './views/tasks.js';
import { notesHome, noteView } from './views/notes.js';
import { quizHome, quizPlay, quizCards, quizEdit } from './views/quiz.js';
import { searchSheet } from './views/search.js';
import { plans } from './views/billing.js';
import { overview } from './views/overview.js';
import { hub, messages, audit, importView } from './views/tools.js';
import { training, stats, myScripts, myScriptEdit, sectorEdit } from './views/tools2.js';
import { academy, guide, settings, more } from './views/pages.js';
import { onboarding, startOnboarding, isReplay } from './views/onboarding.js';
import { startReminders } from './notify.js';
import { bootLock } from './lock.js';
import { accessLabel } from './views/common.js';
import { cloudUser, refreshSubscription, checkActivation, track } from './cloud.js';

const ROUTES = [
  [/^(accueil)?$/, home],
  [/^apercu$/, overview],
  [/^taches$/, tasksView],
  [/^agenda$/, agenda],
  [/^notes$/, notesHome],
  [/^note\/([\w-]+)$/, noteView],
  [/^quiz$/, quizHome],
  [/^quiz\/note\/([\w-]+)$/, quizCards],
  [/^quiz\/edit\/([\w-]+)$/, quizEdit],
  [/^quiz\/([\w-]+)$/, quizPlay],
  [/^scripts$/, library],
  [/^scripts\/([\w-]+)$/, sectorPage],
  [/^script\/([\w.-]+)$/, reader],
  [/^appel$/, callView],
  [/^crm$/, crmView],
  [/^crm\/personnaliser$/, crmSettings],
  [/^fiche\/([\w-]+)$/, fiche],
  [/^projets$/, projectsView],
  [/^projet\/([\w-]+)$/, projectView],
  [/^devis$/, quotesView],
  [/^devis\/([\w-]+)$/, quoteView],
  [/^notifications$/, notificationsView],
  [/^connecteurs$/, connectorsView],
  [/^confidentialite$/, privacyView],
  [/^etudes$/, studiesView],
  [/^etudes\/emploi$/, timetableView],
  [/^etudes\/examens$/, examsView],
  [/^etudes\/moyennes$/, gradesView],
  [/^etudes\/revision$/, revisionView],
  [/^concentration$/, focusView],
  [/^outils$/, hub],
  [/^outils\/devis$/, quotesView],
  [/^outils\/messages$/, messages],
  [/^outils\/audit$/, audit],
  [/^outils\/import$/, importView],
  [/^outils\/entrainement$/, training],
  [/^outils\/stats$/, stats],
  [/^outils\/mes-scripts$/, myScripts],
  [/^outils\/mes-scripts\/([\w-]+)$/, myScriptEdit],
  [/^outils\/secteur\/([\w-]+)$/, sectorEdit],
  [/^academie$/, academy],
  [/^academie\/([\w-]+)$/, guide],
  [/^abonnement$/, plans],
  [/^(reglages|compte)$/, settings],
  [/^plus$/, more],
  [/^bienvenue$/, onboarding],
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
function side() {
  const s = S();
  const favs = s.pages.filter((p) => p.fav).slice(0, 5);
  return [
    [null, [['accueil', 'Aujourd\'hui', 'home', '#/'], ['apercu', 'Vue d\'ensemble', 'chart', '#/apercu'], ['notifications', 'Notifications', 'bell', '#/notifications', '', unreadCount()]]],
    on('organiser') ? ['S\'organiser', [['taches', 'Tâches', 'checkSquare', '#/taches'], ['projets', 'Projets', 'folder', '#/projets'], ['agenda', 'Calendrier', 'calendar', '#/agenda'], ['notes', 'Notes', 'page', '#/notes'], ['tableaux', 'Tableau blanc', 'compose', '#/tableaux'], ...favs.map((p) => [`note:${p.id}`, p.title || 'Sans titre', p.icon || 'page', `#/note/${p.id}`, 'sub'])]]
      : ['Projets', [['projets', 'Projets', 'folder', '#/projets']]],
    on('etudes') && ['Études', [['etudes', 'Mes études', 'book', '#/etudes'], ['emploi', 'Emploi du temps', 'calendar', '#/etudes/emploi'], ['examens', 'Examens', 'target', '#/etudes/examens'], ['moyennes', 'Moyennes', 'award', '#/etudes/moyennes'], ['revision', 'Révision espacée', 'cards', '#/etudes/revision'], ['concentration', 'Concentration', 'hourglass', '#/concentration']]],
    on('clients') && ['Clients', [['crm', noun(), 'users', '#/crm'], ['devis', 'Devis', 'invoice', '#/devis'], ['stats', 'Statistiques', 'chart', '#/outils/stats']]],
    on('prospecter') && ['Prospecter', [['scripts', 'Scripts', 'script', '#/scripts'], ['appel', 'Session d\'appels', 'headset', '#/appel'], ['outils', 'Outils', 'briefcase', '#/outils']]],
    on('apprendre') && ['Progresser', [['quiz', 'Quiz', 'quiz', '#/quiz'], ...(schoolOnly() ? [] : [['academie', 'Académie', 'book', '#/academie']])]],
    ['Connecteurs', [['connecteurs', 'Tous les connecteurs', 'plug', '#/connecteurs'], ['cx-notion', 'Notion', 'page', '#/connecteurs?c=notion'], ['cx-figma', 'Figma', 'compose', '#/connecteurs?c=figma'], ['cx-canva', 'Canva', 'layers', '#/connecteurs?c=canva'], ['cx-google', 'Google', 'globe', '#/connecteurs?c=google'], ['cx-agenda', 'Agendas', 'calendar', '#/connecteurs?c=agenda']]],
  ].filter(Boolean);
}
function navFor(path, q = {}) {
  const STUDY = { etudes: 'etudes', 'etudes/emploi': 'emploi', 'etudes/examens': 'examens', 'etudes/moyennes': 'moyennes', 'etudes/revision': 'revision', concentration: 'concentration' };
  if (STUDY[path]) return STUDY[path];
  if (path === 'connecteurs') return q.c ? `cx-${q.c}` : 'connecteurs';
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
  <a class="skip" href="#view">Aller au contenu</a>
  <div class="offline-bar" role="status">${ic('globe')}<span>Hors connexion — tout continue de fonctionner, vos données sont sur cet appareil.</span></div>
  <div class="shell">
    <aside class="side" aria-label="Navigation principale">
      <a class="side-brand" href="#/">${logoMark()}<span>Mind<b>View</b></span></a>
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
  return `${st === 'trial' && !s.sub.demo ? `<a class="side-trial" href="#/abonnement"><span>${ic('hourglass')}Essai gratuit</span><b>${trialLeft()} jour${trialLeft() > 1 ? 's' : ''} restant${trialLeft() > 1 ? 's' : ''}</b><i style="--p:${(trialLeft() / 7) * 100}%"></i></a>`
    : st === 'past_due' ? `<a class="side-trial is-warn" href="#/abonnement"><span>${ic('bell')}Paiement refusé</span><b>Régler pour garder ${PLANS[a].name}</b></a>`
      : a === 'free' && !s.sub.demo ? `<a class="side-trial" href="#/abonnement"><span>${ic('diamond')}Passez à Pro</span><b>CRM, pages illimitées, ${PLANS.pro.price.toFixed(2).replace('.', ',')} €/mois</b></a>` : ''}
    <a class="side-me" data-nav="compte" href="#/reglages">${avatar(p.prenom || 'M S')}<span><b>${esc(p.prenom || 'Votre compte')}</b><span>${esc(accessLabel())}</span></span>${ic('sliders', 'side-me-ic')}</a>`;
}
function drawNav() {
  const t = tabs();
  const sig = JSON.stringify([t.map((x) => [x[0], label(x[1])]), side(), sideFoot()]);
  if (sig === navSig) return;
  navSig = sig;
  tabbar.style.gridTemplateColumns = `repeat(${t.length}, 1fr)`;
  tabbar.innerHTML = t.map(([id, l, i, h]) => `<a class="tab" data-nav="${id}" href="${h}"><span class="tab-ic">${ic(i)}</span><span>${esc(label(l))}</span></a>`).join('');
  sideGroups.innerHTML = side().map(([g, items]) => `${g ? `<p class="side-g">${esc(g)}</p>` : ''}<nav class="side-nav" aria-label="${esc(g || 'Accueil')}">${items.map(([id, l, i, h, sub, badge]) => `<a class="side-i ${sub ? 'side-sub-i' : ''}" data-nav="${id}" href="${h}">${ic(i)}<span>${esc(l)}</span>${badge ? `<b class="nav-badge" aria-label="${badge} non lue${badge > 1 ? 's' : ''}">${badge > 99 ? '99+' : badge}</b>` : ''}</a>`).join('')}</nav>`).join('');
  root.querySelector('.side-foot').innerHTML = sideFoot();
}

function render({ keepScroll = false } = {}) {
  const { path, query } = parseHash();
  if (!S().onboarded && path !== 'bienvenue') { location.replace('#/bienvenue'); return; }
  if (S().onboarded && path === 'bienvenue' && !isReplay()) { location.replace('#/'); return; }
  if (path === 'appel' && lastPath !== 'appel') resetCall();
  let v = null;
  for (const [re, f] of ROUTES) { const m = path.match(re); if (m) { v = f(m.slice(1), query); break; } }
  if (!v) { location.replace('#/'); return; }
  cleanup?.(); cleanup = null;
  const changed = location.hash !== lastHash;
  const y = window.scrollY;
  document.body.dataset.mode = v.full ? 'full' : '';
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
  const navId = navFor(path, query);
  const tabIds = tabs().map((t) => t[0]);
  const tabId = tabIds.includes(navId) ? navId : ['emploi', 'examens', 'moyennes', 'revision', 'concentration'].includes(navId) && tabIds.includes('etudes') ? 'etudes' : navId === 'agenda' && tabIds.includes('taches') ? 'taches' : navId.startsWith('note:') && tabIds.includes('notes') ? 'notes' : navId === 'accueil' ? 'accueil' : 'plus';
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const isOn = a.classList.contains('tab') ? a.dataset.nav === tabId : a.dataset.nav === navId || (navId.startsWith('note:') && a.dataset.nav === 'notes' && !document.querySelector(`.side [data-nav="${navId}"]`));
    a.classList.toggle('is-on', isOn);
    if (isOn) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  if (v.after) cleanup = v.after(view) || null;
  if (changed && !keepScroll) { window.scrollTo(0, 0); if (lastHash !== null) view.focus({ preventScroll: true }); }
  else window.scrollTo(0, y);
  lastPath = path; lastHash = location.hash; lastDay = dayKey();
}

// Pendant la frappe dans une page de notes, on ne redessine pas l'écran (le curseur resterait perdu).
const editing = () => !!document.activeElement?.closest?.('.note');
let queued = false;
const rerender = () => { if (queued) return; queued = true; queueMicrotask(() => { queued = false; if (editing()) { drawNav(); return; } render({ keepScroll: true }); }); };
setCallRerender(rerender);
onChange(rerender);
window.addEventListener('ms:rerender', rerender);
window.addEventListener('hashchange', () => render());

// ---------- Événements délégués ----------
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (el && el.dataset.act && actions[el.dataset.act] && !el.disabled) { e.preventDefault(); actions[el.dataset.act](el, e); }
});

document.addEventListener('submit', (e) => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  if (f.hasAttribute('data-validate') && !validateForm(f)) return;
  forms[f.dataset.form]?.(Object.fromEntries(new FormData(f)), f, e);
});
// Validation au fil de la saisie : message sous le champ quitté, bouton activé quand c'est possible
document.addEventListener('focusout', (e) => {
  const el = e.target;
  if (el.matches?.('form[data-validate] input, form[data-validate] textarea') && el.value) setFieldError(el, fieldError(el));
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-act-change]');
  if (el) { actions[el.dataset.actChange]?.(el, e); return; }
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
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && S().onboarded) { e.preventDefault(); searchSheet(); }
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
  navigator.serviceWorker.register('sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state !== 'installed' || !navigator.serviceWorker.controller) return;
        // Juste après l'ouverture : mise à jour immédiate ; sinon, on propose.
        if (performance.now() < 10000) w.postMessage('skip');
        else toast('Une nouvelle version est prête.', { title: 'Mise à jour', action: 'Mettre à jour', onAction: () => w.postMessage('skip') });
      });
    });
  }).catch(() => {});
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded && !editing()) { reloaded = true; location.reload(); } });
}

// ---------- Retour dans l'application ----------
// Abonnement à jour (renouvellement, fin d'essai), nouveau jour → écran Aujourd'hui recalculé.
let lastCloud = Date.now();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !S().onboarded) return;
  if (cloudUser()) { track('active_day'); if (Date.now() - lastCloud > 10 * 60e3) { lastCloud = Date.now(); refreshSubscription().catch(() => null); } }
  const billed = syncBilling();
  if (!billed && dayKey() !== lastDay && !editing()) render({ keepScroll: true });
});

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
    toast('Le paiement est en cours de confirmation : revenez sur Abonnement dans un instant.', { title: 'Presque fini', ms: 5000 });
  })();
  else setTimeout(() => toast('Paiement annulé : rien n\'a été prélevé.', { title: 'Abonnement' }), 600);
} else if (cloudUser()) refreshSubscription().catch(() => null);
if (cloudUser()) track('active_day');
onChange(() => checkActivation());
render();
startReminders();
bootLock();

// ---------- Connexion réseau ----------
// Tout fonctionne hors ligne ; on le dit simplement quand la connexion tombe.
const net = () => document.body.classList.toggle('is-offline', !navigator.onLine);
net();
window.addEventListener('offline', () => { net(); toast('Tout continue de fonctionner : vos données sont enregistrées sur cet appareil.', { title: 'Hors connexion', ms: 4000 }); });
window.addEventListener('online', () => { net(); toast('Connexion rétablie.', { ms: 1500 }); });
if (splash) {
  // Première ouverture : l'écran de bienvenue joue lui-même l'animation du logo.
  if (!S().onboarded || replay) splash.remove();
  else setTimeout(() => { splash.classList.add('out'); setTimeout(() => splash.remove(), 600); }, 900);
}
