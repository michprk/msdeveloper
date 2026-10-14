// Bibliothèque de scripts : secteurs → formats → lecteur (script, préparation, fiche secteur, objections).
import { S, can, toggleFav, pushRecent, getProspect, update } from '../store.js';
import { ic, esc, register, copyText, shareText, toast } from '../ui.js';
import { GROUPS } from '../data/sectors.js';
import { PLUS, MONTHS, MONTHS_FULL, bestMonths } from '../data/sector-plus.js';
import { DISCOVERY, SPIN_HELP, QUALIF } from '../data/script-plus.js';
import { SITUATIONS, FREE_SITUATIONS } from '../data/situations.js';
import { SERVICES, SERVICE_IDS, CHANNELS, FREE_CHANNELS, allSectors, getSector, buildScript, fill, scriptToText, scriptCount, typo } from '../data/scripts.js';
import { pageHead, paywall, sectorTile } from './common.js';
import { flower } from './flowers.js';

const svcSeg = (cur, base) => `<nav class="seg" aria-label="Service vendu">${SERVICE_IDS.map((id) => `<a class="seg-i ${id === cur ? 'is-on' : ''}" href="${base}${base.includes('?') ? '&' : '?'}s=${id}" ${id === cur ? 'aria-current="true"' : ''}>${ic(SERVICES[id].icon)}<span>${SERVICES[id].short}</span></a>`).join('')}</nav>`;
const isFree = (chId) => FREE_CHANNELS.includes(chId);
const T = (s) => esc(typo(s));

export function ctxFor(svcId, prospect) {
  const p = S().profile;
  return {
    prenom: p.prenom, societe: p.societe, tel: p.tel, promesse: p.promesse,
    prix: p.prix?.[svcId] || '', ville: prospect?.ville || p.ville,
    entreprise: prospect?.entreprise || '', contact: prospect?.contact || '',
  };
}

const tileFor = (sec, svc) => sectorTile(sec, `#/scripts/${sec.id}?s=${svc}`, sec.custom ? '<span class="tag">Perso</span>' : '')
  .replace('class="sec-tile"', `class="sec-tile g-${sec.group}" data-group="${sec.group}" data-name="${esc((sec.name + ' ' + sec.plural + ' ' + sec.search).toLowerCase())}"`);

// ---------- Bibliothèque ----------
export function library(params, q) {
  const s = S();
  const svc = SERVICES[q.s] ? q.s : s.profile.service || 'site';
  const sectors = allSectors();
  const toute = getSector('toute');
  const mine = (s.profile.secteurs || []).map(getSector).filter((x) => x && x.id !== 'toute');
  const favs = s.favorites.map((id) => (id.startsWith('my-') ? null : scriptFromId(id))).filter(Boolean);
  const html = `
    <div class="ph-flower" aria-hidden="true">${flower(2, 'xs drift')}</div>
    ${pageHead('Scripts', { kicker: `${scriptCount()} scripts prêts à l'emploi` })}
    ${svcSeg(svc, '#/scripts')}
    ${!mine.length ? `<section class="card notif-cta rise"><span class="feat-ic f-olive">${ic('target')}</span><div><b>Quels métiers prospectez-vous ?</b><p>Choisissez vos secteurs : leurs scripts s'afficheront en premier.</p></div><button class="btn btn-primary btn-sm" data-act="sectors-edit">Choisir</button></section>` : ''}
    <div class="search rise"><span class="search-ic">${ic('search')}</span><input class="inp" type="search" placeholder="Fleuriste, garage, avocat…" data-filter=".sec-grid-all .sec-tile" aria-label="Chercher un secteur"></div>
    ${mine.length ? `<h2 class="sec-title">Vos secteurs</h2><div class="sec-grid sec-grid-mine">${mine.map((sec) => tileFor(sec, svc)).join('')}</div>` : ''}
    <a class="card wide-tile rise" href="#/scripts/toute?s=${svc}">
      <span class="sec-ic lg">${ic(toute.icon)}</span>
      <span class="wide-b"><b>Pour toute entreprise</b><span>Des scripts universels, quand le secteur n'est pas dans la liste.</span></span>${ic('chevR', 'chev')}
    </a>
    ${favs.length ? `<h2 class="sec-title">Favoris</h2><div class="hscroll">${favs.map((sc) => `<a class="mini-card" href="#/script/${sc.id}">${ic(sc.icon)}<b>${esc(sc.title)}</b><span>${esc(sc.sub)}</span></a>`).join('')}</div>` : ''}
    <h2 class="sec-title">Situations délicates</h2>
    <div class="hscroll sit-row">${SITUATIONS.map((x) => `<a class="mini-card sit-card" href="#/script/sit.${x.id}"><span class="sit-ic">${ic(x.icon)}</span><b>${esc(x.title)}</b><span>${T(x.when)}</span>${!FREE_SITUATIONS.includes(x.id) && !can('scriptsAll') ? ic('lock', 'ic-lock sit-lock') : ''}</a>`).join('')}</div>
    <h2 class="sec-title">Tous les secteurs</h2>
    <nav class="chips-row" aria-label="Familles de secteurs">
      <button class="chip-btn is-on" data-act="group" data-g="">Tous</button>
      ${GROUPS.map((g) => `<button class="chip-btn" data-act="group" data-g="${g.id}">${g.label}</button>`).join('')}
    </nav>
    <div class="sec-grid sec-grid-all">${sectors.filter((x) => x.id !== 'toute').map((sec) => tileFor(sec, svc)).join('')}</div>
    <p class="muted center filter-empty" hidden>Aucun secteur ne correspond. Utilisez « Pour toute entreprise », ou créez votre secteur dans Mes scripts.</p>
    <a class="card wide-tile rise" href="#/outils/mes-scripts">
      <span class="sec-ic lg t-olive">${ic('edit')}</span>
      <span class="wide-b"><b>Mes scripts</b><span>Écrivez vos scripts et créez vos propres secteurs.</span></span>${can('myScripts') ? '' : '<span class="badge b-premium">Premium</span>'}${ic('chevR', 'chev')}
    </a>`;
  return { title: 'Scripts', tab: 'scripts', html };
}

// ---------- Fiche secteur (réutilisée dans le lecteur) ----------
function seasonBlock(saison) {
  if (!saison) return '';
  const best = bestMonths(saison);
  const lv = ['Calme', 'Normale', 'Pic'];
  const months = best.map((b, m) => (b ? MONTHS_FULL[m] : null)).filter(Boolean);
  return `<div class="season" role="img" aria-label="Activité du métier mois par mois">
      ${saison.map((v, m) => `<div class="season-m" title="${MONTHS_FULL[m]} : activité ${lv[v].toLowerCase()}${best[m] ? ', bon mois pour prospecter' : ''}"><span class="season-c l${v}"></span><span class="season-l">${MONTHS[m]}</span><i class="${best[m] ? 'on' : ''}"></i></div>`).join('')}
    </div>
    <ul class="legend season-leg"><li><i class="sw l0"></i>Calme</li><li><i class="sw l1"></i>Normale</li><li><i class="sw l2"></i>Pic d'activité</li><li><i class="sw-dot"></i>Bon mois pour prospecter</li></ul>
    <p class="season-p">Meilleurs mois pour les contacter : <b>${months.join(', ') || 'toute l\'année'}</b>.</p>
    <table class="sr-only"><caption>Activité par mois</caption><tbody>${saison.map((v, m) => `<tr><th>${MONTHS_FULL[m]}</th><td>${lv[v]}</td><td>${best[m] ? 'Bon mois pour prospecter' : ''}</td></tr>`).join('')}</tbody></table>`;
}

export function sectorSheet(sec, svcId) {
  const P = PLUS[sec.id];
  const svcBlock = (k) => `<div class="arg ${k === svcId ? 'is-on' : ''}"><p class="arg-k">${ic(SERVICES[k].icon)}${SERVICES[k].label}</p><p>${T(sec[k].value.charAt(0).toUpperCase() + sec[k].value.slice(1))}.</p><p class="arg-ex">Exemple : ${T(sec[k].ex)}.</p></div>`;
  return `
    ${P ? `<section class="card rise"><header class="card-h"><div><h2>Qui décide</h2></div><span class="sec-ic">${ic(sec.icon)}</span></header><p class="body">${T(P.decideur)}</p></section>
    <div class="two">
      <section class="card rise"><header class="card-h"><div><h2>Ce qui compte pour eux</h2></div></header><ul class="bul bul-olive">${P.priorites.map((x) => `<li>${T(x)}</li>`).join('')}</ul></section>
      <section class="card rise"><header class="card-h"><div><h2>Ce qui les agace</h2></div></header><ul class="bul bul-rose">${P.irritants.map((x) => `<li>${T(x)}</li>`).join('')}</ul></section>
    </div>
    <section class="card rise"><header class="card-h"><div><h2>Les bons mots</h2><p>Parlez leur langue</p></div></header>
      <div class="words">${P.mots.map((x) => `<span class="word ok">${T(x)}</span>`).join('')}</div>
      <p class="field-l words-k">À bannir</p><div class="words">${P.bannir.map((x) => `<span class="word ko">${T(x)}</span>`).join('')}</div></section>
    <section class="card rise"><header class="card-h"><div><h2>Saisonnalité</h2><p>Activité du métier, mois par mois</p></div></header>${seasonBlock(P.saison)}</section>` : ''}
    <section class="card rise"><header class="card-h"><div><h2>Quand les joindre</h2></div></header>
      <div class="info">
        <div class="info-r"><span class="info-ic">${ic('clock')}</span><p><b>Le bon moment</b>${T(sec.horaire)}</p></div>
        <div class="info-r"><span class="info-ic">${ic('x')}</span><p><b>À éviter</b>${T(sec.eviter)}</p></div>
        <div class="info-r"><span class="info-ic">${ic('calendar')}</span><p><b>Créneaux de rendez-vous</b>${T(sec.creneau)}</p></div>
        <div class="info-r"><span class="info-ic">${ic('flag')}</span><p><b>Temps forts</b>${T(sec.temps)}</p></div>
      </div></section>
    <section class="card rise"><header class="card-h"><div><h2>Arguments par service</h2></div></header><div class="args">${SERVICE_IDS.map(svcBlock).join('')}</div>
      ${P ? `<div class="tip"><p class="tip-k">Offre à proposer</p><p>${T(P.offre)}</p></div>` : ''}</section>
    ${P ? `<section class="card rise"><header class="card-h"><div><h2>Erreurs à éviter</h2></div></header><ul class="bul bul-rose">${P.erreurs.map((x) => `<li>${T(x)}</li>`).join('')}</ul>
      <div class="tip"><p class="tip-k">Conseil</p><p>${T(sec.conseil)}</p></div></section>` : `<div class="tip"><p class="tip-k">Conseil</p><p>${T(sec.conseil)}</p></div>`}`;
}

// ---------- Secteur ----------
export function sectorPage([id], q) {
  const sec = getSector(id);
  if (!sec) return null;
  const svc = SERVICES[q.s] ? q.s : S().profile.service || 'site';
  const all = can('scriptsAll');
  const P = PLUS[sec.id];
  const view = q.v === 'fiche' ? 'fiche' : 'scripts';
  const html = `
    ${pageHead(esc(sec.name), { kicker: `${CHANNELS.length * SERVICE_IDS.length} scripts${GROUPS.find((g) => g.id === sec.group) ? ' · ' + GROUPS.find((g) => g.id === sec.group).label : ''}`, back: '#/scripts' })}
    ${svcSeg(svc, `#/scripts/${id}${view === 'fiche' ? '?v=fiche' : ''}`)}
    <nav class="tabs" aria-label="Sections"><a class="tab-i ${view === 'scripts' ? 'is-on' : ''}" href="#/scripts/${id}?s=${svc}">Les 10 scripts</a><a class="tab-i ${view === 'fiche' ? 'is-on' : ''}" href="#/scripts/${id}?s=${svc}&v=fiche">Fiche secteur</a></nav>
    ${view === 'fiche' ? sectorSheet(sec, svc) : `
    <section class="card info rise">
      <div class="info-r"><span class="info-ic">${ic('clock')}</span><p><b>Quand appeler</b>${T(sec.horaire)}</p></div>
      <div class="info-r"><span class="info-ic">${ic('x')}</span><p><b>À éviter</b>${T(sec.eviter)}</p></div>
      ${P ? `<div class="info-r"><span class="info-ic">${ic('target')}</span><p><b>Ce qui compte pour eux</b>${P.priorites.map(T).join(' · ')}</p></div>` : ''}
      <a class="link" href="#/scripts/${id}?s=${svc}&v=fiche">Toute la fiche secteur ${ic('chevR')}</a>
    </section>
    <h2 class="sec-title">${SERVICES[svc].label}</h2>
    <ul class="ch-list">${CHANNELS.map((c, i) => {
      const locked = !isFree(c.id) && !all;
      return `<li class="rise" style="--i:${i}"><a class="ch-row" href="#/script/${svc}.${c.id}.${sec.id}">
        <span class="ch-ic">${ic(c.icon)}</span>
        <span class="ch-b"><b>${c.label}</b><span>${c.goal}</span></span>
        <span class="ch-m">${locked ? ic('lock', 'ic-lock') : `<span class="muted-s">${c.dur}</span>`}</span>
      </a></li>`;
    }).join('')}</ul>`}`;
  return { title: sec.name, tab: 'scripts', html };
}

// ---------- Lecteur ----------
const WHO = { v: 'Vous', p: 'Prospect' };

export function renderLine([w, t], ctx) {
  const txt = fill(t, ctx).replace(/\n/g, '<br>');
  if (w === 'm') return `<div class="ln ln-m"><p>${txt}</p><button class="icon-btn sm" data-act="copy-line" aria-label="Copier le message">${ic('copy')}</button></div>`;
  if (w === 'o') return `<div class="ln ln-o"><span class="ln-w">Objet</span><p>${txt}</p><button class="icon-btn sm" data-act="copy-line" aria-label="Copier l'objet">${ic('copy')}</button></div>`;
  if (w === 'n') return `<div class="ln ln-n">${ic('arrowR')}<p>${txt}</p></div>`;
  return `<div class="ln ln-${w}"><span class="ln-w">${WHO[w]}</span><p>${txt}</p></div>`;
}

export function scriptFromId(id) {
  if (id.startsWith('my-')) {
    const m = S().myScripts.find((x) => x.id === id);
    if (!m) return null;
    const sec = getSector(m.sector) || getSector('toute');
    return {
      id: m.id, custom: true, service: m.service, channel: 'perso', sector: sec.id, title: m.title || 'Script sans titre',
      sub: `${sec.name} · ${SERVICES[m.service]?.short || ''} · Mon script`, icon: 'edit', dur: '', goal: m.goal || '',
      steps: m.steps.map((st) => ({ t: st.t, l: st.text.split(/\n+/).filter(Boolean).map((line) => (line.startsWith('>') ? ['p', line.slice(1).trim()] : line.startsWith('!') ? ['n', line.slice(1).trim()] : ['v', line])) })),
      objections: [],
    };
  }
  const [svc, ch, sec] = id.split('.');
  return buildScript(svc, ch, sec);
}

const checks = {}; // cases cochées de la préparation (le temps de la session)

function stepHtml(st, i, ctx) {
  const more = (st.alt?.length || st.avoid);
  return `<li class="step rise ${st.opt ? 'is-opt' : ''}" style="--i:${i}">
    <h2 class="step-t"><span class="step-dot"></span>${T(st.t)}${st.opt ? '<span class="tag">si besoin</span>' : ''}</h2>
    <div class="step-b">${st.l.map((l) => renderLine(l, ctx)).join('')}
      ${st.tip ? `<p class="step-tip">${ic('target')}<span>${T(st.tip)}</span></p>` : ''}
      ${st.why ? `<p class="step-why"><b>Pourquoi ça marche</b>${T(st.why)}</p>` : ''}
      ${more ? `<details class="step-more"><summary>${st.alt?.length ? `${st.alt.length} variante${st.alt.length > 1 ? 's' : ''}` : ''}${st.alt?.length && st.avoid ? ' · ' : ''}${st.avoid ? 'erreur à éviter' : ''}${ic('chevD', 'chev')}</summary>
        ${(st.alt || []).map(([label, text]) => `<div class="alt"><p class="alt-k">${T(label)}</p>${renderLine(['v', text], ctx)}</div>`).join('')}
        ${st.avoid ? `<p class="step-avoid"><b>À éviter</b>${T(st.avoid)}</p>` : ''}
      </details>` : ''}
    </div>
  </li>`;
}

function prepTab(sc, sec, pr) {
  const m = sc.meta || {};
  const key = sc.id;
  checks[key] = checks[key] || {};
  const list = (items, kind) => `<ul class="checklist">${items.map((x, i) => {
    const on = checks[key][kind + i];
    return `<li><button class="ck ${on ? 'is-on' : ''}" data-act="ck" data-k="${key}" data-i="${kind + i}" aria-pressed="${!!on}"><span class="tick ${on ? 'is-done' : ''}"></span><span>${T(x)}</span></button></li>`;
  }).join('')}</ul>`;
  const disco = DISCOVERY[sc.service];
  const q = pr?.qualif || {};
  return `
    ${m.prep?.length ? `<section class="card rise"><header class="card-h"><div><h2>Avant</h2><p>${m.prep.length} points à vérifier</p></div><span class="badge b-premium">${m.niveau}</span></header>${list(m.prep, 'p')}</section>` : ''}
    ${m.minutage?.length ? `<section class="card rise"><header class="card-h"><div><h2>Déroulé</h2><p>Le temps à consacrer à chaque étape</p></div></header>
      <ol class="timeline">${m.minutage.map(([l, t]) => `<li><span class="tl-time">${t}</span><span class="tl-dot"></span><span>${T(l)}</span></li>`).join('')}</ol></section>` : ''}
    <section class="card rise"><header class="card-h"><div><h2>Questions de découverte</h2><p>${SERVICES[sc.service].label} · méthode SPIN</p></div></header>
      ${Object.entries(disco).map(([k, qs]) => `<details class="obj spin" ${k === 'Situation' ? 'open' : ''}><summary><span><b>${k}</b><em>${SPIN_HELP[k]}</em></span>${ic('chevD', 'chev')}</summary><ul class="bul">${qs.map((x) => `<li>${T(x)}</li>`).join('')}</ul></details>`).join('')}
    </section>
    <section class="card rise"><header class="card-h"><div><h2>Qualifier le prospect</h2><p>${pr ? `Pour ${esc(pr.entreprise)} · ${QUALIF.filter((x) => q[x.k]).length} / 4` : 'Les quatre informations à obtenir avant un devis'}</p></div></header>
      <ul class="checklist">${QUALIF.map((x) => `<li><button class="ck ${q[x.k] ? 'is-on' : ''}" ${pr ? `data-act="qualif" data-id="${pr.id}" data-k="${x.k}"` : 'disabled'} aria-pressed="${!!q[x.k]}"><span class="tick ${q[x.k] ? 'is-done' : ''}"></span><span><b>${x.label}</b><em>« ${T(x.q)} »</em></span></button></li>`).join('')}</ul>
      ${pr ? '' : '<p class="field-h">Choisissez un prospect dans « Remplir pour » pour enregistrer la qualification dans sa fiche.</p>'}
    </section>
    ${m.apres?.length ? `<section class="card rise"><header class="card-h"><div><h2>Après</h2></div></header>${list(m.apres, 'a')}</section>` : ''}`;
}

export function reader([id], q) {
  const sc = scriptFromId(id);
  if (!sc) return null;
  const s = S();
  if (sc.custom && !can('myScripts')) return { title: 'Mon script', tab: 'scripts', html: `${pageHead('Mon script', { back: '#/outils/mes-scripts' })}${paywall('myScripts')}` };
  const sec = getSector(sc.sector), svc = SERVICES[sc.service];
  const crm = can('crm');
  const pr = q.p && crm ? getProspect(q.p) : null;
  const ctx = ctxFor(sc.service, pr);
  const locked = sc.situation ? !FREE_SITUATIONS.includes(id.slice(4)) && !can('scriptsAll') : !sc.custom && !isFree(sc.channel) && !can('scriptsAll');
  const fav = s.favorites.includes(sc.id);
  pushRecent(sc.id);
  const missing = !s.profile.prenom || !s.profile.societe;
  const steps = locked ? sc.steps.slice(0, 1) : sc.steps;
  const backHref = sc.custom ? '#/outils/mes-scripts' : sc.situation ? '#/scripts' : `#/scripts/${sec.id}?s=${sc.service}`;
  const prospects = crm ? s.prospects.filter((x) => x.stage !== 'perdu').slice(0, 200) : [];
  const full = !sc.custom && !sc.situation;
  const tab = full && ['preparer', 'secteur', 'objections'].includes(q.tab) ? q.tab : 'script';
  const base = `#/script/${sc.id}?${pr ? `p=${pr.id}&` : ''}`;
  const nObj = sc.objections.length;

  let body = '';
  if (locked) body = `<ol class="steps">${steps.map((st, i) => stepHtml(st, i, ctx)).join('')}</ol>${paywall('scriptsAll', { compact: true })}`;
  else if (tab === 'preparer') body = prepTab(sc, sec, pr);
  else if (tab === 'secteur') body = sectorSheet(sec, sc.service);
  else if (tab === 'objections') body = `<div class="objs">${(sc.channel === 'objections' ? sc.steps.map((st) => ({ q: st.t, a: st.l[0][1] })) : sc.objections).map((o) => `<details class="obj"><summary><span>« ${T(o.q)} »</span>${ic('chevD', 'chev')}</summary><p>${fill(o.a, ctx)}</p></details>`).join('')}</div>
      <div class="tip"><p class="tip-k">La méthode</p><p>Accueillir (« je comprends »), questionner (« c'est-à-dire ? »), répondre en une phrase, puis revenir au rendez-vous.</p></div>`;
  else {
    body = `
      ${sc.when ? `<section class="card info rise"><div class="info-r"><span class="info-ic">${ic('flag')}</span><p><b>Quand l'utiliser</b>${T(sc.when)}</p></div></section>` : ''}
      ${sc.meta?.minutage?.length ? `<div class="mini-time rise" aria-label="Déroulé">${sc.meta.minutage.map(([l, t]) => `<span><b>${t}</b>${T(l)}</span>`).join('')}</div>` : ''}
      ${sc.timing && sec ? `<details class="card timing rise"><summary>${ic('clock')}<span><b>Quand ${sc.channel === 'visite' ? 'passer' : 'appeler'}</b> ${T(sec.horaire)}</span>${ic('chevD', 'chev')}</summary><p><b>À éviter :</b> ${T(sec.eviter)}.</p><p><b>Créneaux à proposer :</b> ${T(sec.creneau)}.</p></details>` : ''}
      <ol class="steps">${steps.map((st, i) => stepHtml(st, i, ctx)).join('')}</ol>
      ${nObj && sc.channel !== 'objections' ? `<a class="card wide-tile" href="${base}tab=objections"><span class="sec-ic lg">${ic('shield')}</span><span class="wide-b"><b>${nObj} objections prêtes</b><span>Les réponses adaptées à ce secteur et à ce service.</span></span>${ic('chevR', 'chev')}</a>` : ''}
      ${full ? `<h2 class="sec-title">Autres formats — ${esc(sec.name)}</h2>
        <div class="chips-wrap">${CHANNELS.filter((c) => c.id !== sc.channel).map((c) => `<a class="chip-btn" href="#/script/${sc.service}.${c.id}.${sec.id}${pr ? `?p=${pr.id}` : ''}">${ic(c.icon)}${c.short}${!isFree(c.id) && !can('scriptsAll') ? ic('lock', 'ic-lock') : ''}</a>`).join('')}</div>
        <div class="chips-wrap">${SERVICE_IDS.filter((x) => x !== sc.service).map((x) => `<a class="chip-btn" href="#/script/${x}.${sc.channel}.${sec.id}${pr ? `?p=${pr.id}` : ''}">${ic(SERVICES[x].icon)}${SERVICES[x].short}</a>`).join('')}</div>`
        : sc.custom ? `<a class="btn btn-ghost" href="#/outils/mes-scripts/${sc.id}">${ic('edit')}<span>Modifier ce script</span></a>` : ''}`;
  }

  const html = `
    ${pageHead(esc(sc.title), { kicker: esc(sc.sub), back: backHref })}
    <div class="meta-row rise">${sc.meta?.niveau ? `<span class="chip t-olive">${ic('diamond')}${sc.meta.niveau}</span>` : ''}${sc.dur ? `<span class="chip">${ic('clock')}${sc.dur}</span>` : ''}${sc.goal ? `<span class="chip t-sky">${ic('target')}${esc(sc.goal)}</span>` : ''}</div>
    <div class="act-row rise">
      ${['appel', 'visite', 'rdv', 'closing', 'perso', 'repondeur', 'situation'].includes(sc.channel) ? `<a class="btn btn-primary" href="#/appel?s=${sc.id}${pr ? `&p=${pr.id}` : ''}">${ic('play')}<span>Mode appel</span></a>` : ''}
      <button class="icon-btn" data-act="copy-script" data-id="${sc.id}" aria-label="Copier le script" title="Copier" ${locked ? 'disabled' : ''}>${ic('copy')}</button>
      <button class="icon-btn ${fav ? 'is-on' : ''}" data-act="fav" data-id="${sc.id}" aria-pressed="${fav}" aria-label="${fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${ic('star')}</button>
      <button class="icon-btn" data-act="share-script" data-id="${sc.id}" aria-label="Partager" ${locked ? 'disabled' : ''}>${ic('share')}</button>
      ${full && !locked ? `<button class="icon-btn" data-act="dup-script" data-id="${sc.id}" aria-label="Personnaliser ce script" title="Personnaliser">${ic('edit')}</button>` : ''}
    </div>
    ${crm ? `<label class="fill-for rise">${ic('user')}<span>Remplir pour</span>
      <select class="inp" data-act-change="fill-for" data-id="${sc.id}" data-tab="${tab}">
        <option value="">Aucun prospect (variables visibles)</option>
        ${prospects.map((x) => `<option value="${x.id}" ${pr?.id === x.id ? 'selected' : ''}>${esc(x.entreprise)}${x.ville ? ' — ' + esc(x.ville) : ''}</option>`).join('')}
      </select></label>` : ''}
    ${missing ? `<a class="strip is-soft" href="#/reglages">${ic('user')}<span>Ajoutez votre prénom et votre société pour remplir les scripts automatiquement.</span><span class="strip-a">${ic('chevR')}</span></a>` : ''}
    ${full && !locked ? `<nav class="tabs" aria-label="Sections du script">
      ${[['script', 'Script'], ['preparer', 'Préparer'], ['secteur', 'Secteur'], ['objections', `Objections${nObj || sc.channel === 'objections' ? ` <b>${nObj || sc.steps.length}</b>` : ''}`]].map(([k, l]) => `<a class="tab-i ${tab === k ? 'is-on' : ''}" href="${base}tab=${k}" ${tab === k ? 'aria-current="page"' : ''}>${l}</a>`).join('')}
    </nav>` : ''}
    ${body}`;
  return { title: sc.title, tab: 'scripts', html };
}

register({
  group: (b) => {
    b.parentElement.querySelectorAll('.chip-btn').forEach((x) => x.classList.toggle('is-on', x === b));
    const g = b.dataset.g;
    document.querySelectorAll('.sec-grid-all .sec-tile').forEach((t) => { t.dataset.hideG = g && t.dataset.group !== g ? '1' : ''; t.hidden = !!(t.dataset.hideG || t.dataset.hideQ); });
    const any = [...document.querySelectorAll('.sec-grid-all .sec-tile')].some((t) => !t.hidden);
    document.querySelector('.filter-empty')?.toggleAttribute('hidden', any);
  },
  fav: (b) => { toggleFav(b.dataset.id); toast(S().favorites.includes(b.dataset.id) ? 'Ajouté aux favoris' : 'Retiré des favoris'); },
  'copy-line': (b) => copyText(b.parentElement.querySelector('p').innerText),
  'copy-script': (b) => {
    const sc = scriptFromId(b.dataset.id); const q = new URLSearchParams(location.hash.split('?')[1] || '');
    copyText(scriptToText(sc, ctxFor(sc.service, q.get('p') && getProspect(q.get('p')))), 'Script copié');
  },
  'share-script': (b) => {
    const sc = scriptFromId(b.dataset.id); const q = new URLSearchParams(location.hash.split('?')[1] || '');
    shareText(sc.title, scriptToText(sc, ctxFor(sc.service, q.get('p') && getProspect(q.get('p')))));
  },
  'fill-for': (el) => {
    const params = new URLSearchParams();
    if (el.value) params.set('p', el.value);
    if (el.dataset.tab && el.dataset.tab !== 'script') params.set('tab', el.dataset.tab);
    location.hash = `#/script/${el.dataset.id}${params.toString() ? `?${params}` : ''}`;
  },
  ck: (b) => { const c = checks[b.dataset.k] = checks[b.dataset.k] || {}; c[b.dataset.i] = !c[b.dataset.i]; window.dispatchEvent(new Event('ms:rerender')); },
  qualif: (b) => update((s) => { const p = s.prospects.find((x) => x.id === b.dataset.id); if (!p) return; p.qualif = { ...(p.qualif || {}), [b.dataset.k]: !p.qualif?.[b.dataset.k] }; }),
});
