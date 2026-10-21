// Reçoit les événements Stripe et tient à jour la table `subscriptions`.
// C'est le SEUL endroit qui écrit un abonnement. Chaque événement est vérifié par sa signature.
// À déployer sans vérification de jeton Supabase (Stripe n'en envoie pas) :
//   supabase functions deploy stripe-webhook --no-verify-jwt
import { Stripe, stripe, admin, planOfPrice, LIVE } from '../_shared/common.ts';

const SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const idOf = (x: string | { id: string } | null | undefined) => (typeof x === 'string' ? x : x?.id ?? null);

async function userIdFor(sub: Stripe.Subscription): Promise<string | null> {
  let id = sub.metadata?.user_id ?? null;
  if (!id) {
    const { data } = await admin.from('profiles').select('id').eq('stripe_customer_id', idOf(sub.customer)).maybeSingle();
    id = data?.id ?? null;
  }
  if (!id) return null;
  // Compte supprimé entre-temps : on ne recrée rien
  const { data: prof } = await admin.from('profiles').select('id').eq('id', id).maybeSingle();
  return prof ? id : null;
}

// On relit toujours l'abonnement chez Stripe : l'ordre d'arrivée des événements n'a plus d'importance,
// et un événement rejoué (Stripe réessaie en cas d'erreur) donne le même résultat.
async function syncSubscription(subscriptionId: string) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['customer'] });
  const userId = await userIdFor(sub);
  if (!userId) { console.warn('Abonnement sans compte MindView', subscriptionId); return; }
  const item = sub.items.data[0];
  // Selon la version de l'API Stripe, la fin de période est sur l'abonnement ou sur la ligne
  // deno-lint-ignore no-explicit-any
  const end: number | null = (sub as any).current_period_end ?? (item as any)?.current_period_end ?? null;
  const live = LIVE.includes(sub.status);
  // Moyen de paiement enregistré ? (un essai sans carte s'arrête tout seul à la fin s'il n'y en a pas)
  // deno-lint-ignore no-explicit-any
  const cust = sub.customer as any;
  const hasPayment = !!(sub.default_payment_method || (cust && !cust.deleted && cust.invoice_settings?.default_payment_method));

  // Un ancien abonnement terminé ne doit pas écraser un abonnement en cours
  const { data: cur } = await admin.from('subscriptions').select('stripe_subscription_id, status').eq('user_id', userId).maybeSingle();
  if (!live && cur && cur.stripe_subscription_id !== sub.id && LIVE.includes(cur.status)) return;

  const { error } = await admin.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: idOf(sub.customer),
    stripe_subscription_id: sub.id,
    plan: live ? planOfPrice(item?.price?.id) ?? 'free' : 'free',
    billing_interval: item?.price?.recurring?.interval === 'year' ? 'year' : 'month',
    has_payment_method: hasPayment,
    status: sub.status,
    current_period_end: end ? new Date(end * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

// deno-lint-ignore no-explicit-any
const subscriptionOfInvoice = (inv: any): string | null => idOf(inv.subscription) ?? idOf(inv.parent?.subscription_details?.subscription);

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  if (!signature) return new Response('Signature manquante', { status: 400 });
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, SECRET, undefined, cryptoProvider);
  } catch (_e) {
    return new Response('Signature invalide', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.mode === 'subscription' && s.subscription) await syncSubscription(idOf(s.subscription)!);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription((event.data.object as Stripe.Subscription).id);
        break;
      case 'invoice.paid': {
        const inv = event.data.object as Stripe.Invoice;
        const subId = subscriptionOfInvoice(inv);
        if (subId) {
          await syncSubscription(subId);
          // Premier vrai paiement : sert au 4e chiffre (passage au payant)
          if ((inv.amount_paid ?? 0) > 0) {
            await admin.from('subscriptions').update({ first_paid_at: new Date().toISOString() })
              .eq('stripe_subscription_id', subId).is('first_paid_at', null);
          }
        }
        break;
      }
      // Moyen de paiement ajouté depuis l'espace de gestion (pendant un essai sans carte, par exemple)
      case 'customer.updated': {
        const c = event.data.object as Stripe.Customer;
        const { data: rows } = await admin.from('subscriptions').select('stripe_subscription_id').eq('stripe_customer_id', c.id);
        for (const r of rows ?? []) if (r.stripe_subscription_id) await syncSubscription(r.stripe_subscription_id);
        break;
      }
      case 'invoice.payment_failed': {
        const subId = subscriptionOfInvoice(event.data.object);
        if (subId) await syncSubscription(subId);
        break;
      }
      default:
        break; // événement non utilisé
    }
  } catch (e) {
    console.error(event.type, e);
    return new Response('Erreur de traitement', { status: 500 }); // Stripe réessaiera
  }
  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
});
