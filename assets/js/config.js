// Comptes en ligne (Supabase) et paiement réel (Stripe).
// Tant que ces deux valeurs sont vides, MindView reste en mode test : tout se passe sur l'appareil.
// Ces deux valeurs sont PUBLIQUES par conception : la clé « anon » ne donne accès qu'à ce que
// les règles de la base autorisent (chacun ne lit que son abonnement).
// Ne jamais mettre ici la clé « service_role », ni une clé Stripe : elles restent sur le serveur.
export const CLOUD = {
  url: '', // ex. https://abcdefghijkl.supabase.co (Supabase → Project Settings → API → Project URL)
  anonKey: '', // Supabase → Project Settings → API → anon public
};
