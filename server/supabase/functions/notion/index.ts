// Proxy Notion de MindView (contrat décrit dans NOTION.md) : une seule fonction, quatre chemins.
//   POST /functions/v1/notion/auth/start    { state, redirectUri }        → { url }
//   POST /functions/v1/notion/auth/finish   { code, state, redirectUri }  → { workspaceId, workspaceName, workspaceIcon, botId }
//   POST /functions/v1/notion/request       { method, path, body }        → { status, headers: { 'retry-after' }, body }
//   POST /functions/v1/notion/disconnect    {}                             → { ok: true }
// - Le secret OAuth (NOTION_CLIENT_SECRET) et les jetons d'accès restent ICI : jamais renvoyés au navigateur.
// - Chaque appel exige la session Supabase de la personne : le jeton Notion est rangé sous son compte.
// - /request : liste blanche des chemins de l'API, corps limité à 1 Mo, contenu jamais enregistré.
// Secrets à définir : NOTION_CLIENT_ID, NOTION_CLIENT_SECRET, et NOTION_REDIRECT_URI (adresse de l'application,
// exactement celle déclarée chez Notion ; plusieurs possibles, séparées par des virgules).
import { admin, json, handler, currentUser, APP_URL } from '../_shared/common.ts';

const CLIENT_ID = Deno.env.get('NOTION_CLIENT_ID') ?? '';
const SECRET = Deno.env.get('NOTION_CLIENT_SECRET') ?? '';
const REDIRECTS = (Deno.env.get('NOTION_REDIRECT_URI') ?? APP_URL).split(',').map((s) => s.trim()).filter(Boolean);
const API = 'https://api.notion.com';
const VERSION = '2022-06-28';
const MAX_BODY = 1024 * 1024;
const ID = '[0-9a-fA-F-]{32,36}';
const ALLOWED: [string, RegExp][] = [
  ['POST', /^\/v1\/search$/],
  ['GET', new RegExp(`^/v1/pages/${ID}$`)],
  ['PATCH', new RegExp(`^/v1/pages/${ID}$`)],
  ['POST', /^\/v1\/pages$/],
  ['GET', new RegExp(`^/v1/databases/${ID}$`)],
  ['POST', new RegExp(`^/v1/databases/${ID}/query$`)],
  ['GET', new RegExp(`^/v1/blocks/${ID}/children(\\?(page_size=\\d{1,3})(&start_cursor=[\\w%-]+)?)?$`)],
  ['PATCH', new RegExp(`^/v1/blocks/${ID}/children$`)],
];
const basic = () => `Basic ${btoa(`${CLIENT_ID}:${SECRET}`)}`;
const fail = (req: Request, status: number, code: string, message: string) => json(req, { code, message }, status);

async function tokenRequest(body: Record<string, string>) {
  const r = await fetch(`${API}/v1/oauth/token`, {
    method: 'POST',
    headers: { Authorization: basic(), 'Content-Type': 'application/json', 'Notion-Version': VERSION },
    body: JSON.stringify(body),
  });
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
}

Deno.serve(handler(async (req) => {
  if (!CLIENT_ID || !SECRET) return fail(req, 503, 'unavailable', 'La connexion à Notion n\'est pas encore configurée sur le serveur.');
  const user = await currentUser(req);
  if (!user) return fail(req, 401, 'auth', 'Connecte-toi à ton compte MindView pour relier Notion.');
  const path = new URL(req.url).pathname;
  const raw = await req.text();
  if (raw.length > MAX_BODY) return fail(req, 413, 'too_big', 'Envoi trop volumineux.');
  // deno-lint-ignore no-explicit-any
  const input: any = raw ? JSON.parse(raw) : {};

  // ---------- Début de la connexion ----------
  if (path.endsWith('/notion/auth/start')) {
    const { state, redirectUri } = input;
    if (typeof state !== 'string' || state.length < 16 || state.length > 200) return fail(req, 400, 'state', 'Paramètre de sécurité invalide.');
    if (!REDIRECTS.includes(redirectUri)) return fail(req, 400, 'redirect', 'Adresse de retour non autorisée.');
    // Ménage : états de plus de 15 minutes
    await admin.from('notion_oauth_states').delete().lt('created_at', new Date(Date.now() - 15 * 60e3).toISOString());
    const { error } = await admin.from('notion_oauth_states').insert({ state, user_id: user.id });
    if (error) throw error;
    const url = `${API}/v1/oauth/authorize?client_id=${encodeURIComponent(CLIENT_ID)}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
    return json(req, { url });
  }

  // ---------- Retour de Notion : échange du code contre le jeton (gardé ici) ----------
  if (path.endsWith('/notion/auth/finish')) {
    const { code, state, redirectUri } = input;
    if (!REDIRECTS.includes(redirectUri)) return fail(req, 400, 'redirect', 'Adresse de retour non autorisée.');
    // Le « state » doit avoir été créé par CE compte il y a moins de 15 minutes, et ne sert qu'une fois
    const { data: st } = await admin.from('notion_oauth_states').delete().eq('state', state ?? '').eq('user_id', user.id).select('created_at').maybeSingle();
    if (!st || Date.now() - Date.parse(st.created_at) > 15 * 60e3) return fail(req, 400, 'state', 'La connexion à Notion a expiré. Recommence.');
    const t = await tokenRequest({ grant_type: 'authorization_code', code: String(code ?? ''), redirect_uri: redirectUri });
    if (!t.ok || !t.data.access_token) return fail(req, 400, 'oauth', 'Notion a refusé la connexion. Recommence.');
    const row = {
      user_id: user.id,
      access_token: t.data.access_token,
      refresh_token: t.data.refresh_token ?? null,
      workspace_id: t.data.workspace_id ?? null,
      workspace_name: t.data.workspace_name ?? null,
      workspace_icon: t.data.workspace_icon ?? null,
      bot_id: t.data.bot_id ?? null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await admin.from('notion_links').upsert(row, { onConflict: 'user_id' });
    if (error) throw error;
    return json(req, { workspaceId: row.workspace_id, workspaceName: row.workspace_name, workspaceIcon: row.workspace_icon, botId: row.bot_id });
  }

  // ---------- Requête vers l'API Notion (transmise, jamais enregistrée) ----------
  if (path.endsWith('/notion/request')) {
    const method = String(input.method ?? '').toUpperCase();
    const p = String(input.path ?? '');
    if (!ALLOWED.some(([m, re]) => m === method && re.test(p))) return fail(req, 400, 'path', 'Demande Notion non autorisée.');
    const { data: link } = await admin.from('notion_links').select('access_token, refresh_token').eq('user_id', user.id).maybeSingle();
    if (!link) return fail(req, 401, 'not_connected', 'Notion n\'est pas relié à ce compte.');
    const send = (token: string) => fetch(API + p, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Notion-Version': VERSION, 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(input.body ?? {}),
    });
    let r = await send(link.access_token);
    // Jeton expiré et renouvelable : un essai de plus avec un nouveau jeton
    if (r.status === 401 && link.refresh_token) {
      const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: link.refresh_token });
      if (t.ok && t.data.access_token) {
        await admin.from('notion_links').update({ access_token: t.data.access_token, refresh_token: t.data.refresh_token ?? link.refresh_token, updated_at: new Date().toISOString() }).eq('user_id', user.id);
        r = await send(t.data.access_token);
      }
    }
    const body = await r.json().catch(() => null);
    if (r.status >= 500) console.error('Notion', r.status, method, p.replace(/[0-9a-f-]{32,36}/gi, ':id'));
    return json(req, { status: r.status, headers: { 'retry-after': r.headers.get('Retry-After') }, body });
  }

  // ---------- Déconnexion : le jeton est oublié ----------
  if (path.endsWith('/notion/disconnect')) {
    await admin.from('notion_links').delete().eq('user_id', user.id);
    return json(req, { ok: true });
  }
  return fail(req, 404, 'not_found', 'Chemin inconnu.');
}));
