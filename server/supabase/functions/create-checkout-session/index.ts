// Démarre un paiement : crée une session Stripe Checkout (abonnement mensuel) pour le compte connecté
// et renvoie l'adresse de la page de paiement sécurisée de Stripe.
import { stripe, admin, json, handler, currentUser, customerFor, PRICES, APP_URL, LIVE } from '../_shared/common.ts';

Deno.serve(handler(async (req) => {
  const user = await currentUser(req);
  if (!user) return json(req, { error: 'auth' }, 401);
  const { plan } = await req.json().catch(() => ({}));
  const price = PRICES[plan];
  if (!price) return json(req, { error: 'plan', message: 'Formule inconnue.' }, 400);

  // Un seul abonnement par compte : pour changer de formule, l'application ouvre le portail Stripe
  const { data: sub } = await admin.from('subscriptions').select('status').eq('user_id', user.id).maybeSingle();
  if (sub && LIVE.includes(sub.status)) return json(req, { error: 'already' }, 409);

  const customer = await customerFor(user);
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { user_id: user.id } },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    locale: 'fr',
    // TVA : à activer quand le statut TVA est décidé (Stripe Tax), voir PAIEMENTS.md
    // automatic_tax: { enabled: true },
    success_url: `${APP_URL}?checkout=ok#/abonnement`,
    cancel_url: `${APP_URL}?checkout=annule#/abonnement`,
  });
  return json(req, { url: session.url });
}));
