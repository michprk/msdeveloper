// Académie, abonnement, réglages, menu « Plus » et accueil de première ouverture.
import { S, update, can, access, PLANS, TRIAL_DAYS, trialActive, trialLeft, replaceState, resetState, uid } from '../store.js';
import { ic, esc, eur, register, toast, confirmSheet, download, field, input, select, sheet, sheetHead, closeSheet, planBadge, avatar, cap } from '../ui.js';
import { logoMark } from '../icons.js';
import { GUIDES } from '../data/guides.js';
import { SECTORS } from '../data/sectors.js';
import { SERVICES, SERVICE_IDS, scriptCount, typo, CHANNELS, getSector, allSectors } from '../data/scripts.js';
import { demoData, clearDemo } from '../data/demo.js';
import { pageHead, paywall, subscribeSheet, accessLabel } from './common.js';
import { startOnboarding } from './onboarding.js';
import { flower } from './flowers.js';
import { askNotifications, notifSupport, testNotification } from '../notify.js';

const VERSION = '1.1.0';

// ---------- Académie ----------
export function academy() {
  const html = `${pageHead('Académie', { kicker: `${GUIDES.length} guides pratiques` })}
    <p class="lead">La méthode, sans jargon : décrocher des rendez-vous, convaincre, relancer, signer.</p>
    ${(() => {
      const lv = S().profile.niveau || 'debut';
      const path = { debut: ['prendre-rdv', 'etre-attrayant', 'preparer-appel', 'objections'], regulier: ['session', 'horaires', 'relances', 'prix'], expert: ['entonnoir', 'offre', 'avis-google', 'premier-rdv'] }[lv] || [];
      const label = { debut: 'Pour bien démarrer', regulier: 'Pour passer à la vitesse supérieure', expert: 'Pour affiner votre méthode' }[lv];
      return `<section class="card parcours rise"><header class="card-h"><div><h2>Votre parcours</h2><p>${label} · à lire dans l'ordre</p></div><a class="link" href="#/reglages">Niveau</a></header>
        <ol class="pc">${path.map((id) => GUIDES.find((g) => g.id === id)).filter(Boolean).map((g) => `<li><a href="#/academie/${g.id}"><b>${esc(typo(g.title))}</b><span>${g.cat} · ${g.min} min${!g.free && !can('academy') ? ' · Pro' : ''}</span></a></li>`).join('')}</ol></section>`;
    })()}
    <h2 class="sec-title">Tous les guides</h2>
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
    return `<section class="plan rise ${id === 'premium' ? 'is-dark' : ''}">${id === 'premium' ? flower(2, 'plan-fl') : ''}
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
      <div class="form-2">${field('Service principal', select('service', SERVICE_IDS.map((x) => [x, SERVICES[x].label]), p.service))}${field('Votre expérience', select('niveau', [['debut', 'Je débute'], ['regulier', 'J\x27ai déjà prospecté'], ['expert', 'C\x27est mon quotidien']], p.niveau || 'debut'))}</div>
      <div class="field"><span class="field-l">Vos secteurs</span><div class="chips-wrap my-secs">${(p.secteurs || []).map((id) => getSector(id)).filter(Boolean).map((x) => `<span class="chip t-olive">${ic(x.icon)}${esc(x.name)}</span>`).join('') || '<span class="muted-s">Aucun secteur choisi</span>'}<button type="button" class="chip-btn" data-act="sectors-edit">${ic('edit')}Modifier</button></div></div>
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
      <header class="card-h"><div><h2>Notifications</h2><p>${'Notification' in window ? (Notification.permission === 'granted' ? 'Autorisées sur cet appareil' : Notification.permission === 'denied' ? 'Bloquées dans les réglages du navigateur' : 'Pas encore autorisées') : esc(notifSupport().hint)}</p></div></header>
      <div class="ios-list">
        <label class="ios-row"><span>Rappels avant chaque tâche</span><input type="checkbox" class="switch" ${s.prefs.notifs !== false ? 'checked' : ''} data-act-change="pref-switch" data-k="notifs"></label>
      </div>
      <div class="act-row">${'Notification' in window && Notification.permission !== 'granted' ? `<button class="btn btn-ghost" data-act="notif-ask">${ic('bell')}<span>Autoriser les notifications</span></button>` : ''}<button class="btn btn-ghost" data-act="notif-test">${ic('bell')}<span>Tester</span></button></div>
    </section>
    <section class="card rise">
      <header class="card-h"><div><h2>Présentation</h2><p>Pour montrer l'application à un futur client</p></div><a class="link" href="#/abonnement">Formules</a></header>
      <div class="ios-list">
        <label class="ios-row"><span><b>Rejouer l'accueil à chaque ouverture</b><em>Vos clients, eux, ne le voient qu'une fois.</em></span><input type="checkbox" class="switch" ${s.prefs.replayIntro ? 'checked' : ''} data-act-change="pref-switch" data-k="replayIntro"></label>
      </div>
      <button class="btn btn-ghost" data-act="replay-intro">${ic('play')}<span>Revoir l'accueil maintenant</span></button>
      <label class="field"><span class="field-l">Mode démonstration</span>${select('demo', [['', 'Désactivé'], ['pro', 'Afficher comme Pro'], ['premium', 'Afficher comme Premium']], s.sub.demo || '', 'data-act-change="demo-mode"')}<span class="field-h">Affiche toutes les fonctions sans abonnement actif. Formule actuelle : ${esc(accessLabel())}.</span></label>
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

const rr = () => window.dispatchEvent(new Event('ms:rerender'));
register({
  subscribe: (b) => subscribeSheet(b.dataset.plan),
  'pref-switch': (el) => { update((s) => { s.prefs[el.dataset.k] = el.checked; }, { silent: true }); toast(el.checked ? 'Activé' : 'Désactivé', { ms: 1200 }); },
  'replay-intro': () => { startOnboarding(true); location.hash = '#/bienvenue'; },
  'sectors-edit': () => sectorsSheet(),
  'sector-toggle': (b) => {
    update((s) => { const l = s.profile.secteurs || []; s.profile.secteurs = l.includes(b.dataset.id) ? l.filter((x) => x !== b.dataset.id) : [...l, b.dataset.id]; });
    sectorsSheet(true);
  },
  'notif-ask': async () => { const r = await askNotifications(); toast(r === 'granted' ? 'Une notification arrivera avant chaque rappel.' : r === 'unsupported' ? notifSupport().hint : 'Autorisation refusée — modifiable dans les réglages du navigateur.', { title: 'Notifications' }); rr(); },
  'notif-test': () => testNotification(),
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
    resetState(); startOnboarding(); location.hash = '#/bienvenue';
  },
  install: () => installFlow(),
}, {
  profile: (d) => { update((s) => { Object.assign(s.profile, d); }, { silent: true }); toast('Profil enregistré', { ms: 1200 }); },
  offer: (d) => {
    update((s) => { s.profile.service = d.service; s.profile.promesse = d.promesse; s.profile.niveau = d.niveau || s.profile.niveau; SERVICE_IDS.forEach((x) => { s.profile.prix[x] = d[`prix_${x}`]; }); }, { silent: true });
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

function sectorsSheet(refresh = false) {
  const mine = S().profile.secteurs || [];
  const body = `<div class="pick-grid">${allSectors().filter((x) => x.id !== 'toute').map((x) => { const on = mine.includes(x.id); return `<button class="pk ${on ? 'is-on' : ''}" data-act="sector-toggle" data-id="${x.id}" aria-pressed="${on}"><span class="pk-ic">${ic(x.icon)}</span><span class="pk-n">${esc(x.name)}</span><span class="pk-ck">${on ? ic('check') : ''}</span></button>`; }).join('')}</div>`;
  const open = document.querySelector('dialog.sheet[open] .sheet-secs');
  if (refresh && open) { open.innerHTML = body; return; }
  sheet(`${sheetHead('Vos secteurs', 'Ils apparaissent en premier dans les scripts')}<div class="sheet-body sheet-secs">${body}</div>`, { cls: 'sheet-tall' });
}
