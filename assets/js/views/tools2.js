// Outils (suite) : entraînement, statistiques, mes scripts, secteurs personnalisés.
import { S, can, update, uid, calls, startOfDay, DAY, OUTCOMES, signedValue, startOfMonth } from '../store.js';
import { ic, esc, eur, num, register, toast, field, input, select, confirmSheet } from '../ui.js';
import { SECTORS } from '../data/sectors.js';
import { SERVICES, SERVICE_IDS, allSectors, getSector, buildScript, fill, typo } from '../data/scripts.js';
import { pageHead, paywall } from './common.js';
import { ctxFor } from './scripts.js';
import { stackedBars } from '../charts.js';

// ---------- Entraînement ----------
const tr = { svc: null, sec: null, i: -1, shown: false };
function drawCard() {
  const s = S();
  tr.svc = tr.svc || s.profile.service || 'site';
  if (!tr.sec) tr.sec = 'toute';
  const sc = buildScript(tr.svc, 'appel', tr.sec);
  const list = sc.objections;
  const level = (k) => s.training[`${tr.svc}.${tr.sec}.${k}`] || 0;
  const pool = list.map((o, k) => ({ k, w: level(k) >= 2 ? 1 : level(k) === 1 ? 3 : 5 })).filter((x) => x.k !== tr.i);
  let r = Math.random() * pool.reduce((n, x) => n + x.w, 0);
  for (const x of pool) { r -= x.w; if (r <= 0) { tr.i = x.k; break; } }
  tr.shown = false;
}

export function training() {
  if (!can('training')) return { title: 'Entraînement', tab: 'plus', html: `${pageHead('Entraînement', { back: '#/outils' })}${paywall('training')}` };
  if (tr.i < 0) drawCard();
  const s = S();
  const sc = buildScript(tr.svc, 'appel', tr.sec);
  const o = sc.objections[tr.i] || sc.objections[0];
  const mastered = sc.objections.filter((x, k) => (s.training[`${tr.svc}.${tr.sec}.${k}`] || 0) >= 2).length;
  const html = `${pageHead('Entraînement', { back: '#/outils', kicker: 'Répondez à voix haute, puis comparez' })}
    <div class="form-2 rise">
      ${field('Service', select('svc', SERVICE_IDS.map((id) => [id, SERVICES[id].label]), tr.svc, 'data-act-change="tr-svc"'))}
      ${field('Secteur', select('sec', allSectors().map((x) => [x.id, x.name]), tr.sec, 'data-act-change="tr-sec"'))}
    </div>
    <p class="tr-prog rise"><span>${mastered} / ${sc.objections.length} maîtrisées</span><span class="bar olive"><i style="width:${(mastered / sc.objections.length) * 100}%"></i></span></p>
    <section class="card tr-card rise ${tr.shown ? 'is-shown' : ''}">
      <p class="tr-k">Le prospect vous dit</p>
      <p class="tr-q">« ${esc(typo(o.q))} »</p>
      ${tr.shown ? `<div class="tr-a"><p class="tr-k">Une réponse possible</p><p>${fill(o.a, ctxFor(tr.svc, null))}</p></div>
        <div class="tr-btns"><button class="btn btn-ghost" data-act="tr-rate" data-v="1">À revoir</button><button class="btn btn-olive" data-act="tr-rate" data-v="2">${ic('check')}<span>Maîtrisée</span></button></div>`
      : `<button class="btn btn-primary btn-block" data-act="tr-show">Voir la réponse</button>`}
    </section>
    <button class="link center" data-act="tr-next">Passer à une autre objection</button>`;
  return { title: 'Entraînement', tab: 'plus', html };
}

// ---------- Statistiques ----------
let period = 30;
export function stats() {
  if (!can('stats')) return { title: 'Statistiques', tab: 'plus', html: `${pageHead('Statistiques', { back: '#/outils' })}${paywall('stats')}` };
  const s = S();
  const from = startOfDay() - (period - 1) * DAY;
  const list = calls(from);
  const n = list.length;
  const talked = list.filter((a) => a.outcome !== 'nr').length;
  const rdv = list.filter((a) => a.outcome === 'rdv').length;
  const pos = list.filter((a) => a.outcome === 'interesse' || a.outcome === 'rdv').length;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const signedP = s.prospects.filter((p) => p.stage === 'signe' && (p.signedAt || p.updatedAt) >= from);
  const ca = signedP.reduce((x, p) => x + (Number(p.valeur) || 0), 0);
  const perDay = n / Math.max(1, Math.min(period, Math.ceil((Date.now() - Math.min(from, s.createdAt || from)) / DAY)));
  // Meilleur jour de la semaine (taux de conversation)
  const wd = [1, 2, 3, 4, 5].map((d) => {
    const l = list.filter((a) => new Date(a.at).getDay() === d);
    return { d, n: l.length, ok: l.filter((a) => a.outcome !== 'nr').length };
  });
  const NAMES = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
  const FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  // Secteurs : taux de réponses positives sur les appels liés à une fiche
  const bySec = {};
  list.filter((a) => a.prospectId).forEach((a) => {
    const p = s.prospects.find((x) => x.id === a.prospectId); if (!p) return;
    const k = p.secteur; bySec[k] = bySec[k] || { n: 0, pos: 0 }; bySec[k].n++;
    if (a.outcome === 'interesse' || a.outcome === 'rdv') bySec[k].pos++;
  });
  const secRows = Object.entries(bySec).sort((a, b) => b[1].n - a[1].n).slice(0, 8);
  const goalCalls = s.goals.appelsJour;
  const html = `${pageHead('Statistiques', { back: '#/outils', kicker: 'Calculées à partir de vos appels enregistrés' })}
    <nav class="seg seg-sm rise" aria-label="Période">${[7, 30, 90].map((d) => `<button class="seg-i ${d === period ? 'is-on' : ''}" data-act="period" data-d="${d}">${d} jours</button>`).join('')}</nav>
    <section class="kpis kpis-5 rise">
      <div class="kpi"><p class="kpi-l">Appels</p><p class="kpi-v">${num(n)}</p><p class="kpi-d">${num(Math.round(perDay))} par jour · objectif ${goalCalls}</p></div>
      <div class="kpi"><p class="kpi-l">Taux de conversation</p><p class="kpi-v">${pct(talked, n)} %</p><p class="kpi-d">${num(talked)} personnes jointes</p></div>
      <div class="kpi"><p class="kpi-l">Réponses positives</p><p class="kpi-v">${pct(pos, talked)} %</p><p class="kpi-d">des conversations</p></div>
      <div class="kpi"><p class="kpi-l">Rendez-vous</p><p class="kpi-v">${num(rdv)}</p><p class="kpi-d">1 tous les ${rdv ? num(Math.round(n / rdv)) : '—'} appels</p></div>
      <div class="kpi"><p class="kpi-l">Signé</p><p class="kpi-v">${eur(ca)}</p><p class="kpi-d">${signedP.length} client${signedP.length > 1 ? 's' : ''}</p></div>
    </section>
    <div class="tool-2">
      <section class="card rise">
        <header class="card-h"><div><h2>Résultats des appels</h2><p>${num(n)} appels sur ${period} jours</p></div></header>
        <ul class="fun">${OUTCOMES.map((o) => { const v = list.filter((a) => a.outcome === o.id).length; return `<li><span class="fun-l">${o.label}</span><span class="fun-b"><i style="width:${n ? Math.max(v ? 1.5 : 0, (v / n) * 100) : 0}%"></i></span><b class="fun-v">${num(v)}</b><span class="fun-p">${pct(v, n)} %</span></li>`; }).join('')}</ul>
      </section>
      <section class="card chart-card rise">
        <header class="card-h"><div><h2>Le meilleur jour pour appeler</h2><p>Personnes jointes par jour de semaine</p></div></header>
        <ul class="legend"><li><i class="sw s-pos"></i>Jointes</li><li><i class="sw s-oth"></i>Sans réponse</li></ul>
        <div class="chart" id="chart-wd" data-label="Appels par jour de semaine"></div>
        <p class="muted-s">${(() => { const b = [...wd].filter((x) => x.n >= 5).sort((a, c) => c.ok / c.n - a.ok / a.n)[0]; return b ? `${FULL[b.d]} : ${pct(b.ok, b.n)} % de personnes jointes.` : 'Pas encore assez d\'appels pour comparer.'; })()}</p>
      </section>
    </div>
    <section class="card rise">
      <header class="card-h"><div><h2>Par secteur</h2><p>Appels liés à une fiche</p></div></header>
      ${secRows.length ? `<table class="tbl"><thead><tr><th>Secteur</th><th>Appels</th><th>Positifs</th><th>Taux</th></tr></thead><tbody>${secRows.map(([k, v]) => `<tr><td>${esc(getSector(k)?.name || k)}</td><td>${v.n}</td><td>${v.pos}</td><td>${pct(v.pos, v.n)} %</td></tr>`).join('')}</tbody></table>` : '<p class="muted pad">Les appels passés depuis le mode appel apparaîtront ici, secteur par secteur.</p>'}
    </section>
    <p class="muted-s center">Objectifs modifiables dans les <a href="#/reglages">réglages</a>. Ce mois : ${eur(signedValue(startOfMonth()))} signés sur ${eur(s.goals.caMois)}.</p>`;
  return {
    title: 'Statistiques', tab: 'plus', html,
    after(root) {
      const host = root.querySelector('#chart-wd');
      if (host) return stackedBars(host, { data: wd.map((x) => ({ label: NAMES[x.d], full: FULL[x.d], values: [x.ok, x.n - x.ok] })), series: [{ name: 'Jointes', cls: 's-pos' }, { name: 'Sans réponse', cls: 's-oth' }], fmt: (v) => num(Math.round(v)) });
    },
  };
}

// ---------- Mes scripts ----------
export function myScripts() {
  if (!can('myScripts')) return { title: 'Mes scripts', tab: 'plus', html: `${pageHead('Mes scripts & secteurs', { back: '#/outils' })}${paywall('myScripts')}` };
  const s = S();
  const html = `${pageHead('Mes scripts & secteurs', { back: '#/outils' })}
    <section class="card rise">
      <header class="card-h"><div><h2>Mes scripts</h2><p>Écrits par vous, utilisables en mode appel</p></div><button class="btn btn-primary btn-sm" data-act="my-new">${ic('plus')}<span>Script</span></button></header>
      ${s.myScripts.length ? `<ul class="rows">${s.myScripts.map((m) => `<li><a class="row" href="#/script/${m.id}"><span class="sec-ic">${ic(getSector(m.sector)?.icon || 'edit')}</span><span class="row-b"><b>${esc(m.title || 'Sans titre')}</b><span>${esc(getSector(m.sector)?.name || '')} · ${SERVICES[m.service]?.short || ''} · ${m.steps.length} étape${m.steps.length > 1 ? 's' : ''}</span></span>${ic('chevR', 'chev')}</a></li>`).join('')}</ul>`
        : '<p class="muted pad">Partez de zéro, ou ouvrez un script de la bibliothèque et touchez « Personnaliser ».</p>'}
    </section>
    <section class="card rise">
      <header class="card-h"><div><h2>Mes secteurs</h2><p>L'application génère les 30 scripts de chaque secteur</p></div><a class="btn btn-ghost btn-sm" href="#/outils/secteur/nouveau">${ic('plus')}<span>Secteur</span></a></header>
      ${s.mySectors.length ? `<ul class="rows">${s.mySectors.map((x) => `<li><a class="row" href="#/outils/secteur/${x.id}"><span class="sec-ic">${ic(x.icon)}</span><span class="row-b"><b>${esc(x.name)}</b><span>Modifier les accroches et les horaires</span></span>${ic('chevR', 'chev')}</a></li>`).join('')}</ul>`
        : '<p class="muted pad">Un métier manque ? Créez-le : opticien, pharmacie, agence de voyage…</p>'}
    </section>`;
  return { title: 'Mes scripts', tab: 'plus', html };
}

export function myScriptEdit([id]) {
  if (!can('myScripts')) return { title: 'Mon script', tab: 'plus', html: `${pageHead('Mon script', { back: '#/outils/mes-scripts' })}${paywall('myScripts')}` };
  const m = S().myScripts.find((x) => x.id === id);
  if (!m) return null;
  const html = `${pageHead('Modifier le script', { back: `#/script/${id}` })}
    <form class="form" data-form="my-script" data-id="${id}">
      <section class="card form rise">
        ${field('Titre', input('title', m.title, 'required placeholder="Appel à froid — version courte"'))}
        <div class="form-2">${field('Service', select('service', SERVICE_IDS.map((x) => [x, SERVICES[x].label]), m.service))}${field('Secteur', select('sector', allSectors().map((x) => [x.id, x.name]), m.sector))}</div>
        ${field('Objectif', input('goal', m.goal || '', 'placeholder="Décrocher un rendez-vous"'))}
        <p class="field-h">Une ligne = une réplique. Commencez par « > » pour une réponse du prospect et par « ! » pour une indication. Variables : {prenom} {societe} {entreprise} {contact} {ville} {tel} {prix} {jour}.</p>
      </section>
      ${m.steps.map((st, i) => `<section class="card form step-edit rise">
        <div class="step-edit-h">${field(`Étape ${i + 1}`, input(`t${i}`, st.t, 'placeholder="Ouverture"'))}<button type="button" class="icon-btn" data-act="my-step-del" data-i="${i}" aria-label="Supprimer l'étape">${ic('trash')}</button></div>
        <textarea class="inp" name="x${i}" rows="5">${esc(st.text)}</textarea></section>`).join('')}
      <button type="button" class="btn btn-ghost btn-block" data-act="my-step-add">${ic('plus')}<span>Ajouter une étape</span></button>
      <div class="act-row"><button class="btn btn-primary" type="submit">Enregistrer</button><button type="button" class="btn btn-danger-ghost" data-act="my-del" data-id="${id}">${ic('trash')}<span>Supprimer</span></button></div>
    </form>`;
  return { title: 'Mon script', tab: 'plus', html };
}

function readMyForm(f) {
  const d = Object.fromEntries(new FormData(f));
  const steps = [];
  for (let i = 0; `t${i}` in d; i++) steps.push({ t: d[`t${i}`], text: d[`x${i}`] || '' });
  return { title: d.title, service: d.service, sector: d.sector, goal: d.goal, steps };
}

// ---------- Secteur personnalisé ----------
const ICONS = ['building', 'store', 'briefcase', 'globe', 'camera', 'pulse', 'car', 'house', 'utensils', 'coffee', 'flower', 'scissors', 'paw', 'book', 'hanger', 'bottle', 'calculator', 'scale', 'compass', 'hammer'];
export function sectorEdit([id]) {
  if (!can('myScripts')) return { title: 'Secteur', tab: 'plus', html: `${pageHead('Nouveau secteur', { back: '#/outils/mes-scripts' })}${paywall('myScripts')}` };
  const base = SECTORS.find((x) => x.id === 'toute');
  const cur = id === 'nouveau' ? null : S().mySectors.find((x) => x.id === id);
  if (id !== 'nouveau' && !cur) return null;
  const v = cur || { ...JSON.parse(JSON.stringify(base)), name: '', plural: '', search: '', chez: 'à la boutique', compliment: 'votre activité', icon: 'store' };
  const svcBlock = (k) => `<details class="card form rise" ${k === 'site' ? 'open' : ''}><summary><h2>${SERVICES[k].label}</h2>${ic('chevD', 'chev')}</summary>
    ${field('Accroche (constat)', `<textarea class="inp" name="${k}.hook" rows="3">${esc(v[k].hook)}</textarea>`)}
    ${field('Question 1', input(`${k}.q0`, v[k].q[0]))}${field('Question 2', input(`${k}.q1`, v[k].q[1]))}
    ${field('Ce que vous apportez', `<textarea class="inp" name="${k}.value" rows="2">${esc(v[k].value)}</textarea>`)}
    ${field('Exemple concret', input(`${k}.ex`, v[k].ex))}</details>`;
  const html = `${pageHead(cur ? esc(cur.name) : 'Nouveau secteur', { back: '#/outils/mes-scripts', kicker: 'Secteur personnalisé' })}
    <form class="form" data-form="my-sector" data-id="${cur?.id || ''}">
      <section class="card form rise">
        <div class="form-2">${field('Nom du secteur', input('name', v.name, 'required placeholder="Opticien"'))}${field('Au pluriel', input('plural', v.plural, 'required placeholder="opticiens"'))}</div>
        <div class="form-2">${field('Recherche Google type', input('search', v.search, 'placeholder="opticien"'))}${field('Lieu du rendez-vous', input('chez', v.chez, 'placeholder="au magasin"'))}</div>
        ${field('Compliment (message Instagram)', input('compliment', v.compliment, 'placeholder="vos montures"'))}
        ${field('Quand appeler', input('horaire', v.horaire))}
        ${field('À éviter', input('eviter', v.eviter))}
        <div class="form-2">${field('Créneaux à proposer', input('creneau', v.creneau))}${field('Temps forts', input('temps', v.temps))}</div>
        ${field('Conseil', input('conseil', v.conseil))}
        <fieldset class="icon-pick"><legend class="field-l">Icône</legend>${ICONS.map((x) => `<label><input type="radio" name="icon" value="${x}" ${v.icon === x ? 'checked' : ''}><span>${ic(x)}</span></label>`).join('')}</fieldset>
      </section>
      ${SERVICE_IDS.map(svcBlock).join('')}
      <section class="card form rise">${field('Objection typique du secteur', input('obj.q', v.obj.q))}${field('Réponse', `<textarea class="inp" name="obj.a" rows="3">${esc(v.obj.a)}</textarea>`)}</section>
      <div class="act-row"><button class="btn btn-primary" type="submit">Enregistrer le secteur</button>${cur ? `<button type="button" class="btn btn-danger-ghost" data-act="sector-del" data-id="${cur.id}">${ic('trash')}<span>Supprimer</span></button>` : ''}</div>
    </form>`;
  return { title: 'Secteur', tab: 'plus', html };
}

const rr = () => window.dispatchEvent(new Event('ms:rerender'));
register({
  'tr-show': () => { tr.shown = true; rr(); },
  'tr-next': () => { drawCard(); rr(); },
  'tr-rate': (b) => { update((s) => { s.training[`${tr.svc}.${tr.sec}.${tr.i}`] = +b.dataset.v; }, { silent: true }); drawCard(); rr(); },
  'tr-svc': (el) => { tr.svc = el.value; tr.i = -1; drawCard(); rr(); },
  'tr-sec': (el) => { tr.sec = el.value; tr.i = -1; drawCard(); rr(); },
  period: (b) => { period = +b.dataset.d; rr(); },
  'my-new': () => {
    const id = 'my-' + uid();
    update((s) => { s.myScripts.unshift({ id, title: 'Mon script', service: s.profile.service || 'site', sector: 'toute', goal: '', steps: [{ t: 'Ouverture', text: 'Bonjour, je suis bien chez {entreprise} ?\n> Oui, c\'est pour quoi ?\nJe suis {prenom}, de {societe}…' }, { t: 'Rendez-vous', text: 'Ça vous irait plutôt mardi ou jeudi ?\n! Proposez toujours deux créneaux.' }] }); });
    location.hash = `#/outils/mes-scripts/${id}`;
  },
  'my-step-add': (b) => {
    const f = b.closest('form'); const d = readMyForm(f); d.steps.push({ t: '', text: '' });
    update((s) => { Object.assign(s.myScripts.find((x) => x.id === f.dataset.id), d); });
  },
  'my-step-del': (b) => {
    const f = b.closest('form'); const d = readMyForm(f); d.steps.splice(+b.dataset.i, 1);
    update((s) => { Object.assign(s.myScripts.find((x) => x.id === f.dataset.id), d); });
  },
  'my-del': async (b) => {
    if (!await confirmSheet({ title: 'Supprimer ce script ?', ok: 'Supprimer', danger: true })) return;
    update((s) => { s.myScripts = s.myScripts.filter((x) => x.id !== b.dataset.id); s.favorites = s.favorites.filter((x) => x !== b.dataset.id); });
    location.hash = '#/outils/mes-scripts';
  },
  'sector-del': async (b) => {
    if (!await confirmSheet({ title: 'Supprimer ce secteur ?', text: 'Les fiches de ce secteur passeront en « Toute entreprise ».', ok: 'Supprimer', danger: true })) return;
    update((s) => { s.mySectors = s.mySectors.filter((x) => x.id !== b.dataset.id); s.prospects.forEach((p) => { if (p.secteur === b.dataset.id) p.secteur = 'toute'; }); });
    location.hash = '#/outils/mes-scripts';
  },
  'dup-script': (b) => {
    if (!can('myScripts')) { location.hash = '#/outils/mes-scripts'; return; }
    const [svc, ch, sec] = b.dataset.id.split('.');
    const sc = buildScript(svc, ch, sec);
    const pre = { v: '', p: '> ', n: '! ', m: '', o: '! Objet : ' };
    const id = 'my-' + uid();
    update((s) => { s.myScripts.unshift({ id, title: `${sc.title} (perso)`, service: svc, sector: sec, goal: sc.goal, steps: sc.steps.map((st) => ({ t: st.t, text: st.l.map(([w, t]) => pre[w] + t.replace(/\n+/g, ' ')).join('\n') })) }); });
    toast('Copie créée dans Mes scripts'); location.hash = `#/outils/mes-scripts/${id}`;
  },
}, {
  'my-script': (data, f) => { const d = readMyForm(f); update((s) => { Object.assign(s.myScripts.find((x) => x.id === f.dataset.id), d); }); toast('Script enregistré'); location.hash = `#/script/${f.dataset.id}`; },
  'my-sector': (d, f) => {
    const get = (k) => (d[k] || '').trim();
    const sec = {
      custom: true, group: 'perso', name: get('name'), plural: get('plural') || get('name').toLowerCase(), search: get('search'), chez: get('chez') || 'chez vous',
      compliment: get('compliment') || 'votre activité', horaire: get('horaire'), eviter: get('eviter'), creneau: get('creneau'), temps: get('temps'), conseil: get('conseil'), icon: d.icon || 'store',
      obj: { q: get('obj.q'), a: get('obj.a') },
    };
    SERVICE_IDS.forEach((k) => { sec[k] = { hook: get(`${k}.hook`), q: [get(`${k}.q0`), get(`${k}.q1`)], value: get(`${k}.value`), ex: get(`${k}.ex`) }; });
    const id = f.dataset.id || `x-${uid()}`;
    update((s) => { const i = s.mySectors.findIndex((x) => x.id === id); const full = { ...sec, id }; if (i >= 0) s.mySectors[i] = full; else s.mySectors.push(full); });
    toast('Secteur enregistré : ses scripts sont prêts'); location.hash = `#/scripts/${id}`;
  },
});
