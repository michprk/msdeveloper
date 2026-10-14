// État de l'application, enregistré sur l'appareil (localStorage).
import { setCustomSectors } from './data/scripts.js';

const KEY = 'msdev:v1';
export const DAY = 864e5;
export const TRIAL_DAYS = 7;

export const PLANS = {
  free: { id: 'free', name: 'Découverte', price: 0 },
  pro: { id: 'pro', name: 'Pro', price: 17.99 },
  premium: { id: 'premium', name: 'Premium', price: 31.99 },
};
const RANK = { free: 0, pro: 1, premium: 2 };
// Fonction → formule minimale. L'essai gratuit donne accès à tout (Premium).
export const FEATURES = {
  crm: 'pro', scriptsAll: 'pro', callMode: 'pro', agenda: 'pro', projects: 'pro', academy: 'pro',
  messages: 'pro', audit: 'pro', import: 'pro',
  quote: 'premium', myScripts: 'premium', training: 'premium', stats: 'premium', export: 'premium',
};

// Étapes de base (utilisées par le mode appel). L'utilisateur peut les renommer
// et ajouter ses propres étapes (CRM personnalisé) : voir computeStages().
const BASE_STAGES = [
  { id: 'a_appeler', label: 'À appeler', tone: 'grey' },
  { id: 'rappeler', label: 'À rappeler', tone: 'sky' },
  { id: 'interesse', label: 'Intéressé', tone: 'blue' },
  { id: 'rdv', label: 'RDV fixé', tone: 'navy' },
  { id: 'devis', label: 'Devis envoyé', tone: 'sand' },
  { id: 'signe', label: 'Signé', tone: 'olive' },
  { id: 'perdu', label: 'Perdu', tone: 'rose' },
];
export const TONES = ['grey', 'sky', 'blue', 'navy', 'sand', 'olive', 'rose'];
export let STAGES = BASE_STAGES;
export let STAGE = Object.fromEntries(STAGES.map((s) => [s.id, s]));
function computeStages(s) {
  const crm = s.crm || {};
  const list = BASE_STAGES.map((b) => ({ ...b, label: crm.labels?.[b.id] || b.label, base: true }));
  for (const x of crm.extra || []) {
    const i = list.findIndex((y) => y.id === x.after);
    list.splice(i >= 0 ? i + 1 : list.length - 2, 0, { id: x.id, label: x.label, tone: x.tone || 'sky', custom: true, after: x.after });
  }
  STAGES = list;
  STAGE = Object.fromEntries(list.map((st) => [st.id, st]));
}
export const stageOf = (id) => STAGE[id] || { id, label: 'Étape supprimée', tone: 'grey' };

export const OUTCOMES = [
  { id: 'nr', label: 'Pas de réponse', short: 'Absent', stage: null, tone: 'grey' },
  { id: 'rappeler', label: 'À rappeler', short: 'Rappeler', stage: 'rappeler', tone: 'sky' },
  { id: 'refus', label: 'Pas intéressé', short: 'Refus', stage: 'perdu', tone: 'rose' },
  { id: 'interesse', label: 'Intéressé', short: 'Intéressé', stage: 'interesse', tone: 'blue' },
  { id: 'rdv', label: 'RDV fixé', short: 'RDV', stage: 'rdv', tone: 'olive' },
];
export const OUTCOME = Object.fromEntries(OUTCOMES.map((o) => [o.id, o]));

export const SOURCES = ['Appel', 'Visite', 'Recommandation', 'Instagram', 'Site web', 'Salon', 'Autre'];

export const PROJECT_STEPS = ['Acompte reçu', 'Contenus reçus', 'Maquette validée', 'Développement', 'Relecture client', 'Mise en ligne'];

const defaults = () => ({
  v: 1, onboarded: false, createdAt: Date.now(),
  profile: {
    prenom: '', societe: '', ville: 'Bruxelles', tel: '', email: '', adresse: '', tva: '', iban: '',
    service: 'site', prix: { site: '500 €', auto: '290 €', seo: '490 €' }, secteurs: [], niveau: 'debut',
    promesse: 'Prix fixe, délais tenus, et un seul interlocuteur du début à la fin.',
  },
  goals: { appelsJour: 40, rdvSemaine: 5, caMois: 1000 },
  prefs: { theme: 'light', motion: 'full', notifs: true, replayIntro: false, textSize: 'm' },
  sub: { plan: 'free', trialStart: null, demo: null },
  // CRM personnalisé : noms d'étapes, étapes ajoutées, champs, équipe
  crm: { labels: {}, extra: [], fields: [], team: [] },
  academy: { read: {}, last: null },
  lock: null, baseline: null,
  prospects: [], activities: [], tasks: [], projects: [],
  favorites: [], recent: [], myScripts: [], mySectors: [], training: {},
  catalogue: [
    { id: 'c1', label: 'Site vitrine — Essentiel', price: 500 },
    { id: 'c2', label: 'Site vitrine — Signature', price: 1290 },
    { id: 'c3', label: 'Site sur mesure — Premium', price: 3900 },
    { id: 'c4', label: 'Audit SEO', price: 150 },
    { id: 'c5', label: 'Référencement local', price: 490 },
    { id: 'c6', label: 'Une automatisation', price: 290 },
    { id: 'c7', label: 'Pack de quatre automatisations', price: 790 },
    { id: 'c8', label: 'Identité visuelle', price: 490 },
    { id: 'c9', label: 'Rédaction (par page)', price: 90 },
    { id: 'c10', label: 'Entretien mensuel', price: 30, monthly: true },
    { id: 'c11', label: 'Suivi SEO mensuel', price: 120, monthly: true },
  ],
});

function merge(base, saved) {
  if (!saved || typeof saved !== 'object' || Array.isArray(base)) return saved ?? base;
  const out = { ...base };
  for (const k of Object.keys(saved)) {
    out[k] = base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) ? merge(base[k], saved[k]) : saved[k];
  }
  return out;
}

// Dates toujours en millisecondes (protège contre un fichier importé mal formé)
function sanitize(s) {
  const n = (v) => (typeof v === 'string' ? Date.parse(v) || null : v);
  s.tasks.forEach((t) => { t.due = n(t.due); t.doneAt = n(t.doneAt); });
  s.activities.forEach((a) => { a.at = n(a.at) || Date.now(); });
  s.prospects.forEach((p) => { p.createdAt = n(p.createdAt) || Date.now(); p.updatedAt = n(p.updatedAt) || p.createdAt; if (p.next) p.next.due = n(p.next.due); });
  return s;
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return sanitize(merge(defaults(), JSON.parse(raw)));
  } catch (e) { /* stockage indisponible : on repart d'un état vide */ }
  return defaults();
}

let state = load();
setCustomSectors(state.mySectors);
computeStages(state);
const listeners = new Set();
let timer;

export const S = () => state;
export const onChange = (fn) => listeners.add(fn);
export function persist() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('Enregistrement impossible', e); }
  }, 80);
}
export function update(fn, { silent = false } = {}) {
  fn(state);
  setCustomSectors(state.mySectors);
  computeStages(state);
  persist();
  if (!silent) listeners.forEach((l) => l());
}
export function replaceState(next) {
  state = sanitize(merge(defaults(), next));
  setCustomSectors(state.mySectors);
  computeStages(state);
  persist();
  listeners.forEach((l) => l());
}

// Import par fusion (fichier .json « msdeveloper-import » ou sauvegarde complète) :
// ajoute étapes, champs, équipe et fiches sans rien écraser. Renvoie un compte rendu.
export function mergeImport(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.prospects)) throw new Error('format');
  // Dates acceptées en millisecondes ou en clair (« 2026-10-14T17:00 »)
  const ts = (v) => (typeof v === 'string' ? Date.parse(v) || null : v ?? null);
  data = {
    ...data,
    prospects: data.prospects.map((p) => ({ ...p, createdAt: ts(p.createdAt), updatedAt: ts(p.updatedAt), signedAt: ts(p.signedAt) || undefined, lastContact: ts(p.lastContact) })),
    activities: (data.activities || []).map((a) => ({ ...a, at: ts(a.at) || Date.now() })),
    tasks: (data.tasks || []).map((t) => ({ ...t, due: ts(t.due), doneAt: ts(t.doneAt), createdAt: ts(t.createdAt) || Date.now() })),
  };
  const idMap = {};
  const report = { added: 0, skipped: 0, activities: 0, tasks: 0 };
  update((s) => {
    const crm = data.crm || {};
    for (const x of crm.extra || []) if (!s.crm.extra.some((y) => y.id === x.id)) s.crm.extra.push({ id: String(x.id), label: String(x.label), tone: x.tone, after: x.after });
    for (const f of crm.fields || []) if (!s.crm.fields.some((y) => y.id === f.id)) s.crm.fields.push({ id: String(f.id), label: String(f.label), type: f.type || 'text', options: f.options || [] });
    for (const m of crm.team || []) if (!s.crm.team.some((y) => y.id === m.id)) s.crm.team.push({ id: String(m.id), name: String(m.name) });
    Object.assign(s.crm.labels, crm.labels || {});
    const names = new Set(s.prospects.map((p) => (p.entreprise || '').trim().toLowerCase()));
    for (const p of data.prospects) {
      const key = (p.entreprise || '').trim().toLowerCase();
      if (!key || names.has(key)) { report.skipped++; continue; }
      const id = uid(); idMap[p.id] = id; names.add(key);
      s.prospects.push({ ...p, id, demo: false, createdAt: p.createdAt || Date.now(), updatedAt: p.updatedAt || Date.now() });
      report.added++;
    }
    for (const a of data.activities || []) if (idMap[a.prospectId]) { s.activities.push({ ...a, id: uid(), prospectId: idMap[a.prospectId] }); report.activities++; }
    for (const t of data.tasks || []) if (!t.prospectId || idMap[t.prospectId]) { s.tasks.push({ ...t, id: uid(), prospectId: t.prospectId ? idMap[t.prospectId] : null }); report.tasks++; }
    s.activities.sort((a, b) => b.at - a.at);
    if (data.goals) Object.assign(s.goals, data.goals);
    if (data.baseline) s.baseline = data.baseline;
  });
  // Prochaine action de chaque fiche importée
  update((s) => {
    for (const id of Object.values(idMap)) {
      const p = s.prospects.find((x) => x.id === id);
      const open = s.tasks.filter((t) => t.prospectId === id && !t.done && t.due).sort((a, b) => a.due - b.due)[0];
      if (p) p.next = open ? { taskId: open.id, label: open.title, due: open.due } : null;
    }
  });
  return report;
}
export const resetState = () => replaceState(defaults());

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---------- Abonnement ----------
export const trialEnd = () => (state.sub.trialStart ? state.sub.trialStart + TRIAL_DAYS * DAY : 0);
export const trialActive = () => !!state.sub.trialStart && Date.now() < trialEnd();
export const trialLeft = () => Math.max(0, Math.ceil((trialEnd() - Date.now()) / DAY));
export function access() {
  const s = state.sub;
  if (s.demo) return s.demo;
  if (s.plan !== 'free') return s.plan;
  return trialActive() ? 'premium' : 'free';
}
export const can = (f) => RANK[access()] >= RANK[FEATURES[f] || 'free'];
export const need = (f) => FEATURES[f] || 'free';

// ---------- Dates ----------
export const dayKey = (t = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const startOfDay = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const startOfWeek = (t = Date.now()) => { const d = new Date(startOfDay(t)); const wd = (d.getDay() + 6) % 7; return d.getTime() - wd * DAY; };
export const startOfMonth = (t = Date.now()) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };

// ---------- Prospects ----------
export const getProspect = (id) => state.prospects.find((p) => p.id === id);

export function addProspect(data) {
  const p = {
    id: uid(), entreprise: '', contact: '', tel: '', email: '', ville: '', adresse: '', site: '', instagram: '',
    secteur: 'toute', service: state.profile.service || 'site', stage: 'a_appeler', valeur: 0, source: 'Appel',
    notes: '', next: null, attempts: 0, createdAt: Date.now(), updatedAt: Date.now(), ...data,
  };
  update((s) => { s.prospects.unshift(p); });
  return p;
}

export function updateProspect(id, patch, { log = true } = {}) {
  update((s) => {
    const p = s.prospects.find((x) => x.id === id);
    if (!p) return;
    const before = p.stage;
    Object.assign(p, patch, { updatedAt: Date.now() });
    if (patch.stage && patch.stage !== before) {
      if (log) s.activities.unshift({ id: uid(), prospectId: id, type: 'etape', from: before, to: patch.stage, at: Date.now() });
      if (patch.stage === 'signe') {
        p.signedAt = Date.now();
        if (!s.projects.some((pr) => pr.prospectId === id)) {
          s.projects.unshift({ id: uid(), prospectId: id, name: p.entreprise, service: p.service, start: Date.now(), days: 21, done: [], createdAt: Date.now() });
        }
      }
    }
  });
}

export function deleteProspect(id) {
  update((s) => {
    s.prospects = s.prospects.filter((p) => p.id !== id);
    s.activities = s.activities.filter((a) => a.prospectId !== id);
    s.tasks = s.tasks.filter((t) => t.prospectId !== id);
    s.projects = s.projects.filter((p) => p.prospectId !== id);
  });
}

export function logActivity(a) {
  const act = { id: uid(), at: Date.now(), ...a };
  update((s) => {
    s.activities.unshift(act);
    if (a.prospectId) {
      const p = s.prospects.find((x) => x.id === a.prospectId);
      if (p) { p.updatedAt = Date.now(); p.lastContact = act.at; if (a.type === 'appel') p.attempts = (p.attempts || 0) + 1; }
    }
  });
  return act;
}

export function recordCall(prospectId, outcome, note = '') {
  logActivity({ prospectId, type: 'appel', outcome, note });
  const o = OUTCOME[outcome];
  const p = getProspect(prospectId);
  if (p && o.stage && p.stage !== o.stage && !(o.stage === 'perdu' && p.stage === 'signe')) updateProspect(prospectId, { stage: o.stage });
}

// ---------- Tâches ----------
export function addTask(t) {
  const task = { id: uid(), title: '', due: null, prospectId: null, kind: 'tache', done: false, createdAt: Date.now(), ...t };
  update((s) => {
    s.tasks.push(task);
    if (task.prospectId && task.due) {
      const p = s.prospects.find((x) => x.id === task.prospectId);
      if (p && (!p.next || p.next.due > task.due || p.next.done)) p.next = { taskId: task.id, label: task.title, due: task.due };
    }
  });
  return task;
}
export function toggleTask(id) {
  update((s) => {
    const t = s.tasks.find((x) => x.id === id);
    if (!t) return;
    t.done = !t.done; t.doneAt = t.done ? Date.now() : null;
    if (t.prospectId) refreshNext(s, t.prospectId);
  });
}
export function deleteTask(id) {
  update((s) => {
    const t = s.tasks.find((x) => x.id === id);
    s.tasks = s.tasks.filter((x) => x.id !== id);
    if (t?.prospectId) refreshNext(s, t.prospectId);
  });
}
function refreshNext(s, pid) {
  const p = s.prospects.find((x) => x.id === pid);
  if (!p) return;
  const open = s.tasks.filter((t) => t.prospectId === pid && !t.done && t.due).sort((a, b) => a.due - b.due)[0];
  p.next = open ? { taskId: open.id, label: open.title, due: open.due } : null;
}

// ---------- Statistiques ----------
export const calls = (from = 0, to = Infinity) => state.activities.filter((a) => a.type === 'appel' && a.at >= from && a.at < to);
export const signedValue = (from = 0, to = Infinity) => state.prospects
  .filter((p) => p.stage === 'signe' && (p.signedAt || p.updatedAt) >= from && (p.signedAt || p.updatedAt) < to)
  .reduce((n, p) => n + (Number(p.valeur) || 0), 0);
export function stageCount(id) { return state.prospects.filter((p) => p.stage === id).length; }

// ---------- Scripts favoris / récents ----------
export function toggleFav(id) {
  update((s) => { s.favorites = s.favorites.includes(id) ? s.favorites.filter((x) => x !== id) : [id, ...s.favorites]; });
}
export function pushRecent(id) {
  update((s) => { s.recent = [id, ...s.recent.filter((x) => x !== id)].slice(0, 8); }, { silent: true });
}
