# Les quatre chiffres de MindView

Quatre chiffres suffisent pour savoir si l'application marche, semaine après semaine :

| # | Chiffre | Définition | Bon signe au début |
|---|---|---|---|
| 1 | **Inscriptions** | Comptes créés dans la semaine | En hausse après chaque vidéo |
| 2 | **Prise en main** | Part des inscrits qui créent 3 tâches ou 1 projet dans les 7 jours | Plus de 40 % |
| 3 | **Retour à J+7** | Part des inscrits qui rouvrent l'application entre le 7e et le 13e jour | Plus de 25 % |
| 4 | **Passage au payant** | Part des inscrits qui ont payé au moins une fois | 3 à 5 % |

Les seuils sont des repères de départ pour une application d'organisation, à ajuster avec les premiers vrais chiffres.

## Où les lire

Supabase → SQL Editor :

```sql
select * from kpis_par_semaine;   -- les 4 chiffres, une ligne par semaine d'inscription
select * from abonnes_actifs;     -- abonnés et revenu mensuel par formule
```

Les semaines récentes ne sont pas encore complètes pour le retour à J+7 (il faut attendre 14 jours).

## Comment c'est mesuré

- Seulement pour les personnes qui ont un **compte en ligne** (qui paient ou veulent payer). Sans compte, rien ne quitte l'appareil.
- Deux événements seulement, enregistrés au plus une fois par jour : `active_day` (l'application a été ouverte ce jour-là) et `activated` (première prise en main). Les inscriptions viennent de la table `profiles`, les paiements du webhook Stripe (`first_paid_at`).
- **Jamais de contenu** : ni titre de tâche, ni note, ni fiche, ni adresse IP stockée dans ces tables.
- Désactivable : Compte → Compte en ligne → « Partager deux mesures d'usage ». C'est écrit dans la page Confidentialité.
- L'application ne peut qu'**ajouter** ses propres événements ; personne ne peut les lire depuis l'application.

## Avant les comptes en ligne

En attendant Stripe, mesurer à la main pendant les tests utilisateurs (voir [TEST-UTILISATEURS.md](TEST-UTILISATEURS.md)) : sur 10 personnes, combien créent 3 tâches ou 1 projet le premier jour, combien rouvrent l'application une semaine plus tard, combien disent qu'elles paieraient.
