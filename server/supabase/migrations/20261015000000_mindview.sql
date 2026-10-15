-- MindView : comptes, abonnements et mesures.
-- À appliquer une fois : `supabase db push` (ou coller dans Supabase → SQL Editor → Run).
-- Règle d'or : l'application LIT son abonnement, seul le serveur (fonctions, clé service_role) l'ÉCRIT.

-- ---------- Profils (un par compte, créé automatiquement à l'inscription) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profil : lecture du sien" on public.profiles;
create policy "profil : lecture du sien" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Abonnements (écrits uniquement par le webhook Stripe) ----------
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  plan text not null default 'free' check (plan in ('free', 'pro', 'premium')),
  status text not null default 'none',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  first_paid_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
drop policy if exists "abonnement : lecture du sien" on public.subscriptions;
create policy "abonnement : lecture du sien" on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
-- Volontairement AUCUNE politique insert / update / delete :
-- impossible de s'offrir un abonnement depuis l'application ou la console du navigateur.

-- ---------- Mesures : deux événements, jamais de contenu ----------
create table if not exists public.events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (name in ('active_day', 'activated')),
  day date not null default current_date,
  at timestamptz not null default now(),
  unique (user_id, name, day)
);
alter table public.events enable row level security;
drop policy if exists "mesures : chacun ajoute les siennes" on public.events;
create policy "mesures : chacun ajoute les siennes" on public.events
  for insert to authenticated with check ((select auth.uid()) = user_id);
-- Pas de lecture depuis l'application : les chiffres se lisent dans le tableau de bord Supabase.

-- ---------- Les quatre chiffres, par semaine d'inscription (voir MESURES.md) ----------
create or replace view public.kpis_par_semaine with (security_invoker = true) as
select
  date_trunc('week', p.created_at)::date as semaine,
  count(*) as inscriptions,
  round(100.0 * count(*) filter (where exists (
    select 1 from public.events e where e.user_id = p.id and e.name = 'activated' and e.at < p.created_at + interval '7 days'
  )) / nullif(count(*), 0), 1) as prise_en_main_pct,
  round(100.0 * count(*) filter (where exists (
    select 1 from public.events e where e.user_id = p.id and e.name = 'active_day'
      and e.day between (p.created_at + interval '7 days')::date and (p.created_at + interval '13 days')::date
  )) / nullif(count(*), 0), 1) as retour_j7_pct,
  round(100.0 * count(*) filter (where exists (
    select 1 from public.subscriptions s where s.user_id = p.id and s.first_paid_at is not null
  )) / nullif(count(*), 0), 1) as payants_pct
from public.profiles p
group by 1
order by 1 desc;
revoke all on public.kpis_par_semaine from anon, authenticated;

-- Vue d'ensemble : abonnés actifs et revenu mensuel récurrent (prix TTC affichés dans l'app)
create or replace view public.abonnes_actifs with (security_invoker = true) as
select plan, count(*) as abonnes,
  round(count(*) * case plan when 'pro' then 11.99 when 'premium' then 21.99 else 0 end, 2) as revenu_mensuel_eur
from public.subscriptions
where status in ('active', 'trialing', 'past_due')
group by plan;
revoke all on public.abonnes_actifs from anon, authenticated;
