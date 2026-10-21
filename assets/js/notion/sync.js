// Connecteur Notion (1.12) : connexion, import, export et synchronisation des tâches avec une base Notion.
// État enregistré dans S().notion : { connected, workspaceName, workspaceIcon, links, sync, conflicts, lastResult, lastError }.
// Le jeton d'accès Notion n'est jamais ici : seul le serveur (notionProxy) le garde.
import { S, update, uid, bid, addPage, TONES, on } from '../store.js';
import { notionProxy, mockOn } from './proxy.js';
import * as N from './client.js';
import { fromNotion, toNotion, titleOf, iconOf, detectMap, taskFromRow, rowProps, sigOf, pageTitleProp } from './map.js';

const STATE_KEY = 'msdev:notion-state';
const nx = () => S().notion || {};
export const isConnected = () => !!nx().connected;
const redirectUri = () => location.origin + location.pathname;

// ---------- Connexion (OAuth par le serveur) ----------
export async function connect() {
  const proxy = await notionProxy();
  const state = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
  try { sessionStorage.setItem(STATE_KEY, state); } catch (e) { /* rien */ }
  const { url } = await proxy.startAuth({ state, redirectUri: redirectUri() });
  location.href = url;
}
// Retour de Notion : ?code=…&state=… ; le state doit être celui qu'on a envoyé (protection contre la falsification)
export async function finishConnect(code, state) {
  let expected = null;
  try { expected = sessionStorage.getItem(STATE_KEY); sessionStorage.removeItem(STATE_KEY); } catch (e) { /* rien */ }
  if (!expected || expected !== state) throw new N.NotionError('bad_state', 'La connexion à Notion n\'a pas pu être vérifiée. Recommence depuis Connecteurs.');
  const proxy = await notionProxy();
  const ws = await proxy.finishAuth({ code, state, redirectUri: redirectUri() });
  update((s) => { s.notion = { ...s.notion, connected: true, workspaceName: ws.workspaceName || 'Notion', workspaceIcon: ws.workspaceIcon || '', mock: mockOn(), connectedAt: Date.now(), lastError: null }; });
  return ws;
}
// Déconnexion : le serveur oublie le jeton ; ici on oublie l'état de connexion et les correspondances.
// Ce qui a été importé reste dans MindView ; ce qui a été envoyé reste dans Notion.
export async function disconnect() {
  try { await (await notionProxy()).disconnect(); } catch (e) { /* hors ligne : on déconnecte quand même ici */ }
  update((s) => { s.notion = { connected: false, workspaceName: '', workspaceIcon: '', mock: false, links: {}, sync: null, conflicts: [], lastResult: null, lastError: null }; });
}

const fail = (e) => { update((s) => { s.notion.lastError = { message: N.notionMessage(e), at: Date.now() }; }, { silent: true }); throw e; };

// ---------- Import ----------
// Une page Notion devient une page de notes (avec ses blocs) ; les blocs non pris en charge restent en texte.
export async function importPage(obj) {
  try {
    const tree = await N.blockTree(obj.id);
    const ctx = { unsupported: [] };
    const blocks = fromNotion(tree, ctx).map((b) => ({ id: bid(), ...b, ...(b.t === 'todo' ? { c: !!b.c } : {}) }));
    const page = addPage({ title: titleOf(obj), icon: 'page', tpl: 'notion', notion: { id: obj.id, url: obj.url, at: Date.now() }, blocks: blocks.length ? blocks : [{ id: bid(), t: 'p', x: '' }] });
    return { page, unsupported: ctx.unsupported };
  } catch (e) { return fail(e); }
}
// Une base Notion : en tâches si elle a un statut, une case ou une date ; sinon chaque ligne devient une page.
export async function importDatabase(db) {
  try {
    const schema = await N.getDatabase(db.id);
    const map = detectMap(schema);
    const rows = await N.queryDatabase(db.id);
    if (map.status || map.date) {
      const made = [];
      for (const row of rows) {
        if (nx().links && Object.values(nx().links).some((l) => l.pageId === row.id)) continue; // déjà là
        const f = taskFromRow(row, map);
        const task = newTaskFrom(f);
        made.push(task);
        link(task, row, map);
      }
      return { kind: 'tasks', count: made.length, title: titleOf(schema) };
    }
    let count = 0;
    for (const row of rows) { await importPage(row); count++; }
    return { kind: 'pages', count, title: titleOf(schema) };
  } catch (e) { return fail(e); }
}

// ---------- Export ----------
export async function exportPage(pageId, parentId, progress) {
  try {
    const p = S().pages.find((x) => x.id === pageId);
    const kids = toNotion(p, { progress });
    const made = await N.createPage({ page_id: parentId }, pageTitleProp(p.title), kids.slice(0, 100));
    if (kids.length > 100) await N.appendChildren(made.id, kids.slice(100));
    update((s) => { const x = s.pages.find((y) => y.id === pageId); if (x) x.notion = { id: made.id, url: made.url, at: Date.now() }; });
    return made;
  } catch (e) { return fail(e); }
}
export async function exportProject(projectId, parentId) {
  try {
    const s = S();
    const pr = s.projects.find((x) => x.id === projectId);
    const tasks = s.tasks.filter((t) => t.projectId === projectId);
    const page = { title: pr.name, blocks: [
      ...(pr.desc ? [{ t: 'p', x: pr.desc }] : []),
      { t: 'h2', x: 'Tâches' },
      ...tasks.map((t) => ({ t: 'todo', x: t.title + (t.due ? ` — ${new Date(t.due).toLocaleDateString('fr-BE')}` : ''), c: !!t.done })),
      ...(pr.links?.length ? [{ t: 'h2', x: 'Liens' }, ...pr.links.map((l) => ({ t: 'ul', x: l.title || l.url, h: `<a href="${l.url}">${(l.title || l.url).replace(/[<>&"]/g, '')}</a>` }))] : []),
    ] };
    const made = await N.createPage({ page_id: parentId }, pageTitleProp(pr.name), toNotion(page).slice(0, 100));
    update((st) => { const x = st.projects.find((y) => y.id === projectId); if (x) x.notion = { id: made.id, url: made.url, at: Date.now() }; });
    return made;
  } catch (e) { return fail(e); }
}

// ---------- Tâches ----------
const subjectName = (t) => (t.subjectId && S().subjects.find((x) => x.id === t.subjectId)?.name) || '';
const localFields = (t) => ({ title: t.title, done: !!t.done, due: t.due || null, subjectName: subjectName(t) });
// Matière : retrouvée par son nom, créée si le module Études est actif
function subjectIdFor(name, s) {
  if (!name) return null;
  const ex = s.subjects.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (ex) return ex.id;
  if (!on('etudes')) return null;
  const id = 'sj-' + uid();
  s.subjects.push({ id, name, tone: TONES[s.subjects.length % TONES.length], coef: 1 });
  return id;
}
function applyFields(t, f, s) {
  t.title = f.title; t.due = f.due;
  if (t.done !== f.done) { t.done = f.done; t.doneAt = f.done ? Date.now() : null; t.status = f.done ? 'done' : 'todo'; }
  if (f.subjectName !== undefined) t.subjectId = subjectIdFor(f.subjectName, s) || (f.subjectName ? t.subjectId : null);
}
function newTaskFrom(f) {
  const task = { id: uid(), title: f.title, due: f.due, done: f.done, doneAt: f.done ? Date.now() : null, status: f.done ? 'done' : 'todo', kind: 'tache', list: S().lists.some((l) => l.id === 'ecole') ? 'ecole' : null, prio: 0, notes: '', sub: [], projectId: null, prospectId: null, createdAt: Date.now(), updatedAt: Date.now(), source: 'notion' };
  update((s) => { task.subjectId = subjectIdFor(f.subjectName, s); s.tasks.push(task); }, { silent: true });
  return task;
}
function link(task, row, map) {
  const f = taskFromRow(row, map);
  update((s) => { s.notion.links = { ...(s.notion.links || {}) }; s.notion.links[task.id] = { pageId: row.id, rsig: sigOf(f), lsig: sigOf(localFields(s.tasks.find((x) => x.id === task.id) || task)), redited: Date.parse(row.last_edited_time) }; }, { silent: true });
}

export async function databaseSchema(dbId) { try { const db = await N.getDatabase(dbId); return { db, map: detectMap(db) }; } catch (e) { return fail(e); } }
export function setupSync(db, map, { list = '', pushExisting = true } = {}) {
  update((s) => { s.notion.sync = { dbId: db.id, dbTitle: titleOf(db), dbIcon: iconOf(db), map, list, pushExisting, since: Date.now(), lastSync: 0 }; s.notion.lastError = null; });
}
export function stopSync() { update((s) => { s.notion.sync = null; s.notion.links = {}; s.notion.conflicts = []; }); }

let running = null;
// Synchronisation incrémentale : on lit dans Notion ce qui a changé depuis la dernière fois (last_edited_time,
// pages de 100), puis on envoie ce qui a changé ici. Conflit (modifié des deux côtés) : le plus récent gagne,
// et l'autre version est gardée dans « conflits » pour pouvoir la reprendre.
export function syncNow() { running ||= run().finally(() => { running = null; }); return running; }
export const syncing = () => !!running;
async function run() {
  const cfg = nx().sync;
  if (!cfg || !isConnected()) return null;
  const started = Date.now();
  const res = { pulled: 0, pushed: 0, created: 0, conflicts: 0, archived: 0 };
  try {
    const schema = await N.getDatabase(cfg.dbId);
    const map = { ...cfg.map, options: detectMap(schema).options };
    // 1. Lire les changements de Notion (avec 2 minutes de marge : Notion arrondit les heures à la minute)
    const filter = cfg.lastSync ? { timestamp: 'last_edited_time', last_edited_time: { on_or_after: new Date(cfg.lastSync - 120000).toISOString() } } : null;
    const rows = await N.queryDatabase(cfg.dbId, filter, [{ timestamp: 'last_edited_time', direction: 'ascending' }]);
    const fromRemote = new Set();
    const conflicts = [];
    update((s) => {
      const links = { ...(s.notion.links || {}) };
      const byPage = Object.fromEntries(Object.entries(links).map(([tid, l]) => [l.pageId, tid]));
      for (const row of rows) {
        const f = taskFromRow(row, map), rsig = sigOf(f), redited = Date.parse(row.last_edited_time);
        const tid = byPage[row.id];
        const t = tid && s.tasks.find((x) => x.id === tid);
        if (!t) {
          if (tid) continue; // supprimée ici : traité à l'envoi
          const task = { id: uid(), title: f.title, due: f.due, done: f.done, doneAt: f.done ? Date.now() : null, status: f.done ? 'done' : 'todo', kind: 'tache', list: s.lists.some((l) => l.id === cfg.list) ? cfg.list || null : null, prio: 0, notes: '', sub: [], projectId: null, prospectId: null, createdAt: Date.now(), updatedAt: Date.now(), source: 'notion' };
          task.subjectId = subjectIdFor(f.subjectName, s);
          s.tasks.push(task);
          links[task.id] = { pageId: row.id, rsig, lsig: sigOf(localFields(task)), redited };
          fromRemote.add(task.id); res.pulled++;
          continue;
        }
        const l = links[tid];
        if (rsig === l.rsig) continue; // rien de neuf côté Notion
        const localChanged = sigOf(localFields(t)) !== l.lsig;
        if (localChanged) {
          const remoteWins = redited >= (t.updatedAt || 0);
          conflicts.push({ id: uid(), taskId: tid, pageId: row.id, title: f.title || t.title, at: Date.now(), winner: remoteWins ? 'notion' : 'mindview', local: localFields(t), remote: f });
          res.conflicts++;
          if (!remoteWins) { links[tid] = { ...l, rsig, redited }; continue; } // la version d'ici sera envoyée
        }
        applyFields(t, f, s);
        t.updatedAt = Date.now();
        links[tid] = { pageId: row.id, rsig, lsig: sigOf(localFields(t)), redited };
        fromRemote.add(tid); res.pulled++;
      }
      s.notion.links = links;
      if (conflicts.length) s.notion.conflicts = [...conflicts, ...(s.notion.conflicts || [])].slice(0, 30);
    }, { silent: true });
    // 2. Envoyer les changements d'ici
    const s = S();
    const links = { ...(s.notion.links || {}) };
    const inScope = (t) => !cfg.list || t.list === cfg.list;
    for (const [tid, l] of Object.entries(links)) {
      const t = s.tasks.find((x) => x.id === tid);
      if (!t) { await N.updatePage(l.pageId, { archived: true }); delete links[tid]; res.archived++; continue; }
      if (fromRemote.has(tid)) continue;
      const f = localFields(t), lsig = sigOf(f);
      if (lsig === l.lsig) continue;
      const page = await N.updatePage(l.pageId, { properties: rowProps(f, map) });
      links[tid] = { pageId: l.pageId, rsig: sigOf(taskFromRow(page, map)), lsig, redited: Date.parse(page.last_edited_time) };
      res.pushed++;
    }
    for (const t of s.tasks) {
      if (links[t.id] || !inScope(t) || t.source === 'notion') continue;
      const isNew = (t.createdAt || 0) >= cfg.since;
      if (!isNew && !(cfg.pushExisting && !t.done)) continue;
      const f = localFields(t);
      const page = await N.createPage({ database_id: cfg.dbId }, rowProps(f, map));
      links[t.id] = { pageId: page.id, rsig: sigOf(taskFromRow(page, map)), lsig: sigOf(f), redited: Date.parse(page.last_edited_time) };
      res.created++;
    }
    update((st) => { st.notion.links = links; st.notion.sync.lastSync = started; st.notion.lastResult = { ...res, at: Date.now() }; st.notion.lastError = null; });
    return res;
  } catch (e) { return fail(e); }
}
// Reprendre l'autre version d'un conflit : elle devient la version d'ici, et part vers Notion à la prochaine synchro
export function resolveConflict(id, keep) {
  const c = (nx().conflicts || []).find((x) => x.id === id);
  if (!c) return;
  update((s) => {
    const t = s.tasks.find((x) => x.id === c.taskId);
    if (t) { applyFields(t, keep === 'notion' ? c.remote : c.local, s); t.updatedAt = Date.now(); }
    s.notion.conflicts = (s.notion.conflicts || []).filter((x) => x.id !== id);
  });
}
export const dismissConflict = (id) => update((s) => { s.notion.conflicts = (s.notion.conflicts || []).filter((x) => x.id !== id); });
// Synchro discrète au retour dans l'application (au plus toutes les 10 minutes)
export function maybeAutoSync() {
  const c = nx().sync;
  if (!isConnected() || !c || !navigator.onLine || Date.now() - (c.lastSync || 0) < 10 * 60e3) return;
  syncNow().catch(() => null);
}
