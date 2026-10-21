// Tâches : saisie rapide en langage courant, listes, priorités, sous-tâches, tableau.
import { S, update, on, schoolOnly, uid, addTask, toggleTask, getProspect, getProject, startOfDay, startOfWeek, DAY, TONES } from '../store.js';
import { ic, esc, register, toast, sheet, sheetHead, closeSheet, confirmSheet, field, input, select, when, time, toLocalInput, fromLocalInput, enableDnD, clearDraft, cap } from '../ui.js';
import { pageHead } from './common.js';
import { t as tr } from '../strings.js';

const WD = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const PRIO = [['0', 'Normale'], ['1', 'Importante'], ['2', 'Urgente']];
const TONE_NAMES = { grey: 'Gris', sky: 'Bleu clair', blue: 'Bleu', navy: 'Bleu nuit', sand: 'Sable', olive: 'Olive', rose: 'Rose' };
export const listOf = (id) => S().lists.find((l) => l.id === id);

// « Appeler Marc demain 14h #travail ! » → titre, échéance, liste, priorité
export function parseQuick(raw) {
  let t = ` ${raw || ''} `;
  let day = null, hh = null, mm = 0, prio = 0, list = null, abs = null, project = null;
  const take = (re, fn) => { t = t.replace(re, (...m) => (fn(...m) === false ? m[0] : ' ')); };
  take(/\s(!{1,2})(?=\s)/, (m, x) => { prio = x.length; });
  // « #travail » vise une liste ; « #examenhistoire » vise un projet (nom sans espaces)
  take(/\s#([\p{L}\d_-]+)(?=\s)/u, (m, x) => {
    const l = S().lists.find((y) => norm(y.name) === norm(x));
    if (l) { list = l.id; return true; }
    const pr = S().projects.find((y) => y.status !== 'termine' && norm(y.name).replace(/[\s'’-]+/g, '') === norm(x).replace(/[-_]/g, ''));
    if (!pr) return false;
    project = pr.id; return true;
  });
  take(/\s(?:pour\s|d'ici\s)?(après-demain|apres-demain)(?=\s)/i, () => { day = 2; });
  take(/\s(?:pour\s)?(aujourd['’]hui|auj\.?|ce soir)(?=\s)/i, (m, x) => { day = 0; if (/soir/i.test(x)) hh = 19; });
  take(/\s(?:pour\s)?demain(?=\s)/i, () => { day = 1; });
  take(/\s(?:pour\s)?(?:la\s)?semaine prochaine(?=\s)/i, () => { const cur = new Date().getDay(); day = ((8 - cur) % 7) || 7; });
  take(/\s(?:pour\s|le\s|ce\s)?(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(?:\sprochain)?(?=\s)/i, (m, w) => {
    const d = (WD.indexOf(w.toLowerCase()) - new Date().getDay() + 7) % 7; day = d || 7;
  });
  take(/\s(?:le\s)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s)/, (m, d, mo, y) => {
    const now = new Date(); const yy = y ? (+y < 100 ? 2000 + +y : +y) : now.getFullYear();
    const dt = new Date(yy, +mo - 1, +d); if (Number.isNaN(dt.getTime()) || +mo > 12 || +d > 31) return false;
    if (!y && dt.getTime() < startOfDay()) dt.setFullYear(yy + 1);
    abs = dt.getTime(); return true;
  });
  take(/\s(?:à\s?|vers\s)?(\d{1,2})\s?(?:h|:)\s?(\d{2})?(?=\s)/i, (m, h, mi) => { if (+h > 23 || +(mi || 0) > 59) return false; hh = +h; mm = +(mi || 0); return true; });
  let due = null;
  if (abs !== null || day !== null || hh !== null) {
    const base = abs ?? startOfDay() + (day ?? 0) * DAY;
    due = base + (hh !== null ? hh * 3600e3 + mm * 60e3 : 0);
    if (abs === null && day === null && due < Date.now()) due += DAY;
  }
  const title = t.replace(/\s+/g, ' ').trim().replace(/\s(à|pour|le|de|d'ici|avant)$/i, '');
  return { title: title ? cap(title) : '', due, prio, list, project };
}
const previewOf = (r) => [r.due ? when(r.due) : '', r.list ? listOf(r.list)?.name : '', r.project ? getProject(r.project)?.name : '', r.prio ? PRIO[r.prio][1] : ''].filter(Boolean);
export const TSTATUS = [['todo', 'À faire'], ['doing', 'En cours'], ['done', 'Terminée']];
export const PRIOS = PRIO;

// ---------- Ligne de tâche (réutilisée : accueil, agenda, fiche, projet) ----------
export function taskRow(t, { showList = true, showProject = true } = {}) {
  const s = S();
  const p = t.prospectId && s.prospects.find((x) => x.id === t.prospectId);
  const late = !t.done && t.due && t.due < (new Date(t.due).getHours() || new Date(t.due).getMinutes() ? Date.now() : startOfDay());
  const l = showList && t.list && listOf(t.list);
  const pr = showProject && t.projectId && getProject(t.projectId);
  const subs = t.sub?.length ? `${t.sub.filter((x) => x.done).length}/${t.sub.length}` : '';
  const meta = [
    late ? '<span class="is-late">En retard</span>' : '',
    t.due ? `<span class="${late ? 'is-late' : ''}">${when(t.due)}</span>` : '',
    !t.done && t.status === 'doing' ? '<span class="st-doing">En cours</span>' : '',
    pr ? `<span class="pj-chip k-${pr.tone}">${ic(pr.icon || 'folder')}${esc(pr.name)}</span>` : '',
    l ? `<span class="lst t-${l.tone}"><i class="dot"></i>${esc(l.name)}</span>` : '',
    subs ? `<span class="subs">${ic('tasks')}${subs}</span>` : '',
    p ? `<span>${esc(p.entreprise)}</span>` : '',
    t.notes ? `<span class="has-note" title="Notes">${ic('note')}</span>` : '',
    t.demo ? '<span class="tag">Exemple</span>' : '',
  ].filter(Boolean).join('<span class="sep">·</span>');
  return `<li class="task trow ${t.done ? 'is-done' : ''} ${t.prio ? `prio-${t.prio}` : ''}" data-id="${t.id}">
    <button class="tick ${t.done ? 'is-done' : ''}" data-act="task-toggle" data-id="${t.id}" aria-label="${t.done ? `Marquer « ${esc(t.title)} » à faire` : `Marquer « ${esc(t.title)} » comme fait`}"></button>
    <button class="task-b" data-act="task-open" data-id="${t.id}"><span class="task-t">${t.prio ? `<i class="flag f${t.prio}" aria-label="${PRIO[t.prio][1]}">${ic('flag')}</i>` : ''}${esc(t.title)}</span>${meta ? `<span class="task-m">${meta}</span>` : ''}</button>
  </li>`;
}

// ---------- Saisie rapide ----------
export function quickAdd({ list = '', due = '', project = '', placeholder = `Ajouter une tâche… « ${schoolOnly() ? 'Réviser le chapitre 3 demain 18h' : 'Appeler Marc demain 14h'} »`, cls = '' } = {}) {
  return `<form class="qadd ${cls}" data-form="quick-task" autocomplete="off">
    <span class="qadd-ic">${ic('plus')}</span>
    <input class="qadd-in" name="title" placeholder="${esc(placeholder)}" aria-label="Nouvelle tâche" data-act-input="qadd-preview" enterkeyhint="done" maxlength="200">
    <input type="hidden" name="list" value="${esc(list)}"><input type="hidden" name="due" value="${esc(due)}"><input type="hidden" name="project" value="${esc(project)}">
    <button class="qadd-go" type="submit" aria-label="Ajouter la tâche" disabled>${ic('arrowR')}</button>
    <p class="qadd-p" aria-live="polite"></p>
  </form>`;
}

// ---------- Écran Tâches ----------
const sortTasks = (a, b) => (b.prio || 0) - (a.prio || 0) || (a.due || 9e15) - (b.due || 9e15) || a.createdAt - b.createdAt;
export const viewSeg = (cur) => `<nav class="seg seg-sm view-seg" aria-label="Affichage">
  <a class="seg-i ${cur === 'list' ? 'is-on' : ''}" href="#/taches">${ic('tasks')}<span>Liste</span></a>
  <a class="seg-i ${cur === 'board' ? 'is-on' : ''}" href="#/taches?v=board">${ic('board')}<span>Tableau</span></a>
  <a class="seg-i ${cur === "agenda" ? "is-on" : ""}" href="#/agenda">${ic("calendar")}<span>Calendrier</span></a></nav>`;

export function tasksView(params, q) {
  const s = S();
  const v = q.v === 'board' ? 'board' : 'list';
  const lid = q.l && listOf(q.l) ? q.l : '';
  const pid = q.p && getProject(q.p) ? q.p : '';
  const t0 = startOfDay();
  const all = s.tasks.filter((t) => (!lid || t.list === lid) && (!pid || t.projectId === pid));
  const open = all.filter((t) => !t.done).sort(sortTasks);
  const done = all.filter((t) => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  const todayN = s.tasks.filter((t) => !t.done && t.due && t.due < t0 + DAY).length;
  const href = (patch) => { const p = new URLSearchParams({ ...(v === 'board' ? { v } : {}), ...(lid ? { l: lid } : {}), ...(pid ? { p: pid } : {}), ...patch }); for (const [k, x] of [...p]) if (!x) p.delete(k); const qs = p.toString(); return `#/taches${qs ? '?' + qs : ''}`; };
  const counts = (id) => s.tasks.filter((t) => !t.done && t.list === id).length;

  const sections = [
    ['En retard', (t) => t.due && t.due < t0, 'is-late'],
    ['Aujourd\'hui', (t) => t.due >= t0 && t.due < t0 + DAY],
    ['Demain', (t) => t.due >= t0 + DAY && t.due < t0 + 2 * DAY],
    ['Cette semaine', (t) => t.due >= t0 + 2 * DAY && t.due < startOfWeek() + 7 * DAY],
    ['Plus tard', (t) => t.due >= startOfWeek() + 7 * DAY && t.due >= t0 + 2 * DAY],
    ['Sans date', (t) => !t.due],
  ];
  const listBody = () => {
    if (!open.length && !done.length && lid) return `<div class="empty card"><span class="empty-ic">${ic('checkSquare')}</span>
      <p class="empty-t">Cette liste est vide</p>
      <p class="empty-p">${tr('tk.listEmpty')}</p>
      <button class="btn btn-primary" data-act="task-new" data-list="${lid}">${ic('plus')}<span>Ajouter une tâche</span></button></div>`;
    if (!open.length && !done.length) return firstTasks();
    const used = new Set();
    return sections.map(([label, test, cls]) => {
      const items = open.filter((t) => !used.has(t.id) && test(t));
      items.forEach((t) => used.add(t.id));
      return items.length ? `<section class="card tsec rise"><header class="card-h"><div><h2 class="${cls || ''}">${label}</h2><p>${items.length}</p></div></header><ul class="tasks">${items.map((t) => taskRow(t, { showList: !lid })).join('')}</ul></section>` : '';
    }).join('') + (done.length ? `<details class="card done-box rise"><summary><h2>Terminées <b class="muted-s">${done.length}</b></h2>${ic('chevD', 'chev')}</summary><ul class="tasks">${done.slice(0, 40).map((t) => taskRow(t, { showList: !lid })).join('')}</ul>${done.length > 3 ? '<button class="link" data-act="tasks-clear-done">Effacer les tâches terminées</button>' : ''}</details>` : '');
  };
  const COLS = [['todo', 'À faire', 'grey'], ['doing', 'En cours', 'blue'], ['done', 'Fait', 'olive']];
  const boardBody = () => `<div class="board tboard" role="list">${COLS.map(([k, label, tone]) => {
    const items = k === 'done' ? done.slice(0, 30) : open.filter((t) => (t.status || 'todo') === k);
    return `<section class="kcol" data-col="${k}" role="listitem" aria-label="${label}"><header class="kcol-h"><i class="dot t-${tone}"></i><span>${label}</span><b>${items.length}</b></header>
      <div class="kcol-b">${items.map((t) => `<a class="kcard ${t.done ? 'is-done' : ''}" href="#/taches" draggable="false" data-id="${t.id}" data-act="task-open">
        <p class="kcard-t">${t.prio ? `<i class="flag f${t.prio}">${ic('flag')}</i>` : ''}${esc(t.title)}</p>
        <div class="kcard-f">${t.due ? `<span class="kcard-n ${!t.done && t.due < Date.now() ? 'is-late' : ''}">${ic('clock')}${when(t.due)}</span>` : '<span></span>'}${t.list && listOf(t.list) ? `<span class="lst t-${listOf(t.list).tone}"><i class="dot"></i>${esc(listOf(t.list).name)}</span>` : ''}</div></a>`).join('') || `<p class="kcol-empty">${tr('tk.dropHere')}</p>`}</div></section>`;
  }).join('')}</div><p class="hint">${matchMedia('(pointer:fine)').matches ? tr('tk.dragCols') : 'Appui long sur une tâche pour la déplacer.'}</p>`;

  const l = lid && listOf(lid);
  const html = `
    ${pageHead('Tâches', { kicker: `${open.length} à faire${todayN ? ` · ${todayN} pour aujourd'hui` : ''}`, actions: `<button class="btn btn-primary fab-dup" data-act="task-new" ${lid ? `data-list="${lid}"` : ''}>${ic('plus')}<span>Tâche</span></button>` })}
    ${viewSeg(v)}
    ${quickAdd({ list: lid, project: pid })}
    ${s.tasks.length || lid ? `<nav class="chips-row" aria-label="Listes">
      <a class="chip-btn ${!lid ? 'is-on' : ''}" href="${href({ l: '' })}">Toutes <b>${s.tasks.filter((t) => !t.done).length}</b></a>
      ${s.lists.map((x) => `<a class="chip-btn ${lid === x.id ? 'is-on' : ''}" href="${href({ l: x.id })}"><i class="dot t-${x.tone}"></i>${esc(x.name)} <b>${counts(x.id)}</b></a>`).join('')}
      <button class="chip-btn" data-act="list-new">${ic('plus')}Liste</button>
      ${s.projects.length ? `<label class="chip-sel ${pid ? 'is-on' : ''}">${ic('folder')}<select aria-label="Filtrer par projet" data-act-change="tasks-project" data-base="${esc(href({ p: '' }))}"><option value="">Tous les projets</option>${s.projects.filter((x) => x.status !== 'termine' || x.id === pid).map((x) => `<option value="${x.id}" ${x.id === pid ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>` : ''}
    </nav>` : ''}
    ${pid ? `<p class="list-tools"><a class="link" href="#/projet/${pid}">${ic('folder')}Ouvrir le projet « ${esc(getProject(pid).name)} »</a></p>` : ''}
    ${l ? `<p class="list-tools"><button class="link" data-act="list-edit" data-id="${l.id}">${ic('edit')}Renommer</button><button class="link danger" data-act="list-del" data-id="${l.id}">${ic('trash')}Supprimer la liste</button></p>` : ''}
    ${v === 'board' && (open.length || done.length) ? boardBody() : listBody()}`;
  return {
    title: 'Tâches', tab: 'taches', fab: 'task-new', html,
    after(root) {
      if (q.new) setTimeout(() => taskSheet({ list: lid, project: pid }), 60);
      if (v === 'board') return enableDnD(root.querySelector('.tboard'), { key: 'col', onDrop: moveTask, onLong: (id) => moveSheet(id) });
    },
  };
}

// Premier écran d'un nouveau compte : l'action, le bénéfice, des exemples en un geste,
// et un aperçu clairement marqué « Exemple ».
const EXAMPLES = () => (schoolOnly() ? ['Réviser le chapitre 3 demain 18h', 'Rendre le devoir de maths vendredi', 'Préparer l’exposé lundi 9h'] : ['Envoyer le devis vendredi', 'Appeler le comptable demain 10h', 'Préparer la réunion lundi 9h']);
function firstTasks() {
  return `<section class="card onboard-empty rise">
    <span class="empty-ic">${ic('checkSquare')}</span>
    <h2>${tr('tk.empty.t')}</h2>
    <p>${tr('tk.empty.p')}</p>
    <button class="btn btn-primary btn-lg" data-act="task-new">${ic('plus')}<span>Créer ma première tâche</span></button>
    <p class="oe-k">${tr('tk.empty.ex')}</p>
    <div class="chips-wrap oe-ex">${EXAMPLES().map((x) => `<button class="chip-btn" data-act="task-example" data-t="${esc(x)}">${ic('plus')}${esc(x)}</button>`).join('')}</div>
    <div class="demo-preview" aria-hidden="true">
      <span class="tag">Exemple</span>
      <div class="dp-row"><span class="tick"></span><span><b>${schoolOnly() ? 'Réviser le chapitre 3 d’histoire' : 'Envoyer le devis à Maison Lemaire'}</b><em>Aujourd'hui · 17 h · ${schoolOnly() ? 'École' : 'Travail'}</em></span></div>
      <div class="dp-row"><span class="tick is-done"></span><span><b>Réserver le train pour Gand</b><em>Terminée</em></span></div>
    </div>
    <p class="oe-foot">${tr('tk.empty.demo')} <button class="link" data-act="load-demo">Charger des données d'exemple</button>, effaçables en un geste.</p>
  </section>`;
}

function moveTask(id, col) {
  const t = S().tasks.find((x) => x.id === id);
  if (!t) return;
  if (col === 'done') { if (!t.done) toggleTask(id); toast(`« ${esc(t.title)} » terminée`, { ms: 1600 }); return; }
  update((s) => { const x = s.tasks.find((y) => y.id === id); if (x.done) { x.done = false; x.doneAt = null; } x.status = col; });
}
function moveSheet(id) {
  const t = S().tasks.find((x) => x.id === id);
  const cur = t.done ? 'done' : t.status || 'todo';
  sheet(`${sheetHead('Déplacer vers', esc(t.title))}<div class="sheet-body stage-pick">${[['todo', 'À faire', 'grey'], ['doing', 'En cours', 'blue'], ['done', 'Fait', 'olive']].map(([k, l, tone]) => `<button class="stage-opt ${k === cur ? 'is-on' : ''}" data-act="task-move" data-id="${id}" data-col="${k}"><i class="dot t-${tone}"></i>${l}${k === cur ? ic('check') : ''}</button>`).join('')}</div>`, { cls: 'sheet-sm' });
}

// ---------- Feuille de tâche ----------
const chipDays = () => {
  const t0 = startOfDay();
  const mon = t0 + (((8 - new Date().getDay()) % 7) || 7) * DAY;
  return [['Aujourd\'hui', t0 + 18 * 3600e3], ['Demain', t0 + DAY + 9 * 3600e3], ['Lundi', mon + 9 * 3600e3], ['Sans date', '']];
};
export function taskSheet({ pid = '', task = null, list = '', title = '', project = '', due = null } = {}) {
  const s = S();
  const t = task || { title: title || (pid ? `Rappeler ${getProspect(pid)?.entreprise || ''}` : ''), kind: pid ? 'appel' : 'tache', due: due ?? (pid ? startOfDay() + DAY + 10 * 3600e3 : null), prospectId: pid || getProject(project)?.prospectId || '', projectId: project || null, list: list || null, prio: 0, status: 'todo', notes: '', sub: [] };
  const st = t.done ? 'done' : t.status === 'doing' ? 'doing' : 'todo';
  const projects = s.projects.filter((x) => x.status !== 'termine' || x.id === t.projectId);
  const crm = on('clients') || on('prospecter');
  const subRow = (x, i) => `<li class="sub-r"><input type="checkbox" name="sub.${i}.done" ${x.done ? 'checked' : ''} aria-label="Sous-tâche faite"><input class="inp" name="sub.${i}.x" value="${esc(x.x)}" placeholder="Sous-tâche" aria-label="Sous-tâche"><button type="button" class="icon-btn sm" data-act="sub-del" aria-label="Retirer la sous-tâche">${ic('x')}</button></li>`;
  sheet(`${sheetHead(task ? 'Modifier la tâche' : 'Nouvelle tâche')}
    <form class="sheet-body form" data-form="task" data-id="${task?.id || ''}" ${task ? '' : `data-draft="task-${pid || 'new'}"`} data-validate novalidate id="task-form">
      ${field('Intitulé', input('title', t.title, 'required autofocus maxlength="200" placeholder="Ce qu\'il faut faire"'))}
      <div class="field"><span class="field-l">Échéance</span>
        <div class="chips-wrap due-chips">${chipDays().map(([l, v]) => `<button type="button" class="chip-btn" data-act="due-chip" data-v="${v}">${l}</button>`).join('')}</div>
        <input class="inp" type="datetime-local" name="due" value="${t.due ? toLocalInput(t.due) : ''}" aria-label="Date et heure">
        <span class="field-h">${tr('tk.noHour')}</span></div>
      <div class="form-2">${field('Projet', select('projectId', [['', 'Aucun projet'], ...projects.map((x) => [x.id, x.name])], t.projectId || ''), projects.length ? '' : '<button type="button" class="link" data-act="go-projects">Créer un projet</button>')}${field('Statut', select('status', TSTATUS, st))}</div>
      <div class="form-2">${field('Priorité', select('prio', PRIO, String(t.prio || 0)))}${field('Liste', select('list', [['', 'Aucune'], ...s.lists.map((x) => [x.id, x.name])], t.list || ''))}</div>
      ${crm ? `<div class="form-2">${field('Type', select('kind', [['tache', 'Tâche'], ['appel', 'Appel'], ['relance', 'Relance'], ['rdv', 'Rendez-vous']], t.kind || 'tache'))}${field(`Fiche (${esc(s.crm.noun.toLowerCase())})`, select('prospectId', [['', 'Aucune'], ...s.prospects.map((x) => [x.id, x.entreprise])], t.prospectId || ''))}</div>` : ''}
      <div class="field"><span class="field-l">Sous-tâches</span><ul class="subs-l">${(t.sub || []).map(subRow).join('')}</ul><button type="button" class="link" data-act="sub-add">${ic('plus')}Ajouter une sous-tâche</button></div>
      ${field('Notes', `<textarea class="inp" name="notes" rows="3" placeholder="Détails, liens, numéro…">${esc(t.notes || '')}</textarea>`)}
      <button class="btn btn-primary btn-block" type="submit" data-needs="title" ${t.title ? '' : 'disabled'}>Enregistrer</button>
      ${task ? `<div class="sheet-actions"><button type="button" class="btn btn-ghost" data-act="task-dup" data-id="${task.id}">${ic('copy')}<span>Dupliquer</span></button><button type="button" class="btn btn-danger-ghost" data-act="task-del" data-id="${task.id}">${ic('trash')}<span>Supprimer</span></button></div>` : ''}
    </form>`, { cls: 'sheet-tall' });
}

function listSheet(l = null) {
  sheet(`${sheetHead(l ? 'Renommer la liste' : 'Nouvelle liste')}
    <form class="sheet-body form" data-form="list" data-id="${l?.id || ''}" data-validate novalidate>
      ${field('Nom', input('name', l?.name || '', 'required autofocus maxlength="24" placeholder="Maison, Clients, Projet X…"'))}
      ${field('Couleur', select('tone', TONES.map((x) => [x, TONE_NAMES[x]]), l?.tone || 'sky'))}
      <button class="btn btn-primary btn-block" type="submit" data-needs="name" ${l ? '' : 'disabled'}>Enregistrer</button>
    </form>`, { cls: 'sheet-sm' });
}

register({
  'qadd-preview': (el) => {
    const f = el.closest('form');
    const r = parseQuick(el.value);
    f.querySelector('.qadd-go').disabled = !r.title;
    const bits = previewOf(r);
    f.querySelector('.qadd-p').innerHTML = el.value.trim() && bits.length ? `${ic('calendar')}<span>${bits.map(esc).join(' · ')}</span>` : '';
  },
  'task-new': (b) => taskSheet({ pid: b?.dataset?.pid || '', list: b?.dataset?.list || '', project: b?.dataset?.project || (location.hash.match(/^#\/projet\/([\w-]+)/) || [])[1] || '' }),
  'tasks-project': (el) => { const base = el.dataset.base; location.hash = el.value ? `${base}${base.includes('?') ? '&' : '?'}p=${el.value}` : base; },
  'go-projects': () => { closeSheet(); location.hash = '#/projets'; },
  'task-open': (b, e) => { e?.preventDefault?.(); const t = S().tasks.find((x) => x.id === b.dataset.id); if (t) taskSheet({ task: t }); },
  'task-edit': (b) => taskSheet({ task: S().tasks.find((t) => t.id === b.dataset.id) }),
  'task-toggle': (b) => {
    const id = b.dataset.id;
    const t = S().tasks.find((x) => x.id === id);
    const wasDone = !!t?.done;
    b.classList.toggle('is-done');
    setTimeout(() => {
      toggleTask(id);
      if (t && !wasDone) toast(`« ${esc(t.title)} »`, { title: 'Tâche terminée', action: 'Annuler', onAction: () => toggleTask(id), ms: 2600 });
    }, 260);
  },
  'task-move': (b) => { moveTask(b.dataset.id, b.dataset.col); closeSheet(); },
  'task-example': (b) => {
    const r = parseQuick(b.dataset.t);
    const t = addTask({ title: r.title, due: r.due, prio: r.prio, list: r.list });
    toast(`« ${esc(r.title)} »${r.due ? ` · ${when(r.due)}` : ''}`, { title: 'Tâche ajoutée', action: 'Annuler', onAction: () => update((s) => { s.tasks = s.tasks.filter((x) => x.id !== t.id); }) });
  },
  'task-dup': (b) => {
    const t = S().tasks.find((x) => x.id === b.dataset.id);
    addTask({ ...JSON.parse(JSON.stringify(t)), id: uid(), title: `${t.title} (copie)`, done: false, doneAt: null, status: 'todo', createdAt: Date.now() });
    closeSheet(); toast('Tâche dupliquée');
  },
  'task-del': async (b) => {
    const t = S().tasks.find((x) => x.id === b.dataset.id);
    if (!t) return;
    closeSheet(null, true);
    const i = S().tasks.indexOf(t);
    update((s) => { s.tasks = s.tasks.filter((x) => x.id !== t.id); s.prospects.forEach((p) => { if (p.next?.taskId === t.id) p.next = null; }); });
    toast(`« ${esc(t.title)} » supprimée`, { title: 'Tâche supprimée', action: 'Annuler', onAction: () => update((s) => { s.tasks.splice(i, 0, t); }), ms: 3200 });
  },
  'tasks-clear-done': async () => {
    const n = S().tasks.filter((t) => t.done).length;
    if (!await confirmSheet({ title: `Effacer ${n} tâche${n > 1 ? 's' : ''} terminée${n > 1 ? 's' : ''} ?`, text: 'Les tâches à faire ne sont pas touchées.', ok: 'Effacer', danger: true })) return;
    update((s) => { s.tasks = s.tasks.filter((t) => !t.done); });
    toast('Tâches terminées effacées');
  },
  'due-chip': (b) => {
    const inp = b.closest('form').elements.due;
    inp.value = b.dataset.v ? toLocalInput(+b.dataset.v) : '';
    b.parentElement.querySelectorAll('.chip-btn').forEach((x) => x.classList.toggle('is-on', x === b));
  },
  'sub-add': (b) => {
    const ul = b.closest('.field').querySelector('.subs-l');
    const i = Date.now() % 1e6;
    ul.insertAdjacentHTML('beforeend', `<li class="sub-r"><input type="checkbox" name="sub.${i}.done" aria-label="Sous-tâche faite"><input class="inp" name="sub.${i}.x" placeholder="Sous-tâche" aria-label="Sous-tâche"><button type="button" class="icon-btn sm" data-act="sub-del" aria-label="Retirer la sous-tâche">${ic('x')}</button></li>`);
    ul.lastElementChild.querySelector('.inp').focus();
  },
  'sub-del': (b) => b.closest('.sub-r').remove(),
  'list-new': () => listSheet(),
  'list-edit': (b) => listSheet(listOf(b.dataset.id)),
  'list-del': async (b) => {
    const l = listOf(b.dataset.id);
    const n = S().tasks.filter((t) => t.list === l.id).length;
    if (!await confirmSheet({ title: `Supprimer la liste « ${esc(l.name)} » ?`, text: n ? `Ses ${n} tâche${n > 1 ? 's' : ''} sont conservées, sans liste.` : 'Elle ne contient aucune tâche.', ok: 'Supprimer', danger: true })) return;
    update((s) => { s.lists = s.lists.filter((x) => x.id !== l.id); s.tasks.forEach((t) => { if (t.list === l.id) t.list = null; }); });
    location.hash = '#/taches'; toast('Liste supprimée');
  },
}, {
  'quick-task': (d, f) => {
    const r = parseQuick(d.title);
    if (!r.title) return;
    const due = r.due ?? (d.due ? +d.due : null);
    const projectId = r.project || d.project || null;
    addTask({ title: r.title, due, prio: r.prio, list: r.list || d.list || null, projectId, prospectId: getProject(projectId)?.prospectId || null });
    f.reset(); f.querySelector('.qadd-p').innerHTML = ''; f.querySelector('.qadd-go').disabled = true;
    if (f.closest('dialog')) closeSheet();
    toast(`« ${esc(r.title)} »${due ? ` · ${when(due)}` : ''}`, { title: 'Tâche ajoutée', ms: 1800 });
    requestAnimationFrame(() => document.querySelector('.qadd-in')?.focus({ preventScroll: true }));
  },
  task: (data, f) => {
    const sub = [];
    for (const k of Object.keys(data)) { const m = k.match(/^sub\.(\d+)\.x$/); if (m && data[k].trim()) sub.push({ id: 's' + m[1], x: data[k].trim(), done: data[`sub.${m[1]}.done`] === 'on' }); }
    const patch = {
      title: data.title.trim(), due: fromLocalInput(data.due), list: data.list || null, prio: Number(data.prio) || 0,
      notes: (data.notes || '').trim(), sub, kind: data.kind || 'tache', projectId: data.projectId || null,
      status: ['todo', 'doing', 'done'].includes(data.status) ? data.status : 'todo',
    };
    patch.prospectId = ('prospectId' in data ? data.prospectId : f.dataset.id && S().tasks.find((x) => x.id === f.dataset.id)?.prospectId) || getProject(patch.projectId)?.prospectId || null;
    if (!patch.title) return;
    if (f.dataset.id) {
      update((s) => {
        const t = s.tasks.find((x) => x.id === f.dataset.id);
        if (patch.status === 'done' && !t.done) patch.doneAt = Date.now();
        patch.done = patch.status === 'done';
        if (!patch.done) patch.doneAt = null;
        Object.assign(t, patch);
        s.prospects.forEach((p) => { if (p.next?.taskId === t.id) p.next = { ...p.next, label: t.title, due: t.due }; });
      });
    } else addTask({ ...patch, done: patch.status === 'done', doneAt: patch.status === 'done' ? Date.now() : null });
    clearDraft(f.dataset.draft);
    closeSheet(); toast(f.dataset.id ? 'Tâche enregistrée' : `« ${esc(patch.title)} »${patch.due ? ` · ${when(patch.due)}` : ''}`, { title: f.dataset.id ? '' : 'Tâche ajoutée' });
  },
  list: (d, f) => {
    const name = (d.name || '').trim();
    if (!name) return;
    if (S().lists.some((l) => l.id !== f.dataset.id && norm(l.name) === norm(name))) { toast(`La liste « ${esc(name)} » existe déjà.`); return; }
    if (f.dataset.id) update((s) => { Object.assign(s.lists.find((l) => l.id === f.dataset.id), { name, tone: d.tone }); });
    else { const id = 'l-' + uid(); update((s) => { s.lists.push({ id, name, tone: d.tone || 'sky' }); }); closeSheet(); location.hash = `#/taches?l=${id}`; toast(`Liste « ${esc(name)} » créée`); return; }
    closeSheet(); toast('Liste enregistrée');
  },
});
export { time };
