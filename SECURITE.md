# Sécurité — MindView

## Où on en est (version 1.8, 16 octobre 2026)

L'application n'a **ni serveur, ni base de données, ni compte en ligne**. Tout est enregistré dans le navigateur de l'appareil (localStorage) : tâches, pages de notes, fiches, quiz, réglages. C'est volontaire pour la première version, et c'est dit clairement dans l'application (Compte, Abonnement, accueil).

**Paiements : mode test.** Aucune carte n'est demandée, aucune donnée bancaire n'est saisie, aucun prestataire n'est appelé et aucune clé n'est présente dans le code (`assets/js/payments.js`). Le statut d'abonnement est stocké sur l'appareil : il sert à démontrer et tester le parcours, il ne protège rien. Le passage au vrai paiement est décrit dans [PAIEMENTS.md](PAIEMENTS.md).

Ce qui est en place :

| Point | État |
|---|---|
| Données d'un utilisateur visibles par un autre | Impossible : rien ne quitte l'appareil. |
| Clés privées ou secrets dans le code | Aucun. Aucun service tiers appelé. |
| Injection de code (XSS) | Toutes les saisies sont échappées à l'affichage ; politique CSP stricte (`script-src 'self'`). Testé avec une fiche au nom piégé (`<img onerror>`, `<script>`) sur 7 écrans : rien ne s'exécute. Depuis la 1.6, le texte mis en forme des notes est enregistré en HTML **nettoyé par liste blanche** (`assets/js/rich.js` : gras, italique, souligné, barré, couleurs, surlignage, police, taille ; aucun attribut d'événement, aucun lien, aucune image), à l'enregistrement **et** à chaque affichage, donc aussi pour une sauvegarde importée. Testé avec `<script>` et `<img onerror>` collés dans une page : rien ne s'exécute. |
| Retour en arrière sans perte | Les pages s'enregistrent à chaque frappe ; les formulaires de nouvelle tâche et de nouvelle fiche gardent un brouillon si on ferme ou change d'écran. Suppression de tâche, de page ou de bloc : bouton « Annuler ». |
| Mise à jour du format | Les données de la version 1.2 sont migrées automatiquement (schéma v2), sans perte : testé avec un état v1 complet (fiches, étapes, champs, équipe, tâches). |
| Liens externes | Ouverts dans un nouvel onglet avec `rel="noopener"`. |
| Accès à l'appareil | Code de verrouillage facultatif (4 chiffres, haché en SHA-256 avec sel). Verrouillage automatique réglable : dès qu'on quitte l'app, après 1, 5 ou 15 minutes, ou seulement à l'ouverture. Il protège l'écran, il ne chiffre pas les données — c'est écrit dans l'application. |
| Session | Page Compte → Session : appareil, ouverture de la session, données locales, aucune session à distance. « Verrouiller maintenant » ferme la session quand un code est actif. |
| Suppression du compte | Compte → Suppression : récapitulatif de ce qui sera effacé, sauvegarde proposée, confirmation en tapant SUPPRIMER. |
| Sauvegarde et restauration | Testées : téléchargement d'un fichier, restauration (remplace tout, avec confirmation), import par fusion (ajoute sans effacer, doublons ignorés). Les dates mal formées dans un fichier sont corrigées à la lecture. |
| Actions destructrices | Confirmation systématique ; « Supprimer toutes mes données » demande de taper SUPPRIMER. |
| Données réelles de clients | Jamais dans le dépôt GitHub. Les vraies fiches M&S s'importent depuis un fichier privé, gardé hors du dépôt. |
| Liens Canva, Figma, Notion… (1.4) | Seules les adresses `http(s)` sont acceptées, à la saisie comme à la lecture d'une sauvegarde (un lien `javascript:` ou `data:` est retiré). Ouverts avec `rel="noopener noreferrer"`. |
| Aperçus intégrés (1.4) | Uniquement Figma et Canva, autorisés nommément dans la CSP (`frame-src`), chargés seulement après un geste de l'utilisateur, dans un `iframe` isolé (`sandbox`, `referrerpolicy="no-referrer"`). |
| Import Notion (1.4) | Les fichiers .md sont lus sur l'appareil et convertis en blocs de texte : aucun HTML n'est conservé. |
| Passage à Stripe (1.5, éteint) | Clés secrètes uniquement dans les variables d'environnement Supabase. L'application lit son abonnement (RLS : `auth.uid() = user_id`), seul le webhook l'écrit, après vérification de la signature Stripe ; aucune règle d'écriture pour les comptes. Fonctions protégées par le jeton de session, CORS limité à l'adresse de l'app. Suppression du compte : abonnement arrêté puis compte effacé côté serveur. Code client testé contre un serveur simulé ; code serveur à tester avec la liste de TEST-PAIEMENTS.md. |
| Mesures (1.5) | Deux événements sans contenu, seulement avec un compte, désactivables ; l'application ne peut que les ajouter, jamais les lire. |
| Tableau blanc et dessin sur les pages (1.6) | Tout est dessiné en SVG à partir de données vérifiées : couleurs (codes couleur uniquement), nombres, polices et formes sont contrôlés juste avant l'affichage, les textes sont échappés. Une sauvegarde modifiée à la main ne peut rien injecter. |
| Connecteurs (1.6) | Les fichiers (Notion .zip, .ics, .csv, Trello, Quizlet, Anki) sont lus sur l'appareil : rien n'est envoyé. Le .zip est décompressé par le navigateur, sans bibliothèque externe, avec des plafonds (200 Mo en entrée, 25 Mo décompressés par fichier, 40 archives imbriquées). Aperçus intégrés limités dans la CSP (`frame-src`) à Figma, Canva, Miro, Google Docs, YouTube (sans cookies) et Loom, chargés seulement au clic, dans un `iframe` isolé. |
| Se connecter / se déconnecter (1.6) | Utilise le compte en ligne de la 1.5 (code par e-mail ; la déconnexion supprime le jeton de session). Tant que les comptes sont éteints, aucun identifiant n'est demandé : le bouton propose le code de verrouillage local et la sauvegarde. |
| Lecture de l'écriture (1.7) | Entièrement sur l'appareil : moteur intégré (modèles de lettres et dictionnaire chargés depuis l'application) dans un fil séparé, ou l'API du navigateur quand elle existe (elle aussi locale). Aucun tracé ni aucun texte n'est envoyé. Les mots corrigés sont gardés dans les données locales (`hwrWords`, 600 au plus) pour mieux lire la fois suivante. |
| Lecture précise (1.8) | Le modèle (TrOCR, 64 Mo) et son moteur d'exécution (22 Mo) sont des fichiers de l'application, téléchargés depuis la même adresse sur demande de l'utilisateur, puis gardés sur l'appareil. L'écriture est transformée en image et lue dans un fil séparé, sur l'appareil : aucun tracé, aucune image et aucun texte ne sont envoyés. Pas de clé, pas de service tiers au moment de la lecture. |
| Tableau blanc (1.7) | Les textes mis en forme passent par le même nettoyage par liste blanche que les notes, à l'enregistrement et à l'affichage ; couleurs, nombres, polices et formes de chaque élément sont vérifiés avant d'être dessinés. L'impression et l'export intègrent les polices de l'application (fichiers locaux), sans appel extérieur. |
| Création du compte à l'accueil (1.7) | L'adresse e-mail est enregistrée dans le profil, sur l'appareil. Quand les comptes en ligne sont allumés, l'adresse reçoit un code à 6 chiffres (pas de mot de passe stocké) ; tant qu'ils sont éteints, l'écran dit clairement que le compte reste sur l'appareil. |
| RGPD (1.4) | Page Confidentialité (`#/confidentialite`) : données, stockage, droits, contacts du CRM, tiers. À faire relire, et coordonnées du responsable du traitement à compléter avant le lancement. |

## Avant la commercialisation (comptes en ligne et paiement)

Dès qu'il y aura des comptes, une base de données et des abonnements payants, ces points deviennent bloquants :

1. **Cloisonnement des données côté serveur.** Chaque table porte l'identifiant du propriétaire (et de l'équipe) et les règles sont appliquées par la base, pas par l'interface. Exemple avec Supabase (PostgreSQL) :

   ```sql
   create table prospects (
     id uuid primary key default gen_random_uuid(),
     owner_id uuid not null default auth.uid() references auth.users(id),
     entreprise text not null,
     created_at timestamptz not null default now()
   );
   alter table prospects enable row level security;
   create policy "lire ses fiches"     on prospects for select using (owner_id = auth.uid());
   create policy "créer ses fiches"    on prospects for insert with check (owner_id = auth.uid());
   create policy "modifier ses fiches" on prospects for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
   create policy "supprimer ses fiches" on prospects for delete using (owner_id = auth.uid());
   ```

2. **Test « changer l'identifiant ».** Avec deux comptes de test, ouvrir une fiche du compte A en étant connecté avec le compte B (URL, requête API modifiée) : la réponse doit être vide ou refusée.
3. **Abonnement vérifié côté serveur.** Le statut vient des webhooks du prestataire de paiement (Stripe) et n'est jamais modifiable depuis l'application : table `subscriptions` en lecture seule pour l'utilisateur (sa ligne uniquement), écrite seulement par la fonction serveur du webhook. Les fonctions Premium sont refusées par le serveur, pas seulement masquées. Détail dans [PAIEMENTS.md](PAIEMENTS.md).
4. **Secrets côté serveur uniquement.** Clé secrète Stripe et clé « service » de la base dans des fonctions serveur. La clé publique de la base peut être dans le navigateur, mais elle n'est sûre qu'avec les règles du point 1.
5. **Fonctions sensibles protégées.** Toute fonction serveur vérifie le jeton de session et le propriétaire de la donnée ; limites de fréquence sur la connexion et la réinitialisation du mot de passe.
6. **Session.** Déconnexion réelle (jeton invalidé), session expirée → retour à la connexion sans perte de saisie, récupération de compte par e-mail.
7. **Suppression du compte** depuis l'application (exigence Apple pour toute application qui permet de créer un compte), avec effacement réel côté serveur.
8. **Sauvegardes de la base** activées et une restauration testée sur un projet de test.
9. **App Store.** Vérifier au moment de la soumission les règles d'Apple sur les abonnements numériques (achat intégré ou lien externe selon le pays) et sur les connexions tierces (si « Se connecter avec Google », proposer aussi une option conforme aux règles d'Apple).
10. **Connecteurs synchronisés (Canva, Figma, Notion, Google).** Passer par l'OAuth officiel de chaque service, côté serveur : les jetons d'accès et secrets d'application restent sur le serveur (jamais dans le navigateur), portée minimale demandée, révocation possible depuis le compte.

## Bonnes pratiques

- Ne jamais coller de clé secrète dans une conversation, un ticket ou un dépôt.
- Tester avec des données fictives (le bouton « Charger des données de démonstration » est fait pour ça).
- Tenir ce document à jour à chaque version.
