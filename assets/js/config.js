// Comptes en ligne (Supabase) et paiement réel (Stripe).
// Tant que ces deux valeurs sont vides, MindView reste en mode test : tout se passe sur l'appareil.
// Ces deux valeurs sont PUBLIQUES par conception : la clé « anon » ne donne accès qu'à ce que
// les règles de la base autorisent (chacun ne lit que son abonnement).
// Ne jamais mettre ici la clé « service_role », ni une clé Stripe : elles restent sur le serveur.
// Mode des comptes (1.11) :
// - 'local' : aucun mot de passe demandé, tout reste sur cet appareil (par défaut) ;
// - 'online' : e-mail et mot de passe vérifiés par le serveur (Supabase Auth). N'est actif que si CLOUD est rempli.
export const AUTH_MODE = 'local';

export const CLOUD = {
  url: '', // ex. https://abcdefghijkl.supabase.co (Supabase → Project Settings → API → Project URL)
  anonKey: '', // Supabase → Project Settings → API → anon public
};

// Connecteur Notion (1.12). Le serveur « notionProxy » garde le secret OAuth et le jeton d'accès (voir NOTION.md).
// proxyUrl : adresse du serveur (ex. https://abcdefghijkl.supabase.co/functions/v1). Vide = connexion directe indisponible.
// mock : true pour développer avec un Notion factice (ou ?notion=mock dans l'adresse, pour la session).
export const NOTION = {
  proxyUrl: '',
  mock: false,
};
