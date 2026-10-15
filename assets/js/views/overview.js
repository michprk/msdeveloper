// Vue d'ensemble : les chiffres de l'utilisateur (aucune donnée inventée) — cartes avec
// évolution par rapport à la période précédente, courbe, activité récente, répartition.
import { S, on, can, DAY, startOfDay, stageOf, OUTCOME, SOURCES } from '../store.js';
import { ic, esc, eur, num, ago, register } from '../ui.js';
import { sparkline, lineChart, donut } from '../charts.js';
import { pageHead } from './common.js';
import { QUIZZES } from '../data/quizzes.js';

const df = new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'short' });
const dfl = new Intl.DateTimeFormat('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' });
const DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const inR = (t, [a, b]) => Number.isFinite(t) && t >= a && t < b;
const pct = (v) => `${v.toFixed(1).replace('.', ',')} %`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Période se terminant aujourd'hui (incluse), décalée de `back` périodes
export const period = (days, back = 0) => { const to = startOfDay() + DAY - back * days * DAY; return [to - days * DAY, to]; };
const rangeLabel = ([a, b]) => { const e = b - DAY; return df.format(a).split(' ')[1] === df.format(e).split(' ')[1] ? `${new Date(a).getDate()} – ${df.format(e)}` : `${df.format(a)} – ${df.format(e)}`; };

const rdvRate = (s, r) => { const c = s.activities.filter((a) => a.type === 'appel' && inR(a.at, r)); return c.length ? (c.filter((a) => a.outcome === 'rdv').length / c.length) * 100 : null; };
export const METRICS = {
  done: { label: 'Tâches terminées', icon: 'checkSquare', tone: 'olive', fmt: num, get: (s, r) => s.tasks.filter((t) => t.done && inR(t.doneAt, r)).length },
  signed: { label: () => `${stageOf('signe').label} (€)`, icon: 'euro', tone: 'blue', fmt: eur, get: (s, r) => s.prospects.filter((p) => p.stage === 'signe' && inR(p.signedAt || p.updatedAt, r)).reduce((n, p) => n + (Number(p.valeur) || 0), 0) },
  conv: { label: 'Taux de rendez-vous', icon: 'target', tone: 'sand', fmt: (v) => (v === null ? '—' : pct(v)), rate: true, get: rdvRate },
  calls: { label: 'Appels', icon: 'phone', tone: 'navy', fmt: num, get: (s, r) => s.activities.filter((a) => a.type === 'appel' && inR(a.at, r)).length },
  newcli: { label: 'Nouvelles fiches', icon: 'users', tone: 'navy', fmt: num, get: (s, r) => s.prospects.filter((p) => inR(p.createdAt, r)).length },
};
const mLabel = (id) => { const l = METRICS[id].label; return typeof l === 'function' ? l() : l; };
export function metricIds() {
  const crm = can('crm');
  const ids = [];
  if (on('organiser')) ids.push('done');
  if (on('clients') && crm) ids.push('signed');
  if (on('prospecter') && crm) ids.push('conv', 'calls');
  else if (on('clients') && crm) ids.push('newcli');
  return ids;
}
export const hasData = (s = S()) => s.tasks.some((t) => t.done) || s.prospects.length > 0 || s.activities.length > 0;

// Valeurs jour par jour sur la période
export function daily(id, days) {
  const s = S(), [a] = period(days);
  return Array.from({ length: days }, (_, i) => { const v = METRICS[id].get(s, [a + i * DAY, a + (i + 1) * DAY]); return v ?? 0; });
}
function delta(id, days) {
  const s = S(), M = METRICS[id];
  const cur = M.get(s, period(days)), prev = M.get(s, period(days, 1));
  if (M.rate) {
    if (cur === null || prev === null) return { cur, dir: 0, txt: cur === null ? 'pas encore d\'appel' : 'première période' };
    const d = cur - prev;
    return { cur, dir: Math.sign(Math.round(d * 10)), txt: `${Math.abs(d).toFixed(1).replace('.', ',')} pt` };
  }
  if (!cur && !prev) return { cur, dir: 0, txt: 'stable' };
  if (!prev) return { cur, dir: 1, txt: 'nouveau', plain: true };
  const p = ((cur - prev) / prev) * 100;
  return { cur, dir: Math.sign(Math.round(p)), txt: `${Math.abs(p) < 10 ? Math.abs(p).toFixed(1).replace('.', ',') : Math.round(Math.abs(p))} %` };
}

// Carte chiffre : libellé, valeur, évolution en texte, courbe décorative
export function kpiCard(id, days, { href = '#/apercu' } = {}) {
  const M = METRICS[id], d = delta(id, days);
  const spark = daily(id, Math.max(days, 14)).slice(-Math.max(days, 14));
  const word = d.plain ? '' : d.dir > 0 ? 'en hausse' : d.dir < 0 ? 'en baisse' : '';
  return `<a class="kpi2 k-${M.tone}" href="${href}">
    <span class="kpi2-h"><span class="kpi2-l">${esc(mLabel(id))}</span><span class="kpi2-ic">${ic(M.icon)}</span></span>
    <span class="kpi2-v">${M.fmt(d.cur)}</span>
    <span class="kpi2-d ${d.dir > 0 ? 'up' : d.dir < 0 ? 'down' : 'flat'}">${d.dir && !d.plain ? ic('arrowR', d.dir > 0 ? 'up-ic' : 'down-ic') : ''}${word ? `<span class="sr-only">${word} de </span>` : ''}<b>${d.txt}</b><span>${d.plain ? 'rien du' : 'vs'} ${rangeLabel(period(days, 1))}</span></span>
    ${sparkline(spark)}
  </a>`;
}

// ---------- Activité récente ----------
const ACT = { appel: ['phone', 'Appel'], note: ['note', 'Note'], email: ['mail', 'E-mail envoyé'], sms: ['message', 'SMS envoyé'], visite: ['store', 'Visite'], rdv: ['calendar', 'Rendez-vous'], devis: ['invoice', 'Devis envoyé'], audit: ['clipboard', 'Audit express'] };
export function activity(limit = 6) {
  const s = S(), now = Date.now();
  const pName = (id) => s.prospects.find((p) => p.id === id)?.entreprise || '';
  const pVal = (id) => Number(s.prospects.find((p) => p.id === id)?.valeur) || 0;
  const ev = [
    ...s.tasks.filter((t) => t.done && t.doneAt).map((t) => ({ at: t.doneAt, i: 'checkSquare', tone: 'olive', ev: 'Tâche terminée', what: t.title, href: '#/taches' })),
    ...s.prospects.map((p) => ({ at: p.createdAt, i: 'user', tone: 'sky', ev: 'Nouvelle fiche', what: p.entreprise, href: `#/fiche/${p.id}` })),
    ...s.activities.filter((a) => s.prospects.some((p) => p.id === a.prospectId)).map((a) => a.type === 'etape'
      ? { at: a.at, i: a.to === 'signe' ? 'checkCircle' : 'arrowR', tone: a.to === 'signe' ? 'olive' : 'sky', ev: a.to === 'signe' ? stageOf('signe').label : `Étape : ${stageOf(a.to).label}`, what: pName(a.prospectId), amount: a.to === 'signe' && pVal(a.prospectId) ? eur(pVal(a.prospectId)) : '', href: `#/fiche/${a.prospectId}` }
      : { at: a.at, i: ACT[a.type]?.[0] || 'note', tone: a.outcome === 'rdv' ? 'olive' : 'blue', ev: `${ACT[a.type]?.[1] || 'Échange'}${a.outcome && OUTCOME[a.outcome] ? ` · ${OUTCOME[a.outcome].short}` : ''}`, what: pName(a.prospectId), href: `#/fiche/${a.prospectId}` }),
    ...s.pages.map((p) => ({ at: p.updatedAt, i: 'page', tone: 'navy', ev: p.updatedAt - p.createdAt < 60e3 ? 'Page créée' : 'Page modifiée', what: p.title || 'Sans titre', href: `#/note/${p.id}` })),
    ...Object.entries(s.quiz.results).filter(([, r]) => r.at).map(([id, r]) => ({ at: r.at, i: 'quiz', tone: 'sand', ev: 'Quiz terminé', what: id.startsWith('note:') ? 'Révision de notes' : id.startsWith('mq-') ? s.quiz.mine.find((m) => m.id === id)?.title || 'Mon quiz' : id, amount: r.last !== undefined ? `${r.last} %` : '', href: '#/quiz', quiz: id })),
    ...(s.sub.history || []).filter((h) => h.type === 'paiement').map((h) => ({ at: h.at, i: 'receipt', tone: 'blue', ev: 'Paiement (test)', what: h.label, amount: eur(h.amount), href: '#/abonnement' })),
  ].filter((e) => Number.isFinite(e.at) && e.at <= now + 60e3 && e.what !== undefined).sort((a, b) => b.at - a.at);
  return { list: ev.slice(0, limit), total: ev.length };
}
const quizTitle = (id) => QUIZZES.find((q) => q.id === id)?.title;
export function activityTable(items) {
  return `<table class="act-t"><thead><tr><th scope="col">Événement</th><th scope="col">Élément</th><th scope="col">Quand</th><th scope="col" class="num">Détail</th></tr></thead><tbody>
    ${items.map((e) => `<tr><td data-l="Événement"><a href="${e.href}" class="act-ev"><span class="act-ic t-${e.tone}">${ic(e.i)}</span>${esc(e.ev)}</a></td><td data-l="Élément" class="act-what">${esc(e.quiz ? quizTitle(e.quiz) || e.what : e.what) || '<span class="muted">—</span>'}</td><td data-l="Quand" class="muted">${ago(e.at)}</td><td data-l="Détail" class="num">${esc(e.amount || '') || '<span class="muted">—</span>'}</td></tr>`).join('')}
  </tbody></table>`;
}

// ---------- Répartition ----------
const CAT = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
function breakdown() {
  const s = S();
  if (on('clients') && can('crm') && s.prospects.length) {
    const order = ['Appel', 'Recommandation', 'Instagram', 'Site web', 'Visite', 'Salon'];
    const count = (src) => s.prospects.filter((p) => (p.source || 'Autre') === src).length;
    const other = s.prospects.length - order.reduce((n, x) => n + count(x), 0);
    return { title: 'Origine de vos fiches', unit: 'fiches', total: s.prospects.length, data: [...order.map((x, i) => ({ name: x, value: count(x), cls: CAT[i] })), { name: 'Autre', value: other, cls: 'c-other' }] };
  }
  const open = s.tasks.filter((t) => !t.done);
  if (on('organiser') && open.length) {
    const lists = s.lists.slice(0, 6);
    const none = open.filter((t) => !lists.some((l) => l.id === t.list)).length;
    return { title: 'Tâches à faire, par liste', unit: 'tâches', total: open.length, data: [...lists.map((l, i) => ({ name: l.name, value: open.filter((t) => t.list === l.id).length, cls: CAT[i] })), { name: 'Sans liste', value: none, cls: 'c-other' }] };
  }
  return null;
}

// ---------- Page ----------
export function overview(params, q) {
  const s = S();
  const days = q.p === '30' ? 30 : 7;
  const ids = metricIds();
  const chartIds = ids.filter((id) => id !== 'conv');
  const m = chartIds.includes(q.m) ? q.m : chartIds[0];
  const href = (patch) => { const p = new URLSearchParams({ ...(days === 30 ? { p: '30' } : {}), ...(m && m !== chartIds[0] ? { m } : {}), ...(q.all ? { all: '1' } : {}), ...patch }); for (const [k, v] of [...p]) if (!v) p.delete(k); const qs = p.toString(); return `#/apercu${qs ? '?' + qs : ''}`; };
  const [a] = period(days);
  const series = m ? daily(m, days).map((v, i) => { const t = a + i * DAY; const dt = new Date(t); return { label: days === 7 ? `${DAYS[dt.getDay()]} ${dt.getDate()}` : `${dt.getDate()}/${dt.getMonth() + 1}`, full: cap(dfl.format(t)), value: v }; }) : [];
  const anyChart = series.some((d) => d.value > 0);
  const act = activity(q.all ? 30 : 6);
  const br = breakdown();
  const html = `
    ${pageHead('Vue d\'ensemble', { kicker: 'Vos chiffres, calculés à partir de vos propres données', actions: `<nav class="seg seg-sm ov-period" aria-label="Période"><a class="seg-i ${days === 7 ? 'is-on' : ''}" href="${href({ p: '' })}">7 jours</a><a class="seg-i ${days === 30 ? 'is-on' : ''}" href="${href({ p: '30' })}">30 jours</a></nav>` })}
    ${!hasData(s) ? `<section class="card onboard-empty rise">
        <span class="empty-ic">${ic('chart')}</span>
        <h2>Vos chiffres apparaîtront ici</h2>
        <p>Dès votre première tâche terminée${on('clients') ? ' ou votre première fiche' : ''}, cette page montre votre progression, semaine après semaine. Rien n'est inventé : uniquement ce que vous faites dans l'application.</p>
        <div class="end-a"><a class="btn btn-primary" href="#/taches?new=1">${ic('plus')}<span>Créer ma première tâche</span></a>${on('clients') ? `<a class="btn btn-ghost" href="#/crm?new=1">${ic('users')}<span>Ajouter un client</span></a>` : ''}</div>
      </section>` : `
    <p class="ov-range">${rangeLabel(period(days))}, comparé au ${rangeLabel(period(days, 1))}</p>
    <div class="kpi-grid n${ids.length}">${ids.map((id) => kpiCard(id, days, { href: chartIds.includes(id) ? href({ m: id }) : '#/apercu' })).join('')}</div>
    ${m ? `<section class="card ov-chart rise">
      <header class="card-h"><div><h2>Évolution</h2><p>${esc(mLabel(m))} par jour</p></div>
        <div class="ov-tools">${chartIds.length > 1 ? `<label class="sr-only" for="ov-m">Indicateur</label><select id="ov-m" class="inp ov-sel" data-act-change="ov-metric">${chartIds.map((id) => `<option value="${id}" ${id === m ? 'selected' : ''}>${esc(mLabel(id))}</option>`).join('')}</select>` : ''}${anyChart ? '<button class="chip-btn" data-act="ov-table" aria-pressed="false">Tableau</button>' : ''}</div></header>
      ${anyChart ? `<div class="chart ln-chart" id="ov-line" data-label="${esc(mLabel(m))}, ${days} derniers jours" data-series="${esc(mLabel(m).toLowerCase())}"></div>
        <table class="ch-table tbl" hidden><thead><tr><th>Jour</th><th>${esc(mLabel(m))}</th></tr></thead><tbody>${series.map((d) => `<tr><td>${esc(d.full)}</td><td>${METRICS[m].fmt(d.value)}</td></tr>`).join('')}</tbody></table>`
        : `<div class="mini-empty">${ic('chart')}<p>Rien sur cette période pour « ${esc(mLabel(m))} ». Choisissez un autre indicateur ou passez à 30 jours.</p></div>`}
    </section>` : ''}
    <div class="ov-two">
      <section class="card ov-act rise">
        <header class="card-h"><div><h2>Activité récente</h2><p>${act.total} événement${act.total > 1 ? 's' : ''}</p></div></header>
        ${act.list.length ? activityTable(act.list) : '<p class="muted pad">Rien pour l\'instant.</p>'}
        ${act.total > act.list.length ? `<a class="btn btn-ghost btn-sm" href="${href({ all: '1' })}">Voir toute l'activité</a>` : q.all && act.total > 6 ? `<a class="btn btn-ghost btn-sm" href="${href({ all: '' })}">Afficher moins</a>` : ''}
      </section>
      ${br ? `<section class="card ov-donut rise">
        <header class="card-h"><div><h2>${br.title}</h2><p>${br.total} ${br.unit}</p></div></header>
        <div class="dn-wrap"><div class="chart dn-chart" id="ov-donut" data-label="${esc(br.title)}"><p class="dn-c"><b>${num(br.total)}</b><span>${br.unit}</span></p></div>
          <ul class="dn-leg">${br.data.filter((d) => d.value).map((d) => `<li><i class="sw ${d.cls}"></i><span>${esc(d.name)}</span><b>${Math.round((d.value / br.total) * 100)} %</b></li>`).join('')}</ul></div>
        ${(on('clients') || on('prospecter')) && br.unit === 'fiches' ? '<a class="btn btn-ghost btn-sm" href="#/outils/stats">Voir le rapport complet</a>' : ''}
      </section>` : ''}
    </div>`}`;
  return {
    title: 'Vue d\'ensemble', tab: 'apercu', html,
    after(root) {
      const offs = [];
      const lh = root.querySelector('#ov-line');
      if (lh) offs.push(lineChart(lh, { data: series, fmt: METRICS[m].fmt, tick: (v) => (m === 'signed' ? (v >= 1000 ? `${Math.round(v / 100) / 10} k€`.replace('.', ',') : `${Math.round(v)} €`) : num(Math.round(v))) }));
      const dh = root.querySelector('#ov-donut');
      if (dh && br) offs.push(donut(dh, { data: br.data, fmt: num }));
      return () => offs.forEach((f) => f?.());
    },
  };
}

register({
  'ov-metric': (el) => { const p = new URLSearchParams(location.hash.split('?')[1] || ''); p.set('m', el.value); location.hash = `#/apercu?${p}`; },
  'ov-table': (b) => {
    const card = b.closest('.card'); const on2 = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', on2); b.textContent = on2 ? 'Graphique' : 'Tableau';
    card.querySelector('.ch-table').hidden = !on2; card.querySelector('.chart').hidden = on2;
  },
});
export { SOURCES };
