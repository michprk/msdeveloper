// Abonnement (1.13) : statut, formules lues dans plans.js (mensuel ou annuel), comparatif court, paiement, historique, FAQ.
// Trois cas de paiement :
// - Stripe configuré : la carte est saisie chez Stripe (Checkout), rien ne passe par l'application ;
// - sans Stripe, ?debug=1 : simulation complète (carte refusée, coupure, temps qui passe, vérification) ;
// - sans Stripe, sans debug (le cas « production » d'aujourd'hui) : l'essai démarre sans carte et s'arrête seul, aucun achat possible.
import { S, update, on, access, billing, PLANS, RANK, TRIAL_DAYS, GRACE_DAYS, trialEnd, trialLeft, prorata, subscribe, startTrial, changePlan, changeInterval, cancelSub, resumeSub, settleDue, simulateDays, nextBillingEvent } from '../store.js';
import { COMPARE, priceOf, savingOf, planName, debugOn } from '../plans.js';
import { ic, esc, eur2, register, toast, sheet, sheetHead, closeSheet, confirmSheet, busy, pause, dateLong } from '../ui.js';
import { pageHead } from './common.js';
import { isTest, PAYMENTS } from '../payments.js';
import { runBillingChecks, CHECK_COUNT } from '../billing-check.js';
import { cloudUser, checkout, openPortal, cloudMessage } from '../cloud.js';
import { accountSheet } from './account.js';
import { t as tr, isTu } from '../strings.js';
import { PRO_SITUATIONS } from '../strings.js';

const price = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ','));
const dl = (t) => dateLong(t).toLowerCase();
const rr = () => window.dispatchEvent(new Event('ms:rerender'));
const sim = () => isTest() && debugOn();      // simulation complète (développement)
const preview = () => isTest() && !debugOn(); // pas encore de paiement en ligne
const per = (iv) => (iv === 'year' ? 'par an' : 'par mois');
// Premium Entrepreneur n'est montré qu'aux profils pro (ou à qui a activé le module Entrepreneur)
export const premiumVisible = () => on('entrepreneur') || PRO_SITUATIONS.includes(S().profile.situation) || S().sub.plan === 'premium';
const shown = () => ['free', 'pro', ...(premiumVisible() ? ['premium'] : [])];
let ivView = null; // période affichée sur la page (mensuel ou annuel)
const iv = () => ivView || S().sub.interval || 'month';

export const PLAN_FOR = Object.fromEntries(Object.keys(PLANS).map((k) => [k, PLANS[k].for]));
const cell = (v) => (v === true ? `<span class="ok">${ic('check')}<span class="sr-only">Inclus</span></span>` : v === false ? '<span class="no" aria-label="Non inclus">—</span>' : `<span class="txt">${esc(v)}</span>`);
const amountLine = (id, i = iv()) => {
  const p = PLANS[id];
  if (!p.price) return '<b>0 €</b><span>pour toujours</span>';
  if (i === 'year') { const sv = savingOf(id); return `<b>${price(p.yearly)} €</b><span>par an · soit ${price(sv.monthly)} € par mois</span><em class="plan-save">${sv.pct} % moins cher que le mensuel</em>`; }
  return `<b>${price(p.price)} €</b><span>par mois, sans engagement</span>`;
};

const STATUS = {
  free: () => [tr('bill.st.free.t'), tr('bill.st.free', { days: TRIAL_DAYS })],
  trialing: (s) => [`Essai gratuit ${planName(s.plan)}`, s.card === 0 ? tr('bill.st.trialNoCard', { plan: planName(s.plan), date: dl(s.periodEnd) }) : tr('bill.st.trialing', { plan: planName(s.plan), date: dl(s.periodEnd), price: price(priceOf(s.plan, s.interval)), per: per(s.interval) })],
  trial_canceling: (s) => ['Essai annulé', tr('bill.st.trialCancel', { plan: planName(s.plan), date: dl(s.periodEnd) })],
  trial: () => ['Essai gratuit', tr('bill.st.trialOld', { date: dl(trialEnd()), n: trialLeft() })],
  trial_ended: () => [tr('bill.st.free.t'), tr('bill.st.trialEnded', { date: dl(trialEnd()) })],
  active: (s) => [`${planName(s.plan)} · actif`, tr('bill.st.active', { price: price(priceOf(s.pending || s.plan, s.pendingInterval || s.interval)), date: dl(s.periodEnd), more: s.pending ? ` Passage à ${planName(s.pending)} à cette date.` : s.pendingInterval ? ` Passage au paiement ${s.pendingInterval === 'year' ? 'annuel' : 'mensuel'} à cette date.` : '' })],
  canceling: (s) => [`${planName(s.plan)} · résilié`, tr('bill.st.canceling', { plan: planName(s.plan), date: dl(s.periodEnd) })],
  past_due: (s) => ['Paiement refusé', tr('bill.st.pastDue', { plan: planName(s.plan), date: dl(s.graceEnd) })],
  ended: () => [tr('bill.st.free.t'), tr('bill.st.ended')],
};
const TYPE = { essai: ['Essai', 't-sky'], paiement: ['Payé', 't-olive'], echec: ['Refusé', 't-rose'], resiliation: ['Résiliation', 't-sand'], reprise: ['Repris', 't-sky'], fin: ['Terminé', 't-grey'], changement: ['Changement', 't-sky'] };

export function plans() {
  const s = S(), b = s.sub, st = billing(), cur = access();
  const subscribed = b.plan !== 'free';
  const [title, text] = s.sub.demo ? ['Mode démonstration', `Affichage ${planName(s.sub.demo)}, activé depuis le compte. Ce n'est pas un abonnement.`] : STATUS[st](b);
  const neverTried = !b.trialStart && !b.history?.some((h) => h.type === 'paiement' || h.type === 'essai');
  // Premier abonnement : l'essai gratuit de 7 jours
  const choose = (id) => (neverTried
    ? `<button class="btn ${id === 'premium' ? 'btn-sky' : 'btn-primary'} btn-block" data-act="co-open" data-plan="${id}" data-trial="1">Essayer ${TRIAL_DAYS} jours gratuits</button><p class="plan-sub">Puis ${price(priceOf(id, iv()))} € ${per(iv())}, annulable à tout moment</p>`
    : preview() ? `<p class="plan-sub">${tr('bill.soon')}</p>` : `<button class="btn ${id === 'premium' ? 'btn-sky' : 'btn-primary'} btn-block" data-act="co-open" data-plan="${id}">Choisir ${planName(id)}</button>`);
  const planBtn = (id) => {
    if (!isTest()) {
      if (subscribed && b.plan === id) return `<p class="plan-cur">${st === 'canceling' ? `Jusqu'au ${dl(b.periodEnd)}` : 'Ta formule'}</p>`;
      if (id === 'free') return !subscribed && cur === 'free' ? '<p class="plan-cur">Ta formule</p>' : '';
      if (subscribed) return `<button class="btn btn-ghost btn-block" data-act="cloud-portal">Passer à ${planName(id)}</button><p class="plan-sub">${RANK[id] > RANK[b.plan] ? 'Tout de suite, au prorata' : 'À la fin de la période payée'}</p>`;
      return choose(id);
    }
    if (subscribed && b.plan === id) return `<p class="plan-cur">${st === 'canceling' ? `Jusqu'au ${dl(b.periodEnd)}` : 'Ta formule'}</p>`;
    if (subscribed && b.pending === id) return `<p class="plan-cur">Prévue le ${dl(b.periodEnd)}</p>`;
    if (id === 'free') return subscribed ? (st === 'canceling' ? '' : '<button class="btn btn-ghost btn-block" data-act="sub-cancel">Revenir au gratuit</button>') : cur === 'free' ? '<p class="plan-cur">Ta formule</p>' : '';
    if (subscribed && b.status === 'trialing') return `<button class="btn btn-ghost btn-block" data-act="sub-switch" data-plan="${id}">Passer à ${planName(id)}</button><p class="plan-sub">Tout de suite, toujours gratuit pendant l'essai</p>`;
    if (subscribed && sim()) return RANK[id] > RANK[b.plan]
      ? `<button class="btn btn-primary btn-block" data-act="co-open" data-plan="${id}">Passer à ${planName(id)}</button><p class="plan-sub">${price(prorata(id))} € aujourd'hui, au prorata</p>`
      : `<button class="btn btn-ghost btn-block" data-act="sub-down" data-plan="${id}">Passer à ${planName(id)}</button><p class="plan-sub">À partir du ${dl(b.periodEnd)}</p>`;
    return choose(id);
  };
  const card = (id) => `<section class="plan rise ${id === 'premium' ? 'is-dark' : ''} ${id === 'pro' ? 'is-reco' : ''}">
      ${id === 'pro' ? '<span class="plan-tag">Idéal pour les études</span>' : id === 'premium' ? '<span class="plan-tag is-light">Pour entreprendre</span>' : ''}
      <header><h2>${PLANS[id].name}</h2><p class="plan-for">${esc(PLANS[id].for)}</p><p class="plan-p">${amountLine(id)}</p></header>
      <ul class="plan-f">${PLANS[id].highlights.map((h) => `<li>${ic('check')}<span>${esc(h)}</span></li>`).join('')}</ul>
      ${planBtn(id)}
    </section>`;
  const ids = shown();
  const hist = b.history || [];
  const sv = savingOf('pro');
  const html = `${pageHead('Abonnement', { kicker: tr('bill.kicker'), back: '#/reglages' })}
    ${sim() ? `<div class="test-strip rise">${ic('shield')}<p><b>Mode test (debug).</b> Paiements simulés : aucune carte n'est demandée et aucun argent n'est prélevé.</p></div>` : ''}
    <section class="card status-card st-${st} rise">
      <div class="status-top"><span class="status-ic">${ic(['trial', 'trialing', 'trial_canceling'].includes(st) ? 'hourglass' : st === 'past_due' ? 'bell' : 'diamond')}</span><div><p class="muted-s">Statut actuel</p><h2>${esc(title)}</h2><p>${text}</p></div></div>
      <div class="act-row">
        ${st === 'free' && neverTried ? `<button class="btn btn-primary" data-act="co-open" data-plan="pro" data-trial="1">Essayer Pro ${TRIAL_DAYS} jours gratuits</button>` : ''}
        ${isTest() && st === 'trialing' ? `<a class="btn btn-ghost" href="#plans" data-act="to-plans">Changer de formule</a><button class="btn btn-ghost" data-act="sub-cancel">Annuler l'essai</button>` : ''}
        ${isTest() && st === 'trial_canceling' ? `<button class="btn btn-primary" data-act="sub-resume">Reprendre l'abonnement</button>` : ''}
        ${['trial', 'trial_ended', 'ended'].includes(st) ? '<a class="btn btn-primary" href="#plans" data-act="to-plans">Choisir une formule</a>' : ''}
        ${!isTest() && ['active', 'canceling', 'past_due', 'trialing', 'trial_canceling'].includes(st) ? `<button class="btn btn-primary" data-act="cloud-portal">${ic('card')}<span>Gérer mon abonnement</span></button>` : ''}
        ${isTest() && st === 'active' ? `<a class="btn btn-ghost" href="#plans" data-act="to-plans">Changer de formule</a>${b.interval !== 'year' && !b.pendingInterval ? '<button class="btn btn-ghost" data-act="sub-interval" data-iv="year">Passer à l\'année</button>' : ''}<button class="btn btn-ghost" data-act="sub-cancel">Résilier</button>` : ''}
        ${isTest() && st === 'active' && (b.pending || b.pendingInterval) ? '<button class="btn btn-ghost" data-act="sub-keep">Annuler le changement prévu</button>' : ''}
        ${isTest() && st === 'canceling' ? `<button class="btn btn-primary" data-act="sub-resume">Reprendre l'abonnement</button>` : ''}
        ${isTest() && st === 'past_due' ? `<button class="btn btn-primary" data-act="sub-retry">Réessayer le paiement</button><button class="btn btn-ghost" data-act="sub-cancel">Résilier</button>` : ''}
      </div>
      ${!isTest() && ['active', 'canceling', 'past_due', 'trialing', 'trial_canceling'].includes(st) ? `<p class="field-h">${tr('bill.portal')}</p>` : ''}
    </section>
    ${sim() ? `<section class="card verif rise">
      <header class="card-h"><div><h2>Vérifier les paiements</h2><p>${CHECK_COUNT} situations rejouées automatiquement en une seconde</p></div><span class="chip t-olive">${ic('shield')}Test</span></header>
      <p class="body">Essai, souscription mensuelle et annuelle, renouvellements, changements de formule au prorata, résiliation, reprise, paiements refusés, dates d'échéance : chaque situation est rejouée et comparée au résultat attendu. L'abonnement est remis exactement comme avant.</p>
      <button class="btn btn-primary" data-act="bill-check">${ic('check')}<span>Lancer la vérification</span></button>
    </section>` : ''}
    <div class="plans-h"><h2 class="sec-title" id="plans">Les formules</h2>
      <div class="seg seg-sm bill-iv" role="radiogroup" aria-label="Période de paiement">${[['month', 'Mensuel'], ['year', `Annuel <em>−${sv.pct} %</em>`]].map(([v, l]) => `<button class="seg-i ${iv() === v ? 'is-on' : ''}" role="radio" aria-checked="${iv() === v}" data-act="bill-iv" data-iv="${v}">${l}</button>`).join('')}</div></div>
    ${iv() === 'year' ? `<p class="bill-save">${tr('bill.save', { amount: price(sv.amount), pct: sv.pct })}</p>` : ''}
    <div class="plans ${ids.length === 2 ? 'n2' : ''}">${ids.map(card).join('')}</div>
    ${premiumVisible() ? '' : `<p class="bill-pro">${tr('bill.premiumHint')}</p>`}
    <section class="card rise">
      <header class="card-h"><div><h2>Comparer</h2><p>${tr('bill.compare.p')}</p></div></header>
      <div class="cmp-wrap"><table class="cmp"><thead><tr><th scope="col"><span class="sr-only">Fonction</span></th>${ids.map((id) => `<th scope="col" class="${cur === id ? 'is-cur' : ''}">${planName(id)}</th>`).join('')}</tr></thead>
        <tbody>${COMPARE.filter((r) => premiumVisible() || r[3] !== true || r[2] !== false).map((r) => `<tr><th scope="row">${esc(r[0])}</th>${ids.map((id, k) => `<td class="${cur === id ? 'is-cur' : ''}">${cell(r[k + 1])}</td>`).join('')}</tr>`).join('')}
        <tr class="cmp-p"><th scope="row">Prix ${per(iv())}</th>${ids.map((id) => `<td>${price(priceOf(id, iv()))} €</td>`).join('')}</tr></tbody></table></div>
    </section>
    <section class="card rise">
      <header class="card-h"><div><h2>Historique</h2><p>${hist.length ? `${hist.length} opération${hist.length > 1 ? 's' : ''}${sim() ? ' · reçus de test' : ''}` : 'Aucun paiement pour l\'instant'}</p></div></header>
      ${hist.length ? `<ul class="rows bill">${hist.slice(0, 24).map((h) => `<li><button class="row" data-act="receipt" data-id="${h.id}"><span class="menu-ic">${ic(h.type === 'paiement' ? 'receipt' : h.type === 'echec' ? 'x' : 'refresh')}</span><span class="row-b"><b>${esc(h.label)}</b><span>${dateLong(h.at)}</span></span><span class="row-e">${h.amount ? `<b>${price(h.amount)} €</b>` : ''}<span class="chip ${TYPE[h.type]?.[1] || ''}">${TYPE[h.type]?.[0] || ''}</span></span></button></li>`).join('')}</ul>`
        : isTest() ? '<p class="muted pad">Les paiements, changements de formule et reçus apparaîtront ici.</p>' : `<p class="muted pad">${tr('bill.invoices')}</p>${b.plan !== 'free' ? '<button class="btn btn-ghost" data-act="cloud-portal">Voir mes factures</button>' : ''}`}
    </section>
    ${sim() ? `<details class="card test-tools rise"><summary><h2>Tester les paiements</h2>${ic('chevD', 'chev')}</summary>
      <p class="body">Pour vérifier chaque situation sans attendre : faire passer le temps, provoquer un refus de paiement, puis regarder le statut et l'historique ci-dessus.</p>
      <div class="ios-list"><label class="ios-row"><span><b>Le prochain renouvellement sera refusé</b><em>Pour voir le délai de grâce de ${GRACE_DAYS} jours.</em></span><input type="checkbox" class="switch" ${b.failNext ? 'checked' : ''} data-act-change="bill-fail"></label></div>
      <div class="btn-list">
        ${nextBillingEvent() ? `<button class="btn btn-ghost" data-act="bill-time" data-d="next">${ic('calendar')}<span>${st === 'past_due' ? 'Passer à la fin du délai de grâce' : st === 'trial' ? 'Passer à la fin de l\'essai' : `Passer au prochain prélèvement (${dl(b.periodEnd)})`}</span></button>` : ''}
        <button class="btn btn-ghost" data-act="bill-time" data-d="7">${ic('clock')}<span>Avancer d'une semaine</span></button>
        <button class="btn btn-danger-ghost" data-act="bill-reset">${ic('refresh')}<span>Remettre l'abonnement à zéro</span></button>
      </div></details>` : ''}
    <section class="faq">
      <h2 class="sec-title">Questions fréquentes</h2>
      ${[1, 2, 3, 4, 5, 6, 7].map((k) => `<details class="obj"><summary><span>${tr(`bill.faq${k}.q`)}</span>${ic('chevD', 'chev')}</summary><p>${tr(`bill.faq${k}.a`, { days: TRIAL_DAYS, grace: GRACE_DAYS, saving: sv.pct })}</p></details>`).join('')}
    </section>`;
  return { title: 'Abonnement', tab: 'plus', html };
}

// ---------- Paiement ----------
export function checkoutSheet(planId, trial = false, interval = iv()) {
  const s = S().sub;
  const p = PLANS[planId];
  const upgrade = s.plan !== 'free' && s.status !== 'trialing';
  const amount = priceOf(planId, interval);
  const due = trial ? 0 : upgrade ? prorata(planId) : amount;
  const trialEndAt = Date.now() + TRIAL_DAYS * 864e5;
  const next = trial ? trialEndAt : upgrade ? s.periodEnd : Date.now() + (interval === 'year' ? 365 : 30) * 864e5;
  if (!navigator.onLine && !preview()) { toast('Le paiement demande une connexion internet. Tes données, elles, restent accessibles hors ligne.', { title: 'Hors connexion', ms: 4500 }); return; }
  const ivSeg = `<div class="seg seg-sm co-iv" role="radiogroup" aria-label="Période">${[['month', `${price(p.price)} € par mois`], ['year', `${price(p.yearly)} € par an`]].map(([v, l]) => `<button class="seg-i ${interval === v ? 'is-on' : ''}" role="radio" aria-checked="${interval === v}" data-act="co-iv" data-plan="${planId}" data-trial="${trial ? 1 : 0}" data-iv="${v}">${l}</button>`).join('')}</div>`;
  const sum = trial ? `${ivSeg}<dl class="co-sum">
        <div><dt>Formule ${p.name}</dt><dd>${price(amount)} € ${per(interval)}</dd></div>
        <div><dt>Essai gratuit</dt><dd>${TRIAL_DAYS} jours, jusqu'au ${dl(trialEndAt)}</dd></div>
        ${preview() ? '' : `<div><dt>Premier prélèvement</dt><dd>${price(amount)} € le ${dl(trialEndAt)}</dd></div>`}
        <div class="co-tot"><dt>À payer aujourd'hui</dt><dd>0 €</dd></div>
      </dl>
      ${preview() ? `<p class="sheet-p">${tr('co.preview')}</p>` : `<ol class="co-steps"><li><b>Aujourd'hui</b><span>Toutes les fonctions ${p.name} s'ouvrent.</span></li><li><b>Jour ${TRIAL_DAYS - 2}</b><span>${tr('co.remind')}</span></li><li><b>Jour ${TRIAL_DAYS}</b><span>${tr('co.charge', { price: price(amount) })}</span></li></ol>`}`
    : `${upgrade ? '' : ivSeg}<dl class="co-sum">
        <div><dt>Formule ${p.name}</dt><dd>${price(amount)} € ${per(interval)}</dd></div>
        ${upgrade ? `<div><dt>Déjà payé pour ${planName(s.plan)}</dt><dd>déduit au prorata</dd></div>` : ''}
        <div><dt>Prochain prélèvement</dt><dd>${dl(next)}</dd></div>
        <div class="co-tot"><dt>À payer aujourd'hui</dt><dd>${price(due)} €</dd></div>
      </dl>`;
  const head = trial ? `Essai gratuit de ${TRIAL_DAYS} jours · ${planName(planId)}` : upgrade ? `Passer à ${planName(planId)}` : `S'abonner à ${planName(planId)}`;
  const stay = `<button class="btn btn-ghost btn-block co-free" data-act="close-sheet">${tr('co.stayFree')}</button>`;
  if (!isTest()) {
    sheet(`${sheetHead(head, `${price(amount)} € ${per(interval)}, sans engagement`)}
      <div class="sheet-body co" data-plan="${planId}">
        ${sum}
        <p class="co-err" role="alert" hidden></p>
        <button class="btn btn-primary btn-block btn-lg" data-act="co-stripe" data-plan="${planId}" data-trial="${trial ? 1 : 0}" data-iv="${interval}">${ic('lock')}<span>${trial ? 'Ajouter mon moyen de paiement' : 'Continuer vers le paiement sécurisé'}</span></button>
        ${trial ? stay : ''}
        <p class="sheet-note">${cloudUser() ? `Compte : ${esc(cloudUser().email || '')}. ` : tr('co.accountFirst')}${tr('co.stripe', { provider: PAYMENTS.provider })}</p>
      </div>`, { cls: 'sheet-sm' });
    return;
  }
  if (preview()) {
    sheet(`${sheetHead(head, trial ? 'Sans carte : le paiement en ligne n\'est pas encore ouvert' : 'Bientôt disponible')}
      <div class="sheet-body co" data-plan="${planId}">
        ${trial ? `${sum}<button class="btn btn-primary btn-block btn-lg" data-act="co-pay" data-plan="${planId}" data-trial="1" data-iv="${interval}" data-r="ok" data-nocard="1">${ic('check')}<span>Commencer l'essai gratuit</span></button>${stay}`
          : `<p class="sheet-p">${tr('bill.soon')}</p><button class="btn btn-primary btn-block" data-act="close-sheet">D'accord</button>`}
      </div>`, { cls: 'sheet-sm' });
    return;
  }
  sheet(`${sheetHead(head, `${price(amount)} € ${per(interval)}, sans engagement`)}
    <div class="sheet-body co" data-plan="${planId}">
      ${sum}
      <div class="test-strip">${ic('shield')}<p><b>Mode test (debug).</b> Aucune carte n'est demandée et rien n'est prélevé : choisis le résultat à simuler.</p></div>
      <p class="co-err" role="alert" hidden></p>
      <button class="btn btn-primary btn-block btn-lg" data-act="co-pay" data-plan="${planId}" data-trial="${trial ? 1 : 0}" data-iv="${interval}" data-r="ok">${ic('lock')}<span>${trial ? 'Simuler l\'ajout de la carte et commencer' : `Simuler le paiement de ${price(due)} €`}</span></button>
      <div class="sheet-actions"><button class="btn btn-ghost" data-act="co-pay" data-plan="${planId}" data-trial="${trial ? 1 : 0}" data-iv="${interval}" data-r="fail">${trial ? 'Simuler une carte refusée' : 'Simuler un refus'}</button><button class="btn btn-ghost" data-act="co-pay" data-plan="${planId}" data-trial="${trial ? 1 : 0}" data-iv="${interval}" data-r="net">Simuler une coupure</button></div>
      ${trial ? stay : ''}
    </div>`, { cls: 'sheet-sm' });
}
function receiptSheet(id) {
  const h = (S().sub.history || []).find((x) => x.id === id);
  if (!h) return;
  sheet(`${sheetHead(h.type === 'paiement' ? 'Paiement confirmé' : TYPE[h.type]?.[0] || 'Opération', isTest() ? 'Reçu de test — aucun montant réel' : '')}
    <div class="sheet-body"><dl class="co-sum">
      <div><dt>Référence</dt><dd>${esc(h.id)}</dd></div>
      <div><dt>Date</dt><dd>${dateLong(h.at)}</dd></div>
      <div><dt>Objet</dt><dd>${esc(h.label)}</dd></div>
      ${h.plan ? `<div><dt>Formule</dt><dd>${PLANS[h.plan]?.name || ''}</dd></div>` : ''}
      <div class="co-tot"><dt>Montant</dt><dd>${price(h.amount || 0)} €</dd></div>
    </dl>
    <p class="sheet-note">Au lancement, les factures officielles seront envoyées par e-mail par ${PAYMENTS.provider}.</p>
    <button class="btn btn-ghost btn-block" data-act="close-sheet">Fermer</button></div>`, { cls: 'sheet-sm' });
}

function checkSheet() {
  const res = runBillingChecks();
  const ok = res.filter((r) => r.ok).length;
  const n = res.reduce((k, r) => k + r.checks.length, 0);
  sheet(`${sheetHead(ok === res.length ? 'Tous les paiements sont conformes' : `${res.length - ok} situation${res.length - ok > 1 ? 's' : ''} à corriger`, `${ok} / ${res.length} situations · ${n} vérifications · ${dateLong(Date.now())}`)}
    <div class="sheet-body">
      <ul class="verif-l">${res.map((r) => `<li class="${r.ok ? 'is-ok' : 'is-ko'}"><details ${r.ok ? '' : 'open'}><summary><span class="verif-ic">${ic(r.ok ? 'check' : 'x')}</span><b>${esc(r.title)}</b><span class="muted-s">${r.checks.filter((c) => c[1]).length}/${r.checks.length}</span></summary>
        <ul>${r.checks.map(([label, pass]) => `<li class="${pass ? '' : 'is-ko'}">${ic(pass ? 'check' : 'x')}<span>${esc(label)}</span></li>`).join('')}</ul></details></li>`).join('')}</ul>
      <p class="sheet-note">Votre abonnement a été remis exactement comme avant. Ces vérifications portent sur le mode test ; avec Stripe, suivez la liste de TEST-PAIEMENTS.md.</p>
      <button class="btn btn-ghost btn-block" data-act="close-sheet">Fermer</button>
    </div>`, { cls: 'sheet-tall' });
}

register({
  'bill-check': () => { if (sim()) checkSheet(); },
  'co-stripe': async (b) => {
    const plan = b.dataset.plan;
    if (!cloudUser()) { closeSheet(null, true); accountSheet({ then: plan }); return; }
    try { await busy(b, 'Ouverture du paiement…', () => checkout(plan, { trial: b.dataset.trial === '1', interval: b.dataset.iv || 'month' })); }
    catch (e) { const err = b.closest('.co').querySelector('.co-err'); err.textContent = cloudMessage(e); err.hidden = false; }
  },
  'cloud-portal': async (b) => {
    if (!cloudUser()) { accountSheet(); return; }
    try { await busy(b, 'Ouverture…', () => openPortal()); }
    catch (e) { toast(cloudMessage(e), { title: 'Espace de gestion indisponible', ms: 4500 }); }
  },
  'co-open': (b) => checkoutSheet(b.dataset.plan, b.dataset.trial === '1', b.dataset.iv || iv()),
  'co-iv': (b) => checkoutSheet(b.dataset.plan, b.dataset.trial === '1', b.dataset.iv),
  // Bascule mensuel / annuel de la page
  'bill-iv': (b) => { ivView = b.dataset.iv; rr(); },
  'sub-interval': async (b) => {
    const s = S().sub, to = b.dataset.iv;
    if (!await confirmSheet({ title: to === 'year' ? 'Passer au paiement annuel ?' : 'Passer au paiement mensuel ?', text: `À partir du ${dl(s.periodEnd)} : ${price(priceOf(s.plan, to))} € ${per(to)} pour ${planName(s.plan)}.`, ok: 'Confirmer' })) return;
    changeInterval(to); toast(`Changement prévu le ${dl(s.periodEnd)}.`, { title: to === 'year' ? 'Paiement annuel' : 'Paiement mensuel' });
  },
  'sub-switch': (b) => { const id = b.dataset.plan; changePlan(id); toast(`Toutes les fonctions ${planName(id)} sont ouvertes, toujours sans prélèvement pendant l'essai.`, { title: `Essai : ${planName(id)}` }); },
  'to-plans': (b, e) => { e.preventDefault(); document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  'co-pay': async (b) => {
    const planId = b.dataset.plan, r = b.dataset.r;
    const box = b.closest('.co');
    const err = box.querySelector('.co-err');
    err.hidden = true;
    box.querySelectorAll('button').forEach((x) => { x.disabled = true; });
    await busy(b, r === 'ok' ? 'Paiement en cours…' : 'Traitement…', () => pause(1100));
    box.querySelectorAll('button').forEach((x) => { x.disabled = false; });
    if (r === 'net' || !navigator.onLine) { err.textContent = 'La connexion a été interrompue pendant le paiement. Rien n\'a été prélevé : vérifiez votre connexion et réessayez.'; err.hidden = false; return; }
    if (r === 'fail') { err.textContent = 'Paiement refusé par la banque (simulation). Rien n\'a été prélevé. Réessayez, ou utilisez un autre moyen de paiement.'; err.hidden = false; return; }
    if (b.dataset.trial === '1') {
      startTrial(planId, b.dataset.iv || 'month', { card: b.dataset.nocard !== '1' });
      closeSheet(null, true);
      toast(b.dataset.nocard === '1' ? tr('co.trialNoCard', { date: dl(S().sub.periodEnd) }) : tr('co.trialStarted', { date: dl(S().sub.periodEnd) }), { title: `Essai ${planName(planId)} commencé`, ms: 4500 });
      window.dispatchEvent(new CustomEvent('ms:trial', { detail: planId }));
      return;
    }
    const upgrade = S().sub.plan !== 'free';
    const rec = upgrade ? changePlan(planId) : subscribe(planId, b.dataset.iv || 'month');
    closeSheet(null, true);
    receiptSheet(rec.id);
    toast(`Toutes les fonctions ${PLANS[planId].name} sont ouvertes.`, { title: upgrade ? 'Formule modifiée' : 'Abonnement activé' });
  },
  receipt: (b) => receiptSheet(b.dataset.id),
  'sub-down': async (b) => {
    const id = b.dataset.plan, s = S().sub;
    if (id === 'free') return;
    if (!await confirmSheet({ title: `Passer à ${planName(id)} ?`, text: tr('bill.down', { from: planName(s.plan), to: planName(id), date: dl(s.periodEnd), price: price(priceOf(id, s.interval)), per: per(s.interval) }), ok: `Passer à ${planName(id)}` })) return;
    changePlan(id); toast(`Changement prévu le ${dl(s.periodEnd)}`, { title: `Passage à ${PLANS[id].name}` });
  },
  'sub-keep': () => { update((s) => { s.sub.pending = null; s.sub.pendingInterval = null; }); toast('Changement annulé : la formule continue.'); },
  'sub-cancel': async () => {
    const s = S().sub;
    if (!await confirmSheet({ title: s.status === 'trialing' ? 'Annuler l\'essai ?' : 'Résilier l\'abonnement ?', text: tr('bill.cancel', { plan: planName(s.plan), date: dl(s.status === 'past_due' ? s.graceEnd : s.periodEnd) }), ok: s.status === 'trialing' ? 'Annuler l\'essai' : 'Résilier', danger: true })) return;
    cancelSub(); toast(`Plus aucun prélèvement. Accès ${planName(s.plan)} jusqu'au ${dl(s.periodEnd)}.`, { title: s.status === 'trialing' ? 'Essai annulé' : 'Abonnement résilié', action: 'Annuler', onAction: () => resumeSub(), ms: 5000 });
  },
  'sub-resume': () => { resumeSub(); toast(`Prochain prélèvement le ${dl(S().sub.periodEnd)}.`, { title: 'Abonnement repris' }); },
  'sub-retry': async (b) => {
    if (!navigator.onLine) { toast('Le paiement demande une connexion internet.', { title: 'Hors connexion' }); return; }
    const ok = !S().sub.failNext;
    await busy(b, 'Paiement en cours…', () => pause(1000));
    const rec = settleDue(ok);
    if (ok) { receiptSheet(rec.id); toast('Votre abonnement est à jour.', { title: 'Paiement réussi' }); }
    else { update((s) => { s.sub.failNext = false; }, { silent: true }); toast('La banque a refusé le paiement (simulation). Réessayez : le prochain essai passera.', { title: 'Paiement refusé', ms: 4500 }); }
  },
  'bill-time': (b) => {
    if (!sim()) return;
    const d = b.dataset.d === 'next' ? 'next' : +b.dataset.d;
    simulateDays(d);
    toast(d === 'next' ? 'L\'échéance est passée : regardez le statut et l\'historique.' : `L'abonnement a avancé de ${d} jours.`, { title: 'Test', ms: 2200 });
  },
  'bill-fail': (el) => { update((s) => { s.sub.failNext = el.checked; }, { silent: true }); toast(el.checked ? 'Le prochain renouvellement sera refusé.' : 'Les paiements passeront normalement.', { ms: 1800 }); },
  'bill-reset': async () => {
    if (!await confirmSheet({ title: 'Remettre l\'abonnement à zéro ?', text: 'Formule, essai et historique de test sont effacés. Vos données (fiches, pages, tâches) ne sont pas touchées.', ok: 'Remettre à zéro', danger: true })) return;
    update((s) => { s.sub = { plan: 'free', trialStart: null, demo: null, status: 'none', periodStart: null, periodEnd: null, cancelAt: false, pending: null, graceEnd: null, failNext: false, history: [] }; });
    toast('Abonnement remis à zéro');
  },
});
export { rr, eur2 };
