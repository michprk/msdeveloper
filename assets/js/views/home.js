// Aujourd'hui : l'objectif d'appels et la prochaine action d'abord, puis la semaine.
// Uniquement les données de l'utilisateur ; des états vides qui expliquent quoi faire.
import { S, update, calls, signedValue, startOfDay, startOfWeek, startOfMonth, DAY, can } from '../store.js';
import { ic, esc, eur, num, dateLong, when, ring, bar, stageChip, avatar, ago, register, toast, confirmSheet } from '../ui.js';
import { logoMark } from '../icons.js';
import { SERVICES, getSector, buildScript } from '../data/scripts.js';
import { stackedBars } from '../charts.js';
import { trialStrip } from './common.js';
import { clearDemo } from '../data/demo.js';
import { cluster } from './flowers.js';

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

export function nextToCall(s) {
  const t1 = startOfDay() + DAY;
  const rank = (p) => (p.stage === 'rappeler' ? (p.next?.due && p.next.due < t1 ? 0 : 2) : 1);
  const queue = s.prospects.filter((p) => p.stage === 'rappeler' || p.stage === 'a_appeler')
    .sort((a, b) => rank(a) - rank(b) || (a.next?.due || 9e15) - (b.next?.due || 9e15) || a.createdAt - b.createdAt);
  return { queue, next: queue[0] };
}

export function home() {
  const s = S(), p = s.profile, g = s.goals;
  const t0 = startOfDay(), w0 = startOfWeek(), m0 = startOfMonth();
  const today = calls(t0).length;
  const week = calls(w0);
  const weekRdv = week.filter((a) => a.outcome === 'rdv').length;
  const signedMonth = signedValue(m0);
  const left = Math.max(0, g.appelsJour - today);
  const hasDemo = s.prospects.some((x) => x.demo);
  const { queue, next } = nextToCall(s);
  const nextSec = next ? getSector(next.secteur) || getSector('toute') : null;
  const sc = next ? buildScript(next.service || p.service || 'site', 'appel', nextSec.id) : null;
  const todo = s.tasks.filter((t) => !t.done && t.due && t.due < t0 + DAY).sort((a, b) => a.due - b.due).slice(0, 5);
  const recent = [...s.prospects].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);
  const any7 = activityData().some((d) => d.values[0] + d.values[1] > 0);

  // Premiers pas : disparaît une fois tout fait
  const steps = [
    ['Compléter votre profil', 'Votre prénom et votre société remplissent les scripts.', !!(p.prenom && p.societe), '#/reglages'],
    ['Ajouter vos premiers prospects', 'Un par un, ou en collant une liste depuis un tableur.', s.prospects.length > 0, '#/crm?new=1'],
    ['Lire le script de votre secteur', 'Le bon discours, adapté au métier de vos prospects.', s.recent.length > 0, '#/scripts'],
    ['Faire votre première session d\'appels', 'Le script s\'affiche, le résultat s\'enregistre en un geste.', s.activities.some((a) => a.type === 'appel'), '#/appel'],
  ];
  const doneSteps = steps.filter((x) => x[2]).length;

  const html = `
  <div class="home">
    <div class="m-top">
      <a class="m-brand" href="#/" aria-label="M&amp;S Developer">${logoMark('sm')}<span><b>M&amp;S</b> Developer</span></a>
      <a class="m-avatar" href="#/reglages" aria-label="Compte et réglages">${avatar(p.prenom || 'M S')}</a>
    </div>
    <header class="ph ph-home">
      <p class="ph-k">${dateLong()}</p>
      <h1 class="ph-t">Bonjour${p.prenom ? ' ' + esc(p.prenom) : ''}</h1>
      ${cluster('home-cl')}
    </header>
    ${trialStrip()}
    ${hasDemo ? `<div class="note-demo rise">${ic('note')}<span><b>Données de démonstration.</b> Ces entreprises sont fictives.</span><button class="link" data-act="clear-demo">Effacer</button></div>` : ''}
    ${doneSteps < steps.length && !s.prefs.hideStart ? `<section class="card start rise">
      <header class="card-h"><div><h2>Pour bien démarrer</h2><p>${doneSteps} sur ${steps.length} · environ 10 minutes · <button class="link" data-act="hide-start">Masquer</button></p></div><span class="start-n">${Math.round((doneSteps / steps.length) * 100)} %</span></header>
      ${bar(doneSteps, steps.length, 'olive')}
      <ol class="start-l">${steps.map(([t, d, ok, href]) => `<li class="${ok ? 'is-done' : ''}"><a href="${href}"><span class="tick ${ok ? 'is-done' : ''}"></span><span><b>${t}</b><em>${d}</em></span>${ok ? '' : ic('chevR', 'chev')}</a></li>`).join('')}</ol>
    </section>` : ''}

    <div class="dash">
      <section class="card today rise" style="--i:1" aria-label="Aujourd'hui">
        <div class="today-top">
          <div class="hero-ring">${ring(today, g.appelsJour, { size: 128, stroke: 11, cls: 'on-navy' })}<div class="hero-ring-v"><b>${num(today)}</b><span>sur ${num(g.appelsJour)} appels</span></div></div>
          <div class="today-txt">
            <p class="hero-k">Aujourd'hui</p>
            <h2>${today === 0 ? 'Prêt pour la première session ?' : left ? `Encore ${num(left)} appel${left > 1 ? 's' : ''}` : 'Objectif atteint'}</h2>
            <p>${queue.length ? `${num(queue.length)} prospect${queue.length > 1 ? 's' : ''} à appeler${queue.filter((x) => x.stage === 'rappeler').length ? `, dont ${queue.filter((x) => x.stage === 'rappeler').length} à rappeler` : ''}.` : 'Aucun prospect à appeler pour l\'instant.'}</p>
          </div>
        </div>
        ${next ? `<a class="today-next" href="#/fiche/${next.id}"><span class="today-next-k">Prochain appel</span><b>${esc(next.entreprise)}</b><span>${esc(nextSec.name)}${next.ville ? ' · ' + esc(next.ville) : ''}${next.next?.label ? ' · ' + esc(next.next.label) : ''}</span></a>` : ''}
        <div class="today-a">
          ${queue.length && can('callMode') ? `<a class="btn btn-sky btn-lg" href="#/appel">${ic('phone')}<span>Appeler maintenant</span></a>`
            : queue.length ? `<a class="btn btn-sky btn-lg" href="#/script/${sc.id}">${ic('script')}<span>Lire le script</span></a>`
            : `<a class="btn btn-sky btn-lg" href="#/crm?new=1">${ic('plus')}<span>Ajouter des prospects</span></a>`}
          ${sc ? `<a class="today-sc" href="#/script/${sc.id}?p=${next.id}">${ic('script')}<span>Script prêt : ${esc(sc.title.toLowerCase())}, ${esc(nextSec.name.toLowerCase())}</span></a>` : `<a class="today-sc" href="#/outils/import">${ic('upload')}<span>Ou importer une liste d'entreprises</span></a>`}
        </div>
      </section>

      <section class="card todo rise" style="--i:2">
        <header class="card-h"><div><h2>À faire aujourd'hui</h2><p>${todo.length ? `${todo.length} tâche${todo.length > 1 ? 's' : ''}` : 'Rien d\'urgent'}</p></div><a class="link" href="#/agenda">Agenda</a></header>
        ${todo.length ? `<ul class="tasks">${todo.map((t) => {
          const late = t.due < t0;
          const pr = t.prospectId && s.prospects.find((x) => x.id === t.prospectId);
          return `<li class="task"><button class="tick" data-act="task-toggle" data-id="${t.id}" aria-label="Marquer « ${esc(t.title)} » comme fait"></button>
            <div class="task-b"><p class="task-t">${esc(t.title)}</p><p class="task-m ${late ? 'is-late' : ''}">${late ? 'En retard · ' : ''}${when(t.due)}${pr ? ` · <a href="#/fiche/${pr.id}">${esc(pr.entreprise)}</a>` : ''}</p></div></li>`;
        }).join('')}</ul>` : `<div class="mini-empty">${ic('calendar')}<p>Les rappels et rendez-vous que vous fixez pendant vos appels apparaîtront ici, avec une notification avant chaque échéance.</p></div>`}
      </section>

      <section class="week rise" style="--i:3" aria-label="Votre semaine">
        <a class="kpi big" href="#/outils/stats"><p class="kpi-l">Appels cette semaine</p><p class="kpi-v">${num(week.length)}</p>${bar(week.length, g.appelsJour * 5)}<p class="kpi-d">objectif ${num(g.appelsJour * 5)}</p></a>
        <a class="kpi big" href="#/crm?v=list&f=rdv"><p class="kpi-l">Rendez-vous fixés</p><p class="kpi-v">${num(weekRdv)}</p>${bar(weekRdv, g.rdvSemaine, 'navy')}<p class="kpi-d">cette semaine · objectif ${num(g.rdvSemaine)}</p></a>
        <a class="kpi big" href="#/crm?v=list&f=signe"><p class="kpi-l">Signé ce mois</p><p class="kpi-v">${eur(signedMonth)}</p>${bar(signedMonth, g.caMois, 'olive')}<p class="kpi-d">objectif ${eur(g.caMois)}</p></a>
      </section>

      <section class="card chart-card rise" style="--i:4">
        <header class="card-h"><div><h2>Activité</h2><p>Appels des 7 derniers jours</p></div>${any7 ? '<button class="chip-btn" data-act="toggle-table" aria-pressed="false">Tableau</button>' : ''}</header>
        ${any7 ? `<ul class="legend"><li><i class="sw s-pos"></i>Réponses positives</li><li><i class="sw s-oth"></i>Autres appels</li></ul>
        <div class="chart" id="chart-activity" data-label="Appels par jour sur 7 jours"></div>
        <table class="ch-table tbl" hidden><thead><tr><th>Jour</th><th>Positives</th><th>Autres</th><th>Total</th></tr></thead><tbody>
          ${activityData().map((d) => `<tr><td data-l="Jour">${d.full}</td><td data-l="Positives">${d.values[0]}</td><td data-l="Autres">${d.values[1]}</td><td data-l="Total">${d.values[0] + d.values[1]}</td></tr>`).join('')}
        </tbody></table>` : `<div class="mini-empty">${ic('chart')}<p>Chaque appel enregistré dans le mode appel s'affiche ici, jour par jour, avec les réponses positives en olive.</p></div>`}
      </section>

      <section class="card recent rise" style="--i:5">
        <header class="card-h"><div><h2>Prospects récents</h2><p>${s.prospects.length ? `${num(s.prospects.length)} au total` : 'Aucun pour l\'instant'}</p></div>${s.prospects.length ? '<a class="link" href="#/crm?v=list">Tout voir</a>' : ''}</header>
        ${recent.length ? `<ul class="rows">${recent.map((x) => {
          const sec = getSector(x.secteur);
          return `<li><a class="row" href="#/fiche/${x.id}">${avatar(x.entreprise)}<span class="row-b"><b>${esc(x.entreprise)}</b><span>${esc(sec?.name || '')}${x.ville ? ' · ' + esc(x.ville) : ''} · ${ago(x.updatedAt)}</span></span>${stageChip(x.stage)}</a></li>`;
        }).join('')}</ul>` : `<div class="mini-empty">${ic('users')}<p>Vos fiches prospects apparaîtront ici. Commencez par en ajouter une, ou collez une liste.</p></div><div class="act-row"><a class="btn btn-ghost" href="#/crm?new=1">${ic('plus')}<span>Ajouter</span></a><a class="btn btn-ghost" href="#/outils/import">${ic('upload')}<span>Importer</span></a></div>`}
      </section>
    </div>
  </div>`;

  return {
    title: 'Aujourd\'hui', tab: 'accueil', html,
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
  'hide-start': () => { update((s) => { s.prefs.hideStart = true; }); toast('« Pour bien démarrer » n\'apparaîtra plus.', { title: 'Liste masquée', action: 'Annuler', onAction: () => update((s) => { s.prefs.hideStart = false; }) }); },
  'clear-demo': async () => {
    const ok = await confirmSheet({ title: 'Effacer les données de démonstration ?', text: 'Les entreprises, appels et tâches fictifs seront supprimés. Ce que vous avez ajouté vous-même est conservé.', ok: 'Effacer', danger: true });
    if (!ok) return;
    update((s) => clearDemo(s));
    toast('Données de démonstration effacées');
  },
});
export { toast };
