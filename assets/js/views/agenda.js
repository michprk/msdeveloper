// Agenda (tâches, rappels, rendez-vous) et suivi des projets signés.
import { S, can, startOfDay, DAY, update, getProspect, PROJECT_STEPS, toggleTask, deleteTask } from '../store.js';
import { ic, esc, register, when, time, dateDay, bar, toast, confirmSheet, sheet, sheetHead, closeSheet, field, input, select, dateShort } from '../ui.js';
import { SERVICES } from '../data/scripts.js';
import { pageHead, paywall } from './common.js';
import { taskSheet } from './crm.js';

const KIND = { appel: ['phone', 'Appel'], relance: ['refresh', 'Relance'], rdv: ['calendar', 'Rendez-vous'], tache: ['check', 'Tâche'] };
let selDay = null;

const taskItem = (t, s) => {
  const p = t.prospectId && s.prospects.find((x) => x.id === t.prospectId);
  const late = !t.done && t.due && t.due < Date.now();
  return `<li class="task ${t.done ? 'is-done' : ''}">
    <button class="tick ${t.done ? 'is-done' : ''}" data-act="task-toggle" data-id="${t.id}" aria-label="${t.done ? 'Marquer à faire' : 'Marquer comme fait'}"></button>
    <div class="task-b"><p class="task-t">${esc(t.title)}</p>
      <p class="task-m ${late ? 'is-late' : ''}"><span class="kind">${ic(KIND[t.kind]?.[0] || 'check')}${KIND[t.kind]?.[1] || ''}</span>${t.due ? ` · ${when(t.due)}` : ''}${p ? ` · <a href="#/fiche/${p.id}">${esc(p.entreprise)}</a>` : ''}</p></div>
    <button class="icon-btn sm" data-act="task-edit" data-id="${t.id}" aria-label="Modifier">${ic('edit')}</button>
  </li>`;
};

export function agenda(params, q) {
  if (!can('agenda')) return { title: 'Agenda', tab: 'agenda', html: `${pageHead('Agenda', { kicker: 'Rappels, rendez-vous et relances' })}${paywall('agenda')}` };
  const s = S();
  const t0 = startOfDay();
  if (selDay === null || q.reset) selDay = t0;
  // Bande de 14 jours à partir du lundi de la semaine
  const monday = t0 - ((new Date(t0).getDay() + 6) % 7) * DAY;
  const days = Array.from({ length: 14 }, (_, i) => monday + i * DAY);
  const open = s.tasks.filter((t) => !t.done);
  const countOn = (d) => open.filter((t) => t.due >= d && t.due < d + DAY).length;
  const late = open.filter((t) => t.due && t.due < t0).sort((a, b) => a.due - b.due);
  const dayTasks = open.filter((t) => t.due >= selDay && t.due < selDay + DAY).sort((a, b) => a.due - b.due);
  const later = open.filter((t) => !t.due || t.due >= selDay + DAY).sort((a, b) => (a.due || 9e15) - (b.due || 9e15)).slice(0, 30);
  const done = s.tasks.filter((t) => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 12);
  const selLabel = selDay === t0 ? 'Aujourd\'hui' : selDay === t0 + DAY ? 'Demain' : dateDay(selDay);
  const html = `
    ${pageHead('Agenda', { kicker: `${open.length} tâche${open.length > 1 ? 's' : ''} ouverte${open.length > 1 ? 's' : ''}`, actions: `<button class="btn btn-primary" data-act="task-new">${ic('plus')}<span>Tâche</span></button>` })}
    ${open.length && 'Notification' in window && Notification.permission === 'default' && s.prefs.notifs !== false ? `<section class="card notif-cta rise"><span class="feat-ic f-blue">${ic('bell')}</span><div><b>Recevoir un rappel avant chaque tâche ?</b><p>Une notification 10 minutes avant, avec le script prêt.</p></div><button class="btn btn-primary btn-sm" data-act="notif-ask-sheet">Activer</button></section>` : ''}
    ${!s.tasks.length ? `<div class="empty card"><span class="empty-ic">${ic('calendar')}</span><p class="empty-t">Votre agenda est vide</p><p class="empty-p">Quand un prospect dit « rappelez-moi » ou accepte un rendez-vous, le mode appel crée la tâche ici, avec la date et le prospect. Vous pouvez aussi en ajouter une à la main.</p><div class="end-a"><button class="btn btn-primary" data-act="task-new">${ic('plus')}<span>Ajouter une tâche</span></button><a class="btn btn-ghost" href="#/appel">${ic('phone')}<span>Lancer des appels</span></a></div></div>` : ''}
    <div class="days" role="tablist" aria-label="Jours">${days.map((d) => {
      const dt = new Date(d), n = countOn(d);
      return `<button class="day ${d === selDay ? 'is-on' : ''} ${d === t0 ? 'is-today' : ''}" role="tab" aria-selected="${d === selDay}" data-act="day" data-d="${d}">
        <span>${['di', 'lu', 'ma', 'me', 'je', 've', 'sa'][dt.getDay()]}</span><b>${dt.getDate()}</b><i class="${n ? 'has' : ''}">${n > 1 ? n : ''}</i></button>`;
    }).join('')}</div>
    ${late.length ? `<section class="card rise"><header class="card-h"><div><h2 class="is-late">En retard</h2><p>${late.length} tâche${late.length > 1 ? 's' : ''}</p></div></header><ul class="tasks">${late.map((t) => taskItem(t, s)).join('')}</ul></section>` : ''}
    <section class="card rise"><header class="card-h"><div><h2>${selLabel}</h2><p>${dayTasks.length ? `${dayTasks.length} prévue${dayTasks.length > 1 ? 's' : ''}` : 'Rien de prévu'}</p></div></header>
      ${dayTasks.length ? `<ul class="tasks">${dayTasks.map((t) => taskItem(t, s)).join('')}</ul>` : '<p class="muted pad">Journée libre : c\'est le moment d\'une session d\'appels.</p>'}</section>
    ${later.length ? `<section class="card rise"><header class="card-h"><div><h2>Ensuite</h2></div></header><ul class="tasks">${later.map((t) => taskItem(t, s)).join('')}</ul></section>` : ''}
    ${done.length ? `<details class="card rise done-box"><summary><h2>Terminées</h2>${ic('chevD', 'chev')}</summary><ul class="tasks">${done.map((t) => taskItem(t, s)).join('')}</ul></details>` : ''}`;
  return { title: 'Agenda', tab: 'agenda', html };
}

// ---------- Projets ----------
export function projects() {
  if (!can('projects')) return { title: 'Projets', tab: 'plus', html: `${pageHead('Projets', { kicker: 'Clients signés en production' })}${paywall('projects')}` };
  const s = S();
  const list = [...s.projects].sort((a, b) => a.start + a.days * DAY - (b.start + b.days * DAY));
  const html = `
    ${pageHead('Projets', { kicker: `${list.length} projet${list.length > 1 ? 's' : ''} en cours`, back: '#/plus' })}
    <p class="lead">Chaque prospect passé en « Signé » devient un projet, avec son délai et ses étapes.</p>
    ${list.length ? `<div class="proj-grid">${list.map((pr, i) => {
      const end = pr.start + pr.days * DAY;
      const left = Math.ceil((end - Date.now()) / DAY);
      const pct = Math.round((pr.done.length / PROJECT_STEPS.length) * 100);
      const p = getProspect(pr.prospectId);
      return `<section class="card proj rise" style="--i:${i}">
        <header class="card-h"><div><h2>${esc(pr.name)}</h2><p>${SERVICES[pr.service]?.label || ''} · démarré le ${dateShort(pr.start)}</p></div>
          <span class="chip ${left < 0 ? 't-rose' : left <= 5 ? 't-sand' : 't-olive'}">${left < 0 ? `${-left} j de retard` : left === 0 ? 'Livraison aujourd\'hui' : `J−${left}`}</span></header>
        <div class="proj-p"><span>${pct} %</span>${bar(pr.done.length, PROJECT_STEPS.length, 'olive')}</div>
        <ul class="proj-steps">${PROJECT_STEPS.map((st, k) => `<li><button class="pstep ${pr.done.includes(k) ? 'is-done' : ''}" data-act="pstep" data-id="${pr.id}" data-k="${k}" aria-pressed="${pr.done.includes(k)}"><span class="tick ${pr.done.includes(k) ? 'is-done' : ''}"></span>${st}</button></li>`).join('')}</ul>
        <footer class="proj-f">${p ? `<a class="link" href="#/fiche/${p.id}">Fiche client</a>` : ''}<button class="link" data-act="proj-edit" data-id="${pr.id}">Délai</button><button class="link danger" data-act="proj-del" data-id="${pr.id}">Retirer</button></footer>
      </section>`;
    }).join('')}</div>` : `<div class="empty"><span class="empty-ic">${ic('folder')}</span><p class="empty-t">Aucun projet</p><p class="empty-p">Passez un prospect en « Signé » dans le CRM : le projet apparaît ici automatiquement.</p><a class="btn btn-primary" href="#/crm">Ouvrir le CRM</a></div>`}`;
  return { title: 'Projets', tab: 'plus', html };
}

register({
  day: (b) => { selDay = +b.dataset.d; window.dispatchEvent(new Event('ms:rerender')); },
  'task-edit': (b) => taskSheet({ task: S().tasks.find((t) => t.id === b.dataset.id) }),
  pstep: (b) => update((s) => {
    const pr = s.projects.find((x) => x.id === b.dataset.id); const k = +b.dataset.k;
    pr.done = pr.done.includes(k) ? pr.done.filter((x) => x !== k) : [...pr.done, k];
  }),
  'proj-edit': (b) => {
    const pr = S().projects.find((x) => x.id === b.dataset.id);
    sheet(`${sheetHead('Délai du projet', esc(pr.name))}<form class="sheet-body form" data-form="proj" data-id="${pr.id}">${field('Durée (jours)', input('days', pr.days, 'type="number" min="1" max="365" required'))}<button class="btn btn-primary btn-block">Enregistrer</button></form>`, { cls: 'sheet-sm' });
  },
  'proj-del': async (b) => {
    if (!await confirmSheet({ title: 'Retirer ce projet ?', text: 'La fiche client est conservée.', ok: 'Retirer', danger: true })) return;
    update((s) => { s.projects = s.projects.filter((x) => x.id !== b.dataset.id); });
  },
}, {
  proj: (data, f) => { update((s) => { s.projects.find((x) => x.id === f.dataset.id).days = Number(data.days) || 21; }); closeSheet(); },
});
export { toggleTask, deleteTask, time };
