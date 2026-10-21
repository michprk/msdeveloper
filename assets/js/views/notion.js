// Écran du connecteur Notion (1.12) : connexion, import, envoi, synchronisation des tâches, conflits, déconnexion.
import { S, can } from '../store.js';
import { paywall } from './common.js';
import { ic, esc, register, toast, sheet, sheetHead, closeSheet, confirmSheet, busy, select, ago } from '../ui.js';
import { t as tr } from '../strings.js';
import { notionAvailable, mockOn } from '../notion/proxy.js';
import { cloudUser } from '../cloud.js';
import { accountSheet } from './account.js';
import * as N from '../notion/client.js';
import { titleOf, iconOf } from '../notion/map.js';
import { connect, finishConnect, disconnect, isConnected, importPage, importDatabase, exportPage, exportProject, databaseSchema, setupSync, stopSync, syncNow, syncing, resolveConflict, dismissConflict } from '../notion/sync.js';

const nx = () => S().notion || {};
const when = (t) => new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(t);
const fmtDue = (t) => (t ? new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'short' }).format(t) : 'sans date');
const fieldsLine = (f) => `${esc(f.title)} · ${f.done ? 'faite' : 'à faire'} · ${fmtDue(f.due)}${f.subjectName ? ` · ${esc(f.subjectName)}` : ''}`;

export function notionCard() {
  const n = nx();
  const logo = '<span class="nx-logo" aria-hidden="true">N</span>';
  if (!notionAvailable() && !n.connected) {
    return `<section class="card nx rise" id="cx-notion">
      <header class="nx-h">${logo}<div><h2>Notion</h2><p>${tr('nx.soon.sub')}</p></div><span class="chip">Bientôt</span></header>
      <p class="nx-p">${tr('nx.soon.p')}</p>
      <ul class="nx-list">${['nx.f.import', 'nx.f.export', 'nx.f.sync'].map((k) => `<li>${ic('check')}<span>${tr(k)}</span></li>`).join('')}</ul>
    </section>`;
  }
  if (!n.connected) {
    return `<section class="card nx rise" id="cx-notion">
      <header class="nx-h">${logo}<div><h2>Notion</h2><p>${tr('nx.off.sub')}</p></div>${mockOn() ? '<span class="chip t-sand">Notion factice (test)</span>' : ''}</header>
      <ul class="nx-list">${['nx.f.import', 'nx.f.export', 'nx.f.sync'].map((k) => `<li>${ic('check')}<span>${tr(k)}</span></li>`).join('')}</ul>
      ${n.lastError ? `<p class="nx-err" role="alert">${ic('bell')}<span>${esc(n.lastError.message)}</span></p>` : ''}
      <div class="nx-a"><button class="btn btn-primary" data-act="nx-connect">${ic('link')}<span>Connecter Notion</span></button><button class="btn btn-ghost" data-act="nx-privacy">${tr('nx.privacy.btn')}</button></div>
    </section>`;
  }
  const s = n.sync;
  const conflicts = n.conflicts || [];
  const r = n.lastResult;
  return `<section class="card nx is-on rise" id="cx-notion">
    <header class="nx-h">${logo}<div><h2>Notion</h2><p>Connecté à <b>${esc(n.workspaceIcon || '')} ${esc(n.workspaceName || 'Notion')}</b>${n.mock ? ' · <span class="chip t-sand">Notion factice (test)</span>' : ''}</p></div><span class="chip t-olive">${ic('check')}Connecté</span></header>
    ${n.lastError ? `<p class="nx-err" role="alert">${ic('bell')}<span>${esc(n.lastError.message)}</span><span class="nx-when">${when(n.lastError.at)}</span></p>` : ''}
    <div class="nx-grid">
      <div class="nx-tile"><span class="nx-ic">${ic('download')}</span><b>Importer</b><p>${tr('nx.import.p')}</p><button class="btn btn-ghost btn-sm" data-act="nx-import">${ic('search')}<span>Choisir dans Notion</span></button></div>
      <div class="nx-tile"><span class="nx-ic">${ic('upload')}</span><b>Envoyer vers Notion</b><p>${tr('nx.export.p')}</p><button class="btn btn-ghost btn-sm" data-act="nx-export-pick">${ic('page')}<span>Choisir une note</span></button></div>
      <div class="nx-tile nx-sync"><span class="nx-ic">${ic('refresh')}</span><b>Tâches synchronisées</b>
        ${s ? `<p>Base <b>${esc(s.dbIcon || '')} ${esc(s.dbTitle)}</b>${s.list ? ` · liste ${esc(S().lists.find((l) => l.id === s.list)?.name || s.list)}` : ' · toutes les tâches'}</p>
          <p class="nx-last">${s.lastSync ? `Dernière synchronisation : ${when(s.lastSync)}${r ? ` · ${r.pulled} reçue${r.pulled > 1 ? 's' : ''}, ${r.pushed + r.created} envoyée${r.pushed + r.created > 1 ? 's' : ''}${r.conflicts ? `, ${r.conflicts} conflit${r.conflicts > 1 ? 's' : ''}` : ''}` : ''}` : 'Pas encore synchronisé'}</p>
          <div class="nx-row"><button class="btn btn-primary btn-sm" data-act="nx-sync-now" ${syncing() ? 'disabled' : ''}>${ic('refresh')}<span>${syncing() ? 'Synchronisation…' : 'Synchroniser maintenant'}</span></button><button class="btn btn-ghost btn-sm" data-act="nx-sync-stop">Arrêter</button></div>`
          : `<p>${tr('nx.sync.p')}</p><button class="btn btn-ghost btn-sm" data-act="nx-sync-setup">${ic('grid')}<span>Choisir une base de tâches</span></button>`}
      </div>
    </div>
    ${conflicts.length ? `<div class="nx-conf"><h3>${ic('bell')}Modifié des deux côtés</h3><ul>${conflicts.map((c) => `<li>
      <p><b>${esc(c.title)}</b> · ${when(c.at)} · ${c.winner === 'notion' ? 'la version de Notion a été gardée' : 'la version de MindView a été gardée'}</p>
      <p class="nx-v"><span>Notion :</span> ${fieldsLine(c.remote)}</p><p class="nx-v"><span>MindView :</span> ${fieldsLine(c.local)}</p>
      <div class="nx-row"><button class="btn btn-ghost btn-sm" data-act="nx-conflict" data-id="${c.id}" data-keep="${c.winner === 'notion' ? 'mindview' : 'notion'}">Garder plutôt la version ${c.winner === 'notion' ? 'de MindView' : 'de Notion'}</button><button class="btn btn-ghost btn-sm" data-act="nx-conflict-ok" data-id="${c.id}">C'est bon</button></div></li>`).join('')}</ul></div>` : ''}
    <footer class="nx-f"><button class="link" data-act="nx-privacy">${tr('nx.privacy.btn')}</button><button class="link danger" data-act="nx-disconnect">Se déconnecter de Notion</button></footer>
  </section>`;
}

// ---------- Choisir dans Notion (recherche paginée) ----------
let found = { list: [], cursor: null, query: '', kind: null, mode: 'import', pick: new Set() };
function resultRow(o) {
  const isDb = o.object === 'database';
  const input = found.mode === 'import' ? `<input type="checkbox" ${found.pick.has(o.id) ? 'checked' : ''} data-act-change="nx-pick" data-id="${o.id}">` : `<input type="radio" name="nx-target" value="${o.id}" data-act-change="nx-pick-one" data-id="${o.id}">`;
  return `<li><label class="nx-res">${input}<span class="nx-res-ic">${iconOf(o) ? esc(iconOf(o)) : ic(isDb ? 'grid' : 'page')}</span><span class="nx-res-b"><b>${esc(titleOf(o))}</b><em>${isDb ? 'Base de données' : 'Page'} · modifiée ${ago(Date.parse(o.last_edited_time))}</em></span></label></li>`;
}
function pickerSheet({ mode, title, sub, kind = null, after }) {
  found = { list: [], cursor: null, query: '', kind, mode, pick: new Set(), after, chosen: null };
  sheet(`${sheetHead(title, sub)}<div class="sheet-body nx-pick">
    <form class="nx-search" data-form="nx-search"><input class="inp" name="q" type="search" placeholder="Chercher dans Notion" aria-label="Chercher dans Notion"><button class="btn btn-ghost" type="submit">${ic('search')}<span>Chercher</span></button></form>
    <ul class="nx-results" aria-live="polite"><li class="muted-s">Chargement…</li></ul>
    <button class="link nx-more" data-act="nx-more" hidden>Charger plus</button>
    <p class="co-err" role="alert" hidden></p>
    <button class="btn btn-primary btn-block" data-act="nx-pick-go" disabled>${mode === 'import' ? 'Importer' : 'Choisir'}</button>
    <p class="sheet-note">${tr('nx.pick.note')}</p></div>`, { cls: 'sheet-tall' });
  loadResults();
}
async function loadResults(more = false) {
  const box = document.querySelector('.nx-results'); if (!box) return;
  const err = document.querySelector('.nx-pick .co-err');
  try {
    const r = await N.search(found.query, found.kind, more ? found.cursor : undefined);
    found.list = more ? [...found.list, ...r.results] : r.results;
    found.cursor = r.has_more ? r.next_cursor : null;
    box.innerHTML = found.list.length ? found.list.map(resultRow).join('') : `<li class="muted-s">${tr('nx.pick.none')}</li>`;
    document.querySelector('.nx-more').hidden = !found.cursor;
    err.hidden = true;
  } catch (e) { box.innerHTML = ''; err.textContent = N.notionMessage(e); err.hidden = false; }
}
const goBtn = () => { const b = document.querySelector('[data-act="nx-pick-go"]'); if (!b) return; const n = found.mode === 'import' ? found.pick.size : found.chosen ? 1 : 0; b.disabled = !n; b.textContent = found.mode === 'import' ? (n ? `Importer (${n})` : 'Importer') : 'Choisir'; };

// Envoyer : choisir une note (ou recevoir un projet), puis la page Notion qui l'accueillera
function chooseNoteSheet() {
  const pages = S().pages.slice(0, 60);
  sheet(`${sheetHead('Envoyer une note vers Notion', tr('nx.note.sub'))}<div class="sheet-body"><ul class="rows">${pages.map((p) => `<li><button class="row" data-act="nx-export-page" data-id="${p.id}"><span class="menu-ic">${ic('page')}</span><span class="row-b"><b>${esc(p.title || 'Sans titre')}</b><span>${p.notion ? `Déjà envoyée ${ago(p.notion.at)}` : `Modifiée ${ago(p.updatedAt)}`}</span></span>${ic('chevR', 'chev')}</button></li>`).join('') || '<li class="muted-s pad">Aucune note pour l\'instant.</li>'}</ul></div>`, { cls: 'sheet-tall' });
}
export function sendToNotion(kind, id) {
  if (!isConnected()) { location.hash = '#/connecteurs?c=notion'; toast(tr('nx.connectFirst'), { title: 'Notion' }); return; }
  pickerSheet({ mode: 'target', title: 'Où l\'envoyer dans Notion ?', sub: tr('nx.target.sub'), kind: 'page', after: async (target) => {
    closeSheet(null, true);
    try {
      const made = kind === 'project' ? await exportProject(id, target) : await exportPage(id, target, (await import('./notes.js')).progress);
      toast(tr('nx.sent'), { title: 'Envoyé vers Notion', action: 'Ouvrir', onAction: () => window.open(made.url, '_blank', 'noopener'), ms: 5000 });
    } catch (e) { toast(N.notionMessage(e), { title: 'Envoi impossible', ms: 6000 }); }
  } });
}

// ---------- Synchronisation : choisir la base, puis vérifier les correspondances ----------
async function mappingSheet(dbId) {
  sheet(`${sheetHead('Synchroniser les tâches', 'Lecture de la base…')}<div class="sheet-body"><p class="muted-s">Chargement…</p></div>`, { cls: 'sheet-sm' });
  let res;
  try { res = await databaseSchema(dbId); } catch (e) { closeSheet(null, true); toast(N.notionMessage(e), { title: 'Notion', ms: 6000 }); return; }
  const { db, map } = res;
  const props = Object.entries(db.properties || {});
  const opt = (types, cur) => [['', 'Aucune'], ...props.filter(([, p]) => types.includes(p.type)).map(([k]) => [k, k])].map(([v, l]) => [v, l]);
  const lists = [['', 'Toutes mes tâches'], ...S().lists.map((l) => [l.id, `Liste « ${l.name} »`])];
  found.db = db;
  sheet(`${sheetHead('Synchroniser les tâches', `${iconOf(db) || ''} ${titleOf(db)}`)}
    <form class="sheet-body form" data-form="nx-sync-save">
      <p class="sheet-p">${tr('nx.map.p')}</p>
      <label class="field"><span class="field-l">Titre</span><input class="inp" value="${esc(map.title)}" disabled></label>
      <label class="field"><span class="field-l">Statut (fait / à faire)</span>${select('status', opt(['status', 'select', 'checkbox']), map.status)}</label>
      <label class="field"><span class="field-l">Date</span>${select('date', opt(['date']), map.date)}</label>
      <label class="field"><span class="field-l">Matière</span>${select('subject', opt(['select', 'multi_select', 'rich_text']), map.subject)}</label>
      <label class="field"><span class="field-l">Tâches de MindView concernées</span>${select('list', lists, S().lists.some((l) => l.id === 'ecole') ? 'ecole' : '')}</label>
      <label class="check-row"><input type="checkbox" name="push" checked><span>Envoyer aussi mes tâches en cours</span></label>
      <button class="btn btn-primary btn-block" type="submit">${ic('refresh')}<span>Activer et synchroniser</span></button>
      <p class="sheet-note">${tr('nx.map.note')}</p>
    </form>`, { cls: 'sheet-sm' });
}

export function privacySheet() {
  sheet(`${sheetHead(tr('nx.privacy.btn'))}<div class="sheet-body article">${tr('nx.privacy.html')}</div>`, { cls: 'sheet-sm' });
}

const rr = () => window.dispatchEvent(new Event('ms:rerender'));
register({
  'nx-connect': async (b) => {
    if (!can('notionSync')) { sheet(`${sheetHead('Notion')}<div class="sheet-body">${paywall('notionSync', { compact: true })}</div>`, { cls: 'sheet-sm' }); return; }
    // Le vrai serveur Notion lie l'accès à un compte MindView (sinon il ne saurait pas à qui le rendre)
    if (!mockOn() && !cloudUser()) { accountSheet(); toast(tr('nx.needAccount'), { title: 'Notion', ms: 5000 }); return; }
    try { await busy(b, 'Ouverture de Notion…', () => connect()); }
    catch (e) { toast(N.notionMessage(e), { title: 'Notion', ms: 6000 }); }
  },
  'nx-privacy': () => privacySheet(),
  'nx-import': () => pickerSheet({ mode: 'import', title: 'Importer depuis Notion', sub: tr('nx.import.sub') }),
  'nx-more': () => loadResults(true),
  'nx-pick': (el) => { if (el.checked) found.pick.add(el.dataset.id); else found.pick.delete(el.dataset.id); goBtn(); },
  'nx-pick-one': (el) => { found.chosen = el.dataset.id; goBtn(); },
  'nx-pick-go': async (b) => {
    if (found.mode === 'target') { if (found.chosen) found.after?.(found.chosen); return; }
    const chosen = found.list.filter((o) => found.pick.has(o.id));
    let pages = 0, tasks = 0, notesFromDb = 0; const kept = [];
    try {
      await busy(b, 'Import en cours…', async () => {
        for (const o of chosen) {
          if (o.object === 'database') { const r = await importDatabase(o); if (r.kind === 'tasks') tasks += r.count; else notesFromDb += r.count; }
          else { const r = await importPage(o); pages++; kept.push(...r.unsupported); }
        }
      });
      closeSheet();
      const parts = [pages && `${pages} page${pages > 1 ? 's' : ''} → notes`, notesFromDb && `${notesFromDb} ligne${notesFromDb > 1 ? 's' : ''} → notes`, tasks && `${tasks} tâche${tasks > 1 ? 's' : ''}`].filter(Boolean);
      toast(`${parts.join(' · ') || 'Rien de nouveau'}${kept.length ? ` · ${kept.length} bloc${kept.length > 1 ? 's' : ''} gardé${kept.length > 1 ? 's' : ''} en texte` : ''}.`, { title: 'Import terminé', ms: 5000 });
    } catch (e) { const err = document.querySelector('.nx-pick .co-err'); if (err) { err.textContent = N.notionMessage(e); err.hidden = false; } }
  },
  'nx-export-pick': () => chooseNoteSheet(),
  'nx-export-page': (b) => { closeSheet(null, true); sendToNotion('page', b.dataset.id); },
  'nx-sync-setup': () => pickerSheet({ mode: 'target', title: 'Quelle base de tâches ?', sub: 'Une base Notion avec un titre, et si possible un statut et une date', kind: 'database', after: (id) => mappingSheet(id) }),
  'nx-sync-now': async (b) => {
    try {
      const r = await busy(b, 'Synchronisation…', () => syncNow());
      if (r) toast(`${r.pulled} reçue${r.pulled > 1 ? 's' : ''} de Notion · ${r.pushed + r.created} envoyée${r.pushed + r.created > 1 ? 's' : ''}${r.conflicts ? ` · ${r.conflicts} modifiée${r.conflicts > 1 ? 's' : ''} des deux côtés` : ''}`, { title: 'Tâches synchronisées', ms: 4500 });
    } catch (e) { toast(N.notionMessage(e), { title: 'Synchronisation impossible', ms: 6000 }); }
    rr();
  },
  'nx-sync-stop': async () => {
    if (!await confirmSheet({ title: 'Arrêter la synchronisation ?', text: tr('nx.stop.text'), ok: 'Arrêter' })) return;
    stopSync(); toast('Synchronisation arrêtée.', { title: 'Notion' });
  },
  'nx-conflict': (b) => { resolveConflict(b.dataset.id, b.dataset.keep); toast(tr('nx.conflict.kept'), { title: 'Conflit réglé' }); syncNow().catch(() => null).finally(rr); },
  'nx-conflict-ok': (b) => dismissConflict(b.dataset.id),
  'nx-disconnect': async () => {
    if (!await confirmSheet({ title: 'Se déconnecter de Notion ?', text: tr('nx.disconnect.text'), ok: 'Se déconnecter', danger: true })) return;
    await disconnect(); toast(tr('nx.disconnected'), { title: 'Notion' });
  },
}, {
  'nx-search': (d) => { found.query = (d.q || '').trim(); loadResults(); },
  'nx-sync-save': async (d, f) => {
    const db = found.db;
    const map = { ...(await databaseSchema(db.id)).map, status: d.status || '', date: d.date || '', subject: d.subject || '' };
    const props = db.properties || {};
    map.statusType = map.status ? props[map.status]?.type || '' : ''; map.subjectType = map.subject ? props[map.subject]?.type || '' : '';
    setupSync(db, map, { list: d.list || '', pushExisting: d.push === 'on' });
    closeSheet();
    try { const r = await syncNow(); toast(`${r.pulled} tâche${r.pulled > 1 ? 's' : ''} reçue${r.pulled > 1 ? 's' : ''} · ${r.created + r.pushed} envoyée${r.created + r.pushed > 1 ? 's' : ''}`, { title: 'Synchronisation activée', ms: 4500 }); }
    catch (e) { toast(N.notionMessage(e), { title: 'Synchronisation impossible', ms: 6000 }); }
  },
});

// Retour de Notion après l'autorisation (?code=…&state=…) : appelé au démarrage de l'application
export async function handleNotionReturn() {
  const q = new URLSearchParams(location.search);
  const code = q.get('code'), state = q.get('state');
  if (!code || !state) return;
  q.delete('code'); q.delete('state');
  history.replaceState(null, '', location.pathname + (q.toString() ? `?${q}` : '') + '#/connecteurs?c=notion');
  try {
    const ws = await finishConnect(code, state);
    toast(tr('nx.connected', { ws: esc(ws.workspaceName || 'Notion') }), { title: 'Notion connecté', ms: 4500 });
  } catch (e) { toast(N.notionMessage(e), { title: 'Connexion à Notion impossible', ms: 6000 }); }
  rr();
}
