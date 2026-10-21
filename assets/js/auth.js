// Compte MindView : e-mail et mot de passe (ou Google / Apple quand c'est ouvert dans config.js).
// - Mode en ligne (config.js) : inscription et connexion par le serveur (Supabase), mot de passe jamais stocké ici ;
//   les données sont synchronisées avec le compte (sync.js) et quittent l'appareil à la déconnexion.
// - Mode local : pas de compte. Seul un mot de passe créé avec la 1.9 continue de protéger l'accès : on n'en garde
//   qu'une empreinte (PBKDF2-SHA-256, 210 000 tours, sel aléatoire) ; les données ne sont pas chiffrées pour autant.
import { S, update, normName } from './store.js';
import { cloudReady, cloudUser, cloudMock, signUpPassword, signInPassword, signOut, recoverPassword, updatePassword, authMode as mode } from './cloud.js';
import { startSync, syncNow, flushSync, wipeDevice } from './sync.js';
// Mode réellement actif : en ligne seulement si demandé ET si les comptes en ligne sont configurés
export const authMode = mode;

const ITER = 210000;
const KEY = 'msdev:session';
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function derive(pw, salt, it = ITER) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: it }, key, 256);
}
export async function hashPassword(pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: b64(salt), hash: b64(await derive(pw, salt)), it: ITER };
}
export async function checkPassword(pw, kdf) {
  if (!kdf?.salt || !kdf?.hash) return false;
  const h = b64(await derive(pw, unb64(kdf.salt), kdf.it || ITER));
  // Comparaison sans arrêt anticipé
  let diff = h.length ^ kdf.hash.length;
  for (let i = 0; i < Math.max(h.length, kdf.hash.length); i++) diff |= (h.charCodeAt(i) || 0) ^ (kdf.hash.charCodeAt(i) || 0);
  return diff === 0;
}
export const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(e || '').trim());
export const passwordIssue = (pw) => (String(pw || '').length < 8 ? 'Au moins 8 caractères.' : !/\d|[^a-z]/i.test(pw) ? 'Ajoutez un chiffre ou un signe.' : '');

// Session de cet appareil
const read = () => { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } };
const write = (v) => { try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch (e) { /* stockage indisponible */ } };
// Un compte en ligne ne compte que si les comptes en ligne sont ouverts (sinon personne ne pourrait s'y connecter)
export const hasAccount = () => !!(S().account?.email && (S().account.kdf || (S().account.cloud && cloudReady())));
export const loggedIn = () => (cloudReady() && S().account?.cloud ? !!cloudUser() : !!read() && read() === S().account?.email);
// L'écran de connexion s'impose quand un compte existe et que personne n'est connecté
// (sauf pendant la confirmation de l'adresse : on continue sur cet appareil en attendant le lien)
export const needsLogin = () => hasAccount() && !loggedIn() && !S().account?.pending;

// Compte en ligne ouvert sur cet appareil : on le note et la synchronisation démarre
function opened(user, prenom) {
  update((s) => {
    s.account = { email: user.email, at: s.account?.at || Date.now(), cloud: true, provider: user.provider || s.account?.provider };
    s.profile.email = s.profile.email || user.email;
    if (prenom) s.profile.prenom = s.profile.prenom || normName(prenom);
  });
  write(user.email);
}
// Renvoie { pending: true } quand le serveur attend la confirmation de l'adresse (lien envoyé par e-mail)
export async function createAccount({ email, password, prenom }) {
  email = String(email).trim().toLowerCase();
  if (cloudReady()) {
    try { await signUpPassword(email, password); }
    catch (e) {
      if (e.code !== 'confirm') throw e;
      update((s) => { s.account = { email, at: Date.now(), cloud: true, pending: true }; s.profile.email = email; if (prenom) s.profile.prenom = s.profile.prenom || normName(prenom); });
      return { pending: true };
    }
    opened(cloudUser(), prenom);
    await startSync();
    return { pending: false };
  }
  const kdf = await hashPassword(password);
  update((s) => { s.account = { email, at: Date.now(), cloud: false, kdf }; s.profile.email = email; if (prenom) s.profile.prenom = s.profile.prenom || normName(prenom); });
  write(email);
  return { pending: false };
}
export async function login(email, password) {
  email = String(email).trim().toLowerCase();
  if (cloudReady()) {
    const user = await signInPassword(email, password);
    opened(user);
    // Les données du compte arrivent avant d'ouvrir l'application
    await startSync();
    return true;
  }
  // Après 5 essais ratés, 30 secondes d'attente (le serveur a ses propres limites pour les comptes en ligne)
  if (loginWait()) throw new Error(`Trop d'essais. Réessayez dans ${loginWait()} secondes.`);
  const acc = S().account;
  const ok = !!acc?.kdf && acc.email === email && await checkPassword(password, acc.kdf);
  if (!ok) { if (++fails >= 5) { fails = 0; until = Date.now() + 30000; } return false; }
  fails = 0;
  write(email);
  return true;
}
// Retour d'un lien e-mail ou de Google : la session est ouverte par cloud.js, on branche le compte ici
export async function afterAuthReturn({ user }) {
  // Google donne le nom complet : le prénom sert pour l'accueil
  opened(user, String(user.name || '').split(' ')[0]);
  await startSync();
}
let fails = 0, until = 0;
export const loginWait = () => Math.max(0, Math.ceil((until - Date.now()) / 1000));
// Déconnexion. En ligne : dernier envoi, puis les données quittent l'appareil (elles sont dans le compte).
// Si des changements n'ont pas pu partir (hors ligne), refus avec le code « unsynced », sauf { force: true }.
export async function logout({ force = false } = {}) {
  if (cloudReady() && cloudUser()) {
    if (!await flushSync() && !force) { const e = new Error('unsynced'); e.code = 'unsynced'; throw e; }
    const email = S().account?.email;
    await signOut();
    wipeDevice(email);
  }
  write('');
}
export async function forgot(email) {
  if (cloudReady()) { await recoverPassword(String(email).trim().toLowerCase()); return 'mail'; }
  return 'local';
}
export async function changePassword(oldPw, newPw) {
  if (cloudReady() && cloudUser()) { await updatePassword(newPw); return true; }
  const acc = S().account;
  if (!acc?.kdf || !await checkPassword(oldPw, acc.kdf)) return false;
  const kdf = await hashPassword(newPw);
  update((s) => { s.account.kdf = kdf; });
  return true;
}
// Mode local (1.14) : retirer le mot de passe d'une ancienne version, après vérification. Les données restent.
export async function removePassword(pw) {
  const acc = S().account;
  if (!acc?.kdf || !await checkPassword(pw, acc.kdf)) return false;
  update((s) => { s.account = null; });
  write('');
  return true;
}
export { syncNow, cloudMock };
