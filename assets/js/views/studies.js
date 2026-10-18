// Études : matières, emploi du temps, examens (et planificateur de révisions), moyennes,
// révision espacée et mode concentration. Pensé pour le secondaire, le supérieur et la formation.
import { S, update, can, uid, DAY, startOfDay, startOfWeek, dayKey, TONES, addTask, newProject, canAddProject, getProject, projectProgress } from '../store.js';
import { ic, esc, register, toast, sheet, sheetHead, closeSheet, confirmSheet, field, input, select, dateShort, dateLong, ring, bar, num } from '../ui.js';
import { pageHead, paywall } from './common.js';
import { qaCards } from './notes.js';

const TONE_NAMES = { grey: 'Gris', sky: 'Bleu clair', blue: 'Bleu', navy: 'Bleu nuit', sand: 'Sable', olive: 'Olive', rose: 'Rose' };
const WD = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const WDS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const rr = () => window.dispatchEvent(new Event('ms:rerender'));
export const subject = (id) => S().subjects.find((x) => x.id === id);
const subjChip = (id) => { const x = subject(id); return x ? `<span class="subj k-${x.tone}"><i></i>${esc(x.name)}</span>` : ''; };
const subjOptions = (cur = '', none = 'Aucune matière') => [['', none], ...S().subjects.map((x) => [x.id, x.name])];
const toMin = (hhmm) => { const [h, m] = String(hhmm || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const hhmm = (min) => `${Math.floor(min / 60)} h${min % 60 ? ` ${String(min % 60).padStart(2, '0')}` : ''}`;
const todayIdx = () => (new Date().getDay() + 6) % 7;
const left = (t) => Math.ceil((startOfDay(t) - startOfDay()) / DAY);
const countdown = (t) => { const d = left(t); return d < 0 ? 'Passé' : d === 0 ? 'Aujourd\'hui' : d === 1 ? 'Demain' : `J−${d}`; };
const demo = (inner) => `<div class="demo-preview" aria-hidden="true"><span class="tag">Exemple</span>${inner}</div>`;
const locked = (f, preview) => `${paywall(f)}${preview || ''}`;

// ---------- Matières ----------
export function subjectSheet(x = null) {
  const v = x || { name: '', tone: TONES[S().subjects.length % TONES.length], coef: 1 };
  sheet(`${sheetHead(x ? 'Modifier la matière' : 'Nouvelle matière')}
    <form class="sheet-body form" data-form="subject" data-id="${x?.id || ''}" data-validate novalidate>
      ${field('Nom', input('name', v.name, 'required autofocus maxlength="40" placeholder="Histoire, Maths, Droit des obligations…"'))}
      <div class="form-2">${field('Couleur', select('tone', TONES.map((t) => [t, TONE_NAMES[t]]), v.tone))}${field('Coefficient', input('coef', v.coef, 'type="number" min="0" max="20" step="0.5" inputmode="decimal"'), 'Pour la moyenne générale')}</div>
      <button class="btn btn-primary btn-block" type="submit" data-needs="name" ${v.name ? '' : 'disabled'}>${x ? 'Enregistrer' : 'Ajouter la matière'}</button>
      ${x ? `<button type="button" class="btn btn-danger-ghost btn-block" data-act="subject-del" data-id="${x.id}">${ic('trash')}<span>Supprimer la matière</span></button>` : ''}
    </form>`, { cls: 'sheet-sm' });
}
const subjectsCard = () => {
  const s = S();
  return `<section class="card rise">
    <header class="card-h"><div><h2>Mes matières</h2><p>${s.subjects.length ? `${s.subjects.length} matière${s.subjects.length > 1 ? 's' : ''}` : 'Elles servent partout : cours, examens, notes, concentration'}</p></div><button class="link" data-act="subject-new">${ic('plus')}Matière</button></header>
    ${s.subjects.length ? `<div class="subj-grid">${s.subjects.map((x) => `<button class="subj-card k-${x.tone}" data-act="subject-edit" data-id="${x.id}"><i></i><b>${esc(x.name)}</b><span>coef. ${num(Number(x.coef) || 1)}</span></button>`).join('')}</div>`
      : `<div class="chips-wrap">${['Français', 'Maths', 'Histoire', 'Sciences', 'Langues', 'Géographie'].map((n) => `<button class="chip-btn" data-act="subject-quick" data-n="${n}">${ic('plus')}${n}</button>`).join('')}</div>`}
  </section>`;
};

// ---------- Accueil Études ----------
function srsDue() {
  const s = S(), now = Date.now();
  const cards = s.pages.flatMap((p) => qaCards(p).map((c) => ({ id: c.id, pid: p.id })));
  const due = cards.filter((c) => (s.srs[c.id]?.due || 0) <= now);
  return { total: cards.length, due: due.length };
}
export function focusMinutes(from, to = Date.now()) { return S().focus.sessions.filter((x) => x.at >= from && x.at < to).reduce((n, x) => n + (x.min || 0), 0); }
export function generalAverage() {
  const s = S();
  const subs = s.subjects.map((x) => ({ x, avg: subjectAverage(x.id) })).filter((r) => r.avg !== null);
  if (!subs.length) return null;
  const w = subs.reduce((n, r) => n + (Number(r.x.coef) || 1), 0);
  return subs.reduce((n, r) => n + r.avg * (Number(r.x.coef) || 1), 0) / w;
}
export function subjectAverage(id) {
  const g = S().grades.filter((x) => x.subjectId === id && Number(x.max) > 0);
  if (!g.length) return null;
  const w = g.reduce((n, x) => n + (Number(x.coef) || 1), 0);
  return g.reduce((n, x) => n + ((Number(x.value) || 0) / Number(x.max)) * 20 * (Number(x.coef) || 1), 0) / w;
}
const fmtAvg = (v) => (v === null ? '—' : `${v.toFixed(1).replace('.', ',')}`);
const coursesOn = (dayIdx) => S().courses.filter((c) => +c.day === dayIdx).sort((a, b) => toMin(a.start) - toMin(b.start));

export function studiesView() {
  const s = S();
  const t0 = startOfDay();
  const upcoming = s.exams.filter((x) => x.date >= t0).sort((a, b) => a.date - b.date);
  const next = upcoming[0];
  const today = coursesOn(todayIdx());
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const nextCourse = today.find((c) => toMin(c.end) > nowMin);
  const sr = srsDue();
  const avg = generalAverage();
  const focusWeek = focusMinutes(startOfWeek());
  const empty = !s.subjects.length && !s.exams.length && !s.courses.length;
  const kpi = (tone, icon, label, value, sub, href) => `<a class="kpi2 k-${tone} st-kpi" href="${href}"><span class="kpi2-h"><span class="kpi2-l">${label}</span><span class="kpi2-ic">${ic(icon)}</span></span><span class="kpi2-v">${value}</span><span class="kpi2-d flat"><span>${sub}</span></span></a>`;
  const html = `${pageHead('Études', { kicker: dateLong(), actions: `<button class="btn btn-primary fab-dup" data-act="exam-new">${ic('plus')}<span>Examen</span></button>` })}
    ${empty ? `<section class="card onboard-empty rise">
      <span class="empty-ic">${ic('book')}</span>
      <h2>Votre année, bien rangée</h2>
      <p>Ajoutez vos matières, votre emploi du temps et vos examens : MindView vous montre chaque jour quoi réviser, combien de jours il reste, et votre moyenne.</p>
      <button class="btn btn-primary btn-lg" data-act="subject-new">${ic('plus')}<span>Ajouter mes matières</span></button>
      ${demo(`<div class="dp-q"><span><b>Examen d'histoire</b><em>Révolution française · 5 chapitres</em></span><span class="dp-qv"><b>J−9</b><span class="chip t-sky">60 % révisé</span></span></div>
        <div class="dp-q"><span><b>Maths — 8 h 30</b><em>Salle B12 · M. Dupont</em></span><span class="dp-qv"><b>Aujourd'hui</b></span></div>
        <div class="dp-q"><span><b>Moyenne générale</b><em>Objectif 14</em></span><span class="dp-qv"><b>13,6 / 20</b></span></div>`)}
    </section>` : ''}
    <div class="kpi-grid n4 st-kpis">
      ${kpi('sky', 'target', 'Prochain examen', next ? countdown(next.date) : '—', next ? esc(next.title) : 'Aucun examen prévu', '#/etudes/examens')}
      ${kpi('blue', 'calendar', 'Cours aujourd\'hui', today.length ? num(today.length) : '—', nextCourse ? `${esc(subject(nextCourse.subjectId)?.name || 'Cours')} à ${hhmm(toMin(nextCourse.start))}` : today.length ? 'Journée terminée' : 'Pas de cours', '#/etudes/emploi')}
      ${kpi('olive', 'cards', 'Cartes à réviser', sr.total ? num(sr.due) : '—', sr.total ? `sur ${num(sr.total)} cartes` : 'Créez des questions dans vos notes', '#/etudes/revision')}
      ${kpi('navy', 'award', 'Moyenne générale', avg === null ? '—' : `${fmtAvg(avg)}<small> /20</small>`, avg === null ? 'Ajoutez vos notes' : focusWeek ? `${hhmm(focusWeek)} de travail cette semaine` : `Objectif : ${num(Number(s.profile.target) || 12)} / 20`, '#/etudes/moyennes')}
    </div>
    <div class="st-two">
      <section class="card rise">
        <header class="card-h"><div><h2>Examens à venir</h2><p>${upcoming.length ? `${upcoming.length} examen${upcoming.length > 1 ? 's' : ''}` : 'Le compte à rebours commence ici'}</p></div><a class="link" href="#/etudes/examens">Tous</a></header>
        ${upcoming.length ? `<ul class="rows">${upcoming.slice(0, 4).map(examRow).join('')}</ul>` : `<button class="btn btn-ghost" data-act="exam-new">${ic('plus')}<span>Ajouter un examen</span></button>`}
      </section>
      <section class="card rise">
        <header class="card-h"><div><h2>Aujourd'hui</h2><p>${WD[todayIdx()]}</p></div><a class="link" href="#/etudes/emploi">Emploi du temps</a></header>
        ${today.length ? `<ul class="tt-day">${today.map((c) => courseItem(c, nowMin)).join('')}</ul>` : `<p class="muted pad">${s.courses.length ? 'Pas de cours aujourd\'hui.' : 'Ajoutez vos cours pour les voir ici chaque jour.'}</p>${s.courses.length ? '' : `<button class="btn btn-ghost" data-act="course-new">${ic('plus')}<span>Ajouter un cours</span></button>`}`}
      </section>
    </div>
    <h2 class="sec-title">Outils</h2>
    <div class="tool-grid st-tools">
      ${[['#/etudes/emploi', 'calendar', 'Emploi du temps', 'Vos cours de la semaine', 'timetable'], ['#/etudes/examens', 'target', 'Examens', 'Compte à rebours et planificateur', ''], ['#/etudes/moyennes', 'award', 'Moyennes', 'Coefficients, objectif, note à viser', 'grades'], ['#/etudes/revision', 'cards', 'Révision espacée', 'Chaque carte au bon moment', 'spaced'], ['#/concentration', 'hourglass', 'Concentration', 'Minuteur Pomodoro', 'focus'], ['#/quiz', 'quiz', 'Quiz', 'Quiz du jour et vos quiz', '']]
        .map(([h, i, t, d, f], k) => `<a class="card tool rise" style="--i:${k}" href="${h}"><span class="tool-ic">${ic(i)}</span><b>${t}</b><span>${d}</span>${f && !can(f) ? `<span class="badge b-${['planner', 'spaced', 'focusStats'].includes(f) ? 'premium' : 'pro'}">${['planner', 'spaced', 'focusStats'].includes(f) ? 'Premium' : 'Pro'}</span>` : ''}</a>`).join('')}
    </div>
    ${subjectsCard()}`;
  return { title: 'Études', tab: 'etudes', fab: 'exam-new', html };
}

// ---------- Emploi du temps ----------
const courseItem = (c, nowMin = -1) => {
  const x = subject(c.subjectId);
  const live = nowMin >= toMin(c.start) && nowMin < toMin(c.end);
  return `<li><button class="tt-item k-${x?.tone || 'grey'} ${live ? 'is-live' : ''}" data-act="course-edit" data-id="${c.id}"><span class="tt-time">${hhmm(toMin(c.start))}<em>${hhmm(toMin(c.end))}</em></span><span class="tt-b"><b>${esc(x?.name || c.title || 'Cours')}</b><span>${[c.room && `Salle ${esc(c.room)}`, c.teacher && esc(c.teacher)].filter(Boolean).join(' · ')}</span></span>${live ? '<span class="chip t-olive">En cours</span>' : ''}</button></li>`;
};
export function timetableView() {
  const head = pageHead('Emploi du temps', { back: '#/etudes', kicker: 'Vos cours, chaque semaine', actions: can('timetable') ? `<button class="btn btn-primary fab-dup" data-act="course-new">${ic('plus')}<span>Cours</span></button>` : '' });
  if (!can('timetable')) return { title: 'Emploi du temps', tab: 'etudes', html: `${head}${locked('timetable', demo(`<div class="tt-mini">${['Maths 8 h 30', 'Histoire 10 h 20', 'Anglais 13 h'].map((t, i) => `<span class="tt-mb k-${['blue', 'sand', 'olive'][i]}">${t}</span>`).join('')}</div>`))}` };
  const s = S();
  const days = s.courses.some((c) => +c.day === 6) ? 7 : s.courses.some((c) => +c.day === 5) ? 6 : 5;
  const mins = s.courses.flatMap((c) => [toMin(c.start), toMin(c.end)]);
  const from = Math.min(8 * 60, ...mins.map((m) => Math.floor(m / 60) * 60));
  const to = Math.max(17 * 60, ...mins.map((m) => Math.ceil(m / 60) * 60));
  const H = 52; // pixels par heure
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const grid = `<div class="tt-wrap"><div class="tt-grid" style="--days:${days};--h:${((to - from) / 60) * H}px">
    <div class="tt-hours">${Array.from({ length: (to - from) / 60 + 1 }, (_, i) => `<span style="top:${i * H}px">${(from / 60) + i} h</span>`).join('')}</div>
    ${Array.from({ length: days }, (_, d) => `<div class="tt-col ${d === todayIdx() ? 'is-today' : ''}"><p class="tt-dh">${WDS[d]}</p><div class="tt-cb" data-day="${d}">
      ${Array.from({ length: (to - from) / 60 }, (_, i) => `<i class="tt-line" style="top:${i * H}px"></i>`).join('')}
      ${d === todayIdx() && nowMin >= from && nowMin <= to ? `<i class="tt-now" style="top:${((nowMin - from) / 60) * H}px"></i>` : ''}
      ${coursesOn(d).map((c) => { const x = subject(c.subjectId); const top = ((toMin(c.start) - from) / 60) * H; const h = Math.max(22, ((toMin(c.end) - toMin(c.start)) / 60) * H - 3); return `<button class="tt-ev k-${x?.tone || 'grey'}" style="top:${top}px;height:${h}px" data-act="course-edit" data-id="${c.id}"><b>${esc(x?.name || c.title || 'Cours')}</b><span>${hhmm(toMin(c.start))} – ${hhmm(toMin(c.end))}${c.room ? ` · ${esc(c.room)}` : ''}</span></button>`; }).join('')}
    </div></div>`).join('')}
  </div></div>`;
  const html = `${head}
    ${s.courses.length ? `<section class="card rise tt-today"><header class="card-h"><div><h2>Aujourd'hui</h2><p>${WD[todayIdx()]}</p></div></header>${coursesOn(todayIdx()).length ? `<ul class="tt-day">${coursesOn(todayIdx()).map((c) => courseItem(c, nowMin)).join('')}</ul>` : '<p class="muted pad">Pas de cours aujourd\'hui.</p>'}</section>
      <section class="card rise tt-card">${grid}<p class="hint">Touchez un cours pour le modifier. Vos cours apparaissent aussi dans le calendrier.</p></section>`
    : `<section class="card onboard-empty rise"><span class="empty-ic">${ic('calendar')}</span><h2>Ajoutez votre premier cours</h2><p>Chaque cours revient chaque semaine, avec sa salle et son professeur. Vous le retrouvez sur l'écran Aujourd'hui et dans le calendrier.</p>
      <button class="btn btn-primary btn-lg" data-act="course-new">${ic('plus')}<span>Ajouter un cours</span></button>
      ${demo(`<div class="tt-mini">${['Lun · Maths 8 h 30', 'Lun · Histoire 10 h 20', 'Mar · Anglais 13 h'].map((t, i) => `<span class="tt-mb k-${['blue', 'sand', 'olive'][i]}">${t}</span>`).join('')}</div>`)}</section>`}
    ${subjectsCard()}`;
  return { title: 'Emploi du temps', tab: 'etudes', fab: 'course-new', html };
}
function courseSheet(c = null, preset = {}) {
  const s = S();
  const v = c || { subjectId: s.subjects[0]?.id || '', day: Math.min(todayIdx(), 4), start: '08:30', end: '10:10', room: '', teacher: '', ...preset };
  sheet(`${sheetHead(c ? 'Modifier le cours' : 'Nouveau cours', 'Il revient chaque semaine')}
    <form class="sheet-body form" data-form="course" data-id="${c?.id || ''}" data-validate novalidate>
      ${s.subjects.length ? field('Matière', select('subjectId', subjOptions(v.subjectId, 'Autre (préciser)'), v.subjectId)) : ''}
      ${field(s.subjects.length ? 'Ou un intitulé' : 'Intitulé du cours', input('title', v.title || '', `maxlength="40" ${s.subjects.length ? '' : 'required autofocus'} placeholder="Histoire, TP de chimie…"`), s.subjects.length ? '' : 'Une matière sera créée avec ce nom.')}
      <div class="form-3">${field('Jour', select('day', WD.map((d, i) => [i, d]), v.day))}${field('Début', `<input class="inp" type="time" name="start" value="${esc(v.start)}" required>`)}${field('Fin', `<input class="inp" type="time" name="end" value="${esc(v.end)}" required>`)}</div>
      <div class="form-2">${field('Salle', input('room', v.room, 'maxlength="20" placeholder="B12"'))}${field('Professeur', input('teacher', v.teacher, 'maxlength="40" placeholder="Mme Lambert"'))}</div>
      <p class="co-err" role="alert" hidden></p>
      <button class="btn btn-primary btn-block" type="submit">${c ? 'Enregistrer' : 'Ajouter le cours'}</button>
      ${c ? `<button type="button" class="btn btn-danger-ghost btn-block" data-act="course-del" data-id="${c.id}">${ic('trash')}<span>Supprimer le cours</span></button>` : ''}
    </form>`, { cls: 'sheet-tall' });
}

// ---------- Examens ----------
const examRow = (x) => {
  const pr = x.projectId && getProject(x.projectId);
  const g = pr ? projectProgress(pr.id) : null;
  const d = left(x.date);
  return `<li><a class="row ex-row" href="#/etudes/examens?e=${x.id}"><span class="ex-cd ${d <= 3 && d >= 0 ? 'is-soon' : ''}">${countdown(x.date)}</span>
    <span class="row-b"><b>${esc(x.title)}</b><span>${subject(x.subjectId) ? `${esc(subject(x.subjectId).name)} · ` : ''}${dateShort(x.date)}${g?.total ? ` · ${g.pct} % révisé` : ''}</span>${g?.total ? bar(g.done, g.total, 'olive') : ''}</span>${ic('chevR', 'chev')}</a></li>`;
};
// Séances de révision d'un examen : tâches du planning (examId) et du projet de révision
const examTasks = (x) => S().tasks.filter((t) => t.examId === x.id || (x.projectId && t.projectId === x.projectId));
const chapterDone = (x, ch) => examTasks(x).some((t) => t.done && t.title.toLowerCase().includes(String(ch).toLowerCase()));
function examStats(x) {
  const ts = examTasks(x);
  const done = ts.filter((t) => t.done).length;
  const next = ts.filter((t) => !t.done && t.due).sort((a, b) => a.due - b.due)[0] || null;
  return { total: ts.length, done, pct: ts.length ? Math.round((done / ts.length) * 100) : 0, next };
}
const when = (t) => { const d = new Date(t); return `${dateShort(t)}${d.getHours() ? ` · ${hhmm(d.getHours() * 60 + d.getMinutes())}` : ''}`; };
// Demi-cercle hachuré, rempli selon l'avancement des révisions
const gauge = (p) => {
  const R = 80, L = Math.PI * R;
  return `<svg viewBox="0 0 200 112" aria-hidden="true"><defs><pattern id="xm-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#eef0fb"/><line x1="0" y1="0" x2="0" y2="8" stroke="#d5d9f3" stroke-width="3"/></pattern></defs>
    <path d="M20 100A80 80 0 0 1 180 100" fill="none" stroke="url(#xm-hatch)" stroke-width="24" stroke-linecap="round"/>
    <path d="M20 100A80 80 0 0 1 180 100" fill="none" stroke="#3d63f5" stroke-width="24" stroke-linecap="round" stroke-dasharray="${(L * Math.min(1, p / 100)).toFixed(1)} ${L.toFixed(1)}"/></svg>`;
};
// Les 14 prochains jours : séances prévues (citron), jour de l'examen (bleu)
function daysStrip(x) {
  const t0 = startOfDay();
  const ts = examTasks(x).filter((t) => t.due);
  const exD = startOfDay(x.date);
  const fmt = new Intl.DateTimeFormat('fr-BE', { weekday: 'narrow' });
  return Array.from({ length: 14 }, (_, i) => {
    const b0 = new Date(t0); const d = new Date(b0.getFullYear(), b0.getMonth(), b0.getDate() + i).getTime();
    const n = ts.filter((t) => startOfDay(t.due) === d);
    const k = d === exD ? 'k-imp' : n.length ? (n.every((t) => t.done) ? 'k-team' : 'k-day') : '';
    return `<span class="xm-day ${k} ${i === 0 ? 'is-today' : ''}" title="${dateShort(d)}${n.length ? ` · ${n.length} séance${n.length > 1 ? 's' : ''}` : ''}${d === exD ? ' · examen' : ''}"><em>${fmt.format(d).toUpperCase()}</em><b>${new Date(d).getDate()}</b>${n.length && d !== exD ? `<i>${n.length}</i>` : ''}</span>`;
  }).join('');
}
function examHero(x) {
  const d = left(x.date);
  const g = examStats(x);
  const planned = S().tasks.some((t) => t.examId === x.id);
  const chs = (x.chapters || []).filter(Boolean);
  return `<section class="xm-hero rise" id="${x.id}">
      <header class="xm-h"><span class="xm-kick">${ic('target')}Prochain examen</span><button class="xm-edit" data-act="exam-edit" data-id="${x.id}" aria-label="Modifier l'examen">${ic('edit')}</button></header>
      <div class="xm-main">
        <div class="xm-cd ${d <= 3 ? 'is-soon' : ''}"><b>${d === 0 ? 'J' : d}</b><span>${d === 0 ? 'C\'est aujourd\'hui' : d === 1 ? 'jour' : 'jours'}</span></div>
        <div class="xm-info"><h2>${esc(x.title)}</h2><p>${subjChip(x.subjectId)}<span>${dateLong(x.date)}${new Date(x.date).getHours() ? ` · ${hhmm(new Date(x.date).getHours() * 60 + new Date(x.date).getMinutes())}` : ''}</span></p></div>
      </div>
      ${chs.length ? `<div class="xm-chaps">${chs.map((c) => `<span class="${chapterDone(x, c) ? 'is-done' : ''}">${ic('check')}${esc(c)}</span>`).join('')}</div>` : ''}
      <div class="xm-act">
        ${d >= 1 ? `<button class="xm-b1" data-act="exam-plan" data-id="${x.id}">${ic('sliders')}<span>${planned ? 'Refaire mon planning' : 'Planifier mes révisions'}</span></button>` : ''}
        <a class="xm-b2" href="#/concentration">${ic('hourglass')}<span>Lancer une séance</span></a>
        ${x.projectId && getProject(x.projectId) ? `<a class="xm-b2" href="#/projet/${x.projectId}">${ic('folder')}<span>Projet</span></a>` : ''}
      </div>
    </section>
    <section class="card fx xm-gauge rise">
      <header class="fx-h"><span class="fx-ic">${ic('book')}</span><h2>Révisions</h2></header>
      <div class="fx-g">${gauge(g.pct)}<p class="fx-gv"><b>${g.pct} %</b><span>${g.total ? `${g.done} séance${g.done > 1 ? 's' : ''} sur ${g.total}` : 'Aucune séance prévue'}</span></p></div>
      <p class="fx-gn">${g.next ? `<span class="fx-badge">${ic('clock')}</span><span>Prochaine : ${esc(g.next.title)} · ${when(g.next.due)}</span>` : g.total && g.done === g.total ? `<span class="fx-badge">${ic('check')}</span><span>Tout est révisé. Un dernier quiz ?</span>` : `<span class="fx-badge">${ic('sliders')}</span><span>Planifiez vos révisions : une séance par chapitre.</span>`}</p>
    </section>
    <section class="card fx xm-days-c rise">
      <header class="fx-h"><span class="fx-ic">${ic('calendar')}</span><h2>Les 14 prochains jours</h2></header>
      <div class="xm-days">${daysStrip(x)}</div>
      <ul class="fx-leg"><li><i class="k-day"></i>Séance prévue</li><li><i class="k-team"></i>Séances faites</li><li><i class="k-imp"></i>Examen</li></ul>
    </section>`;
}
const examCard = (x) => {
  const d = left(x.date);
  const g = examStats(x);
  const span = Math.min(1, Math.max(0, d) / 30);
  return `<a class="card xm-card rise ${d <= 3 ? 'is-soon' : ''}" href="#/etudes/examens?e=${x.id}" id="${x.id}">
    <span class="xm-c-cd"><b>${d === 0 ? 'J' : d}</b><em>${d === 1 ? 'jour' : d === 0 ? 'aujourd\'hui' : 'jours'}</em></span>
    <span class="xm-c-b"><b>${esc(x.title)}</b><span>${subject(x.subjectId) ? `${esc(subject(x.subjectId).name)} · ` : ''}${dateShort(x.date)}</span>
      <span class="xm-c-bar" style="--p:${g.pct}%;--t:${(1 - span) * 100}%"><i></i></span>
      <em>${g.total ? `${g.pct} % révisé` : 'Pas encore de séance'}</em></span>
    ${ic('chevR', 'chev')}</a>`;
};
export function examsView(params, q = {}) {
  const s = S(), t0 = startOfDay();
  const up = s.exams.filter((x) => x.date >= t0).sort((a, b) => a.date - b.date);
  const past = s.exams.filter((x) => x.date < t0).sort((a, b) => b.date - a.date);
  const focus = (q.e && up.find((x) => x.id === q.e)) || up[0];
  const html = `${pageHead('Examens', { back: '#/etudes', kicker: up.length ? `${up.length} à venir` : 'Compte à rebours et révisions', actions: `<button class="btn btn-primary fab-dup" data-act="exam-new">${ic('plus')}<span>Examen</span></button>` })}
    ${focus ? `<div class="xm-grid">${examHero(focus)}</div>` : ''}
    ${up.length > 1 ? `<h2 class="sec-title">Tous vos examens</h2><div class="xm-list">${up.map(examCard).join('')}</div>` : ''}
    ${past.length ? `<h2 class="sec-title">Passés</h2><ul class="rows card">${past.slice(0, 8).map((x) => `<li><div class="row"><span class="menu-ic">${ic('checkCircle')}</span><span class="row-b"><b>${esc(x.title)}</b><span>${subject(x.subjectId) ? `${esc(subject(x.subjectId).name)} · ` : ''}${dateShort(x.date)}</span></span><button class="icon-btn" data-act="exam-edit" data-id="${x.id}" aria-label="Modifier">${ic('edit')}</button></div></li>`).join('')}</ul>` : ''}
    ${s.exams.length ? '' : `<section class="card onboard-empty rise"><span class="empty-ic">${ic('target')}</span><h2>Ajoutez votre premier examen</h2>
        <p>La date, la matière et les chapitres : MindView compte les jours, crée un projet de révision avec une tâche par chapitre, et répartit vos révisions jour par jour.</p>
        <button class="btn btn-primary btn-lg" data-act="exam-new">${ic('plus')}<span>Ajouter un examen</span></button>
        ${demo(`<p class="dp-t">Examen d'histoire <span class="chip t-sand">J−9</span></p><p class="dp-s">Révolution française · Empire · Révolution industrielle</p><span class="bar olive"><i style="width:60%"></i></span>
          <div class="dp-row"><span class="tick is-done"></span><span><b>Fiche : la Révolution française</b><em>Lundi 17 h</em></span></div><div class="dp-row"><span class="tick"></span><span><b>Réviser : l'Empire</b><em>Jeudi 17 h</em></span></div>`)}</section>`}`;
  return {
    title: 'Examens', tab: 'etudes', fab: 'exam-new', html,
    after(root) { if (q.e) root.querySelector('.xm-hero')?.scrollIntoView({ block: 'start' }); },
  };
}
function examSheet(x = null) {
  const s = S();
  const v = x || { title: '', subjectId: s.subjects[0]?.id || '', date: startOfDay() + 14 * DAY + 9 * 3600e3, chapters: [] };
  const d = new Date(v.date);
  const local = new Date(v.date - d.getTimezoneOffset() * 60000).toISOString();
  sheet(`${sheetHead(x ? 'Modifier l\'examen' : 'Nouvel examen')}
    <form class="sheet-body form" data-form="exam" data-id="${x?.id || ''}" data-validate novalidate>
      ${field('Intitulé', input('title', v.title, 'required autofocus maxlength="60" placeholder="Examen d\'histoire, partiel de droit…"'))}
      <div class="form-2">${s.subjects.length ? field('Matière', select('subjectId', subjOptions(v.subjectId), v.subjectId)) : field('Matière', input('newSubject', '', 'maxlength="40" placeholder="Histoire"'))}${field('Date', `<input class="inp" type="date" name="date" value="${local.slice(0, 10)}" required>`)}</div>
      ${field('Heure (facultatif)', `<input class="inp" type="time" name="time" value="${d.getHours() ? local.slice(11, 16) : ''}">`)}
      ${field('Chapitres à réviser', `<textarea class="inp" name="chapters" rows="5" placeholder="Un chapitre par ligne&#10;La Révolution française&#10;L'Empire&#10;La révolution industrielle">${esc((v.chapters || []).join('\n'))}</textarea>`, 'Une tâche de révision sera créée pour chacun.')}
      ${x ? '' : `<label class="check-row"><input type="checkbox" name="project" ${canAddProject() ? 'checked' : 'disabled'}><span>Créer un projet de révision (une tâche par chapitre)${canAddProject() ? '' : ' — limite de projets atteinte en version gratuite'}</span></label>`}
      <button class="btn btn-primary btn-block" type="submit" data-needs="title" ${v.title ? '' : 'disabled'}>${x ? 'Enregistrer' : 'Ajouter l\'examen'}</button>
      ${x ? `<button type="button" class="btn btn-danger-ghost btn-block" data-act="exam-del" data-id="${x.id}">${ic('trash')}<span>Supprimer l'examen</span></button>` : ''}
    </form>`, { cls: 'sheet-tall' });
}

// Planificateur : répartit fiches puis révisions de chaque chapitre entre aujourd'hui et la veille de l'examen,
// avec au plus `perDay` séances par jour, et un examen blanc la veille.
export function buildPlan(exam, { start = startOfDay() + DAY, hour = 17, perDay = 2, mock = true } = {}) {
  const chapters = (exam.chapters || []).filter(Boolean).length ? exam.chapters.filter(Boolean) : [exam.title];
  const examDay = startOfDay(exam.date);
  const days = [];
  for (let t = startOfDay(start); t < examDay; t += DAY) days.push(t);
  if (!days.length) return [];
  const mockDay = mock && days.length >= 2 ? days.pop() : null;
  const n = days.length, C = chapters.length;
  const split = Math.max(1, Math.min(n - (n > 1 ? 1 : 0), Math.ceil(n * 0.6)));
  const load = new Map();
  const place = (i) => { let k = Math.min(i, n - 1); while (k < n - 1 && (load.get(k) || 0) >= perDay) k++; load.set(k, (load.get(k) || 0) + 1); return k; };
  const out = [];
  chapters.forEach((ch, i) => {
    const a = place(Math.floor((i * split) / C));
    out.push({ title: `Fiche : ${ch}`, day: days[a], k: a });
  });
  chapters.forEach((ch, i) => {
    const firstK = out[i].k;
    const want = n > split ? split + Math.floor((i * (n - split)) / C) : firstK + 1;
    const b = place(Math.max(want, firstK + 1));
    out.push({ title: `Réviser : ${ch}`, day: days[Math.min(b, n - 1)], k: b });
  });
  if (mockDay) out.push({ title: 'Examen blanc', day: mockDay, mock: true });
  return out.map((x, j) => ({ ...x, due: x.day + hour * 3600e3 + (j % perDay) * 45 * 60e3 }));
}
function planSheet(x) {
  if (!can('planner')) { sheet(`${sheetHead('Planificateur de révisions')}<div class="sheet-body">${paywall('planner', { compact: true })}</div>`, { cls: 'sheet-sm' }); return; }
  sheet(`${sheetHead('Planifier mes révisions', esc(x.title))}
    <form class="sheet-body form" data-form="exam-plan" data-id="${x.id}">
      <p class="sheet-p">Pour chaque chapitre : une fiche, puis une révision quelques jours plus tard${left(x.date) >= 3 ? ', et un examen blanc la veille' : ''}. Chaque séance devient une tâche datée, avec un rappel.</p>
      <div class="form-2">${field('Heure de travail', `<input class="inp" type="time" name="hour" value="17:00">`)}${field('Séances par jour', select('perDay', [[1, '1'], [2, '2'], [3, '3'], [4, '4']], 2))}</div>
      <label class="check-row"><input type="checkbox" name="mock" checked><span>Un examen blanc la veille</span></label>
      <button class="btn btn-primary btn-block" type="submit">${ic('check')}<span>Créer mon planning</span></button>
      <p class="sheet-note">Les séances déjà prévues pour cet examen et pas encore faites sont remplacées.</p>
    </form>`, { cls: 'sheet-sm' });
}

// ---------- Moyennes ----------
export function gradesView(params, q) {
  const head = pageHead('Moyennes', { back: '#/etudes', kicker: 'Notes, coefficients et objectif', actions: can('grades') ? `<button class="btn btn-primary fab-dup" data-act="grade-new">${ic('plus')}<span>Note</span></button>` : '' });
  if (!can('grades')) return { title: 'Moyennes', tab: 'etudes', html: `${head}${locked('grades', demo('<div class="dp-q"><span><b>Histoire</b><em>3 notes · coef. 2</em></span><span class="dp-qv"><b>14,5 / 20</b></span></div><div class="dp-q"><span><b>Maths</b><em>Il vous faut 12 au prochain contrôle</em></span><span class="dp-qv"><b>11,2 / 20</b></span></div>'))}` };
  const s = S();
  const target = Number(s.profile.target) || 12;
  const avg = generalAverage();
  const rows = s.subjects.map((x) => {
    const g = s.grades.filter((y) => y.subjectId === x.id).sort((a, b) => (b.date || 0) - (a.date || 0));
    const a = subjectAverage(x.id);
    // Note à obtenir au prochain contrôle (coef 1, sur 20) pour atteindre l'objectif dans la matière
    const w = g.reduce((n, y) => n + (Number(y.coef) || 1), 0);
    const need = g.length ? target * (w + 1) - (a || 0) * w : null;
    return `<section class="card gr-card k-${x.tone} rise">
      <header class="gr-h"><span class="gr-dot"></span><div><h2>${esc(x.name)}</h2><p>${g.length ? `${g.length} note${g.length > 1 ? 's' : ''}` : 'Aucune note'} · coef. ${num(Number(x.coef) || 1)}</p></div><b class="gr-avg ${a !== null && a < 10 ? 'is-low' : ''}">${fmtAvg(a)}<small> /20</small></b></header>
      ${a !== null ? `<div class="gr-bar"><span class="bar"><i style="width:${Math.min(100, (a / 20) * 100)}%"></i></span><i class="gr-target" style="left:${(target / 20) * 100}%" title="Objectif ${target}"></i></div>` : ''}
      ${need !== null ? `<p class="gr-need">${need <= 0 ? `Objectif ${num(target)} atteint dans cette matière.` : a >= target ? `Objectif ${num(target)} atteint : au prochain contrôle, ${num(Math.round(need * 10) / 10)}/20 suffit pour rester au-dessus.` : need > 20 ? `Objectif ${num(target)} difficile à atteindre en un seul contrôle : il faudrait ${num(Math.round(need * 10) / 10)}/20.` : `Pour ${num(target)} de moyenne, il vous faut <b>${num(Math.round(need * 10) / 10)}/20</b> au prochain contrôle.`}</p>` : ''}
      ${g.length ? `<ul class="gr-list">${g.map((y) => `<li><button class="row" data-act="grade-edit" data-id="${y.id}"><span class="row-b"><b>${esc(y.label || 'Contrôle')}</b><span>${y.date ? dateShort(y.date) : ''}${Number(y.coef) !== 1 ? ` · coef. ${num(Number(y.coef))}` : ''}</span></span><b class="gr-v">${num(Number(y.value))}<small>/${num(Number(y.max))}</small></b></button></li>`).join('')}</ul>` : ''}
      <button class="link" data-act="grade-new" data-s="${x.id}">${ic('plus')}Ajouter une note</button>
    </section>`;
  }).join('');
  const html = `${head}
    ${s.subjects.length ? `<section class="card gr-sum rise">
        <div class="hero-ring">${ring(avg || 0, 20, { size: 120, stroke: 10 })}<div class="hero-ring-v"><b>${fmtAvg(avg)}</b><span>/20</span></div></div>
        <div><h2>Moyenne générale</h2><p>${avg === null ? 'Ajoutez une première note pour la calculer.' : avg >= target ? `Au-dessus de votre objectif de ${num(target)}. Continuez.` : `Votre objectif : ${num(target)}. Il manque ${num(Math.round((target - avg) * 10) / 10)} point${target - avg >= 2 ? 's' : ''}.`}</p>
          <label class="field gr-target-f"><span class="field-l">Objectif</span>${select('target', [8, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((n) => [n, `${n} / 20`]), target, 'data-act-change="grade-target"')}</label></div>
      </section>
      <div class="gr-grid">${rows}</div>`
      : `<section class="card onboard-empty rise"><span class="empty-ic">${ic('award')}</span><h2>Commencez par vos matières</h2><p>Chaque matière a son coefficient ; chaque note, le sien. MindView calcule vos moyennes et la note qu'il vous faut au prochain contrôle.</p>
        <button class="btn btn-primary btn-lg" data-act="subject-new">${ic('plus')}<span>Ajouter une matière</span></button></section>`}
    ${subjectsCard()}`;
  return { title: 'Moyennes', tab: 'etudes', fab: 'grade-new', html };
}
function gradeSheet(g = null, preset = {}) {
  const s = S();
  if (!s.subjects.length) { subjectSheet(); return; }
  const v = g || { subjectId: preset.subjectId || s.subjects[0].id, value: '', max: 20, coef: 1, label: '', date: Date.now() };
  const d = new Date(v.date || Date.now());
  sheet(`${sheetHead(g ? 'Modifier la note' : 'Nouvelle note')}
    <form class="sheet-body form" data-form="grade" data-id="${g?.id || ''}" data-validate novalidate>
      ${field('Matière', select('subjectId', s.subjects.map((x) => [x.id, x.name]), v.subjectId))}
      <div class="form-3">${field('Note', input('value', v.value, 'type="number" step="0.25" min="0" required autofocus inputmode="decimal"'))}${field('Sur', input('max', v.max, 'type="number" step="1" min="1" inputmode="numeric"'))}${field('Coef.', input('coef', v.coef, 'type="number" step="0.5" min="0" inputmode="decimal"'))}</div>
      <div class="form-2">${field('Intitulé', input('label', v.label, 'maxlength="40" placeholder="Contrôle chapitre 3"'))}${field('Date', `<input class="inp" type="date" name="date" value="${new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)}">`)}</div>
      <p class="co-err" role="alert" hidden></p>
      <button class="btn btn-primary btn-block" type="submit">${g ? 'Enregistrer' : 'Ajouter la note'}</button>
      ${g ? `<button type="button" class="btn btn-danger-ghost btn-block" data-act="grade-del" data-id="${g.id}">${ic('trash')}<span>Supprimer la note</span></button>` : ''}
    </form>`, { cls: 'sheet-sm' });
}

// ---------- Révision espacée ----------
// Chaque question / réponse des notes devient une carte. Après chaque réponse, l'intervalle grandit
// (1 jour, puis environ ×2,5) si la carte est sue, et repart à zéro si elle ne l'est pas.
let srsSession = null;
const allCards = () => S().pages.flatMap((p) => qaCards(p).map((c) => ({ id: c.id, q: c.x, a: c.a, pid: p.id, page: p.title || 'Sans titre' })));
export function grade(card, r) {
  const prev = S().srs[card] || { int: 0, ease: 2.5, reps: 0, lapses: 0 };
  const x = { ...prev };
  if (r === 0) { x.int = 0; x.reps = 0; x.lapses = (x.lapses || 0) + 1; x.ease = Math.max(1.3, x.ease - 0.2); x.due = Date.now() + 10 * 60e3; }
  else {
    x.reps += 1;
    if (r === 1) { x.ease = Math.max(1.3, x.ease - 0.15); x.int = x.int ? x.int * 1.2 : 1; }
    if (r === 2) x.int = x.reps === 1 ? 1 : x.reps === 2 ? 3 : x.int * x.ease;
    if (r === 3) { x.ease += 0.15; x.int = x.reps === 1 ? 3 : x.int * x.ease * 1.3; }
    x.int = Math.min(365, Math.round(x.int * 10) / 10);
    x.due = startOfDay() + Math.max(1, Math.round(x.int)) * DAY + 4 * 3600e3;
  }
  x.last = Date.now();
  update((s) => { s.srs[card] = x; const k = dayKey(); s.srsLog = { ...(s.srsLog || {}), [k]: ((s.srsLog || {})[k] || 0) + 1 }; }, { silent: true });
}
export function revisionView(params, q) {
  const head = pageHead('Révision espacée', { back: '#/etudes', kicker: 'Chaque carte revient juste avant que vous l\'oubliiez' });
  if (!can('spaced')) return { title: 'Révision espacée', tab: 'etudes', html: `${head}${locked('spaced', demo('<p class="dp-t">Aujourd\'hui : 18 cartes <span class="chip t-olive">7 nouvelles</span></p><p class="dp-s">Révolution française · Anglais vocabulaire · Biologie</p><span class="bar olive"><i style="width:40%"></i></span>'))}` };
  const s = S(), now = Date.now();
  const cards = allCards();
  const pages = [...new Map(cards.map((c) => [c.pid, c.page])).entries()];
  const deckPid = pages.some(([id]) => id === q.p) ? q.p : '';
  const pool = cards.filter((c) => !deckPid || c.pid === deckPid);
  const due = pool.filter((c) => (s.srs[c.id]?.due || 0) <= now);
  const fresh = due.filter((c) => !s.srs[c.id]);
  const learned = pool.filter((c) => (s.srs[c.id]?.int || 0) >= 21).length;
  if (q.go && (!srsSession || srsSession.deck !== deckPid)) {
    const queue = [...due.filter((c) => s.srs[c.id]), ...fresh.slice(0, 20)].map((c) => c.id);
    srsSession = { deck: deckPid, queue, i: 0, shown: false, done: 0, ok: 0 };
  }
  if (q.go && srsSession) {
    const ses = srsSession;
    if (ses.i >= ses.queue.length) {
      const html = `${head}<section class="card qz-res rise"><div class="hero-ring">${ring(ses.ok, Math.max(1, ses.done), { size: 140, stroke: 11 })}<div class="hero-ring-v"><b>${ses.done}</b><span>cartes</span></div></div>
        <div><h2>${ses.done ? 'Révision du jour terminée' : 'Rien à réviser maintenant'}</h2><p>${ses.done ? `${ses.ok} sue${ses.ok > 1 ? 's' : ''} sur ${ses.done}. Les cartes ratées reviennent dans dix minutes ; les autres, dans quelques jours.` : 'Toutes vos cartes sont à jour. Revenez demain.'}</p></div></section>
        <div class="act-row"><a class="btn btn-primary" href="#/etudes/revision">Terminer</a></div>`;
      return { title: 'Révision espacée', tab: 'etudes', html, after() { srsSession = null; } };
    }
    const c = cards.find((x) => x.id === ses.queue[ses.i]);
    if (!c) { ses.i++; return revisionView(params, q); }
    const st = s.srs[c.id];
    const nextLbl = (r) => { if (r === 0) return '10 min'; const sim = { ...(st || { int: 0, ease: 2.5, reps: 0 }) }; sim.reps += 1; const i = r === 1 ? (sim.int ? sim.int * 1.2 : 1) : r === 2 ? (sim.reps === 1 ? 1 : sim.reps === 2 ? 3 : sim.int * sim.ease) : (sim.reps === 1 ? 3 : sim.int * (sim.ease + 0.15) * 1.3); const d = Math.max(1, Math.round(i)); return d === 1 ? '1 jour' : d < 30 ? `${d} jours` : `${Math.round(d / 30)} mois`; };
    const html = `${pageHead('Révision espacée', { back: '#/etudes/revision', kicker: `Carte ${ses.i + 1} sur ${ses.queue.length} · ${esc(c.page)}` })}
      ${bar(ses.i, ses.queue.length, 'olive')}
      <section class="card fcard ${ses.shown ? 'is-flip' : ''} rise" aria-live="polite">
        <p class="fc-k">Question${st ? '' : ' · nouvelle'}</p><p class="fc-q">${esc(c.q)}</p>
        ${ses.shown ? `<p class="fc-k">Réponse</p><p class="fc-a">${esc(c.a)}</p>` : ''}
      </section>
      ${ses.shown ? `<div class="srs-acts">${[[0, 'À revoir', 'rose'], [1, 'Difficile', 'sand'], [2, 'Bien', 'blue'], [3, 'Facile', 'olive']].map(([r, l, t]) => `<button class="srs-b k-${t}" data-act="srs-rate" data-v="${r}" data-id="${c.id}"><b>${l}</b><span>${nextLbl(r)}</span></button>`).join('')}</div>`
        : '<button class="btn btn-primary btn-lg btn-block" data-act="srs-show">Voir la réponse</button>'}`;
    return {
      title: 'Révision', tab: 'etudes', html,
      after(root) {
        const onKey = (e) => {
          if (e.target.closest('input, textarea, select')) return;
          if (!ses.shown && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); root.querySelector('[data-act="srs-show"]')?.click(); }
          else if (ses.shown && ['1', '2', '3', '4'].includes(e.key)) root.querySelector(`[data-v="${+e.key - 1}"]`)?.click();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
      },
    };
  }
  const log = s.srsLog || {};
  const week = Array.from({ length: 7 }, (_, i) => log[dayKey(startOfDay() - (6 - i) * DAY)] || 0);
  const html = `${head}
    ${cards.length ? `<section class="card srs-hero rise">
        <div class="hero-ring">${ring(pool.length - due.length, Math.max(1, pool.length), { size: 120, stroke: 10 })}<div class="hero-ring-v"><b>${num(due.length)}</b><span>à réviser</span></div></div>
        <div><h2>${due.length ? `${due.length} carte${due.length > 1 ? 's' : ''} aujourd'hui` : 'Tout est à jour'}</h2><p>${fresh.length ? `Dont ${Math.min(20, fresh.length)} nouvelle${fresh.length > 1 ? 's' : ''} (20 au plus par jour). ` : ''}${learned} carte${learned > 1 ? 's' : ''} maîtrisée${learned > 1 ? 's' : ''} sur ${pool.length}.</p>
          ${pages.length > 1 ? `<label class="field"><span class="field-l">Paquet</span>${select('deck', [['', 'Toutes les pages'], ...pages], deckPid, 'data-act-change="srs-deck"')}</label>` : ''}
          ${due.length ? `<a class="btn btn-primary" href="#/etudes/revision?go=1${deckPid ? `&p=${deckPid}` : ''}">${ic('play')}<span>Commencer</span></a>` : ''}</div>
      </section>
      <section class="card rise"><header class="card-h"><div><h2>Cette semaine</h2><p>${week.reduce((a, b) => a + b, 0)} cartes révisées</p></div></header>
        <div class="mini-bars">${week.map((v, i) => `<span style="--v:${Math.min(100, (v / Math.max(1, ...week)) * 100)}%"><i></i><em>${WDS[(new Date(startOfDay() - (6 - i) * DAY).getDay() + 6) % 7]}</em></span>`).join('')}</div></section>`
      : `<section class="card onboard-empty rise"><span class="empty-ic">${ic('cards')}</span><h2>Créez vos premières cartes</h2><p>Dans une page de notes, ajoutez des blocs « Question / réponse » (tapez « ?? » puis espace). Chacun devient une carte, qui revient au bon moment.</p>
        <button class="btn btn-primary btn-lg" data-act="page-new" data-tpl="revision">${ic('plus')}<span>Créer une fiche de révision</span></button></section>`}`;
  return { title: 'Révision espacée', tab: 'etudes', html };
}

// ---------- Mode concentration ----------
// Trois façons de compter le temps : Pomodoro (travail puis pause), minuteur à la durée choisie, chronomètre.
// Plus une calculatrice, sur le même écran.
const FKEY = 'msdev:focus';
let timer = (() => { try { return JSON.parse(localStorage.getItem(FKEY) || 'null'); } catch (e) { return null; } })();
if (timer && !timer.mode) timer.mode = 'pomo';
const saveTimer = () => { try { if (timer) localStorage.setItem(FKEY, JSON.stringify(timer)); else localStorage.removeItem(FKEY); } catch (e) { /* rien */ } };
const MODES = [['pomo', 'Pomodoro', 'repeat'], ['timer', 'Minuteur', 'hourglass'], ['chrono', 'Chronomètre', 'clock']];
const tmode = () => timer?.mode || S().focus.mode || 'pomo';
const newTimer = (m = tmode(), keep = {}) => {
  const s = S();
  if (m === 'chrono') return { mode: 'chrono', running: false, acc: 0, start: 0, laps: [], ...keep };
  const total = (m === 'timer' ? s.focus.timerMin || 10 : s.focus.work) * 60e3;
  return { mode: m, phase: 'work', total, left: total, running: false, label: '', subjectId: '', taskId: '', ...keep };
};
const keepOf = (t) => ({ label: t?.label || '', subjectId: t?.subjectId || '', taskId: t?.taskId || '' });
const remaining = () => (timer && timer.mode !== 'chrono' ? (timer.running ? Math.max(0, timer.end - Date.now()) : timer.left) : (tmode() === 'timer' ? (S().focus.timerMin || 10) : S().focus.work) * 60e3);
const elapsed = () => (timer?.mode === 'chrono' ? timer.acc + (timer.running ? Date.now() - timer.start : 0) : 0);
const fmtClock = (ms, up = false) => {
  const t = up ? Math.floor(ms / 1000) : Math.ceil(ms / 1000);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  return `${h ? `${h}:` : ''}${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};
function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [660, 880].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; o.type = 'sine'; g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18); g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + i * 0.18 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.5); o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + i * 0.18); o.stop(ctx.currentTime + i * 0.18 + 0.55); });
  } catch (e) { /* son indisponible */ }
}
const logSession = (min, t) => update((s) => { s.focus.sessions.push({ id: uid(), at: Date.now(), min, label: t?.label || '', subjectId: t?.subjectId || null, taskId: t?.taskId || null }); s.focus.sessions = s.focus.sessions.slice(-2000); }, { silent: true });
function finishPhase() {
  if (!timer || timer.mode === 'chrono') return;
  if (timer.mode === 'timer') {
    const min = Math.round(timer.total / 60e3);
    if (min >= 1) logSession(min, timer);
    timer = newTimer('timer', keepOf(timer));
    toast(min >= 1 ? `${min} minute${min > 1 ? 's' : ''} enregistrée${min > 1 ? 's' : ''} dans vos séances.` : 'Le temps est écoulé.', { title: 'Minuteur terminé' });
  } else if (timer.phase === 'work') {
    const min = Math.round(timer.total / 60e3);
    logSession(min, timer);
    timer = { ...timer, phase: 'pause', total: S().focus.pause * 60e3, end: Date.now() + S().focus.pause * 60e3, running: true, rounds: (timer.rounds || 0) + 1 };
    toast(`${min} minutes de travail enregistrées. Pause de ${S().focus.pause} minutes.`, { title: 'Bien joué' });
  } else {
    timer = { ...timer, phase: 'work', total: S().focus.work * 60e3, left: S().focus.work * 60e3, running: false };
    toast('Prêt pour la séance suivante ?', { title: 'Fin de la pause' });
  }
  chime(); saveTimer(); rr();
}

// Calculatrice : + − × ÷, puissances, racine, pourcentage, parenthèses. Calcul sans eval (analyse pas à pas).
export function calc(src) {
  const s = String(src).replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/,/g, '.').replace(/\s+/g, '');
  let i = 0, pct = false;
  const peek = () => s[i];
  const num = () => { const m = /^\d*\.?\d+(e[+-]?\d+)?|^\d+\./.exec(s.slice(i)); if (!m) throw new Error('nombre'); i += m[0].length; return parseFloat(m[0]); };
  const primary = () => {
    if (peek() === '(') { i++; const v = expr(); if (peek() === ')') i++; return v; }
    if (peek() === '√') { i++; return Math.sqrt(unary()); }
    return num();
  };
  const postfix = () => { let v = primary(); while (peek() === '%' || peek() === '²') { if (peek() === '%') { v /= 100; pct = true; } else v *= v; i++; } return v; };
  const unary = () => { if (peek() === '-') { i++; return -unary(); } if (peek() === '+') { i++; return unary(); } return postfix(); };
  const power = () => { const b = unary(); if (peek() === '^') { i++; return b ** power(); } return b; };
  const term = () => { pct = false; let v = power(); while (peek() === '*' || peek() === '/') { const o = s[i++]; const r = power(); pct = false; v = o === '*' ? v * r : v / r; } return v; };
  // « 50 + 10 % » = 55, comme sur une calculatrice de téléphone
  const expr = () => { let v = term(); while (peek() === '+' || peek() === '-') { const o = s[i++]; let r = term(); if (pct) r *= v; v = o === '+' ? v + r : v - r; } return v; };
  const v = expr();
  if (i < s.length || !Number.isFinite(v)) throw new Error('calcul');
  return v;
}
const calcFmt = (v) => String(+v.toPrecision(12)).replace('.', ',').replace(/e\+?/, ' × 10^');
const KEYS = [['C', 'fn'], ['(', 'fn'], [')', 'fn'], ['÷', 'op'], ['√', 'fn'], ['7'], ['8'], ['9'], ['×', 'op'], ['x²', 'fn'], ['4'], ['5'], ['6'], ['−', 'op'], ['%', 'fn'], ['1'], ['2'], ['3'], ['+', 'op'], ['⌫', 'fn'], ['±', 'fn'], ['0'], [','], ['=', 'eq'], ['^', 'fn']];
const calcCard = () => `<section class="card fx fo-calc rise" aria-label="Calculatrice">
    <header class="fx-h"><span class="fx-ic">${ic('calculator')}</span><h2>Calculatrice</h2></header>
    <div class="calc" tabindex="0">
      <p class="calc-hist" aria-live="polite">&nbsp;</p>
      <output class="calc-out">0</output>
      <div class="calc-keys">${KEYS.map(([k, c = '']) => `<button type="button" class="ck ${c ? `ck-${c}` : ''}" data-k="${k}" aria-label="${{ C: 'Effacer tout', '⌫': 'Effacer le dernier caractère', '±': 'Changer le signe', 'x²': 'Au carré', '√': 'Racine carrée', '^': 'Puissance' }[k] || k}">${k}</button>`).join('')}</div>
    </div></section>`;
function mountCalc(root) {
  const box = root.querySelector('.calc'); if (!box) return () => {};
  const out = box.querySelector('.calc-out'), hist = box.querySelector('.calc-hist');
  let e = '', done = false;
  const show = () => {
    out.textContent = e || '0';
    if (done) return;
    try { hist.textContent = e && /[+×÷−^%²√(]/.test(e.slice(1)) ? `= ${calcFmt(calc(e))}` : ' '; } catch (err) { hist.textContent = ' '; }
  };
  const press = (k) => {
    const ops = ['+', '−', '×', '÷', '^'];
    if (k === 'C') { e = ''; done = false; hist.textContent = ' '; show(); return; }
    if (k === '⌫') { e = done ? '' : e.slice(0, -1); done = false; show(); return; }
    if (k === '=') { if (!e) return; try { const r = calcFmt(calc(e)); hist.textContent = `${e} =`; e = r; done = true; } catch (err) { hist.textContent = 'Calcul impossible'; } out.textContent = e || '0'; return; }
    if (done) { if (ops.includes(k) || k === '%' || k === 'x²') done = false; else { e = ''; done = false; } }
    if (k === '±') { const m = /(^|[+×÷^(−])(−?)(\d+(?:,\d*)?)$/.exec(e); if (m) e = e.slice(0, m.index) + m[1] + (m[2] ? '' : '−') + m[3]; else if (!e) e = '−'; show(); return; }
    if (k === 'x²') k = '²';
    if (ops.includes(k) && ops.includes(e.slice(-1))) e = e.slice(0, -1);
    if (k === ',' && /\d*,\d*$/.test(e)) return;
    if (e.length < 48) e += k;
    show();
  };
  const onClick = (ev) => { const b = ev.target.closest('.ck'); if (b) { press(b.dataset.k); box.focus({ preventScroll: true }); } };
  const MAP = { '*': '×', x: '×', '/': '÷', '-': '−', '.': ',', Enter: '=', '=': '=', Backspace: '⌫', Escape: 'C', Delete: 'C' };
  const onKey = (ev) => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = MAP[ev.key] || ev.key;
    if (/^[0-9]$/.test(k) || ['+', '−', '×', '÷', '(', ')', ',', '%', '^', '=', '⌫', 'C'].includes(k)) {
      ev.preventDefault(); press(k);
      const b = box.querySelector(`.ck[data-k="${CSS.escape(k)}"]`); if (b) { b.classList.add('is-hit'); setTimeout(() => b.classList.remove('is-hit'), 120); }
    }
  };
  box.addEventListener('click', onClick);
  box.addEventListener('keydown', onKey);
  return () => { box.removeEventListener('click', onClick); box.removeEventListener('keydown', onKey); };
}

export function focusView() {
  const head = pageHead('Concentration', { back: '#/etudes', kicker: 'Minuteur, chronomètre et calculatrice' });
  if (!can('focus')) return { title: 'Concentration', tab: 'etudes', html: `${head}${locked('focus', demo('<p class="dp-t">25:00 <span class="chip t-olive">Histoire</span></p><p class="dp-s">4 séances aujourd\'hui · 1 h 40 de travail</p>'))}` };
  const s = S();
  const m = tmode();
  const t = timer && timer.mode === m ? timer : newTimer(m);
  const chrono = m === 'chrono';
  const ms = chrono ? elapsed() : remaining();
  const todayMin = focusMinutes(startOfDay());
  const todaySes = s.focus.sessions.filter((x) => x.at >= startOfDay());
  const open = s.tasks.filter((x) => !x.done).sort((a, b) => (a.due || 9e15) - (b.due || 9e15)).slice(0, 30);
  const week = Array.from({ length: 7 }, (_, i) => focusMinutes(startOfWeek() + i * DAY, startOfWeek() + (i + 1) * DAY));
  const bySubj = s.subjects.map((x) => [x, s.focus.sessions.filter((y) => y.subjectId === x.id && y.at >= startOfWeek()).reduce((n, y) => n + y.min, 0)]).filter(([, mm]) => mm);
  const busy = timer?.running;
  const what = esc(t.label || subject(t.subjectId)?.name || (t.taskId && s.tasks.find((x) => x.id === t.taskId)?.title) || (chrono ? 'Chronomètre' : m === 'timer' ? 'Minuteur' : 'Concentration'));
  const tm = s.focus.timerMin || 10;
  const html = `${head}
    <div class="fo-top">
    <section class="card fo-card ${t.phase === 'pause' ? 'is-pause' : ''} rise">
      <div class="fo-modes" role="tablist" aria-label="Mode">${MODES.map(([id, l, i]) => `<button class="${id === m ? 'is-on' : ''}" role="tab" aria-selected="${id === m}" data-act="fo-mode" data-m="${id}">${ic(i)}<span>${l}</span></button>`).join('')}</div>
      <p class="fo-phase">${chrono ? (t.running ? 'En cours' : t.acc ? 'En pause' : 'Prêt') : m === 'timer' ? `Minuteur · ${hhmm(Math.round(t.total / 60e3))}` : `${t.phase === 'pause' ? 'Pause' : 'Travail'}${t.rounds ? ` · séance ${t.rounds + (t.phase === 'work' ? 1 : 0)}` : ''}`}</p>
      <div class="fo-ring">${chrono ? ring(ms % 60000, 60000, { size: 240, stroke: 12 }) : ring(t.total - ms, t.total, { size: 240, stroke: 12 })}<div class="fo-time"><b class="fo-clock">${fmtClock(ms, chrono)}</b><span>${what}</span></div></div>
      <div class="fo-acts">
        <button class="btn btn-primary btn-lg" data-act="fo-toggle">${ic(t.running ? 'pause' : 'play')}<span>${t.running ? 'Pause' : (chrono ? t.acc : ms < t.total) ? 'Reprendre' : 'Démarrer'}</span></button>
        ${chrono ? `<button class="icon-btn" data-act="fo-lap" aria-label="Tour" title="Tour" ${t.running ? '' : 'disabled'}>${ic('flag')}</button><button class="icon-btn" data-act="fo-save" aria-label="Enregistrer la séance" title="Enregistrer la séance" ${t.acc || t.running ? '' : 'disabled'}>${ic('check')}</button>` : ''}
        <button class="icon-btn" data-act="fo-reset" aria-label="Recommencer" title="Recommencer">${ic('refresh')}</button>
        ${m === 'pomo' ? `<button class="icon-btn" data-act="fo-skip" aria-label="Passer à la suite" title="Passer à la suite">${ic('arrowR')}</button>` : ''}
        <button class="icon-btn" data-act="fo-full" aria-label="Plein écran" title="Plein écran">${ic('fit')}</button>
      </div>
      ${chrono && t.laps?.length ? `<ol class="fo-laps">${t.laps.map((x, i) => `<li><span>Tour ${i + 1}</span><b>${fmtClock(x - (t.laps[i - 1] || 0), true)}</b><em>${fmtClock(x, true)}</em></li>`).reverse().join('')}</ol>` : ''}
      ${busy ? '' : `<form class="fo-set form" data-form="${m === 'timer' ? 'fo-custom' : 'focus-set'}">
        ${m === 'pomo' ? `<div class="chips-wrap">${[[25, 5], [50, 10], [15, 3], [90, 15]].map(([w, p]) => `<button type="button" class="chip-btn ${s.focus.work === w && s.focus.pause === p ? 'is-on' : ''}" data-act="fo-preset" data-w="${w}" data-p="${p}">${w} / ${p} min</button>`).join('')}</div>` : ''}
        ${m === 'timer' ? `<div class="chips-wrap">${[5, 10, 15, 20, 30, 45, 60, 90].map((v) => `<button type="button" class="chip-btn ${tm === v ? 'is-on' : ''}" data-act="fo-dur" data-v="${v}">${v < 60 ? `${v} min` : hhmm(v)}</button>`).join('')}</div>
          <div class="fo-custom"><label><input class="inp" type="number" name="h" min="0" max="12" inputmode="numeric" value="${Math.floor(tm / 60) || ''}" placeholder="0"><span>h</span></label><label><input class="inp" type="number" name="m" min="0" max="59" inputmode="numeric" value="${tm % 60 || ''}" placeholder="0"><span>min</span></label><button class="btn btn-ghost btn-sm" type="submit">Régler</button></div>` : ''}
        <div class="form-2">${s.subjects.length ? field('Matière', select('subjectId', subjOptions(t.subjectId, 'Aucune'), t.subjectId || '', 'data-act-change="fo-field"')) : ''}${field('Tâche', select('taskId', [['', 'Aucune'], ...open.map((x) => [x.id, x.title.slice(0, 50)])], t.taskId || '', 'data-act-change="fo-field"'))}</div>
      </form>`}
    </section>
    ${calcCard()}
    </div>
    <div class="st-two">
      <section class="card rise"><header class="card-h"><div><h2>Aujourd'hui</h2><p>${todaySes.length} séance${todaySes.length > 1 ? 's' : ''} · ${hhmm(todayMin)}</p></div></header>
        ${todaySes.length ? `<ul class="rows">${todaySes.slice().reverse().slice(0, 8).map((x) => `<li><div class="row"><span class="menu-ic">${ic('hourglass')}</span><span class="row-b"><b>${esc(x.label || subject(x.subjectId)?.name || s.tasks.find((y) => y.id === x.taskId)?.title || 'Séance de travail')}</b><span>${new Date(x.at).getHours()} h ${String(new Date(x.at).getMinutes()).padStart(2, '0')}</span></span><b>${x.min} min</b></div></li>`).join('')}</ul>` : '<p class="muted pad">Lancez une première séance : elle s\'enregistre ici.</p>'}
      </section>
      <section class="card rise"><header class="card-h"><div><h2>Cette semaine</h2><p>${hhmm(week.reduce((a, b) => a + b, 0))} de travail</p></div>${can('focusStats') ? '' : '<span class="badge b-premium">Premium</span>'}</header>
        ${can('focusStats') ? `<div class="mini-bars">${week.map((v, i) => `<span style="--v:${Math.min(100, (v / Math.max(1, ...week)) * 100)}%" title="${hhmm(v)}"><i></i><em>${WDS[i]}</em></span>`).join('')}</div>
          ${bySubj.length ? `<ul class="fo-subj">${bySubj.map(([x, mm]) => `<li><span class="subj k-${x.tone}"><i></i>${esc(x.name)}</span>${bar(mm, Math.max(...bySubj.map((r) => r[1])), '')}<b>${hhmm(mm)}</b></li>`).join('')}</ul>` : ''}`
          : '<p class="muted pad">Vos heures de travail par jour et par matière, et votre régularité, avec Premium.</p>'}
      </section>
    </div>`;
  return {
    title: 'Concentration', tab: 'etudes', html,
    after(root) {
      const clock = root.querySelector('.fo-clock');
      const arc = root.querySelector('.fo-ring .ring-fg');
      const c = arc ? parseFloat(arc.getAttribute('stroke-dasharray')) : 0;
      const tick = () => {
        if (!timer?.running) return;
        if (timer.mode === 'chrono') {
          const e = elapsed();
          if (clock) clock.textContent = fmtClock(e, true);
          document.title = `${fmtClock(e, true)} · Chronomètre`;
          if (arc) arc.setAttribute('stroke-dashoffset', String(c * (1 - (e % 60000) / 60000)));
          return;
        }
        const r = remaining();
        if (clock) clock.textContent = fmtClock(r);
        document.title = `${fmtClock(r)} · Concentration`;
        if (arc) arc.setAttribute('stroke-dashoffset', String(c * (r / timer.total)));
        if (r <= 0) finishPhase();
      };
      const iv = setInterval(tick, 250);
      const offCalc = mountCalc(root);
      return () => { clearInterval(iv); offCalc(); };
    },
  };
}
// Le minuteur continue même hors de l'écran Concentration
setInterval(() => { if (timer?.running && timer.mode !== 'chrono' && Date.now() >= timer.end && !location.hash.startsWith('#/concentration')) finishPhase(); }, 2000);

register({
  'subject-new': () => subjectSheet(),
  'subject-edit': (b) => subjectSheet(subject(b.dataset.id)),
  'subject-quick': (b) => { update((s) => { s.subjects.push({ id: 'sj-' + uid(), name: b.dataset.n, tone: TONES[s.subjects.length % TONES.length], coef: 1 }); }); toast(`${esc(b.dataset.n)} ajoutée`, { ms: 1400 }); },
  'subject-del': async (b) => {
    const x = subject(b.dataset.id);
    if (!await confirmSheet({ title: `Supprimer ${esc(x.name)} ?`, text: 'Ses cours et ses notes sont supprimés ; les examens et séances restent, sans matière.', ok: 'Supprimer', danger: true })) return;
    update((s) => { s.subjects = s.subjects.filter((y) => y.id !== x.id); s.courses = s.courses.filter((c) => c.subjectId !== x.id); s.grades = s.grades.filter((g) => g.subjectId !== x.id); s.exams.forEach((e) => { if (e.subjectId === x.id) e.subjectId = null; }); });
    toast('Matière supprimée');
  },
  'course-new': () => { if (!can('timetable')) { location.hash = '#/etudes/emploi'; return; } courseSheet(); },
  'course-edit': (b) => courseSheet(S().courses.find((c) => c.id === b.dataset.id)),
  'course-del': async (b) => { if (!await confirmSheet({ title: 'Supprimer ce cours ?', text: 'Il disparaît de toutes les semaines.', ok: 'Supprimer', danger: true })) return; update((s) => { s.courses = s.courses.filter((c) => c.id !== b.dataset.id); }); toast('Cours supprimé'); },
  'exam-new': () => examSheet(),
  'exam-edit': (b) => examSheet(S().exams.find((x) => x.id === b.dataset.id)),
  'exam-plan': (b) => planSheet(S().exams.find((x) => x.id === b.dataset.id)),
  'exam-del': async (b) => {
    const x = S().exams.find((y) => y.id === b.dataset.id);
    if (!await confirmSheet({ title: `Supprimer « ${esc(x.title)} » ?`, text: 'Les séances de révision pas encore faites sont supprimées. Le projet de révision est conservé.', ok: 'Supprimer', danger: true })) return;
    update((s) => { s.exams = s.exams.filter((y) => y.id !== x.id); s.tasks = s.tasks.filter((t) => !(t.examId === x.id && !t.done)); });
    closeSheet(); toast('Examen supprimé');
  },
  'grade-new': (b) => gradeSheet(null, { subjectId: b?.dataset?.s }),
  'grade-edit': (b) => gradeSheet(S().grades.find((g) => g.id === b.dataset.id)),
  'grade-del': (b) => { update((s) => { s.grades = s.grades.filter((g) => g.id !== b.dataset.id); }); closeSheet(); toast('Note supprimée'); },
  'grade-target': (el) => update((s) => { s.profile.target = Number(el.value) || 12; }),
  'srs-show': () => { if (srsSession) { srsSession.shown = true; rr(); } },
  'srs-rate': (b) => {
    const r = +b.dataset.v;
    grade(b.dataset.id, r);
    const ses = srsSession; if (!ses) return;
    ses.done++; if (r > 0) ses.ok++;
    if (r === 0) ses.queue.push(b.dataset.id);
    ses.i++; ses.shown = false; rr();
  },
  'srs-deck': (el) => { location.hash = `#/etudes/revision${el.value ? `?p=${el.value}` : ''}`; },
  'fo-toggle': () => {
    if (!timer || timer.mode !== tmode()) timer = newTimer(tmode(), keepOf(timer));
    if (timer.mode === 'chrono') {
      if (timer.running) { timer.acc += Date.now() - timer.start; timer.running = false; }
      else { timer.start = Date.now(); timer.running = true; }
    } else if (timer.running) { timer.left = Math.max(0, timer.end - Date.now()); timer.running = false; }
    else { timer.end = Date.now() + (timer.left ?? timer.total); timer.running = true; }
    saveTimer(); rr();
  },
  'fo-reset': () => { timer = timer ? newTimer(timer.mode, keepOf(timer)) : null; saveTimer(); document.title = 'Concentration · MindView'; rr(); },
  'fo-skip': () => { if (!timer) return; if (timer.phase === 'work') { timer = { ...timer, total: Math.max(60e3, timer.total - remaining()) }; } finishPhase(); },
  'fo-full': () => { const el = document.querySelector('.fo-card'); if (document.fullscreenElement) document.exitFullscreen?.(); else el?.requestFullscreen?.().catch(() => toast('Le plein écran n\'est pas disponible ici.')); },
  'fo-preset': (b) => { update((s) => { s.focus.work = +b.dataset.w; s.focus.pause = +b.dataset.p; }); if (timer && !timer.running && timer.phase === 'work') { timer = { ...timer, total: +b.dataset.w * 60e3, left: +b.dataset.w * 60e3 }; saveTimer(); rr(); } },
  'fo-field': (el) => { timer = { ...(timer && timer.mode === tmode() ? timer : newTimer(tmode(), keepOf(timer))), [el.name]: el.value }; saveTimer(); rr(); },
  // Changer de mode : seulement à l'arrêt, pour ne rien perdre
  'fo-mode': (b) => {
    if (timer?.running) { toast('Mettez d\'abord le temps en cours en pause.', { title: 'Déjà lancé' }); return; }
    const keep = keepOf(timer);
    update((s) => { s.focus.mode = b.dataset.m; });
    timer = newTimer(b.dataset.m, keep); saveTimer(); rr();
  },
  'fo-dur': (b) => { const v = +b.dataset.v; update((s) => { s.focus.timerMin = v; }); timer = newTimer('timer', keepOf(timer)); saveTimer(); rr(); },
  'fo-lap': () => { if (timer?.mode !== 'chrono' || !timer.running) return; timer.laps = [...(timer.laps || []), elapsed()].slice(-30); saveTimer(); rr(); },
  'fo-save': () => {
    if (timer?.mode !== 'chrono') return;
    const min = Math.round(elapsed() / 60e3);
    if (min < 1) { toast('Moins d\'une minute : rien à enregistrer.', { title: 'Chronomètre' }); return; }
    logSession(min, timer);
    timer = newTimer('chrono', keepOf(timer)); saveTimer(); rr();
    toast(`${min} minute${min > 1 ? 's' : ''} ajoutée${min > 1 ? 's' : ''} à vos séances.`, { title: 'Séance enregistrée' });
  },
}, {
  // Minuteur : une durée au choix, de 1 minute à 12 heures
  'fo-custom': (d) => {
    const v = Math.min(720, (Number(d.h) || 0) * 60 + (Number(d.m) || 0));
    if (v < 1) { toast('Choisissez au moins une minute.', { title: 'Minuteur' }); return; }
    update((s) => { s.focus.timerMin = v; });
    timer = newTimer('timer', keepOf(timer)); saveTimer(); rr();
  },
  subject: (d, f) => {
    const name = (d.name || '').trim(); if (!name) return;
    const patch = { name, tone: d.tone || 'blue', coef: Math.max(0, Number(d.coef) || 1) };
    if (f.dataset.id) update((s) => { Object.assign(s.subjects.find((x) => x.id === f.dataset.id), patch); });
    else update((s) => { s.subjects.push({ id: 'sj-' + uid(), ...patch }); });
    closeSheet(); toast(f.dataset.id ? 'Matière enregistrée' : `${esc(name)} ajoutée`);
  },
  course: (d, f) => {
    const err = f.querySelector('.co-err');
    if (toMin(d.end) <= toMin(d.start)) { err.textContent = 'La fin doit être après le début.'; err.hidden = false; return; }
    let subjectId = d.subjectId || '';
    const title = (d.title || '').trim();
    if (!subjectId && title) {
      const ex = S().subjects.find((x) => x.name.toLowerCase() === title.toLowerCase());
      subjectId = ex?.id || 'sj-' + uid();
      if (!ex) update((s) => { s.subjects.push({ id: subjectId, name: title, tone: TONES[s.subjects.length % TONES.length], coef: 1 }); }, { silent: true });
    }
    if (!subjectId) { err.textContent = 'Choisissez une matière ou écrivez un intitulé.'; err.hidden = false; return; }
    const patch = { subjectId, title: subjectId ? '' : title, day: +d.day, start: d.start, end: d.end, room: (d.room || '').trim(), teacher: (d.teacher || '').trim() };
    if (f.dataset.id) update((s) => { Object.assign(s.courses.find((c) => c.id === f.dataset.id), patch); });
    else update((s) => { s.courses.push({ id: 'co-' + uid(), ...patch }); });
    closeSheet(); toast(f.dataset.id ? 'Cours enregistré' : 'Cours ajouté à chaque semaine');
  },
  exam: (d, f) => {
    const title = (d.title || '').trim(); if (!title || !d.date) return;
    const [h, m] = (d.time || '').split(':').map(Number);
    const date = new Date(`${d.date}T00:00`).getTime() + ((h || 0) * 60 + (m || 0)) * 60e3;
    const chapters = (d.chapters || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 40);
    let subjectId = d.subjectId || null;
    if (!subjectId && (d.newSubject || '').trim()) { subjectId = 'sj-' + uid(); update((s) => { s.subjects.push({ id: subjectId, name: d.newSubject.trim(), tone: TONES[s.subjects.length % TONES.length], coef: 1 }); }, { silent: true }); }
    if (f.dataset.id) {
      update((s) => { const x = s.exams.find((y) => y.id === f.dataset.id); Object.assign(x, { title, date, chapters, subjectId }); const pr = x.projectId && s.projects.find((p) => p.id === x.projectId); if (pr) { pr.due = date; pr.name = title; } });
      closeSheet(); toast('Examen enregistré'); return;
    }
    const exam = { id: 'ex-' + uid(), title, date, chapters, subjectId, projectId: null, createdAt: Date.now() };
    if (d.project === 'on' && canAddProject()) {
      const pr = newProject({ name: title, icon: 'book', tone: subject(subjectId)?.tone || 'sky', due: date, desc: subject(subjectId) ? `Matière : ${subject(subjectId).name}` : '' });
      exam.projectId = pr.id;
      update((s) => { s.projects.unshift(pr); }, { silent: true });
      (chapters.length ? chapters : [title]).forEach((ch, k) => addTask({ title: `Réviser : ${ch}`, projectId: pr.id, list: S().lists.some((l) => l.id === 'ecole') ? 'ecole' : null, createdAt: Date.now() + k }));
    }
    update((s) => { s.exams.push(exam); });
    closeSheet(); location.hash = '#/etudes/examens';
    toast(exam.projectId ? `Projet de révision créé avec ${Math.max(1, chapters.length)} tâche${chapters.length > 1 ? 's' : ''}.` : 'Le compte à rebours commence.', { title: 'Examen ajouté' });
  },
  'exam-plan': (d, f) => {
    const x = S().exams.find((y) => y.id === f.dataset.id); if (!x) return;
    const [hh, mm] = (d.hour || '17:00').split(':').map(Number);
    const plan = buildPlan(x, { hour: (hh || 17) + (mm || 0) / 60, perDay: +d.perDay || 2, mock: d.mock === 'on' });
    if (!plan.length) { toast('L\'examen est trop proche pour répartir des révisions. Révisez aujourd\'hui !', { title: 'Pas assez de jours' }); return; }
    let projectId = x.projectId && getProject(x.projectId) ? x.projectId : null;
    if (!projectId && canAddProject()) { const pr = newProject({ name: x.title, icon: 'book', tone: subject(x.subjectId)?.tone || 'sky', due: x.date }); projectId = pr.id; update((s) => { s.projects.unshift(pr); s.exams.find((y) => y.id === x.id).projectId = pr.id; }, { silent: true }); }
    update((s) => { s.tasks = s.tasks.filter((t) => !(t.examId === x.id && !t.done)); }, { silent: true });
    const list = S().lists.some((l) => l.id === 'ecole') ? 'ecole' : null;
    plan.forEach((p, k) => addTask({ title: p.title, due: p.due, projectId, examId: x.id, list, prio: p.mock ? 2 : left(p.due) > left(x.date) - 3 ? 1 : 0, createdAt: Date.now() + k }));
    closeSheet();
    toast(`${plan.length} séances réparties sur ${new Set(plan.map((p) => p.day)).size} jours, avec un rappel pour chacune.`, { title: 'Planning créé', action: 'Voir le calendrier', onAction: () => { location.hash = '#/agenda'; }, ms: 5000 });
  },
  grade: (d, f) => {
    const err = f.querySelector('.co-err');
    const value = Number(d.value), max = Number(d.max) || 20;
    if (!Number.isFinite(value) || d.value === '' || value < 0 || value > max) { err.textContent = `La note doit être entre 0 et ${max}.`; err.hidden = false; return; }
    const patch = { subjectId: d.subjectId, value, max, coef: Math.max(0, Number(d.coef) || 1), label: (d.label || '').trim(), date: d.date ? new Date(`${d.date}T12:00`).getTime() : Date.now() };
    if (f.dataset.id) update((s) => { Object.assign(s.grades.find((g) => g.id === f.dataset.id), patch); });
    else update((s) => { s.grades.push({ id: 'gr-' + uid(), ...patch }); });
    closeSheet(); toast(f.dataset.id ? 'Note enregistrée' : 'Note ajoutée : moyenne mise à jour');
  },
});
