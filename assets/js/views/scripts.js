// Bibliothèque de scripts : secteurs → formats → lecteur.
import { S, can, toggleFav, pushRecent, getProspect } from '../store.js';
import { ic, esc, register, copyText, shareText, toast } from '../ui.js';
import { GROUPS } from '../data/sectors.js';
import { SERVICES, SERVICE_IDS, CHANNELS, CH, FREE_CHANNELS, allSectors, getSector, buildScript, fill, scriptToText, scriptCount, typo } from '../data/scripts.js';
import { pageHead, paywall, sectorTile } from './common.js';

const svcSeg = (cur, base) => `<nav class="seg" aria-label="Service vendu">${SERVICE_IDS.map((id) => `<a class="seg-i ${id === cur ? 'is-on' : ''}" href="${base}${base.includes('?') ? '&' : '?'}s=${id}" ${id === cur ? 'aria-current="true"' : ''}>${ic(SERVICES[id].icon)}<span>${SERVICES[id].short}</span></a>`).join('')}</nav>`;
const isFree = (chId) => FREE_CHANNELS.includes(chId);

export function ctxFor(svcId, prospect) {
  const p = S().profile;
  return {
    prenom: p.prenom, societe: p.societe, tel: p.tel, promesse: p.promesse,
    prix: p.prix?.[svcId] || '', ville: prospect?.ville || p.ville,
    entreprise: prospect?.entreprise || '', contact: prospect?.contact || '',
  };
}

// ---------- Bibliothèque ----------
export function library(params, q) {
  const s = S();
  const svc = SERVICES[q.s] ? q.s : s.profile.service || 'site';
  const sectors = allSectors();
  const toute = getSector('toute');
  const favs = s.favorites.map((id) => (id.startsWith('my-') ? null : buildScript(...id.split('.')))).filter(Boolean);
  const html = `
    ${pageHead('Scripts', { kicker: `${scriptCount()} scripts prêts à l'emploi` })}
    ${svcSeg(svc, '#/scripts')}
    <div class="search rise"><span class="search-ic">${ic('search')}</span><input class="inp" type="search" placeholder="Fleuriste, garage, avocat…" data-filter=".sec-grid .sec-tile" aria-label="Chercher un secteur"></div>
    <nav class="chips-row rise" aria-label="Familles de secteurs">
      <button class="chip-btn is-on" data-act="group" data-g="">Tous</button>
      ${GROUPS.map((g) => `<button class="chip-btn" data-act="group" data-g="${g.id}">${g.label}</button>`).join('')}
    </nav>
    <a class="card wide-tile rise" href="#/scripts/toute?s=${svc}">
      <span class="sec-ic lg">${ic(toute.icon)}</span>
      <span class="wide-b"><b>Pour toute entreprise</b><span>Des scripts universels, quand le secteur n'est pas dans la liste.</span></span>${ic('chevR', 'chev')}
    </a>
    ${favs.length ? `<h2 class="sec-title">Favoris</h2><div class="hscroll">${favs.map((sc) => `<a class="mini-card" href="#/script/${sc.id}">${ic(sc.icon)}<b>${esc(sc.title)}</b><span>${esc(sc.sub)}</span></a>`).join('')}</div>` : ''}
    <h2 class="sec-title">Secteurs</h2>
    <div class="sec-grid">${sectors.filter((x) => x.id !== 'toute').map((sec) => sectorTile(sec, `#/scripts/${sec.id}?s=${svc}`, sec.custom ? '<span class="tag">Perso</span>' : '').replace('class="sec-tile"', `class="sec-tile" data-group="${sec.group}" data-name="${esc((sec.name + ' ' + sec.plural + ' ' + sec.search).toLowerCase())}"`)).join('')}</div>
    <p class="muted center filter-empty" hidden>Aucun secteur ne correspond. Utilisez « Pour toute entreprise », ou créez votre secteur dans Mes scripts.</p>
    <a class="card wide-tile rise" href="#/outils/mes-scripts">
      <span class="sec-ic lg t-olive">${ic('edit')}</span>
      <span class="wide-b"><b>Mes scripts</b><span>Écrivez vos scripts et créez vos propres secteurs.</span></span>${can('myScripts') ? '' : '<span class="badge b-premium">Premium</span>'}${ic('chevR', 'chev')}
    </a>`;
  return { title: 'Scripts', tab: 'scripts', html };
}

// ---------- Secteur ----------
export function sectorPage([id], q) {
  const sec = getSector(id);
  if (!sec) return null;
  const svc = SERVICES[q.s] ? q.s : S().profile.service || 'site';
  const all = can('scriptsAll');
  const html = `
    ${pageHead(esc(sec.name), { kicker: 'Scripts', back: '#/scripts' })}
    ${svcSeg(svc, `#/scripts/${id}`)}
    <section class="card info rise">
      <div class="info-r"><span class="info-ic">${ic('clock')}</span><p><b>Quand appeler</b>${esc(typo(sec.horaire))}</p></div>
      <div class="info-r"><span class="info-ic">${ic('x')}</span><p><b>À éviter</b>${esc(typo(sec.eviter))}</p></div>
      <div class="info-r"><span class="info-ic">${ic('flag')}</span><p><b>Temps forts</b>${esc(typo(sec.temps))}</p></div>
      <div class="tip"><p class="tip-k">Conseil</p><p>${esc(typo(sec.conseil))}</p></div>
    </section>
    <h2 class="sec-title">${SERVICES[svc].label}</h2>
    <ul class="ch-list">${CHANNELS.map((c, i) => {
      const locked = !isFree(c.id) && !all;
      return `<li class="rise" style="--i:${i}"><a class="ch-row" href="#/script/${svc}.${c.id}.${sec.id}">
        <span class="ch-ic">${ic(c.icon)}</span>
        <span class="ch-b"><b>${c.label}</b><span>${c.goal}</span></span>
        <span class="ch-m">${locked ? ic('lock', 'ic-lock') : `<span class="muted-s">${c.dur}</span>`}</span>
      </a></li>`;
    }).join('')}</ul>`;
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

export function reader([id], q) {
  const sc = scriptFromId(id);
  if (!sc) return null;
  const s = S();
  if (sc.custom && !can('myScripts')) return { title: 'Mon script', tab: 'scripts', html: `${pageHead('Mon script', { back: '#/outils/mes-scripts' })}${paywall('myScripts')}` };
  const sec = getSector(sc.sector), svc = SERVICES[sc.service];
  const crm = can('crm');
  const pr = q.p && crm ? getProspect(q.p) : null;
  const ctx = ctxFor(sc.service, pr);
  const locked = !sc.custom && !isFree(sc.channel) && !can('scriptsAll');
  const fav = s.favorites.includes(sc.id);
  pushRecent(sc.id);
  const missing = !s.profile.prenom || !s.profile.societe;
  const steps = locked ? sc.steps.slice(0, 1) : sc.steps;
  const backHref = sc.custom ? '#/outils/mes-scripts' : `#/scripts/${sec.id}?s=${sc.service}`;
  const prospects = crm ? s.prospects.filter((x) => x.stage !== 'perdu').slice(0, 200) : [];

  const html = `
    ${pageHead(esc(sc.title), { kicker: esc(sc.sub), back: backHref })}
    <div class="meta-row rise">${sc.dur ? `<span class="chip">${ic('clock')}${sc.dur}</span>` : ''}${sc.goal ? `<span class="chip t-sky">${ic('target')}${esc(sc.goal)}</span>` : ''}</div>
    <div class="act-row rise">
      ${['appel', 'visite', 'rdv', 'closing', 'perso', 'repondeur'].includes(sc.channel) ? `<a class="btn btn-primary" href="#/appel?s=${sc.id}${pr ? `&p=${pr.id}` : ''}">${ic('play')}<span>Mode appel</span></a>` : ''}
      <button class="icon-btn" data-act="copy-script" data-id="${sc.id}" aria-label="Copier le script" title="Copier" ${locked ? 'disabled' : ''}>${ic('copy')}</button>
      <button class="icon-btn ${fav ? 'is-on' : ''}" data-act="fav" data-id="${sc.id}" aria-pressed="${fav}" aria-label="${fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${ic('star')}</button>
      <button class="icon-btn" data-act="share-script" data-id="${sc.id}" aria-label="Partager" ${locked ? 'disabled' : ''}>${ic('share')}</button>
      ${!sc.custom && !locked ? `<button class="icon-btn" data-act="dup-script" data-id="${sc.id}" aria-label="Personnaliser ce script" title="Personnaliser">${ic('edit')}</button>` : ''}
    </div>
    ${crm ? `<label class="fill-for rise">${ic('user')}<span>Remplir pour</span>
      <select class="inp" data-act-change="fill-for" data-id="${sc.id}">
        <option value="">Aucun prospect (variables visibles)</option>
        ${prospects.map((x) => `<option value="${x.id}" ${pr?.id === x.id ? 'selected' : ''}>${esc(x.entreprise)}${x.ville ? ' — ' + esc(x.ville) : ''}</option>`).join('')}
      </select></label>` : ''}
    ${missing ? `<a class="strip is-soft" href="#/reglages">${ic('user')}<span>Ajoutez votre prénom et votre société pour remplir les scripts automatiquement.</span><span class="strip-a">${ic('chevR')}</span></a>` : ''}
    ${sc.timing && sec ? `<details class="card timing rise"><summary>${ic('clock')}<span><b>Quand ${sc.channel === 'visite' ? 'passer' : 'appeler'}</b> ${esc(typo(sec.horaire))}</span>${ic('chevD', 'chev')}</summary><p><b>À éviter :</b> ${esc(typo(sec.eviter))}.</p><p><b>Créneaux à proposer :</b> ${esc(typo(sec.creneau))}.</p></details>` : ''}
    <ol class="steps">${steps.map((st, i) => `<li class="step rise ${st.opt ? 'is-opt' : ''}" style="--i:${i}">
      <h2 class="step-t"><span class="step-dot"></span>${esc(typo(st.t))}${st.opt ? '<span class="tag">si besoin</span>' : ''}</h2>
      <div class="step-b">${st.l.map((l) => renderLine(l, ctx)).join('')}${st.tip ? `<p class="step-tip">${ic('target')}<span>${esc(typo(st.tip))}</span></p>` : ''}</div>
    </li>`).join('')}</ol>
    ${locked ? paywall('scriptsAll', { compact: true }) : ''}
    ${!locked && sc.objections.length ? `<h2 class="sec-title">Objections fréquentes</h2>
      <div class="objs">${sc.objections.map((o) => `<details class="obj"><summary><span>« ${esc(typo(o.q))} »</span>${ic('chevD', 'chev')}</summary><p>${fill(o.a, ctx)}</p></details>`).join('')}</div>` : ''}
    ${!sc.custom ? `<h2 class="sec-title">Autres formats — ${esc(sec.name)}</h2>
      <div class="chips-wrap">${CHANNELS.filter((c) => c.id !== sc.channel).map((c) => `<a class="chip-btn" href="#/script/${sc.service}.${c.id}.${sec.id}${pr ? `?p=${pr.id}` : ''}">${ic(c.icon)}${c.short}${!isFree(c.id) && !can('scriptsAll') ? ic('lock', 'ic-lock') : ''}</a>`).join('')}</div>
      <div class="chips-wrap">${SERVICE_IDS.filter((x) => x !== sc.service).map((x) => `<a class="chip-btn" href="#/script/${x}.${sc.channel}.${sec.id}${pr ? `?p=${pr.id}` : ''}">${ic(SERVICES[x].icon)}${SERVICES[x].short}</a>`).join('')}</div>` : `<a class="btn btn-ghost" href="#/outils/mes-scripts/${sc.id}">${ic('edit')}<span>Modifier ce script</span></a>`}`;
  return { title: sc.title, tab: 'scripts', html };
}

register({
  group: (b) => {
    b.parentElement.querySelectorAll('.chip-btn').forEach((x) => x.classList.toggle('is-on', x === b));
    const g = b.dataset.g;
    document.querySelectorAll('.sec-grid .sec-tile').forEach((t) => { t.dataset.hideG = g && t.dataset.group !== g ? '1' : ''; t.hidden = !!(t.dataset.hideG || t.dataset.hideQ); });
    const any = [...document.querySelectorAll('.sec-grid .sec-tile')].some((t) => !t.hidden);
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
  'fill-for': (el) => { location.hash = `#/script/${el.dataset.id}${el.value ? `?p=${el.value}` : ''}`; },
});
