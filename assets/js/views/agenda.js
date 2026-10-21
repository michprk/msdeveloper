// Calendrier : vues mois, semaine, jour et liste. On y voit les tâches datées, les échéances
// de projets, les examens et les cours de l'emploi du temps. Semaine, jour et glisser-déposer : Pro.
import { S, on, can, update, startOfDay, startOfWeek, DAY, toggleTask, deleteTask } from '../store.js';
import { ic, esc, register, toast, time, dateDay, dateLong, num } from '../ui.js';
import { pageHead, paywall } from './common.js';
import { taskRow, viewSeg, quickAdd, taskSheet } from './tasks.js';
import { subject } from './studies.js';
import { t as tr } from '../strings.js';

const VIEWS = [['mois', 'Mois'], ['semaine', 'Semaine'], ['jour', 'Jour'], ['liste', 'Liste']];
const WDS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const H = 56; // hauteur d'une heure (semaine, jour)
const mf = new Intl.DateTimeFormat('fr-BE', { month: 'long', year: 'numeric' });
const df = new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'long' });
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const ymd = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const parseDay = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : startOfDay(); };
const addDays = (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); };
const addMonths = (t, n) => { const d = new Date(t); d.setDate(1); d.setMonth(d.getMonth() + n); return d.getTime(); };
const minOf = (t) => { const d = new Date(t); return d.getHours() * 60 + d.getMinutes(); };
const toMin = (hhmm) => { const [h, m] = String(hhmm || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const hm = (min) => `${Math.floor(min / 60)} h${min % 60 ? ` ${String(min % 60).padStart(2, '0')}` : ''}`;
const getView = (q) => { if (VIEWS.some(([k]) => k === q.v)) return q.v; try { return localStorage.getItem('msdev:calv') || 'mois'; } catch (e) { return 'mois'; } };

// Tout ce qui se passe un jour donné
function eventsOn(day, { courses = false } = {}) {
  const s = S(), end = day + DAY, now = Date.now();
  const out = [];
  s.tasks.filter((t) => t.due >= day && t.due < end).forEach((t) => {
    const timed = minOf(t.due) > 0;
    out.push({ kind: 'task', id: t.id, title: t.title, min: timed ? minOf(t.due) : null, dur: 30, done: t.done, late: !t.done && (timed ? t.due < now : end <= startOfDay()), prio: t.prio, tone: t.done ? 'grey' : t.prio === 2 ? 'rose' : 'blue' });
  });
  s.exams.filter((x) => x.date >= day && x.date < end).forEach((x) => out.push({ kind: 'exam', id: x.id, title: x.title, min: minOf(x.date) || null, dur: 120, tone: 'rose', sub: subject(x.subjectId)?.name }));
  s.projects.filter((p) => p.due && p.status !== 'termine' && p.due >= day && p.due < end).forEach((p) => out.push({ kind: 'deadline', id: p.id, title: `Échéance : ${p.name}`, min: null, tone: 'olive' }));
  if (courses && on('etudes')) {
    const wd = (new Date(day).getDay() + 6) % 7;
    s.courses.filter((c) => +c.day === wd).forEach((c) => { const x = subject(c.subjectId); out.push({ kind: 'course', id: c.id, title: x?.name || c.title || 'Cours', min: toMin(c.start), dur: toMin(c.end) - toMin(c.start), tone: x?.tone || 'sky', sub: c.room ? `Salle ${c.room}` : '' }); });
  }
  const order = { exam: 0, deadline: 1, course: 2, task: 3 };
  return out.sort((a, b) => (a.min ?? -1) - (b.min ?? -1) || order[a.kind] - order[b.kind]);
}
const evAttrs = (e) => (e.kind === 'task' ? `data-act="task-open" data-id="${e.id}" data-task="${e.id}"` : e.kind === 'exam' ? `data-act="cal-go" data-h="#/etudes/examens?e=${e.id}"` : e.kind === 'deadline' ? `data-act="cal-go" data-h="#/projet/${e.id}"` : `data-act="course-edit" data-id="${e.id}"`);
const chip = (e) => `<button class="cal-ev k-${e.tone} ev-${e.kind} ${e.done ? 'is-done' : ''} ${e.late ? 'is-late' : ''}" ${evAttrs(e)} draggable="false">${e.min !== null && e.min !== undefined ? `<em>${hm(e.min)}</em>` : e.kind === 'exam' ? ic('target') : e.kind === 'deadline' ? ic('flag') : ''}<span>${esc(e.title)}</span></button>`;

// ---------- Vue mois ----------
function monthView(anchor, sel) {
  const first = new Date(anchor); first.setDate(1);
  const start = startOfWeek(first.getTime());
  const lastDay = addMonths(first.getTime(), 1) - DAY;
  const weeks = Math.ceil((startOfDay(lastDay) - start) / DAY / 7 + 0.0001);
  const t0 = startOfDay();
  const days = Array.from({ length: Math.max(5, weeks) * 7 }, (_, i) => addDays(start, i));
  return `<div class="cal-month" style="--rows:${Math.max(5, weeks)}">
    ${WDS.map((d) => `<p class="cal-wd">${d}</p>`).join('')}
    ${days.map((d) => {
      const ev = eventsOn(d);
      const out = new Date(d).getMonth() !== first.getMonth();
      return `<div class="cal-cell ${out ? 'is-out' : ''} ${d === t0 ? 'is-today' : ''} ${d === sel ? 'is-sel' : ''} ${d < t0 ? 'is-past' : ''}" data-day="${d}">
        <button class="cal-num" data-act="cal-pick" data-day="${d}" aria-label="${dateLong(d)}${ev.length ? `, ${ev.length} élément${ev.length > 1 ? 's' : ''}` : ''}">${new Date(d).getDate()}</button>
        <div class="cal-evs">${ev.slice(0, 3).map(chip).join('')}${ev.length > 3 ? `<button class="cal-more" data-act="cal-pick" data-day="${d}">+${ev.length - 3}</button>` : ''}</div>
        <span class="cal-dots" aria-hidden="true">${ev.slice(0, 4).map((e) => `<i class="k-${e.tone}"></i>`).join('')}</span>
        <button class="cal-add" data-act="cal-add" data-day="${d}" aria-label="Ajouter une tâche le ${dateLong(d)}">${ic('plus')}</button>
      </div>`;
    }).join('')}
  </div>`;
}

// ---------- Vues semaine et jour (grille horaire) ----------
function gridView(days) {
  const all = days.map((d) => eventsOn(d, { courses: true }));
  const timed = all.flat().filter((e) => e.min !== null && e.min !== undefined);
  const from = Math.min(7 * 60, ...timed.map((e) => Math.floor(e.min / 60) * 60));
  const to = Math.max(21 * 60, ...timed.map((e) => Math.ceil((e.min + (e.dur || 30)) / 60) * 60));
  const t0 = startOfDay(), nowMin = minOf(Date.now());
  const hours = (to - from) / 60;
  return `<div class="cal-grid-wrap"><div class="cal-grid" style="--days:${days.length};--h:${hours * H}px;--hh:${H}px" data-from="${from}">
    <div class="cg-corner"></div>
    ${days.map((d, i) => `<button class="cg-head ${d === t0 ? 'is-today' : ''}" data-act="cal-pick" data-day="${d}" data-view="jour"><em>${WDS[(new Date(d).getDay() + 6) % 7]}</em><b>${new Date(d).getDate()}</b></button>`).join('')}
    <div class="cg-adl">Journée</div>
    ${days.map((d, i) => `<div class="cg-allday" data-day="${d}">${all[i].filter((e) => e.min === null || e.min === undefined).map(chip).join('')}</div>`).join('')}
    <div class="cg-hours">${Array.from({ length: hours + 1 }, (_, k) => `<span style="top:${k * H}px">${from / 60 + k} h</span>`).join('')}</div>
    ${days.map((d, i) => `<div class="cg-col ${d === t0 ? 'is-today' : ''}" data-day="${d}" data-act="cal-slot">
      ${Array.from({ length: hours }, (_, k) => `<i class="cg-line" style="top:${k * H}px"></i>`).join('')}
      ${d === t0 && nowMin >= from && nowMin <= to ? `<i class="cg-now" style="top:${((nowMin - from) / 60) * H}px"></i>` : ''}
      ${layout(all[i].filter((e) => e.min !== null && e.min !== undefined)).map(({ e, col, cols }) => `<button class="cg-ev k-${e.tone} ev-${e.kind} ${e.done ? 'is-done' : ''} ${e.late ? 'is-late' : ''}" style="top:${((e.min - from) / 60) * H}px;height:${Math.max(22, ((e.dur || 30) / 60) * H - 3)}px;left:calc(${(col / cols) * 100}% + 2px);width:calc(${100 / cols}% - 4px)" ${evAttrs(e)} draggable="false"><b>${esc(e.title)}</b><span>${hm(e.min)}${e.kind === 'course' || e.kind === 'exam' ? ` – ${hm(e.min + (e.dur || 30))}` : ''}${e.sub ? ` · ${esc(e.sub)}` : ''}</span></button>`).join('')}
    </div>`).join('')}
  </div></div>`;
}
// Événements qui se chevauchent : côte à côte
function layout(evs) {
  const sorted = [...evs].sort((a, b) => a.min - b.min);
  const out = []; let group = [], end = -1;
  const flush = () => { const cols = []; group.forEach((x) => { let c = cols.findIndex((last) => last <= x.e.min); if (c < 0) { c = cols.length; cols.push(0); } cols[c] = x.e.min + (x.e.dur || 30); x.col = c; }); group.forEach((x) => { x.cols = cols.length; out.push(x); }); group = []; };
  sorted.forEach((e) => { if (e.min >= end && group.length) flush(); group.push({ e }); end = Math.max(end, e.min + (e.dur || 30)); });
  if (group.length) flush();
  return out;
}

// ---------- Vue liste (l'ancien agenda) ----------
function listView(sel) {
  const s = S(), t0 = startOfDay();
  const open = s.tasks.filter((t) => !t.done);
  const late = open.filter((t) => t.due && t.due < t0).sort((a, b) => a.due - b.due);
  const later = open.filter((t) => !t.due || t.due >= t0).sort((a, b) => (a.due || 9e15) - (b.due || 9e15)).slice(0, 40);
  return `${late.length ? `<section class="card rise"><header class="card-h"><div><h2 class="is-late">En retard</h2><p>${late.length} tâche${late.length > 1 ? 's' : ''}</p></div></header><ul class="tasks">${late.map((t) => taskRow(t)).join('')}</ul></section>` : ''}
    <section class="card rise"><header class="card-h"><div><h2>À venir</h2><p>${later.length} tâche${later.length > 1 ? 's' : ''}</p></div></header>
      ${later.length ? `<ul class="tasks">${later.map((t) => taskRow(t)).join('')}</ul>` : '<p class="muted pad">Rien de prévu.</p>'}
      ${quickAdd({ due: String(sel), placeholder: 'Ajouter une tâche… ex. « Dentiste jeudi 9h »', cls: 'qadd-sm' })}</section>`;
}

// Jour choisi (sous le mois) : tout ce qui s'y passe, et un champ pour y ajouter une tâche
function dayPanel(sel) {
  const ev = eventsOn(sel, { courses: true });
  const t0 = startOfDay();
  const label = sel === t0 ? 'Aujourd\'hui' : sel === t0 + DAY ? 'Demain' : dateDay(sel);
  return `<section class="card cal-day rise">
    <header class="card-h"><div><h2>${label}</h2><p>${dateLong(sel)}${ev.length ? ` · ${ev.length} élément${ev.length > 1 ? 's' : ''}` : ''}</p></div>${can('calendarFull') ? `<a class="link" href="#/agenda?v=jour&d=${ymd(sel)}">Vue jour</a>` : ''}</header>
    ${ev.length ? `<ul class="cal-list">${ev.map((e) => `<li>${chip(e)}${e.sub ? `<em class="cal-sub">${esc(e.sub)}</em>` : ''}</li>`).join('')}</ul>` : `<p class="muted pad">${sel === t0 ? 'Journée libre.' : 'Rien de prévu ce jour-là.'}</p>`}
    ${quickAdd({ due: String(sel), placeholder: `Ajouter pour ${label.toLowerCase()}…`, cls: 'qadd-sm' })}
  </section>`;
}

export function agenda(params, q) {
  const s = S();
  const v = getView(q);
  try { localStorage.setItem('msdev:calv', v); } catch (e) { /* rien */ }
  const anchor = parseDay(q.d);
  const t0 = startOfDay();
  const wk = startOfWeek(anchor);
  const href = (patch) => { const p = new URLSearchParams({ v, d: ymd(anchor), ...patch }); return `#/agenda?${p}`; };
  const step = v === 'mois' ? (n) => addMonths(anchor, n) : v === 'semaine' ? (n) => addDays(anchor, 7 * n) : (n) => addDays(anchor, n);
  const title = v === 'mois' ? cap(mf.format(anchor)) : v === 'semaine' ? `${new Date(wk).getDate()} – ${df.format(addDays(wk, 6))} ${new Date(addDays(wk, 6)).getFullYear()}` : v === 'jour' ? dateLong(anchor) : 'À venir';
  const open = s.tasks.filter((t) => !t.done);
  const wkTasks = open.filter((t) => t.due >= startOfWeek() && t.due < startOfWeek() + 7 * DAY);
  const late = open.filter((t) => t.due && t.due < t0);
  const doneWeek = s.tasks.filter((t) => t.done && t.doneAt >= startOfWeek()).length;
  const nextExam = s.exams.filter((x) => x.date >= t0).sort((a, b) => a.date - b.date)[0];
  const nextDeadline = s.projects.filter((p) => p.due && p.due >= t0 && p.status !== 'termine').sort((a, b) => a.due - b.due)[0];
  const kpi = (tone, icon, label, value, sub, h) => `<a class="kpi2 k-${tone}" href="${h}"><span class="kpi2-h"><span class="kpi2-l">${label}</span><span class="kpi2-ic">${ic(icon)}</span></span><span class="kpi2-v">${value}</span><span class="kpi2-d flat"><span>${sub}</span></span></a>`;
  const daysLeft = (t) => { const d = Math.round((startOfDay(t) - t0) / DAY); return d === 0 ? 'Aujourd\'hui' : d === 1 ? 'Demain' : `J−${d}`; };
  const pro = can('calendarFull');
  const body = v === 'mois' ? `<section class="card cal-card rise">${monthView(anchor, anchor)}</section>${dayPanel(anchor)}`
    : v === 'liste' ? listView(anchor)
      : !pro ? `${paywall('calendarFull')}<div class="demo-preview" aria-hidden="true"><span class="tag">Exemple</span><div class="cal-demo">${['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'].map((d, i) => `<div><em>${d}</em>${i % 2 ? '<span class="k-blue">Maths 8 h 30</span>' : '<span class="k-sand">Histoire 10 h</span>'}${i === 3 ? '<span class="k-rose">Examen</span>' : ''}</div>`).join('')}</div></div>`
        : `<section class="card cal-card cal-gridcard rise">${gridView(v === 'semaine' ? Array.from({ length: 7 }, (_, i) => addDays(wk, i)) : [anchor])}</section>${v === 'jour' ? dayPanel(anchor) : ''}`;
  const html = `${pageHead('Calendrier', { kicker: `${open.length} tâche${open.length > 1 ? 's' : ''} à faire`, actions: `<button class="btn btn-primary fab-dup" data-act="cal-add" data-day="${anchor === t0 || anchor < t0 ? t0 : anchor}">${ic('plus')}<span>Tâche</span></button>` })}
    ${viewSeg('agenda')}
    <div class="kpi-grid n4 cal-kpis">
      ${kpi('blue', 'calendar', 'Cette semaine', num(wkTasks.length), `${open.filter((t) => t.due >= t0 && t.due < t0 + DAY).length} aujourd'hui`, '#/agenda?v=semaine')}
      ${kpi('rose', 'flame', 'En retard', num(late.length), late.length ? 'à replanifier' : 'Tout est à jour', '#/taches')}
      ${on('etudes') ? kpi('sky', 'target', 'Prochain examen', nextExam ? daysLeft(nextExam.date) : '—', nextExam ? esc(nextExam.title) : 'Aucun examen', '#/etudes/examens') : kpi('sand', 'flag', 'Prochaine échéance', nextDeadline ? daysLeft(nextDeadline.due) : '—', nextDeadline ? esc(nextDeadline.name) : 'Aucun projet daté', nextDeadline ? `#/projet/${nextDeadline.id}` : '#/projets')}
      ${kpi('olive', 'checkCircle', 'Terminées cette semaine', num(doneWeek), doneWeek ? 'Bravo' : tr('ag.tick'), '#/apercu')}
    </div>
    <div class="cal-bar">
      <div class="cal-nav">${v !== 'liste' ? `<a class="icon-btn" href="${href({ d: ymd(step(-1)) })}" aria-label="Précédent">${ic('chevL')}</a><a class="btn btn-ghost btn-sm" href="${href({ d: ymd(t0) })}">Aujourd'hui</a><a class="icon-btn" href="${href({ d: ymd(step(1)) })}" aria-label="Suivant">${ic('chevR')}</a>` : ''}<h2 class="cal-title">${esc(title)}</h2></div>
      <nav class="seg seg-sm cal-views" aria-label="Affichage du calendrier">${VIEWS.map(([k, l]) => `<a class="seg-i ${v === k ? 'is-on' : ''}" href="${href({ v: k })}">${l}${(k === 'semaine' || k === 'jour') && !pro ? ` ${ic('lock')}` : ''}</a>`).join('')}</nav>
    </div>
    ${body}
    ${pro && v !== 'liste' ? `<p class="hint">${matchMedia('(pointer:fine)').matches ? tr('ag.dragHint') : tr('ag.touchHint')}</p>` : ''}`;
  return {
    title: 'Calendrier', tab: 'taches', fab: 'task-new', html,
    after(root) { return pro && v !== 'liste' ? calendarDnD(root, v) : null; },
  };
}

// Glisser-déposer des tâches (souris, stylet) : vers un autre jour (mois) ou une autre heure (semaine, jour)
function calendarDnD(root, v) {
  let drag = null, suppress = false;
  const onClick = (e) => { if (suppress) { e.preventDefault(); e.stopPropagation(); suppress = false; } };
  const down = (e) => {
    const el = e.target.closest('[data-task]');
    if (!el || e.button > 0 || e.pointerType === 'touch') return;
    drag = { el, id: el.dataset.task, sx: e.clientX, sy: e.clientY, ghost: null };
  };
  const target = (x, y) => {
    drag.ghost && (drag.ghost.hidden = true);
    const hit = document.elementFromPoint(x, y);
    drag.ghost && (drag.ghost.hidden = false);
    if (v === 'mois') { const c = hit?.closest('.cal-cell'); return c ? { day: +c.dataset.day, el: c } : null; }
    const col = hit?.closest('.cg-col');
    if (!col) { const ad = hit?.closest('.cg-allday'); return ad ? { day: +ad.dataset.day, min: 0, el: ad } : null; }
    const from = +root.querySelector('.cal-grid').dataset.from;
    const r = col.getBoundingClientRect();
    const min = Math.max(0, Math.round(((y - r.top) / H) * 60 / 15) * 15 + from);
    return { day: +col.dataset.day, min: Math.min(23 * 60 + 45, min), el: col };
  };
  const move = (e) => {
    if (!drag) return;
    if (!drag.ghost) {
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
      const r = drag.el.getBoundingClientRect();
      drag.ox = drag.sx - r.left; drag.oy = drag.sy - r.top;
      drag.ghost = drag.el.cloneNode(true); drag.ghost.classList.add('cal-ghost'); drag.ghost.style.width = `${r.width}px`; drag.ghost.style.height = `${r.height}px`;
      document.body.append(drag.ghost); drag.el.classList.add('is-dragging'); document.body.classList.add('is-dragging');
    }
    e.preventDefault();
    drag.ghost.style.transform = `translate(${e.clientX - drag.ox}px, ${e.clientY - drag.oy}px)`;
    const t = target(e.clientX, e.clientY);
    if (t?.el !== drag.over) { drag.over?.classList.remove('is-over'); drag.over = t?.el; drag.over?.classList.add('is-over'); }
    if (t && t.min !== undefined) drag.ghost.dataset.time = hm(t.min);
  };
  const up = (e) => {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.ghost) return;
    suppress = true;
    d.ghost.remove(); d.el.classList.remove('is-dragging'); document.body.classList.remove('is-dragging'); d.over?.classList.remove('is-over');
    const t = (() => { drag = d; const r = target(e.clientX, e.clientY); drag = null; return r; })();
    if (!t) return;
    const task = S().tasks.find((x) => x.id === d.id);
    if (!task) return;
    const old = task.due;
    const due = t.day + (t.min !== undefined ? t.min * 60e3 : minOf(old) * 60e3);
    if (due === old) return;
    update((s) => { const x = s.tasks.find((y) => y.id === d.id); x.due = due; s.prospects.forEach((p) => { if (p.next?.taskId === x.id) p.next = { ...p.next, due }; }); });
    toast(`${esc(task.title)} · ${dateDay(due)}${minOf(due) ? ` à ${time(due)}` : ''}`, { title: 'Tâche déplacée', action: 'Annuler', onAction: () => update((s) => { const x = s.tasks.find((y) => y.id === d.id); if (x) x.due = old; }), ms: 3200 });
  };
  root.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', up);
  root.addEventListener('click', onClick, true);
  return () => { root.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); root.removeEventListener('click', onClick, true); document.querySelector('.cal-ghost')?.remove(); };
}

register({
  'cal-pick': (b) => {
    const p = new URLSearchParams(location.hash.split('?')[1] || '');
    p.set('d', ymd(+b.dataset.day));
    if (b.dataset.view && can('calendarFull')) p.set('v', b.dataset.view);
    location.hash = `#/agenda?${p}`;
  },
  'cal-add': (b) => taskSheet({ due: +b.dataset.day + (+b.dataset.day === startOfDay() ? 18 * 3600e3 : 9 * 3600e3) }),
  'cal-go': (b) => { location.hash = b.dataset.h; },
  'cal-slot': (b, e) => {
    if (e?.target?.closest('.cg-ev')) return;
    const from = +document.querySelector('.cal-grid')?.dataset.from || 0;
    const r = b.getBoundingClientRect();
    const min = Math.max(0, Math.floor((((e?.clientY ?? r.top) - r.top) / H) * 2) * 30 + from);
    taskSheet({ due: +b.dataset.day + min * 60e3 });
  },
});
export { toggleTask, deleteTask, time };
