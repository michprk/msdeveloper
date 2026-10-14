// Académie, abonnement, réglages, menu « Plus » et accueil de première ouverture.
import { S, update, can, access, PLANS, TRIAL_DAYS, trialActive, trialLeft, replaceState, resetState, uid } from '../store.js';
import { ic, esc, eur, register, toast, confirmSheet, download, field, input, select, sheet, sheetHead, closeSheet, planBadge, avatar, cap } from '../ui.js';
import { logoMark } from '../icons.js';
import { GUIDES } from '../data/guides.js';
import { SECTORS } from '../data/sectors.js';
import { SERVICES, SERVICE_IDS, scriptCount, typo, CHANNELS } from '../data/scripts.js';
import { demoData, clearDemo } from '../data/demo.js';
import { pageHead, paywall, subscribeSheet, accessLabel } from './common.js';

const VERSION = '1.0.0';

// ---------- Académie ----------
export function academy() {
  const html = `${pageHead('Académie', { kicker: `${GUIDES.length} guides pratiques` })}
    <p class="lead">La méthode, sans jargon : décrocher des rendez-vous, convaincre, relancer, signer.</p>
    <div class="guide-grid">${GUIDES.map((g, i) => {
      const locked = !g.free && !can('academy');
      return `<a class="card guide rise" style="--i:${i}" href="#/academie/${g.id}"><span class="guide-k">${g.cat} · ${g.min} min</span><b>${esc(typo(g.title))}</b><span class="guide-p">${esc(typo(g.intro))}</span>${locked ? `<span class="guide-l">${ic('lock')}Pro</span>` : ''}</a>`;
    }).join('')}</div>`;
  return { title: 'Académie', tab: 'plus', html };
}

export function guide([id]) {
  const g = GUIDES.find((x) => x.id === id);
  if (!g) return null;
  const locked = !g.free && !can('academy');
  const i = GUIDES.indexOf(g), next = GUIDES[i + 1];
  const block = ([type, val]) => {
    if (type === 'h') return `<h2>${esc(typo(val))}</h2>`;
    if (type === 'p') return `<p>${esc(typo(val))}</p>`;
    if (type === 'ul' || type === 'ol') return `<${type}>${val.map((x) => `<li>${esc(typo(x))}</li>`).join('')}</${type}>`;
    if (type === 'tip') return `<div class="tip"><p class="tip-k">À retenir</p><p>${esc(typo(val))}</p></div>`;
    if (type === 'say') return `<blockquote class="say">« ${esc(typo(val))} »</blockquote>`;
    if (type === 'sectors') return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Secteur</th><th>Quand appeler</th><th>À éviter</th></tr></thead><tbody>${SECTORS.map((s) => `<tr><td><b>${esc(s.name)}</b></td><td>${esc(typo(s.horaire))}</td><td>${esc(typo(s.eviter))}</td></tr>`).join('')}</tbody></table></div>`;
    return '';
  };
  const html = `${pageHead(esc(typo(g.title)), { kicker: `${g.cat} · ${g.min} min de lecture`, back: '#/academie' })}
    <article class="article rise"><p class="lead">${esc(typo(g.intro))}</p>
      ${locked ? paywall('academy', { compact: true }) : g.body.map(block).join('')}</article>
    ${next && !locked ? `<a class="card next-guide" href="#/academie/${next.id}"><span class="guide-k">Guide suivant</span><b>${esc(typo(next.title))}</b>${ic('arrowR', 'chev')}</a>` : ''}`;
  return { title: g.title, tab: 'plus', html };
}

// ---------- Abonnement ----------
const PLAN_FEATS = {
  free: ['Les scripts d\'appel à froid pour les 23 secteurs et les 3 services', 'Trois guides de l\'Académie', 'Le conseil du jour'],
  pro: ['Le CRM : pipeline et fiches clients illimitées', `Les ${scriptCount()} scripts : répondeur, visite, e-mail, SMS, Instagram, relances, rendez-vous, objections, signature`, 'Le mode appel, avec le résultat enregistré en un geste', 'Agenda, relances et suivi des projets', 'Audit express, messages prêts à envoyer, import de listes', 'L\'Académie complète'],
  premium: ['Les devis imprimables en PDF', 'Vos scripts sur mesure et vos propres secteurs', 'L\'entraînement aux objections', 'Les statistiques détaillées et le meilleur jour pour appeler', 'L\'export CSV de vos fiches'],
};
const price = (n) => n.toFixed(2).replace('.', ',');

export function plans() {
  const s = S(), cur = access();
  const trialUsed = !!s.sub.trialStart;
  const card = (id) => {
    const p = PLANS[id];
    const isCur = s.sub.demo ? cur === id : s.sub.plan === id && !(id === 'free' && trialActive());
    return `<section class="plan rise ${id === 'premium' ? 'is-dark' : ''}">
      <header><h2>${p.name}</h2><p class="plan-p">${p.price ? `<b>${price(p.price)} €</b><span>par mois</span>` : '<b>Gratuit</b>'}</p></header>
      ${id !== 'free' ? `<p class="plan-plus">${id === 'pro' ? 'Tout Découverte, plus :' : 'Tout Pro, plus :'}</p>` : ''}
      <ul class="plan-f">${PLAN_FEATS[id].map((f) => `<li>${ic('check')}<span>${f}</span></li>`).join('')}</ul>
      ${isCur ? '<p class="plan-cur">Votre formule actuelle</p>' : id === 'free' ? '' : `<button class="btn ${id === 'premium' ? 'btn-sky' : 'btn-primary'} btn-block" data-act="subscribe" data-plan="${id}">Choisir ${p.name}</button>`}
    </section>`;
  };
  const html = `${pageHead('Abonnement', { kicker: esc(accessLabel()) })}
    ${!trialUsed ? `<section class="card trial-card rise"><div><h2>${TRIAL_DAYS} jours d'essai gratuit</h2><p>Toutes les fonctions Premium, sans carte bancaire. À la fin, vous choisissez — ou vous continuez en Découverte.</p></div><button class="btn btn-primary" data-act="start-trial">Commencer l'essai</button></section>`
      : trialActive() && s.sub.plan === 'free' ? `<section class="card trial-card rise"><div><h2>Essai en cours</h2><p>Encore ${trialLeft()} jour${trialLeft() > 1 ? 's' : ''} pour tout essayer. Vos données restent sur votre appareil, quoi que vous décidiez.</p></div></section>` : ''}
    <div class="plans">${['free', 'pro', 'premium'].map(card).join('')}</div>
    <section class="faq">
      <h2 class="sec-title">Questions fréquentes</h2>
      ${[
        ['L\'essai est-il vraiment gratuit ?', `Oui : ${TRIAL_DAYS} jours, toutes les fonctions, sans carte bancaire.`],
        ['Que deviennent mes fiches après l\'essai ?', 'Elles restent sur votre appareil. Le CRM se verrouille, mais rien n\'est effacé : vous les retrouvez dès que vous vous abonnez.'],
        ['Puis-je arrêter quand je veux ?', 'Oui, l\'abonnement est mensuel. Vous pouvez aussi passer de Pro à Premium, ou l\'inverse, à tout moment.'],
        ['Où sont stockées mes données ?', 'Sur votre appareil uniquement. Pensez à faire une sauvegarde de temps en temps depuis les réglages.'],
        ['Sur quels appareils ?', 'iPhone, Android, Mac et PC : installez l\'application depuis le navigateur, elle s\'ouvre ensuite comme une application classique.'],
      ].map(([q, a]) => `<details class="obj"><summary><span>${q}</span>${ic('chevD', 'chev')}</summary><p>${a}</p></details>`).join('')}
    </section>`;
  return { title: 'Abonnement', tab: 'plus', html };
}

// ---------- Réglages ----------
export function settings() {
  const s = S(), p = s.profile, g = s.goals;
  const theme = s.prefs.theme, motion = s.prefs.motion;
  const html = `${pageHead('Réglages')}
    <form class="card form rise" data-form="profile" data-autosave>
      <header class="card-h"><div><h2>Votre profil</h2><p>Repris dans les scripts, les messages et les devis</p></div></header>
      <div class="form-2">${field('Prénom', input('prenom', p.prenom, 'autocomplete="given-name"'))}${field('Société', input('societe', p.societe, 'autocomplete="organization"'))}</div>
      <div class="form-2">${field('Ville', input('ville', p.ville))}${field('Téléphone', input('tel', p.tel, 'type="tel" autocomplete="tel"'))}</div>
      <div class="form-2">${field('E-mail', input('email', p.email, 'type="email" autocomplete="email"'))}${field('Adresse', input('adresse', p.adresse, 'autocomplete="street-address"'))}</div>
      <div class="form-2">${field('N° d\'entreprise / TVA', input('tva', p.tva, 'placeholder="BE0123.456.789"'))}${field('IBAN (devis)', input('iban', p.iban, 'placeholder="BE.."'))}</div>
    </form>
    <form class="card form rise" data-form="offer" data-autosave>
      <header class="card-h"><div><h2>Votre offre</h2><p>Les prix « à partir de » cités dans les scripts</p></div></header>
      ${field('Service principal', select('service', SERVICE_IDS.map((x) => [x, SERVICES[x].label]), p.service))}
      <div class="form-3">${SERVICE_IDS.map((x) => field(SERVICES[x].short, input(`prix_${x}`, p.prix[x]))).join('')}</div>
      ${field('Votre promesse', `<textarea class="inp" name="promesse" rows="2">${esc(p.promesse)}</textarea>`, 'Une phrase qui rassure : prix fixe, délai garanti, interlocuteur unique…')}
    </form>
    <form class="card form rise" data-form="goals" data-autosave>
      <header class="card-h"><div><h2>Objectifs</h2></div></header>
      <div class="form-3">${field('Appels par jour', input('appelsJour', g.appelsJour, 'type="number" min="1"'))}${field('RDV par semaine', input('rdvSemaine', g.rdvSemaine, 'type="number" min="0"'))}${field('Signé par mois (€)', input('caMois', g.caMois, 'type="number" min="0" step="50"'))}</div>
    </form>
    <section class="card rise" id="catalogue">
      <header class="card-h"><div><h2>Catalogue de prestations</h2><p>Utilisé par l'outil Devis</p></div><button class="link" data-act="cat-add">${ic('plus')}Ajouter</button></header>
      <ul class="cat">${s.catalogue.map((c) => `<li><input class="inp" value="${esc(c.label)}" aria-label="Prestation" data-act-change="cat-edit" data-id="${c.id}" data-k="label"><input class="inp price" type="number" min="0" value="${c.price}" aria-label="Prix" data-act-change="cat-edit" data-id="${c.id}" data-k="price"><label class="mini-check"><input type="checkbox" ${c.monthly ? 'checked' : ''} data-act-change="cat-edit" data-id="${c.id}" data-k="monthly"><span>/mois</span></label><button class="icon-btn sm" data-act="cat-del" data-id="${c.id}" aria-label="Supprimer">${ic('x')}</button></li>`).join('')}</ul>
    </section>
    <section class="card rise">
      <header class="card-h"><div><h2>Apparence</h2></div></header>
      <p class="field-l">Thème</p>
      <nav class="seg seg-sm">${[['light', 'Clair', 'sun'], ['dark', 'Sombre', 'moon'], ['auto', 'Automatique', 'refresh']].map(([v, l, i]) => `<button class="seg-i ${theme === v ? 'is-on' : ''}" data-act="pref" data-k="theme" data-v="${v}">${ic(i)}<span>${l}</span></button>`).join('')}</nav>
      <p class="field-l">Animations</p>
      <nav class="seg seg-sm">${[['full', 'Complètes'], ['reduce', 'Réduites']].map(([v, l]) => `<button class="seg-i ${motion === v ? 'is-on' : ''}" data-act="pref" data-k="motion" data-v="${v}">${l}</button>`).join('')}</nav>
    </section>
    <section class="card rise">
      <header class="card-h"><div><h2>Installer l'application</h2><p>Sur l'écran d'accueil du téléphone, dans le Dock du Mac ou sur le bureau du PC</p></div></header>
      <button class="btn btn-ghost" data-act="install">${ic('install')}<span>Installer M&amp;S Developer</span></button>
    </section>
    <section class="card rise">
      <header class="card-h"><div><h2>Abonnement</h2><p>${esc(accessLabel())}</p></div><a class="link" href="#/abonnement">Formules</a></header>
      <label class="field"><span class="field-l">Mode démonstration</span>${select('demo', [['', 'Désactivé'], ['pro', 'Afficher comme Pro'], ['premium', 'Afficher comme Premium']], s.sub.demo || '', 'data-act-change="demo-mode"')}<span class="field-h">Pour présenter l'application à un client sans abonnement actif.</span></label>
    </section>
    <section class="card rise">
      <header class="card-h"><div><h2>Vos données</h2><p>Enregistrées sur cet appareil uniquement</p></div></header>
      <div class="btn-list">
        <button class="btn btn-ghost" data-act="backup">${ic('download')}<span>Sauvegarder (fichier)</span></button>
        <label class="btn btn-ghost">${ic('upload')}<span>Restaurer une sauvegarde</span><input type="file" accept="application/json,.json" hidden data-act-change="restore"></label>
        <button class="btn btn-ghost" data-act="export-csv">${ic('list')}<span>Exporter les fiches (CSV)</span>${can('export') ? '' : '<span class="badge b-premium">Premium</span>'}</button>
        ${s.prospects.some((x) => x.demo) ? `<button class="btn btn-ghost" data-act="clear-demo">${ic('x')}<span>Effacer les exemples</span></button>` : `<button class="btn btn-ghost" data-act="load-demo">${ic('plus')}<span>Ajouter les exemples</span></button>`}
        <button class="btn btn-danger-ghost" data-act="wipe">${ic('trash')}<span>Tout effacer</span></button>
      </div>
    </section>
    <p class="about">M&amp;S Developer ${VERSION} · ${scriptCount()} scripts · conçu à Bruxelles par M&amp;S Design</p>`;
  return { title: 'Réglages', tab: 'plus', html };
}

// ---------- Plus (mobile) ----------
export function more() {
  const s = S(), p = s.profile;
  const items = [
    ['#/appel', 'headset', 'Session d\'appels', 'Le script et la liste, en un seul écran'],
    ['#/projets', 'folder', 'Projets', 'Clients signés en production'],
    ['#/outils', 'briefcase', 'Outils', 'Devis, messages, audit, statistiques'],
    ['#/academie', 'book', 'Académie', 'La méthode, guide par guide'],
    ['#/abonnement', 'diamond', 'Abonnement', accessLabel()],
    ['#/reglages', 'sliders', 'Réglages', 'Profil, offre, objectifs, données'],
  ];
  const html = `${pageHead('Plus')}
    <a class="card me rise" href="#/reglages">${avatar(p.prenom || 'M S', 'lg')}<span class="row-b"><b>${esc(p.prenom || 'Votre profil')}</b><span>${esc(p.societe || 'Ajoutez votre société')}</span></span>${planBadge()}</a>
    <ul class="menu card rise">${items.map(([h, i, t, d]) => `<li><a class="row" href="${h}"><span class="menu-ic">${ic(i)}</span><span class="row-b"><b>${t}</b><span>${esc(d)}</span></span>${ic('chevR', 'chev')}</a></li>`).join('')}
      <li><button class="row" data-act="install"><span class="menu-ic">${ic('install')}</span><span class="row-b"><b>Installer l'application</b><span>Sur l'écran d'accueil</span></span>${ic('chevR', 'chev')}</button></li></ul>`;
  return { title: 'Plus', tab: 'plus', html };
}

// ---------- Première ouverture ----------
const ob = { step: 0, prenom: '', societe: '', ville: 'Bruxelles', service: 'site', appels: 40, demo: true };
const SLIDES = [
  { k: 'Scripts', t: 'Le bon script, pour chaque client', p: `${scriptCount()} scripts écrits pour 23 secteurs — fleuriste, restaurant, garage, avocat… — et pour ce que vous vendez : site web, automatisation ou référencement.`, art: 'script' },
  { k: 'Mode appel', t: 'Pendant l\'appel, vous savez quoi dire', p: 'Le script défile étape par étape, les objections sont à portée de doigt, et le résultat s\'enregistre dans votre CRM en un geste.', art: 'call' },
  { k: 'CRM', t: 'Tous vos prospects dans la poche', p: 'Pipeline, fiches, relances datées, devis et statistiques : vous savez toujours qui rappeler, et quand.', art: 'crm' },
];
const art = (k) => {
  if (k === 'script') return `<div class="art art-script"><span class="a-l a-v"></span><span class="a-l a-p"></span><span class="a-l a-v w2"></span><span class="a-l a-tip"></span></div>`;
  if (k === 'call') return `<div class="art art-call"><span class="a-ring"></span><span class="a-pills"><i></i><i class="on"></i><i></i></span><span class="a-outs"><i></i><i></i><i class="on"></i></span></div>`;
  return `<div class="art art-crm">${[3, 2, 4].map((n, c) => `<span class="a-col">${'<i></i>'.repeat(n)}</span>`).join('')}</div>`;
};

export function onboarding() {
  const st = ob.step;
  let body = '';
  if (st === 0) {
    body = `<div class="ob-hero">${logoMark('xl draw')}<h1 class="ob-name"><span>M&amp;S</span> Developer</h1><p class="ob-tag">Les scripts, le CRM et la méthode pour décrocher des clients — dans votre poche.</p></div>
      <div class="ob-foot"><button class="btn btn-primary btn-block btn-lg" data-act="ob-next">Commencer</button><p class="ob-small">Par M&amp;S Design, studio web à Bruxelles</p></div>`;
  } else if (st <= SLIDES.length) {
    const sl = SLIDES[st - 1];
    body = `<div class="ob-slide" key="${st}">${art(sl.art)}<p class="ob-k">${sl.k}</p><h1>${sl.t}</h1><p>${sl.p}</p></div>
      <div class="ob-foot"><div class="ob-dots">${SLIDES.map((x, i) => `<i class="${i === st - 1 ? 'on' : ''}"></i>`).join('')}</div>
      <button class="btn btn-primary btn-block btn-lg" data-act="ob-next">Continuer</button><button class="link center" data-act="ob-skip">Passer</button></div>`;
  } else if (st === SLIDES.length + 1) {
    body = `<form class="ob-form" data-form="ob-profile">
      <h1>Faisons connaissance</h1><p class="ob-p">Ces informations remplissent vos scripts automatiquement. Modifiables à tout moment.</p>
      <div class="form-2">${field('Votre prénom', input('prenom', ob.prenom, 'autocomplete="given-name" required'))}${field('Votre société', input('societe', ob.societe, 'autocomplete="organization" placeholder="M&S Design"'))}</div>
      ${field('Votre ville', input('ville', ob.ville))}
      <fieldset class="field"><legend class="field-l">Ce que vous vendez surtout</legend><div class="pick">${SERVICE_IDS.map((x) => `<label class="pick-i"><input type="radio" name="service" value="${x}" ${ob.service === x ? 'checked' : ''}><span>${ic(SERVICES[x].icon)}${SERVICES[x].label}</span></label>`).join('')}</div></fieldset>
      <fieldset class="field"><legend class="field-l">Objectif d'appels par jour</legend><div class="pick pick-row">${[20, 40, 60].map((n) => `<label class="pick-i"><input type="radio" name="appels" value="${n}" ${ob.appels === n ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div></fieldset>
      <div class="ob-foot"><button class="btn btn-primary btn-block btn-lg" type="submit">Continuer</button></div>
    </form>`;
  } else {
    body = `<div class="ob-plan">
      <h1>${ob.prenom ? `${esc(cap(ob.prenom))}, essayez tout` : 'Essayez tout'} pendant ${TRIAL_DAYS} jours</h1>
      <p class="ob-p">CRM, mode appel, les ${scriptCount()} scripts et tous les outils. Sans carte bancaire.</p>
      <ul class="ob-prices"><li><b>Pro</b><span>${price(PLANS.pro.price)} € / mois</span></li><li><b>Premium</b><span>${price(PLANS.premium.price)} € / mois</span></li></ul>
      <label class="check"><input type="checkbox" ${ob.demo ? 'checked' : ''} data-act-change="ob-demo"><span>Ajouter des entreprises d'exemple pour découvrir l'application</span></label>
      <div class="ob-foot"><button class="btn btn-primary btn-block btn-lg" data-act="ob-finish" data-trial="1">Commencer l'essai gratuit</button><button class="btn btn-ghost btn-block" data-act="ob-finish" data-trial="0">Continuer en version Découverte</button></div>
    </div>`;
  }
  const html = `<div class="ob">${st > 0 ? `<button class="ob-back icon-btn" data-act="ob-back" aria-label="Retour">${ic('chevL')}</button>` : ''}<div class="ob-in" data-step="${st}">${body}</div></div>`;
  return { title: 'Bienvenue', full: true, html };
}

const rr = () => window.dispatchEvent(new Event('ms:rerender'));
register({
  'ob-next': () => { ob.step++; rr(); },
  'ob-back': () => { ob.step = Math.max(0, ob.step - 1); rr(); },
  'ob-skip': () => { ob.step = SLIDES.length + 1; rr(); },
  'ob-demo': (el) => { ob.demo = el.checked; },
  'ob-finish': (b) => {
    const trial = b.dataset.trial === '1';
    update((s) => {
      s.profile.prenom = ob.prenom.trim(); s.profile.societe = ob.societe.trim(); s.profile.ville = ob.ville.trim() || 'Bruxelles';
      s.profile.service = ob.service; s.goals.appelsJour = Number(ob.appels) || 40;
      if (trial && !s.sub.trialStart) s.sub.trialStart = Date.now();
      if (ob.demo && !s.prospects.some((x) => x.demo)) { const d = demoData(); s.prospects.push(...d.prospects); s.activities.push(...d.activities); s.tasks.push(...d.tasks); s.projects.push(...d.projects); }
      s.onboarded = true;
    });
    location.hash = '#/';
    if (trial) setTimeout(() => toast(`Essai gratuit activé : ${TRIAL_DAYS} jours, toutes les fonctions.`), 400);
  },
  subscribe: (b) => subscribeSheet(b.dataset.plan),
  pref: (b) => { update((s) => { s.prefs[b.dataset.k] = b.dataset.v; }); },
  'demo-mode': (el) => { update((s) => { s.sub.demo = el.value || null; }); toast(el.value ? `Affichage ${PLANS[el.value].name} activé` : 'Mode démonstration désactivé'); },
  'cat-add': () => update((s) => { s.catalogue.push({ id: uid(), label: 'Nouvelle prestation', price: 0 }); }),
  'cat-del': (b) => update((s) => { s.catalogue = s.catalogue.filter((c) => c.id !== b.dataset.id); }),
  'cat-edit': (el) => update((s) => {
    const c = s.catalogue.find((x) => x.id === el.dataset.id); if (!c) return;
    const k = el.dataset.k; c[k] = k === 'price' ? Number(el.value) || 0 : k === 'monthly' ? el.checked : el.value;
  }, { silent: true }),
  backup: () => { download(`msdeveloper-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(S(), null, 1)); toast('Sauvegarde téléchargée'); },
  restore: async (el) => {
    const f = el.files?.[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data || !Array.isArray(data.prospects)) throw new Error('format');
      if (!await confirmSheet({ title: 'Restaurer cette sauvegarde ?', text: 'Les données actuelles de cet appareil seront remplacées.', ok: 'Restaurer', danger: true })) return;
      replaceState({ ...data, onboarded: true }); toast('Sauvegarde restaurée');
    } catch (e) { toast('Ce fichier n\'est pas une sauvegarde M&S Developer'); }
  },
  'export-csv': () => {
    if (!can('export')) { location.hash = '#/abonnement'; return; }
    const cols = ['entreprise', 'contact', 'tel', 'email', 'ville', 'adresse', 'site', 'instagram', 'secteur', 'service', 'stage', 'valeur', 'source', 'notes'];
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [cols.join(';'), ...S().prospects.map((p) => cols.map((c) => q(p[c])).join(';'))];
    download(`msdeveloper-fiches-${new Date().toISOString().slice(0, 10)}.csv`, '﻿' + rows.join('\r\n'), 'text/csv;charset=utf-8');
  },
  'load-demo': () => { update((s) => { const d = demoData(); s.prospects.push(...d.prospects); s.activities.push(...d.activities); s.tasks.push(...d.tasks); s.projects.push(...d.projects); }); toast('Exemples ajoutés'); },
  wipe: async () => {
    if (!await confirmSheet({ title: 'Tout effacer ?', text: 'Fiches, historique, tâches, scripts personnels et réglages seront supprimés de cet appareil. Faites une sauvegarde avant si besoin.', ok: 'Tout effacer', danger: true })) return;
    resetState(); location.hash = '#/bienvenue'; Object.assign(ob, { step: 0 });
  },
  install: () => installFlow(),
}, {
  'ob-profile': (d) => { ob.prenom = d.prenom || ''; ob.societe = d.societe || ''; ob.ville = d.ville || ''; ob.service = d.service || 'site'; ob.appels = Number(d.appels) || 40; ob.step++; rr(); },
  profile: (d) => { update((s) => { Object.assign(s.profile, d); }, { silent: true }); toast('Profil enregistré', { ms: 1200 }); },
  offer: (d) => {
    update((s) => { s.profile.service = d.service; s.profile.promesse = d.promesse; SERVICE_IDS.forEach((x) => { s.profile.prix[x] = d[`prix_${x}`]; }); }, { silent: true });
    toast('Offre enregistrée', { ms: 1200 });
  },
  goals: (d) => { update((s) => { s.goals = { appelsJour: Number(d.appelsJour) || 40, rdvSemaine: Number(d.rdvSemaine) || 0, caMois: Number(d.caMois) || 0 }; }, { silent: true }); toast('Objectifs enregistrés', { ms: 1200 }); },
});

export function installFlow() {
  const ev = window.__installPrompt;
  if (ev) { ev.prompt(); ev.userChoice.finally(() => { window.__installPrompt = null; }); return; }
  if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) { toast('L\'application est déjà installée sur cet appareil.'); return; }
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const mac = /Macintosh/.test(ua) && !ios;
  const safari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
  const steps = ios
    ? ['Ouvrez cette page dans Safari.', 'Touchez le bouton Partager (le carré avec une flèche).', 'Choisissez « Sur l\'écran d\'accueil », puis « Ajouter ».']
    : mac && safari ? ['Dans la barre de menus, ouvrez « Fichier ».', 'Choisissez « Ajouter au Dock ».', 'L\'application s\'ouvre ensuite depuis le Dock, dans sa propre fenêtre.']
      : ['Ouvrez le menu du navigateur (⋮ ou …).', 'Choisissez « Installer l\'application » ou « Ajouter à l\'écran d\'accueil ».', 'L\'application s\'ouvre ensuite dans sa propre fenêtre.'];
  sheet(`${sheetHead('Installer M&amp;S Developer', ios ? 'iPhone et iPad' : mac ? 'Mac' : 'Android, PC et Mac')}<div class="sheet-body"><ol class="install-steps">${steps.map((x) => `<li>${x}</li>`).join('')}</ol></div>`, { cls: 'sheet-sm' });
}
export { CHANNELS, eur, closeSheet };
