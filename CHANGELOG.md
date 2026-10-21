# Journal des versions — MindView

Les versions avant la 1.10 sont décrites dans le [README](README.md) (sections « Nouveautés »).

## 1.11.0 — 21/10/2026 · Phase 2 : un accueil plus court

- Accueil en trois écrans, sans paiement :
  1. l'accroche (le Mac et l'iPhone, un seul écran, avec « Passer ») ;
  2. le prénom ;
  3. le profil et les besoins sur un seul écran.
- Supprimés : le carrousel de cinq diapositives, l'étape « formule » et l'essai avec carte de l'accueil.
- Nouveau réglage `AUTH_MODE` dans `config.js` (`'local'` par défaut). En mode local, aucun mot de passe n'est demandé. En mode en ligne (avec `CLOUD` rempli), l'écran du prénom demande aussi l'e-mail et un mot de passe, vérifiés par le serveur.
- L'essai Pro est proposé plus tard, en contexte :
  - le bouton « Essayer Pro » apparaît quand on touche une fonction Pro ;
  - un bandeau discret s'affiche après trois jours d'utilisation, une seule fois, pour qui n'a jamais essayé, avec deux vrais boutons : « Essayer Pro » et « Rester en gratuit » ;
  - la feuille d'essai a aussi un vrai bouton « Rester en version gratuite ».
- Corrigé : le bouton collant « Continuer » cachait en partie le champ « Société ou école ». Il y a maintenant une marge en bas (safe-area), et le champ s'appelle « École ou société (facultatif) ».
- Prénom remis en forme partout (`normName` : espaces retirés, majuscule à chaque partie, « jean-pierre » → « Jean-Pierre »), à l'accueil, dans Compte et au chargement des anciennes données. « Bonjour adam » devient « Bonjour Adam ».
- Ton : l'accueil et l'écran de connexion passent par `strings.js`.
- Tests Playwright : l'accueil complet (sans mot de passe ni paiement, champ visible, prénom remis en forme), un ancien prénom en minuscules, et le bandeau d'essai avec « Rester en gratuit ».

## 1.10.0 — 21/10/2026 · Phase 1 : recentrer sur les élèves

**Modules**
- Trois modules : « M'organiser » (toujours présent), « Études » (actif par défaut) et « Entrepreneur » (désactivé par défaut).
- Entrepreneur regroupe le CRM, les devis, les scripts d'appel, la session d'appels, les statistiques, les outils, l'Académie et les quiz de commerce (prospection, prix et négociation, visibilité sur Google, gestion, relation client, objections). Il s'active quand le profil le demande ou dans Compte → Modules.
- Migration des données (schéma v4) : un compte qui utilisait déjà les clients ou la prospection garde Entrepreneur ; un compte qui n'avait que les quiz garde Études. Aucune donnée n'est supprimée.

**Menu**
- Menu latéral d'une dizaine d'entrées : Aujourd'hui, Vue d'ensemble, Tâches, Calendrier, Notes, Tableau blanc, Projets, puis les sections repliables Études (Emploi du temps, Examens, Moyennes, Révision espacée, Concentration, Quiz) et Entrepreneur, et une seule entrée Connecteurs.
- Les sections se replient et se déplient au clavier, et le choix est mémorisé. Les notifications passent dans une cloche en haut du menu.
- Supprimé : les entrées Notion, Figma, Canva, Google et Agendas séparées, et les pages favorites dans le menu.
- Page Plus (téléphone) réorganisée dans le même ordre. Sur ordinateur, la grille d'outils de « Mes études » est masquée parce qu'elle répétait le menu.

**Quiz**
- Plus de liens vers Quizlet, Kahoot ou Anki. Les quiz personnels sont les cartes des fiches de révision (Question / réponse, Définition).
- Le badge « Nouveau » ne s'affiche que pour un quiz ajouté il y a moins de 14 jours (champ `added`).

**Accueil**
- Le profil Études est présélectionné. Les profils pro (salarié, finance, commerce, artisanat, conseil, agence…) sont regroupés sous « Autres usages ».

**Ton**
- Nouveau fichier `assets/js/strings.js` : tutoiement pour les élèves et les usages perso, vouvoiement pour les profils pro (`t()`, `tv()`, `pick()`).
- Écrans convertis : Aujourd'hui, vue d'ensemble, tâches, calendrier, notes et modèles, tableau blanc, projets, études, quiz, verrous, bandeaux, réglages, rappels, verrouillage.
- Restent au vouvoiement : les écrans Entrepreneur et la page Confidentialité (texte juridique). L'accueil, l'abonnement, le compte et les connecteurs passent au bon ton pendant leur réécriture (phases 2 à 5).

**Corrigé**
- Le bouton « Compte rendu » d'une fiche client utilisait l'ancien format des modèles et pouvait planter. Il passe maintenant par la même création que les modèles de Notes.

**Tests**
- Tests Playwright (`tests/e2e`), lancés par GitHub Actions à chaque envoi, sur mobile 375×812 et sur ordinateur :
  - tous les écrans s'ouvrent, sur un compte vide et sur un compte rempli ;
  - le mode sombre s'applique ;
  - le module Entrepreneur est masqué pour un élève, et s'active dans Compte → Modules ;
  - le menu se replie au clavier ;
  - la page Quiz n'a aucun lien externe ;
  - tutoiement et vouvoiement selon le profil ;
  - migration d'un ancien compte.
