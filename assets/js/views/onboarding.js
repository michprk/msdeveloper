// Accueil de première ouverture, dans l'esprit des écrans de bienvenue d'Apple.
// 1. L'accroche  2. La présentation (cinq écrans illustrés)  3. Faire connaissance
// 4. Ce qui aiderait le plus  5. Un espace prêt, personnalisé, et l'essai.
// Rejouable par le propriétaire (Compte → Outils de présentation) sans toucher aux données.
import { S, update, PLANS, TRIAL_DAYS, MODULES, addTask, startOfDay, DAY } from '../store.js';
import { ic, esc, register, toast, sheet, sheetHead, closeSheet, cap } from '../ui.js';
import { logoMark } from '../icons.js';
import { SERVICES, SERVICE_IDS } from '../data/scripts.js';
import { PRESETS, preset } from '../data/presets.js';
import { askNotifications, notifSupport } from '../notify.js';
import { PROMISE, PITCH, AUDIENCE } from './common.js';
import { applyPreset } from './crm.js';
import { sparkline } from '../charts.js';

const STEPS = ['welcome', 'tour', 'you', 'goals', 'ready'];
const ob = { i: 0, dir: 1, anim: true, replay: false, d: null, slide: 0 };
const price = (n) => n.toFixed(2).replace('.', ',');

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
// Études seulement : aucun module d'entrepreneuriat (clients, scripts, appels)
const SCHOOL = (sit) => sit === 'etudes';
const defisFor = (sit) => (SCHOOL(sit) ? DEFIS.filter(([id]) => !['clients', 'trouver'].includes(id)) : DEFIS);
const modulesFor = (defis, sit = '') => {
  const mods = ['organiser', 'etudes', 'clients', 'prospecter', 'apprendre'].filter((m) => m === 'organiser' || DEFIS.some(([id, , , , ms]) => defis.includes(id) && ms.includes(m)));
  return SCHOOL(sit) ? [...new Set(['organiser', 'etudes', ...mods])].filter((m) => !['clients', 'prospecter'].includes(m)) : mods;
};

function data() {
  if (!ob.d) {
    const p = S().profile;
    ob.d = { prenom: p.prenom || '', societe: p.societe || '', situation: p.situation || '', equipe: p.equipe || 'solo', defis: [...(p.defis || [])], metier: p.metier || S().crm.preset || '', service: p.service || 'offre', sugg: {} };
  }
  return ob.d;
}
export function startOnboarding(replay = false) { ob.i = 0; ob.dir = 1; ob.anim = true; ob.replay = replay; ob.d = null; ob.slide = 0; }
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

// ---------- Présentation : cinq écrans illustrés ----------
const mkRow = (t, m, cls = '') => `<div class="mk-row"><i class="tick ${cls.includes('done') ? 'is-done' : ''}"></i><span><b class="${cls}">${t}</b><em class="${cls.includes('late') ? 'late' : ''}">${m}</em></span></div>`;
const SLIDES = [
  ['Votre journée sur un écran', 'Les urgences d\'abord, puis le reste. Écrivez « Rappeler Marc demain 14h » : la date et l\'heure se règlent toutes seules.',
    `<div class="mock"><p class="mk-k">Aujourd'hui</p><p class="mk-h">3 choses à faire</p><div class="mk-in">${ic('plus')}Rappeler Marc demain 14h</div>
      ${mkRow('Envoyer le devis Lemaire', 'En retard · hier', 'late')}${mkRow('Appeler le comptable', 'Fait · 10 h', 'done')}${mkRow('Préparer la réunion', '14 h · Travail')}</div>`],
  ['Des notes comme dans un carnet', 'Des pages et des sous-pages, des cases à cocher, des modèles prêts : réunion, projet, journal, révision.',
    `<div class="mock mk-page"><span class="mk-pic">${ic('users')}</span><p class="mk-title">Réunion de lancement</p><p class="mk-h2">Décisions</p>
      <p class="mk-li">Site en ligne avant le 15</p><p class="mk-li">Photos le mardi</p><p class="mk-h2">Actions</p>${mkRow('Envoyer la maquette', 'Léa', 'done')}${mkRow('Réserver le photographe', 'Sam')}</div>`],
  ['Vos clients, étape par étape', 'Un CRM qui parle votre métier : vos étapes, vos champs, et une relance datée pour chaque fiche.',
    `<div class="mock mk-board">${[['Premier contact', 'grey', ['Atelier Pivoine', 'Kiné Flagey']], ['Rendez-vous', 'navy', ['Maison Lemaire']], ['Signé', 'olive', ['Salon Céleste']]].map(([l, t, cards]) => `<div class="mk-col"><p><i class="dot t-${t}"></i>${l}</p>${cards.map((c) => `<span class="mk-card">${c}</span>`).join('')}</div>`).join('')}</div>`],
  ['Des chiffres qui motivent', 'Tâches terminées, montants signés, origine de vos clients : votre progression, semaine après semaine.',
    `<div class="mock mk-stats"><div class="kpi2 k-olive"><span class="kpi2-h"><span class="kpi2-l">Tâches terminées</span><span class="kpi2-ic">${ic('checkSquare')}</span></span><span class="kpi2-v">24</span><span class="kpi2-d up">${ic('arrowR', 'up-ic')}<b>18 %</b><span>vs semaine dernière</span></span>${sparkline([2, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 8])}</div>
      <div class="mk-donut"><span class="mk-ring"></span><ul><li><i class="sw c1"></i>Appel</li><li><i class="sw c2"></i>Recommandation</li><li><i class="sw c3"></i>Instagram</li></ul></div></div>`],
  ['Des quiz pour progresser', 'Organisation, relation client, prix, gestion : dix questions, chacune expliquée. Et vos notes deviennent des cartes de révision.',
    `<div class="mock"><p class="mk-k">Quiz du jour</p><p class="mk-q">La règle des deux minutes dit qu'une tâche courte…</p>
      <span class="mk-opt">se note pour plus tard</span><span class="mk-opt ok">${ic('check')}se fait tout de suite</span><span class="mk-opt">se délègue</span></div>`],
];

export function onboarding() {
  const d = data();
  const step = STEPS[ob.i];
  let body = '';
  const back = ob.i > 0;

  if (step === 'welcome') {
    body = `<div class="ob-page ob-welcome-p">
        <div class="ob-mark">${logoMark('xl draw')}</div>
        <p class="ob-kick">L'app de M&amp;S Design</p>
        <p class="ob-hook">Marre des applications ennuyeuses et des tableaux Excel pour vous organiser&nbsp;?</p>
        <h1 class="ob-name">C'est là qu'intervient <span>MindView</span>.</h1>
        <p class="ob-promise">${PROMISE}</p>
        <p class="ob-p ob-aud">${AUDIENCE}</p>
      </div>
      <div class="ob-foot">
        <button class="ob-privacy" data-act="ob-privacy"><span class="ob-privacy-ic">${ic('lock')}</span><span>Vos données restent sur votre appareil. <u>En savoir plus…</u></span></button>
        <button class="btn btn-apple" data-act="ob-next">Découvrir</button>
        ${ob.replay ? '' : `<label class="btn-text ob-restore">Déjà utilisateur ? Restaurer une sauvegarde<input type="file" accept="application/json,.json" hidden data-act-change="restore"></label>`}
      </div>`;
  } else if (step === 'tour') {
    body = `<div class="ob-page ob-tour-p">
        <div class="tour" tabindex="0" aria-roledescription="carrousel" aria-label="Présentation de l'application">${SLIDES.map(([t, p, m], k) => `<section class="tour-s" aria-roledescription="diapositive" aria-label="${k + 1} sur ${SLIDES.length}"><div class="tour-m">${m}<span class="tag tour-tag">Exemple</span></div><h2 class="ob-h">${t}</h2><p class="ob-p">${p}</p></section>`).join('')}</div>
        <div class="tour-dots" role="tablist" aria-label="Diapositives">${SLIDES.map((_, k) => `<button class="${k === ob.slide ? 'on' : ''}" data-act="ob-slide" data-k="${k}" aria-label="Diapositive ${k + 1}"></button>`).join('')}</div>
      </div>
      <div class="ob-foot">
        <button class="btn btn-apple" data-act="ob-tour-next">${ob.slide < SLIDES.length - 1 ? 'Suivant' : 'Faisons connaissance'}</button>
        <button class="btn-text" data-act="ob-next">Passer la présentation</button>
      </div>`;
  } else if (step === 'you') {
    body = `<form class="ob-page" data-form="ob-you" id="ob-form" data-validate novalidate>
        <h1 class="ob-h">Faisons connaissance</h1>
        <p class="ob-p">Quelques questions, et l'application se règle pour vous. Tout se change plus tard.</p>
        <div class="group">
          <label class="group-r"><span>Prénom</span><input name="prenom" value="${esc(d.prenom)}" placeholder="Obligatoire" autocomplete="given-name" required></label>
          <label class="group-r"><span>Société</span><input name="societe" value="${esc(d.societe)}" placeholder="Facultatif" autocomplete="organization"></label>
        </div>
        <p class="group-k">Vous êtes…</p>
        <div class="pick-cards" role="radiogroup" aria-label="Votre situation">${SITUATIONS.map(([id, l, sub, i]) => `<label class="pick-c"><input type="radio" name="situation" value="${id}" ${d.situation === id ? 'checked' : ''}><span class="pick-ic">${ic(i)}</span><b>${l}</b><em>${sub}</em></label>`).join('')}</div>
        <p class="group-k">Vous travaillez</p>
        <div class="seg ob-seg" role="radiogroup" aria-label="Vous travaillez">${[['solo', 'En solo', 'user'], ['equipe', 'En équipe', 'users']].map(([v, l, i]) => `<label class="seg-i"><input type="radio" name="equipe" value="${v}" ${d.equipe === v ? 'checked' : ''}>${ic(i)}<span>${l}</span></label>`).join('')}</div>
      </form>
      <div class="ob-foot"><button class="btn btn-apple" type="submit" form="ob-form" data-needs="prenom" ${d.prenom ? '' : 'disabled'}>Continuer</button></div>`;
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
    const mods = modulesFor(d.defis, d.situation);
    const pr = d.metier && preset(d.metier);
    const sugg = d.defis.map((id) => [id, ...SUGG[id]]).slice(0, 3);
    if (!Object.keys(d.sugg).length) sugg.forEach(([id]) => { d.sugg[id] = true; });
    body = `<div class="ob-page">

        <h1 class="ob-h">Votre espace est prêt${d.prenom ? `, ${esc(cap(d.prenom))}` : ''}</h1>
        <ul class="ready-l">
          <li><span class="tt-ic f-blue">${ic('grid')}</span><div><b>Vos modules</b><p>${mods.map((m) => MODULES[m].label).join(' · ')}</p></div></li>
          ${pr ? `<li><span class="tt-ic f-olive">${ic(pr.icon)}</span><div><b>Votre CRM : ${esc(pr.label)}</b><p>Vos fiches s'appellent « ${esc(pr.noun)} »${Object.keys(pr.labels).length ? `, étapes ${esc(pr.labels.a_appeler)} → ${esc(pr.labels.rdv)} → ${esc(pr.labels.signe)}` : ''}.</p></div></li>` : ''}
          ${d.equipe === 'equipe' ? `<li><span class="tt-ic f-sky">${ic('users')}</span><div><b>En équipe</b><p>Ajoutez vos associés dans Personnaliser le CRM : chaque fiche aura un responsable.</p></div></li>` : ''}
        </ul>
        ${sugg.length ? `<p class="group-k">Vos premières tâches, à cocher ou non</p>
        <div class="group">${sugg.map(([id, t, day]) => `<label class="group-r is-pick is-multi"><input type="checkbox" ${d.sugg[id] ? 'checked' : ''} data-act-change="ob-sugg" data-id="${id}"><span class="group-ic f-olive">${ic('checkSquare')}</span><span class="group-t"><b>${esc(t)}</b><em>${day ? 'Demain' : 'Aujourd\'hui'}</em></span>${ic('check', 'group-ck')}</label>`).join('')}</div>` : ''}
        <p class="group-k">Essai gratuit de ${TRIAL_DAYS} jours</p>
        <p class="ob-trial-t">Tout est ouvert pendant ${TRIAL_DAYS} jours, sans carte. Ensuite, Pro à ${price(PLANS.pro.price)} € ou Premium à ${price(PLANS.premium.price)} € par mois, ou la version gratuite : tâches, calendrier, quiz, 1 projet et 5 pages. Vos données restent.</p>
      </div>
      <div class="ob-foot">
        <button class="btn btn-apple" data-act="ob-finish" data-trial="1">${S().sub.trialStart && !ob.replay ? 'Ouvrir mon espace' : 'Commencer l\'essai gratuit'}</button>
        <button class="btn-text" data-act="ob-finish" data-trial="0">Continuer avec la version gratuite</button>
        <p class="ob-small">Paiement en ligne pas encore ouvert : aucune carte demandée, aucun prélèvement.</p>
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
          if (btn) btn.textContent = k < SLIDES.length - 1 ? 'Suivant' : 'Faisons connaissance';
        }, 60);
      };
      tour.addEventListener('scroll', onScroll, { passive: true });
      return () => tour.removeEventListener('scroll', onScroll);
    },
  };
}

const rr = () => window.dispatchEvent(new Event('ms:rerender'));
const go = (delta) => { ob.dir = delta; ob.anim = true; ob.i = Math.max(0, Math.min(STEPS.length - 1, ob.i + delta)); rr(); window.scrollTo(0, 0); };
const goSlide = (k) => {
  const tour = document.querySelector('.tour');
  ob.slide = Math.max(0, Math.min(SLIDES.length - 1, k));
  tour?.scrollTo({ left: ob.slide * tour.clientWidth, behavior: document.documentElement.dataset.motion === 'reduce' ? 'auto' : 'smooth' });
  document.querySelectorAll('.tour-dots button').forEach((b, i) => b.classList.toggle('on', i === ob.slide));
  const btn = document.querySelector('[data-act="ob-tour-next"]');
  if (btn) btn.textContent = ob.slide < SLIDES.length - 1 ? 'Suivant' : 'Faisons connaissance';
};

function finish(trial) {
  const d = data();
  const first = !S().onboarded;
  const wasReplay = ob.replay;
  const sit = SITUATIONS.find((x) => x[0] === d.situation);
  const metier = d.metier || sit?.[4] || '';
  update((s) => {
    s.profile.prenom = d.prenom.trim(); s.profile.societe = d.societe.trim();
    s.profile.situation = d.situation; s.profile.equipe = d.equipe; s.profile.defis = [...d.defis];
    s.profile.usages = modulesFor(d.defis, d.situation);
    s.profile.metier = metier;
    s.profile.service = d.service || (metier === 'agence' ? 'site' : 'offre');
    if (trial && !s.sub.trialStart) s.sub.trialStart = Date.now();
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
  location.hash = '#/';
  if (!wasReplay) setTimeout(() => toast(trial ? `Toutes les fonctions sont ouvertes pendant ${TRIAL_DAYS} jours.` : 'Votre espace est prêt.', { title: trial ? 'Essai gratuit activé' : 'Bienvenue' }), 450);
}

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
register({
  'ob-next': () => go(1),
  'ob-back': () => {
    const f = document.getElementById('ob-form');
    const d = data();
    if (f?.dataset.form === 'ob-you') { d.prenom = f.elements.prenom.value; d.societe = f.elements.societe.value; d.situation = f.elements.situation.value || d.situation; d.equipe = f.elements.equipe.value || d.equipe; }
    if (f?.dataset.form === 'ob-goals') { d.defis = readDefis(f); d.metier = f.elements.metier.value; }
    go(-1);
  },
  'ob-tour-next': () => { if (ob.slide < SLIDES.length - 1) goSlide(ob.slide + 1); else go(1); },
  'ob-slide': (b) => goSlide(+b.dataset.k),
  'ob-quit': () => { ob.replay = false; ob.d = null; ob.i = 0; try { sessionStorage.setItem('msdev:intro', '1'); } catch (e) { /* rien */ } location.hash = '#/'; },
  'ob-finish': (b) => finish(b.dataset.trial === '1'),
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
    <p>Vous pouvez à tout moment télécharger une sauvegarde, la restaurer sur un autre appareil, ou tout supprimer depuis votre compte.</p>
    <p>Quand vous appelez quelqu'un depuis une fiche, c'est votre téléphone qui compose : l'application ne passe pas d'appel elle-même.</p>
    <p>Le détail complet, et vos droits (RGPD), sont dans Compte → Confidentialité.</p></div>`, { cls: 'sheet-sm' }),
}, {
  'ob-you': (f) => {
    const d = data();
    d.prenom = (f.prenom || '').trim(); d.societe = (f.societe || '').trim(); d.situation = f.situation || ''; d.equipe = f.equipe || 'solo';
    if (!d.prenom) return;
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
    d.sugg = {};
    go(1);
  },
});
export { PITCH };
