# Paiements — passer du mode test au vrai paiement

## Aujourd'hui (version 1.3)

L'abonnement fonctionne de bout en bout **en mode test** (`assets/js/payments.js`, `mode: 'test'`) :
essai de 7 jours, souscription, passage à une formule supérieure au prorata, passage à une formule
inférieure en fin de période, résiliation et reprise, renouvellement mensuel, paiement refusé avec
7 jours de délai de grâce, fin d'accès, historique et reçus. Les écrans « Tester les paiements »
(page Abonnement) permettent de provoquer chaque situation.

Aucune carte n'est demandée et aucun argent ne bouge. **Ce n'est pas un encaissement réel** : sans
serveur, le statut d'abonnement est enregistré sur l'appareil et pourrait être modifié par
l'utilisateur. C'est acceptable pour une démonstration, pas pour vendre.

## Ce qu'il faut pour encaisser

1. **Un compte Stripe** au nom de l'entreprise (à créer par vous : identité, numéro d'entreprise, compte bancaire). Commencez en mode test de Stripe.
2. **Les produits** dans Stripe : « M&S Developer Pro » à 17,99 €/mois et « Premium » à 31,99 €/mois, prix récurrents mensuels. Décidez si ces prix sont TVA comprise et réglez la TVA en conséquence.
3. **Des comptes utilisateurs et une base de données** (par exemple Supabase), avec une table `subscriptions` : `user_id`, `plan`, `status`, `current_period_end`, `cancel_at_period_end`, `stripe_customer_id`. Règle de lecture : chacun ne lit que sa ligne. Aucune écriture depuis l'application : seul le serveur écrit.
4. **Trois fonctions serveur** (la clé secrète Stripe n'existe que là) :
   - `create-checkout-session` : crée une session Stripe Checkout en mode abonnement pour l'utilisateur connecté et renvoie l'adresse de paiement ;
   - `create-portal-session` : ouvre le portail client Stripe (changer de formule, résilier, changer de carte, télécharger les factures) ;
   - `stripe-webhook` : vérifie la signature de chaque événement puis met à jour `subscriptions` (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`).
5. **Dans l'application** : `payments.js` passe en `mode: 'stripe'` ; « Choisir Pro » appelle la fonction et redirige vers Stripe ; le statut affiché et les accès viennent de la table `subscriptions`, plus de `localStorage`.

## Correspondance des états

| Application | Stripe |
|---|---|
| Essai | géré par l'application (sans carte), ou `trialing` si l'essai passe par Stripe |
| Actif | `active` |
| Résilié, accès jusqu'à la fin du mois | `active` avec `cancel_at_period_end = true` |
| Paiement refusé, délai de grâce | `past_due` (Stripe relance automatiquement le paiement) |
| Version gratuite après la fin | `canceled` ou `unpaid` |

Dans les réglages Stripe, choisir « annuler l'abonnement » quand toutes les nouvelles tentatives ont échoué, sur une durée proche des 7 jours annoncés dans l'application.

## Sécurité

- `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` uniquement dans les variables d'environnement du serveur. Jamais dans le dépôt, jamais dans une conversation.
- Les fonctions payantes sont refusées par le serveur pour un compte sans abonnement, pas seulement masquées.
- Tester avec deux comptes : le compte B ne doit jamais voir ni modifier l'abonnement du compte A.

## App Store

Si l'application est publiée sur l'App Store, les abonnements numériques vendus dans l'application doivent suivre les règles d'Apple (achat intégré, ou lien externe là où Apple l'autorise). À vérifier au moment de la soumission.
