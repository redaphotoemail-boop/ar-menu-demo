"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { getClientContext } from "@/lib/client";
import { requireUser } from "@/lib/auth";
import { getEngines, getFlags, getMyRestaurant, logEvent, subscriptionFor } from "@/lib/data";
import { newId, slugify } from "@/lib/id";
import { createJob } from "@/lib/jobs";
import { filmPrompt, recreatePrompt, type CameraMove, type PhotoStyle } from "@/lib/ai/prompts";
import { TEMPLATES } from "@/lib/defaults";
import { startCheckout, openPortal } from "@/lib/billing";

/* ---------- onboarding ---------- */

const Basics = z.object({ name: z.string().trim().min(2).max(80), city: z.string().trim().max(80).default(""), cuisine: z.string().trim().max(80).default("") });

export async function obBasics(form: FormData) {
  const user = await requireUser("/app/onboarding");
  const data = Basics.parse(Object.fromEntries(form));
  const db = await getDb();
  const existing = await getMyRestaurant(user);
  if (existing) {
    await db.update(schema.restaurants).set({ ...data, onboardingStep: Math.max(existing.onboardingStep, 1) }).where(eq(schema.restaurants.id, existing.id));
  } else {
    let slug = slugify(data.name);
    const taken = await db.select({ n: sql<number>`count(*)::int` }).from(schema.restaurants).where(eq(schema.restaurants.slug, slug));
    if ((taken[0]?.n ?? 0) > 0) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    const template = String(form.get("template") || "veralight");
    await db.insert(schema.restaurants).values({ id: newId("r"), ownerUserId: user.id, slug, template: TEMPLATES.some((t) => t.key === template) ? template : "veralight", onboardingStep: 1, ...data });
    await logEvent(user.id, null, "onboarding", `${data.name} started onboarding`);
  }
  redirect("/app/onboarding?step=2");
}

export async function obTemplate(form: FormData) {
  const { restaurant } = await getClientContext();
  const key = String(form.get("template"));
  if (!TEMPLATES.some((t) => t.key === key)) return;
  const db = await getDb();
  await db.update(schema.restaurants).set({ template: key, onboardingStep: Math.max(restaurant.onboardingStep, 2) }).where(eq(schema.restaurants.id, restaurant.id));
  redirect("/app/onboarding?step=3");
}

export async function obDishes(form: FormData) {
  const { restaurant } = await getClientContext();
  const db = await getDb();
  const rows = [0, 1, 2]
    .map((i) => ({ name: String(form.get(`name${i}`) || "").trim(), price: Number(form.get(`price${i}`) || 0), category: String(form.get(`cat${i}`) || "mains") }))
    .filter((d) => d.name);
  if (rows.length) {
    await db.insert(schema.dishes).values(
      rows.map((d, n) => ({ id: newId("d"), restaurantId: restaurant.id, name: d.name, category: d.category, priceCents: Math.round(d.price * 100), tags: n === 0 ? ["signature"] : [], sort: n + 1 })),
    );
  }
  await db.update(schema.restaurants).set({ onboardingStep: Math.max(restaurant.onboardingStep, 3) }).where(eq(schema.restaurants.id, restaurant.id));
  redirect("/app/onboarding?step=4");
}

export async function obCapture(form: FormData) {
  const { restaurant } = await getClientContext();
  const route = String(form.get("route")) === "photographer" ? "photographer" : "phone";
  const db = await getDb();
  await db.update(schema.restaurants).set({ captureRoute: route, onboardingStep: Math.max(restaurant.onboardingStep, 4) }).where(eq(schema.restaurants.id, restaurant.id));
  if (route === "photographer") await logEvent(restaurant.ownerUserId, restaurant.id, "shoot", `${restaurant.name} asked for a photographer`);
  redirect("/app/onboarding?step=5");
}

export async function obPlan(form: FormData) {
  const { user, restaurant } = await getClientContext();
  const planId = String(form.get("plan"));
  const db = await getDb();
  await db.update(schema.restaurants).set({ onboardingStep: Math.max(restaurant.onboardingStep, 5) }).where(eq(schema.restaurants.id, restaurant.id));
  const url = await startCheckout({ user, restaurant, planId, successPath: "/app/onboarding?step=6", cancelPath: "/app/onboarding?step=5" });
  redirect(url);
}

export async function obFinish() {
  const { restaurant } = await getClientContext();
  const db = await getDb();
  await db.update(schema.restaurants).set({ onboardingStep: 6 }).where(eq(schema.restaurants.id, restaurant.id));
  redirect("/app/capture");
}

/* ---------- menu ---------- */

const DishForm = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Give the dish a name.").max(100),
  category: z.string().default("mains"),
  price: z.coerce.number().min(0).max(10000),
  short: z.string().trim().max(120).default(""),
  description: z.string().trim().max(600).default(""),
  ingredients: z.string().default(""),
  pairing: z.string().trim().max(120).default(""),
  chefNote: z.string().trim().max(240).default(""),
  kcal: z.coerce.number().int().min(0).max(5000).optional().or(z.literal("").transform(() => undefined)),
  protein: z.coerce.number().int().min(0).max(500).optional().or(z.literal("").transform(() => undefined)),
  carbs: z.coerce.number().int().min(0).max(1000).optional().or(z.literal("").transform(() => undefined)),
  fat: z.coerce.number().int().min(0).max(500).optional().or(z.literal("").transform(() => undefined)),
  prepMinutes: z.coerce.number().int().min(0).max(240).optional().or(z.literal("").transform(() => undefined)),
  spice: z.coerce.number().int().min(-1).max(3).default(-1),
  imageUrl: z.string().optional(),
});

export type DishState = { error?: string; ok?: boolean };

export async function saveDish(_: DishState, form: FormData): Promise<DishState> {
  const { restaurant, user } = await getClientContext();
  const parsed = DishForm.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const d = parsed.data;
  const values = {
    name: d.name,
    category: d.category,
    priceCents: Math.round(d.price * 100),
    short: d.short,
    description: d.description,
    ingredients: d.ingredients.split(",").map((s) => s.trim()).filter(Boolean),
    allergens: form.getAll("allergens").map(String),
    allergensConfirmed: form.get("allergensConfirmed") === "on",
    tags: form.getAll("tags").map(String),
    pairing: d.pairing,
    chefNote: d.chefNote,
    kcal: d.kcal ?? null,
    protein: d.protein ?? null,
    carbs: d.carbs ?? null,
    fat: d.fat ?? null,
    prepMinutes: d.prepMinutes ?? null,
    spice: d.spice,
    ...(d.imageUrl ? { imageUrl: d.imageUrl } : {}),
  };
  const db = await getDb();
  if (d.id) {
    await db.update(schema.dishes).set(values).where(and(eq(schema.dishes.id, d.id), eq(schema.dishes.restaurantId, restaurant.id)));
  } else {
    const count = await db.select({ n: sql<number>`count(*)::int` }).from(schema.dishes).where(eq(schema.dishes.restaurantId, restaurant.id));
    await db.insert(schema.dishes).values({ id: newId("d"), restaurantId: restaurant.id, sort: (count[0]?.n ?? 0) + 1, ...values });
    await logEvent(user.id, restaurant.id, "menu", `Added ${d.name}`);
  }
  revalidatePath("/app/menu");
  return { ok: true };
}

export async function deleteDish(form: FormData) {
  const { restaurant } = await getClientContext();
  const db = await getDb();
  await db.delete(schema.dishes).where(and(eq(schema.dishes.id, String(form.get("id"))), eq(schema.dishes.restaurantId, restaurant.id)));
  revalidatePath("/app/menu");
}

export async function toggleAvailable(form: FormData) {
  const { restaurant } = await getClientContext();
  const db = await getDb();
  const id = String(form.get("id"));
  const row = (await db.select().from(schema.dishes).where(and(eq(schema.dishes.id, id), eq(schema.dishes.restaurantId, restaurant.id))).limit(1))[0];
  if (row) await db.update(schema.dishes).set({ available: !row.available }).where(eq(schema.dishes.id, id));
  revalidatePath("/app/menu");
}

/* ---------- look, concierge, publishing ---------- */

export async function setTemplate(form: FormData) {
  const { restaurant } = await getClientContext();
  const key = String(form.get("template"));
  if (!TEMPLATES.some((t) => t.key === key)) return;
  const db = await getDb();
  await db.update(schema.restaurants).set({ template: key }).where(eq(schema.restaurants.id, restaurant.id));
  revalidatePath("/app/look");
}

export async function saveConcierge(form: FormData) {
  const { restaurant } = await getClientContext();
  const db = await getDb();
  const langs = form.getAll("languages").map(String).filter((l) => ["en", "fr", "es"].includes(l));
  await db
    .update(schema.restaurants)
    .set({
      languages: langs.length ? langs : ["en"],
      concierge: {
        tone: (String(form.get("tone")) as "warm" | "refined" | "playful") || "warm",
        greeting: String(form.get("greeting") || "").slice(0, 160),
        pairings: form.get("pairings") === "on",
        nutrition: form.get("nutrition") === "on",
        featured: form.getAll("featured").map(String),
      },
    })
    .where(eq(schema.restaurants.id, restaurant.id));
  revalidatePath("/app/concierge");
}

export async function setLive(form: FormData) {
  const { restaurant, user } = await getClientContext();
  const live = form.get("live") === "1";
  const db = await getDb();
  await db.update(schema.restaurants).set({ status: live ? "live" : "draft" }).where(eq(schema.restaurants.id, restaurant.id));
  await logEvent(user.id, restaurant.id, "publish", `${restaurant.name} ${live ? "went live" : "went back to draft"}`);
  revalidatePath("/app");
  revalidatePath("/app/share");
}

/* ---------- capture & studio requests ---------- */

export async function recordMedia(input: { kind: "photo" | "video" | "scan"; url: string; dishId: string; meta?: Record<string, unknown>; setAsDishPhoto?: boolean }) {
  const { restaurant, user } = await getClientContext();
  const db = await getDb();
  const dish = (await db.select().from(schema.dishes).where(and(eq(schema.dishes.id, input.dishId), eq(schema.dishes.restaurantId, restaurant.id))).limit(1))[0];
  if (!dish) throw new Error("Dish not found");
  await db.insert(schema.media).values({ id: newId("m"), restaurantId: restaurant.id, dishId: dish.id, kind: input.kind, url: input.url.startsWith("blob:") ? "local-only" : input.url, source: "client", meta: input.meta ?? {} });
  if (input.setAsDishPhoto && input.kind === "photo" && !input.url.startsWith("blob:")) await db.update(schema.dishes).set({ imageUrl: input.url }).where(eq(schema.dishes.id, dish.id));
  await logEvent(user.id, restaurant.id, "capture", `Captured ${input.kind === "scan" ? "a 360 scan" : `a ${input.kind}`} of ${dish.name}${input.meta?.frames ? ` (${input.meta.frames} frames)` : ""}`);
  revalidatePath("/app/capture");
  revalidatePath("/app/menu");
  return { ok: true };
}

export async function requestFilm(form: FormData) {
  const { restaurant, user } = await getClientContext();
  const flags = await getFlags();
  if (!flags.clientFilms) return;
  const engines = await getEngines();
  const db = await getDb();
  const dish = (await db.select().from(schema.dishes).where(and(eq(schema.dishes.id, String(form.get("dishId"))), eq(schema.dishes.restaurantId, restaurant.id))).limit(1))[0];
  if (!dish) return;
  const move = (String(form.get("move")) || "push-in") as CameraMove;
  const duration = Number(form.get("duration") || 5);
  const frame = String(form.get("frameUrl") || "") || dish.imageUrl || "";
  await createJob({
    kind: "film",
    engine: engines.film,
    restaurantId: restaurant.id,
    dishId: dish.id,
    origin: "client",
    createdBy: user.id,
    request: { prompt: filmPrompt({ dishName: dish.name, description: dish.description || dish.short, move }), imageUrl: frame, duration, aspect: "9:16" },
    meta: { move, sourceVideo: String(form.get("videoUrl") || "") || null },
  });
  await logEvent(user.id, restaurant.id, "film", `Ordered a film of ${dish.name}`);
  revalidatePath("/app/studio");
  redirect("/app/studio");
}

export async function requestModel(form: FormData) {
  const { restaurant, user } = await getClientContext();
  const engines = await getEngines();
  const db = await getDb();
  const dish = (await db.select().from(schema.dishes).where(and(eq(schema.dishes.id, String(form.get("dishId"))), eq(schema.dishes.restaurantId, restaurant.id))).limit(1))[0];
  if (!dish) return;
  const views = { front: String(form.get("front") || dish.imageUrl || ""), back: String(form.get("back") || dish.imageUrl || ""), left: String(form.get("left") || dish.imageUrl || ""), right: String(form.get("right") || dish.imageUrl || "") };
  await createJob({ kind: "model3d", engine: engines.model3d, restaurantId: restaurant.id, dishId: dish.id, origin: "client", createdBy: user.id, request: { prompt: dish.name, views }, meta: { frames: Number(form.get("frames") || 0) } });
  revalidatePath("/app/studio");
}

export async function requestRecreate(form: FormData) {
  const { restaurant, user } = await getClientContext();
  const flags = await getFlags();
  if (!flags.photoRecreation) return; // greyed out for clients until the owner turns it on
  const engines = await getEngines();
  const db = await getDb();
  const dish = (await db.select().from(schema.dishes).where(and(eq(schema.dishes.id, String(form.get("dishId"))), eq(schema.dishes.restaurantId, restaurant.id))).limit(1))[0];
  if (!dish) return;
  const style = (String(form.get("style")) || "editorial") as PhotoStyle;
  await createJob({ kind: "photo_recreate", engine: engines.image, restaurantId: restaurant.id, dishId: dish.id, origin: "client", createdBy: user.id, request: { prompt: recreatePrompt({ dishName: dish.name, style }), imageUrl: String(form.get("imageUrl") || dish.imageUrl || "") }, meta: { style } });
  revalidatePath("/app/studio");
  redirect("/app/studio");
}

export async function applyResultAsPhoto(form: FormData) {
  const { restaurant } = await getClientContext();
  const db = await getDb();
  const job = (await db.select().from(schema.jobs).where(and(eq(schema.jobs.id, String(form.get("jobId"))), eq(schema.jobs.restaurantId, restaurant.id))).limit(1))[0];
  if (!job?.dishId || !job.output.imageUrl) return;
  await db.update(schema.dishes).set({ imageUrl: String(job.output.imageUrl) }).where(eq(schema.dishes.id, job.dishId));
  revalidatePath("/app/studio");
}

export async function requestShoot() {
  const { restaurant, user } = await getClientContext();
  await logEvent(user.id, restaurant.id, "shoot", `${restaurant.name} requested an in-person shoot`);
  revalidatePath("/app/capture");
}

/* ---------- billing ---------- */

export async function choosePlan(form: FormData) {
  const { user, restaurant } = await getClientContext();
  const url = await startCheckout({ user, restaurant, planId: String(form.get("plan")), successPath: "/app/billing?done=1", cancelPath: "/app/billing" });
  redirect(url);
}

export async function manageBilling() {
  const { restaurant } = await getClientContext();
  const sub = await subscriptionFor(restaurant.id);
  redirect(await openPortal(sub?.stripeCustomerId ?? null, "/app/billing"));
}
