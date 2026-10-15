// Agenda : vue calendrier des tâches (les projets ont leur propre écran, views/projects.js).
import { S, on, startOfDay, DAY, toggleTask, deleteTask } from '../store.js';
import { ic, register, time, dateDay } from '../ui.js';
import { pageHead } from './common.js';
import { taskRow, viewSeg, quickAdd } from './tasks.js';

let selDay = null;
const taskItem = (t) => taskRow(t);

export function agenda(params, q) {
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
    ${pageHead('Tâches', { kicker: `${open.length} à faire · vue agenda`, actions: `<button class="btn btn-primary fab-dup" data-act="task-new">${ic('plus')}<span>Tâche</span></button>` })}
    ${viewSeg('agenda')}
    ${open.length && 'Notification' in window && Notification.permission === 'default' && s.prefs.notifs !== false ? `<section class="card notif-cta rise"><span class="feat-ic f-blue">${ic('bell')}</span><div><b>Recevoir un rappel avant chaque tâche ?</b><p>Une notification 10 minutes avant chaque tâche à heure fixe.</p></div><button class="btn btn-primary btn-sm" data-act="notif-ask-sheet">Activer</button></section>` : ''}
    ${!s.tasks.length ? `<div class="empty card"><span class="empty-ic">${ic('calendar')}</span><p class="empty-t">Votre agenda est vide</p><p class="empty-p">Chaque tâche datée apparaît ici, jour par jour.${on('prospecter') ? ' Quand quelqu\'un dit « rappelez-moi » pendant un appel, la tâche se crée toute seule.' : ''}</p>
      <div class="demo-preview" aria-hidden="true"><span class="tag">Exemple</span>
        <div class="dp-days">${['lu', 'ma', 'me', 'je', 've'].map((d, k) => `<span class="${k === 3 ? 'on' : ''}"><em>${d}</em><b>${12 + k}</b>${k === 1 || k === 3 ? '<i></i>' : ''}</span>`).join('')}</div>
        <div class="dp-row"><span class="tick"></span><span><b>Rendez-vous comptable</b><em>Jeudi · 9 h 30</em></span></div>
        <div class="dp-row"><span class="tick"></span><span><b>Livrer la commande Lemaire</b><em>Jeudi · 16 h · Travail</em></span></div>
      </div>${quickAdd({ due: String(startOfDay()), placeholder: 'Ajouter une tâche… ex. « Dentiste jeudi 9h »' })}</div>` : ''}
    <div class="days" role="tablist" aria-label="Jours">${days.map((d) => {
      const dt = new Date(d), n = countOn(d);
      return `<button class="day ${d === selDay ? 'is-on' : ''} ${d === t0 ? 'is-today' : ''}" role="tab" aria-selected="${d === selDay}" data-act="day" data-d="${d}">
        <span>${['di', 'lu', 'ma', 'me', 'je', 've', 'sa'][dt.getDay()]}</span><b>${dt.getDate()}</b><i class="${n ? 'has' : ''}">${n > 1 ? n : ''}</i></button>`;
    }).join('')}</div>
    ${late.length ? `<section class="card rise"><header class="card-h"><div><h2 class="is-late">En retard</h2><p>${late.length} tâche${late.length > 1 ? 's' : ''}</p></div></header><ul class="tasks">${late.map(taskItem).join('')}</ul></section>` : ''}
    <section class="card rise"><header class="card-h"><div><h2>${selLabel}</h2><p>${dayTasks.length ? `${dayTasks.length} prévue${dayTasks.length > 1 ? 's' : ''}` : 'Rien de prévu'}</p></div></header>
      ${dayTasks.length ? `<ul class="tasks">${dayTasks.map(taskItem).join('')}</ul>` : `<p class="muted pad">${selDay === t0 ? 'Journée libre.' : 'Rien de prévu ce jour-là.'}</p>`}
      ${quickAdd({ due: String(selDay), placeholder: `Ajouter pour ${selLabel.toLowerCase()}…`, cls: 'qadd-sm' })}</section>
    ${later.length ? `<section class="card rise"><header class="card-h"><div><h2>Ensuite</h2></div></header><ul class="tasks">${later.map(taskItem).join('')}</ul></section>` : ''}
    ${done.length ? `<details class="card rise done-box"><summary><h2>Terminées</h2>${ic('chevD', 'chev')}</summary><ul class="tasks">${done.map(taskItem).join('')}</ul></details>` : ''}`;
  return { title: 'Agenda', tab: 'taches', fab: 'task-new', html };
}

register({
  day: (b) => { selDay = +b.dataset.d; window.dispatchEvent(new Event('ms:rerender')); },
});
export { toggleTask, deleteTask, time };
