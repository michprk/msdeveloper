// Éléments partagés entre les écrans.
import { S, can, need, PLANS, access, billing, trialActive, trialLeft, TRIAL_DAYS, update } from '../store.js';
import { ic, esc, register, toast, closeSheet, dateLong } from '../ui.js';
import { flower } from './flowers.js';

// Positionnement : une phrase, un public, trois bénéfices, un exemple. Repris partout.
export const PROMISE = 'Vos tâches, vos notes et vos clients, au même endroit.';
export const PITCH = 'L\'application d\'organisation des indépendants : votre journée sur un écran, un CRM qui parle votre métier, des notes en pages, et des quiz pour progresser.';
export const AUDIENCE = 'Pour les indépendants et les petites équipes : freelances, commerçants, artisans, consultants, agences.';
export const BENEFITS = [
  ['checkSquare', 'blue', 'Une journée claire', 'Les tâches du jour, les rendez-vous et les relances sur un seul écran. On écrit « Rappeler Marc demain 14h », la date se règle toute seule.'],
  ['users', 'olive', 'Des clients bien suivis', 'Un CRM qui s\'adapte à votre métier : vos étapes, vos champs, votre équipe, et une relance datée pour chaque fiche.'],
  ['page', 'navy', 'Tout ce que vous savez, rangé', 'Des pages et sous-pages comme dans un carnet, des modèles, et des quiz pour retenir l\'essentiel.'],
];
export const EXAMPLE = 'Un matin type : vous ouvrez l\'application, vous voyez vos trois tâches du jour et le client à relancer, vous ouvrez le compte rendu de votre dernier rendez-vous, et vous cochez au fil de la journée.';
export const WHY_ONE = 'Une tâche peut pointer vers un client, une page de notes vers sa fiche, et le résultat d\'un appel crée la relance tout seul : rien à recopier d\'un outil à l\'autre.';

export function pageHead(title, { kicker = '', actions = '', back = '' } = {}) {
  return `<header class="ph">
    ${back ? `<a class="ph-back" href="${back}" data-back>${ic('chevL')}<span>Retour</span></a>` : ''}
    ${kicker ? `<p class="ph-k">${kicker}</p>` : ''}
    <div class="ph-row"><div class="ph-txt"><h1 class="ph-t">${title}</h1></div>${actions ? `<div class="ph-a">${actions}</div>` : ''}</div>
  </header>`;
}

const FEATURE_TEXT = {
  crm: ['Le CRM est inclus dans Pro', 'Vos fiches clients, un pipeline à vos étapes, l\'historique des échanges et une relance datée pour chacun.'],
  notesUnlimited: ['Pages illimitées avec Pro', 'La version gratuite garde dix pages. Avec Pro, créez autant de pages et de sous-pages que vous voulez.'],
  myQuiz: ['Vos propres quiz avec Pro', 'Créez des quiz sur votre métier, vos tarifs ou vos procédures, pour vous entraîner ou former votre équipe.'],
  scriptsAll: ['Tous les formats sont inclus dans Pro', 'Répondeur, visite, e-mail, SMS, Instagram, relances, rendez-vous, objections et signature — pour chaque secteur.'],
  callMode: ['Le mode appel est inclus dans Pro', 'Le script s\'affiche étape par étape pendant l\'appel, et le résultat s\'enregistre dans la fiche en un geste.'],
  projects: ['Le suivi de projets est inclus dans Pro', 'Chaque client signé devient un projet, avec ses étapes et son délai.'],
  academy: ['L\'Académie complète est incluse dans Pro', 'Tous les guides pratiques : organisation, rendez-vous, voix, prix, relances, horaires par secteur…'],
  messages: ['Le générateur de messages est inclus dans Pro', 'Des e-mails et SMS prêts à envoyer, remplis avec la fiche.'],
  audit: ['L\'audit express est inclus dans Pro', 'Une note sur 10 de la présence en ligne d\'une entreprise, et les points à aborder.'],
  import: ['L\'import est inclus dans Pro', 'Collez une liste depuis un tableur : elle devient des fiches prêtes à suivre.'],
  quote: ['Les devis sont inclus dans Premium', 'Un devis propre, calculé et imprimable en PDF en deux minutes.'],
  myScripts: ['Les scripts sur mesure sont inclus dans Premium', 'Écrivez vos propres scripts et créez vos secteurs : l\'application génère tous les formats.'],
  training: ['L\'entraînement est inclus dans Premium', 'Des objections tirées au hasard pour répondre du tac au tac.'],
  stats: ['Les statistiques sont incluses dans Premium', 'Vos vrais taux, étape par étape, et vos objectifs du mois.'],
  export: ['L\'export est inclus dans Premium', 'Exportez vos fiches en CSV pour un tableur ou un comptable.'],
};

export function paywall(feature, { compact = false } = {}) {
  const [t, p] = FEATURE_TEXT[feature] || ['Fonction réservée aux abonnés', ''];
  const plan = PLANS[need(feature)];
  const trialUsed = !!S().sub.trialStart;
  return `<section class="paywall ${compact ? 'is-compact' : ''}">${flower(1, 'pw-fl a')}${flower(3, 'pw-fl b')}
    <span class="paywall-ic">${ic('lock')}</span>
    <h2>${t}</h2>
    <p>${p}</p>
    <div class="paywall-a">
      ${trialUsed ? '' : `<button class="btn btn-primary" data-act="start-trial">Essayer gratuitement ${TRIAL_DAYS} jours</button>`}
      <a class="btn ${trialUsed ? 'btn-primary' : 'btn-ghost'}" href="#/abonnement">${trialUsed ? `Passer à ${plan.name}` : 'Voir les formules'}</a>
    </div>
    <p class="paywall-n">${plan.name} : ${plan.price.toFixed(2).replace('.', ',')} € par mois, sans engagement${trialUsed ? '' : ' · sans carte pour l\'essai'}</p>
  </section>`;
}

export const gate = (feature, html, opts) => (can(feature) ? html : paywall(feature, opts));

// Bandeau d'état de l'abonnement (accueil et écrans principaux)
export function trialStrip() {
  const s = S();
  if (s.sub.demo) return '';
  const st = billing();
  if (st === 'trial') {
    const n = trialLeft();
    return `<a class="strip" href="#/abonnement">${ic('hourglass')}<span>Essai gratuit : <b>${n} jour${n > 1 ? 's' : ''}</b> restant${n > 1 ? 's' : ''}</span><span class="strip-a">Formules ${ic('chevR')}</span></a>`;
  }
  if (st === 'past_due') return `<a class="strip is-end" href="#/abonnement">${ic('bell')}<span>Paiement refusé : vous gardez l'accès jusqu'au ${dateLong(s.sub.graceEnd).toLowerCase()}.</span><span class="strip-a">Régler ${ic('chevR')}</span></a>`;
  if (st === 'trial_ended' && !s.prefs.hideTrialEnd) return `<a class="strip is-end" href="#/abonnement">${ic('lock')}<span>Votre essai est terminé — vos données sont conservées.</span><span class="strip-a">S'abonner ${ic('chevR')}</span></a>`;
  return '';
}

register({
  'start-trial': () => {
    if (S().sub.trialStart) return;
    update((s) => { s.sub.trialStart = Date.now(); });
    closeSheet();
    toast(`${TRIAL_DAYS} jours, toutes les fonctions, sans carte.`, { title: 'Essai gratuit activé' });
  },
  'close-sheet': () => closeSheet(),
});

export const accessLabel = () => {
  const a = access(), st = billing(), s = S().sub;
  if (s.demo) return `${PLANS[a].name} (démonstration)`;
  if (st === 'trial') return `Essai gratuit — ${trialLeft()} j restants`;
  if (st === 'canceling') return `${PLANS[a].name} jusqu'au ${dateLong(s.periodEnd).toLowerCase()}`;
  if (st === 'past_due') return `${PLANS[a].name} — paiement à régler`;
  return PLANS[a].name;
};

export const sectorTile = (sec, href, extra = '') => `<a class="sec-tile" href="${href}"><span class="sec-ic">${ic(sec.icon)}</span><span class="sec-n">${esc(sec.name)}</span>${extra}</a>`;
