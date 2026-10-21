// Synchronisation des données avec le compte en ligne (1.15) — l'adaptateur « storage ».
// - Hors ligne d'abord : tout est enregistré sur l'appareil, puis envoyé au serveur quelques secondes après.
// - Serveur : une ligne par compte dans la table `user_data` (Supabase). Les règles de la base (RLS) font
//   que chacun ne lit et n'écrit QUE sa ligne ; un numéro de version (`rev`), tenu par la base, empêche
//   d'écraser sans le savoir ce qu'un autre appareil vient d'envoyer.
// - Fusion à trois voies, élément par élément (tâches, pages, tableaux…) : ce qui a changé d'un seul côté
//   est repris, une suppression est respectée, et si le même élément a changé des deux côtés, la version
//   la plus récente gagne.
// - Restent sur l'appareil : le compte, le code de verrouillage, l'abonnement (le serveur en est la source),
//   l'état du connecteur Notion et les réglages d'affichage (thème, taille du texte…).
// Inactif en mode local : rien ne part de l'appareil.
import { S, replaceState, resetState, update, normalize } from './store.js';
import { cloudUser, authMode, rest, CloudError } from './cloud.js';

const LOCAL_KEYS = ['account', 'lock', 'sub', 'notion'];
const DEVICE_PREFS = ['theme', 'motion', 'textSize', 'lastBackup', 'backupLater', 'navOpen', 'replayIntro'];
const MAX = 4.5e6; // au-delà, l'envoi est refusé (la base accepte 5 Mo par compte)
const META = 'msdev:sync';

// ---------- Empreintes et fusion ----------
// Empreinte courte d'une valeur (cyrb53) : suffit pour savoir si un élément a changé depuis la dernière synchro
export function hash(v) {
  const str = v === undefined ? '\u0000' : typeof v === 'string' ? `s${v}` : JSON.stringify(v);
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const idOf = (x) => (isObj(x) && (typeof x.id === 'string' || typeof x.id === 'number') ? String(x.id) : null);
const isIdList = (v) => Array.isArray(v) && v.length > 0 && v.every((x) => idOf(x) !== null);
const DEPTH = 3;

// Trace de la dernière synchro : une empreinte par élément de liste, par clé d'objet (sur 3 niveaux), sinon une seule
export function snap(v, d = 0) {
  if (isIdList(v)) { const l = {}; for (const x of v) { const k = idOf(x); if (!(k in l)) l[k] = hash(x); } return { l }; }
  if (isObj(v) && d < DEPTH) { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = snap(x, d + 1); return { o }; }
  return hash(v);
}
const stamp = (x) => (isObj(x) ? Math.max(+x.updatedAt || 0, +x.upd || 0, +x.at || 0, +x.doneAt || 0, +x.createdAt || 0) : 0);
// Changé des deux côtés : la plus récente gagne ; modifié d'un côté et supprimé de l'autre : la modification est gardée
function pickBoth(l, r, st) {
  st.conflicts++;
  if (l === undefined) return r;
  if (r === undefined) return l;
  return stamp(r) > stamp(l) ? r : l;
}
function leaf(b, l, r, st) {
  const bh = typeof b === 'string' ? b : b ? '\u0001arbre' : undefined;
  const lh = l === undefined ? undefined : hash(l), rh = r === undefined ? undefined : hash(r);
  if (lh === rh) return l;
  if (lh === bh) return r; // seul l'autre appareil a changé (ou supprimé)
  if (rh === bh) return l; // seul cet appareil a changé (ou supprimé)
  return pickBoth(l, r, st);
}
function mergeList(bl, la, ra, st) {
  const lm = new Map(), rm = new Map();
  for (const x of la) { const k = idOf(x); if (k !== null && !lm.has(k)) lm.set(k, x); }
  for (const x of ra) { const k = idOf(x); if (k !== null && !rm.has(k)) rm.set(k, x); }
  const keep = new Map();
  for (const k of new Set([...lm.keys(), ...rm.keys()])) {
    const l = lm.get(k), r = rm.get(k), bh = bl ? bl[k] : undefined;
    const lh = l === undefined ? undefined : hash(l), rh = r === undefined ? undefined : hash(r);
    const v = lh === rh ? l : lh === bh ? r : rh === bh ? l : pickBoth(l, r, st);
    if (v !== undefined) keep.set(k, v);
  }
  // Ordre de cet appareil, puis les nouveaux éléments de l'autre, placés après leur voisin d'origine
  const out = [], placed = new Set();
  for (const x of la) { const k = idOf(x); if (keep.has(k) && !placed.has(k)) { out.push(keep.get(k)); placed.add(k); } }
  let prev = null;
  for (const x of ra) {
    const k = idOf(x);
    if (keep.has(k) && !placed.has(k)) {
      const i = prev === null ? -1 : out.findIndex((o) => idOf(o) === prev);
      out.splice(i + 1, 0, keep.get(k)); placed.add(k);
    }
    if (keep.has(k)) prev = k;
  }
  return out;
}
// base : trace de la dernière synchro (ou null la première fois : on réunit les deux côtés)
export function merge3(b, l, r, st = { conflicts: 0 }, d = 0) {
  if (l === undefined && r === undefined) return undefined;
  const listish = isIdList(l) || isIdList(r) || !!b?.l;
  if (listish && (Array.isArray(l) || l === undefined) && (Array.isArray(r) || r === undefined)) {
    if (l === undefined || r === undefined) return leaf(b && hashTree(b), l, r, st); // liste ajoutée ou retirée en entier
    return mergeList(b?.l || null, l, r, st);
  }
  if (isObj(l) && isObj(r) && d < DEPTH) {
    const out = {};
    for (const k of new Set([...Object.keys(l), ...Object.keys(r)])) {
      const v = merge3(b?.o ? b.o[k] : undefined, l[k], r[k], st, d + 1);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  return leaf(b, l, r, st);
}
const hashTree = (b) => (typeof b === 'string' ? b : '\u0001arbre');

// ---------- Ce qui part et ce qui reste ----------
function pack(s) {
  const o = {};
  for (const [k, v] of Object.entries(s)) if (!LOCAL_KEYS.includes(k)) o[k] = v;
  o.prefs = Object.fromEntries(Object.entries(s.prefs || {}).filter(([k]) => !DEVICE_PREFS.includes(k)));
  return JSON.parse(JSON.stringify(o));
}
function unpack(data, s) {
  const out = { ...data };
  for (const k of LOCAL_KEYS) out[k] = s[k];
  out.prefs = { ...(data.prefs || {}) };
  for (const k of DEVICE_PREFS) if (k in (s.prefs || {})) out.prefs[k] = s.prefs[k];
  return out;
}

// ---------- État de la synchro (sur l'appareil) ----------
const readMeta = () => { try { return JSON.parse(localStorage.getItem(META) || 'null') || {}; } catch (e) { return {}; } };
const writeMeta = (m) => { try { if (m) localStorage.setItem(META, JSON.stringify(m)); else localStorage.removeItem(META); } catch (e) { /* stockage plein ou indisponible */ } };
let busyP = null, again = false, timer = null, poll = null, wired = false, lastErr = null;
const emit = () => window.dispatchEvent(new Event('ms:sync'));
export const syncActive = () => authMode() === 'online' && !!cloudUser();
export function syncStatus() {
  const m = readMeta();
  return { active: syncActive(), busy: !!busyP, at: m.at || null, error: lastErr, conflicts: m.conflicts || 0, pending: syncActive() && !!m.hash && hash(pack(S())) !== m.hash };
}
// Saisie en cours : on n'applique pas de changements venus d'ailleurs sous les doigts de la personne
const editingNow = () => {
  const a = document.activeElement;
  return !!(a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) || !!document.querySelector('.dw-edit');
};

async function patch(uid, rev, data) {
  const rows = await rest(`/rest/v1/user_data?user_id=eq.${uid}&rev=eq.${rev}`, { method: 'PATCH', body: { data }, prefer: 'return=representation' });
  return rows?.[0] || null; // vide : un autre appareil est passé entre-temps
}
async function insert(uid, data) {
  try { return (await rest('/rest/v1/user_data', { method: 'POST', body: { user_id: uid, data }, prefer: 'return=representation' }))?.[0] || null; }
  catch (e) { if (e.status === 409 || e.code === '23505') return null; throw e; }
}
function done(uid, rev, data, kind, st = { conflicts: 0 }) {
  writeMeta({ owner: uid, rev, base: snap(data), hash: hash(data), at: Date.now(), kind, conflicts: st.conflicts });
  lastErr = null;
  return { kind, conflicts: st.conflicts };
}
function check(data) {
  if (JSON.stringify(data).length > MAX) throw new CloudError('too_big', 'Tes données dépassent 4,5 Mo : elles restent sur cet appareil, mais ne peuvent pas être synchronisées. Allège les tableaux blancs les plus lourds.');
}

async function run() {
  const u = cloudUser();
  let meta = readMeta();
  // Données d'un autre compte sur cet appareil (filet de sécurité : la déconnexion les efface normalement)
  if (meta.owner && meta.owner !== u.id) { const keep = S().account; resetState(); update((s) => { s.account = keep; }, { silent: true }); writeMeta(null); meta = {}; }
  for (let tries = 0; tries < 4; tries++) {
    const row = (await rest(`/rest/v1/user_data?select=data,rev&user_id=eq.${u.id}`))?.[0] || null;
    const local = pack(S());
    if (row && meta.base && row.rev === meta.rev) {
      // Rien de neuf sur le serveur : on envoie ce qui a changé ici
      if (hash(local) === meta.hash) { meta.at = Date.now(); writeMeta(meta); lastErr = null; return { kind: 'same', conflicts: 0 }; }
      check(local);
      const res = await patch(u.id, row.rev, local);
      if (!res) continue;
      return done(u.id, res.rev, local, 'up');
    }
    if (!row) {
      check(local);
      const res = await insert(u.id, local);
      if (!res) continue;
      return done(u.id, res.rev, local, 'first');
    }
    // Du neuf sur le serveur (ou première synchro de cet appareil) : fusion
    const remote = pack(normalize(row.data));
    const st = { conflicts: 0 };
    // Appareil neuf (pas encore passé par l'accueil) : on reprend tel quel ce qui est dans le compte
    const merged = !meta.base && !S().onboarded ? remote : merge3(meta.base || null, local, remote, st);
    if (hash(merged) !== hash(local)) {
      if (editingNow()) { schedule(4000); return { kind: 'deferred', conflicts: 0 }; }
      replaceState(unpack(merged, S()));
    }
    // Les « modifiés des deux côtés » ne comptent qu'après une première synchro (avant, on réunit simplement)
    const seen = meta.base ? st : { conflicts: 0 };
    const now = pack(S());
    if (hash(now) === hash(remote)) return done(u.id, row.rev, now, 'down', seen);
    check(now);
    const res = await patch(u.id, row.rev, now);
    if (!res) { meta = { ...meta, base: snap(remote), rev: row.rev }; continue; }
    return done(u.id, res.rev, now, 'merge', seen);
  }
  throw new CloudError('busy', 'La synchronisation n\'a pas abouti (un autre appareil envoie en même temps). Elle reprendra toute seule.');
}

// Lance une synchro (une seule à la fois ; une demande pendant qu'elle tourne en relance une juste après)
export function syncNow() {
  if (!syncActive()) return Promise.resolve(null);
  if (busyP) { again = true; return busyP; }
  busyP = run()
    .catch((e) => { lastErr = e.message || 'Synchronisation impossible.'; if (['offline', 'network'].includes(e.code)) lastErr = null; throw e; })
    .finally(() => { busyP = null; emit(); if (again) { again = false; schedule(300); } });
  emit();
  return busyP;
}
function schedule(ms = 2500) {
  clearTimeout(timer);
  timer = setTimeout(() => syncNow().catch(() => null), ms);
}
// Vérification légère (seulement le numéro de version) pendant que l'application est ouverte
async function peek() {
  if (!syncActive() || busyP || document.visibilityState !== 'visible' || !navigator.onLine) return;
  const m = readMeta();
  try {
    const row = (await rest(`/rest/v1/user_data?select=rev&user_id=eq.${cloudUser().id}`))?.[0];
    if (!row || row.rev !== m.rev || hash(pack(S())) !== m.hash) syncNow().catch(() => null);
  } catch (e) { /* hors ligne : on réessaiera */ }
}

// Branché une fois au démarrage (et après une connexion)
export function startSync() {
  if (!wired) {
    wired = true;
    window.addEventListener('ms:saved', () => { if (!syncActive()) return; const m = readMeta(); if (!m.hash || hash(pack(S())) !== m.hash) schedule(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') peek(); else if (syncStatus().pending) syncNow().catch(() => null); });
    window.addEventListener('online', () => syncNow().catch(() => null));
    poll = setInterval(peek, 60e3);
  }
  return syncNow().catch(() => null);
}

// Avant la déconnexion : dernier envoi. Renvoie false si des changements n'ont pas pu partir.
export async function flushSync() {
  if (!syncActive()) return true;
  try { await syncNow(); if (busyP) await busyP; } catch (e) { /* vérifié juste après */ }
  return !syncStatus().pending;
}
// Après la déconnexion : les données quittent cet appareil (elles sont dans le compte) ;
// on garde l'e-mail pour l'écran de connexion et les réglages d'affichage.
export function wipeDevice(email) {
  const prefs = Object.fromEntries(DEVICE_PREFS.filter((k) => k in (S().prefs || {})).map((k) => [k, S().prefs[k]]));
  clearTimeout(timer);
  writeMeta(null);
  resetState();
  update((s) => { Object.assign(s.prefs, prefs); s.account = email ? { email, at: Date.now(), cloud: true } : null; s.profile.email = email || ''; });
}
export const stopPolling = () => { clearInterval(poll); wired = false; };
// Compte supprimé : l'appareil oublie aussi l'état de la synchro
export const forgetSync = () => { clearTimeout(timer); writeMeta(null); };
