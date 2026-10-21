-- MindView 1.15 : stockage des données (synchronisation), connecteur Notion, période de facturation.
-- À appliquer APRÈS 20261015000000_mindview.sql : `supabase db push` (ou coller dans SQL Editor → Run).
-- Règle d'or inchangée : chacun ne lit et n'écrit QUE ce qui est à lui ; les secrets ne sortent jamais du serveur.

-- ---------- Données de l'application (une ligne par compte) ----------
-- Tout le contenu de MindView (tâches, notes, tableaux, études, réglages) en JSON.
-- `rev` est tenu par la base (déclencheur) : l'application envoie « je pars de la version N », la mise à jour
-- ne passe que si c'est toujours N. Ainsi, deux appareils ne s'écrasent jamais sans le savoir.
create table if not exists public.user_data (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  rev bigint not null default 1,
  updated_at timestamptz not null default now(),
  constraint user_data_taille check (pg_column_size(data) <= 5 * 1024 * 1024)
);
alter table public.user_data enable row level security;
revoke all on public.user_data from anon;
drop policy if exists "données : lecture des siennes" on public.user_data;
create policy "données : lecture des siennes" on public.user_data
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "données : création des siennes" on public.user_data;
create policy "données : création des siennes" on public.user_data
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "données : mise à jour des siennes" on public.user_data;
create policy "données : mise à jour des siennes" on public.user_data
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Pas de suppression depuis l'application : les données partent avec le compte (on delete cascade).

create or replace function public.user_data_rev()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.rev := 1;
  else
    new.rev := old.rev + 1;          -- impossible de choisir sa version depuis l'application
    new.user_id := old.user_id;      -- impossible de déplacer sa ligne vers un autre compte
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists user_data_rev on public.user_data;
create trigger user_data_rev before insert or update on public.user_data
  for each row execute function public.user_data_rev();

-- ---------- Abonnements : période (mois / an) et moyen de paiement ----------
alter table public.subscriptions add column if not exists billing_interval text not null default 'month';
alter table public.subscriptions drop constraint if exists subscriptions_billing_interval_check;
alter table public.subscriptions add constraint subscriptions_billing_interval_check check (billing_interval in ('month', 'year'));
-- Essai sans carte : faux tant qu'aucun moyen de paiement n'est enregistré chez Stripe
alter table public.subscriptions add column if not exists has_payment_method boolean not null default false;

-- Abonnés actifs et revenu mensuel récurrent (prix TTC de plans.js : 4,99 € ou 39 €/an ; 9,99 € ou 79 €/an)
create or replace view public.abonnes_actifs with (security_invoker = true) as
select plan, billing_interval, count(*) as abonnes,
  round(count(*) * case
    when plan = 'pro' and billing_interval = 'year' then 39 / 12.0
    when plan = 'pro' then 4.99
    when plan = 'premium' and billing_interval = 'year' then 79 / 12.0
    when plan = 'premium' then 9.99
    else 0 end, 2) as revenu_mensuel_eur
from public.subscriptions
where status in ('active', 'past_due')
group by plan, billing_interval;
revoke all on public.abonnes_actifs from anon, authenticated;

-- ---------- Connecteur Notion : jetons d'accès (serveur seulement) ----------
-- Aucune politique : ni lecture ni écriture depuis l'application. Seules les fonctions serveur
-- (clé service_role) y accèdent. Le jeton Notion ne quitte jamais le serveur.
create table if not exists public.notion_links (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  workspace_id text,
  workspace_name text,
  workspace_icon text,
  bot_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.notion_links enable row level security;
revoke all on public.notion_links from anon, authenticated;

-- Paramètre « state » d'OAuth, lié au compte qui a commencé la connexion (valable 15 minutes)
create table if not exists public.notion_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.notion_oauth_states enable row level security;
revoke all on public.notion_oauth_states from anon, authenticated;
