// Éléments partagés entre les écrans.
import { S, can, need, PLANS, access, trialActive, trialLeft, TRIAL_DAYS, update } from '../store.js';
import { ic, esc, register, toast, sheet, sheetHead, closeSheet } from '../ui.js';
import { flower } from './flowers.js';

export function pageHead(title, { kicker = '', actions = '', back = '' } = {}) {
  return `<header class="ph">
    ${back ? `<a class="ph-back" href="${back}" data-back>${ic('chevL')}<span>Retour</span></a>` : ''}
    ${kicker ? `<p class="ph-k">${kicker}</p>` : ''}
    <div class="ph-row"><div class="ph-txt"><h1 class="ph-t">${title}</h1></div>${actions ? `<div class="ph-a">${actions}</div>` : ''}</div>
  </header>`;
}

const FEATURE_TEXT = {
  crm: ['Le CRM est inclus dans Pro', 'Pipeline, fiches clients illimitées, historique des appels et relances : tout votre suivi commercial dans la poche.'],
  scriptsAll: ['Tous les formats sont inclus dans Pro', 'Répondeur, visite, e-mail, SMS, Instagram, relances, rendez-vous, objections et signature — pour chaque secteur.'],
  callMode: ['Le mode appel est inclus dans Pro', 'Le script s\'affiche étape par étape pendant l\'appel, et le résultat s\'enregistre dans le CRM en un geste.'],
  agenda: ['L\'agenda est inclus dans Pro', 'Rappels, rendez-vous et relances, reliés à chaque fiche.'],
  projects: ['Le suivi de projets est inclus dans Pro', 'Chaque client signé devient un projet, avec ses étapes et son délai.'],
  academy: ['L\'Académie complète est incluse dans Pro', 'Quatorze guides pratiques : rendez-vous, voix, prix, relances, horaires par secteur…'],
  messages: ['Le générateur de messages est inclus dans Pro', 'Des e-mails et SMS prêts à envoyer, remplis avec la fiche du prospect.'],
  audit: ['L\'audit express est inclus dans Pro', 'Une note sur 10 de la présence en ligne d\'un prospect, et les points à aborder.'],
  import: ['L\'import est inclus dans Pro', 'Collez une liste d\'entreprises, elles deviennent des fiches prêtes à appeler.'],
  quote: ['Les devis sont inclus dans Premium', 'Un devis propre, calculé et imprimable en PDF en deux minutes.'],
  myScripts: ['Les scripts sur mesure sont inclus dans Premium', 'Écrivez vos propres scripts et créez vos secteurs : l\'application génère tous les formats.'],
  training: ['L\'entraînement est inclus dans Premium', 'Des objections tirées au hasard pour répondre du tac au tac.'],
  stats: ['Les statistiques sont incluses dans Premium', 'Vos vrais taux, étape par étape, et vos objectifs du mois.'],
  export: ['L\'export est inclus dans Premium', 'Sauvegardez et exportez vos fiches en CSV.'],
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
    <p class="paywall-n">${plan.name} : ${plan.price.toFixed(2).replace('.', ',')} € par mois${trialUsed ? '' : ' · sans carte pour l\'essai'}</p>
  </section>`;
}

export const gate = (feature, html, opts) => (can(feature) ? html : paywall(feature, opts));

export function trialStrip() {
  const s = S();
  if (s.sub.demo || s.sub.plan !== 'free') return '';
  if (trialActive()) {
    const n = trialLeft();
    return `<a class="strip" href="#/abonnement">${ic('hourglass')}<span>Essai gratuit : <b>${n} jour${n > 1 ? 's' : ''}</b> restant${n > 1 ? 's' : ''}</span><span class="strip-a">Formules ${ic('chevR')}</span></a>`;
  }
  if (s.sub.trialStart) return `<a class="strip is-end" href="#/abonnement">${ic('lock')}<span>Votre essai est terminé — vos données sont conservées.</span><span class="strip-a">S'abonner ${ic('chevR')}</span></a>`;
  return '';
}

register({
  'start-trial': () => {
    if (S().sub.trialStart) return;
    update((s) => { s.sub.trialStart = Date.now(); });
    closeSheet();
    toast(`Essai gratuit activé : ${TRIAL_DAYS} jours, toutes les fonctions.`);
  },
  'close-sheet': () => closeSheet(),
});

export function subscribeSheet(planId) {
  const plan = PLANS[planId];
  sheet(`${sheetHead(`S'abonner à ${plan.name}`, `${plan.price.toFixed(2).replace('.', ',')} € par mois`)}
    <div class="sheet-body">
      <p class="sheet-p">Le paiement en ligne ouvrira avec le lancement officiel de M&amp;S Developer. D'ici là, toutes les fonctions restent accessibles avec l'essai gratuit.</p>
      ${S().sub.trialStart ? '' : `<button class="btn btn-primary btn-block" data-act="start-trial">Activer l'essai gratuit de ${TRIAL_DAYS} jours</button>`}
      <p class="sheet-note">Paiement prévu par carte via un prestataire sécurisé. Aucune donnée bancaire n'est demandée dans l'application.</p>
    </div>`, { cls: 'sheet-sm' });
}

export const accessLabel = () => {
  const a = access();
  if (S().sub.demo) return `${PLANS[a].name} (démonstration)`;
  if (S().sub.plan === 'free' && trialActive()) return `Essai gratuit — ${trialLeft()} j restants`;
  return PLANS[a].name;
};

export const sectorTile = (sec, href, extra = '') => `<a class="sec-tile" href="${href}"><span class="sec-ic">${ic(sec.icon)}</span><span class="sec-n">${esc(sec.name)}</span>${extra}</a>`;
