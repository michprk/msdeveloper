// Client Notion : une file d'attente centrale qui respecte la limite de l'API (environ 3 requêtes par seconde
// en moyenne), gère le code 429 (en-tête Retry-After), puis réessaie avec un délai qui double à chaque fois
// (+ un peu de hasard), un nombre limité de fois, avant une erreur claire.
import { notionProxy } from './proxy.js';

export class NotionError extends Error { constructor(code, message, status = 0) { super(message); this.code = code; this.status = status; } }
const MESSAGES = {
  unavailable: 'La connexion directe à Notion n\'est pas encore ouverte. En attendant, l\'import et l\'export par fichier .zip fonctionnent.',
  network: 'Pas de réponse (connexion internet ?). Rien n\'a été perdu : réessaie dans un instant.',
  unauthorized: 'La connexion à Notion a expiré ou a été retirée. Reconnecte Notion.',
  restricted_resource: 'Cette page n\'est pas partagée avec MindView. Dans Notion : ••• → Connexions → ajoute MindView.',
  object_not_found: 'Introuvable dans Notion : la page a été supprimée, ou elle n\'est pas partagée avec MindView.',
  rate_limited: 'Notion demande de ralentir. La synchronisation reprendra un peu plus tard.',
  validation_error: 'Notion a refusé la modification.',
  conflict_error: 'Notion était occupé à modifier la même page. Réessaie.',
  service_unavailable: 'Notion ne répond pas pour le moment. Réessaie dans quelques minutes.',
  too_many: 'Notion ne répond toujours pas après plusieurs essais. Réessaie plus tard : rien n\'a été perdu.',
};
export const notionMessage = (e) => MESSAGES[e?.code] || e?.message || 'Une erreur est survenue avec Notion.';

// ---------- File d'attente : seau de 3 jetons, un jeton rendu toutes les 334 ms ----------
const RATE = { capacity: 3, every: 334, maxTries: 5, base: 500, cap: 8000 };
export const setRate = (o) => Object.assign(RATE, o); // pour les tests
let tokens = RATE.capacity, last = Date.now(), chain = Promise.resolve();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function takeToken() {
  for (;;) {
    const now = Date.now();
    tokens = Math.min(RATE.capacity, tokens + (now - last) / RATE.every);
    last = now;
    if (tokens >= 1) { tokens -= 1; return; }
    await sleep(Math.ceil((1 - tokens) * RATE.every));
  }
}
export const stats = { sent: 0, retries: 0, rateLimited: 0 };

async function send(method, path, body) {
  const proxy = await notionProxy();
  for (let attempt = 0; ; attempt++) {
    await takeToken();
    stats.sent++;
    let res;
    try { res = await proxy.request({ method, path, body }); }
    catch (e) {
      if (e.code === 'unavailable') throw new NotionError('unavailable', MESSAGES.unavailable);
      if (e.status === 401) throw new NotionError('unauthorized', MESSAGES.unauthorized, 401);
      res = { status: 0, headers: {}, body: null }; // réseau : on réessaie
    }
    const st = res.status;
    if (st >= 200 && st < 300) return res.body;
    const code = res.body?.code || (st === 401 ? 'unauthorized' : st === 404 ? 'object_not_found' : st === 429 ? 'rate_limited' : st >= 500 ? 'service_unavailable' : st === 0 ? 'network' : 'http');
    const retryable = st === 0 || st === 429 || st === 409 || st >= 500;
    if (!retryable) throw new NotionError(code, code === 'validation_error' && res.body?.message ? `${MESSAGES.validation_error} (${res.body.message})` : MESSAGES[code] || res.body?.message || `Erreur Notion ${st}`, st);
    if (attempt + 1 >= RATE.maxTries) throw new NotionError('too_many', MESSAGES.too_many, st);
    stats.retries++;
    let wait;
    if (st === 429) {
      stats.rateLimited++;
      const ra = Number(res.headers?.['retry-after'] ?? res.headers?.['Retry-After']);
      wait = Number.isFinite(ra) && ra >= 0 ? ra * 1000 : RATE.base * 2 ** attempt;
      tokens = 0; last = Date.now() + wait; // toute la file attend
    } else {
      wait = Math.min(RATE.cap, RATE.base * 2 ** attempt) + Math.random() * 300;
    }
    await sleep(wait);
  }
}
// Une seule requête à la fois, dans l'ordre (la file centrale)
export function api(method, path, body) {
  const run = chain.then(() => send(method, path, body));
  chain = run.catch(() => null);
  return run;
}

// ---------- Appels utiles (avec pagination) ----------
async function all(fetchPage, max = 1000) {
  const out = [];
  let cursor;
  do {
    const r = await fetchPage(cursor);
    out.push(...(r.results || []));
    cursor = r.has_more ? r.next_cursor : null;
  } while (cursor && out.length < max);
  return out;
}
export const search = (query = '', kind = null, cursor) => api('POST', '/v1/search', { query, ...(kind ? { filter: { property: 'object', value: kind } } : {}), sort: { direction: 'descending', timestamp: 'last_edited_time' }, page_size: 50, ...(cursor ? { start_cursor: cursor } : {}) });
export const getPage = (id) => api('GET', `/v1/pages/${id}`);
export const getDatabase = (id) => api('GET', `/v1/databases/${id}`);
export const children = (id) => all((c) => api('GET', `/v1/blocks/${id}/children?page_size=100${c ? `&start_cursor=${encodeURIComponent(c)}` : ''}`));
export const queryDatabase = (id, filter, sorts) => all((c) => api('POST', `/v1/databases/${id}/query`, { page_size: 100, ...(filter ? { filter } : {}), ...(sorts ? { sorts } : {}), ...(c ? { start_cursor: c } : {}) }), 5000);
export const createPage = (parent, properties, kids = []) => api('POST', '/v1/pages', { parent, properties, ...(kids.length ? { children: kids.slice(0, 100) } : {}) });
export const updatePage = (id, patch) => api('PATCH', `/v1/pages/${id}`, patch);
// Notion accepte 100 blocs par envoi : on découpe
export async function appendChildren(id, kids) {
  for (let i = 0; i < kids.length; i += 100) await api('PATCH', `/v1/blocks/${id}/children`, { children: kids.slice(i, i + 100) });
}
// Contenu complet d'une page : blocs et leurs enfants (bascules, colonnes, tableaux, listes imbriquées), deux niveaux
export async function blockTree(id, depth = 0) {
  const list = await children(id);
  if (depth < 2) for (const b of list) if (b.has_children && b.type !== 'child_page' && b.type !== 'child_database') b.children = await blockTree(b.id, depth + 1);
  return list;
}
