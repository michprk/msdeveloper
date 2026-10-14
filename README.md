# M&S Developer

**L'app de prospection des créateurs de sites web.** Le bon script pour chaque commerçant, vos prospects et vos relances au même endroit : vous décrochez des rendez-vous chaque semaine.

- **En ligne :** https://michprk.github.io/msdeveloper/ (non indexée)
- **Conçue par** M&S Design, Bruxelles.

## Positionnement

**Pour qui (version 1).** Les créateurs de sites indépendants et les petites agences (1 à 5 personnes) qui prospectent les commerces et indépendants de leur ville, surtout par téléphone et en visite. L'automatisation et le référencement restent proposés, comme services complémentaires qu'ils vendent.

**Pourquoi une seule app plutôt que plusieurs outils.** Avec des scripts dans un document, un CRM d'un côté et un agenda de l'autre, il faut tout recopier après chaque appel. Ici, le script s'affiche rempli avec la fiche du prospect, et le résultat de l'appel met à jour la fiche et crée la relance en un seul geste.

**Trois bénéfices**
1. **Savoir quoi dire à chaque commerçant** : un script prêt pour 23 métiers, rempli avec le nom du prospect.
2. **Ne plus perdre un seul prospect** : le résultat de l'appel s'enregistre en un geste, la relance se crée toute seule.
3. **Voir ce qui marche** : appels, rendez-vous et signatures de la semaine, face à vos objectifs.

Ce qui n'est pas dans la version 1 : comptes en ligne, synchronisation entre appareils, paiement. C'est indiqué dans l'application.

## Navigation

| Téléphone (barre du bas) | Ordinateur (barre latérale) |
|---|---|
| Aujourd'hui · Prospects · **Appeler** · Scripts · Plus | Bouton « Lancer une session d'appels », puis Prospecter (Aujourd'hui, Prospects, Scripts, Agenda), Après la signature (Clients signés, Devis), Progresser (Académie, Statistiques, Tous les outils), Compte en bas |

## Ce qui fonctionne (testé le 14/10/2026)

| Module | Parcours vérifié |
|---|---|
| Aujourd'hui | Objectif du jour, prochain appel, tâches du jour, semaine (appels, rendez-vous, signé), activité — uniquement les données de l'utilisateur. Liste « Pour bien démarrer » et états vides explicatifs pour un nouveau compte. |
| Prospects (CRM) | Créer (validation avec messages clairs), modifier, chercher, filtrer, déplacer dans le pipeline, supprimer (avec confirmation). |
| CRM personnalisé | Renommer les étapes, ajouter ses étapes (ex. Maquette prête, En production, En ligne), champs personnalisés (texte, nombre, date, lien, liste), équipe et responsable par fiche, étiquettes, import de ses propres données par fichier. |
| Scripts | 704 scripts : 23 secteurs × 3 services × 10 formats + 14 situations délicates. Onglets Script, Préparer, Secteur, Objections. |
| Mode appel | Le script étape par étape, objections, résultat en un geste, rappel ou rendez-vous daté. |
| Académie | 14 guides, parcours selon le niveau, progression enregistrée (lu / non lu, reprendre là où on s'est arrêté). |
| Abonnement | Statut réel (essai, date de fin, version gratuite), accès ouverts et verrouillés, formules. Paiement en ligne : pas encore ouvert, dit clairement. |
| Compte | Profil, offre, objectifs, affichage (thème, taille du texte, animations), notifications, code de verrouillage, présentation (accueil rejoué, données de démonstration), sauvegarde, import, restauration, export CSV, suppression de toutes les données. |

Hors ligne, installable sur iPhone (Safari → Partager → Sur l'écran d'accueil), Android, Mac et PC. Mise à jour automatique à l'ouverture.

## Formules

| Formule | Prix | Contenu |
|---|---|---|
| Gratuit | 0 € | Scripts d'appel à froid (tous secteurs) |
| Pro | 17,99 €/mois | Prospects et CRM personnalisé, tous les scripts, mode appel, agenda, clients signés, Académie, audit, messages, import |
| Premium | 31,99 €/mois | Pro + devis PDF, scripts et secteurs personnels, entraînement, statistiques, export CSV |

Essai gratuit de 7 jours avec toutes les fonctions. La répartition se règle dans `FEATURES` (`assets/js/store.js`).

## Technique

HTML/CSS/JS sans dépendance ni compilation (modules ES). Polices auto-hébergées (licences OFL dans `licenses/`). Routage par ancre (`#/crm`, `#/script/site.appel.fleuriste`…).

```
index.html            coquille + écran d'ouverture
sw.js                 hors ligne — changer VERSION à chaque mise en ligne
assets/js/app.js      routeur, navigation, événements, validation
assets/js/store.js    données, étapes personnalisées, import par fusion, abonnement
assets/js/lock.js     code de verrouillage
assets/js/notify.js   rappels
assets/js/data/       secteurs, fiches secteur, moteur de scripts, situations, guides, démonstration
assets/js/views/      écrans
```

Système d'interface : rayons `--r-xs` 8, `--r-sm` 12, `--r-md` 16, `--r` 20, `--r-lg` 24 ; titres de page 31/38 px, titres de carte 16 px ; formulaires validés au fil de la saisie (`data-validate`, `data-needs`) ; indicateur de chargement (`busy()`) pour les opérations lentes.

Sécurité et préparation des comptes en ligne : voir [SECURITE.md](SECURITE.md).
