// Éléments partagés entre les écrans.
import { S, can, need, PLANS, access, billing, trialActive, trialLeft, TRIAL_DAYS, update } from '../store.js';
import { ic, esc, register, toast, closeSheet, dateLong } from '../ui.js';
import { flower } from './flowers.js';

// Positionnement : une phrase, un public, trois bénéfices, un exemple. Repris partout.
export const PROMISE = 'Vos tâches, vos projets, vos notes et vos clients, au même endroit.';
export const PITCH = 'L\'application d\'organisation pour tout le monde : réviser un examen, mener un projet de code, gérer son travail, son budget ou ses clients. Des tâches reliées à des projets qui avancent tout seuls, des notes en pages, des quiz, et un CRM qui parle votre métier.';
export const AUDIENCE = 'Pour les étudiants qui révisent, les salariés, les développeurs, les indépendants, les commerçants et les petites équipes.';
export const BENEFITS = [
  ['checkSquare', 'blue', 'Une journée claire', 'Les tâches du jour, les rendez-vous et les échéances sur un seul écran. On écrit « Réviser le chapitre 3 demain 18h », la date se règle toute seule.'],
  ['folder', 'olive', 'Des projets qui avancent', 'Un examen, une application, un client, un déménagement : chaque projet regroupe ses tâches, et sa progression se calcule toute seule.'],
  ['page', 'navy', 'Tout ce que vous savez, rangé', 'Des pages et sous-pages comme dans un carnet, des modèles (cours, budget, réunion), et des quiz pour retenir l\'essentiel.'],
];
export const EXAMPLE = 'Un matin type : vous ouvrez l\'application, vous voyez vos trois tâches du jour, votre projet à 60 %, et la notification du devis à relancer. Vous cochez au fil de la journée.';
export const WHY_ONE = 'Une tâche appartient à un projet, une page de notes à une fiche, et un devis accepté transforme le prospect en client : rien à recopier d\'un outil à l\'autre.';

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
  projectsUnlimited: ['Projets illimités avec Pro', 'La version gratuite suit 3 projets en cours. Avec Pro, suivez autant de projets que vous voulez, chacun avec ses tâches et sa progression.'],
  academy: ['L\'Académie complète est incluse dans Pro', 'Tous les guides pratiques : organisation, rendez-vous, voix, prix, relances, horaires par secteur…'],
  messages: ['Le générateur de messages est inclus dans Pro', 'Des e-mails et SMS prêts à envoyer, remplis avec la fiche.'],
  audit: ['L\'audit express est inclus dans Pro', 'Une note sur 10 de la présence en ligne d\'une entreprise, et les points à aborder.'],
  import: ['L\'import est inclus dans Pro', 'Collez une liste depuis un tableur : elle devient des fiches prêtes à suivre.'],
  quote: ['Les devis sont inclus dans Pro', 'Un devis par client, calculé et imprimable en PDF, suivi de brouillon à accepté. Un devis accepté fait passer la fiche en client.'],
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
