// État de l'application, enregistré sur l'appareil (localStorage).

// Prix, limites et fonctions de chaque formule : un seul fichier, plans.js (repris ici pour les écrans existants)
import { PLANS, RANK, FEATURES, LIMITS, TRIAL_DAYS, GRACE_DAYS, hasFeature, need as needPlan, priceOf } from './plans.js';
export { PLANS, RANK, FEATURES, LIMITS, TRIAL_DAYS, GRACE_DAYS };

const KEY = 'msdev:v1';
export const DAY = 864e5;

// Modules (1.10) : « M'organiser » est toujours là ; « Études » est actif par défaut ;
// « Entrepreneur » (CRM, devis, scripts d'appel, Académie, quiz de commerce) est désactivé par défaut
// et ne s'allume que si le profil le demande ou dans Compte → Modules.
export const MODULES = {
  organiser: { label: 'M\'organiser', desc: 'Tâches, calendrier, notes, tableau blanc et projets', icon: 'checkSquare', tone: 'blue', core: true },
  etudes: { label: 'Études', desc: 'Emploi du temps, examens, moyennes, révisions, concentration, quiz', icon: 'book', tone: 'sky' },
  entrepreneur: { label: 'Entrepreneur', desc: 'CRM, devis, scripts d\'appel, statistiques, Académie', icon: 'briefcase', tone: 'olive' },
};
export const MODULE_IDS = Object.keys(MODULES);
export const DEFAULT_USAGES = ['organiser', 'etudes'];
// Études seulement : aucune trace d'entrepreneuriat (clients, scripts, appels, académie commerciale)
export const schoolOnly = () => !on('entrepreneur');

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
  v: 5, onboarded: false, createdAt: Date.now(),
  profile: {
    prenom: '', societe: '', ville: 'Bruxelles', tel: '', email: '', adresse: '', tva: '', iban: '',
    usages: [...DEFAULT_USAGES], situation: '', metier: '',
    service: 'site', prix: { site: '500 €', auto: '290 €', seo: '490 €', offre: '' }, secteurs: [], niveau: 'debut',
    offre: { quoi: '', resultat: '', exemple: '' },
    promesse: 'Prix fixe, délais tenus, et un seul interlocuteur du début à la fin.',
  },
  goals: { appelsJour: 40, rdvSemaine: 5, caMois: 1000 },
  prefs: { theme: 'light', motion: 'full', notifs: true, replayIntro: false, textSize: 'm', notifCats: { retard: true, echeances: true, devis: true, relances: true, rappels: true } },
  // Abonnement : formule, essai, période en cours, résiliation, échec de paiement, historique
  sub: { plan: 'free', interval: 'month', pendingInterval: null, trialStart: null, demo: null, status: 'none', periodStart: null, periodEnd: null, cancelAt: false, pending: null, graceEnd: null, failNext: false, history: [] },
  // CRM personnalisé : noms d'étapes, étapes ajoutées, champs, équipe, nom des fiches
  crm: { labels: {}, extra: [], fields: [], team: [], noun: 'Clients', preset: '' },
  academy: { read: {}, last: null },
  lock: null, baseline: null,
  lists: [{ id: 'perso', name: 'Personnel', tone: 'sky' }, { id: 'travail', name: 'Travail', tone: 'olive' }],
  pages: [], quiz: { results: {}, mine: [], days: [] }, quotes: [], notifSeen: {},
  // Études : matières, emploi du temps, examens, notes (bulletin), révision espacée, concentration
  subjects: [], courses: [], exams: [], grades: [], srs: {}, focus: { sessions: [], work: 25, pause: 5, mode: 'pomo', timerMin: 10 }, studyGoal: 14,
  // Tableaux blancs (dessin, formes, textes, graphiques)
  boards: [], hwrWords: [],
  // Connecteur Notion (1.12) : état de connexion et correspondances tâche ↔ ligne de base. Jamais de jeton ici.
  notion: { connected: false, workspaceName: '', workspaceIcon: '', mock: false, links: {}, sync: null, conflicts: [], lastResult: null, lastError: null },
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

// Prénom propre partout : espaces retirés, majuscule au début de chaque partie (« adam » → « Adam »,
// « jean-pierre » → « Jean-Pierre »). Tout en minuscules ou tout en majuscules : remis en forme ; mixte (McKenzie) : gardé.
export const normName = (v) => String(v || '').trim().replace(/\s+/g, ' ').slice(0, 40).split(/([ \-'’])/).map((part) => {
  if (!part || /^[ \-'’]$/.test(part)) return part;
  const low = part.toLowerCase(), up = part.toUpperCase();
  const base = part === low || part === up ? low : part;
  return base.charAt(0).toUpperCase() + base.slice(1);
}).join('');

// Dates toujours en millisecondes (protège contre un fichier importé mal formé)
function sanitize(s) {
  const n = (v) => (typeof v === 'string' ? Date.parse(v) || null : v);
  s.tasks.forEach((t) => { t.due = n(t.due); t.doneAt = n(t.doneAt); });
  s.activities.forEach((a) => { a.at = n(a.at) || Date.now(); });
  s.prospects.forEach((p) => { p.createdAt = n(p.createdAt) || Date.now(); p.updatedAt = n(p.updatedAt) || p.createdAt; if (p.next) p.next.due = n(p.next.due); });
  s.pages.forEach((p) => { p.blocks = Array.isArray(p.blocks) ? p.blocks : []; p.updatedAt = n(p.updatedAt) || Date.now(); p.createdAt = n(p.createdAt) || p.updatedAt; });
  s.profile.prenom = normName(s.profile.prenom);
  if (!Array.isArray(s.profile.usages) || !s.profile.usages.length) s.profile.usages = [...DEFAULT_USAGES];
  s.profile.usages = ['organiser', ...MODULE_IDS.filter((m) => m !== 'organiser' && s.profile.usages.includes(m))];
  if (!Array.isArray(s.sub.history)) s.sub.history = [];
  if (!Array.isArray(s.quotes)) s.quotes = [];
  for (const k of ['subjects', 'courses', 'exams', 'grades', 'boards', 'hwrWords']) if (!Array.isArray(s[k])) s[k] = [];
  if (!s.srs || typeof s.srs !== 'object' || Array.isArray(s.srs)) s.srs = {};
  if (!Array.isArray(s.focus?.sessions)) s.focus = { work: 25, pause: 5, ...(s.focus || {}), sessions: [] };
  s.exams.forEach((x) => { x.date = n(x.date); });
  // Liens externes : seulement http(s), jamais javascript: ou data: (même depuis une sauvegarde importée)
  const safeLinks = (x) => { x.links = Array.isArray(x.links) ? x.links.filter((l) => l && typeof l.url === 'string' && /^https?:\/\//i.test(l.url)) : []; };
  s.projects.forEach(safeLinks); s.prospects.forEach(safeLinks);
  return s;
}
// Version 1 → 2 : l'application devient aussi une application d'organisation.
// Les comptes existants gardent tout et retrouvent leurs « Prospects ».
function migrate(saved) {
  if (saved && typeof saved === 'object' && (saved.v || 1) < 2) {
    saved.crm = { ...(saved.crm || {}) };
    if (!saved.crm.noun) saved.crm.noun = 'Prospects';
    saved.v = 2;
  }
  // Version 2 → 3 : les projets deviennent génériques et se nourrissent des tâches.
  // Les anciennes étapes cochées deviennent des tâches du projet ; les fiches signées deviennent des clients.
  if (saved && typeof saved === 'object' && saved.v < 3) {
    const tasks = saved.tasks || (saved.tasks = []);
    (saved.projects || []).forEach((pr) => {
      if (!Array.isArray(pr.done)) return;
      const due = pr.start && pr.days ? pr.start + pr.days * DAY : null;
      PROJECT_STEPS.forEach((step, k) => tasks.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + k, title: step, projectId: pr.id, prospectId: pr.prospectId || null, done: pr.done.includes(k), doneAt: pr.done.includes(k) ? Date.now() : null, status: pr.done.includes(k) ? 'done' : 'todo', due: null, kind: 'tache', list: null, prio: 0, notes: '', sub: [], createdAt: pr.createdAt || Date.now() }));
      Object.assign(pr, { status: 'actif', due, tone: 'olive', icon: 'folder', links: [], desc: '' });
      delete pr.done; delete pr.days; delete pr.start;
    });
    (saved.prospects || []).forEach((p) => { if (!p.type) p.type = p.stage === 'signe' ? 'client' : 'prospect'; });
    saved.v = 3;
  }
  // Version 3 → 4 (1.10) : trois modules. Clients et Prospecter deviennent « Entrepreneur » ;
  // quiz seuls → Études (pour garder les quiz visibles). Rien n'est retiré à quelqu'un qui l'utilisait.
  if (saved && typeof saved === 'object' && saved.v < 4) {
    const p = saved.profile || (saved.profile = {});
    const u = Array.isArray(p.usages) ? p.usages : [];
    const next = ['organiser'];
    const pro = u.includes('clients') || u.includes('prospecter');
    if (!u.length || u.includes('etudes') || p.situation === 'etudes' || (u.includes('apprendre') && !pro)) next.push('etudes');
    if (pro) next.push('entrepreneur');
    p.usages = next;
    saved.v = 4;
  }
  // Version 4 → 5 (1.12) : chaque tâche a une date de modification (synchronisation avec Notion)
  if (saved && typeof saved === 'object' && saved.v < 5) {
    (saved.tasks || []).forEach((t) => { if (!t.updatedAt) t.updatedAt = t.doneAt || t.createdAt || Date.now(); });
    saved.v = 5;
  }
  return saved;
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return sanitize(merge(defaults(), migrate(JSON.parse(raw))));
  } catch (e) { /* stockage indisponible : on repart d'un état vide */ }
  return defaults();
}

let state = load();
// Secteurs personnalisés : transmis au moteur de scripts quand il est chargé (1.17 : il ne l'est plus au démarrage)
let sectorsHook = null;
export const onSectors = (fn) => { sectorsHook = fn; fn(state.mySectors); };
const setCustomSectors = (list) => sectorsHook?.(list);
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
    // Pour la synchronisation avec le compte en ligne (sync.js)
    window.dispatchEvent(new Event('ms:saved'));
  }, 80);
}
// Un état venu d'ailleurs (compte en ligne, autre appareil) remis au format actuel, sans toucher à l'état en cours
export const normalize = (raw) => sanitize(merge(defaults(), migrate(JSON.parse(JSON.stringify(raw || {})))));
export function update(fn, { silent = false } = {}) {
  fn(state);
  setCustomSectors(state.mySectors);
  computeStages(state);
  persist();
  if (!silent) listeners.forEach((l) => l());
}
export function replaceState(next) {
  state = sanitize(merge(defaults(), migrate(next)));
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
// ---------- Modules ----------
// Anciens noms (avant 1.10) encore utilisés dans les écrans : clients et prospecter = Entrepreneur ;
// apprendre (quiz) = Études ou Entrepreneur.
const LEGACY = { clients: 'entrepreneur', prospecter: 'entrepreneur' };
export const on = (m) => {
  const u = state.profile.usages || DEFAULT_USAGES;
  if (m === 'organiser') return true;
  if (m === 'apprendre') return u.includes('etudes') || u.includes('entrepreneur');
  return u.includes(LEGACY[m] || m);
};

// ---------- Abonnement ----------
// États : gratuit → essai (7 jours) → gratuit, ou abonné (actif) → résiliation programmée
// → fin de période ; paiement refusé → délai de grâce de 7 jours → gratuit.
// Les paiements passent par assets/js/payments.js (mode test tant que Stripe n'est pas branché).

export const trialEnd = () => (state.sub.trialStart ? state.sub.trialStart + TRIAL_DAYS * DAY : 0);
export const trialActive = () => !!state.sub.trialStart && Date.now() < trialEnd();
export const trialLeft = () => Math.max(0, Math.ceil((trialEnd() - Date.now()) / DAY));
export function access() {
  const s = state.sub;
  if (s.demo) return s.demo;
  if (s.plan !== 'free') return s.plan;
  return trialActive() ? 'premium' : 'free';
}
// L'accès se décide à un seul endroit : hasFeature (plans.js). can() reste comme alias.
export const can = (f) => hasFeature(f);
export const need = (f) => needPlan(f);
export const addMonth = (t) => { const d = new Date(t); const day = d.getDate(); d.setMonth(d.getMonth() + 1); if (d.getDate() < day) d.setDate(0); return d.getTime(); };
// Un an plus tard, même jour (29 février → 28 février)
export const addYear = (t) => { const d = new Date(t); const m = d.getMonth(); d.setFullYear(d.getFullYear() + 1); if (d.getMonth() !== m) d.setDate(0); return d.getTime(); };
const nextPeriod = (t, interval) => (interval === 'year' ? addYear(t) : addMonth(t));
const per = (interval) => (interval === 'year' ? 'année' : 'mois');
export const round2 = (n) => Math.round(n * 100) / 100;
// Statut lisible par l'interface
export function billing() {
  const s = state.sub;
  if (s.plan !== 'free') {
    if (s.status === 'past_due') return 'past_due';
    if (s.status === 'trialing') return s.cancelAt ? 'trial_canceling' : 'trialing';
    if (s.cancelAt) return 'canceling';
    return 'active';
  }
  if (trialActive()) return 'trial';
  if (s.status === 'ended') return 'ended';
  if (s.trialStart) return 'trial_ended';
  return 'free';
}
const ref = () => 'MSD-' + Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).slice(2, 4).toUpperCase();
const log = (s, type, extra = {}) => { const r = { id: ref(), at: Date.now(), type, ...extra }; s.sub.history.unshift(r); s.sub.history = s.sub.history.slice(0, 60); return r; };
// Montant dû pour passer tout de suite à une formule supérieure (au prorata des jours restants)
export function prorata(plan) {
  const s = state.sub, now = Date.now();
  const iv = s.interval || 'month';
  if (s.plan === 'free' || !s.periodEnd) return priceOf(plan, iv);
  const left = Math.max(0, Math.min(1, (s.periodEnd - now) / (s.periodEnd - s.periodStart)));
  return round2(Math.max(0, (priceOf(plan, iv) - priceOf(s.plan, iv)) * left));
}
// Essai gratuit avec moyen de paiement : la formule choisie est ouverte tout de suite, rien n'est prélevé
// pendant 7 jours ; le premier prélèvement a lieu à la fin de l'essai, sauf annulation avant.
// card : false quand le paiement en ligne n'est pas encore ouvert (essai sans carte, qui s'arrête seul)
export function startTrial(plan, interval = 'month', { card = true } = {}) {
  let r;
  update((s) => {
    const now = Date.now();
    s.sub.interval = interval;
    s.sub.plan = plan; s.sub.status = 'trialing'; s.sub.trialStart = now; s.sub.periodStart = now; s.sub.periodEnd = now + TRIAL_DAYS * DAY;
    s.sub.cancelAt = false; s.sub.pending = null; s.sub.graceEnd = null; s.sub.demo = null; s.sub.card = card ? 1 : 0;
    r = log(s, 'essai', { plan, amount: 0, label: `Essai gratuit ${PLANS[plan].name} — ${TRIAL_DAYS} jours, moyen de paiement enregistré` });
  });
  return r;
}
export const trialing = () => state.sub.plan !== 'free' && state.sub.status === 'trialing';
export function subscribe(plan, interval = 'month') {
  let r;
  update((s) => {
    const now = Date.now();
    s.sub.interval = interval;
    s.sub.plan = plan; s.sub.status = 'active'; s.sub.periodStart = now; s.sub.periodEnd = nextPeriod(now, interval);
    s.sub.cancelAt = false; s.sub.pending = null; s.sub.graceEnd = null; s.sub.demo = null;
    r = log(s, 'paiement', { plan, amount: priceOf(plan, interval), label: `Abonnement ${PLANS[plan].name} — ${interval === 'year' ? 'première année' : 'premier mois'}` });
  });
  return r;
}
// Formule supérieure : immédiate, au prorata. Formule inférieure : à la fin de la période payée.
export function changePlan(plan) {
  let r = null;
  update((s) => {
    if (s.sub.status === 'trialing') {
      // Pendant l'essai : changement immédiat, toujours sans prélèvement
      s.sub.plan = plan; s.sub.pending = null;
      r = log(s, 'changement', { plan, amount: 0, label: `Essai : passage à ${PLANS[plan].name}` });
    } else if (RANK[plan] > RANK[s.sub.plan]) {
      const amount = prorata(plan);
      s.sub.plan = plan; s.sub.pending = null; s.sub.cancelAt = false;
      r = log(s, 'paiement', { plan, amount, label: `Passage à ${PLANS[plan].name} (au prorata)` });
    } else {
      s.sub.pending = plan === s.sub.plan ? null : plan; s.sub.cancelAt = false;
      r = log(s, 'changement', { plan, amount: 0, label: `Passage à ${PLANS[plan].name} prévu à la fin de la période` });
    }
  });
  return r;
}
// Mensuel ↔ annuel : tout de suite pendant l'essai, sinon à la fin de la période payée
export function changeInterval(interval) {
  update((s) => {
    if (s.sub.status === 'trialing') { s.sub.interval = interval; s.sub.pendingInterval = null; }
    else s.sub.pendingInterval = interval === (s.sub.interval || 'month') ? null : interval;
    log(s, 'changement', { plan: s.sub.plan, amount: 0, label: interval === 'year' ? 'Passage au paiement annuel' : 'Passage au paiement mensuel' });
  });
}
export function cancelSub() { update((s) => { const t = s.sub.status === 'trialing'; s.sub.cancelAt = true; s.sub.pending = null; log(s, 'resiliation', { plan: s.sub.plan, amount: 0, label: t ? 'Essai annulé : aucun prélèvement à la fin de l\'essai' : 'Résiliation à la fin de la période' }); }); }
export function resumeSub() { update((s) => { s.sub.cancelAt = false; log(s, 'reprise', { plan: s.sub.plan, amount: 0, label: 'Abonnement repris' }); }); }
// Nouvel essai de paiement après un refus
export function settleDue(ok) {
  let r;
  update((s) => {
    if (ok) {
      const now = Date.now();
      s.sub.status = 'active'; s.sub.graceEnd = null; s.sub.periodStart = now; s.sub.periodEnd = nextPeriod(now, s.sub.interval);
      r = log(s, 'paiement', { plan: s.sub.plan, amount: priceOf(s.sub.plan, s.sub.interval), label: `Abonnement ${PLANS[s.sub.plan].name} — paiement régularisé` });
    } else r = log(s, 'echec', { plan: s.sub.plan, amount: priceOf(s.sub.plan, s.sub.interval), label: 'Paiement refusé' });
  });
  return r;
}
// Passage du temps : renouvellements, fin de résiliation, fin du délai de grâce.
// Appelé à l'ouverture et au retour dans l'application.
export function syncBilling(now = Date.now()) {
  const s = state.sub;
  // Abonnement réel : Stripe renouvelle, la base fait foi (voir cloud.js) ; rien à simuler ici
  if (s.source === 'stripe' || s.plan === 'free' || !s.periodEnd) return false;
  const due = (s.status === 'past_due' && s.graceEnd && now >= s.graceEnd) || (s.status !== 'past_due' && now >= s.periodEnd);
  if (!due) return false;
  update((st) => {
    const b = st.sub;
    let guard = 0;
    while (b.plan !== 'free' && b.status !== 'past_due' && now >= b.periodEnd && guard++ < 36) {
      const wasTrial = b.status === 'trialing';
      if (b.cancelAt) { log(st, 'fin', { plan: b.plan, amount: 0, label: wasTrial ? 'Fin de l\'essai : annulé à temps, rien n\'a été prélevé' : `Fin de l'abonnement ${PLANS[b.plan].name}` }); b.plan = 'free'; b.status = 'ended'; b.cancelAt = false; break; }
      // Essai sans carte (paiement en ligne pas encore ouvert) : retour à la version gratuite, rien n'est prélevé
      if (wasTrial && b.card === 0) { log(st, 'fin', { plan: b.plan, amount: 0, label: 'Fin de l\'essai : retour à la version gratuite, rien n\'a été prélevé' }); b.plan = 'free'; b.status = 'ended'; break; }
      if (b.pending) { b.plan = b.pending; b.pending = null; }
      if (b.failNext) {
        b.failNext = false; b.status = 'past_due'; b.graceEnd = b.periodEnd + GRACE_DAYS * DAY;
        log(st, 'echec', { plan: b.plan, amount: priceOf(b.plan, b.interval), label: 'Renouvellement refusé par la banque' });
        break;
      }
      if (b.pendingInterval) { b.interval = b.pendingInterval; b.pendingInterval = null; }
      b.periodStart = b.periodEnd; b.periodEnd = nextPeriod(b.periodEnd, b.interval);
      log(st, 'paiement', { plan: b.plan, amount: priceOf(b.plan, b.interval), label: wasTrial ? `Abonnement ${PLANS[b.plan].name} — ${b.interval === 'year' ? 'première année' : 'premier mois'} (fin de l'essai)` : `Abonnement ${PLANS[b.plan].name} — renouvellement (${per(b.interval)})` });
      if (wasTrial) b.status = 'active';
    }
    if (b.status === 'past_due' && b.graceEnd && now >= b.graceEnd) {
      log(st, 'fin', { plan: b.plan, amount: 0, label: 'Fin de l\'abonnement : paiement non régularisé' });
      b.plan = 'free'; b.status = 'ended'; b.graceEnd = null;
    }
  });
  return true;
}
// Outil de test : fait comme si du temps avait passé (décale les dates de l'abonnement).
// « next » : juste après la prochaine échéance (prélèvement, fin d'essai ou fin du délai de grâce).
export function nextBillingEvent() {
  const b = state.sub;
  if (b.plan !== 'free') return b.status === 'past_due' ? b.graceEnd : b.periodEnd;
  return trialActive() ? trialEnd() : null;
}
export function simulateDays(days) {
  const d = days === 'next' ? Math.max(0, (nextBillingEvent() || Date.now()) - Date.now() + 60e3) : days * DAY;
  update((s) => {
    const b = s.sub;
    for (const k of ['trialStart', 'periodStart', 'periodEnd', 'graceEnd']) if (b[k]) b[k] -= d;
  }, { silent: true });
  syncBilling();
  listeners.forEach((l) => l());
}

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
    secteur: 'toute', service: state.profile.service || 'site', stage: 'a_appeler', type: 'prospect', valeur: 0, source: 'Appel',
    notes: '', next: null, attempts: 0, createdAt: Date.now(), updatedAt: Date.now(), ...data,
  };
  if (p.stage === 'signe') { p.type = 'client'; p.signedAt = p.signedAt || Date.now(); }
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
        p.type = 'client';
        if (!s.projects.some((pr) => pr.prospectId === id)) s.projects.unshift(newProject({ name: p.entreprise, prospectId: id }));
      }
    }
  });
}

export function deleteProspect(id) {
  update((s) => {
    s.prospects = s.prospects.filter((p) => p.id !== id);
    s.activities = s.activities.filter((a) => a.prospectId !== id);
    s.tasks = s.tasks.filter((t) => t.prospectId !== id || t.projectId);
    s.tasks.forEach((t) => { if (t.prospectId === id) t.prospectId = null; });
    s.projects.forEach((p) => { if (p.prospectId === id) p.prospectId = null; });
    s.quotes.forEach((q) => { if (q.prospectId === id) q.prospectId = null; });
  });
}

// ---------- Projets ----------
// Un projet regroupe des tâches ; sa progression = tâches terminées / tâches du projet.
export const newProject = (data = {}) => ({ id: 'pj-' + uid(), name: 'Nouveau projet', icon: 'folder', tone: 'blue', prospectId: null, due: null, status: 'actif', desc: '', links: [], createdAt: Date.now(), ...data });
export const getProject = (id) => state.projects.find((p) => p.id === id);
export function projectProgress(id) {
  const ts = state.tasks.filter((t) => t.projectId === id);
  const done = ts.filter((t) => t.done).length;
  return { total: ts.length, done, doing: ts.filter((t) => !t.done && t.status === 'doing').length, pct: ts.length ? Math.round((done / ts.length) * 100) : 0 };
}
export const canAddProject = () => can('projectsUnlimited') || state.projects.filter((p) => p.status !== 'termine').length < LIMITS.freeProjects;

// ---------- Devis ----------
// États : brouillon → envoyé → accepté ou refusé. Un devis accepté fait passer la fiche en client signé.
export const QUOTE_STATUS = { brouillon: ['Brouillon', 'grey'], envoye: ['Envoyé', 'sky'], accepte: ['Accepté', 'olive'], refuse: ['Refusé', 'rose'] };
// Devis envoyés sans réponse depuis FOLLOW_DAYS jours : à relancer (devis, notifications)
export const FOLLOW_DAYS = 3;
export const toFollow = (qt) => qt.status === 'envoye' && qt.sentAt && Date.now() - qt.sentAt > FOLLOW_DAYS * DAY;
export const quoteTotals = (qt) => {
  const ht = (qt.lines || []).reduce((n, l) => n + (Number(l.price) || 0) * (Number(l.qty) || 0), 0);
  const remise = ht * (Number(qt.remise) || 0) / 100;
  const base = ht - remise, tva = base * (Number(qt.tva) || 0) / 100;
  return { ht, remise, base, tva, ttc: base + tva, acompte: (base + tva) * (Number(qt.acompte) || 0) / 100 };
};
export const getQuote = (id) => state.quotes.find((q) => q.id === id);

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
  const task = { id: uid(), title: '', due: null, prospectId: null, projectId: null, kind: 'tache', done: false, list: null, prio: 0, notes: '', sub: [], status: 'todo', createdAt: Date.now(), updatedAt: Date.now(), ...t };
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
    t.done = !t.done; t.doneAt = t.done ? Date.now() : null; t.updatedAt = Date.now();
    t.status = t.done ? 'done' : 'todo';
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

// ---------- Notes (pages) ----------
export const getPage = (id) => state.pages.find((p) => p.id === id);
// Blocs « question / réponse » et « définition » d'une page : les cartes de révision (notes, quiz, accueil)
export const isQA = (b) => b?.t === 'qa' || b?.t === 'def';
export const qaCards = (p) => p.blocks.filter((b) => isQA(b) && (b.x || '').trim() && (b.a || '').trim());
export const bid = () => 'b' + Math.random().toString(36).slice(2, 9);
export function addPage(data = {}) {
  const now = Date.now();
  const page = { id: 'pg-' + uid(), title: '', icon: 'note', parent: null, fav: false, prospectId: null, blocks: [{ id: bid(), t: 'p', x: '' }], createdAt: now, updatedAt: now, ...data };
  update((s) => { s.pages.unshift(page); });
  return page;
}
// Une page et toutes ses sous-pages
export function pageFamily(id, list = state.pages) {
  const out = [id];
  for (let i = 0; i < out.length; i++) list.filter((p) => p.parent === out[i]).forEach((p) => out.push(p.id));
  return out;
}
export const canAddPage = () => can('notesUnlimited') || state.pages.length < LIMITS.freePages;
export const canAddBoard = () => can('boardsUnlimited') || state.boards.length < LIMITS.freeBoards;

// ---------- Quiz ----------
// partial : partie limitée aux erreurs précédentes — le meilleur score n'est pas touché.
export function saveQuizResult(id, score, total, wrong, partial = false) {
  update((s) => {
    const pct = total ? Math.round((score / total) * 100) : 0;
    const r = s.quiz.results[id] || { best: 0, tries: 0 };
    s.quiz.results[id] = partial ? { ...r, tries: (r.tries || 0) + 1, at: Date.now(), wrong }
      : { best: Math.max(r.best || 0, pct), last: pct, tries: (r.tries || 0) + 1, at: Date.now(), wrong };
    const k = dayKey();
    if (!s.quiz.days.includes(k)) s.quiz.days = [...s.quiz.days, k].slice(-60);
  });
}
// Jours consécutifs avec au moins un quiz terminé
export function quizStreak() {
  const set = new Set(state.quiz.days);
  let n = 0, t = startOfDay();
  if (!set.has(dayKey(t))) t -= DAY;
  while (set.has(dayKey(t))) { n++; t -= DAY; }
  return n;
}
