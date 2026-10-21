# Vérifier que tous les paiements sont bons

Deux niveaux : la vérification automatique (mode test, disponible maintenant) et la liste à suivre avec Stripe en mode test, avant tout vrai paiement.

## 1. Mode test (maintenant)

Abonnement → **Vérifier les paiements** → « Lancer la vérification ». En une seconde, 12 situations sont rejouées et comparées au résultat attendu ; l'abonnement est remis exactement comme avant.

| Situation | Ce qui est vérifié |
|---|---|
| Essai de 7 jours | Toutes les fonctions, rien de prélevé, retour au gratuit à la fin |
| Souscription Pro | Actif, 4,99 €, échéance un mois plus tard, reçu |
| Abonnement annuel | 39 € pour l'année, renouvelé un an plus tard |
| Passage du mensuel à l'annuel | À la fin du mois payé, puis 39 € pour un an |
| Essai sans carte | Pro pendant 7 jours, puis version gratuite, aucun prélèvement |
| Renouvellements | 4 × 4,99 € en 4 mois, total exact |
| Passage à Premium en cours de mois | Accès immédiat, seulement la différence au prorata, 9,99 € le mois suivant |
| Passage à Pro en fin de période | Premium gardé jusqu'à l'échéance, aucun paiement en plus, puis 4,99 € |
| Changement prévu annulé | Plus de changement, Premium renouvelé |
| Résiliation | Accès gardé jusqu'à la fin du mois, puis gratuit, aucun prélèvement |
| Reprise | Renouvelé normalement |
| Paiement refusé puis réglé | Délai de 7 jours, rien d'encaissé pendant le refus, actif après règlement |
| Paiement refusé jamais réglé | Fin d'accès, aucun paiement fantôme |
| Fonctions selon la formule | Gratuit / Pro / Premium ouvrent les bonnes fonctions |
| Dates d'échéance | 31 janvier → 28 février, années bissextiles, changement d'heure |

Résultat au 15/10/2026 : **12 / 12 conformes, 38 vérifications.**

## 2. Stripe en mode test (après PAIEMENTS.md, étapes 1 à 10)

Cartes de test officielles de Stripe (n'importe quelle date future, n'importe quel code) :

| Carte | Effet |
|---|---|
| `4242 4242 4242 4242` | Paiement accepté |
| `4000 0025 0000 3155` | Validation bancaire (3D Secure) demandée |
| `4000 0000 0000 0341` | S'enregistre comme carte, mais **tout prélèvement échoue** : à mettre comme nouvelle carte dans « Gérer » après un abonnement payé avec 4242, pour tester un renouvellement refusé |
| `4000 0000 0000 9995` | Refus immédiat (fonds insuffisants) |

Pour voir des renouvellements sans attendre un mois, deux possibilités en mode test :
- **La plus simple** : créer deux prix de test « tous les jours » (Pro 11,99 €/jour, Premium 21,99 €/jour) et les mettre dans `STRIPE_PRICE_PRO` / `STRIPE_PRICE_PREMIUM` le temps des tests. Les renouvellements arrivent chaque jour. Remettre les prix mensuels ensuite.
- **Horloges de test** Stripe : créer un client sur une horloge de test (Billing → Horloges de test), copier son identifiant `cus_…` dans `profiles.stripe_customer_id` du compte de test (Table Editor), puis payer depuis l'application et « Avancer le temps » d'un mois.

Pour chaque ligne, regarder **trois endroits** : le tableau de bord Stripe, la table `subscriptions` (Supabase → Table Editor) et l'écran Abonnement de l'application (« Mettre à jour mon abonnement » dans Compte si besoin).

| # | Action | Stripe | Base | Application |
|---|---|---|---|---|
| 1 | Créer un compte (e-mail + code) | — | une ligne dans `profiles` | « Connecté » dans Compte |
| 2 | Choisir Pro, carte 4242 | abonnement `active`, facture 11,99 € payée | `plan = pro`, `status = active`, `first_paid_at` rempli | « Paiement confirmé », CRM ouvert |
| 3 | Revenir sans payer (bouton retour de Stripe) | rien | rien | « Paiement annulé, rien n'a été prélevé » |
| 4 | Gérer → passer à Premium | facture au prorata | `plan = premium` | Premium ouvert tout de suite |
| 5 | Gérer → repasser à Pro | changement prévu à l'échéance | `plan = premium` jusqu'à l'échéance | Premium jusqu'à la date |
| 6 | Attendre le renouvellement (prix journalier ou horloge) | facture 11,99 € payée | `plan = pro`, nouvelle échéance | Pro, nouvelle date |
| 7 | Gérer → résilier | `cancel_at_period_end = true` | idem | « Résilié, accès jusqu'au … » |
| 8 | Gérer → reprendre | `cancel_at_period_end = false` | idem | « Actif » |
| 9 | Gérer → remplacer la carte par 0341, attendre le renouvellement | `past_due`, relances | `status = past_due` | « Paiement refusé », accès gardé |
| 10 | Laisser passer les relances | `canceled` | `plan = free`, `status = canceled` | Version gratuite, données intactes |
| 11 | Nouveau compte, carte 3155 | validation demandée puis payé | `active` | Pro ouvert |
| 11b | Nouveau compte, carte 9995 | paiement refusé sur la page Stripe | rien | rien n'est ouvert, on peut réessayer |
| 12 | Supprimer mon compte | abonnement `canceled` immédiatement | lignes supprimées | retour à l'accueil |

### Sécurité (à faire une fois, avec deux comptes A et B)

- [ ] B ne voit jamais l'abonnement de A (Table Editor : la règle de lecture `auth.uid() = user_id`).
- [ ] Depuis la console du navigateur de B, tenter `PATCH /rest/v1/subscriptions` pour se mettre en Premium : **refusé** (aucune règle d'écriture).
- [ ] Appeler `create-checkout-session` sans être connecté : **401**.
- [ ] Envoyer un faux événement au webhook (sans signature Stripe) : **400**, rien n'est écrit.
- [ ] Rejouer un vrai événement depuis Stripe (Webhooks → Renvoyer) : même résultat, pas de doublon.
- [ ] Aucune vraie clé dans le dépôt : `git grep -nE "sk_(test|live)_[A-Za-z0-9]{12,}|whsec_[A-Za-z0-9]{12,}|eyJhbGciOi"` ne renvoie que la clé anon publique de `config.js` (aucune clé `service_role`).

### Contrôle mensuel (en réel)

Le premier du mois : le total des **virements Stripe** (Stripe → Soldes) correspond au nombre d'abonnés actifs × prix (vue `abonnes_actifs` dans Supabase), aux remboursements et frais Stripe près. Tout écart → regarder Stripe → Webhooks → événements en échec.
