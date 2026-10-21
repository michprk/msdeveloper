// Comptes en ligne et paiement réel. Inactif tant que config.js est vide.
// - Connexion par e-mail : un code à 6 chiffres, sans mot de passe.
// - L'abonnement est lu dans la base (seul le serveur l'écrit, à partir des événements Stripe).
// - Le paiement et la gestion (formule, carte, factures, résiliation) se font chez Stripe.
// - Mesures : deux événements seulement (« ouvert aujourd'hui », « première prise en main »),
//   jamais de contenu, et seulement avec un compte et si la personne ne l'a pas refusé.
import { CLOUD } from './config.js';
import { S, update, DAY, GRACE_DAYS } from './store.js';

export const cloudReady = () => !!(CLOUD.url && CLOUD.anonKey);
const KEY = 'msdev:cloud';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
let ses = read();
function save(x) {
  ses = x;
  try { if (x) localStorage.setItem(KEY, JSON.stringify(x)); else localStorage.removeItem(KEY); } catch (e) { /* stockage indisponible */ }
  window.dispatchEvent(new Event('ms:rerender'));
}
export const cloudUser = () => (cloudReady() && ses?.user) || null;

export class CloudError extends Error { constructor(code, message) { super(message); this.code = code; } }
const MESSAGES = {
  offline: 'Pas de connexion internet. Vos données restent accessibles ; réessayez une fois connecté.',
  network: 'Le serveur ne répond pas. Réessayez dans un instant.',
  auth: 'Votre session a expiré : reconnectez-vous.',
  otp_expired: 'Ce code a expiré ou n\'est pas le bon. Demandez-en un nouveau.',
  invalid_credentials: 'E-mail ou mot de passe incorrect.',
  user_already_exists: 'Un compte existe déjà avec cette adresse : connectez-vous.',
  weak_password: 'Mot de passe trop faible : au moins 8 caractères, avec un chiffre ou un signe.',
  over_email_send_rate_limit: 'Trop de codes demandés. Patientez une minute avant de réessayer.',
  already: 'Vous avez déjà un abonnement : changez de formule depuis « Gérer mon abonnement ».',
};
export const cloudMessage = (e) => MESSAGES[e?.code] || e?.message || 'Une erreur est survenue.';

async function call(path, { method = 'GET', body, auth = true } = {}) {
  if (!cloudReady()) throw new CloudError('off', 'Les comptes en ligne ne sont pas encore ouverts.');
  if (!navigator.onLine) throw new CloudError('offline', MESSAGES.offline);
  const headers = { apikey: CLOUD.anonKey, 'Content-Type': 'application/json' };
  if (auth) {
    const t = await token();
    if (!t) throw new CloudError('auth', MESSAGES.auth);
    headers.Authorization = `Bearer ${t}`;
  }
  let r;
  try { r = await fetch(CLOUD.url.replace(/\/$/, '') + path, { method, headers, body: body ? JSON.stringify(body) : undefined }); }
  catch (e) { throw new CloudError('network', MESSAGES.network); }
  const data = r.status === 204 ? null : await r.json().catch(() => null);
  if (!r.ok) {
    const code = r.status === 401 && auth ? 'auth' : data?.error_code || data?.error || 'http';
    throw new CloudError(code, MESSAGES[code] || data?.msg || data?.message || data?.error_description || `Erreur ${r.status}`);
  }
  return data;
}
const norm = (d) => ({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600), user: { id: d.user?.id, email: d.user?.email } });
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
export const sendCode = (email) => call('/auth/v1/otp', { method: 'POST', body: { email, create_user: true }, auth: false });
export async function verifyCode(email, code) {
  const d = await call('/auth/v1/verify', { method: 'POST', body: { type: 'email', email, token: code }, auth: false });
  save(norm(d));
  track('active_day');
  await refreshSubscription().catch(() => null);
  return ses.user;
}
// Connexion classique : e-mail et mot de passe (le serveur vérifie, rien n'est stocké en clair)
export async function signUpPassword(email, password) {
  const d = await call('/auth/v1/signup', { method: 'POST', body: { email, password }, auth: false });
  if (d?.access_token) { save(norm(d)); track('active_day'); }
  else throw new CloudError('confirm', 'Compte créé : confirmez votre adresse avec le lien reçu par e-mail, puis connectez-vous.');
  return ses.user;
}
export async function signInPassword(email, password) {
  const d = await call('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password }, auth: false });
  save(norm(d));
  track('active_day');
  await refreshSubscription().catch(() => null);
  return ses.user;
}
export const recoverPassword = (email) => call('/auth/v1/recover', { method: 'POST', body: { email }, auth: false });
export async function signOut() {
  try { await call('/auth/v1/logout', { method: 'POST' }); } catch (e) { /* déconnexion locale quand même */ }
  save(null);
}

// ---------- Abonnement ----------
// La base est la seule source de vérité ; l'appareil garde une copie pour fonctionner hors ligne.
export function applySubscription(row) {
  const live = row && ['active', 'trialing', 'past_due'].includes(row.status);
  update((s) => {
    const b = s.sub;
    const end = row?.current_period_end ? Date.parse(row.current_period_end) : null;
    Object.assign(b, {
      source: 'stripe', demo: null, failNext: false, pending: null,
      plan: live ? row.plan : 'free',
      status: live ? (row.status === 'past_due' ? 'past_due' : row.status === 'trialing' ? 'trialing' : 'active') : row ? 'ended' : 'none',
      periodEnd: live ? end : null, periodStart: live && end ? end - 30 * DAY : null,
      cancelAt: live && !!row.cancel_at_period_end,
      graceEnd: row?.status === 'past_due' && end ? end + GRACE_DAYS * DAY : null,
    });
  });
}
export async function refreshSubscription() {
  if (!cloudUser()) return null;
  const rows = await call('/rest/v1/subscriptions?select=plan,status,current_period_end,cancel_at_period_end&limit=1');
  const row = rows?.[0] || null;
  applySubscription(row);
  return row;
}
export async function checkout(plan, { trial = false, interval = 'month' } = {}) {
  const d = await call('/functions/v1/create-checkout-session', { method: 'POST', body: { plan, trial, interval } });
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
