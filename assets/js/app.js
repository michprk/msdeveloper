// M&S Developer — démarrage, coquille, routeur, événements délégués.
import { S, onChange, access, trialActive, trialLeft, PLANS } from './store.js';
import { ic, logoMark } from './icons.js';
import { actions, forms, esc, toast, planBadge, avatar } from './ui.js';
import { home } from './views/home.js';
import { library, sectorPage, reader } from './views/scripts.js';
import { callView, setCallRerender, resetCall } from './views/call.js';
import { crmView, fiche } from './views/crm.js';
import { agenda, projects } from './views/agenda.js';
import { hub, devis, messages, audit, importView, quoteLive } from './views/tools.js';
import { training, stats, myScripts, myScriptEdit, sectorEdit } from './views/tools2.js';
import { academy, guide, plans, settings, more } from './views/pages.js';
import { onboarding, startOnboarding, isReplay } from './views/onboarding.js';
import { startReminders } from './notify.js';
import { accessLabel } from './views/common.js';

const ROUTES = [
  [/^(accueil)?$/, home],
  [/^scripts$/, library],
  [/^scripts\/([\w-]+)$/, sectorPage],
  [/^script\/([\w.-]+)$/, reader],
  [/^appel$/, callView],
  [/^crm$/, crmView],
  [/^fiche\/([\w-]+)$/, fiche],
  [/^agenda$/, agenda],
  [/^projets$/, projects],
  [/^outils$/, hub],
  [/^outils\/devis$/, devis],
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
  [/^reglages$/, settings],
  [/^plus$/, more],
  [/^bienvenue$/, onboarding],
];

const TABS = [
  ['accueil', 'Accueil', 'home', '#/'],
  ['scripts', 'Scripts', 'script', '#/scripts'],
  ['crm', 'CRM', 'crm', '#/crm'],
  ['agenda', 'Agenda', 'calendar', '#/agenda'],
  ['plus', 'Plus', 'grid', '#/plus'],
];
const SIDE = [
  ['accueil', 'Accueil', 'home', '#/'],
  ['scripts', 'Scripts', 'script', '#/scripts'],
  ['appel', 'Session d\'appels', 'headset', '#/appel'],
  ['crm', 'CRM', 'crm', '#/crm'],
  ['agenda', 'Agenda', 'calendar', '#/agenda'],
  ['projets', 'Projets', 'folder', '#/projets'],
  ['outils', 'Outils', 'briefcase', '#/outils'],
  ['academie', 'Académie', 'book', '#/academie'],
];

const root = document.getElementById('app');
root.innerHTML = `
  <a class="skip" href="#view">Aller au contenu</a>
  <div class="shell">
    <aside class="side" aria-label="Navigation principale">
      <a class="side-brand" href="#/">${logoMark()}<span><b>M&amp;S</b> Developer</span></a>
      <nav class="side-nav">${SIDE.map(([id, l, i, h]) => `<a class="side-i" data-nav="${id}" href="${h}">${ic(i)}<span>${l}</span></a>`).join('')}</nav>
      <div class="side-sub">
        <a class="side-i" data-nav="abonnement" href="#/abonnement">${ic('diamond')}<span>Abonnement</span></a>
        <a class="side-i" data-nav="reglages" href="#/reglages">${ic('sliders')}<span>Réglages</span></a>
      </div>
      <div class="side-foot"></div>
    </aside>
    <main class="main" id="view" tabindex="-1"></main>
    <nav class="tabbar" aria-label="Navigation">${TABS.map(([id, l, i, h]) => `<a class="tab" data-nav="${id}" href="${h}">${ic(i)}<span>${l}</span></a>`).join('')}</nav>
  </div>`;
const view = document.getElementById('view');

function parseHash() {
  const raw = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [path, qs] = raw.split('?');
  return { path: path.replace(/\/$/, ''), query: Object.fromEntries(new URLSearchParams(qs || '')) };
}

let cleanup = null, lastPath = null, lastHash = null;

function sideFoot() {
  const s = S(), p = s.profile, a = access();
  const trial = s.sub.plan === 'free' && !s.sub.demo && trialActive();
  return `${trial ? `<a class="side-trial" href="#/abonnement"><span>${ic('hourglass')}Essai gratuit</span><b>${trialLeft()} jour${trialLeft() > 1 ? 's' : ''} restant${trialLeft() > 1 ? 's' : ''}</b><i style="--p:${(trialLeft() / 7) * 100}%"></i></a>`
    : a === 'free' ? `<a class="side-trial" href="#/abonnement"><span>${ic('diamond')}Passez à Pro</span><b>CRM, mode appel, ${PLANS.pro.price.toFixed(2).replace('.', ',')} €/mois</b></a>` : ''}
    <a class="side-me" href="#/reglages">${avatar(p.prenom || 'M S')}<span><b>${esc(p.prenom || 'Votre profil')}</b><span>${esc(accessLabel())}</span></span></a>`;
}

function render({ keepScroll = false } = {}) {
  const { path, query } = parseHash();
  if (!S().onboarded && path !== 'bienvenue') { location.replace('#/bienvenue'); return; }
  if (S().onboarded && path === 'bienvenue' && !isReplay()) { location.replace('#/'); return; }
  if (path === 'appel' && lastPath !== 'appel') resetCall();
  let v = null, fn = null;
  for (const [re, f] of ROUTES) { const m = path.match(re); if (m) { fn = f; v = f(m.slice(1), query); break; } }
  if (!v) { location.replace('#/'); return; }
  cleanup?.(); cleanup = null;
  const changed = location.hash !== lastHash;
  const y = window.scrollY;
  document.body.dataset.mode = v.full ? 'full' : '';
  document.title = v.title === 'Accueil' ? 'M&S Developer' : `${v.title} · M&S Developer`;
  view.innerHTML = v.html;
  view.classList.toggle('view-in', changed);
  if (changed) { void view.offsetWidth; view.classList.add('view-anim'); setTimeout(() => view.classList.remove('view-anim'), 600); }
  const navId = v.tab === 'plus' ? (['outils', 'academie', 'projets', 'abonnement', 'reglages'].find((x) => path.startsWith(x)) || 'plus') : path === 'appel' ? 'appel' : v.tab;
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const on = a.dataset.nav === navId || (a.classList.contains('tab') && a.dataset.nav === v.tab);
    a.classList.toggle('is-on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  document.querySelector('.side-foot').innerHTML = sideFoot();
  if (v.after) cleanup = v.after(view) || null;
  if (changed && !keepScroll) { window.scrollTo(0, 0); if (lastHash !== null) view.focus({ preventScroll: true }); }
  else window.scrollTo(0, y);
  lastPath = path; lastHash = location.hash;
}

let queued = false;
const rerender = () => { if (queued) return; queued = true; queueMicrotask(() => { queued = false; render({ keepScroll: true }); }); };
setCallRerender(rerender);
onChange(rerender);
window.addEventListener('ms:rerender', rerender);
window.addEventListener('hashchange', () => render());

// ---------- Événements délégués ----------
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (el && el.dataset.act && actions[el.dataset.act] && !el.disabled) { e.preventDefault(); actions[el.dataset.act](el, e); return; }
});

document.addEventListener('submit', (e) => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  forms[f.dataset.form]?.(Object.fromEntries(new FormData(f)), f, e);
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-act-change]');
  if (el) { actions[el.dataset.actChange]?.(el, e); return; }
  const f = e.target.closest('form[data-autosave]');
  if (f) forms[f.dataset.form]?.(Object.fromEntries(new FormData(f)), f, e);
});
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-act-input]');
  if (el) actions[el.dataset.actInput]?.(el, e);
  const live = e.target.closest('form[data-live]');
  if (live && live.dataset.form === 'quote-meta') quoteLive(live);
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

// ---------- Thème et animations ----------
const mqDark = matchMedia('(prefers-color-scheme: dark)');
function applyPrefs() {
  const p = S().prefs;
  const dark = p.theme === 'dark' || (p.theme === 'auto' && mqDark.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.motion = p.motion === 'reduce' ? 'reduce' : 'full';
  try { localStorage.setItem('msdev:theme', p.theme); } catch (e) { /* rien */ }
  document.querySelectorAll('meta[name=theme-color]').forEach((m) => m.setAttribute('content', dark ? '#0A1325' : '#F5F1E9'));
}
onChange(applyPrefs);
mqDark.addEventListener?.('change', applyPrefs);
applyPrefs();

// ---------- Installation & mise à jour ----------
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.__installPrompt = e; });
window.addEventListener('appinstalled', () => toast('M&S Developer est installée.'));
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
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
}

// ---------- Écran d'ouverture ----------
// Accueil rejoué : demandé par ?accueil, ou réglage « Rejouer l'accueil à chaque ouverture ».
let seen = false;
try { seen = !!sessionStorage.getItem('msdev:intro'); } catch (e) { /* rien */ }
const replay = S().onboarded && (new URLSearchParams(location.search).has('accueil') || (S().prefs.replayIntro && !seen));
if (replay) { startOnboarding(true); history.replaceState(null, '', location.pathname + '#/bienvenue'); }
const splash = document.getElementById('splash');
render();
startReminders();
if (splash) {
  // Première ouverture : l'écran de bienvenue joue lui-même l'animation du logo.
  if (!S().onboarded || replay) splash.remove();
  else setTimeout(() => { splash.classList.add('out'); setTimeout(() => splash.remove(), 600); }, 900);
}
