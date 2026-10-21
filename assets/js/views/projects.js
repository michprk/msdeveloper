// Projets : un projet regroupe des tâches (sa progression se calcule toute seule), des pages,
// des liens (Canva, Figma, Notion, Drive, GitHub…) et, si besoin, un client.
import { S, update, on, can, uid, DAY, startOfDay, TONES, addTask, getProspect, getProject, newProject, projectProgress, canAddProject, LIMITS } from '../store.js';
import { ic, esc, register, toast, sheet, sheetHead, closeSheet, confirmSheet, field, input, select, dateShort, ring, bar, when, ago } from '../ui.js';
import { pageHead, paywall } from './common.js';
import { taskRow, quickAdd } from './tasks.js';
import { linksBlock } from './connect.js';
import { t as tr } from '../strings.js';
import { notionAvailable } from '../notion/proxy.js';
import { isConnected } from '../notion/sync.js';
import { sendToNotion } from './notion.js';

const STATUS = { actif: ['En cours', 't-blue'], pause: ['En pause', 't-sand'], termine: ['Terminé', 't-olive'] };
const ICONS = ['folder', 'briefcase', 'book', 'monitor', 'calendar', 'target', 'euro', 'camera', 'house', 'flag', 'star', 'users'];
const TONE_NAMES = { grey: 'Gris', sky: 'Bleu clair', blue: 'Bleu', navy: 'Bleu nuit', sand: 'Sable', olive: 'Olive', rose: 'Rose' };
// Modèles de projets : pour réviser, coder, gérer un client, un événement ou un budget.
export const PROJECT_TPL = [
  ['etude', 'Réviser un examen', 'book', 'sky', ['Lister les chapitres à revoir', 'Faire une fiche par chapitre', 'Réviser avec les quiz', 'Faire un examen blanc']],
  ['code', 'Lancer un site ou une app', 'monitor', 'navy', ['Définir les fonctionnalités', 'Faire la maquette', 'Développer', 'Tester', 'Mettre en ligne']],
  ['client', 'Projet pour un client', 'briefcase', 'olive', ['Acompte reçu', 'Brief et contenus reçus', 'Première version', 'Retours du client', 'Livraison', 'Facture envoyée']],
  ['event', 'Organiser un événement', 'calendar', 'sand', ['Fixer la date', 'Réserver le lieu', 'Envoyer les invitations', 'Préparer le jour J']],
  ['budget', 'Budget et finances', 'euro', 'blue', ['Lister les dépenses fixes', 'Fixer un budget par mois', 'Suivre les dépenses chaque semaine', 'Faire le bilan du mois']],
];
const dueChip = (pr) => {
  if (!pr.due || pr.status === 'termine') return '';
  const left = Math.ceil((pr.due - startOfDay()) / DAY);
  return `<span class="chip ${left < 0 ? 't-rose' : left <= 5 ? 't-sand' : 't-grey'}">${ic('calendar')}${left < 0 ? `${-left} j de retard` : left === 0 ? 'Aujourd\'hui' : `J−${left}`}</span>`;
};

function card(pr, i) {
  const g = projectProgress(pr.id);
  const cli = pr.prospectId && getProspect(pr.prospectId);
  const next = S().tasks.filter((t) => t.projectId === pr.id && !t.done).sort((a, b) => (a.due || 9e15) - (b.due || 9e15) || (b.prio || 0) - (a.prio || 0))[0];
  return `<a class="card pj-card k-${pr.tone} rise" style="--i:${i}" href="#/projet/${pr.id}">
    <span class="pj-top"><span class="pj-ic">${ic(pr.icon || 'folder')}</span><span class="pj-st"><span class="chip ${STATUS[pr.status]?.[1]}">${STATUS[pr.status]?.[0] || ''}</span>${dueChip(pr)}</span></span>
    <b class="pj-n">${esc(pr.name)}</b>
    ${cli ? `<span class="pj-c">${ic('user')}${esc(cli.entreprise)}</span>` : pr.desc ? `<span class="pj-c">${esc(pr.desc.slice(0, 80))}</span>` : ''}
    <span class="pj-p"><span>${g.total ? `${g.done} / ${g.total} tâches` : 'Aucune tâche'}</span><b>${g.pct} %</b></span>
    ${bar(g.done, g.total || 1, 'olive')}
    ${next ? `<span class="pj-next">${ic('arrowR')}<span>${esc(next.title)}${next.due ? ` · ${when(next.due)}` : ''}</span></span>` : ''}
  </a>`;
}

export function projectsView(params, q) {
  const s = S();
  const f = ['actif', 'pause', 'termine', 'tous'].includes(q.f) ? q.f : 'actif';
  const list = s.projects.filter((p) => f === 'tous' || (p.status || 'actif') === f).sort((a, b) => (a.due || 9e15) - (b.due || 9e15) || b.createdAt - a.createdAt);
  const n = (st) => s.projects.filter((p) => (p.status || 'actif') === st).length;
  const html = `${pageHead('Projets', { kicker: s.projects.length ? `${n('actif')} en cours${can('projectsUnlimited') ? '' : ` · ${LIMITS.freeProjects} au maximum en version gratuite`}` : tr('pj.kicker'), actions: `<button class="btn btn-primary fab-dup" data-act="project-new">${ic('plus')}<span>Projet</span></button>` })}
    ${s.projects.length ? `<nav class="chips-row" aria-label="Filtrer les projets">${[['actif', 'En cours'], ['pause', 'En pause'], ['termine', 'Terminés'], ['tous', 'Tous']].map(([k, l]) => `<a class="chip-btn ${f === k ? 'is-on' : ''}" href="#/projets${k === 'actif' ? '' : `?f=${k}`}">${l} <b>${k === 'tous' ? s.projects.length : n(k)}</b></a>`).join('')}</nav>
      ${list.length ? `<div class="pj-grid">${list.map(card).join('')}</div>` : '<p class="muted pad">Aucun projet ici.</p>'}` : `
    <section class="card onboard-empty rise">
      <span class="empty-ic">${ic('folder')}</span>
      <h2>${tr('pj.empty.t')}</h2>
      <p>Un examen à réviser, un site à lancer, un client, un déménagement : chaque projet regroupe ses tâches, et sa progression se calcule toute seule à chaque tâche cochée.</p>
      <button class="btn btn-primary btn-lg" data-act="project-new">${ic('plus')}<span>Créer mon premier projet</span></button>
      <div class="demo-preview dp-pj" aria-hidden="true"><span class="tag">Exemple</span>
        <p class="dp-t">Réviser l'examen d'histoire <span class="chip t-sand">J−9</span></p><p class="dp-s">3 / 5 tâches · 60 %</p>
        <span class="bar olive"><i style="width:60%"></i></span>
        <div class="dp-row"><span class="tick is-done"></span><span><b>Fiche : la Révolution française</b></span></div><div class="dp-row"><span class="tick"></span><span><b>Quiz : dates clés</b><em>Demain</em></span></div>
      </div>
    </section>`}
    <h2 class="sec-title">Partir d'un modèle</h2>
    <div class="tpl-grid">${PROJECT_TPL.filter(([k]) => k !== 'client' || on('clients')).map(([id, name, icon, , tasks]) => `<button class="tpl" data-act="project-tpl" data-tpl="${id}"><span class="tpl-ic">${ic(icon)}</span><b>${esc(name)}</b><span>${tasks.length} tâches prêtes</span></button>`).join('')}</div>`;
  return { title: 'Projets', tab: 'projets', fab: 'project-new', html };
}

export function projectView([id]) {
  const pr = getProject(id);
  if (!pr) return { title: 'Projet', tab: 'projets', html: `${pageHead('Projet introuvable', { back: '#/projets' })}<div class="empty"><span class="empty-ic">${ic('folder')}</span><p class="empty-t">Ce projet n'existe plus</p><a class="btn btn-ghost" href="#/projets">Tous les projets</a></div>` };
  const s = S();
  const g = projectProgress(id);
  const ts = s.tasks.filter((t) => t.projectId === id);
  const doing = ts.filter((t) => !t.done && t.status === 'doing');
  const todo = ts.filter((t) => !t.done && t.status !== 'doing').sort((a, b) => (a.due || 9e15) - (b.due || 9e15) || (b.prio || 0) - (a.prio || 0));
  const done = ts.filter((t) => t.done);
  const cli = pr.prospectId && getProspect(pr.prospectId);
  const pages = s.pages.filter((p) => p.projectId === id);
  const quotes = pr.prospectId ? s.quotes.filter((x) => x.prospectId === pr.prospectId) : [];
  const sec = (label, items) => (items.length ? `<p class="pj-g">${label} <b>${items.length}</b></p><ul class="tasks">${items.map((t) => taskRow(t, { showProject: false })).join('')}</ul>` : '');
  const html = `${pageHead(esc(pr.name), { back: '#/projets', kicker: [STATUS[pr.status]?.[0], pr.due ? `échéance ${dateShort(pr.due)}` : '', cli ? esc(cli.entreprise) : ''].filter(Boolean).join(' · '), actions: `<button class="icon-btn" data-act="project-edit" data-id="${id}" aria-label="Modifier le projet">${ic('edit')}</button>` })}
    <div class="pj-layout">
      <div class="pj-main">
        <section class="card pj-prog rise">
          <div class="hero-ring">${ring(g.done, g.total || 1, { size: 96, stroke: 9 })}<div class="hero-ring-v"><b>${g.pct}<small> %</small></b></div></div>
          <dl class="pj-stats"><div><dt>À faire</dt><dd>${todo.length}</dd></div><div><dt>En cours</dt><dd>${doing.length}</dd></div><div><dt>Terminées</dt><dd>${done.length}</dd></div></dl>
          ${pr.desc ? `<p class="pj-desc">${esc(pr.desc)}</p>` : ''}
        </section>
        <section class="card rise">
          <header class="card-h"><div><h2>Tâches du projet</h2><p>La progression suit les tâches cochées</p></div><button class="link" data-act="task-new" data-project="${id}">${ic('plus')}Tâche</button></header>
          ${quickAdd({ project: id, placeholder: 'Ajouter une tâche au projet…', cls: 'qadd-sm' })}
          ${ts.length ? `${sec('En cours', doing)}${sec('À faire', todo)}${done.length ? `<details class="pj-done"><summary>Terminées <b>${done.length}</b></summary><ul class="tasks">${done.map((t) => taskRow(t, { showProject: false })).join('')}</ul></details>` : ''}`
            : `<p class="muted pad">${tr('pj.steps')}</p>`}
        </section>
      </div>
      <div class="pj-side">
        ${linksBlock('project', id, pr.links || [])}
        ${on('organiser') ? `<section class="card rise">
          <header class="card-h"><div><h2>Pages du projet</h2><p>${pages.length ? `${pages.length} page${pages.length > 1 ? 's' : ''}` : 'Notes, comptes rendus, idées'}</p></div><button class="link" data-act="page-new" data-tpl="projet" data-project="${id}">${ic('plus')}Page</button></header>
          ${pages.length ? `<ul class="rows">${pages.map((x) => `<li><a class="row" href="#/note/${x.id}"><span class="menu-ic">${ic(x.icon || 'page')}</span><span class="row-b"><b>${esc(x.title || 'Sans titre')}</b><span>${ago(x.updatedAt)}</span></span>${ic('chevR', 'chev')}</a></li>`).join('')}</ul>` : ''}
        </section>` : ''}
        ${cli ? `<section class="card rise"><header class="card-h"><div><h2>Client</h2></div></header>
          <a class="row" href="#/fiche/${cli.id}"><span class="menu-ic">${ic('user')}</span><span class="row-b"><b>${esc(cli.entreprise)}</b><span>${quotes.length ? `${quotes.length} devis` : 'Fiche client'}</span></span>${ic('chevR', 'chev')}</a></section>` : ''}
        ${notionAvailable() || isConnected() ? `<button class="btn btn-ghost btn-block" data-act="project-notion" data-id="${id}">${ic('upload')}<span>Envoyer vers Notion</span></button>` : ''}
        <button class="btn btn-danger-ghost btn-block" data-act="project-del" data-id="${id}">${ic('trash')}<span>Supprimer le projet</span></button>
      </div>
    </div>`;
  return { title: pr.name, tab: 'projets', fab: 'task-new', html };
}

export function projectSheet(pr = null, preset = {}) {
  const s = S();
  const v = pr || { name: '', icon: 'folder', tone: 'blue', status: 'actif', due: null, desc: '', prospectId: '', ...preset };
  sheet(`${sheetHead(pr ? 'Modifier le projet' : 'Nouveau projet')}
    <form class="sheet-body form" data-form="project" data-id="${pr?.id || ''}" data-tpl="${preset.tpl || ''}" data-validate novalidate>
      ${field('Nom du projet', input('name', v.name, 'required autofocus maxlength="80" placeholder="Examen d\'histoire, site de Léa, déménagement…"'))}
      <div class="form-2">${field('Échéance', `<input class="inp" type="date" name="due" value="${v.due ? new Date(v.due - new Date(v.due).getTimezoneOffset() * 60000).toISOString().slice(0, 10) : ''}">`)}${field('Statut', select('status', Object.entries(STATUS).map(([k, [l]]) => [k, l]), v.status))}</div>
      ${on('clients') && s.prospects.length ? field('Client (facultatif)', select('prospectId', [['', 'Aucun'], ...s.prospects.map((x) => [x.id, x.entreprise])], v.prospectId || '')) : ''}
      ${field('Description', `<textarea class="inp" name="desc" rows="2" maxlength="300" placeholder="Le but du projet, en une phrase">${esc(v.desc || '')}</textarea>`)}
      <div class="form-2">${field('Couleur', select('tone', TONES.map((t) => [t, TONE_NAMES[t]]), v.tone))}${field('Icône', select('icon', ICONS.map((i) => [i, { folder: 'Dossier', briefcase: 'Travail', book: 'Études', monitor: 'Code', calendar: 'Événement', target: 'Objectif', euro: 'Finances', camera: 'Création', house: 'Maison', flag: 'Lancement', star: 'Favori', users: 'Équipe' }[i]]), v.icon))}</div>
      ${preset.tasks?.length ? `<p class="field-h">${preset.tasks.length} tâches seront ajoutées : ${preset.tasks.map(esc).join(', ')}.</p>` : ''}
      <button class="btn btn-primary btn-block" type="submit" data-needs="name" ${v.name ? '' : 'disabled'}>${pr ? 'Enregistrer' : 'Créer le projet'}</button>
    </form>`, { cls: 'sheet-tall' });
}
function limitSheet() {
  sheet(`${sheetHead(`${LIMITS.freeProjects} projets en cours dans la version gratuite`)}<div class="sheet-body">${paywall('projectsUnlimited', { compact: true })}<p class="sheet-note">${tr('pj.limit')}</p></div>`, { cls: 'sheet-sm' });
}

register({
  'project-new': (b) => { if (!canAddProject()) { limitSheet(); return; } projectSheet(null, { prospectId: b?.dataset?.pid || '' }); },
  'project-tpl': (b) => {
    if (!canAddProject()) { limitSheet(); return; }
    const [id, name, icon, tone, tasks] = PROJECT_TPL.find((t) => t[0] === b.dataset.tpl);
    projectSheet(null, { name, icon, tone, tasks, tpl: id });
  },
  'project-edit': (b) => projectSheet(getProject(b.dataset.id)),
  'project-notion': (b) => sendToNotion('project', b.dataset.id),
  'project-del': async (b) => {
    const pr = getProject(b.dataset.id);
    const n = S().tasks.filter((t) => t.projectId === pr.id).length;
    if (!await confirmSheet({ title: `Supprimer « ${esc(pr.name)} » ?`, text: n ? `Ses ${n} tâche${n > 1 ? 's' : ''} sont conservée${n > 1 ? 's' : ''}, sans projet.` : 'Le projet ne contient aucune tâche.', ok: 'Supprimer', danger: true })) return;
    update((s) => { s.projects = s.projects.filter((x) => x.id !== pr.id); s.tasks.forEach((t) => { if (t.projectId === pr.id) t.projectId = null; }); s.pages.forEach((p) => { if (p.projectId === pr.id) p.projectId = null; }); });
    location.hash = '#/projets'; toast('Projet supprimé');
  },
}, {
  project: (d, f) => {
    const name = (d.name || '').trim();
    if (!name) return;
    const patch = { name, status: d.status || 'actif', due: d.due ? new Date(`${d.due}T00:00`).getTime() : null, desc: (d.desc || '').trim(), tone: d.tone || 'blue', icon: d.icon || 'folder', prospectId: d.prospectId || null };
    if (f.dataset.id) { update((s) => { Object.assign(s.projects.find((p) => p.id === f.dataset.id), patch); }); closeSheet(); toast('Projet enregistré'); return; }
    const pr = newProject(patch);
    update((s) => { s.projects.unshift(pr); });
    const tpl = PROJECT_TPL.find((t) => t[0] === f.dataset.tpl);
    (tpl?.[4] || []).forEach((title, k) => addTask({ title, projectId: pr.id, prospectId: pr.prospectId, createdAt: Date.now() + k }));
    closeSheet(); location.hash = `#/projet/${pr.id}`;
    toast(tpl ? tr('pj.ready', { n: tpl[4].length }) : tr('pj.addTasks'), { title: 'Projet créé' });
  },
});
