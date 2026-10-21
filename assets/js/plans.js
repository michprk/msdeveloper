// Formules (1.13) : le SEUL fichier à modifier pour changer les prix, les limites ou ce que chaque formule ouvre.
// Lu par la page Abonnement, le comparatif, les verrous, le bandeau d'essai et le paiement.
// Une seule fonction décide de l'accès : hasFeature(fonction). Elle lit l'abonnement de l'appareil ;
// le vrai statut (serveur, Stripe) se branche avec setAccessProvider() sans rien changer ailleurs.
import { access as localAccess } from './store.js';

export const TRIAL_DAYS = 7;
export const GRACE_DAYS = 7;
export const RANK = { free: 0, pro: 1, premium: 2 };

// price : par mois ; yearly : par an. audience 'all' = tout le monde, 'pro' = profils pro (module Entrepreneur)
export const PLANS = {
  free: { id: 'free', name: 'Gratuit', price: 0, yearly: 0, audience: 'all', for: 'Pour s\'organiser et réviser', highlights: ['Notes texte illimitées', 'Tâches, calendrier, examens', '3 projets, 1 tableau blanc', 'Quiz du jour, import Notion (.zip)'] },
  pro: { id: 'pro', name: 'Pro', price: 4.99, yearly: 39, audience: 'all', for: 'Pour réviser mieux, en moins de temps', highlights: ['Synchronisation avec Notion', 'Tableaux blancs illimités', 'Révision espacée et planificateur', 'Statistiques et exports'] },
  premium: { id: 'premium', name: 'Premium Entrepreneur', short: 'Premium', price: 9.99, yearly: 79, audience: 'pro', for: 'Pour une activité, des clients', highlights: ['Tout Pro', 'CRM adapté au métier, devis', 'Scripts d\'appel, session d\'appels', 'Statistiques commerciales, Académie'] },
};

// Fonction → formule minimale. Ce qui n'est pas listé ici est gratuit.
export const FEATURES = {
  // Pro : ce qui fait gagner du temps aux élèves
  notionSync: 'pro', boardsUnlimited: 'pro', projectsUnlimited: 'pro', spaced: 'pro', planner: 'pro', focusStats: 'pro', exports: 'pro', exportsPro: 'pro', notesDraw: 'pro', connectors: 'pro',
  // Premium Entrepreneur : les modules d'entreprise
  crm: 'premium', quote: 'premium', scriptsAll: 'premium', callMode: 'premium', academy: 'premium', messages: 'premium', audit: 'premium', import: 'premium',
  myScripts: 'premium', training: 'premium', stats: 'premium', export: 'premium',
};
// Limites de la version gratuite (Infinity = sans limite)
export const LIMITS = { freePages: Infinity, freeProjects: 3, freeBoards: 1 };

// Comparatif court (8 lignes) : [libellé, gratuit, pro, premium]
export const COMPARE = [
  ['Tâches, calendrier, examens, emploi du temps, moyennes', true, true, true],
  ['Notes et modèles de fiches', 'Texte illimité', 'Mise en forme complète, dessin', 'Mise en forme complète, dessin'],
  ['Projets', `${LIMITS.freeProjects} projets`, 'Illimités', 'Illimités'],
  ['Tableau blanc', `${LIMITS.freeBoards} tableau`, 'Illimités', 'Illimités'],
  ['Notion', 'Import et export .zip', 'Connexion et synchronisation', 'Connexion et synchronisation'],
  ['Révision espacée, planificateur de révisions', false, true, true],
  ['Statistiques et exports', false, true, true],
  ['CRM, devis, scripts d\'appel (profils pro)', false, false, true],
];

// Prix selon la période ; économie de l'abonnement annuel
export const priceOf = (plan, interval = 'month') => (interval === 'year' ? PLANS[plan].yearly : PLANS[plan].price);
export const savingOf = (plan) => { const p = PLANS[plan]; if (!p.price) return { amount: 0, pct: 0, monthly: 0 }; const full = p.price * 12; return { amount: Math.round((full - p.yearly) * 100) / 100, pct: Math.round((1 - p.yearly / full) * 100), monthly: Math.round((p.yearly / 12) * 100) / 100 }; };
export const planName = (plan) => PLANS[plan]?.short || PLANS[plan]?.name || '';

// ---------- Accès ----------
let provider = null;
// À brancher sur le vrai statut d'abonnement : setAccessProvider(() => 'free' | 'pro' | 'premium')
export const setAccessProvider = (fn) => { provider = typeof fn === 'function' ? fn : null; };
export const currentPlan = () => (provider ? provider() : localAccess());
export function hasFeature(feature) { return (RANK[currentPlan()] ?? 0) >= RANK[FEATURES[feature] || 'free']; }
export const need = (feature) => FEATURES[feature] || 'free';

// Outils de test des paiements : seulement avec ?debug=1 (mémorisé pour la session ; ?debug=0 pour l'enlever)
try {
  const q = new URLSearchParams(location.search).get('debug');
  if (q === '1') sessionStorage.setItem('msdev:debug', '1');
  if (q === '0') sessionStorage.removeItem('msdev:debug');
} catch (e) { /* rien */ }
export const debugOn = () => { try { return sessionStorage.getItem('msdev:debug') === '1'; } catch (e) { return false; } };
