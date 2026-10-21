// Démarre un abonnement pour le compte connecté.
// - Essai gratuit de 7 jours (1.15) : SANS carte. L'abonnement est créé directement chez Stripe, en essai ;
//   sans moyen de paiement ajouté avant la fin, Stripe l'arrête tout seul (retour à la version gratuite,
//   rien n'est prélevé). Pour continuer après l'essai, la personne ajoute un moyen de paiement depuis
//   l'espace de gestion Stripe (create-portal-session). Réponse : { started: true }.
// - Abonnement payant (mensuel ou annuel) : session Stripe Checkout. Réponse : { url } de la page de paiement.
import { stripe, admin, json, handler, currentUser, customerFor, PRICES, priceKey, APP_URL, LIVE } from '../_shared/common.ts';

Deno.serve(handler(async (req) => {
  const user = await currentUser(req);
  if (!user) return json(req, { error: 'auth' }, 401);
  const { plan, trial, interval } = await req.json().catch(() => ({}));
  const price = PRICES[priceKey(plan, interval)];
  if (!price) return json(req, { error: 'plan', message: 'Formule inconnue.' }, 400);

  // Un seul abonnement par compte : pour changer de formule, l'application ouvre le portail Stripe
  const { data: sub } = await admin.from('subscriptions').select('status').eq('user_id', user.id).maybeSingle();
  if (sub && LIVE.includes(sub.status)) return json(req, { error: 'already' }, 409);
  const customer = await customerFor(user);

  // Essai : seulement pour un premier abonnement, une seule fois par compte
  if (trial) {
    if (sub) return json(req, { error: 'trial_used', message: 'L\'essai gratuit a déjà été utilisé sur ce compte.' }, 409);
    await stripe.subscriptions.create({
      customer,
      items: [{ price }],
      trial_period_days: 7,
      trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
      payment_settings: { save_default_payment_method: 'on_subscription' },
      metadata: { user_id: user.id },
    }, { idempotencyKey: `mindview-trial-${user.id}` });
    // Le webhook (customer.subscription.created) enregistre l'abonnement ; l'application relit son état.
    return json(req, { started: true });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { user_id: user.id } },
    payment_method_collection: 'always',
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
