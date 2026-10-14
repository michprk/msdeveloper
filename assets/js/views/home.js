// Accueil : objectif du jour, chiffres clés, activité, à faire, conseil.
import { S, update, calls, signedValue, stageCount, startOfDay, startOfWeek, startOfMonth, DAY, can, trialActive } from '../store.js';
import { ic, esc, eur, num, dateLong, when, ring, bar, stageChip, avatar, ago, register, toast, confirmSheet } from '../ui.js';
import { logoMark } from '../icons.js';
import { SERVICES, getSector, buildScript } from '../data/scripts.js';
import { TIPS } from '../data/guides.js';
import { stackedBars } from '../charts.js';
import { trialStrip, sectorTile } from './common.js';
import { clearDemo } from '../data/demo.js';

const DAYS = ['di', 'lu', 'ma', 'me', 'je', 've', 'sa'];
const DAYS_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

function activityData() {
  const t0 = startOfDay();
  const out = [];
  for (let d = 6; d >= 0; d--) {
    const from = t0 - d * DAY, list = calls(from, from + DAY);
    const pos = list.filter((a) => a.outcome === 'interesse' || a.outcome === 'rdv').length;
    const dt = new Date(from);
    out.push({ label: d === 0 ? 'auj.' : DAYS[dt.getDay()], full: d === 0 ? 'Aujourd\'hui' : `${DAYS_FULL[dt.getDay()]} ${dt.getDate()}`, values: [pos, list.length - pos] });
  }
  return out;
}

export function home() {
  const s = S(), p = s.profile, g = s.goals;
  const t0 = startOfDay(), w0 = startOfWeek(), m0 = startOfMonth();
  const today = calls(t0).length;
  const rdvWeek = calls(w0).filter((a) => a.outcome === 'rdv').length;
  const signedMonth = signedValue(m0);
  const newMonth = s.prospects.filter((x) => x.createdAt >= m0).length;
  const devis = s.prospects.filter((x) => x.stage === 'devis');
  const devisSum = devis.reduce((n, x) => n + (Number(x.valeur) || 0), 0);
  const left = Math.max(0, g.appelsJour - today);
  const hasDemo = s.prospects.some((x) => x.demo);
  const crm = can('crm');

  // À faire : en retard + aujourd'hui
  const end = t0 + DAY;
  const todo = s.tasks.filter((t) => !t.done && t.due && t.due < end).sort((a, b) => a.due - b.due).slice(0, 4);

  // Prochain appel → script conseillé
  const next = s.prospects.filter((x) => x.stage === 'rappeler' || x.stage === 'a_appeler')
    .sort((a, b) => (a.stage === 'rappeler' ? 0 : 1) - (b.stage === 'rappeler' ? 0 : 1) || (a.next?.due || 9e15) - (b.next?.due || 9e15))[0];
  const nextSec = getSector(next?.secteur || 'fleuriste') || getSector('fleuriste');
  const nextSvc = next?.service || p.service || 'site';
  const sc = buildScript(nextSvc, 'appel', nextSec.id);
  const tip = TIPS[Math.floor(t0 / DAY) % TIPS.length];

  // Entonnoir sur 30 jours
  const c30 = calls(t0 - 29 * DAY);
  const talked = c30.filter((a) => a.outcome !== 'nr').length;
  const pos30 = c30.filter((a) => a.outcome === 'interesse' || a.outcome === 'rdv').length;
  const rdv30 = c30.filter((a) => a.outcome === 'rdv').length;
  const signed = s.prospects.filter((x) => x.stage === 'signe').length;
  const funnel = [['Appels', c30.length], ['Conversations', talked], ['Réponses positives', pos30], ['Rendez-vous', rdv30], ['Clients signés', signed]];
  const fmax = Math.max(1, c30.length);
  const recent = [...s.prospects].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);

  const html = `
  <div class="home">
    <div class="m-top">
      <a class="m-brand" href="#/" aria-label="M&amp;S Developer">${logoMark('sm')}<span><b>M&amp;S</b> Developer</span></a>
      <a class="m-avatar" href="#/reglages" aria-label="Réglages">${avatar(p.prenom || 'M S')}</a>
    </div>
    <header class="ph ph-home">
      <p class="ph-k">${dateLong()}</p>
      <h1 class="ph-t">Bonjour${p.prenom ? ' ' + esc(p.prenom) : ''}</h1>
    </header>
    ${trialStrip()}
    ${!trialActive() && s.sub.plan === 'free' && !s.sub.trialStart && !s.sub.demo ? `<section class="card cta-trial rise">
      <div><h2>Essayez tout pendant 7 jours</h2><p>CRM, mode appel, tous les scripts et les outils. Sans carte bancaire.</p></div>
      <button class="btn btn-primary" data-act="start-trial">Commencer l'essai</button></section>` : ''}
    ${hasDemo ? `<div class="note-demo rise">${ic('note')}<span>Vous découvrez l'application avec des entreprises d'exemple.</span><button class="link" data-act="clear-demo">Effacer les exemples</button></div>` : ''}

    <div class="home-grid">
      <section class="card hero rise" style="--i:1">
        <div class="hero-top">
          <div class="hero-ring">${ring(today, g.appelsJour, { size: 116, stroke: 10, cls: 'on-navy' })}<div class="hero-ring-v"><b>${num(today)}</b><span>/ ${num(g.appelsJour)}</span></div></div>
          <div class="hero-txt">
            <p class="hero-k">Objectif du jour</p>
            <h2>${left ? `Encore ${num(left)} appel${left > 1 ? 's' : ''}` : 'Objectif atteint'}</h2>
            <p>${left ? 'Une session de 45 minutes suffit souvent. Votre liste est prête.' : 'Belle journée. Pensez aux confirmations par SMS.'}</p>
          </div>
        </div>
        <a class="btn btn-sky btn-block" href="#/appel">${ic('headset')}<span>Lancer une session d'appels</span></a>
        <div class="hero-goals">
          <div><p><span>Rendez-vous cette semaine</span><b>${rdvWeek} / ${g.rdvSemaine}</b></p>${bar(rdvWeek, g.rdvSemaine, 'on-navy')}</div>
          <div><p><span>Signé ce mois</span><b>${eur(signedMonth)} / ${eur(g.caMois)}</b></p>${bar(signedMonth, g.caMois, 'on-navy olive')}</div>
        </div>
      </section>

      <section class="kpis rise" style="--i:2" aria-label="Chiffres clés">
        <a class="kpi" href="#/crm"><span class="kpi-ic t-blue">${ic('users')}</span><p class="kpi-l">Prospects</p><p class="kpi-v">${num(s.prospects.length)}</p><p class="kpi-d">+${num(newMonth)} ce mois</p></a>
        <a class="kpi" href="#/crm?f=rdv"><span class="kpi-ic t-navy">${ic('calendar')}</span><p class="kpi-l">RDV fixés</p><p class="kpi-v">${num(stageCount('rdv'))}</p><p class="kpi-d">${rdvWeek} cette semaine</p></a>
        <a class="kpi" href="#/crm?f=devis"><span class="kpi-ic t-sand">${ic('invoice')}</span><p class="kpi-l">Devis en cours</p><p class="kpi-v">${num(devis.length)}</p><p class="kpi-d">${eur(devisSum)} en jeu</p></a>
        <a class="kpi" href="#/crm?f=signe"><span class="kpi-ic t-olive">${ic('euro')}</span><p class="kpi-l">Signé ce mois</p><p class="kpi-v">${eur(signedMonth)}</p><p class="kpi-d">objectif ${eur(g.caMois)}</p></a>
      </section>

      <section class="card chart-card rise" style="--i:3">
        <header class="card-h"><div><h2>Activité</h2><p>Appels des 7 derniers jours</p></div><button class="chip-btn" data-act="toggle-table" aria-pressed="false">Tableau</button></header>
        <ul class="legend"><li><i class="sw s-pos"></i>Réponses positives</li><li><i class="sw s-oth"></i>Autres appels</li></ul>
        <div class="chart" id="chart-activity" data-label="Appels par jour sur 7 jours"></div>
        <table class="ch-table" hidden><thead><tr><th>Jour</th><th>Positives</th><th>Autres</th><th>Total</th></tr></thead><tbody>
          ${activityData().map((d) => `<tr><td>${d.full}</td><td>${d.values[0]}</td><td>${d.values[1]}</td><td>${d.values[0] + d.values[1]}</td></tr>`).join('')}
        </tbody></table>
      </section>

      <section class="card todo rise" style="--i:4">
        <header class="card-h"><div><h2>À faire aujourd'hui</h2><p>${todo.length ? `${todo.length} tâche${todo.length > 1 ? 's' : ''}` : 'Rien d\'urgent'}</p></div><a class="link" href="#/agenda">Agenda</a></header>
        ${todo.length ? `<ul class="tasks">${todo.map((t) => {
          const late = t.due < t0;
          const pr = t.prospectId && s.prospects.find((x) => x.id === t.prospectId);
          return `<li class="task"><button class="tick" data-act="task-toggle" data-id="${t.id}" aria-label="Marquer comme fait"></button>
            <div class="task-b"><p class="task-t">${esc(t.title)}</p><p class="task-m ${late ? 'is-late' : ''}">${late ? 'En retard · ' : ''}${when(t.due)}${pr ? ` · <a href="#/fiche/${pr.id}">${esc(pr.entreprise)}</a>` : ''}</p></div></li>`;
        }).join('')}</ul>` : `<p class="muted pad">Votre liste est vide pour aujourd'hui. Ajoutez une relance depuis une fiche ou l'agenda.</p>`}
      </section>

      <section class="card next rise" style="--i:5">
        <header class="card-h"><div><h2>Script conseillé</h2><p>${next ? `Pour votre prochain appel : ${esc(next.entreprise)}` : 'Pour démarrer'}</p></div></header>
        <a class="script-row" href="#/script/${sc.id}${next && crm ? `?p=${next.id}` : ''}">
          <span class="sec-ic">${ic(nextSec.icon)}</span>
          <span class="script-row-b"><b>${esc(sc.title)}</b><span>${esc(nextSec.name)} · ${SERVICES[nextSvc].short}</span></span>${ic('chevR', 'chev')}
        </a>
        <div class="tip"><p class="tip-k">Conseil du jour</p><p>${esc(tip)}</p></div>
      </section>

      <section class="card funnel rise" style="--i:6">
        <header class="card-h"><div><h2>Votre entonnoir</h2><p>30 derniers jours</p></div>${can('stats') ? '<a class="link" href="#/outils/stats">Statistiques</a>' : ''}</header>
        <ul class="fun">${funnel.map(([l, v], i) => `<li><span class="fun-l">${l}</span><span class="fun-b"><i style="width:${Math.max(v ? 1.5 : 0, (v / fmax) * 100)}%"></i></span><b class="fun-v">${num(v)}</b>${i ? `<span class="fun-p">${funnel[i - 1][1] ? Math.round((v / funnel[i - 1][1]) * 100) : 0} %</span>` : '<span class="fun-p"></span>'}</li>`).join('')}</ul>
      </section>

      <section class="card recent rise" style="--i:7">
        <header class="card-h"><div><h2>Derniers prospects</h2><p>Mis à jour récemment</p></div><a class="link" href="#/crm?v=list">Tout voir</a></header>
        ${recent.length ? `<ul class="rows">${recent.map((x) => {
          const sec = getSector(x.secteur);
          return `<li><a class="row" href="#/fiche/${x.id}">${avatar(x.entreprise)}<span class="row-b"><b>${esc(x.entreprise)}</b><span>${esc(sec?.name || '')}${x.ville ? ' · ' + esc(x.ville) : ''} · ${ago(x.updatedAt)}</span></span>${stageChip(x.stage)}</a></li>`;
        }).join('')}</ul>` : `<p class="muted pad">Aucun prospect pour l'instant.</p><a class="btn btn-ghost btn-block" href="#/crm?new=1">${ic('plus')}<span>Ajouter un prospect</span></a>`}
      </section>
    </div>

    <section class="quick rise" style="--i:8">
      <h2 class="sec-title">Scripts par secteur</h2>
      <div class="sec-grid sec-grid-sm">
        ${['fleuriste', 'restaurant', 'coiffeur', 'garage', 'boulangerie', 'toute'].map((id) => sectorTile(getSector(id), `#/scripts/${id}`)).join('')}
      </div>
    </section>
  </div>`;

  return {
    title: 'Accueil', tab: 'accueil', html,
    after(root) {
      const host = root.querySelector('#chart-activity');
      if (host) return stackedBars(host, { data: activityData(), series: [{ name: 'Réponses positives', cls: 's-pos' }, { name: 'Autres appels', cls: 's-oth' }], highlight: 6, fmt: (v) => num(Math.round(v)) });
    },
  };
}

register({
  'toggle-table': (b) => {
    const card = b.closest('.card');
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', on);
    b.textContent = on ? 'Graphique' : 'Tableau';
    card.querySelector('.ch-table').hidden = !on;
    card.querySelector('.chart').hidden = on;
    card.querySelector('.legend').hidden = on;
  },
  'clear-demo': async () => {
    const ok = await confirmSheet({ title: 'Effacer les exemples ?', text: 'Les entreprises, appels et tâches d\'exemple seront supprimés. Ce que vous avez ajouté vous-même est conservé.', ok: 'Effacer', danger: true });
    if (!ok) return;
    update((s) => clearDemo(s));
    toast('Exemples effacés');
  },
});
