// Prestataire de paiement.
// Mode test tant que config.js est vide : tout le parcours d'abonnement fonctionne sur l'appareil
// (essai, souscription, changement de formule, résiliation, échec de paiement, reçus), sans carte
// et sans argent. Dès que config.js pointe vers le projet Supabase (voir PAIEMENTS.md), le paiement
// passe par Stripe Checkout et l'abonnement est lu dans la base, écrite uniquement par le serveur.
// Aucune clé secrète ne doit jamais figurer ici : ce fichier est envoyé tel quel au navigateur.
import { cloudReady } from './cloud.js';

export const PAYMENTS = {
  get mode() { return cloudReady() ? 'stripe' : 'test'; },
  provider: 'Stripe',
};
export const isTest = () => PAYMENTS.mode === 'test';
