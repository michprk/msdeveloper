# Brancher MindView sur les vrais services

Ce guide branche les **comptes** (e-mail et mot de passe, Google), le **stockage synchronisé** entre appareils, le **paiement** (Stripe) et la **connexion directe à Notion**.

Tout le code est prêt :
- dans l'application : `assets/js/cloud.js`, `sync.js`, `auth.js` ;
- sur le serveur : `server/supabase/`.

Il reste à créer les comptes et à recopier quelques réglages. Compte environ une heure. Prévois un parent pour l'étape Stripe.

> **Règle d'or.** Les clés **secrètes** (`sk_…`, `whsec_…`, `service_role`, secret Google, secret Notion, mot de passe SMTP) ne vont **jamais** :
> - dans le dépôt GitHub ;
> - dans `config.js` ;
> - dans une conversation (ni avec Claude, ni avec personne).
>
> Tu les tapes toi-même, seulement dans le tableau de bord concerné ou dans ton terminal. Dans `config.js`, il n'y a que des valeurs publiques.

## 0. Essayer d'abord, sans rien créer

Ouvre l'application avec `?cloud=mock` à la fin de l'adresse, par exemple https://michprk.github.io/msdeveloper/?cloud=mock.

Un **serveur factice**, qui tourne dans ton navigateur, imite Supabase et Stripe. Une pastille « Serveur factice » le rappelle en haut de l'écran. Tu peux tout essayer :
- créer un compte ;
- se déconnecter, puis se reconnecter : les données reviennent ;
- « Continuer avec Google » ;
- le lien « mot de passe oublié » : les e-mails arrivent en notification ;
- l'essai Pro sans carte ;
- un abonnement annuel ;
- la suppression du compte.

Pour revenir au mode normal, ouvre `?cloud=off`.

## 1. Supabase : comptes et stockage

1. Crée un compte sur https://supabase.com, puis un **nouveau projet** :
   - offre gratuite ;
   - région **Central EU (Frankfurt)** ;
   - un mot de passe de base de données solide, gardé dans ton gestionnaire de mots de passe.
2. **Project Settings → API**. Recopie dans `assets/js/config.js` :
   - `CLOUD.url` : la *Project URL* ;
   - `CLOUD.anonKey` : la clé *anon public*. Elle est publique : elle ne donne accès qu'à ce que les règles de la base autorisent.

   Puis mets `AUTH_MODE = 'online'`.
3. **SQL Editor**. Colle et lance (*Run*), dans cet ordre :
   1. `server/supabase/migrations/20261015000000_mindview.sql` ;
   2. `server/supabase/migrations/20261021000000_sync_notion.sql`.

   Cela crée les tables et leurs règles :
   - chacun ne lit et n'écrit que ses données ;
   - personne ne peut s'offrir un abonnement depuis l'application ;
   - les jetons Notion ne sont lisibles que par le serveur.
4. **Authentication → URL Configuration** :
   - *Site URL* : `https://michprk.github.io/msdeveloper/` ;
   - *Redirect URLs* : la même adresse, plus `http://localhost:8107/msdeveloper/` (pour tester sur ton PC).
5. **Authentication → Sign In / Providers → Email** :
   - *Confirm email* : **activé** ;
   - longueur minimale du mot de passe : **8**.
6. **E-mails (obligatoire pour de vrais élèves).** Le service d'e-mail intégré de Supabase n'écrit qu'aux membres de ton équipe Supabase, au maximum 2 par heure. Il faut donc un service d'e-mail :
   - **Brevo** est gratuit jusqu'à 300 e-mails par jour (avec un parent si le service demande 18 ans) ;
   - vérifie l'adresse d'expédition ;
   - dans **Authentication → Emails → SMTP Settings** :
     - hôte : `smtp-relay.brevo.com` ;
     - port : `587` ;
     - identifiant et clé SMTP : ceux de Brevo, tapés seulement là.
   - Un nom de domaine (par exemple `mindview.be`) améliorera la délivrabilité plus tard.
7. **Authentication → Emails → Templates** : les deux modèles en français.
   - **Confirm signup** :
     - objet : `Confirme ton adresse pour MindView` ;
     - corps : `<h2>Bienvenue sur MindView</h2><p>Clique sur le lien pour confirmer ton adresse. Tes notes et tes tâches seront alors enregistrées dans ton compte.</p><p><a href="{{ .ConfirmationURL }}">Confirmer mon adresse</a></p><p>Tu n'as pas créé de compte ? Ignore cet e-mail.</p>`
   - **Reset password** :
     - objet : `Ton nouveau mot de passe MindView` ;
     - corps : `<p>Clique sur le lien pour choisir un nouveau mot de passe. Il est valable une heure.</p><p><a href="{{ .ConfirmationURL }}">Choisir un nouveau mot de passe</a></p><p>Tu n'as rien demandé ? Ignore cet e-mail : ton mot de passe ne change pas.</p>`
8. **Google (facultatif, recommandé pour les élèves)** :
   1. https://console.cloud.google.com → **APIs & Services** → écran de consentement OAuth : type *External*, nom « MindView ».
   2. **Credentials → Create OAuth client ID** → *Web application*.
   3. *Authorized redirect URI* : `https://<ton-projet>.supabase.co/auth/v1/callback`.
   4. Dans Supabase, **Authentication → Providers → Google** : active-le, colle l'ID client et le secret client (tapés là, nulle part ailleurs).
   5. Dans `config.js` : `providers: ['google']`.

   Apple demande le programme développeur payant (99 $ par an) : plus tard.

## 2. Les fonctions serveur

Les fonctions sont dans `server/supabase/functions` :
- `create-checkout-session` : abonnement, et essai sans carte ;
- `create-portal-session` : espace de gestion Stripe ;
- `stripe-webhook` ;
- `delete-account` ;
- `notion`.

1. Installe l'outil Supabase (Windows, PowerShell) avec Scoop. Si Scoop n'est pas encore installé, voir https://scoop.sh.

   ```powershell
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```

2. Dans le dossier `msdeveloper/server` :

   ```powershell
   supabase login
   supabase link --project-ref <ton-projet>
   supabase functions deploy create-checkout-session --use-api
   supabase functions deploy create-portal-session --use-api
   supabase functions deploy delete-account --use-api
   supabase functions deploy notion --use-api
   supabase functions deploy stripe-webhook --no-verify-jwt --use-api
   supabase secrets set APP_URL=https://michprk.github.io/msdeveloper/
   ```

   `--use-api` déploie sans Docker. `stripe-webhook` est appelé par Stripe, pas par l'application : il vérifie lui-même la signature de chaque événement.

## 3. Stripe : le paiement (avec un parent)

> **Âge.** Stripe permet d'ouvrir un compte dès 13 ans. Mais un **parent (ou tuteur légal) doit en devenir propriétaire** avant d'encaisser et de recevoir l'argent sur un compte bancaire.
>
> Le statut pour vendre (et la TVA) est à voir avec tes parents, éventuellement avec un comptable, **avant** de passer en mode réel.

1. Sur https://dashboard.stripe.com, reste d'abord en **mode test**.
2. **Catalogue de produits** :
   - « MindView Pro » : 4,99 € par mois et 39 € par an ;
   - « MindView Premium Entrepreneur » : 9,99 € par mois et 79 € par an.

   Note les **quatre** identifiants `price_…`. Les montants affichés dans l'application viennent de `assets/js/plans.js` : garde-les identiques.
3. **Paramètres → Facturation → Portail client** : active
   - la mise à jour du moyen de paiement (indispensable pour garder Pro après l'essai sans carte) ;
   - la résiliation ;
   - le changement de formule (avec les quatre prix) ;
   - l'historique des factures.
4. **Développeurs → Webhooks → Ajouter un point de terminaison** :
   - adresse : `https://<ton-projet>.supabase.co/functions/v1/stripe-webhook` ;
   - événements :
     - `checkout.session.completed` ;
     - `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` ;
     - `invoice.paid`, `invoice.payment_failed` ;
     - `customer.updated`.

   Note le secret de signature `whsec_…`.
5. Dans ton terminal, les secrets (tapés par toi, jamais copiés ailleurs) :

   ```powershell
   supabase secrets set STRIPE_SECRET_KEY=sk_test_... STRIPE_WEBHOOK_SECRET=whsec_... STRIPE_PRICE_PRO=price_... STRIPE_PRICE_PRO_YEAR=price_... STRIPE_PRICE_PREMIUM=price_... STRIPE_PRICE_PREMIUM_YEAR=price_...
   ```

6. Teste avec la carte de test `4242 4242 4242 4242` (date future, n'importe quel code). Les situations à vérifier sont dans [TEST-PAIEMENTS.md](TEST-PAIEMENTS.md).
7. **Mode réel** (plus tard, avec le parent propriétaire du compte) : refais les étapes 2 à 5 en mode réel (`sk_live_…`, nouveaux prix, nouveau webhook).

**Comment fonctionne l'essai.** Il dure 7 jours, **sans carte**. Le serveur crée l'abonnement en essai directement chez Stripe. Sans moyen de paiement ajouté avant la fin, Stripe l'arrête tout seul : l'application revient au gratuit et rien n'est prélevé. Pour garder Pro, la personne ajoute un moyen de paiement depuis « Abonnement » (portail Stripe). Un seul essai par compte.

## 4. Notion (connexion directe)

1. Crée l'intégration publique ([NOTION.md](NOTION.md), §1). L'URL de redirection est l'adresse de l'application : `https://michprk.github.io/msdeveloper/`.
2. Les secrets :

   ```powershell
   supabase secrets set NOTION_CLIENT_ID=... NOTION_CLIENT_SECRET=... NOTION_REDIRECT_URI=https://michprk.github.io/msdeveloper/
   ```

3. Dans `config.js` : `NOTION.proxyUrl = 'https://<ton-projet>.supabase.co/functions/v1'`.

La connexion à Notion demande un compte MindView en ligne : le jeton Notion est rangé sous ce compte, sur le serveur.

## 5. Allumer et vérifier

Une fois `config.js` rempli (adresse, clé publique, `AUTH_MODE = 'online'`, fournisseurs, proxy Notion), envoie la modification sur GitHub. Ensuite, vérifie :

- [ ] Créer un compte → e-mail reçu → lien → « Adresse confirmée ».
- [ ] Se connecter sur un deuxième appareil (téléphone) → les notes et les tâches arrivent.
- [ ] Modifier une tâche sur le téléphone → elle change sur l'ordinateur (au retour dans l'application, ou dans la minute).
- [ ] « Mot de passe oublié » → e-mail → nouveau mot de passe.
- [ ] « Continuer avec Google ».
- [ ] Essai Pro sans carte → bandeau de fin d'essai → retour au gratuit (Stripe → horloge de test, ou attendre).
- [ ] Abonnement mensuel et annuel avec la carte de test ; portail ; résiliation.
- [ ] Notion : connexion, import, synchronisation.
- [ ] « Supprimer mon compte » → plus rien dans Supabase (tables `user_data`, `subscriptions`) ni dans Stripe (abonnement arrêté).

## Ce qui est public, ce qui est secret

| Valeur | Où | Public ? |
|---|---|---|
| Project URL Supabase, clé `anon` | `config.js` | Oui (protégé par les règles de la base) |
| Clé `service_role` | Nulle part : Supabase la donne aux fonctions | **Secret** |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | `supabase secrets set` | **Secret** |
| Identifiants `price_…` | `supabase secrets set` | Non sensibles |
| Secret Google | Tableau de bord Supabase | **Secret** |
| `NOTION_CLIENT_SECRET` | `supabase secrets set` | **Secret** |
| Identifiant et clé SMTP | Tableau de bord Supabase | **Secret** |
