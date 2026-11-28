import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { env, integrations } from "./env";
import { newId } from "./id";
import { logEvent } from "./data";
import type { Restaurant, User } from "./db/schema";

import { siteOrigin as origin } from "./site";

export async function stripe() {
  const Stripe = (await import("stripe")).default;
  return new Stripe(env.stripeSecret);
}

/* Start a membership. With Stripe connected: a hosted Checkout page (card,
   Apple Pay, Google Pay). In demo: the plan is switched on directly. */
export async function startCheckout(o: { user: User; restaurant: Restaurant; planId: string; successPath: string; cancelPath: string }): Promise<string> {
  const db = await getDb();
  const plan = (await db.select().from(schema.plans).where(eq(schema.plans.id, o.planId)).limit(1))[0];
  if (!plan) return o.cancelPath;

  if (!integrations.stripe) {
    await activate(o.restaurant.id, plan.id, { status: "trialing" });
    await logEvent(o.user.id, o.restaurant.id, "trial", `Started a ${plan.name} membership (demo, no payment)`);
    return o.successPath;
  }

  const s = await stripe();
  const base = await origin();
  const session = await s.checkout.sessions.create({
    mode: "subscription",
    customer_email: o.user.email,
    client_reference_id: o.restaurant.id,
    metadata: { restaurantId: o.restaurant.id, planId: plan.id },
    subscription_data: { metadata: { restaurantId: o.restaurant.id, planId: plan.id } },
    line_items: [
      plan.stripePriceId
        ? { price: plan.stripePriceId, quantity: 1 }
        : { quantity: 1, price_data: { currency: "usd", unit_amount: plan.priceCents, recurring: { interval: "month" }, product_data: { name: `${plan.name} membership` } } },
    ],
    allow_promotion_codes: true,
    success_url: `${base}${o.successPath}`,
    cancel_url: `${base}${o.cancelPath}`,
  });
  return session.url ?? o.cancelPath;
}

export async function openPortal(customerId: string | null, returnPath: string) {
  if (!integrations.stripe || !customerId) return returnPath;
  const s = await stripe();
  const portal = await s.billingPortal.sessions.create({ customer: customerId, return_url: `${await origin()}${returnPath}` });
  return portal.url;
}

export async function activate(restaurantId: string, planId: string, extra: { status?: string; customerId?: string | null; subscriptionId?: string | null; periodEnd?: Date | null } = {}) {
  const db = await getDb();
  const existing = (await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.restaurantId, restaurantId)).limit(1))[0];
  const values = {
    planId,
    status: extra.status ?? "active",
    stripeCustomerId: extra.customerId ?? existing?.stripeCustomerId ?? null,
    stripeSubscriptionId: extra.subscriptionId ?? existing?.stripeSubscriptionId ?? null,
    currentPeriodEnd: extra.periodEnd ?? new Date(Date.now() + 30 * 86400000),
  };
  if (existing) await db.update(schema.subscriptions).set(values).where(eq(schema.subscriptions.id, existing.id));
  else await db.insert(schema.subscriptions).values({ id: newId("sub"), restaurantId, ...values });
}

export async function setSubscriptionStatus(stripeSubscriptionId: string, status: string, periodEnd?: Date | null) {
  const db = await getDb();
  await db
    .update(schema.subscriptions)
    .set({ status, ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}) })
    .where(eq(schema.subscriptions.stripeSubscriptionId, stripeSubscriptionId));
}
