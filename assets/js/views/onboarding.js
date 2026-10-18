// Accueil de première ouverture.
// 1. L'accroche : l'application sur un Mac et un iPhone  2. La présentation (cinq écrans, facultative)
// 3. Le compte : prénom, e-mail, mot de passe, en solo ou en équipe  4. La situation  5. Ce qui aiderait le plus
// 6. La formule : essai gratuit de 7 jours avec moyen de paiement (rien n'est prélevé avant la fin).
// Rejouable par le propriétaire (Compte → Outils de présentation) sans toucher aux données.
// Plus l'écran de connexion (#/connexion), dans le même décor.
import { S, update, PLANS, TRIAL_DAYS, MODULES, addTask, startOfDay, DAY, billing, resetState } from '../store.js';
import { ic, esc, register, toast, sheet, sheetHead, closeSheet, cap, field, input, busy, confirmSheet, dateLong } from '../ui.js';
import { logoMark } from '../icons.js';
import { SERVICES, SERVICE_IDS } from '../data/scripts.js';
import { PRESETS, preset } from '../data/presets.js';
import { askNotifications, notifSupport } from '../notify.js';
import { PITCH } from './common.js';
import { applyPreset } from './crm.js';
import { cloudReady, cloudMessage } from '../cloud.js';
import { hasAccount, loggedIn, createAccount, login, validEmail, passwordIssue } from '../auth.js';
import { pwField } from './account.js';
import { checkoutSheet, PLAN_FOR } from './billing.js';
import { sparkline } from '../charts.js';

const STEPS = ['welcome', 'tour', 'account', 'you', 'goals', 'plan'];
const ob = { i: 0, dir: 1, anim: true, replay: false, d: null, slide: 0, toured: false };
const price = (n) => n.toFixed(2).replace('.', ',');
const dl = (t) => dateLong(t).toLowerCase();

const SITUATIONS = [
  ['etudes', 'Études, révisions', 'Cours, examens, mémoire', 'book', ''],
  ['salarie', 'Salarié·e', 'Bureau, réunions, dossiers', 'building', ''],
  ['dev', 'Code, développement', 'Applications, sites, projets', 'monitor', ''],
  ['finance', 'Finance, comptabilité', 'Dossiers, échéances, budgets', 'euro', 'b2b'],
  ['freelance', 'À mon compte', 'Freelance, profession libérale', 'user', 'freelance'],
  ['commerce', 'Commerce, restaurant', 'Boutique, café, salon…', 'store', 'commerce'],
  ['artisan', 'Artisanat, travaux', 'Chantiers, dépannage, atelier', 'hammer', 'artisan'],
  ['conseil', 'Conseil, coaching, soin', 'Séances, accompagnements', 'compass', 'coach'],
  ['agence', 'Agence ou petite équipe', 'Web, communication, studio', 'briefcase', 'agence'],
  ['autre', 'Juste m\'organiser', 'Maison, projets perso, tout le reste', 'grid', ''],
];
const DEFIS = [
  ['oublier', 'Ne plus rien oublier', 'Tâches, rappels, notifications', 'bell', ['organiser']],
  ['projets', 'Mener mes projets à bout', 'Tâches reliées, progression', 'folder', ['organiser']],
  ['reviser', 'Réviser mes cours', 'Planning, fiches, révision espacée', 'book', ['organiser', 'etudes', 'apprendre']],
  ['examens', 'Réussir mes examens', 'Emploi du temps, examens, moyennes', 'target', ['organiser', 'etudes']],
  ['temps', 'Mieux organiser mes journées', 'Priorités, plan de la semaine', 'calendar', ['organiser']],
  ['idees', 'Ranger mes idées et mes notes', 'Pages, modèles, sous-pages', 'page', ['organiser']],
  ['clients', 'Suivre mes clients et mes devis', 'Un CRM à mon métier', 'users', ['clients']],
  ['trouver', 'Trouver de nouveaux clients', 'Scripts d\'appel, mode appel', 'phone', ['clients', 'prospecter']],
  ['progresser', 'Apprendre et progresser', 'Quiz et guides pratiques', 'quiz', ['apprendre']],
];
const SUGG = {
  oublier: ['Noter tout ce que j\'ai en tête', 0],
  projets: ['Créer mon premier projet et ses étapes', 0],
  reviser: ['Ajouter mes matières et mes examens', 0],
  examens: ['Remplir mon emploi du temps', 0],
  temps: ['Préparer ma semaine (modèle « Plan de la semaine »)', 0],
  idees: ['Ranger mes idées dans une page', 0],
  clients: ['Ajouter mes clients en cours', 0],
  trouver: ['Lister 10 entreprises à contacter', 1],
  progresser: ['Faire le quiz du jour', 0],
};
// Ce que chaque formule apporte, en quatre lignes
const FEATS = {
  pro: ['Notes et tableaux blancs illimités', 'Emploi du temps, examens et moyennes', 'Révision espacée, concentration, minuteur', 'Projets illimités et connecteurs'],
  premium: ['Tout Pro, pour les études', 'Un CRM adapté à votre métier', 'Devis, scripts d\'appel et mode appel', 'Statistiques et exports'],
};
const BUSINESS = ['finance', 'freelance', 'commerce', 'artisan', 'conseil', 'agence'];
// Études seulement : aucun module d'entrepreneuriat (clients, scripts, appels)
const SCHOOL = (sit) => sit === 'etudes';
const defisFor = (sit) => (SCHOOL(sit) ? DEFIS.filter(([id]) => !['clients', 'trouver'].includes(id)) : DEFIS);
const modulesFor = (defis, sit = '') => {
  const mods = ['organiser', 'etudes', 'clients', 'prospecter', 'apprendre'].filter((m) => m === 'organiser' || DEFIS.some(([id, , , , ms]) => defis.includes(id) && ms.includes(m)));
  return SCHOOL(sit) ? [...new Set(['organiser', 'etudes', ...mods])].filter((m) => !['clients', 'prospecter'].includes(m)) : mods;
};
const advised = (d) => (d.defis.includes('clients') || d.defis.includes('trouver') || BUSINESS.includes(d.situation) ? 'premium' : 'pro');

function data() {
  if (!ob.d) {
    const p = S().profile;
    ob.d = { email: S().account?.email || p.email || '', acc: hasAccount() && loggedIn() ? 'done' : '', prenom: p.prenom || '', societe: p.societe || '', situation: p.situation || '', equipe: p.equipe || 'solo', team: p.team || '', defis: [...(p.defis || [])], metier: p.metier || S().crm.preset || '', service: p.service || 'offre', sugg: {}, plan: '' };
  }
  return ob.d;
}
export function startOnboarding(replay = false) { ob.i = 0; ob.dir = 1; ob.anim = true; ob.replay = replay; ob.d = null; ob.slide = 0; ob.toured = false; }
// Après une connexion sur un appareil où l'accueil n'a pas été fait : on reprend après le compte
export function resumeOnboarding() { startOnboarding(); ob.i = STEPS.indexOf('you'); }
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

      <p class="phone-date">${cap(new Intl.DateTimeFormat('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()))}</p>
      <p class="phone-time">9:41</p>
      <div class="phone-notes">${notes.map(([t, b, w], k) => `<div class="inote" style="--k:${k}">
        <span class="inote-ic">${logoMark('sm')}</span>
        <div class="inote-b"><p class="inote-h"><span>MindView</span><span>${w}</span></p><p class="inote-t">${t}</p><p>${b}</p></div></div>`).join('')}</div>
    </div>
  </div>`;
}

// L'application sur un MacBook et un iPhone (vraies captures de la vue d'ensemble)
export function devices(cls = '') {
  return `<div class="dv ${cls}" aria-hidden="true">
    <div class="dv-mac"><div class="dv-mac-scr"><span class="dv-cam"></span><img src="assets/img/hero-mac.webp" width="1440" height="900" alt="" decoding="async" fetchpriority="high"></div><div class="dv-mac-base"><i></i></div></div>
    <div class="dv-phone"><div class="dv-phone-scr"><span class="dv-island"></span><p class="dv-status"><b>9:41</b><i></i></p><img src="assets/img/hero-phone.webp" width="390" height="844" alt="" decoding="async"></div></div>
  </div>`;
}
const brand = () => `<span class="wl-brand">${logoMark('sm')}<span>Mind<b>View</b></span></span>`;

// ---------- Présentation : cinq écrans illustrés ----------
const mkRow = (t, m, cls = '') => `<div class="mk-row"><i class="tick ${cls.includes('done') ? 'is-done' : ''}"></i><span><b class="${cls}">${t}</b><em class="${cls.includes('late') ? 'late' : ''}">${m}</em></span></div>`;
const SLIDES = [
  ['Votre journée sur un écran', 'Les urgences d\'abord, puis le reste. Écrivez « Réviser le chapitre 3 demain 18h » : la date et l\'heure se règlent toutes seules.',
    `<div class="mock"><p class="mk-k">Aujourd'hui</p><p class="mk-h">3 choses à faire</p><div class="mk-in">${ic('plus')}Réviser le chapitre 3 demain 18h</div>
      ${mkRow('Rendre le devoir de maths', 'En retard · hier', 'late')}${mkRow('Appeler le dentiste', 'Fait · 10 h', 'done')}${mkRow('Préparer la réunion', '14 h · Travail')}</div>`],
  ['Des notes que vous mettez en forme', 'Polices, couleurs, surligneur, souligné rouge, encadrés, et un stylo pour dessiner directement sur la page. Plus un tableau blanc sans limite.',
    `<div class="mock mk-page"><span class="mk-pic">${ic('cards')}</span><p class="mk-title">Cours — la Révolution</p><p class="mk-h2">L'essentiel</p>
      <p class="mk-li"><mark class="mk-hl">Prise de la Bastille : 14 juillet 1789</mark></p><p class="mk-li"><span class="mk-red">États généraux</span> en mai 1789</p><p class="mk-h2">À réviser</p>${mkRow('Les dates clés', 'Quiz demain', '')}</div>`],
  ['Vos études, vos projets, vos clients', 'Examens avec compte à rebours, projets qui avancent tout seuls, et un CRM si vous avez des clients : chacun n\'affiche que ce qui lui sert.',
    `<div class="mock mk-trio"><span class="mk-t"><b>J−9</b><em>Examen d'histoire</em></span><span class="mk-t"><b>60 %</b><em>Projet : site du club</em></span><span class="mk-t"><b>✓</b><em>Devis accepté</em></span></div>`],
  ['Des chiffres qui motivent', 'Tâches terminées, minutes de travail, cartes révisées : votre progression, semaine après semaine.',
    `<div class="mock mk-stats"><div class="kpi2 k-olive"><span class="kpi2-h"><span class="kpi2-l">Tâches terminées</span><span class="kpi2-ic">${ic('checkSquare')}</span></span><span class="kpi2-v">24</span><span class="kpi2-d up">${ic('arrowR', 'up-ic')}<b>18 %</b><span>vs semaine dernière</span></span>${sparkline([2, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 8])}</div>
      <div class="mk-donut"><span class="mk-ring"></span><ul><li><i class="sw c1"></i>École</li><li><i class="sw c2"></i>Travail</li><li><i class="sw c3"></i>Personnel</li></ul></div></div>`],
  ['Concentrez-vous, puis révisez', 'Minuteur à la durée de votre choix, chronomètre, calculatrice, et vos notes qui deviennent des cartes de révision, au bon moment.',
    `<div class="mock"><p class="mk-k">Concentration</p><p class="mk-q">Réviser la cellule · 25 min</p>
      <span class="mk-opt ok">${ic('clock')}Minuteur personnalisé</span><span class="mk-opt">${ic('calculator')}Calculatrice</span><span class="mk-opt">${ic('cards')}Cartes de révision</span></div>`],
];

// ---------- Écran 1 : l'accroche, dans le décor Mac + iPhone ----------
function welcome() {
  return `<div class="wl">
    <header class="wl-top">${brand()}
      ${ob.replay ? '<button class="wl-link" data-act="ob-quit">Fermer</button>' : '<a class="wl-link" href="#/connexion">Se connecter</a>'}</header>
    <div class="wl-grid">
      <div class="wl-head">
        <p class="wl-tags"><span>Simple</span><span>Complet</span><span>Pour les études et le travail</span></p>
        <h1 class="wl-h">Votre espace de travail <em>tout-en-un</em></h1>
        <p class="wl-p">Tâches, notes, tableau blanc, examens et projets réunis dans une seule application. Sur l'ordinateur comme sur le téléphone.</p>
      </div>
      ${devices()}
      <div class="wl-act">
        <div class="wl-cta"><button class="wl-b1" data-act="ob-signup">Créer mon compte</button><button class="wl-b2" data-act="ob-next">${ic('play')}<span>Découvrir la présentation</span></button></div>
        <button class="wl-note" data-act="ob-privacy">${ic('lock')}<span>${TRIAL_DAYS} jours d'essai, annulables en un clic. Vos données restent sur votre appareil. <u>En savoir plus</u></span></button>
      </div>
    </div>
  </div>`;
}

export function onboarding() {
  const d = data();
  const step = STEPS[ob.i];
  if (step === 'welcome') { ob.anim = true; return { title: 'Bienvenue', full: 'hero', html: welcome() }; }
  let body = '';
  const back = ob.i > 0;

  if (step === 'tour') {
    ob.toured = true;
    body = `<div class="ob-page ob-tour-p">
        <div class="tour" tabindex="0" aria-roledescription="carrousel" aria-label="Présentation de l'application">${SLIDES.map(([t, p, m], k) => `<section class="tour-s" aria-roledescription="diapositive" aria-label="${k + 1} sur ${SLIDES.length}"><div class="tour-m">${m}<span class="tag tour-tag">Exemple</span></div><h2 class="ob-h">${t}</h2><p class="ob-p">${p}</p></section>`).join('')}</div>
        <div class="tour-dots" role="tablist" aria-label="Diapositives">${SLIDES.map((_, k) => `<button class="${k === ob.slide ? 'on' : ''}" data-act="ob-slide" data-k="${k}" aria-label="Diapositive ${k + 1}"></button>`).join('')}</div>
      </div>
      <div class="ob-foot">
        <button class="btn btn-apple" data-act="ob-tour-next">${ob.slide < SLIDES.length - 1 ? 'Suivant' : 'Créer mon compte'}</button>
        <button class="btn-text" data-act="ob-next">Passer la présentation</button>
      </div>`;
  } else if (step === 'account') {
    // Un vrai compte : prénom, e-mail, mot de passe. Et la façon de travailler, en solo ou en équipe.
    const done = d.acc === 'done';
    const modes = [['solo', 'En solo', 'Mes études, mes projets, mon organisation', 'user'], ['equipe', 'En équipe', 'Projets et clients partagés avec mes associés', 'users']];
    body = `<form class="ob-page ob-acc" data-form="ob-account" id="ob-form" novalidate>
        <span class="ob-acc-ic">${ic(done ? 'checkCircle' : 'user')}</span>
        <h1 class="ob-h">${done ? 'Votre compte est prêt' : 'Créez votre compte'}</h1>
        <p class="ob-p">${done ? `Vous vous connectez avec <b>${esc(d.email)}</b> et votre mot de passe.` : 'Votre e-mail et un mot de passe : c\'est ce qui vous servira pour vous connecter.'}</p>
        ${done ? '' : `<div class="ob-fields">
          ${field('Prénom', input('prenom', d.prenom, 'autocomplete="given-name" required placeholder="Léa"'))}
          ${field('Adresse e-mail', input('email', d.email, 'type="email" inputmode="email" autocomplete="email" required placeholder="vous@exemple.be"'))}
          ${pwField('Mot de passe', 'password', 'autocomplete="new-password" required placeholder="8 caractères minimum"')}
          <p class="field-h ob-pw-h">Au moins 8 caractères, avec un chiffre ou un signe.</p>
        </div>`}
        <p class="group-k">Vous travaillez</p>
        <div class="ob-mode" role="radiogroup" aria-label="Vous travaillez">${modes.map(([v, l, sub, i]) => `<label class="ob-mode-c"><input type="radio" name="equipe" value="${v}" ${d.equipe === v ? 'checked' : ''} data-act-change="ob-mode"><span class="ob-mode-ic">${ic(i)}</span><b>${l}</b><em>${sub}</em>${ic('check', 'pick-ck')}</label>`).join('')}</div>
        <div class="ob-team" ${d.equipe === 'equipe' ? '' : 'hidden'}>${field('Nom de l\'équipe', input('team', d.team, 'placeholder="Facultatif, par exemple : Studio Lumière" autocomplete="organization"'))}</div>
        <p class="co-err ob-err" role="alert" hidden></p>
        ${ob.replay && !done ? '<p class="ob-acc-n">Démonstration : aucun compte n\'est créé.</p>' : ''}
      </form>
      <div class="ob-foot">
        <button class="btn btn-apple" type="submit" form="ob-form">${done ? 'Continuer' : 'Créer mon compte'}</button>
        ${done || ob.replay ? '' : '<a class="btn-text" href="#/connexion">J\'ai déjà un compte · Se connecter</a>'}
      </div>`;
  } else if (step === 'you') {
    body = `<form class="ob-page" data-form="ob-you" id="ob-form" novalidate>
        <h1 class="ob-h">${d.prenom ? `${esc(cap(d.prenom))}, vous êtes…` : 'Vous êtes…'}</h1>
        <p class="ob-p">L'application se règle pour vous. Tout se change plus tard.</p>
        <div class="pick-cards" role="radiogroup" aria-label="Votre situation">${SITUATIONS.map(([id, l, sub, i]) => `<label class="pick-c"><input type="radio" name="situation" value="${id}" ${d.situation === id ? 'checked' : ''}><span class="pick-ic">${ic(i)}</span><b>${l}</b><em>${sub}</em></label>`).join('')}</div>
        <div class="group ob-soc"><label class="group-r"><span>Société ou école</span><input name="societe" value="${esc(d.societe)}" placeholder="Facultatif" autocomplete="organization"></label></div>
      </form>
      <div class="ob-foot"><button class="btn btn-apple" type="submit" form="ob-form">Continuer</button></div>`;
  } else if (step === 'goals') {
    const mods = modulesFor(d.defis, d.situation);
    const showMetier = d.defis.includes('clients') || d.defis.includes('trouver');
    body = `<form class="ob-page" data-form="ob-goals" id="ob-form" novalidate>
        <h1 class="ob-h">${d.prenom ? `${esc(cap(d.prenom))}, qu'est-ce qui` : 'Qu\'est-ce qui'} vous aiderait le plus&nbsp;?</h1>
        <p class="ob-p">Choisissez une ou plusieurs réponses.</p>
        <div class="pick-cards is-multi" role="group" aria-label="Ce qui vous aiderait">${defisFor(d.situation).map(([id, l, sub, i]) => `<label class="pick-c"><input type="checkbox" name="d_${id}" ${d.defis.includes(id) ? 'checked' : ''} data-act-change="ob-defi"><span class="pick-ic">${ic(i)}</span><b>${l}</b><em>${sub}</em>${ic('check', 'pick-ck')}</label>`).join('')}</div>
        <p class="ob-mods">${ic('grid')}<span>Votre application : <b class="ob-mods-l">${mods.map((m) => MODULES[m].label).join(' · ')}</b></span></p>
        <div class="ob-metier" ${showMetier ? '' : 'hidden'}>
          <p class="group-k">Votre métier</p>
          <div class="group"><label class="group-r"><span>Métier</span><select name="metier" aria-label="Votre métier"><option value="">Je choisirai plus tard</option>${PRESETS.map((x) => `<option value="${x.id}" ${d.metier === x.id ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select></label></div>
          <p class="group-foot">Le CRM prend les étapes et les champs de votre métier.</p>
        </div>
        <div class="ob-svc" ${d.defis.includes('trouver') ? '' : 'hidden'}>
          <p class="group-k">Ce que vous vendez</p>
          <div class="group" role="radiogroup" aria-label="Ce que vous vendez">${['offre', ...SERVICE_IDS.filter((x) => x !== 'offre')].map((x) => `<label class="group-r is-pick"><input type="radio" name="service" value="${x}" ${d.service === x ? 'checked' : ''}><span class="group-ic f-${x === 'offre' ? 'navy' : x === 'site' ? 'blue' : x === 'auto' ? 'olive' : 'sky'}">${ic(SERVICES[x].icon)}</span><span>${x === 'offre' ? 'Mes propres services' : SERVICES[x].label}</span>${ic('check', 'group-ck')}</label>`).join('')}</div>
        </div>
        <p class="group-foot ob-need" hidden>Choisissez au moins une réponse.</p>
      </form>
      <div class="ob-foot"><button class="btn btn-apple" type="submit" form="ob-form">Continuer</button></div>`;
  } else {
    // La formule : essai de 7 jours avec moyen de paiement, rien n'est prélevé avant la fin
    const mods = modulesFor(d.defis, d.situation);
    const rec = advised(d);
    if (!d.plan) d.plan = rec;
    const sugg = d.defis.map((id) => [id, ...SUGG[id]]).slice(0, 3);
    if (!Object.keys(d.sugg).length) sugg.forEach(([id]) => { d.sugg[id] = true; });
    const st = billing();
    const paid = ['active', 'trialing', 'trial_canceling', 'canceling', 'past_due'].includes(st);
    const used = !!S().sub.trialStart || S().sub.history?.some((h) => h.type === 'paiement' || h.type === 'essai');
    const now = Date.now();
    body = `<div class="ob-page ob-plan">
        <h1 class="ob-h">Votre espace est prêt${d.prenom ? `, ${esc(cap(d.prenom))}` : ''}</h1>
        <p class="ob-mods">${ic('grid')}<span>Vos modules : <b>${mods.map((m) => MODULES[m].label).join(' · ')}</b>${d.equipe === 'equipe' ? ` · en équipe${d.team ? ` (${esc(d.team)})` : ''}` : ''}</span></p>
        ${paid ? `<p class="ob-p">Votre formule ${PLANS[S().sub.plan]?.name || ''} est déjà active sur ce compte.</p>` : `
        <p class="group-k">Choisissez votre formule</p>
        <div class="ob-plans" role="radiogroup" aria-label="Formule">${['pro', 'premium'].map((id) => `<label class="ob-pl is-${id}"><input type="radio" name="plan" value="${id}" ${d.plan === id ? 'checked' : ''} data-act-change="ob-plan">
          <span class="ob-pl-h"><b>${PLANS[id].name}</b>${rec === id ? '<span class="ob-pl-tag">Conseillé pour vous</span>' : ''}${ic('check', 'ob-pl-ck')}</span>
          <span class="ob-pl-p"><b>${price(PLANS[id].price)} €</b><span>par mois</span></span>
          <span class="ob-pl-for">${PLAN_FOR[id]}</span>
          <ul>${FEATS[id].map((f) => `<li>${ic('check')}<span>${f}</span></li>`).join('')}</ul></label>`).join('')}</div>
        ${used ? '' : `<ol class="ob-tl">
          <li><b>Aujourd'hui</b><span>Tout est ouvert. 0 € prélevé.</span></li>
          <li><b>${dl(now + (TRIAL_DAYS - 2) * DAY)}</b><span>Un rappel dans l'application.</span></li>
          <li><b>${dl(now + TRIAL_DAYS * DAY)}</b><span>Premier prélèvement, sauf si vous annulez avant.</span></li></ol>`}`}
        ${sugg.length ? `<p class="group-k">Vos premières tâches, à cocher ou non</p>
        <div class="group">${sugg.map(([id, t, day]) => `<label class="group-r is-pick is-multi"><input type="checkbox" ${d.sugg[id] ? 'checked' : ''} data-act-change="ob-sugg" data-id="${id}"><span class="group-ic f-olive">${ic('checkSquare')}</span><span class="group-t"><b>${esc(t)}</b><em>${day ? 'Demain' : 'Aujourd\'hui'}</em></span>${ic('check', 'group-ck')}</label>`).join('')}</div>` : ''}
      </div>
      <div class="ob-foot">
        ${paid || ob.replay ? `<button class="btn btn-apple" data-act="ob-finish" data-trial="0">Ouvrir mon espace</button>`
          : `<button class="btn btn-apple ob-go" data-act="ob-trial">${used ? `Choisir ${PLANS[d.plan].name}` : `Essayer ${PLANS[d.plan].name} ${TRIAL_DAYS} jours gratuits`}</button>
          <p class="ob-small">${used ? `${price(PLANS[d.plan].price)} € par mois, sans engagement.` : `Moyen de paiement demandé, rien n'est prélevé pendant ${TRIAL_DAYS} jours. Ensuite ${price(PLANS[d.plan].price)} € par mois, annulable à tout moment.`}</p>
          <button class="btn-text ob-free" data-act="ob-finish" data-trial="0">Continuer avec la version gratuite, limitée</button>`}
      </div>`;
  }

  const html = `<div class="ob ob-${step}">
    <header class="ob-top">${back ? `<button class="btn-text ob-back" data-act="ob-back">${ic('chevL')}<span>Retour</span></button>` : '<span></span>'}
      <span class="ob-dots" aria-label="Étape ${ob.i + 1} sur ${STEPS.length}">${STEPS.map((x, k) => `<i class="${k === ob.i ? 'on' : ''}"></i>`).join('')}</span>
      ${ob.replay ? '<button class="btn-text" data-act="ob-quit">Fermer</button>' : '<span></span>'}</header>
    <div class="ob-in ${ob.anim ? (ob.dir > 0 ? 'from-r' : 'from-l') : ''}" data-step="${step}">${body}</div>
  </div>`;
  ob.anim = true;
  return {
    title: 'Bienvenue', full: true, html,
    after(root) {
      const tour = root.querySelector('.tour');
      if (!tour) return null;
      tour.scrollLeft = ob.slide * tour.clientWidth;
      let t = 0;
      const onScroll = () => {
        clearTimeout(t);
        t = setTimeout(() => {
          const k = Math.round(tour.scrollLeft / tour.clientWidth);
          if (k === ob.slide) return;
          ob.slide = k;
          root.querySelectorAll('.tour-dots button').forEach((b, i) => b.classList.toggle('on', i === k));
          const btn = root.querySelector('[data-act="ob-tour-next"]');
          if (btn) btn.textContent = k < SLIDES.length - 1 ? 'Suivant' : 'Créer mon compte';
        }, 60);
      };
      tour.addEventListener('scroll', onScroll, { passive: true });
      return () => tour.removeEventListener('scroll', onScroll);
    },
  };
}

// ---------- Connexion (#/connexion) ----------
export function loginView() {
  const acc = S().account;
  const local = !cloudReady();
  return {
    title: 'Connexion', full: 'hero',
    html: `<div class="wl wl-login">
      <header class="wl-top">${brand()}${hasAccount() ? '' : '<a class="wl-link" href="#/bienvenue" data-act="login-new">Créer un compte</a>'}</header>
      <div class="wl-grid">
        <div class="wl-head">
          <h1 class="wl-h">${acc?.email && hasAccount() ? 'Bon retour' : 'Connectez-vous'}${S().profile.prenom && hasAccount() ? `, <em>${esc(cap(S().profile.prenom))}</em>` : ''}</h1>
          <p class="wl-p">Vos tâches, vos notes et vos tableaux vous attendent.</p>
        </div>
        <form class="login" data-form="login" novalidate>
          <h2>Se connecter</h2>
          ${field('Adresse e-mail', input('email', acc?.email || '', 'type="email" inputmode="email" autocomplete="username" required placeholder="vous@exemple.be"'))}
          ${pwField('Mot de passe', 'password', 'autocomplete="current-password" required')}
          <p class="co-err" role="alert" hidden></p>
          <button class="btn btn-apple" type="submit">Se connecter</button>
          <button type="button" class="link login-forgot" data-act="login-forgot">Mot de passe oublié ?</button>
          ${hasAccount() ? '' : `<p class="login-or"><span>Pas encore de compte ?</span></p><a class="btn login-new" href="#/bienvenue" data-act="login-new">Créer mon compte</a>`}
          ${local ? `<p class="login-n">${ic('lock')}<span>${hasAccount() ? 'Votre compte est enregistré sur cet appareil.' : 'Nouvel appareil ? Restaurez la sauvegarde de l\'ancien, puis connectez-vous.'}</span></p>
          <label class="link login-restore">${ic('upload')}<span>Restaurer une sauvegarde</span><input type="file" accept="application/json,.json" hidden data-act-change="restore"></label>` : ''}
        </form>
        ${devices('is-login')}
      </div>
    </div>`,
  };
}

const rr = () => window.dispatchEvent(new Event('ms:rerender'));
const go = (delta) => { ob.dir = delta; ob.anim = true; ob.i = Math.max(0, Math.min(STEPS.length - 1, ob.i + delta)); rr(); window.scrollTo(0, 0); };
const goTo = (step) => { ob.dir = 1; ob.anim = true; ob.i = STEPS.indexOf(step); rr(); window.scrollTo(0, 0); };
const goSlide = (k) => {
  const tour = document.querySelector('.tour');
  ob.slide = Math.max(0, Math.min(SLIDES.length - 1, k));
  tour?.scrollTo({ left: ob.slide * tour.clientWidth, behavior: document.documentElement.dataset.motion === 'reduce' ? 'auto' : 'smooth' });
  document.querySelectorAll('.tour-dots button').forEach((b, i) => b.classList.toggle('on', i === ob.slide));
  const btn = document.querySelector('[data-act="ob-tour-next"]');
  if (btn) btn.textContent = ob.slide < SLIDES.length - 1 ? 'Suivant' : 'Créer mon compte';
};

// Enregistre l'accueil. `leaving` : la page part vers le paiement Stripe, on garde tout sans changer d'écran.
function finish(trial, { leaving = false } = {}) {
  const d = data();
  const first = !S().onboarded;
  const wasReplay = ob.replay;
  const sit = SITUATIONS.find((x) => x[0] === d.situation);
  const metier = d.metier || sit?.[4] || '';
  update((s) => {
    s.profile.prenom = d.prenom.trim(); s.profile.societe = d.societe.trim();
    if (d.email && !wasReplay) s.profile.email = d.email;
    s.profile.situation = d.situation; s.profile.equipe = d.equipe; s.profile.team = d.equipe === 'equipe' ? d.team.trim() : '';
    s.profile.defis = [...d.defis];
    s.profile.usages = modulesFor(d.defis, d.situation);
    s.profile.metier = metier;
    s.profile.service = d.service || (metier === 'agence' ? 'site' : 'offre');
    // Études : une liste « École » à la place de « Travail » (gardée si elle sert déjà)
    if (SCHOOL(d.situation) && !s.lists.some((l) => l.id === 'ecole')) s.lists = [...s.lists.filter((l) => l.id !== 'travail' || s.tasks.some((t) => t.list === 'travail')), { id: 'ecole', name: 'École', tone: 'olive' }];
    s.onboarded = true;
  });
  // Modèle de CRM du métier, si le CRM est encore vierge
  if (metier && preset(metier) && (first || !S().crm.preset) && !S().prospects.length) applyPreset(metier);
  // Premières tâches proposées (jamais pendant une démonstration)
  if (!wasReplay) {
    d.defis.slice(0, 3).filter((id) => d.sugg[id]).forEach((id) => addTask({ title: SUGG[id][0], due: startOfDay() + SUGG[id][1] * DAY, list: SCHOOL(d.situation) ? 'ecole' : d.situation === 'autre' ? 'perso' : 'travail' }));
  }
  ob.replay = false; ob.d = null; ob.i = 0; ob.slide = 0;
  try { sessionStorage.setItem('msdev:intro', '1'); } catch (e) { /* rien */ }
  if (leaving) return;
  location.hash = '#/';
  if (!wasReplay && !trial) setTimeout(() => toast('Votre espace est prêt.', { title: 'Bienvenue' }), 450);
}
// L'essai commence quand le moyen de paiement est ajouté (feuille de paiement) : on entre dans l'application.
window.addEventListener('ms:trial', () => { if (STEPS[ob.i] === 'plan' && location.hash.startsWith('#/bienvenue')) finish(true); });
// Paiement réel : la page part chez Stripe, l'accueil est enregistré avant.
window.addEventListener('ms:leaving', () => { if (STEPS[ob.i] === 'plan' && location.hash.startsWith('#/bienvenue')) finish(true, { leaving: true }); });

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

const readDefis = (f) => defisFor(data().situation).map(([id]) => id).filter((id) => f.elements[`d_${id}`]?.checked);
// Garde ce qui est déjà tapé quand on revient en arrière
function keep() {
  const f = document.getElementById('ob-form');
  const d = data();
  if (!f) return;
  if (f.dataset.form === 'ob-you') { d.societe = f.elements.societe.value; d.situation = f.elements.situation.value || d.situation; }
  if (f.dataset.form === 'ob-goals') { d.defis = readDefis(f); d.metier = f.elements.metier.value; }
  if (f.dataset.form === 'ob-account') { if (f.elements.email) d.email = f.elements.email.value.trim(); if (f.elements.prenom) d.prenom = f.elements.prenom.value; d.equipe = f.elements.equipe.value || d.equipe; d.team = f.elements.team?.value || ''; }
}
register({
  'ob-next': () => go(1),
  'ob-signup': () => goTo('account'),
  'ob-back': () => { keep(); if (STEPS[ob.i] === 'account' && !ob.toured) { ob.dir = -1; ob.i = 0; rr(); return; } go(-1); },
  'ob-tour-next': () => { if (ob.slide < SLIDES.length - 1) goSlide(ob.slide + 1); else go(1); },
  'ob-slide': (b) => goSlide(+b.dataset.k),
  'ob-quit': () => { ob.replay = false; ob.d = null; ob.i = 0; try { sessionStorage.setItem('msdev:intro', '1'); } catch (e) { /* rien */ } location.hash = '#/'; },
  'ob-finish': (b) => finish(b.dataset.trial === '1'),
  'ob-mode': (el) => { const f = el.closest('form'); data().equipe = el.value; f.querySelector('.ob-team').hidden = el.value !== 'equipe'; if (el.value === 'equipe') f.elements.team?.focus(); },
  'ob-plan': (el) => {
    const d = data(); d.plan = el.value;
    const used = !!S().sub.trialStart || S().sub.history?.some((h) => h.type === 'paiement' || h.type === 'essai');
    const b = document.querySelector('.ob-go');
    if (b) b.textContent = used ? `Choisir ${PLANS[d.plan].name}` : `Essayer ${PLANS[d.plan].name} ${TRIAL_DAYS} jours gratuits`;
    const n = document.querySelector('.ob-foot .ob-small');
    if (n) n.textContent = used ? `${price(PLANS[d.plan].price)} € par mois, sans engagement.` : `Moyen de paiement demandé, rien n'est prélevé pendant ${TRIAL_DAYS} jours. Ensuite ${price(PLANS[d.plan].price)} € par mois, annulable à tout moment.`;
  },
  // Ouvre la feuille de paiement : l'essai démarre quand le moyen de paiement est enregistré
  'ob-trial': () => {
    const d = data();
    const used = !!S().sub.trialStart || S().sub.history?.some((h) => h.type === 'paiement' || h.type === 'essai');
    if (used) { finish(false); setTimeout(() => checkoutSheet(d.plan, false), 500); return; }
    checkoutSheet(d.plan, true);
  },
  'ob-defi': (el) => {
    const f = el.closest('form');
    const d = data();
    d.defis = readDefis(f);
    f.querySelector('.ob-mods-l').textContent = modulesFor(d.defis, d.situation).map((m) => MODULES[m].label).join(' · ');
    f.querySelector('.ob-metier').hidden = !(d.defis.includes('clients') || d.defis.includes('trouver'));
    f.querySelector('.ob-svc').hidden = !d.defis.includes('trouver');
    f.querySelector('.ob-need').hidden = d.defis.length > 0;
    // Métier proposé d'après la situation choisie
    const sit = SITUATIONS.find((x) => x[0] === d.situation);
    if (sit?.[4] && !f.elements.metier.value) f.elements.metier.value = sit[4];
  },
  'ob-sugg': (el) => { data().sugg[el.dataset.id] = el.checked; },
  'login-new': (b, e) => { e?.preventDefault(); if (hasAccount()) return; startOnboarding(); ob.i = STEPS.indexOf('account'); ob.toured = false; location.hash = '#/bienvenue'; rr(); },
  'login-wipe': async () => {
    if (!await confirmSheet({ title: 'Effacer cet appareil ?', text: 'Toutes les données de MindView sur cet appareil seront supprimées : tâches, notes, tableaux, fiches et compte. Une sauvegarde pourra ensuite être restaurée.', ok: 'Tout effacer', danger: true })) return;
    resetState();
    try { localStorage.removeItem('msdev:session'); sessionStorage.clear(); } catch (e) { /* rien */ }
    location.replace(location.pathname + '#/bienvenue'); location.reload();
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
    <p>Votre mot de passe n'est jamais enregistré en clair : seulement une empreinte chiffrée, qui permet de le vérifier sans pouvoir le relire.</p>
    <p>L'essai gratuit demande un moyen de paiement, géré par Stripe : MindView ne voit jamais votre numéro de carte. Rien n'est prélevé pendant ${TRIAL_DAYS} jours, et vous pouvez annuler en un clic.</p>
    <p>Le détail complet, et vos droits (RGPD), sont dans Compte → Confidentialité.</p></div>`, { cls: 'sheet-sm' }),
}, {
  'ob-account': async (f, form) => {
    const d = data();
    const err = (m) => { const box = form.querySelector('.ob-err'); box.textContent = m; box.hidden = false; };
    d.equipe = f.equipe || 'solo'; d.team = (f.team || '').trim();
    if (d.acc === 'done') { go(1); return; }
    d.prenom = (f.prenom || '').trim();
    const email = (f.email || '').trim().toLowerCase();
    d.email = email;
    if (!d.prenom) { err('Indiquez votre prénom.'); form.elements.prenom.focus(); return; }
    if (!validEmail(email)) { err('Cette adresse e-mail ne semble pas complète (exemple : prenom@gmail.com).'); form.elements.email.focus(); return; }
    if (passwordIssue(f.password)) { err(`Mot de passe : ${passwordIssue(f.password).toLowerCase()}`); form.elements.password.focus(); return; }
    if (ob.replay) { go(1); return; }
    const btn = document.querySelector('.ob-foot [type=submit]');
    try {
      await busy(btn, 'Création du compte…', () => createAccount({ email, password: f.password, prenom: d.prenom }));
      d.acc = 'done';
      update((s) => { s.profile.prenom = d.prenom; });
      go(1);
    } catch (e) { err(cloudMessage(e)); }
  },
  'ob-you': (f) => {
    const d = data();
    d.societe = (f.societe || '').trim(); d.situation = f.situation || '';
    const sit = SITUATIONS.find((x) => x[0] === d.situation);
    if (sit?.[4] && !d.metier) d.metier = sit[4];
    go(1);
  },
  'ob-goals': (f, form) => {
    const d = data();
    d.defis = readDefis(form);
    d.metier = f.metier || '';
    d.service = f.service || (d.metier === 'agence' ? 'site' : 'offre');
    if (!d.defis.length) { form.querySelector('.ob-need').hidden = false; return; }
    d.sugg = {}; d.plan = '';
    go(1);
  },
  login: async (f, form) => {
    const err = (m) => { const box = form.querySelector('.co-err'); box.textContent = m; box.hidden = false; };
    form.querySelector('.co-err').hidden = true;
    const email = (f.email || '').trim().toLowerCase();
    if (!validEmail(email)) { err('Entrez l\'adresse e-mail de votre compte.'); return; }
    if (!f.password) { err('Entrez votre mot de passe.'); return; }
    const btn = form.querySelector('[type=submit]');
    try {
      const ok = await busy(btn, 'Connexion…', () => login(email, f.password));
      if (!ok) { err(hasAccount() ? 'E-mail ou mot de passe incorrect.' : 'Aucun compte sur cet appareil avec cette adresse. Créez votre compte, ou restaurez la sauvegarde de votre ancien appareil.'); form.elements.password.select(); return; }
      if (S().onboarded) { location.hash = '#/'; toast(S().profile.prenom ? `Content de vous revoir, ${esc(cap(S().profile.prenom))}.` : 'Vous êtes connecté.', { title: 'Bon retour' }); }
      else { resumeOnboarding(); location.hash = '#/bienvenue'; rr(); }
    } catch (e) { err(e.code ? cloudMessage(e) : e.message); }
  },
});
export { PITCH };
