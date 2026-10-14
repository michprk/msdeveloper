// Académie, abonnement, compte et réglages, menu « Plus ».
import { S, update, can, access, PLANS, FEATURES, TRIAL_DAYS, trialActive, trialLeft, trialEnd, replaceState, resetState, mergeImport, uid } from '../store.js';
import { ic, esc, eur, register, toast, confirmSheet, download, field, input, select, sheet, sheetHead, closeSheet, planBadge, avatar, busy, pause, dateLong } from '../ui.js';
import { GUIDES } from '../data/guides.js';
import { SECTORS } from '../data/sectors.js';
import { SERVICES, SERVICE_IDS, scriptCount, typo, CHANNELS, getSector, allSectors } from '../data/scripts.js';
import { demoData, clearDemo } from '../data/demo.js';
import { pageHead, paywall, subscribeSheet, accessLabel, PROMISE, PITCH, AUDIENCE, BENEFITS } from './common.js';
import { startOnboarding, notifSheet } from './onboarding.js';
import { flower } from './flowers.js';
import { askNotifications, notifSupport, testNotification } from '../notify.js';
import { hasLock, lockSupported, setLock, checkCode, clearLock, lockNow } from '../lock.js';

const VERSION = '1.2.0';
const T = (s) => esc(typo(s));

// ---------- Académie (avec suivi de progression) ----------
const PATHS = { debut: ['prendre-rdv', 'etre-attrayant', 'preparer-appel', 'objections'], regulier: ['session', 'horaires', 'relances', 'prix'], expert: ['entonnoir', 'offre', 'avis-google', 'premier-rdv'] };
const isRead = (id) => !!S().academy?.read?.[id];

export function academy() {
  const s = S();
  const read = GUIDES.filter((g) => isRead(g.id)).length;
  const lv = s.profile.niveau || 'debut';
  const path = (PATHS[lv] || []).map((id) => GUIDES.find((g) => g.id === id)).filter(Boolean);
  const last = s.academy?.last && GUIDES.find((g) => g.id === s.academy.last && !isRead(g.id));
  const resume = last || path.find((g) => !isRead(g.id)) || GUIDES.find((g) => !isRead(g.id));
  const label = { debut: 'Pour bien démarrer', regulier: 'Pour passer à la vitesse supérieure', expert: 'Pour affiner votre méthode' }[lv];
  const html = `${pageHead('Académie', { kicker: `${GUIDES.length} guides pratiques` })}
    <section class="card progress-card rise">
      <div class="pg-top"><div><p class="pg-n"><b>${read}</b> / ${GUIDES.length}</p><p class="muted-s">guides lus</p></div>
        ${resume ? `<a class="btn btn-primary" href="#/academie/${resume.id}">${ic('play')}<span>${last ? 'Reprendre' : read ? 'Continuer' : 'Commencer'}</span></a>` : `<span class="chip t-olive">${ic('check')}Tout est lu</span>`}</div>
      <span class="bar olive"><i style="width:${(read / GUIDES.length) * 100}%"></i></span>
      ${resume ? `<p class="pg-next">${last ? 'En cours' : 'Prochain'} : <a href="#/academie/${resume.id}">${T(resume.title)}</a></p>` : ''}
    </section>
    <section class="card parcours rise"><header class="card-h"><div><h2>Votre parcours</h2><p>${label} · ${path.filter((g) => isRead(g.id)).length} / ${path.length} lus</p></div><a class="link" href="#/reglages?s=offre">Changer de niveau</a></header>
      <ol class="pc">${path.map((g) => `<li class="${isRead(g.id) ? 'is-read' : ''}"><a href="#/academie/${g.id}"><b>${T(g.title)}</b><span>${g.cat} · ${g.min} min${isRead(g.id) ? ' · lu' : !g.free && !can('academy') ? ' · Pro' : ''}</span></a></li>`).join('')}</ol></section>
    <h2 class="sec-title">Tous les guides</h2>
    <div class="guide-grid">${GUIDES.map((g, i) => {
      const locked = !g.free && !can('academy');
      return `<a class="card guide rise ${isRead(g.id) ? 'is-read' : ''}" style="--i:${i}" href="#/academie/${g.id}"><span class="guide-k">${g.cat} · ${g.min} min</span><b>${T(g.title)}</b><span class="guide-p">${T(g.intro)}</span>${isRead(g.id) ? `<span class="guide-l is-read">${ic('check')}Lu</span>` : locked ? `<span class="guide-l">${ic('lock')}Pro</span>` : ''}</a>`;
    }).join('')}</div>`;
  return { title: 'Académie', tab: 'plus', html };
}

export function guide([id]) {
  const g = GUIDES.find((x) => x.id === id);
  if (!g) return null;
  const locked = !g.free && !can('academy');
  if (!locked && S().academy?.last !== id) update((s) => { s.academy.last = id; }, { silent: true });
  const i = GUIDES.indexOf(g), next = GUIDES[i + 1];
  const read = isRead(id);
  const block = ([type, val]) => {
    if (type === 'h') return `<h2>${T(val)}</h2>`;
    if (type === 'p') return `<p>${T(val)}</p>`;
    if (type === 'ul' || type === 'ol') return `<${type}>${val.map((x) => `<li>${T(x)}</li>`).join('')}</${type}>`;
    if (type === 'tip') return `<div class="tip"><p class="tip-k">À retenir</p><p>${T(val)}</p></div>`;
    if (type === 'say') return `<blockquote class="say">« ${T(val)} »</blockquote>`;
    if (type === 'sectors') return `<div class="tbl-wrap"><table class="tbl tbl-cards"><thead><tr><th>Secteur</th><th>Quand appeler</th><th>À éviter</th></tr></thead><tbody>${SECTORS.map((s) => `<tr><td data-l="Secteur"><b>${esc(s.name)}</b></td><td data-l="Quand appeler">${T(s.horaire)}</td><td data-l="À éviter">${T(s.eviter)}</td></tr>`).join('')}</tbody></table></div>`;
    return '';
  };
  const html = `${pageHead(T(g.title), { kicker: `${g.cat} · ${g.min} min de lecture${read ? ' · lu' : ''}`, back: '#/academie' })}
    <article class="article rise"><p class="lead">${T(g.intro)}</p>
      ${locked ? paywall('academy', { compact: true }) : g.body.map(block).join('')}</article>
    ${locked ? '' : `<div class="guide-end" id="guide-end">
      <button class="btn ${read ? 'btn-ghost' : 'btn-olive'}" data-act="guide-read" data-id="${id}" aria-pressed="${read}">${ic('check')}<span>${read ? 'Lu — marquer comme non lu' : 'Marquer comme lu'}</span></button>
    </div>`}
    ${next && !locked ? `<a class="card next-guide" href="#/academie/${next.id}"><span class="guide-k">Guide suivant</span><b>${T(next.title)}</b>${ic('arrowR', 'chev')}</a>` : ''}`;
  return {
    title: g.title, tab: 'plus', html,
    after(root) {
      // Arrivé au bout du guide : il est marqué comme lu.
      const end = root.querySelector('#guide-end');
      if (!end || read || !('IntersectionObserver' in window)) return;
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting) && window.scrollY > 200) {
          io.disconnect();
          update((s) => { s.academy.read[id] = Date.now(); });
          toast(`Guide terminé : ${GUIDES.filter((x) => isRead(x.id)).length} sur ${GUIDES.length}`, { ms: 1800 });
        }
      });
      io.observe(end);
      return () => io.disconnect();
    },
  };
}

// ---------- Abonnement : statut réel et limites ----------
const FEATURE_LABELS = [
  ['scriptsFree', 'Scripts d\'appel à froid (23 secteurs, 3 services)', 'free'],
  ['crm', 'Prospects : pipeline, fiches, historique, CRM personnalisé', 'pro'],
  ['scriptsAll', `Les ${scriptCount()} scripts et les situations délicates`, 'pro'],
  ['callMode', 'Mode appel avec enregistrement du résultat', 'pro'],
  ['agenda', 'Agenda, relances et rappels', 'pro'],
  ['projects', 'Suivi des clients signés', 'pro'],
  ['academy', 'Académie complète (14 guides)', 'pro'],
  ['audit', 'Audit express, messages, import de listes', 'pro'],
  ['quote', 'Devis imprimables en PDF', 'premium'],
  ['myScripts', 'Vos scripts et vos propres secteurs', 'premium'],
  ['training', 'Entraînement aux objections', 'premium'],
  ['stats', 'Statistiques détaillées', 'premium'],
  ['export', 'Export CSV des fiches', 'premium'],
];
const price = (n) => n.toFixed(2).replace('.', ',');
const RANK = { free: 0, pro: 1, premium: 2 };

export function plans() {
  const s = S(), cur = access();
  const trialUsed = !!s.sub.trialStart, inTrial = s.sub.plan === 'free' && trialActive();
  const status = s.sub.demo ? ['Mode démonstration', `Affichage ${PLANS[s.sub.demo].name}, activé depuis le compte. Ce n'est pas un abonnement.`]
    : inTrial ? ['Essai gratuit', `Toutes les fonctions jusqu'au ${dateLong(trialEnd()).toLowerCase()} (encore ${trialLeft()} jour${trialLeft() > 1 ? 's' : ''}).`]
      : trialUsed && s.sub.plan === 'free' ? ['Version gratuite', `Votre essai s'est terminé le ${dateLong(trialEnd()).toLowerCase()}. Vos fiches sont conservées.`]
        : s.sub.plan !== 'free' ? [PLANS[s.sub.plan].name, 'Abonnement actif.'] : ['Version gratuite', 'Les scripts d\'appel à froid et trois guides sont inclus.'];
  const card = (id) => {
    const p = PLANS[id];
    const isCur = cur === id && !inTrial && !s.sub.demo;
    return `<section class="plan rise ${id === 'premium' ? 'is-dark' : ''}">${id === 'premium' ? flower(2, 'plan-fl') : ''}
      <header><h2>${id === 'free' ? 'Gratuit' : p.name}</h2><p class="plan-p">${p.price ? `<b>${price(p.price)} €</b><span>par mois</span>` : '<b>0 €</b>'}</p></header>
      <ul class="plan-f">${FEATURE_LABELS.filter(([, , need]) => need === id).map(([, l]) => `<li>${ic('check')}<span>${l}</span></li>`).join('')}</ul>
      ${id !== 'free' ? `<p class="plan-plus">${id === 'pro' ? 'En plus de la version gratuite' : 'En plus de tout Pro'}</p>` : ''}
      ${isCur ? '<p class="plan-cur">Votre formule</p>' : id === 'free' ? '' : `<button class="btn ${id === 'premium' ? 'btn-sky' : 'btn-primary'} btn-block" data-act="subscribe" data-plan="${id}">Choisir ${p.name}</button>`}
    </section>`;
  };
  const html = `${pageHead('Abonnement', { kicker: 'Votre formule et ce qu\'elle comprend', back: '#/reglages' })}
    <section class="card status-card rise">
      <div class="status-top"><span class="status-ic">${ic(inTrial ? 'hourglass' : 'diamond')}</span><div><p class="muted-s">Statut actuel</p><h2>${status[0]}</h2><p>${status[1]}</p></div></div>
      <div class="status-pay">${ic('lock')}<p><b>Paiement en ligne : pas encore ouvert.</b> Aucune carte n'est demandée et aucun prélèvement n'est fait. Les abonnements payants ouvriront au lancement officiel.</p></div>
      ${!trialUsed ? `<button class="btn btn-primary btn-block" data-act="start-trial">Commencer l'essai gratuit de ${TRIAL_DAYS} jours</button>` : ''}
    </section>
    <section class="card rise">
      <header class="card-h"><div><h2>Vos accès aujourd'hui</h2><p>${cur === 'premium' ? 'Toutes les fonctions sont ouvertes' : 'Ce qui est ouvert, et ce qui demande une formule'}</p></div></header>
      <ul class="access">${FEATURE_LABELS.map(([, l, need]) => { const ok = RANK[cur] >= RANK[need]; return `<li class="${ok ? 'is-ok' : ''}"><span class="acc-ic">${ic(ok ? 'check' : 'lock')}</span><span>${l}</span>${ok ? '' : `<span class="badge b-${need}">${PLANS[need].name}</span>`}</li>`; }).join('')}</ul>
    </section>
    <h2 class="sec-title">Les formules</h2>
    <div class="plans">${['free', 'pro', 'premium'].map(card).join('')}</div>
    <section class="faq">
      <h2 class="sec-title">Questions fréquentes</h2>
      ${[
        ['L\'essai est-il vraiment gratuit ?', `Oui : ${TRIAL_DAYS} jours, toutes les fonctions, sans carte bancaire. À la fin, l'application passe en version gratuite si vous ne choisissez rien.`],
        ['Que deviennent mes fiches après l\'essai ?', 'Elles restent sur votre appareil. Les prospects se verrouillent mais rien n\'est effacé : vous les retrouvez dès que vous vous abonnez.'],
        ['Puis-je arrêter quand je veux ?', 'Les abonnements seront mensuels, sans engagement de durée. Vous pourrez passer de Pro à Premium, ou l\'inverse, à tout moment.'],
        ['Où sont stockées mes données ?', 'Sur votre appareil uniquement, pour l\'instant. Pensez à faire une sauvegarde depuis votre compte. Les comptes en ligne et la synchronisation arriveront avec le paiement.'],
        ['Et sur l\'App Store ?', 'La version App Store suivra les règles d\'Apple pour les abonnements vendus dans une application. En attendant, l\'application s\'installe depuis Safari, sur l\'écran d\'accueil.'],
      ].map(([q, a]) => `<details class="obj"><summary><span>${q}</span>${ic('chevD', 'chev')}</summary><p>${a}</p></details>`).join('')}
    </section>`;
  return { title: 'Abonnement', tab: 'plus', html };
}

// ---------- Compte et réglages ----------
export function settings(params, q = {}) {
  const s = S(), p = s.profile, g = s.goals;
  const theme = s.prefs.theme, motion = s.prefs.motion, size = s.prefs.textSize || 'm';
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const html = `${pageHead('Compte', { kicker: 'Profil, préférences, sécurité et données' })}
    <section class="card account rise">
      <div class="acc-top">${avatar(p.prenom || 'M S', 'xl')}<div><h2>${esc(p.prenom || 'Votre profil')}</h2><p>${esc(p.societe || 'Société non renseignée')}</p>${planBadge()}</div></div>
      <a class="row" href="#/abonnement"><span class="menu-ic">${ic('diamond')}</span><span class="row-b"><b>Abonnement</b><span>${esc(accessLabel())}</span></span>${ic('chevR', 'chev')}</a>
      <div class="acc-note">${ic('globe')}<p><b>Compte en ligne : bientôt.</b> Aujourd'hui, vos données sont enregistrées uniquement sur cet appareil. La connexion et la synchronisation entre téléphone et ordinateur arriveront avec le lancement.</p></div>
    </section>

    <h2 class="sec-title">Votre activité</h2>
    <form class="card form rise" data-form="profile" data-autosave data-validate novalidate>
      <header class="card-h"><div><h2>Profil</h2><p>Repris dans les scripts, les messages et les devis</p></div></header>
      <div class="form-2">${field('Prénom', input('prenom', p.prenom, 'autocomplete="given-name" required'))}${field('Société', input('societe', p.societe, 'autocomplete="organization"'))}</div>
      <div class="form-2">${field('Ville', input('ville', p.ville))}${field('Téléphone', input('tel', p.tel, 'type="tel" autocomplete="tel" data-rule="tel"'))}</div>
      <div class="form-2">${field('E-mail', input('email', p.email, 'type="email" autocomplete="email"'))}${field('Adresse', input('adresse', p.adresse, 'autocomplete="street-address"'))}</div>
      <div class="form-2">${field('N° d\'entreprise / TVA', input('tva', p.tva, 'placeholder="BE0123.456.789"'))}${field('IBAN (devis)', input('iban', p.iban, 'placeholder="BE.."'))}</div>
    </form>
    <form class="card form rise" id="offre" data-form="offer" data-autosave>
      <header class="card-h"><div><h2>Votre offre</h2><p>Les prix « à partir de » cités dans les scripts</p></div></header>
      <div class="form-2">${field('Service principal', select('service', SERVICE_IDS.map((x) => [x, SERVICES[x].label]), p.service))}${field('Votre expérience', select('niveau', [['debut', 'Je débute'], ['regulier', 'J\'ai déjà prospecté'], ['expert', 'C\'est mon quotidien']], p.niveau || 'debut'))}</div>
      <div class="field"><span class="field-l">Vos secteurs</span><div class="chips-wrap my-secs">${(p.secteurs || []).map((id) => getSector(id)).filter(Boolean).map((x) => `<span class="chip t-olive">${ic(x.icon)}${esc(x.name)}</span>`).join('') || '<span class="muted-s">Aucun secteur choisi</span>'}<button type="button" class="chip-btn" data-act="sectors-edit">${ic('edit')}Modifier</button></div></div>
      <div class="form-3">${SERVICE_IDS.map((x) => field(SERVICES[x].short, input(`prix_${x}`, p.prix[x]))).join('')}</div>
      ${field('Votre promesse', `<textarea class="inp" name="promesse" rows="2">${esc(p.promesse)}</textarea>`, 'Une phrase qui rassure : prix fixe, délai garanti, interlocuteur unique…')}
    </form>
    <form class="card form rise" data-form="goals" data-autosave>
      <header class="card-h"><div><h2>Objectifs</h2><p>Affichés sur l'écran Aujourd'hui</p></div></header>
      <div class="form-3">${field('Appels par jour', input('appelsJour', g.appelsJour, 'type="number" min="1" inputmode="numeric"'))}${field('RDV par semaine', input('rdvSemaine', g.rdvSemaine, 'type="number" min="0" inputmode="numeric"'))}${field('Signé par mois (€)', input('caMois', g.caMois, 'type="number" min="0" step="50" inputmode="numeric"'))}</div>
    </form>
    <a class="card wide-tile rise" href="#/crm/personnaliser"><span class="sec-ic lg t-olive">${ic('sliders')}</span><span class="wide-b"><b>Personnaliser le CRM</b><span>Étapes du pipeline, champs, équipe, import de vos données.</span></span>${ic('chevR', 'chev')}</a>
    <section class="card rise" id="catalogue">
      <header class="card-h"><div><h2>Catalogue de prestations</h2><p>Utilisé par l'outil Devis</p></div><button class="link" data-act="cat-add">${ic('plus')}Ajouter</button></header>
      <ul class="cat">${s.catalogue.map((c) => `<li><input class="inp" value="${esc(c.label)}" aria-label="Prestation" data-act-change="cat-edit" data-id="${c.id}" data-k="label"><input class="inp price" type="number" min="0" value="${c.price}" aria-label="Prix" data-act-change="cat-edit" data-id="${c.id}" data-k="price"><label class="mini-check"><input type="checkbox" ${c.monthly ? 'checked' : ''} data-act-change="cat-edit" data-id="${c.id}" data-k="monthly"><span>/mois</span></label><button class="icon-btn sm" data-act="cat-del" data-id="${c.id}" aria-label="Supprimer ${esc(c.label)}">${ic('x')}</button></li>`).join('')}</ul>
    </section>

    <h2 class="sec-title">Préférences</h2>
    <section class="card rise">
      <header class="card-h"><div><h2>Affichage</h2></div></header>
      <p class="field-l">Thème</p>
      <nav class="seg seg-sm">${[['light', 'Clair', 'sun'], ['dark', 'Sombre', 'moon'], ['auto', 'Automatique', 'refresh']].map(([v, l, i]) => `<button class="seg-i ${theme === v ? 'is-on' : ''}" data-act="pref" data-k="theme" data-v="${v}" aria-pressed="${theme === v}">${ic(i)}<span>${l}</span></button>`).join('')}</nav>
      <p class="field-l">Taille du texte</p>
      <nav class="seg seg-sm">${[['m', 'Standard'], ['l', 'Grande'], ['xl', 'Très grande']].map(([v, l]) => `<button class="seg-i ${size === v ? 'is-on' : ''}" data-act="pref" data-k="textSize" data-v="${v}" aria-pressed="${size === v}">${l}</button>`).join('')}</nav>
      <p class="field-l">Animations</p>
      <nav class="seg seg-sm">${[['full', 'Complètes'], ['reduce', 'Réduites']].map(([v, l]) => `<button class="seg-i ${motion === v ? 'is-on' : ''}" data-act="pref" data-k="motion" data-v="${v}" aria-pressed="${motion === v}">${l}</button>`).join('')}</nav>
    </section>
    <section class="card rise">
      <header class="card-h"><div><h2>Notifications</h2><p>${perm === 'granted' ? 'Autorisées sur cet appareil' : perm === 'denied' ? 'Bloquées dans les réglages du navigateur' : perm === 'default' ? 'Pas encore autorisées' : esc(notifSupport().hint)}</p></div></header>
      <div class="ios-list"><label class="ios-row"><span><b>Rappel avant chaque tâche</b><em>Et un résumé chaque matin. Fonctionne quand l'application est ouverte ou vient de l'être.</em></span><input type="checkbox" class="switch" ${s.prefs.notifs !== false ? 'checked' : ''} data-act-change="pref-switch" data-k="notifs"></label></div>
      <div class="act-row">${perm === 'default' ? `<button class="btn btn-primary" data-act="notif-ask-sheet">${ic('bell')}<span>Autoriser</span></button>` : ''}<button class="btn btn-ghost" data-act="notif-test">${ic('bell')}<span>Tester</span></button></div>
    </section>
    <section class="card rise">
      <header class="card-h"><div><h2>Installer l'application</h2><p>Écran d'accueil du téléphone, Dock du Mac, bureau du PC</p></div></header>
      <button class="btn btn-ghost" data-act="install">${ic('install')}<span>Installer M&amp;S Developer</span></button>
    </section>

    <h2 class="sec-title">Sécurité et session</h2>
    <section class="card rise">
      <header class="card-h"><div><h2>Code de verrouillage</h2><p>${hasLock() ? 'Activé sur cet appareil' : 'Désactivé'}</p></div><span class="chip ${hasLock() ? 't-olive' : ''}">${ic('lock')}${hasLock() ? 'Activé' : 'Désactivé'}</span></header>
      <p class="body">Un code à 4 chiffres protège l'accès à vos fiches si quelqu'un prend votre téléphone. Il ne chiffre pas les données et ne peut pas être récupéré : pensez à la sauvegarde.</p>
      ${hasLock() ? `<div class="ios-list"><label class="ios-row"><span><b>Verrouiller après 5 minutes en arrière-plan</b></span><input type="checkbox" class="switch" ${s.lock?.auto !== false ? 'checked' : ''} data-act-change="lock-auto"></label></div>` : ''}
      <div class="act-row">${!lockSupported() ? '<p class="field-h">Le verrouillage demande une connexion sécurisée (https).</p>' : hasLock() ? `<button class="btn btn-primary" data-act="lock-now">${ic('lock')}<span>Verrouiller maintenant</span></button><button class="btn btn-ghost" data-act="lock-change">Changer le code</button><button class="btn btn-ghost" data-act="lock-off">Désactiver</button>` : `<button class="btn btn-primary" data-act="lock-set">${ic('lock')}<span>Activer un code</span></button>`}</div>
    </section>

    <h2 class="sec-title">Présentation</h2>
    <section class="card rise">
      <header class="card-h"><div><h2>Montrer l'application</h2><p>Pour une démonstration à un futur client</p></div></header>
      <div class="ios-list">
        <label class="ios-row"><span><b>Rejouer l'accueil à chaque ouverture</b><em>Vos clients, eux, ne le voient qu'une fois.</em></span><input type="checkbox" class="switch" ${s.prefs.replayIntro ? 'checked' : ''} data-act-change="pref-switch" data-k="replayIntro"></label>
      </div>
      <div class="btn-list">
        <button class="btn btn-ghost" data-act="replay-intro">${ic('play')}<span>Revoir l'accueil maintenant</span></button>
        ${s.prospects.some((x) => x.demo) ? `<button class="btn btn-ghost" data-act="clear-demo">${ic('x')}<span>Effacer les données de démonstration</span></button>` : `<button class="btn btn-ghost" data-act="load-demo">${ic('users')}<span>Charger des données de démonstration</span></button>`}
      </div>
      <label class="field"><span class="field-l">Mode démonstration</span>${select('demo', [['', 'Désactivé'], ['pro', 'Afficher comme Pro'], ['premium', 'Afficher comme Premium']], s.sub.demo || '', 'data-act-change="demo-mode"')}<span class="field-h">Ouvre toutes les fonctions le temps d'une présentation. Ce n'est pas un abonnement.</span></label>
    </section>

    <h2 class="sec-title">Vos données</h2>
    <section class="card rise">
      <header class="card-h"><div><h2>Sauvegarde et import</h2><p>${s.prospects.length} fiche${s.prospects.length > 1 ? 's' : ''} · ${s.activities.length} échange${s.activities.length > 1 ? 's' : ''} sur cet appareil</p></div></header>
      <div class="btn-list">
        <button class="btn btn-ghost" data-act="backup">${ic('download')}<span>Télécharger une sauvegarde</span></button>
        <label class="btn btn-ghost">${ic('upload')}<span>Importer un fichier (ajoute sans rien effacer)</span><input type="file" accept="application/json,.json" hidden data-act-change="import-merge"></label>
        <label class="btn btn-ghost">${ic('refresh')}<span>Restaurer une sauvegarde (remplace tout)</span><input type="file" accept="application/json,.json" hidden data-act-change="restore"></label>
        <button class="btn btn-ghost" data-act="export-csv" ${s.prospects.length ? '' : 'disabled'}>${ic('list')}<span>Exporter les fiches (CSV)</span>${can('export') ? '' : '<span class="badge b-premium">Premium</span>'}</button>
      </div>
    </section>
    <section class="card danger-zone rise">
      <header class="card-h"><div><h2>Supprimer toutes mes données</h2><p>Fiches, historique, réglages : tout est effacé de cet appareil</p></div></header>
      <button class="btn btn-danger-ghost" data-act="wipe">${ic('trash')}<span>Supprimer toutes mes données</span></button>
    </section>

    <section class="about-card rise">
      <p class="about-p"><b>${PROMISE}</b> ${PITCH}</p>
      <p class="about">M&amp;S Developer ${VERSION} · ${scriptCount()} scripts · conçu à Bruxelles par M&amp;S Design</p>
    </section>`;
  return { title: 'Compte', tab: 'plus', html, after(root) { if (q.s) setTimeout(() => root.querySelector('#' + CSS.escape(q.s))?.scrollIntoView({ block: 'start' }), 50); } };
}

// ---------- Plus (mobile) ----------
export function more() {
  const s = S(), p = s.profile;
  const read = GUIDES.filter((g) => isRead(g.id)).length;
  const groups = [
    ['Suivi', [['#/agenda', 'calendar', 'Agenda', 'Rappels, rendez-vous, relances'], ['#/projets', 'folder', 'Clients signés', 'Projets en cours, délais, étapes']]],
    ['Outils', [['#/outils/devis', 'invoice', 'Devis', 'Calculé et imprimable en PDF', 'quote'], ['#/outils/messages', 'message', 'Messages prêts à envoyer', 'Confirmation, relance, avis', 'messages'], ['#/outils/audit', 'clipboard', 'Audit express', 'La présence en ligne notée sur 10', 'audit'], ['#/outils/import', 'upload', 'Importer une liste', 'Depuis un tableur', 'import'], ['#/outils/stats', 'chart', 'Statistiques', 'Vos taux, étape par étape', 'stats'], ['#/outils/entrainement', 'target', 'Entraînement', 'Répondre aux objections', 'training'], ['#/outils/mes-scripts', 'edit', 'Mes scripts et secteurs', 'Vos propres versions', 'myScripts']]],
    ['Progresser', [['#/academie', 'book', 'Académie', `${read} / ${GUIDES.length} guides lus`]]],
    ['Compte', [['#/abonnement', 'diamond', 'Abonnement', accessLabel()], ['#/reglages', 'sliders', 'Compte et réglages', 'Profil, sécurité, données'], ['#/crm/personnaliser', 'crm', 'Personnaliser le CRM', 'Étapes, champs, équipe']]],
  ];
  const html = `${pageHead('Plus')}
    <a class="card me rise" href="#/reglages">${avatar(p.prenom || 'M S', 'lg')}<span class="row-b"><b>${esc(p.prenom || 'Votre compte')}</b><span>${esc(p.societe || 'Ajoutez votre société')}</span></span>${planBadge()}</a>
    ${groups.map(([gname, items]) => `<h2 class="sec-title">${gname}</h2><ul class="menu card rise">${items.map(([h, i, t, d, f]) => `<li><a class="row" href="${h}"><span class="menu-ic">${ic(i)}</span><span class="row-b"><b>${t}</b><span>${esc(d)}</span></span>${f && !can(f) ? `<span class="badge b-${FEATURES[f]}">${PLANS[FEATURES[f]].name}</span>` : ''}${ic('chevR', 'chev')}</a></li>`).join('')}</ul>`).join('')}
    <ul class="menu card rise"><li><button class="row" data-act="install"><span class="menu-ic">${ic('install')}</span><span class="row-b"><b>Installer l'application</b><span>Sur l'écran d'accueil</span></span>${ic('chevR', 'chev')}</button></li></ul>`;
  return { title: 'Plus', tab: 'plus', html };
}

// ---------- Feuilles ----------
function codeSheet(mode) {
  sheet(`${sheetHead(mode === 'off' ? 'Désactiver le code' : mode === 'change' ? 'Changer le code' : 'Activer un code', 'Quatre chiffres')}
    <form class="sheet-body form" data-form="lock" data-mode="${mode}" data-validate novalidate>
      ${mode !== 'set' ? field('Code actuel', '<input class="inp code-inp" name="old" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required autocomplete="off" autofocus>') : ''}
      ${mode !== 'off' ? `${field('Nouveau code', `<input class="inp code-inp" name="code" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required autocomplete="off" ${mode === 'set' ? 'autofocus' : ''}>`)}${field('Confirmer le code', '<input class="inp code-inp" name="code2" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required autocomplete="off">')}` : ''}
      ${mode === 'set' ? '<p class="field-h">Si vous oubliez ce code, il faudra effacer les données de cet appareil. Téléchargez une sauvegarde avant.</p>' : ''}
      <button class="btn btn-primary btn-block" type="submit">${mode === 'off' ? 'Désactiver' : 'Enregistrer'}</button>
    </form>`, { cls: 'sheet-sm' });
}

function wipeSheet() {
  sheet(`${sheetHead('Supprimer toutes vos données ?')}
    <form class="sheet-body form" data-form="wipe" data-validate novalidate>
      <p class="sheet-p">Fiches, historique, tâches, scripts personnels, personnalisation du CRM et réglages seront <b>définitivement effacés de cet appareil</b>. Rien n'est conservé ailleurs.</p>
      <button type="button" class="btn btn-ghost btn-block" data-act="backup">${ic('download')}<span>Télécharger une sauvegarde d'abord</span></button>
      ${field('Tapez SUPPRIMER pour confirmer', '<input class="inp" name="confirm" autocomplete="off" autocapitalize="characters" required data-act-input="wipe-check">')}
      <button class="btn btn-danger btn-block" type="submit" disabled>Supprimer définitivement</button>
    </form>`, { cls: 'sheet-sm' });
}

function sectorsSheet(refresh = false) {
  const mine = S().profile.secteurs || [];
  const body = `<div class="pick-grid">${allSectors().filter((x) => x.id !== 'toute').map((x) => { const on = mine.includes(x.id); return `<button class="pk ${on ? 'is-on' : ''}" data-act="sector-toggle" data-id="${x.id}" aria-pressed="${on}"><span class="pk-ic">${ic(x.icon)}</span><span class="pk-n">${esc(x.name)}</span><span class="pk-ck">${on ? ic('check') : ''}</span></button>`; }).join('')}</div>`;
  const open = document.querySelector('dialog.sheet[open] .sheet-secs');
  if (refresh && open) { open.innerHTML = body; return; }
  sheet(`${sheetHead('Vos secteurs', 'Ils apparaissent en premier dans les scripts')}<div class="sheet-body sheet-secs">${body}</div>`, { cls: 'sheet-tall' });
}
export { sectorsSheet };

const rr = () => window.dispatchEvent(new Event('ms:rerender'));
const readJSON = async (file) => { const t = await file.text(); try { return JSON.parse(t); } catch (e) { throw new Error('json'); } };
register({
  subscribe: (b) => subscribeSheet(b.dataset.plan),
  'guide-read': (b) => {
    const id = b.dataset.id;
    update((s) => { if (s.academy.read[id]) delete s.academy.read[id]; else s.academy.read[id] = Date.now(); });
    toast(isRead(id) ? 'Guide marqué comme lu' : 'Guide marqué comme non lu', { ms: 1400 });
  },
  'pref-switch': (el) => { update((s) => { s.prefs[el.dataset.k] = el.checked; }, { silent: true }); toast(el.checked ? 'Activé' : 'Désactivé', { ms: 1200 }); },
  'replay-intro': () => { startOnboarding(true); location.hash = '#/bienvenue'; },
  'sectors-edit': () => sectorsSheet(),
  'sector-toggle': (b) => {
    update((s) => { const l = s.profile.secteurs || []; s.profile.secteurs = l.includes(b.dataset.id) ? l.filter((x) => x !== b.dataset.id) : [...l, b.dataset.id]; });
    sectorsSheet(true);
  },
  'notif-ask': async () => { const r = await askNotifications(); toast(r === 'granted' ? 'Une notification arrivera avant chaque rappel.' : r === 'unsupported' ? notifSupport().hint : 'Autorisation refusée : modifiable dans les réglages du navigateur.', { title: 'Notifications' }); rr(); },
  'notif-test': () => testNotification(),
  pref: (b) => { update((s) => { s.prefs[b.dataset.k] = b.dataset.v; }); },
  'demo-mode': (el) => { update((s) => { s.sub.demo = el.value || null; }); toast(el.value ? `Affichage ${PLANS[el.value].name} activé pour la présentation` : 'Mode démonstration désactivé'); },
  'cat-add': () => update((s) => { s.catalogue.push({ id: uid(), label: 'Nouvelle prestation', price: 0 }); }),
  'cat-del': (b) => {
    const c = S().catalogue.find((x) => x.id === b.dataset.id);
    const i = S().catalogue.indexOf(c);
    update((s) => { s.catalogue = s.catalogue.filter((x) => x.id !== c.id); });
    toast(`${esc(c.label)} retiré du catalogue`, { action: 'Annuler', onAction: () => update((s) => { s.catalogue.splice(i, 0, c); }) });
  },
  'cat-edit': (el) => update((s) => {
    const c = s.catalogue.find((x) => x.id === el.dataset.id); if (!c) return;
    const k = el.dataset.k; c[k] = k === 'price' ? Number(el.value) || 0 : k === 'monthly' ? el.checked : el.value;
  }, { silent: true }),
  backup: () => { download(`msdeveloper-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ ...S(), lock: null }, null, 1)); toast('Le fichier est dans vos téléchargements.', { title: 'Sauvegarde téléchargée' }); },
  'import-merge': async (el) => {
    const f = el.files?.[0]; if (!f) return;
    const btn = el.closest('.btn');
    await busy(btn, 'Import en cours…', async () => {
      try {
        const data = await readJSON(f);
        await pause(250);
        const r = mergeImport(data);
        toast(`${r.added} fiche${r.added > 1 ? 's' : ''} ajoutée${r.added > 1 ? 's' : ''}${r.skipped ? `, ${r.skipped} déjà présente${r.skipped > 1 ? 's' : ''} (ignorée${r.skipped > 1 ? 's' : ''})` : ''}. ${r.activities} échange${r.activities > 1 ? 's' : ''} et ${r.tasks} tâche${r.tasks > 1 ? 's' : ''}.`, { title: 'Import terminé', action: 'Voir', onAction: () => { location.hash = '#/crm'; }, ms: 5000 });
      } catch (e) {
        toast(e.message === 'json' ? 'Ce fichier n\'est pas lisible : il doit s\'agir d\'un fichier .json exporté par M&S Developer.' : 'Ce fichier ne contient pas de fiches au bon format.', { title: 'Import impossible', ms: 5000 });
      }
    });
    el.value = '';
  },
  restore: async (el) => {
    const f = el.files?.[0]; if (!f) return;
    try {
      const data = await readJSON(f);
      if (!data || !Array.isArray(data.prospects) || !data.profile) throw new Error('format');
      if (!await confirmSheet({ title: 'Restaurer cette sauvegarde ?', text: `Les données actuelles de cet appareil seront remplacées par celles du fichier (${data.prospects.length} fiches).`, ok: 'Restaurer', danger: true })) { el.value = ''; return; }
      replaceState({ ...data, onboarded: true, lock: S().lock }); toast('Vos données ont été remplacées par la sauvegarde.', { title: 'Sauvegarde restaurée' });
    } catch (e) { toast('Ce fichier n\'est pas une sauvegarde complète de M&S Developer. Pour ajouter des fiches, utilisez « Importer un fichier ».', { title: 'Restauration impossible', ms: 5000 }); }
    el.value = '';
  },
  'export-csv': () => {
    if (!can('export')) { location.hash = '#/abonnement'; return; }
    const s = S();
    const cols = ['entreprise', 'contact', 'tel', 'email', 'ville', 'adresse', 'site', 'instagram', 'secteur', 'service', 'stage', 'valeur', 'source', 'notes'];
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = [...cols, 'etiquettes', 'responsable', ...s.crm.fields.map((f) => f.label)];
    const rows = [head.map(q).join(';'), ...s.prospects.map((p) => [...cols.map((c) => q(p[c])), q((p.tags || []).join(', ')), q(s.crm.team.find((m) => m.id === p.owner)?.name || ''), ...s.crm.fields.map((f) => q(p.cf?.[f.id]))].join(';'))];
    download(`msdeveloper-fiches-${new Date().toISOString().slice(0, 10)}.csv`, '﻿' + rows.join('\r\n'), 'text/csv;charset=utf-8');
    toast(`${s.prospects.length} fiches exportées`, { title: 'Export CSV' });
  },
  'load-demo': async () => {
    if (!await confirmSheet({ title: 'Charger des données de démonstration ?', text: 'Seize entreprises fictives, avec appels et tâches, pour présenter l\'application. Elles sont marquées « démonstration » et s\'effacent en un geste.', ok: 'Charger' })) return;
    update((s) => { const d = demoData(); s.prospects.push(...d.prospects); s.activities.push(...d.activities); s.tasks.push(...d.tasks); s.projects.push(...d.projects); });
    toast('Données de démonstration chargées');
  },
  wipe: () => wipeSheet(),
  'wipe-check': (el) => { el.closest('form').querySelector('[type=submit]').disabled = el.value.trim().toUpperCase() !== 'SUPPRIMER'; },
  'lock-set': () => codeSheet('set'),
  'lock-change': () => codeSheet('change'),
  'lock-off': () => codeSheet('off'),
  'lock-now': () => lockNow(),
  'lock-auto': (el) => { update((s) => { if (s.lock) s.lock.auto = el.checked; }, { silent: true }); },
  install: () => installFlow(),
}, {
  profile: (d) => { if (!(d.prenom || '').trim()) return; update((s) => { Object.assign(s.profile, d); }, { silent: true }); toast('Profil enregistré', { ms: 1200 }); },
  offer: (d) => {
    update((s) => { s.profile.service = d.service; s.profile.promesse = d.promesse; s.profile.niveau = d.niveau || s.profile.niveau; SERVICE_IDS.forEach((x) => { s.profile.prix[x] = d[`prix_${x}`]; }); }, { silent: true });
    toast('Offre enregistrée', { ms: 1200 });
  },
  goals: (d) => {
    const n = (v, min) => Math.max(min, Math.round(Number(v) || 0));
    update((s) => { s.goals = { appelsJour: n(d.appelsJour, 1), rdvSemaine: n(d.rdvSemaine, 0), caMois: n(d.caMois, 0) }; }, { silent: true });
    toast('Objectifs enregistrés', { ms: 1200 });
  },
  lock: async (d, f) => {
    const mode = f.dataset.mode;
    const four = (v) => /^\d{4}$/.test(v || '');
    if (mode !== 'set' && !(await checkCode(d.old))) { toast('Le code actuel est incorrect.', { title: 'Code incorrect' }); return; }
    if (mode === 'off') { clearLock(); closeSheet(); toast('Code de verrouillage désactivé'); rr(); return; }
    if (!four(d.code)) { toast('Le code doit contenir exactement 4 chiffres.', { title: 'Code invalide' }); return; }
    if (d.code !== d.code2) { toast('Les deux codes ne sont pas identiques.', { title: 'Confirmation différente' }); return; }
    await setLock(d.code); closeSheet(); toast('L\'application vous demandera ce code à l\'ouverture.', { title: 'Code activé' }); rr();
  },
  wipe: (d) => {
    if ((d.confirm || '').trim().toUpperCase() !== 'SUPPRIMER') return;
    closeSheet();
    resetState(); try { sessionStorage.clear(); } catch (e) { /* rien */ }
    startOnboarding(); location.hash = '#/bienvenue';
    toast('Toutes les données de cet appareil ont été supprimées.', { title: 'Données supprimées' });
  },
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
export { CHANNELS, eur, AUDIENCE, BENEFITS, notifSheet };
