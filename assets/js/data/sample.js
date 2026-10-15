// Données d'exemple pour les aperçus (vue d'ensemble, chiffres de la semaine) quand
// l'utilisateur n'a encore rien saisi. Jamais enregistrées : elles servent seulement à
// montrer « ce que ça pourrait donner », toujours avec l'étiquette « Exemple ».
import { DAY, startOfDay } from '../store.js';

// Générateur pseudo-aléatoire déterministe : l'exemple est le même à chaque ouverture.
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const NAMES = ['Atelier Pivoine', 'Maison Lemaire', 'Brasserie des Tilleuls', 'Salon Céleste', 'Garage du Vieux Moulin', 'Cabinet Delvaux', 'Studio Lumen', 'Kiné Flagey', 'Épicerie Odette', 'Club Atlas', 'La Petite Fabrique', 'Boutique Indigo', 'Institut Camélia', 'Fiduciaire Verbeke', 'Hôtel Les Glycines', 'Menuiserie Peeters', 'Café Rivoli', 'Librairie Saint-Hubert', 'Pharmacie du Parc', 'Atelier Nord', 'Fleurs de Lune', 'Bistro Simone', 'Yoga Ixelles', 'Imprimerie Verte'];
const TITLES = ['Envoyer le devis Lemaire', 'Appeler le comptable', 'Préparer la réunion du lundi', 'Relancer Atelier Pivoine', 'Mettre à jour le portfolio', 'Répondre aux e-mails clients', 'Commander les cartes de visite', 'Planifier la semaine', 'Livrer les photos à Studio Lumen', 'Faire la déclaration TVA'];
const SRC = ['Appel', 'Appel', 'Appel', 'Recommandation', 'Instagram', 'Instagram', 'Site web', 'Visite', 'Salon'];

let cache = null, cacheDay = 0;
export function sampleState() {
  const t0 = startOfDay();
  if (cache && cacheDay === t0) return cache;
  const r = rng(42);
  const now = Date.now();
  const tasks = [], prospects = [], activities = [];
  // Tâches terminées sur 30 jours, en progression
  for (let d = 29; d >= 0; d--) {
    const day = t0 - d * DAY, n = Math.round(1 + (29 - d) / 9 + r() * 2.4);
    for (let k = 0; k < n; k++) tasks.push({ id: `sx-t${d}-${k}`, title: TITLES[(d * 3 + k) % TITLES.length], done: true, doneAt: Math.min(now - 60e3, day + (9 + k * 2) * 3600e3), due: day, createdAt: day - DAY, list: k % 2 ? 'travail' : 'perso' });
  }
  NAMES.forEach((name, i) => {
    const created = t0 - Math.floor(r() * 30) * DAY + 10 * 3600e3;
    const signed = i % 4 === 0;
    prospects.push({ id: `sx-p${i}`, entreprise: name, source: SRC[i % SRC.length], stage: signed ? 'signe' : ['a_appeler', 'rappeler', 'interesse', 'rdv', 'devis'][i % 5], valeur: signed ? [490, 1290, 790, 1900, 650, 1290][i % 6] : 0, createdAt: Math.min(created, now - 3600e3), updatedAt: created, signedAt: signed ? Math.min(now - 7200e3, created + 4 * DAY) : undefined });
  });
  // Appels : 6 à 14 par jour ouvrable, environ un rendez-vous sur dix
  for (let d = 29; d >= 0; d--) {
    const day = t0 - d * DAY, wd = new Date(day).getDay();
    if (wd === 0 || wd === 6) continue;
    const n = Math.round(6 + r() * 8);
    for (let k = 0; k < n; k++) {
      const x = r();
      activities.push({ id: `sx-a${d}-${k}`, type: 'appel', prospectId: `sx-p${Math.floor(r() * NAMES.length)}`, outcome: x < 0.1 ? 'rdv' : x < 0.25 ? 'interesse' : x < 0.5 ? 'rappeler' : x < 0.8 ? 'nr' : 'refus', at: Math.min(now - 120e3, day + (9 * 60 + k * 23) * 60e3) });
    }
  }
  prospects.filter((p) => p.stage === 'signe').forEach((p) => activities.push({ id: `sx-s${p.id}`, type: 'etape', prospectId: p.id, from: 'devis', to: 'signe', at: p.signedAt }));
  const pages = [
    { id: 'sx-pg1', title: 'Plan de la semaine', icon: 'calendar', createdAt: now - 5 * DAY, updatedAt: now - 2 * 3600e3 },
    { id: 'sx-pg2', title: 'Rendez-vous — Maison Lemaire', icon: 'briefcase', createdAt: now - 2 * DAY, updatedAt: now - 26 * 3600e3 },
  ];
  cache = {
    sample: true, tasks, prospects, activities, pages,
    lists: [{ id: 'perso', name: 'Personnel', tone: 'sky' }, { id: 'travail', name: 'Travail', tone: 'olive' }],
    quiz: { results: { organisation: { best: 90, last: 90, tries: 2, at: now - 5 * 3600e3 } }, mine: [] },
    sub: { history: [] },
  };
  cacheDay = t0;
  return cache;
}
