# Paiements — passer du mode test à Stripe

> **Depuis la 1.15, le guide à suivre est [BRANCHER.md](BRANCHER.md)** : comptes, stockage, Stripe et Notion en une seule fois. Ce qui a changé par rapport à la suite de ce document :
> - connexion par e-mail et **mot de passe** (ou Google), plus le code à 6 chiffres ;
> - essai de 7 jours **sans carte**, démarré par le serveur (pas de page Stripe), qui s'arrête tout seul sans moyen de paiement ;
> - quatre prix (mensuel et annuel) ;
> - un événement de plus au webhook (`customer.updated`) ;
> - le portail client doit permettre d'ajouter un moyen de paiement.

## Où on en est (version 1.5, 15 octobre 2026)

**Tout le code est prêt et éteint.** Tant que `assets/js/config.js` est vide, MindView reste en mode test : le parcours d'abonnement fonctionne sur l'appareil, sans carte et sans argent. Abonnement → « Vérifier les paiements » rejoue automatiquement 12 situations (essai, souscription, renouvellements, prorata, résiliation, reprise, refus, dates) et dit si tout est conforme.

Dès que `config.js` pointe vers le projet Supabase, l'application passe toute seule en paiement réel :

| Ce qui change | Comment |
|---|---|
| Choisir une formule | Compte en ligne (e-mail + code à 6 chiffres), puis page de paiement sécurisée Stripe Checkout |
| Changer de formule, de carte, factures, résilier | Espace de gestion Stripe (« Gérer mon abonnement ») |
| Statut de l'abonnement | Lu dans la base, écrite **uniquement** par le serveur à partir des événements Stripe signés |
| Essai de 7 jours | Inchangé : sans carte, géré par l'application |
| Supprimer mon compte | Abonnement arrêté chez Stripe, compte effacé sur le serveur, puis données de l'appareil |

Ce qui est prêt dans le dépôt :

```
assets/js/config.js                      adresse du projet + clé publique (vides pour l'instant)
assets/js/cloud.js                       connexion, lecture de l'abonnement, paiement, mesures
assets/js/views/account.js               feuille « Créer mon compte » et carte Compte en ligne
server/supabase/migrations/…_mindview.sql  tables, règles d'accès (RLS), vues des chiffres
server/supabase/functions/
  create-checkout-session/               démarre un paiement
  create-portal-session/                 ouvre l'espace de gestion Stripe
  stripe-webhook/                        seul endroit qui écrit un abonnement (signature vérifiée)
  delete-account/                        suppression du compte (RGPD, App Store)
```

## Les étapes (environ une heure, tout en mode test)

Les étapes marquées **toi** demandent ton identité ou tes clés : c'est toi qui les fais. **Ne colle jamais une clé secrète (`sk_…`, `whsec_…`, `service_role`) dans une conversation, un e-mail ou le dépôt.**

1. **Stripe (toi).** Créer un compte sur stripe.com. Rester en **mode test** (interrupteur en haut à droite). Le mode test ne demande ni numéro d'entreprise ni compte bancaire.
2. **Les produits (toi).** Catalogue de produits → « MindView Pro », avec deux prix récurrents : 4,99 € par mois et 39 € par an ; « MindView Premium Entrepreneur », 9,99 € par mois et 79 € par an. Noter les quatre identifiants `price_…`. (Les montants affichés dans l'application viennent de `assets/js/plans.js` : les garder identiques à Stripe.)
3. **L'espace de gestion (toi).** Paramètres → Billing → Portail client : autoriser le changement de formule entre Pro et Premium (au prorata), la résiliation **à la fin de la période**, le changement de moyen de paiement et l'historique des factures.
4. **Relances de paiement (toi).** Paramètres → Billing → Abonnements et e-mails : relances automatiques, puis **annuler l'abonnement** si tout a échoué, sur environ 7 jours (ce qu'annonce l'application).
5. **Supabase (toi).** Créer un projet sur supabase.com, **région Europe** (Francfort ou Paris). Authentication → Providers → Email : activé. Authentication → Email Templates → « Magic Link » : remplacer le lien par le code, par exemple `Votre code MindView : {{ .Token }}`. Authentication → URL Configuration → Site URL : `https://michprk.github.io/msdeveloper/`.
6. **La base (toi, une commande).** Installer la Supabase CLI, puis dans le dossier `server/` :
   ```bash
   supabase init
   supabase link --project-ref <identifiant-du-projet>
   supabase db push
   ```
   (Ou copier le fichier `server/supabase/migrations/20261015000000_mindview.sql` dans SQL Editor → Run.)
7. **Les secrets du serveur (toi, dans ton terminal).**
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_test_... STRIPE_PRICE_PRO=price_... STRIPE_PRICE_PRO_YEAR=price_... STRIPE_PRICE_PREMIUM=price_... STRIPE_PRICE_PREMIUM_YEAR=price_... APP_URL=https://michprk.github.io/msdeveloper/
   ```
8. **Les fonctions.**
   ```bash
   supabase functions deploy create-checkout-session
   supabase functions deploy create-portal-session
   supabase functions deploy delete-account
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```
9. **Le webhook (toi).** Stripe → Développeurs → Webhooks → Ajouter un endpoint : `https://<projet>.supabase.co/functions/v1/stripe-webhook`, événements `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. Copier le secret de signature, puis :
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```
10. **Brancher l'application.** Dans `assets/js/config.js`, mettre l'adresse du projet et la clé **anon public** (Supabase → Project Settings → API). Ces deux valeurs sont publiques par conception ; tu peux me les donner ou les coller toi-même. Mettre à jour la version dans `sw.js`, publier.
11. **Vérifier** avec la liste [TEST-PAIEMENTS.md](TEST-PAIEMENTS.md), en mode test Stripe, avant tout vrai paiement.
12. **Passer en réel (toi), plus tard.** Il faut alors un numéro d'entreprise (BCE), un compte bancaire professionnel et le statut TVA décidé. Activer le compte Stripe, recréer les deux prix en mode réel, remplacer `STRIPE_SECRET_KEY`, `STRIPE_PRICE_*` et `STRIPE_WEBHOOK_SECRET` par les valeurs réelles, refaire l'étape 9 en mode réel.

## Correspondance des états

| Stripe | Base (`subscriptions.status`) | Application |
|---|---|---|
| `active` | `active` | Actif |
| `active` + `cancel_at_period_end` | `active` | Résilié, accès jusqu'à la fin du mois |
| `past_due` (Stripe relance) | `past_due` | Paiement refusé, accès gardé pendant les relances |
| `canceled` / `unpaid` | `canceled` / `unpaid`, plan `free` | Version gratuite, données conservées |

## Décisions à prendre avant le réel

- **TVA.** Prix affichés TTC ? Franchise des petites entreprises (pas de TVA) ou 21 % ? Si TVA : activer Stripe Tax et la ligne `automatic_tax` dans `create-checkout-session`.
- **Moyens de paiement.** Carte par défaut ; Bancontact et SEPA s'activent dans Stripe (Paramètres → Moyens de paiement), sans changer le code.
- **Mentions légales et conditions de vente** (prix, résiliation, droit de rétractation) : à rédiger et relier depuis la page Abonnement.

## App Store

Si MindView est publiée sur l'App Store, les abonnements numériques vendus dans l'application doivent suivre les règles d'Apple (achat intégré, ou lien externe là où Apple l'autorise). À vérifier au moment de la soumission.
