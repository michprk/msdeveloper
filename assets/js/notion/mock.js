// Notion factice (1.12) : pour développer et tester sans serveur ni compte Notion.
// Activé par NOTION.mock (config.js) ou ?notion=mock. Il imite l'API Notion 2022-06-28 :
// recherche, pages, bases, blocs, requêtes de base avec filtre last_edited_time, création et modification,
// pagination (3 résultats par page, pour tester), heures arrondies à la minute (comme Notion),
// et un code 429 avec Retry-After toutes les `every429` requêtes.
const KEY = 'msdev:notion-mock';
export const mockConfig = { every429: 6, retryAfter: 1, pageSize: 3, latency: 30 };
let n = 0;
const nid = () => `mk${Date.now().toString(36)}${(n++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const minute = (t = Date.now()) => new Date(Math.floor(t / 60000) * 60000).toISOString();
const rt = (text, a = {}) => ({ type: 'text', text: { content: text, link: a.href ? { url: a.href } : null }, annotations: { bold: !!a.bold, italic: !!a.italic, strikethrough: false, underline: !!a.underline, code: !!a.code, color: a.color || 'default' }, plain_text: text, href: a.href || null });
const mention = (pageId, title) => ({ type: 'mention', mention: { type: 'page', page: { id: pageId } }, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' }, plain_text: title, href: `https://www.notion.so/${pageId.replace(/-/g, '')}` });
const blk = (type, data, kids) => ({ id: nid(), object: 'block', type, [type]: data, has_children: !!kids?.length, _kids: kids || [] });

function seed() {
  const now = Date.now();
  const P1 = 'page-cellule', P2 = 'page-bac', P3 = 'page-exos', DB = 'db-devoirs';
  const page = (id, title, parent, icon) => ({ id, object: 'page', created_time: minute(now - 864e5), last_edited_time: minute(now - 3600e3), archived: false, icon: icon ? { type: 'emoji', emoji: icon } : null, parent, url: `https://www.notion.so/${id}`, properties: { title: { id: 'title', type: 'title', title: [rt(title)] } } });
  const st = { db: {}, pages: {}, blocks: {} };
  st.pages[P1] = page(P1, 'Cours — La cellule', { type: 'workspace', workspace: true }, '🧬');
  st.pages[P2] = page(P2, 'Planning du bac', { type: 'workspace', workspace: true }, '📅');
  st.pages[P3] = page(P3, 'Chapitre 3 — exercices', { type: 'page_id', page_id: P1 });
  const tbl = blk('table', { table_width: 2, has_column_header: true, has_row_header: false }, [
    blk('table_row', { cells: [[rt('Organite')], [rt('Rôle')]] }), blk('table_row', { cells: [[rt('Noyau')], [rt('Contient l\'ADN')]] }), blk('table_row', { cells: [[rt('Mitochondrie')], [rt('Produit l\'énergie')]] }),
  ]);
  st.blocks[P1] = [
    blk('heading_1', { rich_text: [rt('La cellule')] }),
    blk('paragraph', { rich_text: [rt('Tout être vivant', { bold: true }), rt(' est fait de cellules. '), rt('Article Wikipédia', { href: 'https://fr.wikipedia.org/wiki/Cellule_(biologie)' })] }),
    blk('heading_2', { rich_text: [rt('Les organites')] }),
    blk('bulleted_list_item', { rich_text: [rt('Le '), rt('noyau', { bold: true }), rt(' contient l\'ADN')] }),
    blk('bulleted_list_item', { rich_text: [rt('La membrane protège la cellule', { color: 'blue' })] }),
    blk('numbered_list_item', { rich_text: [rt('Observer au microscope')] }),
    blk('numbered_list_item', { rich_text: [rt('Dessiner le schéma')] }),
    blk('to_do', { rich_text: [rt('Relire le chapitre')], checked: true }),
    blk('to_do', { rich_text: [rt('Faire les exercices')], checked: false }),
    blk('quote', { rich_text: [rt('La cellule est l\'unité du vivant.', { italic: true })] }),
    blk('callout', { rich_text: [rt('À retenir : le noyau contient l\'ADN.')], icon: { type: 'emoji', emoji: '💡' }, color: 'green_background' }),
    blk('code', { rich_text: [rt('ADN → ARN → protéine')], language: 'plain text' }),
    blk('toggle', { rich_text: [rt('Pourquoi la membrane est-elle importante ?')] }, [blk('paragraph', { rich_text: [rt('Elle filtre ce qui entre et sort de la cellule.')] })]),
    tbl,
    blk('image', { type: 'external', external: { url: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Animal_cell_structure_fr.svg' }, caption: [rt('Schéma d\'une cellule animale')] }),
    blk('paragraph', { rich_text: [rt('Voir aussi : '), mention(P2, 'Planning du bac')] }),
    blk('embed', { url: 'https://www.youtube.com/watch?v=URUJD5NEXC8' }),
    blk('divider', {}),
    blk('column_list', {}, [blk('column', {}, [blk('paragraph', { rich_text: [rt('Colonne de gauche')] })]), blk('column', {}, [blk('paragraph', { rich_text: [rt('Colonne de droite')] })])]),
    { id: P3, object: 'block', type: 'child_page', child_page: { title: 'Chapitre 3 — exercices' }, has_children: true, _kids: [] },
  ];
  st.blocks[P2] = [blk('heading_2', { rich_text: [rt('Juin')] }), blk('to_do', { rich_text: [rt('Réviser l\'histoire')], checked: false }), blk('to_do', { rich_text: [rt('Fiches de maths')], checked: true })];
  st.blocks[P3] = [blk('paragraph', { rich_text: [rt('Exercice 1 : légender le schéma.')] })];
  st.db[DB] = {
    id: DB, object: 'database', title: [rt('Devoirs')], url: `https://www.notion.so/${DB}`, last_edited_time: minute(now - 3600e3), icon: { type: 'emoji', emoji: '✅' },
    properties: {
      Nom: { id: 'n', name: 'Nom', type: 'title', title: {} },
      Statut: { id: 's', name: 'Statut', type: 'status', status: { options: [{ name: 'À faire', color: 'gray' }, { name: 'En cours', color: 'blue' }, { name: 'Terminé', color: 'green' }] } },
      'Échéance': { id: 'd', name: 'Échéance', type: 'date', date: {} },
      'Matière': { id: 'm', name: 'Matière', type: 'select', select: { options: [{ name: 'Maths' }, { name: 'Bio' }, { name: 'Histoire' }] } },
    },
  };
  const rows = [['Exercices p. 42', 'À faire', 1, 'Maths'], ['Exposé sur la cellule', 'En cours', 3, 'Bio'], ['Fiche : la Révolution', 'Terminé', -2, 'Histoire'], ['Contrôle de géométrie', 'À faire', 6, 'Maths'], ['Lire le chapitre 4', 'À faire', 2, 'Histoire'], ['Schéma du cœur', 'À faire', 9, 'Bio'], ['Corriger le devoir', 'Terminé', -1, 'Maths']];
  rows.forEach(([ti, s, d, m], k) => {
    const id = `row-${k + 1}`;
    st.pages[id] = { id, object: 'page', created_time: minute(now - 2 * 864e5), last_edited_time: minute(now - 3600e3), archived: false, parent: { type: 'database_id', database_id: DB }, url: `https://www.notion.so/${id}`,
      properties: { Nom: { id: 'n', type: 'title', title: [rt(ti)] }, Statut: { id: 's', type: 'status', status: { name: s } }, 'Échéance': { id: 'd', type: 'date', date: { start: new Date(now + d * 864e5).toISOString().slice(0, 10) } }, 'Matière': { id: 'm', type: 'select', select: { name: m } } } };
  });
  return st;
}
let db = null;
const load = () => { if (db) return db; try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { db = null; } if (!db) { db = seed(); save(); } return db; };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* rien */ } };
const strip = (b) => { const { _kids, ...o } = b; return o; };
const titleOf = (p) => (Object.values(p.properties || {}).find((x) => x.type === 'title')?.title || []).map((r) => r.plain_text).join('');
const paginate = (list, body = {}) => {
  const size = Math.min(mockConfig.pageSize, body.page_size || 100);
  const start = body.start_cursor ? Number(body.start_cursor) : 0;
  const results = list.slice(start, start + size);
  return { object: 'list', results, has_more: start + size < list.length, next_cursor: start + size < list.length ? String(start + size) : null };
};
const findBlock = (id) => { const d = load(); for (const k of Object.keys(d.blocks)) { const walk = (arr) => { for (const b of arr) { if (b.id === id) return b; const f = walk(b._kids || []); if (f) return f; } return null; }; const f = walk(d.blocks[k]); if (f) return f; } return null; };
const mkBlocks = (kids) => (kids || []).map((b) => { const k = b[b.type]?.children; const o = { ...b, id: nid(), object: 'block', has_children: !!k?.length, _kids: mkBlocks(k) }; if (k) delete o[b.type].children; return o; });
const err = (status, code, message) => ({ status, headers: {}, body: { object: 'error', status, code, message } });

let count = 0;
export const mockStats = { requests: 0, rateLimited: 0 };
// Pour les tests : modifier une ligne « côté Notion », remettre à zéro
export const mockAdmin = {
  reset() { db = seed(); save(); count = 0; },
  edit(id, props) { const d = load(); const p = d.pages[id]; if (!p) return false; Object.assign(p.properties, props); p.last_edited_time = minute(Date.now() + 60000); save(); return true; },
  state: () => load(),
};

async function route(method, path, body = {}) {
  const d = load();
  const [p, qs] = path.split('?');
  const q = Object.fromEntries(new URLSearchParams(qs || ''));
  let m;
  if (method === 'POST' && p === '/v1/search') {
    const query = (body.query || '').toLowerCase();
    const kind = body.filter?.value;
    let list = [...(kind !== 'database' ? Object.values(d.pages).filter((x) => !x.archived && x.parent.type !== 'database_id') : []), ...(kind !== 'page' ? Object.values(d.db) : [])];
    if (query) list = list.filter((x) => (x.object === 'database' ? x.title.map((r) => r.plain_text).join('') : titleOf(x)).toLowerCase().includes(query));
    return { status: 200, headers: {}, body: paginate(list, body) };
  }
  if ((m = /^\/v1\/blocks\/([^/]+)\/children$/.exec(p))) {
    const id = m[1];
    if (method === 'GET') {
      const list = d.blocks[id] || findBlock(id)?._kids;
      if (!list) return err(404, 'object_not_found', 'Could not find block');
      return { status: 200, headers: {}, body: paginate(list.map(strip), { page_size: Number(q.page_size) || 100, start_cursor: q.start_cursor }) };
    }
    if (method === 'PATCH') {
      const target = d.blocks[id] ? d.blocks[id] : findBlock(id)?._kids;
      if (!target) return err(404, 'object_not_found', 'Could not find block');
      if ((body.children || []).length > 100) return err(400, 'validation_error', 'body.children.length should be ≤ 100');
      target.push(...mkBlocks(body.children));
      if (d.pages[id]) d.pages[id].last_edited_time = minute();
      save();
      return { status: 200, headers: {}, body: { object: 'list', results: [] } };
    }
  }
  if ((m = /^\/v1\/pages\/([^/]+)$/.exec(p))) {
    const pg = d.pages[m[1]];
    if (!pg) return err(404, 'object_not_found', 'Could not find page');
    if (method === 'GET') return { status: 200, headers: {}, body: pg };
    if (method === 'PATCH') { if (body.properties) Object.assign(pg.properties, body.properties); if ('archived' in body) pg.archived = !!body.archived; pg.last_edited_time = minute(); save(); return { status: 200, headers: {}, body: pg }; }
  }
  if ((m = /^\/v1\/databases\/([^/]+)$/.exec(p)) && method === 'GET') {
    return d.db[m[1]] ? { status: 200, headers: {}, body: d.db[m[1]] } : err(404, 'object_not_found', 'Could not find database');
  }
  if ((m = /^\/v1\/databases\/([^/]+)\/query$/.exec(p)) && method === 'POST') {
    if (!d.db[m[1]]) return err(404, 'object_not_found', 'Could not find database');
    let rows = Object.values(d.pages).filter((x) => !x.archived && x.parent.type === 'database_id' && x.parent.database_id === m[1]);
    const f = body.filter;
    const since = f?.last_edited_time?.on_or_after || f?.and?.find((x) => x.last_edited_time)?.last_edited_time?.on_or_after;
    if (since) rows = rows.filter((x) => x.last_edited_time >= since);
    rows.sort((a, b) => (a.last_edited_time < b.last_edited_time ? -1 : 1));
    return { status: 200, headers: {}, body: paginate(rows, body) };
  }
  if (method === 'POST' && p === '/v1/pages') {
    const id = nid();
    const parent = body.parent?.database_id ? { type: 'database_id', database_id: body.parent.database_id } : { type: 'page_id', page_id: body.parent?.page_id };
    if (parent.type === 'page_id' && !d.pages[parent.page_id]) return err(404, 'object_not_found', 'Could not find parent page');
    if ((body.children || []).length > 100) return err(400, 'validation_error', 'body.children.length should be ≤ 100');
    d.pages[id] = { id, object: 'page', created_time: minute(), last_edited_time: minute(), archived: false, parent, url: `https://www.notion.so/${id}`, properties: body.properties || {} };
    d.blocks[id] = mkBlocks(body.children);
    if (parent.type === 'page_id') (d.blocks[parent.page_id] ||= []).push({ id, object: 'block', type: 'child_page', child_page: { title: titleOf(d.pages[id]) }, has_children: true, _kids: [] });
    save();
    return { status: 200, headers: {}, body: d.pages[id] };
  }
  return err(400, 'invalid_request_url', `Chemin non géré par le Notion factice : ${method} ${path}`);
}

export const mockProxy = {
  async startAuth({ state, redirectUri }) {
    const u = new URL(redirectUri || location.href);
    u.searchParams.set('code', 'mock-code'); u.searchParams.set('state', state);
    return { url: u.toString() };
  },
  async finishAuth({ code }) {
    if (code !== 'mock-code') { const e = new Error('Code refusé'); e.code = 'invalid_grant'; throw e; }
    load();
    return { workspaceId: 'ws-demo', workspaceName: 'Espace de démonstration', workspaceIcon: '🧪', botId: 'bot-demo' };
  },
  async request({ method, path, body }) {
    await new Promise((r) => setTimeout(r, mockConfig.latency));
    mockStats.requests++;
    if (mockConfig.every429 && ++count % mockConfig.every429 === 0) { mockStats.rateLimited++; return { status: 429, headers: { 'retry-after': String(mockConfig.retryAfter) }, body: { object: 'error', status: 429, code: 'rate_limited', message: 'Rate limited' } }; }
    return route(method, path, body ? JSON.parse(JSON.stringify(body)) : {});
  },
  async disconnect() { return { ok: true }; },
};
