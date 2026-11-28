import type Stripe from "stripe";
import { env } from "@/lib/env";
import { activate, setSubscriptionStatus, stripe } from "@/lib/billing";
import { logEvent } from "@/lib/data";

/* Stripe → memberships. Add this URL in Stripe (Developers → Webhooks):
   https://<your-domain>/api/stripe/webhook with the events listed in docs/SETUP.md. */
export async function POST(request: Request) {
  if (!env.stripeSecret || !env.stripeWebhookSecret) return new Response("Stripe not configured", { status: 503 });
  const s = await stripe();
  let event: Stripe.Event;
  try {
    event = s.webhooks.constructEvent(await request.text(), request.headers.get("stripe-signature") || "", env.stripeWebhookSecret);
  } catch {
    return new Response("Bad signature", { status: 400 });
  }
  const periodEnd = (sub: Stripe.Subscription) => {
    const end = (sub as unknown as { current_period_end?: number }).current_period_end ?? sub.items?.data?.[0]?.current_period_end;
    return end ? new Date(end * 1000) : null;
  };
  switch (event.type) {
    case "checkout.session.completed": {
      const cs = event.data.object as Stripe.Checkout.Session;
      const restaurantId = cs.metadata?.restaurantId;
      const planId = cs.metadata?.planId;
      if (restaurantId && planId) {
        await activate(restaurantId, planId, { status: "active", customerId: String(cs.customer || ""), subscriptionId: String(cs.subscription || "") });
        await logEvent(null, restaurantId, "subscribe", `Membership started (${planId})`);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await setSubscriptionStatus(sub.id, event.type.endsWith("deleted") ? "canceled" : sub.status, periodEnd(sub));
      break;
    }
    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice & { subscription?: string };
      if (inv.subscription) await setSubscriptionStatus(String(inv.subscription), "past_due");
      break;
    }
  }
  return Response.json({ received: true });
}
