# Journal des versions — MindView

Les versions avant la 1.10 sont décrites dans le [README](README.md) (sections « Nouveautés »).

## 1.17.0 — 21/10/2026 · Phase 6 : finitions

Les mesures ont été faites avec un banc d'analyse maison (`_msdeveloper-src/tests/a11y.js`). L'API PageSpeed (Lighthouse) refuse les requêtes sans clé, d'où ce banc. Il passe sur 24 écrans et relève :
- le contraste du texte, selon les seuils WCAG AA (4,5:1, et 3:1 pour le grand texte) ;
- le texte de moins de 13 px ;
- les boutons et les champs sans nom accessible ;
- le débordement horizontal.

**Accessibilité : avant → après** (téléphone 375 px et ordinateur, clair et sombre)

| | Avant | Après |
|---|---|---|
| Textes sous le contraste AA, mode clair | 128 | 0 |
| Textes sous le contraste AA, mode sombre | 124 | 0 |
| Textes de moins de 13 px | 473 | 0 |
| Boutons ou champs sans nom | 0 | 0 |
| Écrans qui débordent à 375 px | 1 | 0 |
| Écrans qui débordent avec le texte « Très grand » | 4 | 0 |

Ce qui a changé :
- **Couleurs**
  - Gris secondaire plus foncé (`--muted`) et ocre plus foncé.
  - Nouveau jeton `--blue-ink` pour le texte bleu sur fond bleu clair (badges Pro, puces, étiquettes).
  - En mode sombre, texte foncé sur les boutons bleus (`--on-blue`), car le blanc ne passait pas.
  - Badges de notifications lisibles.
  - Surlignage des notes lisible en mode sombre.
- **Tailles** : plus aucun texte utile sous 13 px (185 règles relevées).
- **Petits écrans**
  - Les boutons longs passent à la ligne au lieu de déborder.
  - Les en-têtes, la barre du calendrier, les modes de concentration et la minuterie se replient quand le texte est agrandi.
- **Clavier**
  - Le lien « Aller au contenu » ramenait à l'accueil (il passait par le routeur) : il place maintenant le focus sur l'écran.
  - Chaque fenêtre porte le nom de son titre (`aria-labelledby`).
  - Le focus reste visible partout.
- **Texte plus grand** : déjà appliqué à toute l'application (zoom). Vérifié sur tous les écrans, sans débordement.

**Notifications**
- Le badge ne compte plus les données d'exemple. Un compte neuf n'a donc pas de badge.
- Rouge seulement pour ce qui demande d'agir (retard, conflit, relance). Couleur neutre pour un rappel ou une échéance.

**Vue d'ensemble**
- Pas de pourcentage tant que le compte est plus récent que la période de comparaison : « Nouveau · comparaison après 7 jours complets ».
- Même règle pour la jauge de régularité.
- La semaine en cours reste « en cours » (1.16).

**Performance**
- Écrans chargés à la demande :
  - au démarrage, 26 fichiers JavaScript (425 Ko) au lieu de 58 (1 269 Ko), soit −66 % ;
  - un écran est téléchargé à sa première ouverture, et les autres au premier geste (ou après 8 secondes) ;
  - un bouton d'un écran pas encore chargé fonctionne quand même : il charge tout, puis agit.
- Liens coupés pour ne pas tout entraîner :
  - le moteur de scripts (134 Ko) ne se charge plus avec le stockage ;
  - la carte quiz de l'accueil n'entraîne plus l'éditeur de notes ni le tableau blanc ;
  - l'accueil ne charge plus le CRM ;
  - les notifications ne chargent plus les devis.
- Le service hors ligne s'enregistre après le premier affichage.

**Comptes et paiement**
- « Continuer sans compte » à l'accueil en mode en ligne (moins de 13 ans, pas d'e-mail) : tout reste sur l'appareil.
- Nouveau réglage `PAYMENTS_LIVE` dans `config.js`. Les comptes en ligne et la synchronisation peuvent être allumés avant Stripe. L'abonnement reste alors en aperçu, sur l'appareil.

**Tests**
- Banc `a11y` (contraste, tailles, noms, débordement ; aussi sur l'accueil d'un nouveau compte).
- Playwright `phase6-finitions` :
  - chargement à la demande ;
  - bouton d'un écran pas encore chargé ;
  - badge (exemples, rappel, retard) ;
  - vue d'ensemble d'un compte récent ;
  - texte très grand sans débordement ;
  - clavier ;
  - « Continuer sans compte ».

## 1.16.0 — 21/10/2026 · Faire connaître MindView

**Page de présentation** (`presentation/`, https://michprk.github.io/msdeveloper/presentation/)
- Une page publique, rapide, faite pour être trouvée sur Google et partagée. Elle contient :
  - l'accroche ;
  - six fonctions ;
  - comment l'installer (iPhone, Android) ;
  - les données ;
  - les prix ;
  - les questions fréquentes ;
  - un appel final.
- Au ton des élèves, avec les vraies captures de l'application. Vérifiée à 375 px, sans débordement.
- Référencement : titre, description, adresse canonique, données structurées (`SoftwareApplication`) et `sitemap.xml`.

**Aperçu de partage**
- Image `presentation/og.png` (1200 × 630) et balises Open Graph, sur la page de présentation et sur l'application : un lien envoyé dans WhatsApp, Instagram ou Discord s'affiche avec une belle carte.
- Description de l'application et du manifeste réécrite pour les élèves (catégorie « education » en premier).

**Partage dans l'application**
- « Défier un ami » à la fin d'un quiz : le lien ouvre le même quiz chez l'ami, avec « Défi : 70 % à battre ». À la fin : « Défi réussi », égalité, ou « Il fallait battre… ».
- Quelqu'un de nouveau qui ouvre un lien partagé passe par l'accueil, puis arrive directement sur le quiz.
- « Inviter un ami » dans le menu Plus (feuille de partage du téléphone, sinon lien copié).

**Captures et vue d'ensemble**
- Nouvelles captures « élève » pour l'accueil de l'application et la page de présentation. Les anciennes montraient les clients, les devis et les scripts d'appel.
- Vue d'ensemble : la semaine (ou le mois) en cours n'est plus comparée à une période complète. Elle affiche « en cours » au lieu d'une baisse absurde.
- Un élève en Pro ne se voit plus proposer Premium Entrepreneur : la carte affiche « Pro est ouvert ».

**Hors application** (`_msdeveloper-src/marketing/kit/`)
- Kit de lancement : message, carrousel Instagram de 5 images, story, huit idées de vidéos courtes, calendrier sur 4 semaines, canaux gratuits, règles à respecter et mesure.

**Tests**
- Playwright `promotion` :
  - page de présentation (titre, aperçu, pas de débordement) ;
  - défi de quiz ;
  - retour au défi après l'accueil ;
  - « Inviter un ami ».

## 1.15.0 — 21/10/2026 · Brancher les vrais services : comptes, stockage, paiement, Notion

Tout est prêt et s'allume quand `config.js` est rempli. Le guide pas à pas est [BRANCHER.md](BRANCHER.md).

**Stockage synchronisé** (`assets/js/sync.js`)
- Avec un compte en ligne, les données sont enregistrées sur l'appareil (hors ligne d'abord), puis dans le compte, quelques secondes après chaque changement.
- On les retrouve sur l'ordinateur comme sur le téléphone. Cette promesse ne s'affiche que quand la synchronisation est vraiment active.
- Fusion à trois voies, élément par élément :
  - ce qui a changé d'un seul côté est repris ;
  - une suppression est respectée ;
  - modifié des deux côtés : la version la plus récente gagne ;
  - modifié d'un côté et supprimé de l'autre : la modification est gardée.
- Version tenue par la base : deux appareils ne s'écrasent jamais sans le savoir.
- Pas de changement appliqué pendant une saisie.
- Restent sur l'appareil : le code de verrouillage, l'abonnement (le serveur en est la source), le connecteur Notion et les réglages d'affichage (thème, taille du texte).
- Déconnexion : dernier envoi, puis les données quittent l'appareil (ordinateur partagé à l'école). Elles reviennent à la connexion. Si des changements n'ont pas pu partir, l'application prévient avant.
- Compte → Données : état de la synchronisation et bouton « Synchroniser maintenant ».

**Comptes**
- E-mail et mot de passe vérifiés par le serveur, avec confirmation de l'adresse :
  - on continue sur l'appareil en attendant le lien ;
  - un bandeau propose de renvoyer l'e-mail ;
  - les données partent dans le compte dès la confirmation.
- « Continuer avec Google » (et Apple, prêt), avec PKCE.
- « Mot de passe oublié » : lien par e-mail, puis choix d'un nouveau mot de passe dans l'application. « Changer mon mot de passe » dans Compte.
- Les jetons reçus dans l'adresse (liens e-mail, Google) en sont retirés aussitôt.
- En mode en ligne sans compte : un bandeau « Crée ton compte pour ne rien perdre ».
- Mention de l'âge à l'inscription : avant 13 ans, avec un parent.
- La connexion directe à Notion demande un compte en ligne : le jeton Notion est rangé sous ce compte, sur le serveur.

**Paiement**
- Essai Pro de 7 jours **sans carte**, démarré directement par le serveur, sans page de paiement. Une seule fois par compte.
- Sans moyen de paiement ajouté avant la fin, Stripe arrête l'essai : retour au gratuit, rien n'est prélevé. Pour garder Pro : « Ajouter un moyen de paiement » (espace de gestion Stripe).
- La période (mois ou an) et la présence d'un moyen de paiement sont enregistrées par le webhook (`billing_interval`, `has_payment_method`, événement `customer.updated`).
- Tableau des abonnés actifs aux nouveaux prix.

**Serveur** (`server/supabase/`)
- Migration `20261021000000_sync_notion.sql` :
  - table `user_data` (règles d'accès, version tenue par la base, 5 Mo au plus) ;
  - colonnes d'abonnement ;
  - tables Notion réservées au serveur.
- Nouvelle fonction `notion` : le proxy Notion complet (OAuth avec « state » lié au compte, liste blanche des chemins, renouvellement du jeton, déconnexion).
- `create-checkout-session` : essai sans carte. `stripe-webhook` : période et moyen de paiement.
- `config.toml` : le webhook est déployé sans vérification de jeton Supabase (il vérifie la signature Stripe).

**Serveur factice** (`?cloud=mock`)
- Imite Supabase (comptes, règles de la base) et Stripe, entièrement dans le navigateur.
- Sert à tout essayer avant de créer les comptes : inscription, confirmation, Google, mot de passe oublié (les e-mails arrivent en notification), synchronisation, essai, abonnement, suppression du compte.
- Une pastille « Serveur factice » le rappelle à l'écran.

**Confidentialité**
- La page explique la synchronisation quand elle est active : ce qui est enregistré, où (Union européenne), qui peut le lire, et ce que font la déconnexion et la suppression.

**Tests**
- Banc local `cloud1`, 27 vérifications :
  - fusion ;
  - inscription et envoi ;
  - autre appareil ;
  - changements simultanés et conflit ;
  - règles d'accès (ni lecture ni écriture chez un autre compte) ;
  - version périmée refusée ;
  - déconnexion et reconnexion ;
  - changement de mot de passe ;
  - lien de récupération ;
  - confirmation d'adresse ;
  - essai sans carte ;
  - suppression.
- Playwright `comptes-en-ligne` :
  - accueil en ligne, synchronisation, déconnexion et reconnexion ;
  - Google ;
  - essai sans carte.

## 1.14.0 — 21/10/2026 · Phase 5 : compte et données cohérents

**Mode des comptes**
- En mode local (`AUTH_MODE = 'local'`, par défaut), plus aucun mot de passe n'est proposé : ni à l'accueil, ni dans Compte, ni dans le menu.
- La page Compte le dit clairement : « Ton compte, c'est cet appareil. Pas de mot de passe : tout est enregistré ici… ».
- La phrase contradictoire « aucun mot de passe n'est stocké » (alors que l'inscription en demandait un) est supprimée.
- En mode en ligne, la note affiche l'e-mail connecté et précise ce qui reste sur l'appareil.
- Un mot de passe créé avec la 1.9 continue de protéger l'accès. Une carte « Mot de passe de cet appareil » propose « Me déconnecter » et « Retirer le mot de passe » (après vérification).
- En mode local, le bouton du menu devient « Sauvegarder mes données » (ou « Verrouiller la session » si un code est activé).

**Compte → Données**
- La section passe en premier dans la page Compte.
- Deux gros boutons : « Télécharger toutes mes données (.json) » et « Restaurer une sauvegarde ».
- Dessous : importer sans rien effacer, exporter vers un agenda (.ics), et l'export CSV des fiches (seulement avec le module Entrepreneur).
- Rappel quand les données ne sont que sur l'appareil et qu'aucune sauvegarde n'a été faite depuis 14 jours.
- Sur l'accueil, un bandeau de sauvegarde (avec « Plus tard », 14 jours) passe avant l'offre d'essai. Il apparaît après une semaine d'utilisation, à partir de 5 éléments créés.

**Promesses retirées**
- Aucune phrase ne promet l'ordinateur et le téléphone en même temps tant que la synchronisation n'existe pas.

**Tests**
- Tests Playwright de la page Compte :
  - mode local sans mot de passe ;
  - Données en premier ;
  - téléchargement de la sauvegarde ;
  - rappel sur l'accueil ;
  - ancien mot de passe ;
  - bouton du menu.

## 1.13.0 — 21/10/2026 · Phase 4 : prix et formules dans un seul fichier

**Un seul fichier de configuration**
- `assets/js/plans.js` contient les prix (au mois et à l'année), les limites, les fonctions par formule, le comparatif et les points forts de chaque formule.
- Ce fichier est lu par la page Abonnement, le comparatif, les verrous, le bandeau d'essai, le paiement et la vérification des paiements.
- `store.js` reprend ces valeurs pour les écrans existants.
- Une seule fonction décide de l'accès : `hasFeature(fonction)`. `can()` reste comme alias.
- Le vrai statut d'abonnement se branche avec `setAccessProvider()`, sans rien changer ailleurs.

**Formules**
- Gratuit, 0 € : notes texte illimitées, 3 projets, tâches, calendrier, examens, emploi du temps, moyennes, concentration, quiz du jour, 1 tableau blanc, import et export .zip Notion.
- Pro, 4,99 € par mois ou 39 € par an : connexion et synchronisation Notion, tableaux blancs illimités, révision espacée et planificateur, statistiques, exports, mise en forme complète des notes.
- Premium Entrepreneur, 9,99 € par mois ou 79 € par an : CRM, devis, scripts, session d'appels, statistiques commerciales, Académie. Montré seulement aux profils pro (ou avec le module Entrepreneur).

**Page Abonnement**
- Bascule mensuel / annuel, avec l'économie affichée (35 % sur Pro).
- Comparatif réduit à 8 lignes lisibles : les chiffres de remplissage comme le nombre de scripts sont retirés.
- La FAQ est gardée et mise à jour, au ton du profil.

**Paiement à l'année**
- Chaque abonnement a une période (`interval`) : renouvellement mensuel ou annuel.
- Passage du mensuel à l'annuel (et l'inverse) à la fin de la période payée.
- Le paiement réel envoie `interval` au serveur, qui choisit parmi quatre prix Stripe (`STRIPE_PRICE_PRO_YEAR`, `STRIPE_PRICE_PREMIUM_YEAR`).

**Mode test**
- La simulation (carte refusée, coupure, temps qui passe, « Vérifier les paiements ») n'apparaît qu'avec `?debug=1`.
- Sans debug et sans Stripe, l'essai démarre sans carte et revient seul à la version gratuite au bout de 7 jours, sans faux paiement. Aucun achat n'est possible tant que le paiement en ligne n'est pas ouvert.

**Choix « rester gratuit »**
- Chaque verrou a un vrai bouton « Continuer gratuitement ».

**Vérification des paiements**
- 17 situations, toutes conformes, dont : abonnement annuel, passage du mensuel à l'annuel, essai sans carte.
- Les montants sont lus dans `plans.js`.

**Tests**
- Tests Playwright des formules :
  - deux formules pour un élève, trois pour un profil pro ;
  - bascule annuelle avec l'économie affichée ;
  - pas de simulation sans `?debug=1`, outils de test présents avec `?debug=1`.

## 1.12.0 — 21/10/2026 · Phase 3 : un vrai connecteur Notion

**Connexion**
- Connexion par l'API officielle de Notion (intégration publique, OAuth), via l'interface `notionProxy` (`assets/js/notion/proxy.js`).
- Le secret OAuth et les jetons d'accès restent sur le serveur, jamais dans l'application.
- Le paramètre `state` d'OAuth est vérifié au retour, et l'adresse est nettoyée.
- Un Notion factice (`assets/js/notion/mock.js`) sert à développer et à tester. Il s'active avec `NOTION.mock` ou `?notion=mock`.
- Contrat à implémenter côté serveur : [NOTION.md](NOTION.md).

**Import**
- Les pages Notion deviennent des notes. Une base avec un statut ou une date devient des tâches ; une autre base devient des notes.
- Blocs repris : titres, paragraphes, listes, cases à cocher, citations, encadrés (avec leur ton), code, bascules, tableaux, images (en lien), mentions de pages et liens, séparateurs. Les colonnes et les blocs synchronisés sont mis à plat.
- Un bloc non pris en charge est gardé en texte, avec une mention discrète « Notion · … ».

**Export**
- Une note ou un projet s'envoie comme sous-page d'une page Notion choisie (menu ••• → « Envoyer vers Notion »).
- Les envois sont découpés en paquets de 100 blocs et les textes en morceaux de 2 000 caractères.

**Synchronisation des tâches avec une base Notion**
- Correspondance détectée puis modifiable : titre, statut (statut, sélection ou case), date, matière.
- Choix de la liste de tâches concernée.
- Synchro incrémentale (`last_edited_time`, pagination), bouton « Synchroniser maintenant », date de dernière synchro, erreurs lisibles. Synchro discrète au retour dans l'application, au plus toutes les 10 minutes.
- Conflit (modifié des deux côtés) : la version la plus récente gagne. Une notification « modifiée des deux côtés » permet de reprendre l'autre version.
- Une tâche supprimée dans MindView part à la corbeille de Notion.

**Limites de l'API**
- File d'attente centrale à environ 3 requêtes par seconde.
- Sur un 429, toute la file attend la durée de `Retry-After`. Ensuite, nouvel essai avec un délai qui double (plus un peu de hasard), 5 essais au plus, puis une erreur claire.

**Déconnexion**
- Le jeton est oublié par le serveur et le lien est oublié ici. Un texte explique ce qui reste de chaque côté.
- La page Confidentialité dit quelles pages sont lues et où vont les données.

**Notes**
- Nouveaux blocs « Bascule » et « Code ».
- Liens autorisés dans le texte (`http(s)` seulement, nettoyés, ouverts dans un nouvel onglet avec Ctrl + clic).

**Connecteurs**
- Notion en premier.
- Puis « Fichiers, sans connexion » : l'export .zip de Notion, les agendas, le tableur, Trello, Todoist, les cartes, Anki.
- Puis « Liens et aperçus » (Google, Figma, Canva, Miro, YouTube, GitHub), avec un vocabulaire honnête : ce sont des liens, pas des synchronisations.
- La carte « Synchronisation automatique » est retirée.

**Données**
- Schéma v5 : chaque tâche a une date de modification (`updatedAt`), ajoutée aux anciennes tâches.

**Tests**
- Test du parcours Notion complet avec le Notion factice (Playwright et banc local) : OAuth, import de tous les blocs, import d'une base paginée, export avec découpage, synchro (envoi, réception, conflit dans les deux sens, création, corbeille), sept 429 absorbés par la file, erreur lisible, déconnexion.

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
