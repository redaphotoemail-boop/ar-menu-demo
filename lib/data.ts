import "server-only";
import { asc, desc, eq, sql, inArray } from "drizzle-orm";
import { getDb, schema } from "./db";
import { DEFAULT_ENGINES, DEFAULT_FLAGS, type EngineChoice, type Flags } from "./defaults";
import type { Dish, Restaurant, User } from "./db/schema";

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const db = await getDb();
  const row = (await db.select().from(schema.settings).where(eq(schema.settings.key, key)).limit(1))[0];
  return row ? ({ ...(fallback as object), ...(row.value as object) } as T) : fallback;
}

export async function setSetting(key: string, value: unknown) {
  const db = await getDb();
  await db
    .insert(schema.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
}

export const getFlags = () => getSetting<Flags>("flags", DEFAULT_FLAGS);
export const getEngines = () => getSetting<EngineChoice>("engines", DEFAULT_ENGINES);

export async function getMyRestaurant(user: User): Promise<Restaurant | null> {
  const db = await getDb();
  return (await db.select().from(schema.restaurants).where(eq(schema.restaurants.ownerUserId, user.id)).limit(1))[0] ?? null;
}

export async function getRestaurantBySlug(slug: string) {
  const db = await getDb();
  return (await db.select().from(schema.restaurants).where(eq(schema.restaurants.slug, slug)).limit(1))[0] ?? null;
}

export async function getRestaurant(id: string) {
  const db = await getDb();
  return (await db.select().from(schema.restaurants).where(eq(schema.restaurants.id, id)).limit(1))[0] ?? null;
}

export async function dishesFor(restaurantId: string): Promise<Dish[]> {
  const db = await getDb();
  return db.select().from(schema.dishes).where(eq(schema.dishes.restaurantId, restaurantId)).orderBy(asc(schema.dishes.sort), asc(schema.dishes.createdAt));
}

export async function listPlans(includeInactive = false) {
  const db = await getDb();
  const rows = await db.select().from(schema.plans).orderBy(asc(schema.plans.sort));
  return includeInactive ? rows : rows.filter((p) => p.active);
}

export async function subscriptionFor(restaurantId: string) {
  const db = await getDb();
  return (await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.restaurantId, restaurantId)).orderBy(desc(schema.subscriptions.createdAt)).limit(1))[0] ?? null;
}

export async function jobsFor(restaurantId: string | null, limit = 30) {
  const db = await getDb();
  const q = db.select().from(schema.jobs);
  const rows = restaurantId ? await q.where(eq(schema.jobs.restaurantId, restaurantId)).orderBy(desc(schema.jobs.createdAt)).limit(limit) : await q.orderBy(desc(schema.jobs.createdAt)).limit(limit);
  return rows;
}

export async function mediaFor(restaurantId: string, limit = 60) {
  const db = await getDb();
  return db.select().from(schema.media).where(eq(schema.media.restaurantId, restaurantId)).orderBy(desc(schema.media.createdAt)).limit(limit);
}

export async function logEvent(actorId: string | null, restaurantId: string | null, action: string, detail: string) {
  const db = await getDb();
  await db.insert(schema.events).values({ id: `e_${crypto.randomUUID().slice(0, 12)}`, actorId, restaurantId, action, detail });
}

/* Owner dashboard numbers. */
export async function ownerStats() {
  const db = await getDb();
  const [subs, plans, restaurants, users, jobs, events] = await Promise.all([
    db.select().from(schema.subscriptions),
    db.select().from(schema.plans),
    db.select().from(schema.restaurants),
    db.select().from(schema.users),
    db.select().from(schema.jobs).orderBy(desc(schema.jobs.createdAt)).limit(200),
    db.select().from(schema.events).orderBy(desc(schema.events.createdAt)).limit(12),
  ]);
  const price = new Map(plans.map((p) => [p.id, p.priceCents]));
  const active = subs.filter((s) => s.status === "active");
  const mrr = active.reduce((sum, s) => sum + (price.get(s.planId) ?? 0), 0);
  const monthAgo = Date.now() - 30 * 86400000;
  const spend30 = jobs.filter((j) => new Date(j.createdAt).getTime() > monthAgo).reduce((sum, j) => sum + j.costCents, 0);
  return {
    mrr,
    active: active.length,
    trialing: subs.filter((s) => s.status === "trialing").length,
    pastDue: subs.filter((s) => s.status === "past_due").length,
    restaurants: restaurants.length,
    live: restaurants.filter((r) => r.status === "live").length,
    clients: users.filter((u) => u.role === "client").length,
    newSignups: users.filter((u) => u.role === "client" && new Date(u.createdAt).getTime() > monthAgo).length,
    running: jobs.filter((j) => j.status === "running" || j.status === "queued").length,
    review: jobs.filter((j) => j.status === "review").length,
    failed: jobs.filter((j) => j.status === "failed").length,
    spend30,
    events,
    jobs: jobs.slice(0, 8),
  };
}

export async function restaurantsWithPlans() {
  const db = await getDb();
  const [rs, subs, plans, users, dishes] = await Promise.all([
    db.select().from(schema.restaurants).orderBy(desc(schema.restaurants.createdAt)),
    db.select().from(schema.subscriptions),
    db.select().from(schema.plans),
    db.select().from(schema.users),
    db.select({ rid: schema.dishes.restaurantId, n: sql<number>`count(*)::int`, ar: sql<number>`count(${schema.dishes.modelGlbUrl})::int` }).from(schema.dishes).groupBy(schema.dishes.restaurantId),
  ]);
  return rs.map((r) => {
    const sub = subs.filter((s) => s.restaurantId === r.id).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
    const plan = sub ? plans.find((p) => p.id === sub.planId) : undefined;
    const owner = users.find((u) => u.id === r.ownerUserId);
    const d = dishes.find((x) => x.rid === r.id);
    return { restaurant: r, sub, plan, owner, dishCount: d?.n ?? 0, arCount: d?.ar ?? 0 };
  });
}

export async function usersByIds(ids: string[]) {
  if (!ids.length) return [];
  const db = await getDb();
  return db.select().from(schema.users).where(inArray(schema.users.id, ids));
}
