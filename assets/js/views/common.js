// Éléments partagés entre les écrans.
import { S, can, need, PLANS, access, billing, trialActive, trialLeft, TRIAL_DAYS, update } from '../store.js';
import { ic, esc, register, toast, closeSheet, dateLong } from '../ui.js';
import { checkoutSheet } from './billing.js';
import { t as tr, has } from '../strings.js';
import { authMode } from '../auth.js';

// Positionnement : une phrase, un public, trois bénéfices, un exemple. Repris partout.
export const PROMISE = 'Les tâches, les projets, les notes et les révisions, au même endroit.';
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
  crm: ['Le CRM est inclus dans Premium', 'Vos fiches clients, un pipeline à vos étapes, l\'historique des échanges et une relance datée pour chacun.'],
  notesUnlimited: ['Pages illimitées avec Pro', 'La version gratuite garde cinq pages. Avec Pro, créez autant de pages et de sous-pages que vous voulez.'],
  myQuiz: ['Vos propres quiz avec Pro', 'Créez des quiz sur votre métier, vos tarifs ou vos procédures, pour vous entraîner ou former votre équipe.'],
  scriptsAll: ['Tous les formats sont inclus dans Premium', 'Répondeur, visite, e-mail, SMS, Instagram, relances, rendez-vous, objections et signature — pour chaque secteur.'],
  callMode: ['Le mode appel est inclus dans Premium', 'Le script s\'affiche étape par étape pendant l\'appel, et le résultat s\'enregistre dans la fiche en un geste.'],
  projectsUnlimited: ['Projets illimités avec Pro', 'La version gratuite suit un projet en cours. Avec Pro, suivez autant de projets que vous voulez, chacun avec ses tâches et sa progression.'],
  boards: ['Le tableau blanc est inclus dans Pro et Premium', 'Écrivez à la main et votre écriture devient du texte, tracez des formes parfaites et des volumes, surlignez de toutes les couleurs, cochez, imprimez.'],
  notesDraw: ['L\'éditeur complet est inclus dans Pro', 'Polices, tailles, couleurs, surligneur, encadrés, et des outils pour dessiner, souligner et annoter directement sur vos pages.'],
  calendarFull: ['Le calendrier complet est inclus dans Pro', 'Vues semaine et jour avec les heures, glisser-déposer des tâches, et votre emploi du temps directement dans le calendrier.'],
  connectors: ['Les imports sont inclus dans Pro', 'Importez vos pages Notion, vos tableaux Trello, vos listes Todoist, vos agendas et vos cartes Quizlet en un geste.'],
  timetable: ['L\'emploi du temps est inclus dans Pro', 'Vos cours de la semaine, avec salle et professeur, dans l\'application et dans le calendrier.'],
  grades: ['Les moyennes sont incluses dans Pro', 'Vos notes par matière, avec coefficients, votre moyenne générale et la note qu\'il vous faut au prochain contrôle.'],
  focus: ['Le mode concentration est inclus dans Pro', 'Un minuteur Pomodoro plein écran, relié à vos tâches et à vos matières.'],
  planner: ['Le planificateur de révisions est inclus dans Pro', 'Donnez la date de l\'examen et les chapitres : MindView répartit les révisions jour par jour, avec des rappels.'],
  spaced: ['La révision espacée est incluse dans Pro', 'Chaque carte revient juste avant que vous l\'oubliiez : moins de temps à réviser, plus de choses retenues.'],
  focusStats: ['Les statistiques de concentration sont incluses dans Pro', 'Vos heures de travail par jour et par matière, et votre régularité semaine après semaine.'],
  exportsPro: ['Les exports en image sont inclus dans Premium', 'Exportez vos tableaux blancs en image pour les partager ou les imprimer.'],
  academy: ['L\'Académie complète est incluse dans Premium', 'Tous les guides pratiques : organisation, rendez-vous, voix, prix, relances, horaires par secteur…'],
  messages: ['Le générateur de messages est inclus dans Premium', 'Des e-mails et SMS prêts à envoyer, remplis avec la fiche.'],
  audit: ['L\'audit express est inclus dans Premium', 'Une note sur 10 de la présence en ligne d\'une entreprise, et les points à aborder.'],
  import: ['L\'import est inclus dans Premium', 'Collez une liste depuis un tableur : elle devient des fiches prêtes à suivre.'],
  quote: ['Les devis sont inclus dans Premium', 'Un devis par client, calculé et imprimable en PDF, suivi de brouillon à accepté. Un devis accepté fait passer la fiche en client.'],
  myScripts: ['Les scripts sur mesure sont inclus dans Premium', 'Écrivez vos propres scripts et créez vos secteurs : l\'application génère tous les formats.'],
  training: ['L\'entraînement est inclus dans Premium', 'Des objections tirées au hasard pour répondre du tac au tac.'],
  stats: ['Les statistiques sont incluses dans Premium', 'Vos vrais taux, étape par étape, et vos objectifs du mois.'],
  export: ['L\'export est inclus dans Premium', 'Exportez vos fiches en CSV pour un tableur ou un comptable.'],
};

export function paywall(feature, { compact = false } = {}) {
  const [t0, p0] = FEATURE_TEXT[feature] || ['Fonction réservée aux abonnés', ''];
  // Textes au ton du profil quand ils existent dans strings.js (feat.<fonction>)
  const title = has(`feat.${feature}.t`) ? tr(`feat.${feature}.t`) : t0;
  const p = has(`feat.${feature}`) ? tr(`feat.${feature}`) : p0;
  const plan = PLANS[need(feature)];
  const trialUsed = !!S().sub.trialStart;
  return `<section class="paywall ${compact ? 'is-compact' : ''}">
    <span class="paywall-ic">${ic('lock')}</span>
    <h2>${title}</h2>
    <p>${p}</p>
    <div class="paywall-a">
      ${trialUsed ? '' : `<button class="btn btn-primary" data-act="start-trial" data-plan="${need(feature)}">Essayer ${plan.name} ${TRIAL_DAYS} jours gratuits</button>`}
      <a class="btn ${trialUsed ? 'btn-primary' : 'btn-ghost'}" href="#/abonnement">${trialUsed ? `Passer à ${plan.name}` : 'Voir les formules'}</a>
    </div>
    <p class="paywall-n">${plan.name} : ${plan.price.toFixed(2).replace('.', ',')} € par mois ou ${plan.yearly} € par an, sans engagement</p>
    <button class="btn btn-ghost btn-block paywall-free" data-act="paywall-free">${tr('paywall.free')}</button>
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
  // Rappel deux jours avant la fin de l'essai : le prélèvement approche, l'annulation reste à un geste
  if (st === 'trialing' && s.sub.periodEnd - Date.now() < 2.2 * 864e5) return `<a class="strip" href="#/abonnement">${ic('hourglass')}<span>${tr('strip.trialEnd', { plan: PLANS[s.sub.plan].name, date: dateLong(s.sub.periodEnd).toLowerCase(), price: (s.sub.interval === 'year' ? PLANS[s.sub.plan].yearly : PLANS[s.sub.plan].price).toFixed(2).replace('.', ',') })}</span><span class="strip-a">Gérer</span></a>`;
  if (st === 'past_due') return `<a class="strip is-end" href="#/abonnement">${ic('bell')}<span>${tr('strip.pastDue', { date: dateLong(s.sub.graceEnd).toLowerCase() })}</span><span class="strip-a">Régler ${ic('chevR')}</span></a>`;
  if (st === 'trial_ended' && !s.prefs.hideTrialEnd) return `<a class="strip is-end" href="#/abonnement">${ic('lock')}<span>${tr('strip.trialOver')}</span><span class="strip-a">S'abonner ${ic('chevR')}</span></a>`;
  // La sauvegarde passe avant l'offre d'essai (1.14) : un seul bandeau à la fois
  const bk = backupStrip();
  if (bk) return bk;
  // Essai proposé en contexte (1.11) : un bandeau discret après trois jours d'utilisation, une seule fois,
  // pour qui n'a jamais essayé. Deux vrais boutons : essayer, ou rester en gratuit.
  if (st === 'free' && !s.sub.trialStart && !s.sub.history?.length && !s.prefs.nudgeHidden && Date.now() - (s.createdAt || Date.now()) > 3 * 864e5) {
    return `<section class="nudge" aria-label="Essai de Pro">
      <span class="nudge-ic">${ic('diamond')}</span>
      <div class="nudge-b"><b>${tr('nudge.t')}</b><p>${tr('nudge.p')}</p>
        <div class="nudge-a"><button class="btn btn-primary btn-sm" data-act="start-trial" data-plan="pro">Essayer Pro</button><button class="btn btn-ghost btn-sm" data-act="nudge-hide">${tr('nudge.free')}</button></div></div>
    </section>`;
  }
  return '';
}

// Rappel de sauvegarde (1.14) : quand tout n'est que sur cet appareil, qu'il y a du contenu
// et qu'aucune sauvegarde n'a été faite depuis 14 jours. « Plus tard » le cache 14 jours.
export function backupStrip() {
  const s = S();
  if (authMode() !== 'local' || s.sub.demo) return '';
  const items = s.tasks.filter((t) => !t.demo).length + s.pages.filter((p) => !p.demo).length + s.boards.length + s.prospects.filter((p) => !p.demo).length;
  const since = (x) => Date.now() - (x || 0);
  if (items < 5 || since(s.createdAt) < 7 * 864e5) return '';
  if (s.prefs.lastBackup && since(s.prefs.lastBackup) < 14 * 864e5) return '';
  if (s.prefs.backupLater && since(s.prefs.backupLater) < 14 * 864e5) return '';
  return `<section class="nudge nudge-bk" aria-label="Sauvegarde">
    <span class="nudge-ic">${ic('download')}</span>
    <div class="nudge-b"><b>${tr(s.prefs.lastBackup ? 'backup.old' : 'backup.never')}</b><p>${tr('backup.strip')}</p>
      <div class="nudge-a"><button class="btn btn-primary btn-sm" data-act="backup">Télécharger une sauvegarde</button><button class="btn btn-ghost btn-sm" data-act="backup-later">Plus tard</button></div></div>
  </section>`;
}

register({
  'backup-later': () => update((s) => { s.prefs.backupLater = Date.now(); }),
  // Essai gratuit : 7 jours de la formule qui débloque la fonction, avec un moyen de paiement (rien avant la fin)
  'start-trial': (b) => { closeSheet(null, true); checkoutSheet(b?.dataset?.plan || 'pro', true); },
  // « Continuer gratuitement » : un vrai bouton ; ferme la feuille, ou revient à l'écran précédent
  'paywall-free': (b) => { if (b.closest('.sheet')) closeSheet(); else if (history.length > 1) history.back(); else location.hash = '#/'; },
  'nudge-hide': () => { update((s) => { s.prefs.nudgeHidden = Date.now(); }); toast(tr('nudge.kept'), { ms: 2200 }); },
  'close-sheet': () => closeSheet(),
});

export const accessLabel = () => {
  const a = access(), st = billing(), s = S().sub;
  if (s.demo) return `${PLANS[a].name} (démonstration)`;
  if (st === 'trial') return `Essai gratuit — ${trialLeft()} j restants`;
  if (st === 'trialing' || st === 'trial_canceling') return `Essai ${PLANS[a].name} — ${Math.max(0, Math.ceil((s.periodEnd - Date.now()) / 864e5))} j restants`;
  if (st === 'canceling') return `${PLANS[a].name} jusqu'au ${dateLong(s.periodEnd).toLowerCase()}`;
  if (st === 'past_due') return `${PLANS[a].name} — paiement à régler`;
  return PLANS[a].name;
};

export const sectorTile = (sec, href, extra = '') => `<a class="sec-tile" href="${href}"><span class="sec-ic">${ic(sec.icon)}</span><span class="sec-n">${esc(sec.name)}</span>${extra}</a>`;
