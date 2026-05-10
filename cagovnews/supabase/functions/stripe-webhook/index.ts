// supabase/functions/stripe-webhook/index.ts
// Handles Stripe payment events and updates user plan in Supabase.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );
  } catch (err) {
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }

  const session = event.data.object as any;

  switch (event.type) {
    case 'checkout.session.completed': {
      // User completed payment — upgrade to pro
      const userId = session.metadata?.user_id;
      if (userId) {
        await supabase.from('profiles')
          .update({ plan: 'pro' })
          .eq('id', userId);

        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          status: 'active',
        });
      }
      break;
    }

    case 'customer.subscription.deleted':
    case 'customer.subscription.paused': {
      // Subscription cancelled — downgrade to free
      await supabase.from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', session.id);

      const { data: sub } = await supabase.from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', session.id)
        .single();

      if (sub) {
        await supabase.from('profiles')
          .update({ plan: 'free' })
          .eq('id', sub.user_id);
      }
      break;
    }

    case 'invoice.payment_failed': {
      await supabase.from('subscriptions')
        .update({ status: 'past_due' })
        .eq('stripe_customer_id', session.customer);
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
