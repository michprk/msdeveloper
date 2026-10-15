// Modèles de pages (Notes). Blocs : [type, texte] ; type qa = [« qa », question, réponse].
// Types : p, h1, h2, todo, ul, ol, quote, callout, divider, qa.
export const TEMPLATES = [
  {
    id: 'vierge', name: 'Page vierge', icon: 'page', desc: 'Commencez à écrire, tapez « / » pour choisir un bloc.',
    title: '', blocks: [['p', '']],
  },
  {
    id: 'reunion', name: 'Réunion', icon: 'users', desc: 'Participants, ordre du jour, décisions, actions.',
    title: 'Réunion du ', date: true,
    blocks: [['h2', 'Participants'], ['ul', ''], ['h2', 'Ordre du jour'], ['ol', ''], ['ol', ''], ['h2', 'Décisions'], ['ul', ''], ['h2', 'Actions'], ['todo', 'Qui fait quoi, pour quand'], ['todo', '']],
  },
  {
    id: 'projet', name: 'Projet', icon: 'folder', desc: 'Objectif, étapes, ressources et notes.',
    title: 'Nouveau projet',
    blocks: [['callout', 'Objectif : ce que ce projet doit changer, et pour quand.'], ['h2', 'Étapes'], ['todo', 'Première étape'], ['todo', ''], ['todo', ''], ['h2', 'Ressources'], ['ul', 'Liens, documents, contacts'], ['h2', 'Notes'], ['p', '']],
  },
  {
    id: 'journal', name: 'Journal du jour', icon: 'sun', desc: 'Trois priorités, des notes, et ce qui s\'est bien passé.',
    title: '', date: true,
    blocks: [['h2', 'Mes trois priorités'], ['todo', ''], ['todo', ''], ['todo', ''], ['h2', 'Notes'], ['p', ''], ['h2', 'Ce qui s\'est bien passé'], ['ul', '']],
  },
  {
    id: 'semaine', name: 'Plan de la semaine', icon: 'calendar', desc: 'Objectifs de la semaine, puis jour par jour.',
    title: 'Semaine du ', date: true,
    blocks: [['callout', 'Prenez vingt minutes le lundi matin : trois objectifs, puis une ou deux tâches par jour.'], ['h2', 'Objectifs de la semaine'], ['todo', ''], ['todo', ''], ['todo', ''], ['h2', 'Lundi'], ['todo', ''], ['h2', 'Mardi'], ['todo', ''], ['h2', 'Mercredi'], ['todo', ''], ['h2', 'Jeudi'], ['todo', ''], ['h2', 'Vendredi'], ['todo', ''], ['h2', 'Bilan'], ['p', '']],
  },
  {
    id: 'rdv', name: 'Compte rendu client', icon: 'briefcase', desc: 'Contexte, besoins, objections, prochaine étape.',
    title: 'Rendez-vous — ', client: true,
    blocks: [['h2', 'Contexte'], ['p', ''], ['h2', 'Besoins exprimés'], ['ul', ''], ['h2', 'Objections entendues'], ['ul', ''], ['h2', 'Budget et délai'], ['p', ''], ['h2', 'Prochaine étape'], ['todo', 'Envoyer la proposition']],
  },
  {
    id: 'revision', name: 'Fiche de révision', icon: 'cards', desc: 'Questions et réponses : révisez-les ensuite en quiz.',
    title: 'Révision — ',
    blocks: [['callout', 'Chaque bloc « Question / réponse » devient une carte. Bouton « Réviser » en haut de la page.'], ['h2', 'L\'essentiel'], ['ul', ''], ['h2', 'Questions'], ['qa', '', ''], ['qa', '', ''], ['qa', '', '']],
  },
  {
    id: 'objectifs', name: 'Objectifs du mois', icon: 'target', desc: 'Des objectifs précis et mesurables, puis le bilan.',
    title: 'Objectifs — ', month: true,
    blocks: [['callout', 'Un bon objectif est précis, mesurable et daté : « 8 nouveaux clients avant le 30 », pas « plus de clients ».'], ['h2', 'Objectifs'], ['todo', ''], ['todo', ''], ['todo', ''], ['h2', 'Comment je vais mesurer'], ['ul', ''], ['h2', 'Bilan de fin de mois'], ['p', '']],
  },
  {
    id: 'idees', name: 'Boîte à idées', icon: 'inbox', desc: 'Tout noter, trier plus tard.',
    title: 'Idées',
    blocks: [['p', 'Notez tout ici, sans trier. Une fois par semaine, transformez les meilleures en tâches.'], ['ul', ''], ['ul', ''], ['ul', '']],
  },
  {
    id: 'checklist', name: 'Liste de contrôle', icon: 'checkSquare', desc: 'Les étapes à ne jamais oublier, à cocher.',
    title: 'Liste de contrôle',
    blocks: [['p', 'Pour une tâche que vous faites souvent : un lancement, une livraison, un départ en congé…'], ['todo', ''], ['todo', ''], ['todo', ''], ['todo', ''], ['todo', '']],
  },
  {
    id: 'planning', name: 'Planning de révision', icon: 'book', desc: 'Les chapitres jour par jour jusqu\'à l\'examen.',
    title: 'Planning de révision — ',
    blocks: [['callout', 'Une matière par ligne, une date par chapitre. Cochez au fur et à mesure ; la veille, uniquement des quiz.'], ['h2', 'Examen'], ['p', 'Date, salle, ce qui est autorisé.'], ['h2', 'Chapitres à revoir'], ['todo', 'Chapitre 1 — '], ['todo', 'Chapitre 2 — '], ['todo', 'Chapitre 3 — '], ['h2', 'La dernière semaine'], ['ul', 'Examen blanc'], ['ul', 'Quiz sur les dates et les définitions']],
  },
  {
    id: 'cours', name: 'Fiche de cours', icon: 'cards', desc: 'Un cours résumé : idées clés, dates, définitions.',
    title: 'Cours — ',
    blocks: [['h2', 'Les idées clés'], ['ul', ''], ['ul', ''], ['h2', 'Dates et définitions'], ['qa', '', ''], ['qa', '', ''], ['h2', 'Ce que je n\'ai pas encore compris'], ['p', '']],
  },
  {
    id: 'code', name: 'Projet de code', icon: 'monitor', desc: 'Objectif, fonctionnalités, stack, bugs et idées.',
    title: 'Projet — ',
    blocks: [['h2', 'Objectif'], ['p', 'Ce que l\'application doit permettre, en une phrase.'], ['h2', 'Fonctionnalités'], ['todo', ''], ['todo', ''], ['h2', 'Technique'], ['ul', 'Langage, framework, hébergement'], ['h2', 'Bugs connus'], ['todo', ''], ['h2', 'Idées pour plus tard'], ['ul', '']],
  },
  {
    id: 'budget', name: 'Budget du mois', icon: 'euro', desc: 'Revenus, dépenses fixes, dépenses variables, bilan.',
    title: 'Budget — ', month: true,
    blocks: [['h2', 'Revenus'], ['ul', ''], ['h2', 'Dépenses fixes'], ['ul', 'Loyer'], ['ul', 'Abonnements'], ['h2', 'Dépenses variables'], ['ul', ''], ['h2', 'Objectif d\'épargne'], ['p', ''], ['h2', 'Bilan de fin de mois'], ['p', '']],
  },
];
export const template = (id) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
