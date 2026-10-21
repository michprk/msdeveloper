// Interface notionProxy (1.12) : tout ce qui touche à Notion passe par elle.
// Le secret OAuth de l'intégration Notion n'est JAMAIS dans l'application : c'est le serveur qui échange
// le code d'autorisation, garde le jeton d'accès et transmet les requêtes à l'API Notion (qui refuse de
// toute façon les appels directs depuis un navigateur). Le contrat est décrit dans NOTION.md.
//
//   startAuth({ state, redirectUri })     → { url }   adresse d'autorisation Notion (client_id ajouté par le serveur)
//   finishAuth({ code, state, redirectUri }) → { workspaceId, workspaceName, workspaceIcon, botId }
//   request({ method, path, body })       → { status, headers: { 'retry-after'?: string }, body }
//   disconnect()                          → { ok: true }   le serveur oublie le jeton
//
// Deux implémentations : le serveur (NOTION.proxyUrl dans config.js) ou un Notion factice pour développer
// et tester (NOTION.mock, ou ?notion=mock dans l'adresse). Sans l'un ni l'autre, la connexion directe est indisponible.
import { NOTION } from '../config.js';
import { sessionToken } from '../cloud.js';

const MOCK_KEY = 'msdev:notion-mock-on';
// ?notion=mock (ou ?notion=off) dans l'adresse : mémorisé pour la session, pour développer et tester
try {
  const q = new URLSearchParams(location.search).get('notion');
  if (q === 'mock') sessionStorage.setItem(MOCK_KEY, '1');
  if (q === 'off') sessionStorage.removeItem(MOCK_KEY);
} catch (e) { /* rien */ }
export const mockOn = () => { try { return !!NOTION.mock || sessionStorage.getItem(MOCK_KEY) === '1'; } catch (e) { return !!NOTION.mock; } };
export const notionAvailable = () => mockOn() || !!NOTION.proxyUrl;

function serverProxy(base) {
  const call = async (path, body = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    const tok = await sessionToken().catch(() => null);
    if (tok) headers.Authorization = `Bearer ${tok}`;
    let r;
    try { r = await fetch(base.replace(/\/$/, '') + path, { method: 'POST', headers, body: JSON.stringify(body) }); }
    catch (e) { const err = new Error('network'); err.code = 'network'; throw err; }
    const data = await r.json().catch(() => null);
    if (!r.ok) { const err = new Error(data?.message || `Erreur ${r.status}`); err.code = data?.code || `http_${r.status}`; err.status = r.status; throw err; }
    return data;
  };
  return {
    startAuth: (o) => call('/notion/auth/start', o),
    finishAuth: (o) => call('/notion/auth/finish', o),
    request: (o) => call('/notion/request', o),
    disconnect: () => call('/notion/disconnect'),
  };
}

let impl = null;
export async function notionProxy() {
  if (mockOn()) { const m = await import('./mock.js'); return m.mockProxy; }
  if (!NOTION.proxyUrl) { const err = new Error('unavailable'); err.code = 'unavailable'; throw err; }
  impl ||= serverProxy(NOTION.proxyUrl);
  return impl;
}
