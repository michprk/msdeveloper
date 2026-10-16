# MindView

**Vos tâches, vos projets, vos notes et vos clients, au même endroit.** L'application d'organisation pour tout le monde : réviser un examen, mener un projet de code, gérer son travail, son budget ou ses clients.

- **En ligne :** https://michprk.github.io/msdeveloper/ (non indexée)
- **Conçue par** M&S Design, Bruxelles.

## Positionnement (version 1.4)

**Pour qui.** Tout le monde, pas seulement les créateurs de sites : étudiants qui révisent, salariés, développeurs, indépendants, commerçants, finance, petites équipes. À l'accueil, chacun dit qui il est (dix situations) et ce qu'il veut (huit objectifs) ; l'application n'affiche que ce qui lui sert.

**La promesse en une phrase.** Vos tâches, vos projets, vos notes et vos clients, au même endroit.

**Trois bénéfices**
1. **Une journée claire** : les tâches du jour, les rendez-vous et les échéances sur un seul écran, avec un centre de notifications. On écrit « Réviser le chapitre 3 demain 18h », la date se règle toute seule.
2. **Des projets qui avancent** : un examen, une application, un client, un déménagement ; chaque tâche appartient à un projet, et la progression se calcule toute seule.
3. **Tout ce que vous savez, rangé** : des pages et sous-pages comme dans un carnet, des modèles (cours, planning de révision, budget, projet de code, réunion), et des quiz pour retenir.

**Pourquoi une seule application plutôt que Notion + un tableur + une app de rappels.** Une tâche appartient à un projet, une page de notes à une fiche, un devis accepté transforme le prospect en client et crée son projet : rien à recopier d'un outil à l'autre.

## Nouveautés 1.8 (16/10/2026)

- **Lecture précise de l'écriture** : un vrai modèle de reconnaissance entraîné sur des écritures humaines (TrOCR de Microsoft, licence MIT), exécuté **sur l'appareil** dans un fil séparé, suivi d'un correcteur français (dictionnaire de 38 000 mots + vos mots) qui rattrape « domain » → « demain », « revision » → « révision ». Il s'installe une seule fois depuis l'outil Écriture (environ 55 Mo à télécharger, 90 Mo une fois installé, avec progression) et reste disponible hors ligne ; avant l'installation, l'ancien moteur simple sert de secours. Mesuré : 8 mots sur 8 écrits à la main lus justes dans l'application, environ 1,5 s de calcul par mot sur ordinateur.
- **Formes** : les solides sont retirés. 20 formes et traits : carré, arrondi, rond, triangle, triangle rectangle, losange, parallélogramme, trapèze, pentagone, hexagone, octogone, étoile, cœur, nuage, grosse flèche, croix, trait, flèche, double flèche, flèche courbe. **Flèches accrochées** : une flèche tracée d'une forme à une autre (ou à un texte) les relie et suit quand on les déplace ; la poignée du milieu la courbe.
- **30 polices** rangées par familles (écriture à la main, classiques, titres, très lisibles pour la dyslexie, machine à écrire), chaque nom écrit dans sa propre police, dans le tableau blanc comme dans les notes.
- **Comme les meilleures applications** : 4 stylos (bille, plume, pinceau, feutre), aligner et répartir plusieurs éléments, grouper (Ctrl G), verrouiller, copier-coller entre tableaux (Ctrl C / Ctrl V), sélection au lasso, listes à puces.
- **Plein de tableaux** : depuis un tableau ouvert, « Mes tableaux » pour passer de l'un à l'autre et « + » pour en commencer un nouveau. Nouveaux modèles : prise de notes Cornell, tableau des tâches, analyse SWOT ; le schéma de cours et la carte mentale utilisent les flèches accrochées.
- **Formules** : Pro = **les études et l'organisation** (notes, projets, tableau blanc, emploi du temps, moyennes, planificateur, révision espacée, concentration) ; Premium = **études + entrepreneuriat** (CRM, devis, scripts, mode appel, statistiques, Académie, export PNG). La fleur de la carte Premium est retirée.

## Nouveautés 1.7 (16/10/2026)

- **Tableau blanc refait** (Pro et Premium ; sans abonnement, les tableaux restent lisibles) :
  - **Écriture à la main → texte** : on écrit au doigt ou au stylet, on lève le doigt, et au bout d'une seconde l'écriture devient du texte, au même endroit et à la même taille, dans l'une des trois polices : Naturelle (Caveat), Attachée (Playwrite France Moderne, le modèle d'écriture de l'école française) ou Appliquée (Playpen Sans). En touchant le texte : les autres lectures possibles, « Corriger » au clavier, ou « Mon écriture » pour revenir au tracé. La lecture se fait **sur l'appareil**, sans rien envoyer.
  - **Encre** à épaisseur variable (pression du stylet, vitesse du doigt), traits lissés. **Formes parfaites** : on trace un rond, un carré, un triangle ou un trait et on garde le doigt appuyé une demi-seconde.
  - **15 formes**, dont **6 volumes** (cube, pavé, cylindre, cône, sphère, pyramide) en perspective cavalière, arêtes cachées en pointillés, relief et ombre.
  - **Surligneur** en 8 couleurs fluo plus une couleur libre, **gomme précise** (elle coupe un trait) ou « objet entier », soulignement bien droit.
  - **Texte comme dans un traitement de texte** : gras, italique, souligné, barré, couleur, surlignage et police d'un passage ou de tout le texte, taille, alignement, encadré, ombre ; on élargit le cadre par les côtés.
  - **Cases à cocher** en liste (un toucher coche), post-it, bulles, tampons, graphiques, frises, modèles (page de cahier Seyès, géométrie des volumes, schéma de cours…).
  - Outils nommés en bas, réglages juste au-dessus, barre de l'élément choisi, guides d'alignement, deux doigts pour zoomer, paume ignorée au stylet, guide de démarrage, **impression ou PDF**, export en image avec les polices.
- **Accueil : « Créez votre compte »** avec son adresse e-mail. Quand les comptes en ligne sont allumés, un code à 6 chiffres arrive par e-mail ; en attendant, le compte est enregistré sur l'appareil (c'est dit à l'écran).

**Lecture de l'écriture, mesurée** (banc d'essai `_msdeveloper-src/tools/hwr-eval.html`, 250 mots écrits dans 5 styles d'écriture simulés, déformés : inclinaison, tremblement, tailles et écarts variables) : 84 % lus du premier coup, 91 % dans les trois propositions, environ 0,2 s par mot sur ordinateur. Une vraie écriture au doigt varie davantage : d'où les autres lectures, la correction et le retour au tracé. Les mots corrigés et le vocabulaire de l'utilisateur (matières, projets, notes) sont reconnus en priorité.

## Nouveautés 1.6 (15/10/2026)

- **Logo MindView** : un cerveau bleu clair avec deux yeux, dont un doré, qui cligne, regarde autour et lève un sourcil (écran de démarrage, barre latérale, icônes de l'application). Les animations suivent le réglage « Mouvement ».
- **Mes études** (nouveau module) : matières, emploi du temps de la semaine, examens avec compte à rebours et projet de révision, moyennes avec coefficients et « note nécessaire », révision espacée (chaque carte revient au bon moment), mode concentration (minuteur Pomodoro, statistiques), planificateur de révisions automatique. Quand l'application sert seulement à l'école, les scripts, sessions d'appels, prospects, clients, devis et l'Académie disparaissent ; l'accueil, la vue d'ensemble, les exemples et la démonstration parlent d'études.
- **Calendrier** (S'organiser) : vues mois, semaine, jour et liste, grands blocs lisibles ; tâches, examens, échéances de projets et cours au même endroit ; glisser-déposer pour déplacer une tâche (Pro).
- **Tableau blanc** (S'organiser, `#/tableaux`) : stylo, surligneur, soulignement rouge, gomme, traits, flèches, carrés, cercles, textes mis en forme, post-it, bulles, cases à cocher, coches, graphiques (barres, courbe, camembert) et frises d'évolution. Zoom, sélection multiple, annuler / refaire, six modèles, export en image.
- **Éditeur de notes** comme un traitement de texte, dans tous les modèles : gras, italique, souligné, barré, couleur du texte, surligneur, polices, tailles, soulignement rouge, encadrés, alignement, et dessin directement sur la page (mêmes outils que le tableau blanc).
- **Connecteurs** dans la barre latérale : Notion (import et export .zip), Figma, Canva, Miro, Google Docs / Sheets / Slides, Drive, YouTube, Loom, GitHub, Trello (import JSON), Quizlet et Anki (import de cartes), agendas (.ics dans les deux sens), Excel / CSV (import et export des tâches).
- **Se connecter / se déconnecter** dans la barre latérale et le Compte. Tant que les comptes en ligne sont éteints, le bouton l'explique et propose le code de verrouillage et la sauvegarde.
- **Prix** : Pro 11,99 €, Premium 21,99 €. Les fleurs bleues ne restent que sur l'Abonnement (grande fleur sur Premium).

## Nouveautés 1.5 (15/10/2026)

- **Nouveau nom : MindView**, monogramme MV (M crème, V bleu clair, Fraunces), même direction artistique bleu nuit, bleu clair, olive et crème. L'adresse et le dépôt `msdeveloper` ne changent pas encore, pour ne pas casser les applications déjà installées ; les données (`msdev:v1`) sont conservées.
- **Vérifier les paiements** (Abonnement, mode test) : 12 situations et 38 vérifications rejouées automatiquement, abonnement remis comme avant. Voir [TEST-PAIEMENTS.md](TEST-PAIEMENTS.md).
- **Passage à Stripe prêt et éteint** : compte en ligne par e-mail et code, Stripe Checkout, espace de gestion Stripe, webhook signé seul à écrire l'abonnement, suppression du compte côté serveur. S'allume en remplissant `assets/js/config.js`. Voir [PAIEMENTS.md](PAIEMENTS.md) et le dossier `server/`.
- **Les quatre chiffres** (inscriptions, prise en main, retour à J+7, passage au payant) : vues SQL prêtes, deux événements seulement, désactivables. Voir [MESURES.md](MESURES.md).

## Nouveautés 1.4 (15/10/2026)

- **Projets** (`#/projets`) : tâches reliées, progression automatique, statut (en cours, en pause, terminé), échéance, client facultatif, pages et liens du projet, cinq modèles (examen, site ou app, client, événement, budget). Gratuit : 3 projets en cours ; Pro : illimités.
- **Tâches** : chaque tâche a un projet, une priorité, une date limite et un statut (à faire, en cours, terminée). Filtre par projet ; saisie rapide `#nomduprojet`.
- **Prospects → clients → devis** : « Convertir en client » sur la fiche, filtre Prospects / Clients, devis par fiche (`#/devis`) suivis de brouillon à envoyé (relance créée à J+3), accepté (la fiche passe en client signé et un projet est créé) ou refusé. Dupliquer, PDF, retour en brouillon.
- **Pipeline** : cartes avec montant, date, étiquettes, responsable et prochaine action (rouge si en retard), total par colonne, « Ajouter » dans chaque colonne, filtre « Pipeline de ».
- **Recherche globale** (Ctrl/⌘ K) : tâches, projets, clients, prospects, devis, pages, avec filtres type, période (aujourd'hui, 7 jours, en retard, ce mois), statut et priorité, même sans texte.
- **Centre de notifications** (`#/notifications`, cloche avec pastille) : tâches en retard, rappels du jour, échéances proches, devis à relancer, clients sans nouvelles ; chaque catégorie s'active ou se coupe.
- **Confidentialité et RGPD** (`#/confidentialite`) : données, stockage, droits, contacts du CRM, tiers, sécurité. Coordonnées du responsable du traitement **à compléter** avant le lancement.
- **Connecteurs** (`#/connecteurs`) : liens Canva, Figma, Notion, Drive, GitHub rangés dans les projets et fiches, aperçu Figma/Canva à la demande, import de pages Notion (Markdown), export des tâches vers un agenda (.ics). La synchronisation automatique demandera les comptes en ligne et les autorisations officielles de chaque service.

## Modules

À l'accueil, l'utilisateur choisit ce qu'il veut faire ; tout se change dans Compte → Modules. La navigation n'affiche que les modules utilisés.

| Module | Contenu |
|---|---|
| M'organiser | Tâches (saisie en langage courant, listes, priorités, sous-tâches, tableau), Projets, Calendrier, Notes (pages, sous-pages, éditeur mis en forme, dessin, modèles, favoris), Tableau blanc |
| Mes études | Matières, emploi du temps, examens, moyennes, révision espacée, concentration, planificateur de révisions |
| Suivre mes clients | CRM : pipeline, fiches, champs, équipe, étiquettes, dix modèles par métier, pages liées, projets, devis, statistiques |
| Trouver des clients | 934 scripts (23 secteurs × 4 services × 10 formats + 14 situations), dont « Votre offre » pour tous les métiers ; mode appel, audit, import, entraînement |
| Apprendre et progresser | 9 quiz (90 questions expliquées), quiz du jour, révision des notes en cartes, vos propres quiz, Académie (17 guides) |

## Écrans principaux (1.3.1)

- **Aujourd'hui** : une action principale (ajouter une tâche) et ce qui est urgent d'abord (en retard, puis priorité, puis heure). En plus discret : appels, quiz du jour, notes récentes, et trois chiffres de la semaine.
- **Vue d'ensemble** : cartes chiffres avec évolution par rapport à la période précédente (7 ou 30 jours) et courbe, graphique d'évolution avec choix de l'indicateur et vue tableau, activité récente, répartition des fiches par origine (ou des tâches par liste). Uniquement les données de l'utilisateur.
- **Premiers écrans** : Tâches et Clients vides proposent une action directe (« Créer ma première tâche », « Ajouter mon premier client »), le bénéfice en une phrase, des exemples en un geste et un aperçu marqué « Exemple ».
- **Compte** : sections Profil, Facturation, Activité, Application, Notifications, Sécurité et session, Données, Suppression. Enregistrement automatique avec statut visible ; une saisie invalide (e-mail, téléphone, IBAN, n° de TVA) n'est pas enregistrée et l'erreur est expliquée. Verrouillage automatique réglable, informations de session, date de la dernière sauvegarde, suppression du compte avec confirmation tapée.

## Navigation

| Téléphone | Ordinateur |
|---|---|
| Barre du bas : Aujourd'hui, jusqu'à trois modules, Plus. Bouton + flottant selon l'écran (nouvelle tâche, page, fiche). | Barre latérale : « Nouveau », « Rechercher » (Ctrl/⌘ K), puis un groupe par module, pages favorites sous Notes, compte en bas. |

## Ce qui fonctionne (testé le 15/10/2026)

| Parcours | Vérifié |
|---|---|
| Accueil | Choix des modules et du métier, modèle de CRM appliqué, essai ou version gratuite |
| Tâches | « Appeler Marc demain 14h #travail ! » → demain 14 h, liste Travail, importante. Sous-tâches, notes, terminer avec Annuler, supprimer avec Annuler, tableau À faire / En cours / Fait, agenda |
| Notes | Modèles, blocs, Entrée / Retour arrière, raccourcis Markdown, menu « / », cases à cocher, sous-pages, favoris, bloc → tâche, export Markdown, enregistrement à chaque frappe, reprise après rechargement |
| Quiz | Réponse, explication, résultat, « Refaire mes erreurs », cartes de révision depuis une page, création de quiz avec validation |
| CRM | Modèle par métier, brouillon conservé, validation, fiche, relance liée, compte rendu lié |
| Abonnement (mode test) | Refus de carte, coupure réseau, souscription, passage à Premium au prorata, passage à Pro en fin de période, résiliation, reprise, renouvellement, renouvellement refusé, délai de grâce, régularisation, fin d'accès |
| Compte existant | Les données de la version 1.2 sont reprises telles quelles (fiches, étapes, champs, équipe, tâches) |

## Formules

| | Gratuit | Pro 11,99 €/mois — études et organisation | Premium 21,99 €/mois — études + entrepreneuriat |
|---|---|---|---|
| Tâches, listes, tableau, rappels | ✓ | ✓ | ✓ |
| Calendrier | Mois | Mois, semaine, jour, glisser-déposer | Mois, semaine, jour, glisser-déposer |
| Projets reliés aux tâches | 1 | Illimités | Illimités |
| Notes en pages | 5 pages | Illimitées | Illimitées |
| Éditeur complet (30 polices, couleurs, surligneur, encadrés, dessin) | Gras, italique, souligné | ✓ | ✓ |
| Tableau blanc (écriture → texte, formes, flèches, impression) | — | Illimités | Illimités + export PNG |
| Connecteurs | Liens | Imports et aperçus | Imports et aperçus |
| Notifications, recherche | ✓ | ✓ | ✓ |
| Quiz intégrés, quiz du jour, révision des notes, examens | ✓ | ✓ | ✓ |
| Vos propres quiz, emploi du temps, moyennes | — | ✓ | ✓ |
| Planificateur de révisions, révision espacée, concentration et statistiques | — | ✓ | ✓ |
| Scripts d'appel à froid (23 secteurs) | ✓ | ✓ | ✓ |
| CRM personnalisé, devis suivis, prospect → client | — | — | ✓ |
| Tous les scripts, mode appel, messages, audit, import | — | — | ✓ |
| Statistiques commerciales, export CSV, scripts personnels, entraînement | — | — | ✓ |
| Académie (guides pour entreprendre) | 5 guides | 5 guides | 17 guides |

Essai de 7 jours sans carte, avec tout Premium. Mensuel, sans engagement. Changement de formule : vers le haut tout de suite (au prorata), vers le bas à la fin de la période payée. Paiement refusé : 7 jours de délai de grâce. La répartition se règle dans `FEATURES` et `LIMITS` (`assets/js/store.js`).

**Paiement : mode test.** Tout le parcours fonctionne, sans carte et sans prélèvement. Pour encaisser réellement, il faut un compte Stripe et un petit serveur : voir [PAIEMENTS.md](PAIEMENTS.md).

## Technique

HTML/CSS/JS sans dépendance ni compilation (modules ES). Données dans le navigateur (localStorage, clé `msdev:v1`, schéma v3 avec migration automatique depuis la v1 et la v2 : les anciens projets « à étapes » deviennent des projets dont chaque étape est une tâche). Hors ligne grâce au service worker (changer `VERSION` dans `sw.js` à chaque mise en ligne).

```
assets/js/app.js          routeur, navigation par modules, recherche, brouillons, retour dans l'app
assets/js/store.js        données, migration, modules, abonnement (états, prorata, renouvellement)
assets/js/payments.js     prestataire de paiement (mode test tant que config.js est vide ; aucune clé secrète)
assets/js/billing-check.js vérification automatique des 12 situations de paiement (mode test)
assets/js/config.js       adresse Supabase + clé publique anon (vides = mode test)
assets/js/cloud.js        compte en ligne, abonnement Stripe, mesures
assets/js/views/account.js connexion par e-mail et code, carte Compte en ligne
server/supabase/          base (migrations SQL, RLS, vues des chiffres) et fonctions Stripe
assets/js/views/tasks.js  tâches et saisie rapide
assets/js/views/notes.js  pages et éditeur de blocs
assets/js/views/quiz.js   quiz, cartes de révision, création
assets/js/views/billing.js abonnement, paiement, reçus
assets/js/views/search.js recherche globale (avec filtres) et feuille « Créer »
assets/js/views/projects.js projets et progression
assets/js/views/quotes.js devis (brouillon → envoyé → accepté / refusé)
assets/js/views/notifications.js centre de notifications
assets/js/views/connect.js connecteurs : liens, aperçus, Notion (.zip), agendas (.ics), CSV, Trello, Quizlet, Anki
assets/js/views/studies.js études : matières, emploi du temps, examens, moyennes, révision espacée, concentration
assets/js/views/agenda.js calendrier (mois, semaine, jour, liste, glisser-déposer)
assets/js/views/boards.js tableaux blancs et modèles
assets/js/draw.js         moteur de dessin partagé (tableau blanc et dessin sur les pages)
assets/js/hwr.js          lecture de l'écriture à la main, sur l'appareil (hwr-worker.js : dans un fil séparé)
assets/js/data/hwr-*.js   modèles de lettres et dictionnaire de la lecture de l'écriture
assets/js/rich.js         texte mis en forme des notes : nettoyage du HTML par liste blanche
assets/js/views/privacy.js confidentialité et RGPD
assets/js/data/           secteurs, scripts, quiz, modèles de pages, modèles de CRM, guides
```

Voir aussi [SECURITE.md](SECURITE.md) et [TEST-UTILISATEURS.md](TEST-UTILISATEURS.md).

## Crédits

- Polices : Fraunces, Instrument Sans, Caveat, Playwrite France Moderne (TypeTogether), Playpen Sans (TypeTogether), toutes sous SIL Open Font License, servies depuis l'application.
- Lecture de l'écriture : modèles de lettres tirés des polices à un trait Hershey (domaine public) et EMS (SIL Open Font License, Evil Mad Scientist). Dictionnaire : fréquences Hermit Dave, FrequencyWords (OpenSubtitles 2018), licence CC BY-SA 4.0, complétées d'un vocabulaire scolaire ; le fichier `assets/js/data/hwr-lexique.js` est distribué sous la même licence.
- Lecture de l'écriture (1.8) : modèle TrOCR small handwritten (Microsoft, licence MIT ; conversion ONNX de Xenova), exécuté avec Transformers.js 3.8.1 (Hugging Face, licence Apache 2.0) et ONNX Runtime Web (Microsoft, licence MIT), servis depuis l'application (`assets/models/`, `assets/js/vendor/`).
- 24 polices supplémentaires de Google Fonts (Indie Flower, Patrick Hand, Kalam, Lora, Lexend, Atkinson Hyperlegible…), SIL Open Font License, servies depuis l'application.
