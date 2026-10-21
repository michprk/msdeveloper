# Connecteur Notion — ce qu'il reste à brancher côté serveur

MindView parle à Notion uniquement à travers une interface, `notionProxy` (`assets/js/notion/proxy.js`).

Le serveur fait trois choses :
- il garde le **secret OAuth** de l'intégration Notion ;
- il garde les **jetons d'accès** des utilisateurs ;
- il **transmet** les requêtes à l'API Notion.

Rien de cela n'est dans l'application. De toute façon, l'API Notion refuse les appels directs depuis un navigateur (pas de CORS).

Tant que `NOTION.proxyUrl` est vide dans `assets/js/config.js`, la carte Notion affiche « Connexion directe en préparation ». L'import et l'export par fichier .zip restent disponibles.

Pour développer sans serveur, il y a un **Notion factice** :
- avec `NOTION.mock = true`, ou `?notion=mock` dans l'adresse (pour la session) ;
- il imite l'API (version 2022-06-28) avec une page de cours qui contient tous les types de blocs et une base « Devoirs » ;
- il renvoie 3 résultats par page (pour tester la pagination) et un code 429 toutes les 6 requêtes.

## 1. Créer l'intégration publique (une fois)

1. https://www.notion.so/profile/integrations → **Nouvelle intégration** → type **Publique**.
2. Capacités : lire le contenu, mettre à jour le contenu, insérer du contenu. Pas besoin des e-mails des utilisateurs.
3. URL de redirection : l'adresse de l'application, par exemple `https://michprk.github.io/msdeveloper/`. Notion y renvoie `?code=…&state=…`, et MindView termine la connexion au démarrage.
4. Note l'**ID client** (public) et le **secret client** (jamais dans le dépôt).

## 2. Les quatre points d'entrée du proxy

Tous en `POST`, JSON en entrée et en sortie, à l'adresse `NOTION.proxyUrl` + chemin.

L'en-tête `Authorization: Bearer <jeton de session Supabase>` est envoyé quand la personne a un compte en ligne. Le serveur doit l'exiger pour savoir **à qui** appartient le jeton Notion.

| Chemin | Entrée | Sortie | Rôle |
|---|---|---|---|
| `/notion/auth/start` | `{ state, redirectUri }` | `{ url }` | Construire `https://api.notion.com/v1/oauth/authorize?client_id=…&response_type=code&owner=user&redirect_uri=…&state=…`. |
| `/notion/auth/finish` | `{ code, state, redirectUri }` | `{ workspaceId, workspaceName, workspaceIcon, botId }` | Échanger le code (`POST https://api.notion.com/v1/oauth/token`, authentification Basic `client_id:secret`). Enregistrer `access_token` **côté serveur**, lié à l'utilisateur. Ne jamais le renvoyer au navigateur. |
| `/notion/request` | `{ method, path, body }` | `{ status, headers: { 'retry-after' }, body }` | Transmettre à `https://api.notion.com` + `path`, avec `Authorization: Bearer <access_token>` et `Notion-Version: 2022-06-28`. Renvoyer le statut, l'en-tête `Retry-After` et le corps tels quels. |
| `/notion/disconnect` | `{}` | `{ ok: true }` | Supprimer le jeton enregistré pour cet utilisateur. |

## 3. Règles de sécurité pour `/notion/request`

- **Liste blanche des chemins** :
  - `POST /v1/search` ;
  - `GET /v1/pages/:id` ;
  - `PATCH /v1/pages/:id` ;
  - `POST /v1/pages` ;
  - `GET /v1/databases/:id` ;
  - `POST /v1/databases/:id/query` ;
  - `GET /v1/blocks/:id/children` ;
  - `PATCH /v1/blocks/:id/children`.

  Tout autre chemin est refusé (400).
- **Aucun stockage** du contenu des pages : le serveur transmet et oublie. La page Confidentialité de l'application le promet.
- Limiter la taille des corps (par exemple 1 Mo) et le débit par utilisateur.
- Journaliser seulement les erreurs, sans contenu.

## 4. Ce que fait déjà l'application

- **File d'attente centrale** à environ 3 requêtes par seconde.
- Sur un **429**, toute la file attend la durée de `Retry-After`. Sur les erreurs 5xx, 409 et réseau, elle réessaie avec un **délai qui double** (500 ms, 1 s, 2 s…, plus un peu de hasard), **5 essais au plus**, puis affiche une erreur claire.
- **Import** :
  - les pages deviennent des notes ;
  - une base avec un statut ou une date devient des tâches, une autre base devient des notes ;
  - blocs pris en charge : titres, listes, cases, citations, encadrés, code, bascules, tableaux, images (en lien), mentions de pages (en liens), séparateurs, colonnes ;
  - un bloc non pris en charge est gardé en texte avec une mention « Notion · … ».
- **Export** : une note ou un projet devient une sous-page d'une page Notion choisie. Les envois sont découpés en paquets de 100 blocs et les textes en morceaux de 2 000 caractères.
- **Synchronisation des tâches** avec une base :
  - correspondance titre, statut (statut, sélection ou case), date et matière ;
  - incrémentale (`last_edited_time`, avec 2 minutes de marge parce que Notion arrondit à la minute), avec pagination ;
  - conflit (modifié des deux côtés) : la version la plus récente gagne, l'autre reste proposée dans Connecteurs et dans les notifications ;
  - une tâche supprimée dans MindView part à la corbeille de Notion.
- **Déconnexion** : appelle `/notion/disconnect` et oublie l'état local. Ce qui a été importé reste dans MindView ; ce qui a été envoyé reste dans Notion.

## 5. Limites connues

- Les images **déposées** dans Notion (et non liées) ont une adresse temporaire, valable environ 1 heure : le lien importé expire. Les images liées depuis le web restent valables.
- Une tâche supprimée **dans Notion** n'est pas supprimée dans MindView : une requête incrémentale ne voit pas les pages supprimées.
- Les sous-pages ne sont pas importées automatiquement : elles deviennent des liens. On peut les importer une par une.
