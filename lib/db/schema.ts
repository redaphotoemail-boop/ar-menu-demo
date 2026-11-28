import { pgTable, text, integer, boolean, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";

/* Roles: owner (Reda), manager, finance, studio (staff) and client (a restaurant account). */
export type Role = "owner" | "manager" | "finance" | "studio" | "client";

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull().default(""),
    passwordHash: text("password_hash"),
    googleSub: text("google_sub"),
    role: text("role").$type<Role>().notNull().default("client"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("sessions_token_idx").on(t.tokenHash)],
);

export type Brand = { accent?: string; logoUrl?: string; tagline?: string };

export const restaurants = pgTable(
  "restaurants",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    city: text("city").notNull().default(""),
    cuisine: text("cuisine").notNull().default(""),
    template: text("template").notNull().default("veralight"),
    languages: jsonb("languages").$type<string[]>().notNull().default(["en"]),
    brand: jsonb("brand").$type<Brand>().notNull().default({}),
    concierge: jsonb("concierge").$type<ConciergeSettings>().notNull().default({}),
    onboardingStep: integer("onboarding_step").notNull().default(0),
    captureRoute: text("capture_route").notNull().default("phone"), // phone | photographer
    status: text("status").notNull().default("draft"), // draft | live | paused
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("restaurants_slug_idx").on(t.slug), index("restaurants_owner_idx").on(t.ownerUserId)],
);

export type ConciergeSettings = {
  tone?: "warm" | "refined" | "playful";
  greeting?: string;
  pairings?: boolean;
  nutrition?: boolean;
  featured?: string[]; // dish ids the concierge favours
};

export const dishes = pgTable(
  "dishes",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull().default("mains"), // starters | mains | desserts | drinks
    priceCents: integer("price_cents").notNull().default(0),
    short: text("short").notNull().default(""),
    description: text("description").notNull().default(""),
    ingredients: jsonb("ingredients").$type<string[]>().notNull().default([]),
    allergens: jsonb("allergens").$type<string[]>().notNull().default([]),
    allergensConfirmed: boolean("allergens_confirmed").notNull().default(false),
    kcal: integer("kcal"),
    protein: integer("protein"),
    carbs: integer("carbs"),
    fat: integer("fat"),
    prepMinutes: integer("prep_minutes"),
    spice: integer("spice").notNull().default(-1), // -1 none, 0-3
    tags: jsonb("tags").$type<string[]>().notNull().default([]), // vegetarian, vegan, gluten-free, high-protein, low-carb, signature
    pairing: text("pairing").notNull().default(""),
    chefNote: text("chef_note").notNull().default(""),
    translations: jsonb("translations").$type<Record<string, DishText>>().notNull().default({}),
    imageUrl: text("image_url"),
    videoUrl: text("video_url"),
    modelGlbUrl: text("model_glb_url"),
    modelUsdzUrl: text("model_usdz_url"),
    sort: integer("sort").notNull().default(0),
    available: boolean("available").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("dishes_restaurant_idx").on(t.restaurantId)],
);

export type DishText = { name?: string; short?: string; description?: string; ingredients?: string[]; allergens?: string[]; chefNote?: string; pairing?: string };

export type MediaKind = "photo" | "video" | "scan" | "model" | "film" | "image";

export const media = pgTable(
  "media",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id"),
    dishId: text("dish_id"),
    kind: text("kind").$type<MediaKind>().notNull(),
    url: text("url").notNull(),
    source: text("source").notNull().default("client"), // client | studio | ai
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("media_restaurant_idx").on(t.restaurantId)],
);

export type JobKind = "film" | "photo_recreate" | "model3d" | "image_create";
export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "review";

export const jobs = pgTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    ref: text("ref").notNull(), // short human reference, e.g. TW-4F2K
    restaurantId: text("restaurant_id"),
    dishId: text("dish_id"),
    kind: text("kind").$type<JobKind>().notNull(),
    engine: text("engine").notNull(),
    status: text("status").$type<JobStatus>().notNull().default("queued"),
    input: jsonb("input").$type<Record<string, unknown>>().notNull().default({}),
    output: jsonb("output").$type<Record<string, unknown>>().notNull().default({}),
    providerId: text("provider_id"),
    costCents: integer("cost_cents").notNull().default(0),
    error: text("error"),
    attempts: integer("attempts").notNull().default(0),
    origin: text("origin").notNull().default("client"), // client | studio
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("jobs_restaurant_idx").on(t.restaurantId), index("jobs_status_idx").on(t.status)],
);

export const plans = pgTable("plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  priceCents: integer("price_cents").notNull(),
  blurb: text("blurb").notNull().default(""),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  limits: jsonb("limits").$type<{ dishes?: number; arDishes?: number; filmsPerMonth?: number; templates?: number }>().notNull().default({}),
  stripePriceId: text("stripe_price_id"),
  highlight: boolean("highlight").notNull().default(false),
  active: boolean("active").notNull().default(true),
  sort: integer("sort").notNull().default(0),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id").notNull(),
    planId: text("plan_id").notNull(),
    status: text("status").notNull().default("active"), // trialing | active | past_due | canceled
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("subs_restaurant_idx").on(t.restaurantId)],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id"),
    restaurantId: text("restaurant_id"),
    action: text("action").notNull(),
    detail: text("detail").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("events_created_idx").on(t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Restaurant = typeof restaurants.$inferSelect;
export type Dish = typeof dishes.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Media = typeof media.$inferSelect;
export type EventRow = typeof events.$inferSelect;
