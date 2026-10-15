// Centre de notifications : tâches en retard, échéances proches, devis à relancer,
// clients sans nouvelles et rappels du jour. Chaque catégorie s'active ou se coupe
// (Compte → Notifications) ; « lu » est mémorisé par notification (state.notifSeen).
import { S, update, on, can, DAY, startOfDay, toggleTask, getProject, quoteTotals } from '../store.js';
import { ic, esc, eur, register, toast, when, dateShort, ago } from '../ui.js';
import { pageHead } from './common.js';
import { toFollow, FOLLOW_DAYS } from './quotes.js';
import { taskSheet } from './tasks.js';

export const NOTIF_CATS = [
  ['retard', 'Tâches en retard', 'Ce qui aurait dû être fait', 'flame', 'rose'],
  ['rappels', 'Rappels du jour', 'Les tâches à heure fixe d\'aujourd\'hui', 'bell', 'blue'],
  ['echeances', 'Échéances proches', 'Tâches des 48 prochaines heures, projets de la semaine', 'calendar', 'sand'],
  ['devis', 'Devis à relancer', `Envoyés depuis plus de ${FOLLOW_DAYS} jours, sans réponse`, 'invoice', 'sky'],
  ['relances', 'Clients sans nouvelles', 'Fiches en cours sans contact depuis 14 jours ni action prévue', 'users', 'olive'],
];
const catOn = (k) => S().prefs.notifCats?.[k] !== false;
const timedOf = (t) => { const d = new Date(t.due); return d.getHours() || d.getMinutes(); };

export function collect({ all = false } = {}) {
  const s = S(), now = Date.now(), t0 = startOfDay();
  const out = [];
  const add = (cat, n) => { if (all || catOn(cat)) out.push({ cat, ...n }); };
  s.tasks.filter((t) => !t.done && t.due).forEach((t) => {
    const pr = t.projectId && getProject(t.projectId);
    const sub = [pr?.name, t.prospectId && s.prospects.find((x) => x.id === t.prospectId)?.entreprise].filter(Boolean).join(' · ');
    const timed = timedOf(t);
    if (t.due < (timed ? now : t0)) add('retard', { id: `late:${t.id}`, at: t.due, title: t.title, text: `${when(t.due)}${sub ? ` · ${sub}` : ''}`, act: 'task-open', tid: t.id, tick: t.id });
    else if (timed && t.due < t0 + DAY) add('rappels', { id: `rem:${t.id}:${t.due}`, at: t.due, title: t.title, text: `${when(t.due)}${sub ? ` · ${sub}` : ''}`, act: 'task-open', tid: t.id, tick: t.id });
    else if (t.due < now + 48 * 3600e3) add('echeances', { id: `due:${t.id}:${t.due}`, at: t.due, title: t.title, text: `${when(t.due)}${sub ? ` · ${sub}` : ''}`, act: 'task-open', tid: t.id, tick: t.id });
  });
  s.projects.filter((p) => p.status !== 'termine' && p.due && p.due < t0 + 7 * DAY).forEach((p) => {
    const left = Math.ceil((p.due - t0) / DAY);
    add(left < 0 ? 'retard' : 'echeances', { id: `pj:${p.id}:${p.due}`, at: p.due, title: `Projet « ${p.name} »`, text: left < 0 ? `Échéance dépassée de ${-left} jour${-left > 1 ? 's' : ''}` : left === 0 ? 'Échéance aujourd\'hui' : `Échéance ${dateShort(p.due)}, dans ${left} jour${left > 1 ? 's' : ''}`, h: `#/projet/${p.id}`, icon: 'folder' });
  });
  if (can('quote')) s.quotes.filter(toFollow).forEach((q) => add('devis', { id: `qt:${q.id}:${q.sentAt}`, at: q.sentAt, title: `Relancer le devis ${q.num}`, text: `${q.client || 'Client'} · ${eur(quoteTotals(q).ttc)} · envoyé ${ago(q.sentAt)}`, h: `#/devis/${q.id}` }));
  if (can('crm') && (on('clients') || on('prospecter'))) s.prospects.filter((p) => !['signe', 'perdu'].includes(p.stage) && !p.demo && !p.next && (p.lastContact || p.updatedAt || 0) < now - 14 * DAY).forEach((p) => {
    add('relances', { id: `cli:${p.id}:${p.lastContact || p.updatedAt}`, at: p.lastContact || p.updatedAt, title: p.entreprise, text: `Sans nouvelles depuis ${ago(p.lastContact || p.updatedAt).replace(/^il y a /, '')} · prévoyez une relance`, h: `#/fiche/${p.id}` });
  });
  return out.sort((a, b) => NOTIF_CATS.findIndex((c) => c[0] === a.cat) - NOTIF_CATS.findIndex((c) => c[0] === b.cat) || a.at - b.at);
}
export const unreadCount = () => { const seen = S().notifSeen || {}; return collect().filter((n) => !seen[n.id]).length; };

const EXAMPLE = [['flame', 'rose', 'Envoyer le rapport trimestriel', 'Hier · Projet Bilan 2026'], ['bell', 'blue', 'Cours d\'histoire : chapitre 4', 'Aujourd\'hui · 16 h'], ['invoice', 'sky', 'Relancer le devis DEV-2026-014', 'Maison Lemaire · 2 420 € · envoyé il y a 4 jours']];

export function notificationsView(params, q) {
  const s = S();
  const seen = s.notifSeen || {};
  const list = collect();
  const unread = list.filter((n) => !seen[n.id]).length;
  const off = NOTIF_CATS.filter(([k]) => !catOn(k)).length;
  const groups = NOTIF_CATS.map(([k, label, , icon, tone]) => [k, label, icon, tone, list.filter((n) => n.cat === k)]).filter((g) => g[4].length);
  const html = `${pageHead('Notifications', { kicker: list.length ? `${unread ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tout est lu'} · ${list.length} au total` : 'Ce qui demande votre attention' })}
    ${unread ? '<div class="nf-bar"><button class="link" data-act="notif-read-all">Tout marquer comme lu</button></div>' : ''}
    ${list.length ? groups.map(([k, label, icon, tone, items]) => `<section class="card notif-g rise">
      <header class="card-h"><h2><span class="nf-ic k-${tone}">${ic(icon)}</span>${esc(label)}<b class="nf-count">${items.length}</b></h2></header>
      <ul class="rows nf-list">${items.map((n) => `<li class="nf ${seen[n.id] ? '' : 'is-new'}">
        ${n.tick ? `<button class="tick" data-act="notif-done" data-id="${n.tick}" data-n="${esc(n.id)}" aria-label="Marquer « ${esc(n.title)} » comme fait"></button>` : `<span class="nf-dot" aria-hidden="true"></span>`}
        ${n.act ? `<button class="row nf-b" data-act="notif-open" data-n="${esc(n.id)}" data-go-act="${n.act}" data-id="${n.tid}">` : `<a class="row nf-b" href="${n.h}" data-act="notif-open" data-n="${esc(n.id)}" data-h="${n.h}">`}
          <span class="row-b"><b>${esc(n.title)}</b><span>${esc(n.text)}</span></span>${seen[n.id] ? '' : '<i class="nf-new" aria-label="Non lue"></i>'}${ic('chevR', 'chev')}
        ${n.act ? '</button>' : '</a>'}</li>`).join('')}</ul>
    </section>`).join('') : `<section class="card onboard-empty rise">
      <span class="empty-ic">${ic('bell')}</span>
      <h2>Tout est à jour</h2>
      <p>Ici apparaîtront les tâches en retard, les échéances des prochains jours, les devis à relancer et les rappels du jour. Rien ne se perd : il suffit d'ouvrir cet écran.</p>
      <div class="demo-preview dp-nf" aria-hidden="true"><span class="tag">Exemple</span>${EXAMPLE.map(([i, t, a, b]) => `<div class="dp-row"><span class="nf-ic k-${t}">${ic(i)}</span><span><b>${a}</b><em>${b}</em></span></div>`).join('')}</div>
    </section>`}
    <section class="card rise" id="choix">
      <header class="card-h"><div><h2>Choisir mes notifications</h2><p>${off ? `${off} catégorie${off > 1 ? 's' : ''} coupée${off > 1 ? 's' : ''}` : 'Toutes actives'}</p></div></header>
      ${catSwitches()}
      <p class="field-h">Les rappels sur l'écran verrouillé et le résumé du matin se règlent dans <a class="link" href="#/reglages?s=notifications">Compte → Notifications</a>.</p>
    </section>`;
  return { title: 'Notifications', tab: 'plus', html };
}

export const catSwitches = () => `<div class="ios-list">${NOTIF_CATS.map(([k, label, hint, icon, tone]) => `<label class="ios-row"><span class="nf-ic k-${tone}">${ic(icon)}</span><span><b>${esc(label)}</b><em>${esc(hint)}</em></span><input type="checkbox" class="switch" ${catOn(k) ? 'checked' : ''} data-act-change="notif-cat" data-k="${k}" aria-label="${esc(label)}"></label>`).join('')}</div>`;

const markSeen = (ids) => update((s) => { s.notifSeen = { ...(s.notifSeen || {}) }; ids.forEach((id) => { s.notifSeen[id] = Date.now(); }); }, { silent: true });
register({
  'notif-open': (b) => {
    markSeen([b.dataset.n]);
    window.dispatchEvent(new Event('ms:rerender'));
    if (b.dataset.h) location.hash = b.dataset.h;
    else if (b.dataset.goAct === 'task-open') { const t = S().tasks.find((x) => x.id === b.dataset.id); if (t) taskSheet({ task: t }); }
  },
  'notif-done': (b) => {
    b.classList.add('is-done');
    const id = b.dataset.id;
    setTimeout(() => { markSeen([b.dataset.n]); toggleTask(id); toast('Tâche terminée', { action: 'Annuler', onAction: () => toggleTask(id), ms: 2600 }); }, 240);
  },
  'notif-read-all': () => {
    // On ne garde en mémoire que les notifications actuelles : la liste ne grossit pas avec le temps
    const ids = collect({ all: true }).map((n) => n.id);
    update((s) => { s.notifSeen = Object.fromEntries(ids.map((id) => [id, Date.now()])); });
    toast('Tout est marqué comme lu', { ms: 1600 });
  },
  'notif-cat': (el) => {
    update((s) => { s.prefs.notifCats = { ...(s.prefs.notifCats || {}), [el.dataset.k]: el.checked }; });
    toast(el.checked ? 'Catégorie activée' : 'Catégorie coupée', { ms: 1300 });
  },
});
