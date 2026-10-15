// Abonnement : statut réel, formules et limites, paiement (mode test), changement de formule,
// résiliation, échec de paiement et délai de grâce, historique et reçus.
import { S, update, access, billing, PLANS, RANK, TRIAL_DAYS, GRACE_DAYS, LIMITS, trialEnd, trialLeft, prorata, subscribe, changePlan, cancelSub, resumeSub, settleDue, simulateDays, nextBillingEvent } from '../store.js';
import { ic, esc, eur2, register, toast, sheet, sheetHead, closeSheet, confirmSheet, busy, pause, dateLong } from '../ui.js';
import { scriptCount } from '../data/scripts.js';
import { GUIDES } from '../data/guides.js';
import { pageHead } from './common.js';
import { flower } from './flowers.js';
import { isTest, PAYMENTS } from '../payments.js';

const price = (n) => n.toFixed(2).replace('.', ',');
const dl = (t) => dateLong(t).toLowerCase();
const rr = () => window.dispatchEvent(new Event('ms:rerender'));

// Ce que comprend chaque formule, avec ses limites
export const OFFER = [
  ['Tâches, listes, tableau et agenda', true, true, true],
  ['Projets reliés aux tâches, progression automatique', `${LIMITS.freeProjects} en cours`, 'Illimités', 'Illimités'],
  ['Notes en pages et sous-pages, modèles', `${LIMITS.freePages} pages`, 'Illimitées', 'Illimitées'],
  ['Centre de notifications, recherche globale, connecteurs', true, true, true],
  ['Quiz intégrés et révision de vos notes', true, true, true],
  ['Créer vos propres quiz', false, true, true],
  ['CRM personnalisé : fiches, pipeline, champs, équipe', false, true, true],
  ['Devis suivis (brouillon → accepté), PDF, prospect → client', false, true, true],
  ['Scripts d\'appel à froid (23 secteurs)', true, true, true],
  [`Les ${scriptCount()} scripts, situations délicates, mode appel`, false, true, true],
  ['Académie', `${GUIDES.filter((g) => g.free).length} guides`, `${GUIDES.length} guides`, `${GUIDES.length} guides`],
  ['Messages prêts, audit express, import de listes', false, true, true],
  ['Statistiques, export CSV', false, false, true],
  ['Vos scripts et secteurs, entraînement aux objections', false, false, true],
];
const cell = (v) => (v === true ? `<span class="ok">${ic('check')}<span class="sr-only">Inclus</span></span>` : v === false ? '<span class="no" aria-label="Non inclus">—</span>' : `<span class="txt">${esc(v)}</span>`);

const STATUS = {
  free: () => ['Version gratuite', `Tâches, agenda, ${LIMITS.freeProjects} projets, ${LIMITS.freePages} pages de notes, les quiz et les scripts d'appel à froid. Essayez tout le reste pendant ${TRIAL_DAYS} jours, sans carte.`],
  trial: () => ['Essai gratuit', `Toutes les fonctions jusqu'au ${dl(trialEnd())} (encore ${trialLeft()} jour${trialLeft() > 1 ? 's' : ''}). Sans carte : à la fin, l'application repasse en version gratuite si vous ne choisissez rien.`],
  trial_ended: () => ['Version gratuite', `Votre essai s'est terminé le ${dl(trialEnd())}. Vos fiches, vos pages et vos tâches sont conservées.`],
  active: (s) => [`${PLANS[s.plan].name} · actif`, `Prochain prélèvement : ${price(PLANS[s.pending || s.plan].price)} € le ${dl(s.periodEnd)}.${s.pending ? ` Passage à ${PLANS[s.pending].name} à cette date.` : ''}`],
  canceling: (s) => [`${PLANS[s.plan].name} · résilié`, `Vous gardez ${PLANS[s.plan].name} jusqu'au ${dl(s.periodEnd)}. Ensuite, l'application passe en version gratuite : rien n'est effacé.`],
  past_due: (s) => ['Paiement refusé', `Le renouvellement n'a pas pu être prélevé. Vous gardez ${PLANS[s.plan].name} jusqu'au ${dl(s.graceEnd)} : réessayez le paiement d'ici là.`],
  ended: () => ['Version gratuite', 'Votre abonnement est terminé. Vos données sont conservées : vous les retrouvez dès que vous vous réabonnez.'],
};
const TYPE = { paiement: ['Payé', 't-olive'], echec: ['Refusé', 't-rose'], resiliation: ['Résiliation', 't-sand'], reprise: ['Repris', 't-sky'], fin: ['Terminé', 't-grey'], changement: ['Changement', 't-sky'] };

export function plans() {
  const s = S(), b = s.sub, st = billing(), cur = access();
  const subscribed = b.plan !== 'free';
  const [title, text] = s.sub.demo ? ['Mode démonstration', `Affichage ${PLANS[s.sub.demo].name}, activé depuis le compte. Ce n'est pas un abonnement.`] : STATUS[st](b);
  const planBtn = (id) => {
    if (subscribed && b.plan === id) return `<p class="plan-cur">${st === 'canceling' ? `Jusqu'au ${dl(b.periodEnd)}` : 'Votre formule'}</p>`;
    if (subscribed && b.pending === id) return `<p class="plan-cur">Prévue le ${dl(b.periodEnd)}</p>`;
    if (id === 'free') return subscribed ? (st === 'canceling' ? '' : '<button class="btn btn-ghost btn-block" data-act="sub-cancel">Revenir au gratuit</button>') : cur === 'free' ? '<p class="plan-cur">Votre formule</p>' : '';
    if (subscribed) return RANK[id] > RANK[b.plan]
      ? `<button class="btn btn-primary btn-block" data-act="co-open" data-plan="${id}">Passer à ${PLANS[id].name}</button><p class="plan-sub">${price(prorata(id))} € aujourd'hui, au prorata</p>`
      : `<button class="btn btn-ghost btn-block" data-act="sub-down" data-plan="${id}">Passer à ${PLANS[id].name}</button><p class="plan-sub">À partir du ${dl(b.periodEnd)}</p>`;
    return `<button class="btn ${id === 'premium' ? 'btn-sky' : 'btn-primary'} btn-block" data-act="co-open" data-plan="${id}">Choisir ${PLANS[id].name}</button>`;
  };
  const card = (id, k) => `<section class="plan rise ${id === 'premium' ? 'is-dark' : ''} ${id === 'pro' ? 'is-reco' : ''}">${id === 'premium' ? flower(2, 'plan-fl') : ''}
      ${id === 'pro' ? '<span class="plan-tag">Le plus choisi pour démarrer</span>' : ''}
      <header><h2>${PLANS[id].name}</h2><p class="plan-p">${PLANS[id].price ? `<b>${price(PLANS[id].price)} €</b><span>par mois, sans engagement</span>` : '<b>0 €</b><span>pour toujours</span>'}</p></header>
      <ul class="plan-f">${OFFER.filter((r) => r[k + 1] && (k === 0 || r[k] !== r[k + 1])).map((r) => `<li>${ic('check')}<span>${esc(r[0])}${typeof r[k + 1] === 'string' ? ` <em>(${esc(r[k + 1])})</em>` : ''}</span></li>`).join('')}</ul>
      ${id !== 'free' ? `<p class="plan-plus">${id === 'pro' ? 'En plus de la version gratuite' : 'En plus de tout Pro'}</p>` : ''}
      ${planBtn(id)}
    </section>`;
  const hist = b.history || [];
  const html = `${pageHead('Abonnement', { kicker: 'Votre formule, vos paiements, vos limites', back: '#/reglages' })}
    ${isTest() ? `<div class="test-strip rise">${ic('shield')}<p><b>Paiements en mode test.</b> Le paiement en ligne n'est pas encore ouvert : le parcours complet fonctionne, mais aucune carte n'est demandée et aucun argent n'est prélevé.</p></div>` : ''}
    <section class="card status-card st-${st} rise">
      <div class="status-top"><span class="status-ic">${ic(st === 'trial' ? 'hourglass' : st === 'past_due' ? 'bell' : 'diamond')}</span><div><p class="muted-s">Statut actuel</p><h2>${esc(title)}</h2><p>${esc(text)}</p></div></div>
      <div class="act-row">
        ${st === 'free' ? `<button class="btn btn-primary" data-act="start-trial">Essayer tout gratuitement ${TRIAL_DAYS} jours</button>` : ''}
        ${['trial', 'trial_ended', 'ended'].includes(st) ? '<a class="btn btn-primary" href="#plans" data-act="to-plans">Choisir une formule</a>' : ''}
        ${st === 'active' ? '<a class="btn btn-ghost" href="#plans" data-act="to-plans">Changer de formule</a><button class="btn btn-ghost" data-act="sub-cancel">Résilier</button>' : ''}
        ${st === 'active' && b.pending ? '<button class="btn btn-ghost" data-act="sub-keep">Annuler le changement prévu</button>' : ''}
        ${st === 'canceling' ? `<button class="btn btn-primary" data-act="sub-resume">Reprendre l'abonnement</button>` : ''}
        ${st === 'past_due' ? `<button class="btn btn-primary" data-act="sub-retry">Réessayer le paiement</button><button class="btn btn-ghost" data-act="sub-cancel">Résilier</button>` : ''}
      </div>
    </section>
    <h2 class="sec-title" id="plans">Les formules</h2>
    <div class="plans">${['free', 'pro', 'premium'].map(card).join('')}</div>
    <section class="card rise">
      <header class="card-h"><div><h2>Comparer les formules</h2><p>Ce qui est inclus, et les limites de chacune</p></div></header>
      <div class="cmp-wrap"><table class="cmp"><thead><tr><th scope="col"><span class="sr-only">Fonction</span></th>${['free', 'pro', 'premium'].map((id) => `<th scope="col" class="${cur === id ? 'is-cur' : ''}">${PLANS[id].name}</th>`).join('')}</tr></thead>
        <tbody>${OFFER.map((r) => `<tr><th scope="row">${esc(r[0])}</th>${r.slice(1).map((v, k) => `<td class="${cur === ['free', 'pro', 'premium'][k] ? 'is-cur' : ''}">${cell(v)}</td>`).join('')}</tr>`).join('')}
        <tr class="cmp-p"><th scope="row">Prix par mois</th>${['free', 'pro', 'premium'].map((id) => `<td>${PLANS[id].price ? `${price(PLANS[id].price)} €` : '0 €'}</td>`).join('')}</tr></tbody></table></div>
    </section>
    <section class="card rise">
      <header class="card-h"><div><h2>Historique</h2><p>${hist.length ? `${hist.length} opération${hist.length > 1 ? 's' : ''}${isTest() ? ' · reçus de test' : ''}` : 'Aucun paiement pour l\'instant'}</p></div></header>
      ${hist.length ? `<ul class="rows bill">${hist.slice(0, 24).map((h) => `<li><button class="row" data-act="receipt" data-id="${h.id}"><span class="menu-ic">${ic(h.type === 'paiement' ? 'receipt' : h.type === 'echec' ? 'x' : 'refresh')}</span><span class="row-b"><b>${esc(h.label)}</b><span>${dateLong(h.at)}</span></span><span class="row-e">${h.amount ? `<b>${price(h.amount)} €</b>` : ''}<span class="chip ${TYPE[h.type]?.[1] || ''}">${TYPE[h.type]?.[0] || ''}</span></span></button></li>`).join('')}</ul>`
        : '<p class="muted pad">Les paiements, changements de formule et reçus apparaîtront ici.</p>'}
    </section>
    ${isTest() ? `<details class="card test-tools rise"><summary><h2>Tester les paiements</h2>${ic('chevD', 'chev')}</summary>
      <p class="body">Pour vérifier chaque situation sans attendre : faites passer le temps, provoquez un refus de paiement, puis regardez le statut et l'historique ci-dessus.</p>
      <div class="ios-list"><label class="ios-row"><span><b>Le prochain renouvellement sera refusé</b><em>Pour voir le délai de grâce de ${GRACE_DAYS} jours.</em></span><input type="checkbox" class="switch" ${b.failNext ? 'checked' : ''} data-act-change="bill-fail"></label></div>
      <div class="btn-list">
        ${nextBillingEvent() ? `<button class="btn btn-ghost" data-act="bill-time" data-d="next">${ic('calendar')}<span>${st === 'past_due' ? 'Passer à la fin du délai de grâce' : st === 'trial' ? 'Passer à la fin de l\'essai' : `Passer au prochain prélèvement (${dl(b.periodEnd)})`}</span></button>` : ''}
        <button class="btn btn-ghost" data-act="bill-time" data-d="7">${ic('clock')}<span>Avancer d'une semaine</span></button>
        <button class="btn btn-danger-ghost" data-act="bill-reset">${ic('refresh')}<span>Remettre l'abonnement à zéro</span></button>
      </div></details>` : ''}
    <section class="faq">
      <h2 class="sec-title">Questions fréquentes</h2>
      ${[
        ['L\'essai est-il vraiment gratuit ?', `Oui : ${TRIAL_DAYS} jours, toutes les fonctions, sans carte bancaire. À la fin, l'application repasse en version gratuite si vous ne choisissez rien. Rien n'est prélevé automatiquement.`],
        ['Puis-je changer de formule ?', 'Oui, à tout moment. Vers une formule supérieure : tout de suite, vous ne payez que la différence pour les jours restants. Vers une formule inférieure : au début de la période suivante, pour profiter de ce que vous avez payé.'],
        ['Et si j\'arrête ?', 'Les abonnements sont mensuels et sans engagement. Après une résiliation, vous gardez votre formule jusqu\'à la fin du mois payé, puis l\'application passe en version gratuite. Vos données restent.'],
        ['Que se passe-t-il si un paiement échoue ?', `Vous gardez l'accès pendant ${GRACE_DAYS} jours, le temps de réessayer. Sans paiement, l'application repasse en version gratuite, sans rien effacer.`],
        ['Que deviennent mes données en version gratuite ?', `Tout est conservé. Les fonctions payantes se verrouillent, vos fiches et vos pages restent sur l'appareil. Au-delà de ${LIMITS.freePages} pages, vous pouvez modifier les existantes, pas en créer de nouvelles.`],
        ['Où sont stockées mes données ?', 'Sur votre appareil uniquement, pour l\'instant. Pensez à faire une sauvegarde depuis votre compte. Les comptes en ligne et la synchronisation arriveront avec le paiement.'],
        ['Et sur l\'App Store ?', 'La version App Store suivra les règles d\'Apple pour les abonnements vendus dans une application. En attendant, l\'application s\'installe depuis Safari, sur l\'écran d\'accueil.'],
      ].map(([q, a]) => `<details class="obj"><summary><span>${q}</span>${ic('chevD', 'chev')}</summary><p>${a}</p></details>`).join('')}
    </section>`;
  return { title: 'Abonnement', tab: 'plus', html };
}

// ---------- Paiement ----------
export function checkoutSheet(planId) {
  const s = S().sub;
  const p = PLANS[planId];
  const upgrade = s.plan !== 'free';
  const due = upgrade ? prorata(planId) : p.price;
  const next = upgrade ? s.periodEnd : Date.now() + 30 * 864e5;
  if (!navigator.onLine) { toast('Le paiement demande une connexion internet. Vos données, elles, restent accessibles hors ligne.', { title: 'Hors connexion', ms: 4500 }); return; }
  sheet(`${sheetHead(upgrade ? `Passer à ${p.name}` : `S'abonner à ${p.name}`, `${price(p.price)} € par mois, sans engagement`)}
    <div class="sheet-body co" data-plan="${planId}">
      <dl class="co-sum">
        <div><dt>Formule ${p.name}</dt><dd>${price(p.price)} € / mois</dd></div>
        ${upgrade ? `<div><dt>Déjà payé pour ${PLANS[s.plan].name}</dt><dd>déduit au prorata</dd></div>` : ''}
        <div><dt>Prochain prélèvement</dt><dd>${dl(next)}</dd></div>
        <div class="co-tot"><dt>À payer aujourd'hui</dt><dd>${price(due)} €</dd></div>
      </dl>
      ${isTest() ? `<div class="test-strip">${ic('shield')}<p><b>Mode test.</b> Aucune carte n'est demandée et rien n'est prélevé. Choisissez le résultat à simuler.</p></div>` : ''}
      <p class="co-err" role="alert" hidden></p>
      <button class="btn btn-primary btn-block btn-lg" data-act="co-pay" data-plan="${planId}" data-r="ok">${ic('lock')}<span>${isTest() ? `Simuler le paiement de ${price(due)} €` : `Payer ${price(due)} €`}</span></button>
      ${isTest() ? `<div class="sheet-actions"><button class="btn btn-ghost" data-act="co-pay" data-plan="${planId}" data-r="fail">Simuler un refus</button><button class="btn btn-ghost" data-act="co-pay" data-plan="${planId}" data-r="net">Simuler une coupure</button></div>` : ''}
      <p class="sheet-note">Au lancement, le paiement se fera par carte via ${PAYMENTS.provider}, prestataire sécurisé : aucune donnée bancaire ne passera par l'application. Résiliable à tout moment depuis cette page.</p>
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

register({
  'co-open': (b) => checkoutSheet(b.dataset.plan),
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
    const upgrade = S().sub.plan !== 'free';
    const rec = upgrade ? changePlan(planId) : subscribe(planId);
    closeSheet(null, true);
    receiptSheet(rec.id);
    toast(`Toutes les fonctions ${PLANS[planId].name} sont ouvertes.`, { title: upgrade ? 'Formule modifiée' : 'Abonnement activé' });
  },
  receipt: (b) => receiptSheet(b.dataset.id),
  'sub-down': async (b) => {
    const id = b.dataset.plan, s = S().sub;
    if (id === 'free') return;
    if (!await confirmSheet({ title: `Passer à ${PLANS[id].name} ?`, text: `Vous gardez ${PLANS[s.plan].name} jusqu'au ${dl(s.periodEnd)}, puis ${PLANS[id].name} à ${price(PLANS[id].price)} € par mois. Les fonctions ${PLANS[s.plan].name} se verrouilleront à cette date ; vos données restent.`, ok: `Passer à ${PLANS[id].name}` })) return;
    changePlan(id); toast(`Changement prévu le ${dl(s.periodEnd)}`, { title: `Passage à ${PLANS[id].name}` });
  },
  'sub-keep': () => { update((s) => { s.sub.pending = null; }); toast('Changement annulé : votre formule continue.'); },
  'sub-cancel': async () => {
    const s = S().sub;
    if (!await confirmSheet({ title: 'Résilier votre abonnement ?', text: `Vous gardez ${PLANS[s.plan].name} jusqu'au ${dl(s.status === 'past_due' ? s.graceEnd : s.periodEnd)}. Ensuite, l'application passe en version gratuite : vos fiches, pages et tâches sont conservées. Aucun autre prélèvement.`, ok: 'Résilier', danger: true })) return;
    cancelSub(); toast(`Plus aucun prélèvement. Accès ${PLANS[s.plan].name} jusqu'au ${dl(s.periodEnd)}.`, { title: 'Abonnement résilié', action: 'Annuler', onAction: () => resumeSub(), ms: 5000 });
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
