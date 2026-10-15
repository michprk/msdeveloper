// Modèles de CRM par métier : le nom des fiches, les étapes du pipeline et les champs utiles.
// Les sept étapes de base gardent leur rôle (nouvelle fiche, relance, intérêt, rendez-vous,
// proposition, gagné, perdu) : seuls leurs noms changent, les statistiques restent justes.
export const PRESETS = [
  {
    id: 'prospection', label: 'Prospection par téléphone', icon: 'phone', noun: 'Prospects',
    desc: 'Appeler des entreprises, décrocher des rendez-vous, signer.',
    labels: {}, extra: [], fields: [],
  },
  {
    id: 'agence', label: 'Agence web, services numériques', icon: 'monitor', noun: 'Prospects', service: 'site',
    desc: 'Sites, référencement, automatisations : de l\'appel à la mise en ligne.',
    labels: {}, extra: [{ label: 'Maquette prête', after: 'rdv', tone: 'sky' }, { label: 'En production', after: 'signe', tone: 'blue' }, { label: 'En ligne', after: 'st:En production', tone: 'olive' }],
    fields: [['Lien de la maquette', 'url'], ['Mensualité (€)', 'number'], ['Date de mise en ligne', 'date']],
  },
  {
    id: 'freelance', label: 'Freelance, créatif', icon: 'camera', noun: 'Clients',
    desc: 'Photo, vidéo, design, rédaction, traduction…',
    labels: { a_appeler: 'Demande reçue', rappeler: 'À relancer', interesse: 'Brief en cours', rdv: 'Rendez-vous', devis: 'Devis envoyé', signe: 'Accepté', perdu: 'Sans suite' },
    extra: [{ label: 'En cours', after: 'signe', tone: 'blue' }, { label: 'Livré', after: 'st:En cours', tone: 'olive' }],
    fields: [['Date de livraison', 'date'], ['Lien des fichiers', 'url'], ['Type de projet', 'select', ['Photo', 'Vidéo', 'Design', 'Rédaction', 'Autre']]],
  },
  {
    id: 'coach', label: 'Coach, consultant, thérapeute', icon: 'compass', noun: 'Clients',
    desc: 'Séance découverte, accompagnement, suivi.',
    labels: { a_appeler: 'Premier contact', rappeler: 'À relancer', interesse: 'Intéressé', rdv: 'Séance découverte', devis: 'Proposition', signe: 'Client actif', perdu: 'Pas pour maintenant' },
    extra: [{ label: 'Accompagnement terminé', after: 'signe', tone: 'olive' }],
    fields: [['Objectif', 'text'], ['Séances prévues', 'number'], ['Prochaine séance', 'date']],
  },
  {
    id: 'artisan', label: 'Artisan, travaux, dépannage', icon: 'hammer', noun: 'Clients',
    desc: 'Demande, visite technique, devis, chantier.',
    labels: { a_appeler: 'Demande reçue', rappeler: 'À rappeler', interesse: 'À visiter', rdv: 'Visite technique', devis: 'Devis envoyé', signe: 'Devis accepté', perdu: 'Refusé' },
    extra: [{ label: 'Chantier planifié', after: 'signe', tone: 'blue' }, { label: 'Terminé', after: 'st:Chantier planifié', tone: 'olive' }],
    fields: [['Adresse du chantier', 'text'], ['Date du chantier', 'date'], ['Acompte reçu', 'select', ['Non', 'Oui']]],
  },
  {
    id: 'immobilier', label: 'Immobilier', icon: 'house', noun: 'Contacts',
    desc: 'Acheteurs, vendeurs, visites et offres.',
    labels: { a_appeler: 'Nouveau contact', rappeler: 'À recontacter', interesse: 'Recherche active', rdv: 'Visite', devis: 'Offre', signe: 'Acte signé', perdu: 'Abandonné' },
    extra: [],
    fields: [['Budget (€)', 'number'], ['Type de bien', 'select', ['Appartement', 'Maison', 'Commerce', 'Terrain']], ['Commune recherchée', 'text']],
  },
  {
    id: 'b2b', label: 'Vente aux entreprises', icon: 'briefcase', noun: 'Clients',
    desc: 'Pipeline commercial classique, du premier contact à la signature.',
    labels: { a_appeler: 'Nouveau', rappeler: 'À relancer', interesse: 'Qualifié', rdv: 'Rendez-vous', devis: 'Proposition', signe: 'Gagné', perdu: 'Perdu' },
    extra: [],
    fields: [['Taille de l\'entreprise', 'select', ['1 à 9', '10 à 49', '50 à 249', '250 et plus']], ['Décideur', 'text']],
  },
  {
    id: 'commerce', label: 'Commerce, boutique, restaurant', icon: 'store', noun: 'Clients',
    desc: 'Clients fidèles, commandes, événements privés.',
    labels: { a_appeler: 'Nouveau client', rappeler: 'À recontacter', interesse: 'Demande en cours', rdv: 'Rendez-vous', devis: 'Devis envoyé', signe: 'Commande confirmée', perdu: 'Annulé' },
    extra: [{ label: 'Client fidèle', after: 'signe', tone: 'olive' }],
    fields: [['Anniversaire', 'date'], ['Préférences', 'text']],
  },
  {
    id: 'recrutement', label: 'Recrutement', icon: 'users', noun: 'Candidats',
    desc: 'Candidatures, entretiens, offres.',
    labels: { a_appeler: 'Candidature', rappeler: 'À recontacter', interesse: 'Présélection', rdv: 'Entretien', devis: 'Offre envoyée', signe: 'Embauche', perdu: 'Non retenu' },
    extra: [],
    fields: [['Poste', 'text'], ['CV', 'url'], ['Disponibilité', 'date']],
  },
  {
    id: 'association', label: 'Association, événementiel', icon: 'flag', noun: 'Partenaires',
    desc: 'Partenaires, sponsors, bénévoles.',
    labels: { a_appeler: 'À contacter', rappeler: 'À relancer', interesse: 'Intéressé', rdv: 'Rencontre', devis: 'Dossier envoyé', signe: 'Partenaire', perdu: 'Refus' },
    extra: [],
    fields: [['Montant du soutien (€)', 'number'], ['Contrepartie', 'text']],
  },
];
export const preset = (id) => PRESETS.find((p) => p.id === id);
