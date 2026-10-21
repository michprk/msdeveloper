// Comptes en ligne, stockage synchronisé (Supabase) et paiement réel (Stripe). Mode d'emploi : BRANCHER.md.
// Tant que CLOUD est vide, MindView reste en mode local : tout se passe sur l'appareil.
// Ces valeurs sont PUBLIQUES par conception : la clé « anon » ne donne accès qu'à ce que les règles
// de la base autorisent (chacun ne lit et n'écrit que ses propres données).
// Ne jamais mettre ici la clé « service_role », ni une clé Stripe, ni le secret Notion : ils restent sur le serveur.
//
// Mode des comptes :
// - 'local' : aucun mot de passe demandé, tout reste sur cet appareil (par défaut) ;
// - 'online' : e-mail et mot de passe vérifiés par le serveur, données synchronisées entre appareils.
//   N'est actif que si CLOUD est rempli.
// Pour tout essayer sans serveur : ajouter ?cloud=mock à l'adresse (serveur factice, pour la session).
export const AUTH_MODE = 'local';

export const CLOUD = {
  url: '', // ex. https://abcdefghijkl.supabase.co (Supabase → Project Settings → API → Project URL)
  anonKey: '', // Supabase → Project Settings → API → anon public
  // Connexion en un geste : 'google' et/ou 'apple', une fois activés dans Supabase → Authentication → Providers
  providers: [],
  mock: false, // true : serveur factice pour tout le monde (démonstration uniquement)
};

// Connecteur Notion (1.12). Le serveur « notionProxy » garde le secret OAuth et le jeton d'accès (voir NOTION.md).
// proxyUrl : adresse des fonctions du serveur (ex. https://abcdefghijkl.supabase.co/functions/v1). Vide = connexion directe indisponible.
// mock : true pour développer avec un Notion factice (ou ?notion=mock dans l'adresse, pour la session).
export const NOTION = {
  proxyUrl: '',
  mock: false,
};
