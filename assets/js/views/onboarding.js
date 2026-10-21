// Accueil de première ouverture (1.11) : court, sans paiement.
// 1. L'accroche : l'application sur un Mac et un iPhone (un écran, on peut passer)
// 2. Le prénom (+ e-mail et mot de passe seulement quand les comptes en ligne sont allumés, voir AUTH_MODE)
// 3. Le profil et les besoins sur un seul écran → l'application.
// L'essai Pro est proposé plus tard, en contexte (fonction Pro touchée, bandeau discret après quelques jours).
// Rejouable par le propriétaire (Compte → Outils de présentation) sans toucher aux données.
// Plus l'écran de connexion (#/connexion), dans le même décor.
import { S, update, MODULES, resetState, normName } from '../store.js';
import { ic, esc, register, toast, sheet, sheetHead, closeSheet, cap, field, input, busy, confirmSheet } from '../ui.js';
import { logoMark } from '../icons.js';
import { SERVICES, SERVICE_IDS } from '../data/scripts.js';
import { PRESETS, preset } from '../data/presets.js';
import { askNotifications, notifSupport } from '../notify.js';
import { PITCH } from './common.js';
import { applyPreset } from './crm.js';
import { cloudMessage } from '../cloud.js';
import { hasAccount, loggedIn, createAccount, login, validEmail, passwordIssue, authMode } from '../auth.js';
import { pwField } from './account.js';
import { t as tr } from '../strings.js';

const STEPS = ['welcome', 'name', 'profile'];
const ob = { i: 0, dir: 1, anim: true, replay: false, d: null };

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
// Besoins : [id, libellé, icône, réservé aux profils pro]
const DEFIS = [
  ['reviser', 'Réviser mes cours', 'book'],
  ['examens', 'Réussir mes examens', 'target'],
  ['oublier', 'Ne plus rien oublier', 'bell'],
  ['temps', 'Organiser mes journées', 'calendar'],
  ['projets', 'Mener mes projets à bout', 'folder'],
  ['idees', 'Ranger mes idées et mes notes', 'page'],
  ['progresser', 'Apprendre et progresser', 'quiz'],
  ['clients', 'Suivre mes clients et mes devis', 'users', true],
  ['trouver', 'Trouver de nouveaux clients', 'phone', true],
];
const SCHOOL = (sit) => sit === 'etudes';
const PRO_SIT = (sit) => !!SITUATIONS.find((x) => x[0] === sit)?.[4];
// Modules (1.10) : Études par défaut ; Entrepreneur seulement si le profil le demande (clients, prospection, métier à CRM)
const modulesFor = (defis, sit = '') => {
  const pro = defis.includes('clients') || defis.includes('trouver') || PRO_SIT(sit);
  const study = !sit || SCHOOL(sit) || sit === 'autre' || defis.some((x) => ['reviser', 'examens', 'progresser'].includes(x));
  return ['organiser', ...(study ? ['etudes'] : []), ...(pro ? ['entrepreneur'] : [])];
};

function data() {
  if (!ob.d) {
    const p = S().profile;
    ob.d = { email: S().account?.email || p.email || '', acc: hasAccount() && loggedIn() ? 'done' : '', prenom: p.prenom || '', societe: p.societe || '', situation: p.situation || 'etudes', equipe: p.equipe || 'solo', team: p.team || '', defis: [...(p.defis || [])], metier: p.metier || S().crm.preset || '', service: p.service || 'offre' };
  }
  return ob.d;
}
export function startOnboarding(replay = false) { ob.i = 0; ob.dir = 1; ob.anim = true; ob.replay = replay; ob.d = null; }
// Après une connexion sur un appareil où l'accueil n'a pas été fait : on reprend au profil
export function resumeOnboarding() { startOnboarding(); ob.i = STEPS.indexOf('profile'); }
export const isReplay = () => ob.replay;

// Écran de verrouillage iPhone avec des notifications au format iOS (réutilisé pour activer les rappels).
export function iphone(prenom) {
  const notes = [
    ['Dans 10 minutes', 'Réviser le chapitre 3 — la fiche est prête.', 'maintenant'],
    ['Examen d\'histoire', 'J−3 : deux séances de révision prévues.', 'il y a 2 min'],
    ['Journée terminée', `Toutes les tâches sont cochées. Bravo${prenom ? ' ' + esc(cap(prenom)) : ''} !`, 'il y a 1 h'],
  ];
  return `<div class="phone" aria-hidden="true">
    <div class="phone-screen">
      <span class="phone-island"></span>

      <p class="phone-date">${cap(new Intl.DateTimeFormat('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()))}</p>
      <p class="phone-time">9:41</p>
      <div class="phone-notes">${notes.map(([ti, b, w], k) => `<div class="inote" style="--k:${k}">
        <span class="inote-ic">${logoMark('sm')}</span>
        <div class="inote-b"><p class="inote-h"><span>MindView</span><span>${w}</span></p><p class="inote-t">${ti}</p><p>${b}</p></div></div>`).join('')}</div>
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
const online = () => authMode() === 'online';

// ---------- Écran 1 : l'accroche, dans le décor Mac + iPhone ----------
function welcome() {
  return `<div class="wl">
    <header class="wl-top">${brand()}
      ${ob.replay ? '<button class="wl-link" data-act="ob-quit">Fermer</button>' : online() || hasAccount() ? '<a class="wl-link" href="#/connexion">Se connecter</a>' : '<button class="wl-link" data-act="ob-next">Passer</button>'}</header>
    <div class="wl-grid">
      <div class="wl-head">
        <p class="wl-tags"><span>Simple</span><span>Complet</span><span>Pour les élèves et les étudiants</span></p>
        <h1 class="wl-h">Ton espace de travail <em>tout-en-un</em></h1>
        <p class="wl-p">Tâches, notes, tableau blanc, examens et révisions réunis dans une seule application.</p>
      </div>
      ${devices()}
      <div class="wl-act">
        <div class="wl-cta"><button class="wl-b1" data-act="ob-next">Commencer</button>${!online() && !ob.replay ? `<label class="wl-b2 wl-restore">${ic('upload')}<span>J'ai une sauvegarde</span><input type="file" accept="application/json,.json" hidden data-act-change="restore"></label>` : ''}</div>
        <button class="wl-note" data-act="ob-privacy">${ic('lock')}<span>${tr(online() ? 'ob.note.online' : 'ob.note.local')} <u>En savoir plus</u></span></button>
      </div>
    </div>
  </div>`;
}

export function onboarding() {
  const d = data();
  const step = STEPS[ob.i];
  if (step === 'welcome') { ob.anim = true; return { title: 'Bienvenue', full: 'hero', html: welcome() }; }
  let body = '';

  if (step === 'name') {
    // Prénom ; en ligne seulement : e-mail et mot de passe (le compte se crée sur le serveur)
    const withAcc = online() && d.acc !== 'done' && !ob.replay;
    body = `<form class="ob-page ob-name" data-form="ob-name" id="ob-form" novalidate>
        <span class="ob-acc-ic">${ic('user')}</span>
        <h1 class="ob-h">${tr('ob.name.t')}</h1>
        <p class="ob-p">${tr(withAcc ? 'ob.name.online' : 'ob.name.local')}</p>
        <div class="ob-fields">
          ${field('Prénom', input('prenom', d.prenom, 'autocomplete="given-name" required maxlength="40" placeholder="Léa"'))}
          ${withAcc ? `${field('Adresse e-mail', input('email', d.email, 'type="email" inputmode="email" autocomplete="email" required placeholder="prenom@exemple.be"'))}
          ${pwField('Mot de passe', 'password', 'autocomplete="new-password" required placeholder="8 caractères minimum"')}
          <p class="field-h ob-pw-h">Au moins 8 caractères, avec un chiffre ou un signe.</p>` : ''}
        </div>
        <p class="co-err ob-err" role="alert" hidden></p>
      </form>
      <div class="ob-foot"><button class="btn btn-apple" type="submit" form="ob-form">Continuer</button>
        ${withAcc ? '<a class="btn-text" href="#/connexion">J\'ai déjà un compte · Se connecter</a>' : ''}</div>`;
  } else {
    const pickSit = ([id, l, sub, i]) => `<label class="pick-c"><input type="radio" name="situation" value="${id}" ${d.situation === id ? 'checked' : ''} data-act-change="ob-sit"><span class="pick-ic">${ic(i)}</span><b>${l}</b><em>${sub}</em></label>`;
    const showPro = PRO_SIT(d.situation);
    const showMetier = d.defis.includes('clients') || d.defis.includes('trouver');
    body = `<form class="ob-page ob-prof" data-form="ob-profile" id="ob-form" novalidate>
        <h1 class="ob-h">${d.prenom ? tr('ob.prof.t', { prenom: esc(normName(d.prenom)) }) : tr('ob.prof.t0')}</h1>
        <p class="ob-p">${tr('ob.prof.p')}</p>
        <p class="group-k">${tr('ob.prof.you')}</p>
        <div class="pick-cards ob-main-sit" role="radiogroup" aria-label="Situation">${SITUATIONS.filter(([id]) => id === 'etudes').map(pickSit).join('')}</div>
        <details class="ob-more" ${SCHOOL(d.situation) ? '' : 'open'}><summary>${ic('chevD')}<span>Autres usages</span></summary>
          <div class="pick-cards" role="radiogroup" aria-label="Autres usages">${SITUATIONS.filter(([id]) => id !== 'etudes').map(pickSit).join('')}</div></details>
        <p class="group-k">${tr('ob.prof.needs')}</p>
        <div class="ob-chips" role="group" aria-label="${tr('ob.prof.needs')}">${DEFIS.map(([id, l, i, pro]) => `<label class="ob-chip ${pro ? 'is-pro' : ''}" ${pro && !showPro ? 'hidden' : ''}><input type="checkbox" name="d_${id}" ${d.defis.includes(id) ? 'checked' : ''} data-act-change="ob-defi">${ic(i)}<span>${l}</span></label>`).join('')}</div>
        <div class="ob-metier" ${showMetier ? '' : 'hidden'}>
          <div class="group"><label class="group-r"><span>Métier</span><select name="metier" aria-label="Métier"><option value="">Je choisirai plus tard</option>${PRESETS.map((x) => `<option value="${x.id}" ${d.metier === x.id ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select></label></div>
          <p class="group-foot">Le CRM prend les étapes et les champs de ce métier.</p>
        </div>
        <div class="ob-svc" ${d.defis.includes('trouver') ? '' : 'hidden'}>
          <div class="group"><label class="group-r"><span>Ce que je vends</span><select name="service" aria-label="Ce que je vends">${['offre', ...SERVICE_IDS.filter((x) => x !== 'offre')].map((x) => `<option value="${x}" ${d.service === x ? 'selected' : ''}>${x === 'offre' ? 'Mes propres services' : esc(SERVICES[x].label)}</option>`).join('')}</select></label></div>
        </div>
        <p class="group-k">${tr('ob.prof.mode')}</p>
        <div class="seg ob-seg seg-radio" role="radiogroup" aria-label="${tr('ob.prof.mode')}">${[['solo', 'Seul·e', 'user'], ['equipe', 'En équipe', 'users']].map(([v, l, i]) => `<label class="seg-i"><input type="radio" name="equipe" value="${v}" ${d.equipe === v ? 'checked' : ''} data-act-change="ob-mode">${ic(i)}<span>${l}</span></label>`).join('')}</div>
        <div class="ob-team" ${d.equipe === 'equipe' ? '' : 'hidden'}>${field('Nom de l\'équipe (facultatif)', input('team', d.team, 'maxlength="40" placeholder="Groupe de bio, Studio Lumière…"'))}</div>
        <div class="ob-soc">${field('École ou société (facultatif)', input('societe', d.societe, 'maxlength="60" autocomplete="organization"'))}</div>
        <p class="ob-mods">${ic('grid')}<span>${tr('ob.prof.mods')} <b class="ob-mods-l">${modulesFor(d.defis, d.situation).map((m) => MODULES[m].label).join(' · ')}</b></span></p>
      </form>
      <div class="ob-foot"><button class="btn btn-apple" type="submit" form="ob-form">C'est parti</button></div>`;
  }

  const html = `<div class="ob ob-${step}">
    <header class="ob-top"><button class="btn-text ob-back" data-act="ob-back">${ic('chevL')}<span>Retour</span></button>
      <span class="ob-dots" aria-label="Étape ${ob.i + 1} sur ${STEPS.length}">${STEPS.map((x, k) => `<i class="${k === ob.i ? 'on' : ''}"></i>`).join('')}</span>
      ${ob.replay ? '<button class="btn-text" data-act="ob-quit">Fermer</button>' : '<span></span>'}</header>
    <div class="ob-in ${ob.anim ? (ob.dir > 0 ? 'from-r' : 'from-l') : ''}" data-step="${step}">${body}</div>
  </div>`;
  ob.anim = true;
  return { title: 'Bienvenue', full: true, html };
}

// ---------- Connexion (#/connexion) ----------
export function loginView() {
  const acc = S().account;
  const local = !online();
  return {
    title: 'Connexion', full: 'hero',
    html: `<div class="wl wl-login">
      <header class="wl-top">${brand()}${hasAccount() ? '' : '<a class="wl-link" href="#/bienvenue" data-act="login-new">Créer un compte</a>'}</header>
      <div class="wl-grid">
        <div class="wl-head">
          <h1 class="wl-h">${acc?.email && hasAccount() ? 'Bon retour' : tr('login.t')}${S().profile.prenom && hasAccount() ? `, <em>${esc(normName(S().profile.prenom))}</em>` : ''}</h1>
          <p class="wl-p">${tr('login.p')}</p>
        </div>
        <form class="login" data-form="login" novalidate>
          <h2>Se connecter</h2>
          ${field('Adresse e-mail', input('email', acc?.email || '', 'type="email" inputmode="email" autocomplete="username" required placeholder="prenom@exemple.be"'))}
          ${pwField('Mot de passe', 'password', 'autocomplete="current-password" required')}
          <p class="co-err" role="alert" hidden></p>
          <button class="btn btn-apple" type="submit">Se connecter</button>
          <button type="button" class="link login-forgot" data-act="login-forgot">Mot de passe oublié ?</button>
          ${hasAccount() ? '' : `<p class="login-or"><span>Pas encore de compte ?</span></p><a class="btn login-new" href="#/bienvenue" data-act="login-new">Créer mon compte</a>`}
          ${local ? `<p class="login-n">${ic('lock')}<span>${tr(hasAccount() ? 'login.local' : 'login.newDevice')}</span></p>
          <label class="link login-restore">${ic('upload')}<span>Restaurer une sauvegarde</span><input type="file" accept="application/json,.json" hidden data-act-change="restore"></label>` : ''}
        </form>
        ${devices('is-login')}
      </div>
    </div>`,
  };
}

const rr = () => window.dispatchEvent(new Event('ms:rerender'));
const go = (delta) => { ob.dir = delta; ob.anim = true; ob.i = Math.max(0, Math.min(STEPS.length - 1, ob.i + delta)); rr(); window.scrollTo(0, 0); };

// Enregistre l'accueil et ouvre l'application
function finish() {
  const d = data();
  const first = !S().onboarded;
  const wasReplay = ob.replay;
  const sit = SITUATIONS.find((x) => x[0] === d.situation);
  const metier = d.metier || sit?.[4] || '';
  const prenom = normName(d.prenom);
  update((s) => {
    s.profile.prenom = prenom; s.profile.societe = d.societe.trim();
    if (d.email && !wasReplay && online()) s.profile.email = d.email;
    s.profile.situation = d.situation; s.profile.equipe = d.equipe; s.profile.team = d.equipe === 'equipe' ? d.team.trim() : '';
    s.profile.defis = [...d.defis];
    s.profile.usages = modulesFor(d.defis, d.situation);
    s.profile.metier = metier;
    s.profile.service = d.service || (metier === 'agence' ? 'site' : 'offre');
    // Études : une liste « École » à la place de « Travail » (gardée si elle sert déjà)
    if (SCHOOL(d.situation) && !s.lists.some((l) => l.id === 'ecole')) s.lists = [...s.lists.filter((l) => l.id !== 'travail' || s.tasks.some((t) => t.list === 'travail')), { id: 'ecole', name: 'École', tone: 'olive' }];
    if (first) s.createdAt = Date.now();
    s.onboarded = true;
  });
  // Modèle de CRM du métier, si le CRM est encore vierge
  if (metier && preset(metier) && (first || !S().crm.preset) && !S().prospects.length) applyPreset(metier);
  ob.replay = false; ob.d = null; ob.i = 0;
  try { sessionStorage.setItem('msdev:intro', '1'); } catch (e) { /* rien */ }
  location.hash = '#/';
  if (!wasReplay) setTimeout(() => toast(tr('ob.ready'), { title: prenom ? `Bienvenue, ${esc(prenom)}` : 'Bienvenue' }), 450);
}

// Demande d'autorisation au bon moment (agenda, première relance) plutôt qu'à l'accueil.
export function notifSheet() {
  const sup = notifSupport();
  sheet(`<div class="sheet-body ob-center notif-sheet">
      ${iphone(S().profile.prenom)}
      <h2 class="ob-h">${tr('notif.t')}</h2>
      <p class="ob-p">Une notification dix minutes avant chaque tâche à heure fixe et chaque rendez-vous.</p>
      ${sup.ok ? '<button class="btn btn-apple" data-act="notif-yes">Activer les notifications</button>' : `<p class="field-h">${sup.hint}</p>`}
      <button class="btn-text" data-act="close-sheet">Plus tard</button>
    </div>`, { cls: 'sheet-sm' });
}

const readDefis = (f) => DEFIS.map(([id]) => id).filter((id) => f.elements[`d_${id}`]?.checked && !f.elements[`d_${id}`].closest('[hidden]'));
// Garde ce qui est déjà tapé quand on revient en arrière
function keep() {
  const f = document.getElementById('ob-form');
  const d = data();
  if (!f) return;
  if (f.dataset.form === 'ob-name') { d.prenom = f.elements.prenom.value; if (f.elements.email) d.email = f.elements.email.value.trim(); }
  if (f.dataset.form === 'ob-profile') { d.situation = f.elements.situation.value || d.situation; d.defis = readDefis(f); d.societe = f.elements.societe.value; d.equipe = f.elements.equipe.value || d.equipe; d.team = f.elements.team?.value || ''; }
}
// Met à jour l'écran profil sans le redessiner (choix de situation et de besoins)
function refreshProfile(f) {
  const d = data();
  d.situation = f.elements.situation.value || d.situation;
  const pro = PRO_SIT(d.situation);
  f.querySelectorAll('.ob-chip.is-pro').forEach((c) => { c.hidden = !pro; if (!pro) c.querySelector('input').checked = false; });
  d.defis = readDefis(f);
  f.querySelector('.ob-mods-l').textContent = modulesFor(d.defis, d.situation).map((m) => MODULES[m].label).join(' · ');
  f.querySelector('.ob-metier').hidden = !(d.defis.includes('clients') || d.defis.includes('trouver'));
  f.querySelector('.ob-svc').hidden = !d.defis.includes('trouver');
  const sit = SITUATIONS.find((x) => x[0] === d.situation);
  if (sit?.[4] && !f.elements.metier.value) f.elements.metier.value = sit[4];
}
register({
  'ob-next': () => go(1),
  'ob-back': () => { keep(); go(-1); },
  'ob-quit': () => { ob.replay = false; ob.d = null; ob.i = 0; try { sessionStorage.setItem('msdev:intro', '1'); } catch (e) { /* rien */ } location.hash = '#/'; },
  'ob-sit': (el) => refreshProfile(el.closest('form')),
  'ob-defi': (el) => refreshProfile(el.closest('form')),
  'ob-mode': (el) => { const f = el.closest('form'); data().equipe = el.value; f.querySelector('.ob-team').hidden = el.value !== 'equipe'; if (el.value === 'equipe') f.elements.team?.focus(); },
  'login-new': (b, e) => { e?.preventDefault(); if (hasAccount()) return; startOnboarding(); ob.i = STEPS.indexOf('name'); location.hash = '#/bienvenue'; rr(); },
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
    else toast(tr('notif.later'), { title: 'Notifications non autorisées', ms: 4000 });
    rr();
  },
  'notif-ask-sheet': () => notifSheet(),
  'ob-privacy': () => sheet(`${sheetHead(tr('ob.priv.t'))}<div class="sheet-body article">${tr(online() ? 'ob.priv.online' : 'ob.priv.local')}
    <p>${tr('ob.priv.free')}</p>
    <p>${tr('ob.priv.more')}</p></div>`, { cls: 'sheet-sm' }),
}, {
  'ob-name': async (f, form) => {
    const d = data();
    const err = (m) => { const box = form.querySelector('.ob-err'); box.textContent = m; box.hidden = false; };
    d.prenom = normName(f.prenom || '');
    if (!d.prenom) { err(tr('ob.err.name')); form.elements.prenom.focus(); return; }
    if (!form.elements.email) { go(1); return; }
    const email = (f.email || '').trim().toLowerCase();
    d.email = email;
    if (!validEmail(email)) { err(tr('ob.err.email')); form.elements.email.focus(); return; }
    if (passwordIssue(f.password)) { err(`Mot de passe : ${passwordIssue(f.password).toLowerCase()}`); form.elements.password.focus(); return; }
    const btn = document.querySelector('.ob-foot [type=submit]');
    try {
      await busy(btn, 'Création du compte…', () => createAccount({ email, password: f.password, prenom: d.prenom }));
      d.acc = 'done';
      go(1);
    } catch (e) { err(cloudMessage(e)); }
  },
  'ob-profile': (f, form) => {
    const d = data();
    d.situation = f.situation || d.situation; d.defis = readDefis(form);
    d.metier = f.metier || ''; d.service = f.service || (d.metier === 'agence' ? 'site' : 'offre');
    d.societe = (f.societe || '').trim(); d.equipe = f.equipe || 'solo'; d.team = (f.team || '').trim();
    finish();
  },
  login: async (f, form) => {
    const err = (m) => { const box = form.querySelector('.co-err'); box.textContent = m; box.hidden = false; };
    form.querySelector('.co-err').hidden = true;
    const email = (f.email || '').trim().toLowerCase();
    if (!validEmail(email)) { err(tr('login.err.email')); return; }
    if (!f.password) { err(tr('login.err.pw')); return; }
    const btn = form.querySelector('[type=submit]');
    try {
      const ok = await busy(btn, 'Connexion…', () => login(email, f.password));
      if (!ok) { err(hasAccount() ? 'E-mail ou mot de passe incorrect.' : tr('login.err.none')); form.elements.password.select(); return; }
      if (S().onboarded) { location.hash = '#/'; toast(S().profile.prenom ? tr('login.welcome', { prenom: esc(normName(S().profile.prenom)) }) : 'Connexion réussie.', { title: 'Bon retour' }); }
      else { resumeOnboarding(); location.hash = '#/bienvenue'; rr(); }
    } catch (e) { err(e.code ? cloudMessage(e) : e.message); }
  },
});
export { PITCH };
