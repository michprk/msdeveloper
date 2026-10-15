// Accueil de première ouverture, dans l'esprit des écrans de bienvenue d'Apple.
// Trois écrans : la promesse et un exemple ; le strict nécessaire (prénom, ce que vous voulez
// faire, votre métier) ; l'essai. Le reste se règle plus tard, au moment où c'est utile.
// Rejouable par le propriétaire (Compte → Présentation) sans toucher aux données.
import { S, update, PLANS, TRIAL_DAYS, MODULES, MODULE_IDS } from '../store.js';
import { ic, esc, register, toast, sheet, sheetHead, closeSheet, cap } from '../ui.js';
import { logoMark } from '../icons.js';
import { SERVICES, SERVICE_IDS } from '../data/scripts.js';
import { PRESETS, preset } from '../data/presets.js';
import { flower, cluster } from './flowers.js';
import { askNotifications, notifSupport } from '../notify.js';
import { PROMISE, PITCH, AUDIENCE, BENEFITS, EXAMPLE } from './common.js';
import { applyPreset } from './crm.js';

const STEPS = ['welcome', 'profile', 'trial'];
const ob = { i: 0, dir: 1, anim: true, replay: false, d: null };
const price = (n) => n.toFixed(2).replace('.', ',');

function data() {
  if (!ob.d) {
    const p = S().profile;
    ob.d = { prenom: p.prenom || '', societe: p.societe || '', usages: [...(p.usages || ['organiser', 'clients'])], metier: p.metier || S().crm.preset || '', service: p.service || 'offre' };
    if (!S().onboarded && !p.prenom) ob.d.usages = ['organiser', 'clients'];
  }
  return ob.d;
}
export function startOnboarding(replay = false) { ob.i = 0; ob.dir = 1; ob.anim = true; ob.replay = replay; ob.d = null; }
export const isReplay = () => ob.replay;

// Écran de verrouillage iPhone avec des notifications au format iOS (réutilisé pour activer les rappels).
export function iphone(prenom) {
  const notes = [
    ['Dans 10 minutes', 'Rappeler Garage du Vieux Moulin — la fiche est prête.', 'maintenant'],
    ['Rendez-vous confirmé', 'Maison Lemaire, jeudi à 14 h 30.', 'il y a 2 min'],
    ['Journée terminée', `Toutes vos tâches sont cochées. Bravo${prenom ? ' ' + esc(cap(prenom)) : ''} !`, 'il y a 1 h'],
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
        <p class="ob-ex"><span>Par exemple</span>${EXAMPLE}</p>
      </div>
      <div class="ob-foot">
        <button class="ob-privacy" data-act="ob-privacy"><span class="ob-privacy-ic">${ic('lock')}</span><span>Vos données restent sur votre appareil. <u>En savoir plus…</u></span></button>
        <button class="btn btn-apple" data-act="ob-next">Commencer</button>
      </div>`;
  } else if (step === 'profile') {
    const pro = d.usages.includes('prospecter');
    body = `<form class="ob-page" data-form="ob-profile" id="ob-form" data-validate novalidate>
        <h1 class="ob-h">Faisons connaissance</h1>
        <p class="ob-p">L'application s'adapte à ce que vous faites. Tout se change plus tard.</p>
        <div class="group">
          <label class="group-r"><span>Prénom</span><input name="prenom" value="${esc(d.prenom)}" placeholder="Obligatoire" autocomplete="given-name" required></label>
          <label class="group-r"><span>Société</span><input name="societe" value="${esc(d.societe)}" placeholder="Facultatif" autocomplete="organization"></label>
        </div>
        <p class="group-k">Ce que vous voulez faire</p>
        <div class="group" role="group" aria-label="Ce que vous voulez faire">${MODULE_IDS.map((m) => `<label class="group-r is-pick is-multi"><input type="checkbox" name="u_${m}" ${d.usages.includes(m) ? 'checked' : ''} data-act-change="ob-usage"><span class="group-ic f-${MODULES[m].tone}">${ic(MODULES[m].icon)}</span><span class="group-t"><b>${MODULES[m].label}</b><em>${MODULES[m].desc}</em></span>${ic('check', 'group-ck')}</label>`).join('')}</div>
        <p class="group-k">Votre métier</p>
        <div class="group"><label class="group-r"><span>Métier</span><select name="metier" aria-label="Votre métier"><option value="">Je choisirai plus tard</option>${PRESETS.map((x) => `<option value="${x.id}" ${d.metier === x.id ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select></label></div>
        <div class="ob-svc" ${pro ? '' : 'hidden'}>
          <p class="group-k">Ce que vous vendez</p>
          <div class="group" role="radiogroup" aria-label="Ce que vous vendez">${['offre', ...SERVICE_IDS.filter((x) => x !== 'offre')].map((x) => `<label class="group-r is-pick"><input type="radio" name="service" value="${x}" ${d.service === x ? 'checked' : ''}><span class="group-ic f-${x === 'offre' ? 'navy' : x === 'site' ? 'blue' : x === 'auto' ? 'olive' : 'sky'}">${ic(SERVICES[x].icon)}</span><span>${x === 'offre' ? 'Mes propres services' : SERVICES[x].label}</span>${ic('check', 'group-ck')}</label>`).join('')}</div>
          <p class="group-foot">« Mes propres services » : vous décrirez votre offre en trois phrases, et les 230 scripts correspondants se rempliront avec.</p>
        </div>
        <p class="group-foot ob-need" hidden>Choisissez au moins une chose à faire.</p>
      </form>
      <div class="ob-foot"><button class="btn btn-apple" type="submit" form="ob-form" data-needs="prenom" ${d.prenom ? '' : 'disabled'}>Continuer</button></div>`;
  } else {
    body = `<div class="ob-page">
        <div class="ob-trial-fl" aria-hidden="true">${flower(1, 'tf-a')}${flower(3, 'tf-b')}</div>
        <h1 class="ob-h">${d.prenom ? `${esc(cap(d.prenom))}, essayez` : 'Essayez'} tout pendant ${TRIAL_DAYS} jours</h1>
        <ol class="trial-tl">
          <li><span class="tt-ic f-blue">${ic('lock')}</span><div><b>Aujourd'hui</b><p>Tout est ouvert : CRM, pages illimitées, vos quiz, les scripts, le mode appel et tous les outils.</p></div></li>
          <li><span class="tt-ic f-sky">${ic('bell')}</span><div><b>Pendant l'essai</b><p>Le nombre de jours restants reste affiché. Aucune carte n'est demandée.</p></div></li>
          <li><span class="tt-ic f-olive">${ic('diamond')}</span><div><b>Jour ${TRIAL_DAYS}</b><p>Vous choisissez Pro à ${price(PLANS.pro.price)} € ou Premium à ${price(PLANS.premium.price)} € par mois, ou vous gardez la version gratuite : tâches, agenda, 10 pages et quiz. Vos données restent.</p></div></li>
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
  const first = !S().onboarded;
  update((s) => {
    s.profile.prenom = d.prenom.trim(); s.profile.societe = d.societe.trim();
    s.profile.usages = d.usages.length ? d.usages : ['organiser'];
    s.profile.metier = d.metier || '';
    s.profile.service = d.service || 'offre';
    if (trial && !s.sub.trialStart) s.sub.trialStart = Date.now();
    s.onboarded = true;
  });
  // Modèle de CRM du métier choisi, si le CRM est encore vierge
  if (d.metier && preset(d.metier) && (first || !S().crm.preset) && !S().prospects.length) applyPreset(d.metier);
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
      <h2 class="ob-h">Ne ratez plus rien</h2>
      <p class="ob-p">Une notification dix minutes avant chaque tâche à heure fixe, chaque rendez-vous et chaque relance.</p>
      ${sup.ok ? '<button class="btn btn-apple" data-act="notif-yes">Activer les notifications</button>' : `<p class="field-h">${sup.hint}</p>`}
      <button class="btn-text" data-act="close-sheet">Plus tard</button>
    </div>`, { cls: 'sheet-sm' });
}

register({
  'ob-next': () => go(1),
  'ob-back': () => {
    const f = document.getElementById('ob-form');
    if (f) { const d = data(); d.prenom = f.elements.prenom.value; d.societe = f.elements.societe.value; d.metier = f.elements.metier.value; }
    go(-1);
  },
  'ob-quit': () => { ob.replay = false; ob.d = null; ob.i = 0; try { sessionStorage.setItem('msdev:intro', '1'); } catch (e) { /* rien */ } location.hash = '#/'; },
  'ob-finish': (b) => finish(b.dataset.trial === '1'),
  'ob-usage': (el) => {
    const f = el.closest('form');
    const d = data();
    d.usages = MODULE_IDS.filter((m) => f.elements[`u_${m}`].checked);
    f.querySelector('.ob-svc').hidden = !d.usages.includes('prospecter');
    f.querySelector('.ob-need').hidden = d.usages.length > 0;
  },
  'notif-yes': async () => {
    const r = await askNotifications();
    closeSheet();
    if (r === 'granted') toast('Une notification arrivera avant chaque tâche à heure fixe.', { title: 'Notifications activées' });
    else toast('Les rappels s\'afficheront dans l\'application. Vous pourrez autoriser les notifications plus tard dans le compte.', { title: 'Notifications non autorisées', ms: 4000 });
    rr();
  },
  'notif-ask-sheet': () => notifSheet(),
  'ob-privacy': () => sheet(`${sheetHead('Vos données')}<div class="sheet-body article">
    <p>Vos tâches, vos pages, vos fiches et vos réglages sont enregistrés <b>uniquement sur cet appareil</b>. Rien n'est envoyé à un serveur, et M&amp;S Design n'y a pas accès.</p>
    <p>Vous pouvez à tout moment télécharger une sauvegarde, la restaurer sur un autre appareil, ou tout supprimer depuis votre compte.</p>
    <p>Quand vous appelez quelqu'un depuis une fiche, c'est votre téléphone qui compose : l'application ne passe pas d'appel elle-même.</p></div>`, { cls: 'sheet-sm' }),
}, {
  'ob-profile': (f, form) => {
    const d = data();
    d.prenom = (f.prenom || '').trim(); d.societe = (f.societe || '').trim(); d.metier = f.metier || '';
    d.usages = MODULE_IDS.filter((m) => f[`u_${m}`] === 'on');
    d.service = f.service || (d.metier === 'agence' ? 'site' : 'offre');
    if (!d.prenom) return;
    if (!d.usages.length) { form.querySelector('.ob-need').hidden = false; return; }
    if (d.usages.includes('prospecter') && !d.usages.includes('clients')) d.usages.push('clients');
    go(1);
  },
});
export { PITCH };
