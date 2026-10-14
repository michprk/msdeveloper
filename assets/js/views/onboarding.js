// Accueil de première ouverture, dans l'esprit des écrans de bienvenue d'Apple.
// Rejouable par le propriétaire (Réglages → Présentation) sans toucher aux données.
import { S, update, PLANS, TRIAL_DAYS } from '../store.js';
import { ic, esc, register, toast, sheet, sheetHead, cap } from '../ui.js';
import { logoMark } from '../icons.js';
import { SERVICES, SERVICE_IDS, scriptCount, allSectors } from '../data/scripts.js';
import { demoData } from '../data/demo.js';
import { flower, cluster } from './flowers.js';
import { askNotifications, notifSupport } from '../notify.js';

const STEPS = ['welcome', 'features', 'notifs', 'profile', 'offer', 'sectors', 'trial'];
const ob = { i: 0, dir: 1, anim: true, replay: false, d: null };
const price = (n) => n.toFixed(2).replace('.', ',');

function data() {
  if (!ob.d) {
    const p = S().profile;
    ob.d = { prenom: p.prenom || '', societe: p.societe || '', ville: p.ville || 'Bruxelles', service: p.service || 'site', niveau: p.niveau || 'debut', appels: S().goals.appelsJour || 40, secteurs: [...(p.secteurs || [])], demo: !S().prospects.some((x) => x.demo) };
  }
  return ob.d;
}
export function startOnboarding(replay = false) { ob.i = 0; ob.dir = 1; ob.anim = true; ob.replay = replay; ob.d = null; }
export const isReplay = () => ob.replay;

const NIVEAUX = [['debut', 'Je débute', 'Les scripts et l\'Académie vous guident pas à pas.'], ['regulier', 'J\'ai déjà prospecté', 'Vous voulez de la méthode et gagner du temps.'], ['expert', 'C\'est mon quotidien', 'Vous voulez un CRM rapide et des statistiques.']];

const FEATURES = () => [
  ['script', 'blue', `${scriptCount()} scripts prêts`, 'Pour 23 secteurs et vos trois services, du premier appel jusqu\'à la signature.'],
  ['headset', 'olive', 'Le mode appel', 'Le script étape par étape pendant l\'appel, et les objections à portée de doigt.'],
  ['crm', 'navy', 'Votre CRM', 'Pipeline, fiches clients, historique : vous savez toujours qui rappeler.'],
  ['bell', 'sky', 'Des rappels au bon moment', 'Une notification avant chaque rappel, rendez-vous ou relance.'],
];

function iphone(prenom) {
  const notes = [
    ['Rappel dans 15 min', 'Rappeler Garage du Vieux Moulin — le script est prêt.', 'maintenant'],
    ['Rendez-vous confirmé', 'Maison Lemaire, jeudi à 14 h 30. SMS de confirmation envoyé.', 'il y a 2 min'],
    ['Objectif atteint', `40 appels aujourd'hui. Bravo${prenom ? ' ' + esc(cap(prenom)) : ''} !`, 'il y a 1 h'],
  ];
  return `<div class="phone" aria-hidden="true">
    <div class="phone-screen">
      <span class="phone-island"></span>
      ${flower(2, 'ph-fl a')}${flower(4, 'ph-fl b')}
      <p class="phone-date">${cap(new Intl.DateTimeFormat('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()))}</p>
      <p class="phone-time">9:41</p>
      <div class="phone-notes">${notes.map(([t, b, w], k) => `<div class="inote" style="--k:${k}">
        <span class="inote-ic">${logoMark('sm')}</span>
        <div class="inote-b"><p class="inote-h"><span>M&amp;S Developer</span><span>${w}</span></p><p class="inote-t">${t}</p><p>${b}</p></div></div>`).join('')}</div>
    </div>
  </div>`;
}

export function onboarding() {
  const d = data();
  const step = STEPS[ob.i];
  const skippable = ['notifs', 'sectors'].includes(step);
  let body = '';

  if (step === 'welcome') {
    body = `<div class="ob-hero">
        <div class="ob-mark">${cluster('ob-cl')}${logoMark('xl draw')}</div>
        <h1 class="ob-name">Bienvenue dans<br><span>M&amp;S</span> Developer</h1>
        <p class="ob-tag">Les scripts, le CRM et la méthode pour décrocher des clients — dans votre poche.</p>
      </div>
      <div class="ob-foot"><button class="btn btn-apple" data-act="ob-next">Continuer</button><p class="ob-small">Par M&amp;S Design, studio web à Bruxelles</p></div>`;
  } else if (step === 'features') {
    body = `<div class="ob-page">
        <h1 class="ob-h">Tout pour décrocher<br>des clients</h1>
        <ul class="feat">${FEATURES().map(([i, c, t, p], k) => `<li style="--k:${k}"><span class="feat-ic f-${c}">${ic(i)}</span><div><b>${t}</b><p>${p}</p></div></li>`).join('')}</ul>
      </div>
      <div class="ob-foot">
        <button class="ob-privacy" data-act="ob-privacy"><span class="ob-privacy-ic">${ic('users')}</span><span>Vos données restent sur votre appareil. <u>Voir comment elles sont gérées…</u></span></button>
        <button class="btn btn-apple" data-act="ob-next">Continuer</button>
      </div>`;
  } else if (step === 'notifs') {
    body = `<div class="ob-page ob-center">
        ${iphone(d.prenom)}
        <h1 class="ob-h">Ne ratez plus<br>aucune relance</h1>
        <p class="ob-p">M&amp;S Developer vous prévient avant chaque rappel, chaque rendez-vous et chaque relance — avec le bon script, prêt à l'emploi.</p>
      </div>
      <div class="ob-foot"><button class="btn btn-apple" data-act="ob-notifs">Activer les notifications</button><button class="btn-text" data-act="ob-next">Plus tard</button></div>`;
  } else if (step === 'profile') {
    body = `<form class="ob-page" data-form="ob-profile" id="ob-form">
        <span class="ob-badge f-olive">${ic('user')}</span>
        <h1 class="ob-h">Faisons connaissance</h1>
        <p class="ob-p">Ces informations remplissent vos scripts, vos messages et vos devis.</p>
        <div class="group">
          <label class="group-r"><span>Prénom</span><input name="prenom" value="${esc(d.prenom)}" placeholder="Obligatoire" autocomplete="given-name" required></label>
          <label class="group-r"><span>Société</span><input name="societe" value="${esc(d.societe)}" placeholder="M&amp;S Design" autocomplete="organization"></label>
          <label class="group-r"><span>Ville</span><input name="ville" value="${esc(d.ville)}" placeholder="Bruxelles" autocomplete="address-level2"></label>
        </div>
        <p class="group-foot">Modifiable à tout moment dans les réglages.</p>
      </form>
      <div class="ob-foot"><button class="btn btn-apple" type="submit" form="ob-form">Continuer</button></div>`;
  } else if (step === 'offer') {
    body = `<div class="ob-page">
        <h1 class="ob-h">Votre activité</h1>
        <p class="group-k">Ce que vous vendez surtout</p>
        <div class="group">${SERVICE_IDS.map((x) => `<button class="group-r is-pick" data-act="ob-pick" data-k="service" data-v="${x}" aria-pressed="${d.service === x}"><span class="group-ic f-${x === 'site' ? 'blue' : x === 'auto' ? 'olive' : 'sky'}">${ic(SERVICES[x].icon)}</span><span>${SERVICES[x].label}</span>${d.service === x ? ic('check', 'group-ck') : ''}</button>`).join('')}</div>
        <p class="group-k">Votre expérience</p>
        <div class="group">${NIVEAUX.map(([v, l, p]) => `<button class="group-r is-pick two-l" data-act="ob-pick" data-k="niveau" data-v="${v}" aria-pressed="${d.niveau === v}"><span><b>${l}</b><em>${p}</em></span>${d.niveau === v ? ic('check', 'group-ck') : ''}</button>`).join('')}</div>
        <p class="group-k">Objectif d'appels par jour</p>
        <div class="ios-seg">${[20, 40, 60, 80].map((n) => `<button class="${d.appels === n ? 'is-on' : ''}" data-act="ob-pick" data-k="appels" data-v="${n}">${n}</button>`).join('')}</div>
      </div>
      <div class="ob-foot"><button class="btn btn-apple" data-act="ob-next">Continuer</button></div>`;
  } else if (step === 'sectors') {
    const secs = allSectors().filter((x) => x.id !== 'toute');
    body = `<div class="ob-page">
        <h1 class="ob-h">Vos secteurs</h1>
        <p class="ob-p">Choisissez les métiers que vous prospectez : ils apparaîtront en premier.</p>
        <div class="pick-grid">${secs.map((x) => { const on = d.secteurs.includes(x.id); return `<button class="pk ${on ? 'is-on' : ''}" data-act="ob-sector" data-id="${x.id}" aria-pressed="${on}"><span class="pk-ic">${ic(x.icon)}</span><span class="pk-n">${esc(x.name)}</span><span class="pk-ck">${on ? ic('check') : ''}</span></button>`; }).join('')}</div>
      </div>
      <div class="ob-foot"><button class="btn btn-apple" data-act="ob-next">${d.secteurs.length ? `Continuer avec ${d.secteurs.length} secteur${d.secteurs.length > 1 ? 's' : ''}` : 'Continuer'}</button></div>`;
  } else {
    body = `<div class="ob-page">
        <div class="ob-trial-fl" aria-hidden="true">${flower(1, 'tf-a')}${flower(3, 'tf-b')}</div>
        <h1 class="ob-h">${d.prenom ? `${esc(cap(d.prenom))}, essayez` : 'Essayez'} gratuitement pendant ${TRIAL_DAYS} jours</h1>
        <ol class="trial-tl">
          <li><span class="tt-ic f-blue">${ic('lock')}</span><div><b>Aujourd'hui</b><p>Accès complet : CRM, mode appel, les ${scriptCount()} scripts et tous les outils.</p></div></li>
          <li><span class="tt-ic f-sky">${ic('bell')}</span><div><b>Jour 5</b><p>Un rappel avant la fin de votre essai.</p></div></li>
          <li><span class="tt-ic f-olive">${ic('diamond')}</span><div><b>Jour ${TRIAL_DAYS}</b><p>Vous choisissez Pro à ${price(PLANS.pro.price)} € ou Premium à ${price(PLANS.premium.price)} € par mois — ou vous continuez gratuitement.</p></div></li>
        </ol>
        <label class="ios-row"><span>Ajouter des entreprises d'exemple</span><input type="checkbox" class="switch" ${d.demo ? 'checked' : ''} data-act-change="ob-demo"></label>
      </div>
      <div class="ob-foot">
        <button class="btn btn-apple" data-act="ob-finish" data-trial="1">${S().sub.trialStart && !ob.replay ? 'Ouvrir l\'application' : 'Commencer l\'essai gratuit'}</button>
        <button class="btn-text" data-act="ob-finish" data-trial="0">Continuer avec la version Découverte</button>
        <p class="ob-small">Sans carte bancaire. Aucun prélèvement.</p>
      </div>`;
  }

  const html = `<div class="ob ob-${step}">
    <header class="ob-top">${ob.i > 0 ? `<button class="btn-text ob-back" data-act="ob-back">${ic('chevL')}<span>Retour</span></button>` : '<span></span>'}
      <span class="ob-dots" aria-hidden="true">${STEPS.slice(1).map((x, k) => `<i class="${k + 1 === ob.i ? 'on' : ''}"></i>`).join('')}</span>
      ${skippable ? '<button class="btn-text" data-act="ob-next">Passer</button>' : ob.replay ? '<button class="btn-text" data-act="ob-quit">Fermer</button>' : '<span></span>'}</header>
    <div class="ob-in ${ob.anim ? (ob.dir > 0 ? 'from-r' : 'from-l') : ''}" data-step="${step}">${body}</div>
  </div>`;
  return { title: 'Bienvenue', full: true, html };
}

const rr = () => window.dispatchEvent(new Event('ms:rerender'));
const still = () => { ob.anim = false; rr(); };
const go = (delta) => { ob.dir = delta; ob.anim = true; ob.i = Math.max(0, Math.min(STEPS.length - 1, ob.i + delta)); rr(); window.scrollTo(0, 0); };

function finish(trial) {
  const d = data();
  update((s) => {
    s.profile.prenom = d.prenom.trim(); s.profile.societe = d.societe.trim(); s.profile.ville = d.ville.trim() || 'Bruxelles';
    s.profile.service = d.service; s.profile.niveau = d.niveau; s.profile.secteurs = d.secteurs; s.goals.appelsJour = Number(d.appels) || 40;
    if (trial && !s.sub.trialStart) s.sub.trialStart = Date.now();
    if (d.demo && !s.prospects.some((x) => x.demo)) { const x = demoData(); s.prospects.push(...x.prospects); s.activities.push(...x.activities); s.tasks.push(...x.tasks); s.projects.push(...x.projects); }
    s.onboarded = true;
  });
  const wasReplay = ob.replay;
  ob.replay = false; ob.d = null; ob.i = 0;
  try { sessionStorage.setItem('msdev:intro', '1'); } catch (e) { /* rien */ }
  location.hash = '#/';
  if (trial && !wasReplay) setTimeout(() => toast(`Toutes les fonctions sont ouvertes pendant ${TRIAL_DAYS} jours.`, { title: 'Essai gratuit activé' }), 450);
}

register({
  'ob-next': () => go(1),
  'ob-back': () => go(-1),
  'ob-quit': () => { ob.replay = false; ob.d = null; ob.i = 0; try { sessionStorage.setItem('msdev:intro', '1'); } catch (e) { /* rien */ } location.hash = '#/'; },
  'ob-pick': (b) => { const d = data(); d[b.dataset.k] = b.dataset.k === 'appels' ? Number(b.dataset.v) : b.dataset.v; still(); },
  'ob-sector': (b) => { const d = data(); const id = b.dataset.id; d.secteurs = d.secteurs.includes(id) ? d.secteurs.filter((x) => x !== id) : [...d.secteurs, id]; still(); },
  'ob-demo': (el) => { data().demo = el.checked; },
  'ob-finish': (b) => finish(b.dataset.trial === '1'),
  'ob-notifs': async () => {
    const r = await askNotifications();
    if (r === 'granted') toast('Une notification arrivera avant chaque rappel.', { title: 'Notifications activées' });
    else if (r === 'unsupported') toast(notifSupport().hint, { title: 'Notifications' });
    go(1);
  },
  'ob-privacy': () => sheet(`${sheetHead('Vos données')}<div class="sheet-body article">
    <p>Vos fiches, vos appels, vos notes et vos réglages sont enregistrés <b>uniquement sur cet appareil</b>. Rien n'est envoyé à un serveur.</p>
    <p>Vous pouvez à tout moment télécharger une sauvegarde, la restaurer sur un autre appareil, ou tout effacer depuis les réglages.</p>
    <p>Les numéros de vos prospects ne sont jamais partagés. Quand vous appelez, c'est votre téléphone qui compose.</p></div>`, { cls: 'sheet-sm' }),
}, {
  'ob-profile': (f) => { const d = data(); d.prenom = (f.prenom || '').trim(); d.societe = f.societe || ''; d.ville = f.ville || ''; if (!d.prenom) return; go(1); },
});
