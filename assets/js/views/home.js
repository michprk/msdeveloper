// Aujourd'hui : d'abord la journée (tâches du jour, saisie rapide), puis des cartes plus
// discrètes selon les modules utilisés (relances, appels, notes, quiz). Uniquement les
// données de l'utilisateur ; des états vides qui expliquent quoi faire.
import { S, update, on, can, calls, signedValue, startOfDay, startOfWeek, startOfMonth, DAY, stageOf } from '../store.js';
import { ic, esc, eur, num, dateLong, when, ring, bar, avatar, ago, register, toast, confirmSheet } from '../ui.js';
import { logoMark } from '../icons.js';
import { trialStrip } from './common.js';
import { clearDemo } from '../data/demo.js';
import { cluster } from './flowers.js';
import { taskRow, quickAdd } from './tasks.js';
import { dailyQuiz } from './quiz.js';
import { noun } from './crm.js';

export function nextToCall(s) {
  const t1 = startOfDay() + DAY;
  const rank = (p) => (p.stage === 'rappeler' ? (p.next?.due && p.next.due < t1 ? 0 : 2) : 1);
  const queue = s.prospects.filter((p) => p.stage === 'rappeler' || p.stage === 'a_appeler')
    .sort((a, b) => rank(a) - rank(b) || (a.next?.due || 9e15) - (b.next?.due || 9e15) || a.createdAt - b.createdAt);
  return { queue, next: queue[0] };
}

export function home() {
  const s = S(), p = s.profile, g = s.goals;
  const t0 = startOfDay(), t1 = t0 + DAY;
  const org = on('organiser'), cli = on('clients'), pro = on('prospecter'), app = on('apprendre');
  const today = s.tasks.filter((t) => !t.done && t.due && t.due < t1).sort((a, b) => (b.prio || 0) - (a.prio || 0) || a.due - b.due);
  const doneToday = s.tasks.filter((t) => t.done && t.doneAt >= t0 && t.due && t.due < t1).length;
  const late = today.filter((t) => t.due < t0).length;
  const total = today.length + doneToday;
  const nextTimed = today.find((t) => t.due >= Date.now() && (new Date(t.due).getHours() || new Date(t.due).getMinutes()));
  const followUps = s.prospects.filter((x) => x.next?.due && x.next.due < t1 && !['signe', 'perdu'].includes(x.stage)).sort((a, b) => a.next.due - b.next.due);
  const openDeals = s.prospects.filter((x) => !['signe', 'perdu'].includes(x.stage)).length;
  const callsToday = calls(t0).length;
  const { queue } = nextToCall(s);
  const week = calls(startOfWeek());
  const weekRdv = week.filter((a) => a.outcome === 'rdv').length;
  const signedMonth = signedValue(startOfMonth());
  const pages = [...s.pages].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);
  const quiz = dailyQuiz();
  const qr = s.quiz.results[quiz.id];
  const qDone = qr && qr.at >= t0;
  const hasDemo = s.prospects.some((x) => x.demo);

  // Premiers pas, selon les modules choisis ; disparaît une fois tout fait
  const steps = [
    ...(org ? [['Ajouter votre première tâche', 'Écrivez-la comme vous la diriez : « Envoyer le devis vendredi ».', s.tasks.length > 0, '#/taches'], ['Créer votre première page', 'Un compte rendu, un projet, une liste d\'idées : partez d\'un modèle.', s.pages.length > 0, '#/notes']] : []),
    ...(cli ? [['Adapter le CRM à votre métier', 'Des étapes et des champs prêts pour votre activité.', !!s.crm.preset || s.crm.extra.length > 0, '#/crm/personnaliser'], ['Ajouter votre première fiche', 'Un client, un prospect : une par une, ou en collant une liste.', s.prospects.length > 0, '#/crm?new=1']] : []),
    ...(pro ? [['Lire le script de votre secteur', 'Le bon discours, adapté au métier de la personne appelée.', s.recent.length > 0, '#/scripts']] : []),
    ...(app ? [['Faire votre premier quiz', 'Dix questions, chacune expliquée.', Object.keys(s.quiz.results).length > 0, `#/quiz/${quiz.id}?restart=1`]] : []),
  ].slice(0, 5);
  const doneSteps = steps.filter((x) => x[2]).length;

  const heroTitle = !total ? 'Journée libre' : today.length ? `${num(today.length)} chose${today.length > 1 ? 's' : ''} à faire` : 'Tout est fait';
  const heroSub = !total ? 'Rien n\'est prévu aujourd\'hui. Ajoutez une tâche, ou avancez sur un projet.'
    : today.length ? [late ? `dont ${late} en retard` : '', nextTimed ? `prochaine : ${esc(nextTimed.title)} à ${when(nextTimed.due).split('· ')[1] || ''}` : ''].filter(Boolean).join(' · ') || 'Cochez au fil de la journée.'
      : `${doneToday} tâche${doneToday > 1 ? 's' : ''} terminée${doneToday > 1 ? 's' : ''} aujourd'hui. Bravo.`;

  const html = `
  <div class="home">
    <div class="m-top">
      <a class="m-brand" href="#/" aria-label="M&amp;S Developer">${logoMark('sm')}<span><b>M&amp;S</b> Developer</span></a>
      <div class="m-acts"><button class="icon-btn" data-act="search" aria-label="Rechercher">${ic('search')}</button><a class="m-avatar" href="#/reglages" aria-label="Compte et réglages">${avatar(p.prenom || 'M S')}</a></div>
    </div>
    <header class="ph ph-home">
      <p class="ph-k">${dateLong()}</p>
      <h1 class="ph-t">Bonjour${p.prenom ? ' ' + esc(p.prenom) : ''}</h1>
      ${cluster('home-cl')}
    </header>
    ${trialStrip()}
    ${hasDemo ? `<div class="note-demo rise">${ic('note')}<span><b>Données de démonstration.</b> Ces fiches sont fictives.</span><button class="link" data-act="clear-demo">Effacer</button></div>` : ''}
    <div class="dash">
      <section class="card day-card rise" style="--i:1" aria-label="Aujourd'hui">
        <div class="day-top">
          <div><p class="day-k">Aujourd'hui</p><h2>${heroTitle}</h2><p class="day-sub">${heroSub}</p></div>
          ${total ? `<div class="hero-ring sm">${ring(doneToday, total, { size: 74, stroke: 7 })}<div class="hero-ring-v"><b>${doneToday}</b><span>/${total}</span></div></div>` : ''}
        </div>
        ${quickAdd({ due: String(t0), placeholder: 'Ajouter une tâche' })}
        ${today.length ? `<ul class="tasks">${today.slice(0, 7).map((t) => taskRow(t)).join('')}</ul>${today.length > 7 ? `<a class="link" href="#/taches">Et ${today.length - 7} autre${today.length - 7 > 1 ? 's' : ''}…</a>` : ''}` : ''}
        <footer class="day-f"><a class="link" href="#/taches">${ic('tasks')}Toutes les tâches</a><a class="link" href="#/agenda">${ic('calendar')}Agenda</a></footer>
      </section>

      ${steps.length && doneSteps < steps.length && !s.prefs.hideStart ? `<section class="card start rise" style="--i:2">
        <header class="card-h"><div><h2>Pour bien démarrer</h2><p>${doneSteps} sur ${steps.length} · <button class="link" data-act="hide-start">Masquer</button></p></div><span class="start-n">${Math.round((doneSteps / steps.length) * 100)} %</span></header>
        ${bar(doneSteps, steps.length, 'olive')}
        <ol class="start-l">${steps.map(([t, d, ok, href]) => `<li class="${ok ? 'is-done' : ''}"><a href="${href}"><span class="tick ${ok ? 'is-done' : ''}"></span><span><b>${t}</b><em>${d}</em></span>${ok ? '' : ic('chevR', 'chev')}</a></li>`).join('')}</ol>
      </section>` : ''}

      <div class="dash-side">
        ${cli ? `<section class="card side-card rise" style="--i:2">
          <header class="card-h"><div><h2>À relancer</h2><p>${followUps.length ? `${followUps.length} aujourd'hui` : `${num(openDeals)} fiche${openDeals > 1 ? 's' : ''} en cours`}</p></div><a class="link" href="#/crm">${esc(noun())}</a></header>
          ${followUps.length ? `<ul class="rows">${followUps.slice(0, 4).map((x) => `<li><a class="row" href="#/fiche/${x.id}">${avatar(x.entreprise)}<span class="row-b"><b>${esc(x.entreprise)}</b><span class="${x.next.due < t0 ? 'is-late' : ''}">${esc(x.next.label || stageOf(x.stage).label)} · ${when(x.next.due)}</span></span>${ic('chevR', 'chev')}</a></li>`).join('')}</ul>`
            : `<div class="mini-empty">${ic('users')}<p>${s.prospects.length ? 'Aucune relance prévue aujourd\'hui. Chaque fiche peut avoir sa prochaine action datée.' : 'Vos clients et prospects apparaîtront ici le jour où il faut les relancer.'}</p></div>${s.prospects.length ? '' : `<div class="act-row"><a class="btn btn-ghost btn-sm" href="#/crm?new=1">${ic('plus')}<span>Ajouter une fiche</span></a></div>`}`}
        </section>` : ''}
        ${pro ? `<section class="card side-card calls-card rise" style="--i:3">
          <div class="calls-top"><div class="hero-ring sm">${ring(callsToday, g.appelsJour, { size: 64, stroke: 6 })}<div class="hero-ring-v"><b>${callsToday}</b></div></div>
            <div><h2>Appels</h2><p>${callsToday ? `${callsToday} sur ${g.appelsJour} aujourd'hui` : `Objectif : ${g.appelsJour} par jour`} · ${queue.length} à appeler</p></div></div>
          <a class="btn ${queue.length ? 'btn-primary' : 'btn-ghost'} btn-block" href="${queue.length && can('callMode') ? '#/appel' : queue.length ? '#/scripts' : '#/crm?new=1'}">${ic(queue.length ? 'phone' : 'plus')}<span>${queue.length && can('callMode') ? 'Lancer une session d\'appels' : queue.length ? 'Lire les scripts' : 'Ajouter des fiches à appeler'}</span></a>
        </section>` : ''}
        ${org ? `<section class="card side-card rise" style="--i:4">
          <header class="card-h"><div><h2>Notes récentes</h2><p>${s.pages.length ? `${s.pages.length} page${s.pages.length > 1 ? 's' : ''}` : 'Aucune page pour l\'instant'}</p></div><button class="link" data-act="page-new" data-tpl="vierge">${ic('plus')}Page</button></header>
          ${pages.length ? `<ul class="rows">${pages.map((x) => `<li><a class="row" href="#/note/${x.id}"><span class="menu-ic">${ic(x.icon || 'page')}</span><span class="row-b"><b>${esc(x.title || 'Sans titre')}</b><span>${ago(x.updatedAt)}</span></span>${ic('chevR', 'chev')}</a></li>`).join('')}</ul>`
            : `<div class="mini-empty">${ic('page')}<p>Comptes rendus, projets, idées : vos pages se rangent ici, avec des sous-pages si besoin.</p></div><div class="act-row"><button class="btn btn-ghost btn-sm" data-act="page-new" data-tpl="journal">${ic('sun')}<span>Journal du jour</span></button><button class="btn btn-ghost btn-sm" data-act="page-templates">${ic('layers')}<span>Modèles</span></button></div>`}
        </section>` : ''}
        ${app ? `<a class="card side-card quiz-card rise" style="--i:5" href="#/quiz/${quiz.id}?restart=1">
          <span class="qz-ic">${ic(quiz.icon)}</span>
          <span class="row-b"><span class="day-k">Quiz du jour</span><b>${esc(quiz.title)}</b><span>${qDone ? `Fait : ${qr.last} %` : `${quiz.qs.length} questions · 4 min`}</span></span>${ic('chevR', 'chev')}
        </a>` : ''}
      </div>

      ${(cli || pro) && (week.length || signedMonth || s.prospects.length) ? `<section class="week rise" style="--i:6" aria-label="Votre semaine">
        ${pro ? `<a class="kpi" href="#/outils/stats"><p class="kpi-l">Appels cette semaine</p><p class="kpi-v">${num(week.length)}</p>${bar(week.length, g.appelsJour * 5)}<p class="kpi-d">objectif ${num(g.appelsJour * 5)}</p></a>
        <a class="kpi" href="#/crm?v=list&f=rdv"><p class="kpi-l">${esc(stageOf('rdv').label)}</p><p class="kpi-v">${num(weekRdv)}</p>${bar(weekRdv, g.rdvSemaine, 'navy')}<p class="kpi-d">cette semaine · objectif ${num(g.rdvSemaine)}</p></a>` : `<a class="kpi" href="#/crm"><p class="kpi-l">Fiches en cours</p><p class="kpi-v">${num(openDeals)}</p><p class="kpi-d">${esc(noun().toLowerCase())}</p></a>`}
        <a class="kpi" href="#/crm?v=list&f=signe"><p class="kpi-l">${esc(stageOf('signe').label)} ce mois</p><p class="kpi-v">${eur(signedMonth)}</p>${bar(signedMonth, g.caMois, 'olive')}<p class="kpi-d">objectif ${eur(g.caMois)}</p></a>
      </section>` : ''}
    </div>
  </div>`;

  return { title: 'Aujourd\'hui', tab: 'accueil', html };
}

register({
  'hide-start': () => { update((s) => { s.prefs.hideStart = true; }); toast('« Pour bien démarrer » n\'apparaîtra plus.', { title: 'Liste masquée', action: 'Annuler', onAction: () => update((s) => { s.prefs.hideStart = false; }) }); },
  'clear-demo': async () => {
    const ok = await confirmSheet({ title: 'Effacer les données de démonstration ?', text: 'Les fiches, appels et tâches fictifs seront supprimés. Ce que vous avez ajouté vous-même est conservé.', ok: 'Effacer', danger: true });
    if (!ok) return;
    update((s) => clearDemo(s));
    toast('Données de démonstration effacées');
  },
});
export { toast };
