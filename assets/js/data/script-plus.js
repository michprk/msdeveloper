// Détails des scripts : pour chaque format, le niveau, la préparation, le minutage
// et l'après ; pour chaque étape, pourquoi ça marche, l'erreur à éviter et des variantes.

export const META = {
  appel: {
    niveau: 'Essentiel',
    prep: ['Ouvrir la fiche Google : note, nombre d\'avis, les trois derniers avis', 'Regarder le site sur téléphone : vitesse, bouton d\'appel, réservation', 'Jeter un œil au compte Instagram : date de la dernière publication', 'Noter une seule remarque précise : ce sera l\'accroche', 'Ouvrir l\'agenda et choisir deux créneaux à proposer', 'Se lever, sourire, un verre d\'eau à portée de main'],
    minutage: [['Ouverture', '0:00'], ['Accroche', '0:15'], ['Découverte', '0:35'], ['Proposition', '1:30'], ['Rendez-vous', '2:00'], ['Conclusion', '2:30']],
    apres: ['Enregistrer le résultat dans la fiche', 'Envoyer le SMS de confirmation si rendez-vous', 'Programmer la relance datée', 'Noter les mots exacts du prospect'],
  },
  repondeur: {
    niveau: 'Débutant',
    prep: ['Préparer votre numéro, à dicter lentement', 'Choisir le jour où vous rappelez — et le dire'],
    minutage: [['Présentation', '0:00'], ['Idée', '0:05'], ['Rappel et numéro', '0:12']],
    apres: ['Envoyer le SMS dans la minute', 'Noter « message laissé » dans la fiche', 'Programmer le rappel'],
  },
  visite: {
    niveau: 'Confirmé',
    prep: ['Vérifier les horaires et viser une heure creuse', 'Deux exemples prêts sur le téléphone', 'Des cartes de visite', 'Repérer la vitrine, l\'ambiance, un détail sincère à complimenter'],
    minutage: [['Entrée', '0:00'], ['Observation', '0:30'], ['Question', '1:00'], ['Montrer', '2:00'], ['Rendez-vous', '3:00']],
    apres: ['Noter le prénom et l\'ambiance dans la fiche', 'Créer le rendez-vous dans l\'agenda', 'Envoyer un SMS de remerciement'],
  },
  email: {
    niveau: 'Débutant',
    prep: ['Trouver l\'adresse générique (info@, contact@)', 'Personnaliser l\'accroche avec un fait vérifié', 'Relire à voix haute : moins de 120 mots'],
    minutage: [['Envoi', 'Jour 0'], ['Relance', 'J+3'], ['Appel', 'J+5']],
    apres: ['Programmer la relance à J+3', 'Noter l\'envoi dans l\'historique'],
  },
  sms: {
    niveau: 'Débutant',
    prep: ['Vérifier qu\'il s\'agit d\'un numéro professionnel', 'Envoyer en semaine, entre 9 h et 18 h'],
    minutage: [['Sans réponse', 'Jour 0'], ['Confirmation', 'Après le oui'], ['Rappel', 'La veille']],
    apres: ['Noter l\'envoi dans l\'historique'],
  },
  dm: {
    niveau: 'Débutant',
    prep: ['Aimer deux ou trois publications', 'Répondre à une story si possible', 'Repérer une publication précise à citer'],
    minutage: [['Interaction', 'Jour 0'], ['Premier message', 'Jour 1'], ['Relance', 'J+4']],
    apres: ['Passer au téléphone dès que la conversation s\'ouvre', 'Noter le compte Instagram dans la fiche'],
  },
  relance: {
    niveau: 'Essentiel',
    prep: ['Relire l\'historique de la fiche', 'Retrouver exactement ce qui avait été promis'],
    minutage: [['E-mail promis', 'J+2'], ['Proposition', 'J+1 après le RDV'], ['Relance du devis', 'J+3'], ['Clôture', 'J+10']],
    apres: ['Mettre à jour l\'étape du prospect', 'Programmer la relance suivante, ou clôturer'],
  },
  rdv: {
    niveau: 'Confirmé',
    prep: ['Relire la fiche et les notes d\'appel', 'Faire l\'audit express (Outils)', 'Préparer deux exemples proches de son activité', 'Préparer trois formules chiffrées', 'Confirmer la veille par SMS'],
    minutage: [['Ouverture', '0:00'], ['Diagnostic', '2 min'], ['Démonstration', '10 min'], ['Proposition', '15 min'], ['Engagement', '18 min']],
    apres: ['Envoyer la proposition le jour même', 'Passer le prospect en « Devis envoyé »', 'Programmer la relance à J+3'],
  },
  objections: {
    niveau: 'Essentiel',
    prep: ['Lire les réponses à voix haute une fois', 'S\'entraîner avec l\'outil Entraînement'],
    minutage: [],
    apres: ['Noter l\'objection entendue dans la fiche : elle reviendra au rendez-vous'],
  },
  closing: {
    niveau: 'Confirmé',
    prep: ['Avoir les trois formules chiffrées', 'Préparer le devis à envoyer', 'Connaître le montant de l\'acompte'],
    minutage: [['Récapituler', '0:00'], ['Trois options', '1 min'], ['Prix', '3 min'], ['Conclure', '4 min']],
    apres: ['Envoyer le devis dans l\'heure', 'Passer en « Devis envoyé » ou « Signé »', 'Lancer le projet dès l\'acompte reçu'],
  },
};

const solution = (svc) => (svc.id === 'site' ? 'réserver ou commander en ligne' : svc.id === 'auto' ? 'prendre rendez-vous sans appeler' : 'sortir dans les trois premiers sur la carte');

// Une entrée par étape, dans l'ordre des étapes du format.
export const STEP_PLUS = {
  appel: (sec, svc, d) => [
    { why: 'Les premières secondes décident de tout. En annonçant la durée et en laissant une porte de sortie, vous montrez que vous respectez son temps — et on raccroche moins.', avoid: '« Je ne vous dérange pas ? » : vous offrez la réponse « si » sur un plateau.',
      alt: [['Plus direct', `Bonjour, {prenom}, de {societe}. Je serai bref : ${svc.what(sec.plural)}. J'ai une question rapide pour {entreprise} — vous avez une minute ?`], ['Plus chaleureux', `Bonjour ! Ici {prenom}, de {societe}. J'ai vu ${sec.compliment} — bravo. Je vous appelle pour une idée toute simple, vous avez trente secondes ?`]] },
    { why: 'La personne qui décroche est une alliée, pas un obstacle. Traitée avec respect, elle vous passera le décideur au bon moment.', avoid: 'Mentir sur l\'objet de l\'appel (« c\'est personnel ») : vous perdez toute crédibilité au rappel.',
      alt: [['Si on vous demande l\'objet', 'C\'est au sujet de la présence en ligne de {entreprise} : j\'ai une idée concrète à lui montrer, ça prend deux minutes.']] },
    { why: 'Une observation précise prouve que vous avez préparé l\'appel. Le prospect passe de « encore un démarcheur » à « tiens, il a regardé ».', avoid: 'Le compliment vague (« votre entreprise est super ») ou la critique (« votre site est mauvais »).',
      alt: [['Si vous n\'avez rien trouvé', svc.id === 'offre' ? `En parlant avec des ${sec.plural} {de_ville}, j'ai remarqué que beaucoup gèrent encore {offre} seuls, le soir ou le week-end.` : `En regardant les ${sec.plural} {de_ville} sur Google, j'ai remarqué que très peu permettent de ${solution(svc)}.`]] },
    { why: 'Les questions font dire au prospect son problème avec ses mots. Un problème formulé par lui vaut dix arguments de votre part.', avoid: 'Enchaîner les questions comme un interrogatoire : rebondissez sur chaque réponse.',
      alt: [['Pour creuser', 'Et concrètement, ça représente quoi pour vous sur une semaine ?'], ['Si la réponse est « tout va bien »', 'Tant mieux ! Et si vous pouviez améliorer une seule chose, ce serait laquelle ?']] },
    { why: 'Une proposition courte, reliée à ce qu\'il vient de dire, sonne comme une solution — pas comme une vente.', avoid: 'Réciter tout ce que vous savez faire.',
      alt: [['En reprenant ses mots', `Vous m'avez dit que {probleme}. C'est exactement ce qu'on règle : ${d.value}.`]] },
    { why: 'L\'alternative déplace la décision de « oui ou non » vers « quand ». Le rendez-vous devient la suite logique.', avoid: '« Quand êtes-vous disponible ? » : la réponse la plus facile est « je vous rappelle ».',
      alt: [['En visio', 'Si c\'est plus simple, quinze minutes en visio : plutôt mardi 11 h ou jeudi 14 h ?'], ['S\'il hésite', 'Vingt minutes, sans engagement. Si ça ne vous parle pas, vous me le dites et on en reste là.']] },
    { why: 'Répéter le jour et l\'heure ancre l\'engagement ; le SMS le rend écrit.', avoid: 'Continuer à argumenter après le « oui » : vous risquez de le défaire.',
      alt: [['Pour sécuriser', 'Je vous envoie le SMS tout de suite. Si un imprévu arrive, répondez simplement et on décale.']] },
  ],
  repondeur: () => [
    { why: 'Un message court et précis est écouté jusqu\'au bout ; le numéro répété se note sans réécouter.', avoid: 'Un message de plus de trente secondes, ou sans numéro.' },
    { why: 'Le SMS laisse une trace écrite et donne un visage à votre appel.', avoid: 'Mettre un lien dès le premier SMS : il ressemble à du spam.' },
    { why: 'Faire référence au message montre de la suite dans les idées.', avoid: 'Laisser plus de deux messages sur le même répondeur.' },
  ],
  visite: () => [
    { why: 'Le bon moment fait la moitié du travail : un commerçant disponible écoute.' },
    { why: 'Annoncer qu\'on ne vient rien vendre désamorce la méfiance.', avoid: 'Commencer par sortir une brochure.' },
    { why: 'Une remarque faite sur place, sur ce qu\'on voit, est la plus crédible.' },
    { why: 'En boutique, une seule question suffit : vous cherchez une conversation, pas un diagnostic.' },
    { why: 'Montrer vaut mieux qu\'expliquer : trente secondes d\'exemple remplacent cinq minutes de discours.', avoid: 'Montrer le site d\'un concurrent direct du quartier.' },
    { why: 'Partir avant d\'être de trop laisse une bonne impression — et un rendez-vous.' },
    { why: 'Les détails notés à chaud (prénom, ambiance) font la différence au rendez-vous.' },
  ],
  email: () => [
    { why: 'L\'objet décide de l\'ouverture : court, personnel, sans majuscules ni points d\'exclamation.', avoid: '« Offre exceptionnelle », « Proposition commerciale » : direction les indésirables.' },
    { why: 'Un e-mail court, centré sur lui, avec une seule question, obtient plus de réponses qu\'une présentation complète.', avoid: 'Les pièces jointes et les liens multiples au premier envoi.' },
    { why: 'Beaucoup de réponses arrivent après la relance : le premier e-mail a souvent simplement été oublié.' },
    {},
  ],
  sms: () => [
    { why: 'Un SMS est presque toujours lu, et vite : il rattrape l\'appel manqué.', avoid: 'Écrire tard le soir ou le week-end.' },
    { why: 'Récapituler par écrit ce qui a été dit renforce l\'engagement.' },
    { why: 'La confirmation écrite réduit fortement les rendez-vous oubliés.', avoid: 'Oublier l\'adresse ou l\'heure exacte.' },
    { why: 'Le rappel la veille laisse le temps de prévenir en cas d\'empêchement.' },
  ],
  dm: () => [
    { why: 'Sur Instagram, on répond à une conversation, pas à une publicité : la question ouvre l\'échange.', avoid: 'Coller un argumentaire commercial dans le premier message.' },
    { why: 'Proposer un vocal ou une visite rend l\'échange humain.' },
    { why: 'Une relance légère obtient des réponses ; au-delà de deux, abandonnez.' },
  ],
  relance: () => [
    { why: 'Rappeler exactement quand c\'était prévu prouve votre fiabilité.' },
    { why: 'L\'e-mail promis, envoyé vite, transforme une esquive en vraie conversation.' },
    { why: 'Le lendemain du rendez-vous, vous êtes encore en tête : c\'est le moment d\'envoyer la proposition.' },
    { why: 'Une question ouverte invite à répondre sans pression.', avoid: '« Avez-vous pris une décision ? » : ça appelle un non.' },
    { why: 'Le message de clôture retire la pression ; c\'est souvent lui qui déclenche la réponse.' },
  ],
  rdv: () => [
    { why: 'Arriver avec trois constats concrets vous place en conseiller, pas en vendeur.' },
    { why: 'Annoncer le déroulé rassure et vous laisse mener.' },
    { why: 'Le diagnostic fait émerger les vraies raisons d\'acheter — et le budget.', avoid: 'Présenter votre offre avant d\'avoir compris le besoin.' },
    { why: 'Un exemple proche de son activité lui permet de se projeter.' },
    { why: 'Une seule recommandation chiffrée simplifie la décision.', avoid: 'Proposer cinq options : on finit par ne rien choisir.' },
    { why: 'Une prochaine étape datée évite que le dossier s\'endorme.' },
  ],
  closing: () => [
    { why: 'Un « oui » au résumé crée l\'élan pour le « oui » final.' },
    { why: 'Avec trois options, la question devient « laquelle ? » et non « est-ce que j\'achète ? ».' },
    { why: 'Le silence après le prix montre que vous êtes sûr de sa valeur.', avoid: 'Justifier le prix avant toute réaction.' },
    { why: 'Proposer concrètement de démarrer rend la décision simple.' },
    { why: 'Nommer le vrai frein permet de le traiter au lieu de baisser le prix.', avoid: 'Proposer une remise par réflexe.' },
  ],
};

// Banque de questions de découverte, par service (méthode SPIN).
export const DISCOVERY = {
  site: {
    Situation: ['Aujourd\'hui, comment vos nouveaux clients vous trouvent-ils ?', 'Vous avez un site ? Qui s\'en occupe ?', 'Vos clients vous contactent surtout comment ?'],
    'Problème': ['Qu\'est-ce qui vous frustre dans votre présence en ligne ?', 'Il arrive que des clients ne trouvent pas l\'information qu\'ils cherchent ?', 'Votre site s\'affiche bien sur téléphone ?'],
    Impact: ['Combien vous rapporte un nouveau client, en moyenne ?', 'Si deux clients de plus vous trouvaient chaque mois, qu\'est-ce que ça changerait ?', 'Combien de demandes partent chez un concurrent mieux présenté ?'],
    Besoin: ['Si votre site ne devait faire qu\'une chose, ce serait laquelle ?', 'Qu\'est-ce qui doit absolument y figurer ?', 'Pour quand aimeriez-vous qu\'il soit en ligne ?'],
  },
  auto: {
    Situation: ['Comment se passent vos prises de rendez-vous aujourd\'hui ?', 'Qui répond aux messages et au téléphone ?', 'Quels outils utilisez-vous déjà ?'],
    'Problème': ['Quelle tâche répétitive vous agace le plus ?', 'Combien de rendez-vous oubliés ou annulés par semaine ?', 'Il vous arrive d\'oublier de relancer un devis ?'],
    Impact: ['Combien d\'heures par semaine passez-vous sur l\'administratif ?', 'Que feriez-vous de trois heures de plus par semaine ?', 'Combien vous coûte un rendez-vous manqué ?'],
    Besoin: ['Quelle tâche aimeriez-vous ne plus jamais faire à la main ?', 'Qui devra utiliser le système au quotidien ?', 'Qu\'est-ce qui doit rester humain, selon vous ?'],
  },
  seo: {
    Situation: ['Sur quelle recherche aimeriez-vous être trouvé ?', 'Vous avez une fiche Google Business Profile ? Qui la met à jour ?', 'D\'où viennent vos clients, géographiquement ?'],
    'Problème': ['Où sortez-vous aujourd\'hui sur votre recherche principale ?', 'Vos avis Google reflètent votre travail ?', 'Vous payez de la publicité pour être visible ?'],
    Impact: ['Combien de clients par mois arrivent de Google aujourd\'hui ?', 'Que représenterait le fait d\'être dans les trois premiers sur la carte ?', 'Combien vous coûte un client obtenu par la publicité ?'],
    Besoin: ['Quel service voulez-vous mettre en avant en priorité ?', 'Sur quelles communes voulez-vous être la référence ?', 'Êtes-vous prêt à demander des avis à vos clients ?'],
  },
  offre: {
    Situation: ['Comment gérez-vous ce sujet aujourd\'hui ?', 'Qui s\'en occupe chez vous, et combien de temps ça prend ?', 'Vous avez déjà fait appel à quelqu\'un pour ça ?'],
    'Problème': ['Qu\'est-ce qui vous agace le plus dans la façon dont ça se passe ?', 'Qu\'est-ce qui vous empêche de le faire comme vous le voudriez ?', 'Qu\'est-ce qui a déjà mal tourné ?'],
    Impact: ['Combien de temps ou d\'argent ça vous coûte chaque mois ?', 'Si ce problème était réglé, qu\'est-ce que vous feriez de ce temps ?', 'Qu\'est-ce que ça change pour vos clients ?'],
    Besoin: ['Si vous pouviez changer une seule chose, ce serait laquelle ?', 'À quoi verriez-vous que c\'est une réussite ?', 'Pour quand aimeriez-vous que ce soit réglé ?'],
  },
};
export const SPIN_HELP = {
  Situation: 'Comprendre comment il travaille aujourd\'hui.',
  'Problème': 'Faire émerger ce qui coince.',
  Impact: 'Mesurer ce que ça lui coûte.',
  Besoin: 'Lui faire dire ce qu\'il veut.',
};

// Qualification : les quatre informations à obtenir avant de faire un devis.
export const QUALIF = [
  { k: 'besoin', label: 'Besoin clair', q: 'Qu\'est-ce qui doit changer en priorité ?' },
  { k: 'decideur', label: 'Décideur identifié', q: 'Qui d\'autre décide avec vous ?' },
  { k: 'budget', label: 'Budget évoqué', q: 'Vous aviez une enveloppe en tête ?' },
  { k: 'delai', label: 'Délai connu', q: 'Pour quand idéalement ?' },
];
