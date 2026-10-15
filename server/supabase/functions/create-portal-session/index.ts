// Ouvre l'espace de gestion Stripe du compte connecté : changer de formule (au prorata),
// changer de carte, télécharger les factures, résilier ou reprendre.
import { stripe, json, handler, currentUser, customerFor, APP_URL } from '../_shared/common.ts';

Deno.serve(handler(async (req) => {
  const user = await currentUser(req);
  if (!user) return json(req, { error: 'auth' }, 401);
  const customer = await customerFor(user);
  const session = await stripe.billingPortal.sessions.create({ customer, return_url: `${APP_URL}#/abonnement`, locale: 'fr' });
  return json(req, { url: session.url });
}));
