# M&S Developer

Application de prospection pour les indépendants et les agences qui vendent de la **création de site web**, de l'**automatisation** et du **référencement** : scripts, CRM, mode appel, agenda, outils et méthode. Conçue par M&S Design (Bruxelles).

- **En ligne :** https://michprk.github.io/msdeveloper/ (non indexée)
- **S'installe comme une application** sur iPhone (Safari → Partager → Sur l'écran d'accueil), Android (Installer l'application), Mac (Safari → Fichier → Ajouter au Dock, ou Chrome) et PC (Chrome / Edge → Installer).
- **Fonctionne hors ligne** (service worker) ; les données restent sur l'appareil (localStorage), avec sauvegarde / restauration en fichier.
- **Accueil façon Apple** à la première ouverture (fonctions, notifications, profil, secteurs, essai). Rejouable pour une présentation : Réglages → Présentation, ou le lien `?accueil`. Les clients ne le voient qu'une fois.
- **Rappels** : notification avant chaque tâche datée et résumé du matin (quand l'app est ouverte ; sur iPhone, une fois installée sur l'écran d'accueil).

## Contenu

| Rubrique | Ce qu'on y trouve |
|---|---|
| Scripts | 704 scripts : 23 secteurs × 3 services × 10 formats (appel à froid, répondeur, visite, e-mail, SMS, Instagram, relances, rendez-vous, objections, prix & signature) + 14 situations délicates (barrage, remise, impayé, client mécontent…). Chaque script a 4 onglets : le script (avec « pourquoi ça marche », variantes et erreurs à éviter), la préparation (checklist, déroulé minuté, questions SPIN, qualification), la fiche secteur (décideur, priorités, mots à employer, saisonnalité, offre conseillée) et 16 objections. |
| Mode appel | Le script étape par étape, les objections à portée de doigt, le résultat de l'appel enregistré en un geste (+ rappel ou rendez-vous daté). |
| CRM | Pipeline en 7 étapes (glisser-déposer à la souris, appui long sur mobile), liste filtrable, fiche client complète avec historique, notes, tâches. |
| Agenda & projets | Tâches, rappels, rendez-vous ; chaque client signé devient un projet avec délai et étapes. |
| Outils | Devis imprimable en PDF, messages prêts à envoyer, audit express sur 10, import de listes, entraînement aux objections, statistiques, scripts et secteurs personnalisés. |
| Académie | 14 guides pratiques (rendez-vous, voix, objections, prix, relances, horaires par secteur, cadre légal…). |

## Formules

| Formule | Prix | Contenu |
|---|---|---|
| Découverte | gratuit | Scripts d'appel à froid (tous secteurs), 3 guides |
| Pro | 17,99 €/mois | CRM, tous les scripts, mode appel, agenda, projets, audit, messages, import, Académie |
| Premium | 31,99 €/mois | Pro + devis PDF, scripts sur mesure et secteurs perso, entraînement, statistiques, export CSV |

Essai gratuit de 7 jours avec toutes les fonctions. **Le paiement n'est pas encore branché** : les boutons « Choisir » expliquent que le paiement ouvrira au lancement. Un « mode démonstration » (Réglages) permet d'afficher l'app en Pro ou Premium pour la présenter.

La répartition des fonctions par formule se règle à un seul endroit : `FEATURES` dans `assets/js/store.js`.

## Technique

HTML/CSS/JS sans dépendance ni étape de compilation (modules ES). Polices auto-hébergées (Fraunces, Instrument Sans — licences OFL dans `licenses/`). Routage par ancre (`#/crm`, `#/script/site.appel.fleuriste`…).

```
index.html            coquille + écran d'ouverture
manifest.webmanifest  installation (icônes, raccourcis)
sw.js                 hors ligne — changer VERSION à chaque mise en ligne
assets/js/app.js      routeur, navigation, événements
assets/js/store.js    données, abonnement, statistiques
assets/js/data/       secteurs, moteur de scripts, guides, exemples
assets/js/views/      écrans
```

Ajouter un secteur : une entrée dans `assets/js/data/sectors.js` (les 30 scripts du secteur sont générés automatiquement). Développement local : `_msdeveloper-src/serve.ps1` (port 8107).

## Avant la commercialisation

- Brancher le paiement (Stripe, abonnements mensuels) et un compte utilisateur avec synchronisation entre appareils.
- Mentions légales, CGV de l'abonnement et politique de confidentialité de l'éditeur (société à constituer).
- Pour l'App Store / Google Play : empaqueter l'application (Capacitor). Apple et Google ont leurs propres règles et commissions pour les abonnements vendus dans une application : à vérifier au moment de la publication.
