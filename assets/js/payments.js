// Prestataire de paiement.
// Tant qu'aucun compte Stripe n'est relié à un serveur (voir PAIEMENTS.md), l'application
// fonctionne en mode test : tout le parcours d'abonnement est réel (essai, souscription,
// changement de formule, résiliation, échec de paiement, reçus), mais aucun argent ne bouge
// et aucune carte n'est demandée. Aucune clé secrète ne doit jamais figurer dans ce fichier :
// il est envoyé tel quel au navigateur.
export const PAYMENTS = {
  mode: 'test',
  provider: 'Stripe',
};
export const isTest = () => PAYMENTS.mode === 'test';
