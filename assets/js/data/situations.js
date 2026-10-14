// Situations délicates : scripts valables pour tous les secteurs.
// Mêmes lignes que les autres scripts : v (vous), p (prospect), n (indication), m (message à copier).

export const SITUATIONS = [
  {
    id: 'barrage', icon: 'shield', cat: 'Prospection', title: 'Passer le barrage',
    when: 'Un secrétariat ou un employé filtre les appels.', goal: 'Obtenir le décideur, ou le bon moment pour le joindre.',
    steps: [
      { t: 'Se présenter simplement', l: [['v', 'Bonjour, {prenom}, de {societe}. Vous pouvez peut-être m\'aider : qui s\'occupe de la communication chez {entreprise} ?']], why: 'Demander de l\'aide transforme le filtre en allié.' },
      { t: 'Si on demande l\'objet', l: [['v', 'C\'est au sujet de la présence de {entreprise} sur Google : j\'ai une idée concrète à lui montrer, ça prend deux minutes.']], why: 'Un objet clair et court rassure ; un objet flou alerte.' },
      { t: 'S\'il ou elle n\'est pas disponible', l: [['v', 'Pas de souci. À quel moment est-ce le plus simple de le joindre ? Et vous êtes… ? Merci, je note.']], tip: 'Notez le prénom : au rappel, « Bonjour Julie, c\'est encore {prenom} » ouvre presque toutes les portes.' },
      { t: 'Au rappel', l: [['v', 'Bonjour, c\'est {prenom}, de {societe} — on s\'est parlé mardi, vous m\'aviez conseillé de rappeler à cette heure-ci. Je peux lui parler ?']] },
    ],
  },
  {
    id: 'presse', icon: 'clock', cat: 'Prospection', title: 'Le prospect pressé',
    when: '« J\'ai deux minutes », « Allez-y, vite ».', goal: 'Être bref et obtenir un vrai créneau.',
    steps: [
      { t: 'Respecter son temps', l: [['v', 'Je vais à l\'essentiel, trente secondes.']], why: 'Promettre court, et tenir, crée la confiance.' },
      { t: 'Une phrase', l: [['v', 'On aide les entreprises comme {entreprise} à avoir plus de clients grâce à Google, avec un prix fixe.'], ['v', 'Je vous propose d\'en parler vingt minutes quand vous aurez plus de temps : plutôt mardi ou jeudi ?']] },
      { t: 'S\'il coupe', l: [['v', 'Je vous laisse. Je vous envoie un SMS avec deux créneaux, vous choisirez.']], avoid: 'Accélérer le débit pour tout dire : c\'est l\'inverse qui fonctionne.' },
    ],
  },
  {
    id: 'agace', icon: 'shield', cat: 'Prospection', title: 'Le prospect agacé ou méfiant',
    when: 'Ton sec, « Encore un démarcheur », « Comment avez-vous eu mon numéro ? ».', goal: 'Désamorcer, et sortir proprement — parfois avec un rendez-vous.',
    steps: [
      { t: 'Accueillir l\'agacement', l: [['v', 'Je comprends tout à fait, vous devez en recevoir beaucoup.']], why: 'Valider l\'émotion fait baisser la tension ; se justifier la fait monter.' },
      { t: 'Être transparent', l: [['v', 'Votre numéro est sur votre fiche Google. Je suis {prenom}, de {societe}, on est une petite équipe à {ville}.']] },
      { t: 'Laisser le choix', l: [['v', 'Je vous propose ceci : je vous envoie un message avec une idée concrète pour {entreprise}. Si ça vous parle, vous me rappelez ; sinon, je ne vous dérange plus. Ça vous va ?']], tip: 'Si la personne demande de ne plus être appelée, notez-le dans la fiche et respectez-le.' },
    ],
  },
  {
    id: 'deja-appele', icon: 'refresh', cat: 'Prospection', title: '« On m\'appelle tout le temps pour ça »',
    when: 'Le prospect est saturé de sollicitations sur le même sujet.', goal: 'Se démarquer en dix secondes.',
    steps: [
      { t: 'Reconnaître', l: [['v', 'Je m\'en doute. Je peux vous demander ce qui ne vous a pas convaincu chez les autres ?']], why: 'Sa réponse vous donne exactement ce qu\'il ne faut pas faire — et ce qu\'il attend.' },
      { t: 'Se différencier', l: [['v', 'Chez nous, c\'est simple : un prix fixe annoncé, un délai écrit, un seul interlocuteur. {promesse}']] },
      { t: 'Proposer du concret', l: [['v', 'Plutôt que d\'en parler au téléphone, je peux vous montrer en vingt minutes ce que ça donnerait pour {entreprise}. Si ça ne vous plaît pas, on en reste là.']] },
    ],
  },
  {
    id: 'concurrent', icon: 'euro', cat: 'Vente', title: 'Il compare avec moins cher',
    when: '« J\'ai un devis deux fois moins cher ».', goal: 'Comparer la valeur, pas seulement le prix.',
    steps: [
      { t: 'Ne pas dénigrer', l: [['v', 'C\'est bien de comparer. Je peux voir ce qui est inclus dans l\'autre devis ?']], avoid: 'Critiquer le concurrent : vous perdez en crédibilité.' },
      { t: 'Comparer point par point', l: [['n', 'Nombre de pages, textes rédigés, référencement, délai, retouches, hébergement, formation, suivi.'], ['v', 'Ici, la rédaction et le référencement local sont inclus. Là, ils ne le sont pas : il faudra les ajouter.']], why: 'La plupart des écarts de prix viennent de ce qui n\'est pas inclus.' },
      { t: 'Recentrer sur le résultat', l: [['v', 'La vraie question : lequel des deux vous ramènera des clients ? Je préfère être un peu plus cher et que ce soit rentable pour vous.']] },
      { t: 'Si le budget est vraiment serré', l: [['v', 'On peut retirer des éléments et commencer plus petit. Mais je ne baisse pas le prix pour la même chose — ce ne serait pas sérieux.']] },
    ],
  },
  {
    id: 'remise', icon: 'euro', cat: 'Vente', title: 'On vous demande une remise',
    when: '« Vous pouvez faire un geste ? »', goal: 'Protéger votre prix, ou obtenir une contrepartie.',
    steps: [
      { t: 'Comprendre la demande', l: [['v', 'C\'est le montant total qui pose problème, ou la façon de payer ?']], why: 'Souvent, c\'est la trésorerie qui coince, pas le prix : un paiement en plusieurs fois suffit.' },
      { t: 'Échanger plutôt que donner', l: [['v', 'Je peux vous proposer un paiement en trois fois. Ou, si vous signez cette semaine, j\'ajoute la séance photo.']], tip: 'Une remise sans contrepartie dit que votre premier prix n\'était pas le bon.' },
      { t: 'Si la personne insiste', l: [['v', 'On peut alléger le projet : sans la page blog, par exemple. Le prix baisse parce que le travail baisse.']] },
    ],
  },
  {
    id: 'no-show', icon: 'calendar', cat: 'Suivi', title: 'Après un rendez-vous manqué',
    when: 'Le prospect n\'était pas là au rendez-vous.', goal: 'Reprogrammer sans culpabiliser.',
    steps: [
      { t: 'Le SMS du jour même', l: [['m', 'Bonjour {contact}, j\'étais au rendez-vous comme convenu, mais nous n\'avons pas pu nous voir — sans doute un imprévu, aucun souci. On reprogramme ? Je vous propose jeudi 10 h ou vendredi 14 h. {prenom}']], why: 'Un ton léger permet à la personne de revenir sans perdre la face.' },
      { t: 'L\'appel deux jours après', l: [['v', 'Bonjour {contact}, c\'est {prenom}. Je voulais simplement savoir si le sujet est toujours d\'actualité pour vous, ou si on le met de côté pour l\'instant ?']], avoid: 'Faire la morale : le rendez-vous est perdu pour de bon.' },
    ],
  },
  {
    id: 'reprise', icon: 'refresh', cat: 'Suivi', title: 'Reprendre contact après des mois',
    when: 'Un prospect « pas maintenant » d\'il y a trois à six mois.', goal: 'Relancer avec une raison, pas pour « prendre des nouvelles ».',
    steps: [
      { t: 'Une raison concrète', l: [['v', 'Bonjour {contact}, {prenom}, de {societe}. On s\'était parlé avant l\'été, vous m\'aviez dit de revenir vers vous à la rentrée. Je vous rappelle comme promis.']], why: 'Rappeler « comme promis » prouve que vous écoutez et que vous êtes fiable.' },
      { t: 'Une nouveauté', l: [['v', 'Depuis, on a mis en place quelque chose qui pourrait vous intéresser : {objectif}. Ça vaut vingt minutes ?']] },
    ],
  },
  {
    id: 'recommandation', icon: 'users', cat: 'Clients', title: 'Demander une recommandation',
    when: 'Un client est satisfait (mise en ligne, bons résultats).', goal: 'Obtenir un ou deux noms précis.',
    steps: [
      { t: 'Au bon moment', l: [['v', 'Ça me fait vraiment plaisir que le résultat vous plaise. Je peux vous demander un service ?']], why: 'La satisfaction est au plus haut juste après la livraison : c\'est le moment.' },
      { t: 'Une demande précise', l: [['v', 'Vous connaissez un ou deux commerçants autour de vous qui auraient besoin de la même chose ? Je les appellerai de votre part, sans insister.']], avoid: '« Si vous connaissez quelqu\'un… » : trop vague, la réponse est toujours non.' },
      { t: 'Le message à transmettre', l: [['m', 'Je te recommande {prenom} de {societe}, qui a fait notre site : prix clair, délais tenus. Son numéro : {tel}.']] },
    ],
  },
  {
    id: 'upsell', icon: 'trend', cat: 'Clients', title: 'Proposer un service en plus',
    when: 'Un client existant pourrait profiter de l\'entretien, du référencement ou d\'une automatisation.', goal: 'Faire grandir le client, au bon moment.',
    steps: [
      { t: 'Partir d\'un résultat', l: [['v', 'Depuis la mise en ligne, vous avez reçu combien de demandes par le site ?']], why: 'On propose une suite à partir d\'un résultat, jamais à froid.' },
      { t: 'Proposer l\'étape suivante', l: [['v', 'Pour aller plus loin, on peut travailler votre position sur Google Maps. C\'est {prix} pour démarrer, et vous voyez l\'évolution chaque mois.']] },
      { t: 'Laisser du temps', l: [['v', 'Pas besoin de décider maintenant. Je vous envoie un résumé, on en reparle la semaine prochaine ?']] },
    ],
  },
  {
    id: 'retard', icon: 'hourglass', cat: 'Clients', title: 'Annoncer un retard',
    when: 'Un projet ne sera pas livré à la date prévue.', goal: 'Préserver la confiance.',
    steps: [
      { t: 'Prévenir avant', l: [['v', 'Bonjour {contact}, je préfère vous prévenir tout de suite : la mise en ligne prendra trois jours de plus que prévu.']], why: 'Un retard annoncé à l\'avance est pardonné ; un retard découvert ne l\'est pas.' },
      { t: 'Expliquer sans excuses en cascade', l: [['v', 'La raison : {probleme}. Voici le nouveau planning, jour par jour.']] },
      { t: 'Compenser si c\'est de votre fait', l: [['v', 'Comme le retard vient de nous, je vous offre le premier mois d\'entretien.']], tip: 'Si vous avez une garantie de délai, appliquez-la sans attendre qu\'on vous la réclame.' },
    ],
  },
  {
    id: 'impaye', icon: 'invoice', cat: 'Clients', title: 'Relancer une facture impayée',
    when: 'L\'échéance est dépassée.', goal: 'Être payé, en gardant la relation.',
    steps: [
      { t: 'Rappel courtois — J+3', l: [['m', 'Bonjour {contact}, petit rappel : la facture de [montant] arrivait à échéance le [date]. Elle a peut-être échappé à votre attention — je vous la renvoie en pièce jointe. Merci ! {prenom}']], why: 'La plupart des retards sont des oublis : le premier rappel doit le permettre.' },
      { t: 'Appel — J+10', l: [['v', 'Bonjour {contact}, je vous appelle au sujet de la facture du [date]. Est-ce qu\'il y a un souci de mon côté, ou je peux compter sur un paiement cette semaine ?']] },
      { t: 'Rappel ferme — J+20', l: [['m', 'Bonjour {contact}, sans règlement de la facture [numéro] au [date], je devrai suspendre la maintenance du site. Je préfère évidemment éviter d\'en arriver là. {prenom}']], avoid: 'Menacer dès le premier rappel.' },
    ],
  },
  {
    id: 'mecontent', icon: 'message', cat: 'Clients', title: 'Gérer un client mécontent',
    when: 'Un client se plaint d\'un résultat ou d\'un délai.', goal: 'Écouter, réparer, garder le client.',
    steps: [
      { t: 'Écouter jusqu\'au bout', l: [['v', 'Je vous écoute. Dites-moi tout ce qui ne va pas.'], ['n', 'Ne coupez pas, notez.']], why: 'Un client qui se sent écouté est déjà à moitié apaisé.' },
      { t: 'Reformuler', l: [['v', 'Si je comprends bien : {probleme}. C\'est bien ça ?']] },
      { t: 'Proposer une solution datée', l: [['v', 'Voici ce que je vous propose : [solution], d\'ici [date]. Je vous tiens au courant à chaque étape.']], avoid: 'Chercher à avoir raison.' },
    ],
  },
  {
    id: 'avis', icon: 'star', cat: 'Clients', title: 'Demander un avis Google',
    when: 'Après la livraison, quand le client est content.', goal: 'Un avis sincère sur votre fiche.',
    steps: [
      { t: 'De vive voix', l: [['v', 'Ça me ferait vraiment plaisir que vous racontiez votre expérience sur Google. Je vous envoie le lien, deux phrases suffisent.']] },
      { t: 'Le message', l: [['m', 'Merci encore {contact} ! Voici le lien pour laisser votre avis : [lien]. Deux phrases suffisent — par exemple ce qui vous a plu dans notre façon de travailler. {prenom}']], tip: 'Envoyez le lien dans l\'heure : l\'enthousiasme retombe vite.' },
    ],
  },
];
export const SIT = Object.fromEntries(SITUATIONS.map((s) => [s.id, s]));
export const FREE_SITUATIONS = ['barrage'];
