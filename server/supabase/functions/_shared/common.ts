// Code partagé des fonctions serveur MindView (Supabase Edge Functions, Deno).
// Les clés secrètes viennent UNIQUEMENT des variables d'environnement du serveur
// (`supabase secrets set …`), jamais du dépôt ni du navigateur.
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournies automatiquement par Supabase.
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

export { Stripe };
export const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { httpClient: Stripe.createFetchHttpClient() });
export const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Adresse de l'application (retour après paiement) et origines autorisées à appeler les fonctions
export const APP_URL = Deno.env.get('APP_URL') ?? 'https://michprk.github.io/msdeveloper/';
const ORIGINS = [new URL(APP_URL).origin, ...(Deno.env.get('EXTRA_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean)];

// Formule ↔ prix Stripe (identifiants « price_… » créés dans le tableau de bord Stripe)
export const PRICES: Record<string, string | undefined> = {
  pro: Deno.env.get('STRIPE_PRICE_PRO'),
  premium: Deno.env.get('STRIPE_PRICE_PREMIUM'),
};
export const planOfPrice = (priceId?: string | null): string | null =>
  Object.entries(PRICES).find(([, id]) => id && id === priceId)?.[0] ?? null;
export const LIVE = ['active', 'trialing', 'past_due'];

export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}
export const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });

// Compte connecté, vérifié par Supabase à partir du jeton envoyé par l'application
export async function currentUser(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
}

// Un seul client Stripe par compte, créé à la première demande
export async function customerFor(user: { id: string; email?: string | null }): Promise<string> {
  const { data } = await admin.from('profiles').select('stripe_customer_id').eq('id', user.id).maybeSingle();
  if (data?.stripe_customer_id) return data.stripe_customer_id;
  const c = await stripe.customers.create(
    { email: user.email ?? undefined, metadata: { user_id: user.id } },
    { idempotencyKey: `mindview-customer-${user.id}` },
  );
  const { error } = await admin.from('profiles').upsert({ id: user.id, email: user.email ?? null, stripe_customer_id: c.id });
  if (error) throw error;
  return c.id;
}

// Pour chaque fonction appelée par l'application : réponse aux pré-requêtes CORS et erreurs propres
export function handler(fn: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
    if (req.method !== 'POST') return json(req, { error: 'method' }, 405);
    try {
      return await fn(req);
    } catch (e) {
      console.error(e);
      return json(req, { error: 'server', message: 'Erreur du serveur. Réessayez dans un instant.' }, 500);
    }
  };
}
