// Supprime le compte connecté (RGPD, droit à l'effacement ; exigé par Apple pour l'App Store) :
// 1. arrête l'abonnement Stripe immédiatement, sans autre prélèvement ;
// 2. efface le compte : profil, abonnement et mesures suivent (on delete cascade).
// Les factures déjà émises restent chez Stripe (obligation comptable), sans lien avec un compte.
import { stripe, admin, json, handler, currentUser } from '../_shared/common.ts';

Deno.serve(handler(async (req) => {
  const user = await currentUser(req);
  if (!user) return json(req, { error: 'auth' }, 401);

  const { data: sub } = await admin.from('subscriptions').select('stripe_subscription_id, status').eq('user_id', user.id).maybeSingle();
  if (sub?.stripe_subscription_id && !['canceled', 'incomplete_expired'].includes(sub.status)) {
    try {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    } catch (e) {
      // Déjà supprimé chez Stripe : rien à arrêter
      if ((e as { code?: string }).code !== 'resource_missing') throw e;
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;
  return json(req, { deleted: true });
}));
