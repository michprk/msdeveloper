// Accueil de première ouverture, dans l'esprit des écrans de bienvenue d'Apple.
// Trois écrans : la promesse, le strict nécessaire (prénom, société, ce que vous vendez), l'essai.
// Le reste (secteurs, notifications, niveau) se règle plus tard, au moment où c'est utile.
// Rejouable par le propriétaire (Réglages → Présentation) sans toucher aux données.
import { S, update, PLANS, TRIAL_DAYS } from '../store.js';
import { ic, esc, register, toast, sheet, sheetHead, closeSheet, cap } from '../ui.js';
import { logoMark } from '../icons.js';
import { SERVICES, SERVICE_IDS, scriptCount } from '../data/scripts.js';
import { flower, cluster } from './flowers.js';
import { askNotifications, notifSupport } from '../notify.js';
import { PROMISE, PITCH, AUDIENCE, BENEFITS } from './common.js';

const STEPS = ['welcome', 'profile', 'trial'];
const ob = { i: 0, dir: 1, anim: true, replay: false, d: null };
const price = (n) => n.toFixed(2).replace('.', ',');

function data() {
  if (!ob.d) {
    const p = S().profile;
    ob.d = { prenom: p.prenom || '', societe: p.societe || '', ville: p.ville || 'Bruxelles', service: p.service || 'site' };
  }
  return ob.d;
}
export function startOnboarding(replay = false) { ob.i = 0; ob.dir = 1; ob.anim = true; ob.replay = replay; ob.d = null; }
export const isReplay = () => ob.replay;

// Écran de verrouillage iPhone avec des notifications au format iOS (réutilisé pour activer les rappels).
export function iphone(prenom) {
  const notes = [
    ['Rappel dans 15 min', 'Rappeler Garage du Vieux Moulin — le script est prêt.', 'maintenant'],
    ['Rendez-vous confirmé', 'Maison Lemaire, jeudi à 14 h 30.', 'il y a 2 min'],
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
  let body = '';

  if (step === 'welcome') {
    body = `<div class="ob-page ob-welcome-p">
        <div class="ob-mark">${cluster('ob-cl')}${logoMark('xl draw')}</div>
        <h1 class="ob-name"><span>M&amp;S</span> Developer</h1>
        <p class="ob-promise">${PROMISE}</p>
        <p class="ob-p ob-aud">${AUDIENCE}</p>
        <ul class="feat">${BENEFITS.map(([i, c, t, p], k) => `<li style="--k:${k}"><span class="feat-ic f-${c}">${ic(i)}</span><div><b>${t}</b><p>${p}</p></div></li>`).join('')}</ul>
      </div>
      <div class="ob-foot">
        <button class="ob-privacy" data-act="ob-privacy"><span class="ob-privacy-ic">${ic('lock')}</span><span>Vos données restent sur votre appareil. <u>En savoir plus…</u></span></button>
        <button class="btn btn-apple" data-act="ob-next">Commencer</button>
      </div>`;
  } else if (step === 'profile') {
    body = `<form class="ob-page" data-form="ob-profile" id="ob-form" data-validate novalidate>
        <h1 class="ob-h">Faisons connaissance</h1>
        <p class="ob-p">Trois informations, et vos scripts sont prêts à l'emploi.</p>
        <div class="group">
          <label class="group-r"><span>Prénom</span><input name="prenom" value="${esc(d.prenom)}" placeholder="Obligatoire" autocomplete="given-name" required></label>
          <label class="group-r"><span>Société</span><input name="societe" value="${esc(d.societe)}" placeholder="Facultatif" autocomplete="organization"></label>
          <label class="group-r"><span>Ville</span><input name="ville" value="${esc(d.ville)}" placeholder="Bruxelles" autocomplete="address-level2"></label>
        </div>
        <p class="group-k">Ce que vous vendez surtout</p>
        <div class="group" role="radiogroup" aria-label="Ce que vous vendez surtout">${SERVICE_IDS.map((x) => `<label class="group-r is-pick"><input type="radio" name="service" value="${x}" ${d.service === x ? 'checked' : ''}><span class="group-ic f-${x === 'site' ? 'blue' : x === 'auto' ? 'olive' : 'sky'}">${ic(SERVICES[x].icon)}</span><span>${SERVICES[x].label}</span>${ic('check', 'group-ck')}</label>`).join('')}</div>
        <p class="group-foot">Vos secteurs, votre objectif d'appels et les rappels se règlent ensuite, quand vous en avez besoin.</p>
      </form>
      <div class="ob-foot"><button class="btn btn-apple" type="submit" form="ob-form" data-needs="prenom" ${d.prenom ? '' : 'disabled'}>Continuer</button></div>`;
  } else {
    body = `<div class="ob-page">
        <div class="ob-trial-fl" aria-hidden="true">${flower(1, 'tf-a')}${flower(3, 'tf-b')}</div>
        <h1 class="ob-h">${d.prenom ? `${esc(cap(d.prenom))}, essayez` : 'Essayez'} tout pendant ${TRIAL_DAYS} jours</h1>
        <ol class="trial-tl">
          <li><span class="tt-ic f-blue">${ic('lock')}</span><div><b>Aujourd'hui</b><p>Accès complet : prospects, mode appel, les ${scriptCount()} scripts et tous les outils.</p></div></li>
          <li><span class="tt-ic f-sky">${ic('bell')}</span><div><b>Jour 5</b><p>Un rappel dans l'application avant la fin de l'essai.</p></div></li>
          <li><span class="tt-ic f-olive">${ic('diamond')}</span><div><b>Jour ${TRIAL_DAYS}</b><p>Vous choisissez Pro à ${price(PLANS.pro.price)} € ou Premium à ${price(PLANS.premium.price)} € par mois, ou vous continuez avec la version gratuite. Vos données restent.</p></div></li>
        </ol>
      </div>
      <div class="ob-foot">
        <button class="btn btn-apple" data-act="ob-finish" data-trial="1">${S().sub.trialStart && !ob.replay ? 'Ouvrir l\'application' : 'Commencer l\'essai gratuit'}</button>
        <button class="btn-text" data-act="ob-finish" data-trial="0">Continuer avec la version gratuite</button>
        <p class="ob-small">Paiement en ligne pas encore ouvert : aucune carte demandée, aucun prélèvement.</p>
      </div>`;
  }

  const html = `<div class="ob ob-${step}">
    <header class="ob-top">${ob.i > 0 ? `<button class="btn-text ob-back" data-act="ob-back">${ic('chevL')}<span>Retour</span></button>` : '<span></span>'}
      <span class="ob-dots" aria-label="Étape ${ob.i + 1} sur ${STEPS.length}">${STEPS.map((x, k) => `<i class="${k === ob.i ? 'on' : ''}"></i>`).join('')}</span>
      ${ob.replay ? '<button class="btn-text" data-act="ob-quit">Fermer</button>' : '<span></span>'}</header>
    <div class="ob-in ${ob.anim ? (ob.dir > 0 ? 'from-r' : 'from-l') : ''}" data-step="${step}">${body}</div>
  </div>`;
  return { title: 'Bienvenue', full: true, html };
}

const rr = () => window.dispatchEvent(new Event('ms:rerender'));
const go = (delta) => { ob.dir = delta; ob.anim = true; ob.i = Math.max(0, Math.min(STEPS.length - 1, ob.i + delta)); rr(); window.scrollTo(0, 0); };

function finish(trial) {
  const d = data();
  update((s) => {
    s.profile.prenom = d.prenom.trim(); s.profile.societe = d.societe.trim(); s.profile.ville = d.ville.trim() || 'Bruxelles';
    s.profile.service = d.service;
    if (trial && !s.sub.trialStart) s.sub.trialStart = Date.now();
    s.onboarded = true;
  });
  const wasReplay = ob.replay;
  ob.replay = false; ob.d = null; ob.i = 0;
  try { sessionStorage.setItem('msdev:intro', '1'); } catch (e) { /* rien */ }
  location.hash = '#/';
  if (trial && !wasReplay) setTimeout(() => toast(`Toutes les fonctions sont ouvertes pendant ${TRIAL_DAYS} jours.`, { title: 'Essai gratuit activé' }), 450);
}

// Demande d'autorisation au bon moment (agenda, première relance) plutôt qu'à l'accueil.
export function notifSheet() {
  const sup = notifSupport();
  sheet(`<div class="sheet-body ob-center notif-sheet">
      ${iphone(S().profile.prenom)}
      <h2 class="ob-h">Ne ratez plus aucune relance</h2>
      <p class="ob-p">Une notification avant chaque rappel et chaque rendez-vous, avec le script prêt à l'emploi.</p>
      ${sup.ok ? '<button class="btn btn-apple" data-act="notif-yes">Activer les notifications</button>' : `<p class="field-h">${sup.hint}</p>`}
      <button class="btn-text" data-act="close-sheet">Plus tard</button>
    </div>`, { cls: 'sheet-sm' });
}

register({
  'ob-next': () => go(1),
  'ob-back': () => go(-1),
  'ob-quit': () => { ob.replay = false; ob.d = null; ob.i = 0; try { sessionStorage.setItem('msdev:intro', '1'); } catch (e) { /* rien */ } location.hash = '#/'; },
  'ob-finish': (b) => finish(b.dataset.trial === '1'),
  'notif-yes': async () => {
    const r = await askNotifications();
    closeSheet();
    if (r === 'granted') toast('Une notification arrivera avant chaque rappel.', { title: 'Notifications activées' });
    else toast('Les rappels s\'afficheront dans l\'application. Vous pourrez autoriser les notifications plus tard dans les réglages.', { title: 'Notifications non autorisées', ms: 4000 });
    rr();
  },
  'notif-ask-sheet': () => notifSheet(),
  'ob-privacy': () => sheet(`${sheetHead('Vos données')}<div class="sheet-body article">
    <p>Vos fiches, vos appels, vos notes et vos réglages sont enregistrés <b>uniquement sur cet appareil</b>. Rien n'est envoyé à un serveur, et M&amp;S Design n'y a pas accès.</p>
    <p>Vous pouvez à tout moment télécharger une sauvegarde, la restaurer sur un autre appareil, ou tout supprimer depuis votre compte.</p>
    <p>Quand vous appelez un prospect, c'est votre téléphone qui compose : l'application ne passe pas d'appel elle-même.</p></div>`, { cls: 'sheet-sm' }),
}, {
  'ob-profile': (f) => { const d = data(); d.prenom = (f.prenom || '').trim(); d.societe = (f.societe || '').trim(); d.ville = (f.ville || '').trim(); d.service = f.service || 'site'; if (!d.prenom) return; go(1); },
});
export { PITCH };
