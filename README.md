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
| M'organiser | Tâches (saisie en langage courant, listes, priorités, sous-tâches, tableau, agenda), Notes (pages, sous-pages, blocs, modèles, favoris) |
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

| | Gratuit | Pro 11,99 €/mois | Premium 21,99 €/mois |
|---|---|---|---|
| Tâches, listes, tableau, agenda | ✓ | ✓ | ✓ |
| Projets reliés aux tâches | 3 en cours | Illimités | Illimités |
| Notifications, recherche, connecteurs | ✓ | ✓ | ✓ |
| Notes en pages | 10 pages | Illimitées | Illimitées |
| Quiz intégrés, révision des notes | ✓ | ✓ | ✓ |
| Vos propres quiz | — | ✓ | ✓ |
| CRM personnalisé | — | ✓ | ✓ |
| Devis suivis, PDF, prospect → client | — | ✓ | ✓ |
| Scripts d'appel à froid | ✓ | ✓ | ✓ |
| Tous les scripts, mode appel | — | ✓ | ✓ |
| Académie | 5 guides | 17 guides | 17 guides |
| Statistiques, export CSV, scripts personnels | — | — | ✓ |

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
assets/js/views/connect.js connecteurs, liens, import Notion, export .ics
assets/js/views/privacy.js confidentialité et RGPD
assets/js/data/           secteurs, scripts, quiz, modèles de pages, modèles de CRM, guides
```

Voir aussi [SECURITE.md](SECURITE.md) et [TEST-UTILISATEURS.md](TEST-UTILISATEURS.md).
