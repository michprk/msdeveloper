// Comptes en ligne, stockage et paiement réel (Supabase + Stripe). Inactif tant que config.js est vide.
// - Connexion : e-mail et mot de passe, ou Google / Apple (OAuth avec PKCE). Le serveur vérifie tout ;
//   l'application ne garde qu'un jeton de session, jamais le mot de passe.
// - Liens reçus par e-mail (confirmer l'adresse, nouveau mot de passe) : repris au démarrage, puis l'adresse est nettoyée.
// - Stockage : la table `user_data` (voir sync.js), protégée par les règles de la base (chacun la sienne).
// - L'abonnement est lu dans la base (seul le serveur l'écrit, à partir des événements Stripe).
// - Le paiement et la gestion (formule, carte, factures, résiliation) se font chez Stripe.
// - Mesures : deux événements seulement (« ouvert aujourd'hui », « première prise en main »),
//   jamais de contenu, et seulement avec un compte et si la personne ne l'a pas refusé.
// - Serveur factice (1.15) : ?cloud=mock dans l'adresse (mémorisé pour la session) ou CLOUD.mock = true.
//   Tout se joue dans le navigateur, pour essayer les comptes, la synchro et le paiement sans rien créer.
import { CLOUD, AUTH_MODE } from './config.js';
import { S, update, DAY, GRACE_DAYS } from './store.js';
import { tv } from './strings.js';

const MOCK_KEY = 'msdev:cloud-mock-on';
try {
  const q = new URLSearchParams(location.search).get('cloud');
  if (q === 'mock') sessionStorage.setItem(MOCK_KEY, '1');
  if (q === 'off') sessionStorage.removeItem(MOCK_KEY);
} catch (e) { /* rien */ }
export const cloudMock = () => { try { return !!CLOUD.mock || sessionStorage.getItem(MOCK_KEY) === '1'; } catch (e) { return !!CLOUD.mock; } };
export const MOCK_URL = 'https://serveur-factice.mindview.local';
const base = () => (cloudMock() ? MOCK_URL : CLOUD.url.replace(/\/$/, ''));
export const cloudReady = () => cloudMock() || !!(CLOUD.url && CLOUD.anonKey);
// Mode des comptes réellement actif : en ligne seulement si demandé ET si le serveur est configuré
export const authMode = () => ((AUTH_MODE === 'online' || cloudMock()) && cloudReady() ? 'online' : 'local');
// Adresse de retour (liens e-mail, Google, Stripe) : cette page, sans paramètres ni route
export const appUrl = () => location.origin + location.pathname;
export const providers = () => (cloudMock() ? ['google'] : (CLOUD.providers || []).filter((p) => ['google', 'apple'].includes(p)));

let mockFetch = null;
async function transport(url, init) {
  if (!cloudMock()) return fetch(url, init);
  mockFetch ||= (await import('./cloud-mock.js')).mockFetch;
  return mockFetch(url, init);
}

const KEY = () => (cloudMock() ? 'msdev:cloud-mock-session' : 'msdev:cloud');
const read = () => { try { return JSON.parse(localStorage.getItem(KEY()) || 'null'); } catch (e) { return null; } };
let ses = read();
function save(x) {
  ses = x;
  try { if (x) localStorage.setItem(KEY(), JSON.stringify(x)); else localStorage.removeItem(KEY()); } catch (e) { /* stockage indisponible */ }
  window.dispatchEvent(new Event('ms:rerender'));
}
export const cloudUser = () => (cloudReady() && ses?.user) || null;

export class CloudError extends Error { constructor(code, message, status) { super(message); this.code = code; this.status = status; } }
const MESSAGES = {
  offline: () => tv('Pas de connexion internet. Tes données restent accessibles ; réessaie une fois connecté.', 'Pas de connexion internet. Vos données restent accessibles ; réessayez une fois connecté.'),
  network: () => tv('Le serveur ne répond pas. Réessaie dans un instant.', 'Le serveur ne répond pas. Réessayez dans un instant.'),
  auth: () => tv('Ta session a expiré : reconnecte-toi.', 'Votre session a expiré : reconnectez-vous.'),
  otp_expired: () => tv('Ce lien a expiré ou a déjà servi. Demandes-en un nouveau.', 'Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.'),
  link: () => tv('Ce lien n\'est plus valable. Demandes-en un nouveau.', 'Ce lien n\'est plus valable. Demandez-en un nouveau.'),
  invalid_credentials: () => 'E-mail ou mot de passe incorrect.',
  email_not_confirmed: () => tv('Confirme d\'abord ton adresse : clique sur le lien reçu par e-mail.', 'Confirmez d\'abord votre adresse : cliquez sur le lien reçu par e-mail.'),
  user_already_exists: () => tv('Un compte existe déjà avec cette adresse : connecte-toi.', 'Un compte existe déjà avec cette adresse : connectez-vous.'),
  email_exists: () => tv('Un compte existe déjà avec cette adresse : connecte-toi.', 'Un compte existe déjà avec cette adresse : connectez-vous.'),
  weak_password: () => 'Mot de passe trop faible : au moins 8 caractères, avec un chiffre ou un signe.',
  same_password: () => tv('Choisis un mot de passe différent de l\'ancien.', 'Choisissez un mot de passe différent de l\'ancien.'),
  reauthentication_needed: () => tv('Pour changer ton mot de passe, utilise le lien « Mot de passe oublié ».', 'Pour changer votre mot de passe, utilisez le lien « Mot de passe oublié ».'),
  over_email_send_rate_limit: () => tv('Trop d\'e-mails demandés. Patiente une minute avant de réessayer.', 'Trop d\'e-mails demandés. Patientez une minute avant de réessayer.'),
  over_request_rate_limit: () => tv('Trop d\'essais. Patiente une minute.', 'Trop d\'essais. Patientez une minute.'),
  trial_used: () => tv('Tu as déjà profité de l\'essai gratuit sur ce compte.', 'Vous avez déjà profité de l\'essai gratuit sur ce compte.'),
  already: () => tv('Tu as déjà un abonnement : change de formule depuis « Gérer mon abonnement ».', 'Vous avez déjà un abonnement : changez de formule depuis « Gérer mon abonnement ».'),
};
export const cloudMessage = (e) => MESSAGES[e?.code]?.() || e?.message || 'Une erreur est survenue.';

async function call(path, { method = 'GET', body, auth = true, prefer, token: tok } = {}) {
  if (!cloudReady()) throw new CloudError('off', 'Les comptes en ligne ne sont pas encore ouverts.');
  if (!navigator.onLine) throw new CloudError('offline', MESSAGES.offline());
  const headers = { apikey: CLOUD.anonKey || 'factice', 'Content-Type': 'application/json' };
  if (prefer) headers.Prefer = prefer;
  if (tok) headers.Authorization = `Bearer ${tok}`;
  else if (auth) {
    const t = await token();
    if (!t) throw new CloudError('auth', MESSAGES.auth(), 401);
    headers.Authorization = `Bearer ${t}`;
  }
  let r;
  try { r = await transport(base() + path, { method, headers, body: body ? JSON.stringify(body) : undefined }); }
  catch (e) { throw new CloudError('network', MESSAGES.network()); }
  const data = r.status === 204 ? null : await r.json().catch(() => null);
  if (!r.ok) {
    const code = r.status === 401 && auth ? 'auth' : data?.error_code || data?.code || data?.error || 'http';
    throw new CloudError(code, MESSAGES[code]?.() || data?.msg || data?.message || data?.error_description || `Erreur ${r.status}`, r.status);
  }
  return data;
}
// Accès à la base (PostgREST) pour la synchronisation : toujours avec la session de la personne
export const rest = (path, opts = {}) => call(path, { ...opts, auth: true });

const norm = (d) => ({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600), user: { id: d.user?.id, email: d.user?.email, provider: d.user?.app_metadata?.provider || 'email', name: d.user?.user_metadata?.full_name || d.user?.user_metadata?.name || '' } });
let refreshing = null;
// Jeton de session (pour les appels au proxy Notion du serveur) ; null sans compte en ligne
export const sessionToken = () => (cloudReady() ? token() : Promise.resolve(null));
async function token() {
  if (!ses) return null;
  if (ses.expires_at && Date.now() / 1000 < ses.expires_at - 60) return ses.access_token;
  refreshing ||= call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: ses.refresh_token }, auth: false })
    .then((d) => { save(norm(d)); return ses.access_token; })
    .catch((e) => { if (!['network', 'offline'].includes(e.code)) save(null); return null; })
    .finally(() => { refreshing = null; });
  return refreshing;
}

// ---------- Connexion ----------
const back = () => `redirect_to=${encodeURIComponent(appUrl())}`;
export const sendCode = (email) => call('/auth/v1/otp', { method: 'POST', body: { email, create_user: true }, auth: false });
export async function verifyCode(email, code) {
  const d = await call('/auth/v1/verify', { method: 'POST', body: { type: 'email', email, token: code }, auth: false });
  save(norm(d));
  track('active_day');
  await refreshSubscription().catch(() => null);
  return ses.user;
}
// Inscription : e-mail et mot de passe. Si le serveur demande de confirmer l'adresse, aucune session
// n'est ouverte tout de suite : erreur « confirm », la session arrivera avec le lien reçu par e-mail.
export async function signUpPassword(email, password) {
  const d = await call(`/auth/v1/signup?${back()}`, { method: 'POST', body: { email, password }, auth: false });
  if (d?.access_token) { save(norm(d)); track('active_day'); }
  else throw new CloudError('confirm', tv('Compte créé : confirme ton adresse avec le lien reçu par e-mail.', 'Compte créé : confirmez votre adresse avec le lien reçu par e-mail.'));
  return ses.user;
}
export async function signInPassword(email, password) {
  const d = await call('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password }, auth: false });
  save(norm(d));
  track('active_day');
  await refreshSubscription().catch(() => null);
  return ses.user;
}
export const recoverPassword = (email) => call(`/auth/v1/recover?${back()}`, { method: 'POST', body: { email }, auth: false });
export const resendConfirmation = (email) => call(`/auth/v1/resend?${back()}`, { method: 'POST', body: { type: 'signup', email }, auth: false });
// Nouveau mot de passe (après un lien « mot de passe oublié », ou depuis Compte)
export const updatePassword = (password) => call('/auth/v1/user', { method: 'PUT', body: { password } });
export async function signOut() {
  try { await call('/auth/v1/logout', { method: 'POST' }); } catch (e) { /* déconnexion locale quand même */ }
  save(null);
}

// Google / Apple : OAuth avec PKCE. Le code de vérification reste sur l'appareil ; Supabase renvoie ?code=…
const PKCE = 'msdev:pkce';
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const pkce = () => { try { const p = JSON.parse(localStorage.getItem(PKCE) || 'null'); return p && Date.now() - p.at < 15 * 60e3 ? p : null; } catch (e) { return null; } };
export async function signInWithProvider(provider) {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  try { localStorage.setItem(PKCE, JSON.stringify({ v: verifier, at: Date.now() })); } catch (e) { /* rien */ }
  window.dispatchEvent(new Event('ms:leaving'));
  if (cloudMock()) { const m = await import('./cloud-mock.js'); location.href = m.mockAuthorize(provider, challenge, appUrl()); return; }
  location.href = `${base()}/auth/v1/authorize?provider=${encodeURIComponent(provider)}&${back()}&code_challenge=${challenge}&code_challenge_method=s256`;
}

// Retour dans l'application avec une session (lien e-mail, Google…). Appelé AVANT le premier affichage :
// lit l'adresse, la nettoie aussitôt (les jetons ne restent ni dans l'adresse ni dans l'historique).
export function takeAuthReturn() {
  if (!cloudReady()) return null;
  const q = new URLSearchParams(location.search);
  const h = location.hash.slice(1);
  const frag = /(^|&)(access_token|error)=/.test(h) ? new URLSearchParams(h) : null;
  let ret = null;
  if (frag?.get('access_token')) {
    ret = { kind: 'tokens', type: frag.get('type') || '', d: { access_token: frag.get('access_token'), refresh_token: frag.get('refresh_token'), expires_at: +frag.get('expires_at') || null, expires_in: +frag.get('expires_in') || 3600 } };
  } else if (frag?.get('error') || (q.get('error') && !q.get('state'))) {
    const src = frag || q;
    ret = { kind: 'error', code: src.get('error_code') || src.get('error'), message: src.get('error_description') || '' };
  } else if (q.get('code') && !q.get('state') && pkce()) ret = { kind: 'code', type: 'oauth', code: q.get('code') };
  if (!ret) return null;
  for (const k of ['code', 'error', 'error_code', 'error_description']) q.delete(k);
  const qs = q.toString();
  history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : '') + (ret.type === 'recovery' ? '#/reglages' : '#/'));
  return ret;
}
export async function finishAuthReturn(ret) {
  if (ret.kind === 'error') throw new CloudError(ret.code === 'otp_expired' ? 'otp_expired' : 'link', MESSAGES[ret.code === 'otp_expired' ? 'otp_expired' : 'link']());
  let d;
  if (ret.kind === 'code') {
    const p = pkce();
    try { localStorage.removeItem(PKCE); } catch (e) { /* rien */ }
    if (!p) throw new CloudError('link', MESSAGES.link());
    d = await call('/auth/v1/token?grant_type=pkce', { method: 'POST', body: { auth_code: ret.code, code_verifier: p.v }, auth: false });
  } else {
    d = { ...ret.d, user: await call('/auth/v1/user', { token: ret.d.access_token }) };
  }
  save(norm(d));
  track('active_day');
  await refreshSubscription().catch(() => null);
  return { user: ses.user, type: ret.type };
}

// ---------- Abonnement ----------
// La base est la seule source de vérité ; l'appareil garde une copie pour fonctionner hors ligne.
export function applySubscription(row) {
  const live = row && ['active', 'trialing', 'past_due'].includes(row.status);
  const yearly = row?.billing_interval === 'year';
  update((s) => {
    const b = s.sub;
    const end = row?.current_period_end ? Date.parse(row.current_period_end) : null;
    Object.assign(b, {
      source: 'stripe', demo: null, failNext: false, pending: null, pendingInterval: null,
      card: row?.has_payment_method ? 1 : 0,
      plan: live ? row.plan : 'free',
      interval: yearly ? 'year' : 'month',
      status: live ? (row.status === 'past_due' ? 'past_due' : row.status === 'trialing' ? 'trialing' : 'active') : row ? 'ended' : 'none',
      periodEnd: live ? end : null, periodStart: live && end ? end - (yearly ? 365 : 30) * DAY : null,
      cancelAt: live && !!row.cancel_at_period_end,
      graceEnd: row?.status === 'past_due' && end ? end + GRACE_DAYS * DAY : null,
    });
  });
}
export async function refreshSubscription() {
  if (!cloudUser()) return null;
  const rows = await call('/rest/v1/subscriptions?select=plan,status,billing_interval,has_payment_method,current_period_end,cancel_at_period_end&limit=1');
  const row = rows?.[0] || null;
  applySubscription(row);
  return row;
}
export async function checkout(plan, { trial = false, interval = 'month' } = {}) {
  const d = await call('/functions/v1/create-checkout-session', { method: 'POST', body: { plan, trial, interval } });
  // Essai sans carte : démarré directement par le serveur, pas de page de paiement
  if (d?.started) {
    for (let i = 0; i < 6; i++) { const row = await refreshSubscription().catch(() => null); if (row && row.status === 'trialing') return 'trial'; await new Promise((r) => setTimeout(r, 1500)); }
    return 'trial';
  }
  if (!d?.url) throw new CloudError('http', 'Le paiement n\'a pas pu démarrer.');
  window.dispatchEvent(new Event('ms:leaving'));
  location.href = d.url;
}
export async function openPortal() {
  const d = await call('/functions/v1/create-portal-session', { method: 'POST', body: {} });
  if (!d?.url) throw new CloudError('http', 'L\'espace de gestion n\'a pas pu s\'ouvrir.');
  location.href = d.url;
}
export async function deleteCloudAccount() {
  await call('/functions/v1/delete-account', { method: 'POST', body: {} });
  save(null);
}

// ---------- Mesures (les 4 chiffres, voir MESURES.md) ----------
const sent = new Set();
export async function track(name) {
  if (!cloudUser() || S().prefs.share === false) return;
  const k = `${name}:${new Date().toDateString()}`;
  if (sent.has(k)) return;
  sent.add(k);
  try { await call('/rest/v1/events', { method: 'POST', body: { name } }); } catch (e) { /* déjà compté aujourd'hui, ou hors ligne */ }
}
// « Prise en main » : 3 tâches ou 1 projet créés par la personne (hors données d'exemple)
export function checkActivation() {
  if (!cloudUser()) return;
  try { if (localStorage.getItem('msdev:activated')) return; } catch (e) { return; }
  const s = S();
  if (s.tasks.filter((t) => !t.demo).length >= 3 || s.projects.some((p) => !p.demo)) {
    track('activated').then(() => { try { localStorage.setItem('msdev:activated', '1'); } catch (e) { /* rien */ } });
  }
}
