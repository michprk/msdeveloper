// Services vendus (scripts d'appel, accueil, réglages) et typographie française.
// Petit module à part (1.17) : l'accueil et les réglages s'en servent sans charger les 690 scripts.
export const SERVICES = {
  site: {
    id: 'site', label: 'Création de site web', short: 'Site web', icon: 'monitor',
    what: (p) => `on crée des sites internet pour les ${p} {de_ville}`,
    sujet: 'votre site internet', theme: 'leur site internet',
    emailSubjects: ['Une idée pour {entreprise}', '{entreprise} sur Google', 'Question rapide'],
  },
  auto: {
    id: 'auto', label: 'Automatisation', short: 'Automatisation', icon: 'bolt',
    what: (p) => `on aide les ${p} {de_ville} à gagner du temps en automatisant les rendez-vous, les rappels et les relances`,
    sujet: 'du temps que vous pourriez gagner chaque semaine', theme: 'l\'automatisation de leurs tâches répétitives',
    emailSubjects: ['Une idée pour gagner du temps chez {entreprise}', 'Question rapide sur vos rendez-vous', '{entreprise} : une heure de gagnée par jour ?'],
  },
  seo: {
    id: 'seo', label: 'Référencement', short: 'Référencement', icon: 'trend',
    what: (p) => `on aide les ${p} {de_ville} à sortir en premier sur Google et Google Maps`,
    sujet: 'votre visibilité sur Google', theme: 'leur visibilité sur Google',
    emailSubjects: ['{entreprise} sur Google Maps', 'Une idée pour {entreprise}', 'Question rapide'],
  },
  // Pour tous les autres métiers : les textes reprennent l'offre décrite dans le profil.
  offre: {
    id: 'offre', label: 'Votre propre offre', short: 'Votre offre', icon: 'briefcase',
    what: (p) => `on s'occupe de {offre} pour les ${p} {de_ville}`,
    sujet: '{offre}', theme: '{offre}',
    emailSubjects: ['Une idée pour {entreprise}', 'Question rapide', '{entreprise} : {offre}'],
  },
};
export const SERVICE_IDS = ['site', 'auto', 'seo', 'offre'];
// Services dont les textes sont écrits secteur par secteur (les autres sont générés)
export const WEB_SERVICES = ['site', 'auto', 'seo'];

// Espaces fines insécables avant : ; ? ! », et entre un nombre et son unité
export const typo = (s) => s
  .replace(/ ([:;?!»])/g, ' $1').replace(/« /g, '« ')
  .replace(/(\d) (h|€|%|min)(?![A-Za-zÀ-ÿ])/g, '$1 $2');
