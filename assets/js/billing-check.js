// Vérification automatique des paiements (mode test).
// Rejoue chaque situation d'abonnement, compare au résultat attendu, puis remet l'abonnement
// exactement comme avant. Les données (tâches, fiches, pages…) ne sont jamais touchées.
import { S, update, DAY, TRIAL_DAYS, GRACE_DAYS, access, billing, can, subscribe, startTrial, changePlan, changeInterval, cancelSub, resumeSub, settleDue, simulateDays, trialLeft, prorata, addMonth, addYear, PLANS } from './store.js';
// Montants lus dans plans.js : la vérification suit les prix quand ils changent
const PRO = PLANS.pro.price, PREM = PLANS.premium.price, PRO_Y = PLANS.pro.yearly;

const fresh = (extra = {}) => ({ plan: 'free', interval: 'month', pendingInterval: null, trialStart: null, demo: null, status: 'none', periodStart: null, periodEnd: null, cancelAt: false, pending: null, graceEnd: null, failNext: false, history: [], ...extra });
const set = (extra) => update((s) => { s.sub = fresh(extra); }, { silent: true });
const failNext = () => update((s) => { s.sub.failNext = true; }, { silent: true });
const paid = () => S().sub.history.filter((h) => h.type === 'paiement');
const near = (a, b) => Math.abs(a - b) < 0.011;
const eur = (n) => `${n.toFixed(2).replace('.', ',')} €`;

const SCENARIOS = [
  ['Essai gratuit de 7 jours avec moyen de paiement', (c) => {
    set();
    startTrial('pro');
    const end = S().sub.periodEnd;
    c('Statut « essai », formule Pro ouverte, entrepreneuriat fermé', billing() === 'trialing' && access() === 'pro' && can('boardsUnlimited') && can('notionSync') && !can('crm'));
    c(`Premier prélèvement prévu dans ${TRIAL_DAYS} jours`, Math.round((end - S().sub.trialStart) / DAY) === TRIAL_DAYS);
    c('Rien n\'est prélevé pendant l\'essai', paid().length === 0);
    simulateDays('next');
    c(`À la fin de l'essai : un prélèvement de ${eur(PRO)}, abonnement actif`, billing() === 'active' && paid().length === 1 && near(paid()[0].amount, PRO));
    c('Mois suivant calculé à partir de la fin de l\'essai', S().sub.periodStart === S().sub.trialStart + TRIAL_DAYS * DAY && S().sub.periodEnd === addMonth(S().sub.periodStart));
  }],
  ['Essai annulé avant la fin', (c) => {
    set();
    startTrial('premium');
    cancelSub();
    c('Statut « essai annulé », Premium gardé jusqu\'au bout', billing() === 'trial_canceling' && access() === 'premium');
    simulateDays('next');
    c('À la fin : version gratuite, aucun prélèvement', billing() === 'ended' && access() === 'free' && paid().length === 0);
  }],
  ['Changer de formule pendant l\'essai', (c) => {
    set();
    startTrial('pro');
    changePlan('premium');
    c('Premium ouvert tout de suite, toujours sans prélèvement', access() === 'premium' && billing() === 'trialing' && paid().length === 0);
    simulateDays('next');
    c(`À la fin de l'essai : ${eur(PREM)} prélevés`, paid().length === 1 && near(paid()[0].amount, PREM));
  }],
  ['Essai sans carte (paiement en ligne pas encore ouvert)', (c) => {
    set();
    startTrial('pro', 'month', { card: false });
    c('Pro ouvert pendant l\'essai', access() === 'pro' && billing() === 'trialing');
    simulateDays('next');
    c('À la fin : version gratuite, aucun prélèvement', billing() === 'ended' && access() === 'free' && paid().length === 0);
  }],
  ['Abonnement annuel', (c) => {
    set();
    subscribe('pro', 'year');
    const b = S().sub;
    c(`Un paiement de ${eur(PRO_Y)} pour l'année`, paid().length === 1 && near(paid()[0].amount, PRO_Y));
    c('Prochain prélèvement un an plus tard', b.periodEnd === addYear(b.periodStart));
    simulateDays('next');
    c(`Renouvelé un an plus tard, ${eur(PRO_Y)}`, paid().length === 2 && near(paid()[0].amount, PRO_Y) && S().sub.periodEnd === addYear(S().sub.periodStart));
  }],
  ['Passage du mensuel à l\'annuel', (c) => {
    set();
    subscribe('pro');
    changeInterval('year');
    c('Changement prévu à la fin du mois payé', S().sub.interval === 'month' && S().sub.pendingInterval === 'year');
    simulateDays('next');
    c(`Ensuite ${eur(PRO_Y)} pour un an`, near(paid()[0].amount, PRO_Y) && S().sub.interval === 'year' && S().sub.periodEnd === addYear(S().sub.periodStart));
  }],
  ['Souscription à Pro', (c) => {
    set({ trialStart: Date.now() - 2 * DAY });
    subscribe('pro');
    const b = S().sub;
    c('Statut actif, accès Pro', billing() === 'active' && access() === 'pro');
    c(`Un paiement de ${eur(PRO)}`, paid().length === 1 && near(paid()[0].amount, PRO));
    c('Prochain prélèvement un mois plus tard', b.periodEnd === addMonth(b.periodStart));
    c('Reçu avec une référence', /^MSD-/.test(paid()[0].id));
  }],
  ['Renouvellements mensuels', (c) => {
    set();
    subscribe('pro');
    simulateDays('next'); simulateDays('next'); simulateDays('next');
    const total = paid().reduce((n, h) => n + h.amount, 0);
    c(`Quatre paiements de ${eur(PRO)} en quatre mois`, paid().length === 4 && paid().every((h) => near(h.amount, PRO)));
    c(`Total encaissé : ${eur(4 * PRO)}`, near(total, 4 * PRO));
    c('Toujours actif, période suivante calculée', billing() === 'active' && S().sub.periodEnd === addMonth(S().sub.periodStart));
  }],
  ['Passage à Premium en cours de mois (au prorata)', (c) => {
    set();
    subscribe('pro');
    simulateDays(15);
    const due = prorata('premium');
    changePlan('premium');
    c('Accès Premium tout de suite', access() === 'premium');
    c(`Seulement la différence pour les jours restants (${eur(due)})`, near(paid()[0].amount, due) && due > (PREM - PRO) * 0.4 && due < (PREM - PRO) * 0.6);
    simulateDays('next');
    c(`Le mois suivant : ${eur(PREM)}`, near(paid()[0].amount, PREM));
  }],
  ['Passage à Pro à la fin de la période', (c) => {
    set();
    subscribe('premium');
    changePlan('pro');
    c('Premium gardé jusqu\'à la fin du mois payé', access() === 'premium' && S().sub.pending === 'pro');
    c('Aucun paiement en plus', paid().length === 1);
    simulateDays('next');
    c(`Ensuite Pro, prélevé ${eur(PRO)}`, access() === 'pro' && near(paid()[0].amount, PRO));
  }],
  ['Annuler un changement prévu', (c) => {
    set();
    subscribe('premium');
    changePlan('pro');
    changePlan('premium');
    c('Plus aucun changement prévu', S().sub.pending === null);
    simulateDays('next');
    c(`Premium renouvelé à ${eur(PREM)}`, access() === 'premium' && near(paid()[0].amount, PREM));
  }],
  ['Résiliation', (c) => {
    set();
    subscribe('pro');
    cancelSub();
    c('Statut « résilié », accès gardé jusqu\'à la fin du mois', billing() === 'canceling' && access() === 'pro');
    simulateDays('next');
    c('Ensuite : version gratuite', billing() === 'ended' && access() === 'free');
    c('Aucun prélèvement après la résiliation', paid().length === 1);
  }],
  ['Reprise après une résiliation', (c) => {
    set();
    subscribe('pro');
    cancelSub(); resumeSub();
    c('Abonnement de nouveau actif', billing() === 'active');
    simulateDays('next');
    c('Renouvelé normalement', paid().length === 2 && access() === 'pro');
  }],
  ['Paiement refusé, puis réglé pendant le délai', (c) => {
    set();
    subscribe('pro');
    failNext();
    simulateDays('next');
    const b = S().sub;
    c('Statut « paiement refusé »', billing() === 'past_due');
    c(`Accès gardé ${GRACE_DAYS} jours`, access() === 'pro' && Math.round((b.graceEnd - b.periodEnd) / DAY) === GRACE_DAYS);
    c('Rien d\'encaissé pour ce mois', paid().length === 1);
    settleDue(true);
    c('Actif après le nouvel essai, paiement encaissé', billing() === 'active' && paid().length === 2);
  }],
  ['Paiement refusé, jamais réglé', (c) => {
    set();
    subscribe('premium');
    failNext();
    simulateDays('next'); simulateDays('next');
    c('Fin d\'accès après le délai de grâce', billing() === 'ended' && access() === 'free');
    c('Aucun paiement fantôme', paid().length === 1);
  }],
  ['Fonctions selon la formule', (c) => {
    set({ trialStart: Date.now() - 30 * DAY });
    c('Gratuit : notes illimitées, emploi du temps et un tableau blanc ouverts ; synchro Notion, révision espacée et CRM verrouillés', can('notesUnlimited') && can('timetable') && can('boards') && !can('boardsUnlimited') && !can('notionSync') && !can('spaced') && !can('crm'));
    subscribe('pro');
    c('Pro : synchro Notion, tableaux illimités, révision espacée, exports ; CRM, devis et statistiques commerciales réservés à Premium', can('notionSync') && can('boardsUnlimited') && can('spaced') && can('exports') && !can('crm') && !can('quote') && !can('stats'));
    changePlan('premium');
    c('Premium : tout est ouvert, études et entrepreneuriat (CRM, devis, statistiques)', can('stats') && can('export') && can('crm') && can('quote') && can('planner'));
  }],
  ['Dates d\'échéance (mois courts, années bissextiles)', (c) => {
    const d = (y, m, day, h = 10) => new Date(y, m, day, h).getTime();
    c('31 janvier → 28 février', addMonth(d(2027, 0, 31)) === d(2027, 1, 28));
    c('31 janvier 2028 → 29 février 2028', addMonth(d(2028, 0, 31)) === d(2028, 1, 29));
    c('15 décembre → 15 janvier', addMonth(d(2026, 11, 15)) === d(2027, 0, 15));
    c('Même heure après le changement d\'heure', addMonth(d(2027, 2, 15)) === d(2027, 3, 15));
  }],
];

export const CHECK_COUNT = SCENARIOS.length;
export function runBillingChecks() {
  const snap = JSON.stringify(S().sub);
  const results = [];
  try {
    for (const [title, fn] of SCENARIOS) {
      const checks = [];
      const c = (label, ok) => checks.push([label, !!ok]);
      try { fn(c); } catch (e) { checks.push([`Erreur inattendue : ${e.message}`, false]); }
      results.push({ title, checks, ok: checks.length > 0 && checks.every((x) => x[1]) });
    }
  } finally {
    update((s) => { s.sub = JSON.parse(snap); });
  }
  return results;
}
