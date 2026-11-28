import "server-only";
import { sql } from "drizzle-orm";
import type { DB } from "./index";
import * as s from "./schema";
import { DEFAULT_ENGINES, DEFAULT_FLAGS } from "../defaults";
import { env } from "../env";

/* Base rows every install needs: membership plans (draft prices — edit them in
   Owner → Plans) and default settings. Idempotent. */
export async function seedBase(db: DB) {
  const existing = await db.select({ n: sql<number>`count(*)::int` }).from(s.plans);
  if (!existing[0] || existing[0].n === 0) {
    await db.insert(s.plans).values([
      {
        id: "essential",
        name: "Essential",
        priceCents: 14900,
        blurb: "The AI menu, beautifully done.",
        features: ["One signature template", "Up to 30 dishes", "AI Concierge with allergens and nutrition", "Guided phone capture", "3 dishes in AR", "QR codes for every table"],
        limits: { dishes: 30, arDishes: 3, filmsPerMonth: 0, templates: 1 },
        sort: 1,
      },
      {
        id: "signature",
        name: "Signature",
        priceCents: 29900,
        blurb: "Your best dishes, on every table.",
        features: ["Everything in Essential", "All 10 templates", "12 dishes in AR", "2 dish films a month", "Wine and cocktail pairings", "Menu on your own website"],
        limits: { dishes: 80, arDishes: 12, filmsPerMonth: 2, templates: 10 },
        highlight: true,
        sort: 2,
      },
      {
        id: "studio",
        name: "Studio",
        priceCents: 59900,
        blurb: "Your whole menu, made cinematic.",
        features: ["Everything in Signature", "Unlimited AR dishes", "6 dish films a month", "A pro shoot each quarter, at cost", "Priority turnaround", "Multiple locations"],
        limits: { dishes: 500, arDishes: 999, filmsPerMonth: 6, templates: 10 },
        sort: 3,
      },
    ]);
  }
  await db
    .insert(s.settings)
    .values([
      { key: "flags", value: DEFAULT_FLAGS },
      { key: "engines", value: DEFAULT_ENGINES },
    ])
    .onConflictDoNothing();
}

const img = (f: string) => `/engine/assets/${f}`;
const days = (n: number) => new Date(Date.now() - n * 86400000);
const ahead = (n: number) => new Date(Date.now() + n * 86400000);

/* Sample restaurants for demo mode. Only runs on an empty database. */
export async function seedDemo(db: DB) {
  const existing = await db.select({ n: sql<number>`count(*)::int` }).from(s.users);
  if (existing[0] && existing[0].n > 0) return;

  const ownerEmail = env.adminEmails[0] || "owner@tablewren.demo";
  await db.insert(s.users).values([
    { id: "u_owner", email: ownerEmail, name: "Reda Mokhtari", role: "owner", createdAt: days(40) },
    { id: "u_mgr", email: "manager@tablewren.demo", name: "Sam Rivera", role: "manager", createdAt: days(30) },
    { id: "u_fin", email: "finance@tablewren.demo", name: "Ines Haddad", role: "finance", createdAt: days(25) },
    { id: "u_vera", email: "chef@vera.demo", name: "Élise Martin", role: "client", createdAt: days(21) },
    { id: "u_noir", email: "gm@noir.demo", name: "Marcus Hale", role: "client", createdAt: days(18) },
    { id: "u_maison", email: "owner@maisonverte.demo", name: "Camille Dubois", role: "client", createdAt: days(6) },
    { id: "u_kinara", email: "hello@kinara.demo", name: "Priya Nair", role: "client", createdAt: days(12) },
    { id: "u_lumina", email: "team@lumina.demo", name: "Luca Bianchi", role: "client", createdAt: days(33) },
  ]);

  await db.insert(s.restaurants).values([
    { id: "r_vera", ownerUserId: "u_vera", name: "Véra", slug: "vera", city: "Boston, MA", cuisine: "Modern Mediterranean", template: "verasand", languages: ["en", "fr", "es"], status: "live", onboardingStep: 6, concierge: { tone: "warm", pairings: true, nutrition: true, featured: ["d_vera_scallops"] }, createdAt: days(21) },
    { id: "r_noir", ownerUserId: "u_noir", name: "Noir", slug: "noir", city: "Back Bay, Boston", cuisine: "Steakhouse", template: "noir", status: "live", onboardingStep: 6, concierge: { tone: "refined", pairings: true, nutrition: true }, createdAt: days(18) },
    { id: "r_maison", ownerUserId: "u_maison", name: "Maison Vertè", slug: "maison-verte", city: "Cambridge, MA", cuisine: "French bistro", template: "maison", status: "draft", onboardingStep: 3, createdAt: days(6) },
    { id: "r_kinara", ownerUserId: "u_kinara", name: "Kinara", slug: "kinara", city: "Worcester, MA", cuisine: "Modern Indian", template: "kinara", status: "live", onboardingStep: 6, createdAt: days(12) },
    { id: "r_lumina", ownerUserId: "u_lumina", name: "Lùmina", slug: "lumina", city: "Seaport, Boston", cuisine: "Italian", template: "lumina", status: "paused", onboardingStep: 6, createdAt: days(33) },
  ]);

  const vera: (typeof s.dishes.$inferInsert)[] = [
    { id: "d_vera_scallops", restaurantId: "r_vera", name: "Seared Scallops", category: "starters", priceCents: 2800, short: "Cauliflower, citrus, micro herbs", description: "Caramelized scallops, cauliflower purée, citrus beurre blanc, micro herbs.", ingredients: ["Scallops", "Cauliflower", "Citrus", "Micro herbs"], allergens: ["Shellfish", "Dairy"], allergensConfirmed: true, kcal: 380, protein: 28, carbs: 14, fat: 22, prepMinutes: 15, spice: 0, tags: ["signature", "high-protein", "low-carb", "gluten-free"], pairing: "Chablis · $16 a glass", chefNote: "Seared hard in brown butter and plated warm.", imageUrl: img("d_scallops.jpg"), videoUrl: "/samples/scallops-film.mp4", sort: 1,
      translations: { fr: { name: "Noix de Saint-Jacques", short: "Chou-fleur, agrumes, jeunes pousses" }, es: { name: "Vieiras selladas", short: "Coliflor, cítricos, microhierbas" } } },
    { id: "d_vera_lamb", restaurantId: "r_vera", name: "Herb-Crusted Lamb", category: "mains", priceCents: 4200, short: "Herb crust, seasonal jus", description: "Rack of lamb, herb crust, spring vegetables, rosemary jus.", ingredients: ["Lamb", "Herb crust", "Spring vegetables", "Rosemary"], allergens: ["Gluten"], allergensConfirmed: true, kcal: 640, protein: 46, carbs: 22, fat: 38, prepMinutes: 25, spice: 1, tags: ["signature", "high-protein"], pairing: "Syrah · $18 a glass", chefNote: "Roasted to medium-rare and rested before carving.", imageUrl: img("d_lamb.jpg"), sort: 2 },
    { id: "d_vera_risotto", restaurantId: "r_vera", name: "Maine Lobster Risotto", category: "mains", priceCents: 4800, short: "Citrus beurre blanc, fennel", description: "Maine lobster, creamy risotto, citrus beurre blanc, fennel.", ingredients: ["Lobster", "Arborio rice", "Citrus", "Fennel"], allergens: ["Shellfish", "Dairy"], allergensConfirmed: true, kcal: 720, protein: 34, carbs: 68, fat: 30, prepMinutes: 22, spice: 0, tags: ["gluten-free"], pairing: "Chardonnay · $17 a glass", chefNote: "Stirred to order, finished with a little foam.", imageUrl: img("d_risotto.jpg"), videoUrl: "/samples/risotto-film.mp4", sort: 3 },
    { id: "d_vera_fondant", restaurantId: "r_vera", name: "Chocolate Fondant", category: "desserts", priceCents: 1600, short: "Raspberry, vanilla", description: "Warm chocolate fondant, molten center, raspberry, vanilla.", ingredients: ["Dark chocolate", "Raspberry", "Vanilla ice cream", "Mint"], allergens: ["Gluten", "Eggs", "Dairy"], allergensConfirmed: true, kcal: 480, protein: 6, carbs: 52, fat: 26, prepMinutes: 12, spice: -1, tags: ["vegetarian"], pairing: "Vin Santo · $13 a glass", chefNote: "Baked to order. Allow twelve minutes.", imageUrl: img("dessert.jpg"), modelGlbUrl: "/models/fondant.glb", sort: 4 },
    { id: "d_vera_salmon", restaurantId: "r_vera", name: "Cured Salmon", category: "starters", priceCents: 2400, short: "Citrus, fennel, herbs", description: "House-cured salmon, citrus segments, shaved fennel, fresh herbs.", ingredients: ["Salmon", "Citrus", "Fennel", "Herbs"], allergens: ["Fish"], allergensConfirmed: true, kcal: 320, protein: 24, carbs: 8, fat: 18, prepMinutes: 10, spice: -1, tags: ["high-protein", "low-carb", "gluten-free"], pairing: "Sancerre · $15 a glass", chefNote: "Cured for two days and sliced to order.", imageUrl: img("t_salmon.jpg"), sort: 5 },
    { id: "d_vera_tart", restaurantId: "r_vera", name: "Raspberry Tart", category: "desserts", priceCents: 1400, short: "Raspberry, vanilla cream", description: "Buttery tart shell, vanilla cream, fresh raspberries, gold leaf.", ingredients: ["Raspberry", "Vanilla cream", "Butter pastry", "Gold leaf"], allergens: ["Gluten", "Eggs", "Dairy"], allergensConfirmed: true, kcal: 410, protein: 5, carbs: 48, fat: 22, prepMinutes: 8, spice: -1, tags: ["vegetarian"], pairing: "Moscato · $12 a glass", chefNote: "Assembled at the pass, just before it leaves.", imageUrl: img("t_tart.jpg"), sort: 6 },
  ];
  const copyTo = (rid: string, prefix: string, picks: number[]) =>
    picks.map((i, n) => ({ ...vera[i], id: `d_${prefix}_${n}`, restaurantId: rid, sort: n + 1, modelGlbUrl: vera[i].modelGlbUrl ?? null }));
  await db.insert(s.dishes).values([
    ...vera,
    ...copyTo("r_noir", "noir", [2, 1, 0, 3]),
    ...copyTo("r_maison", "maison", [0, 1, 5]),
    ...copyTo("r_kinara", "kinara", [0, 1, 2, 3, 4]),
    ...copyTo("r_lumina", "lumina", [0, 1, 2]),
  ]);

  await db.insert(s.subscriptions).values([
    { id: "sub_vera", restaurantId: "r_vera", planId: "signature", status: "active", currentPeriodEnd: ahead(9), createdAt: days(21) },
    { id: "sub_noir", restaurantId: "r_noir", planId: "studio", status: "active", currentPeriodEnd: ahead(12), createdAt: days(18) },
    { id: "sub_maison", restaurantId: "r_maison", planId: "signature", status: "trialing", currentPeriodEnd: ahead(8), createdAt: days(6) },
    { id: "sub_kinara", restaurantId: "r_kinara", planId: "essential", status: "active", currentPeriodEnd: ahead(18), createdAt: days(12) },
    { id: "sub_lumina", restaurantId: "r_lumina", planId: "signature", status: "past_due", currentPeriodEnd: days(2), createdAt: days(33) },
  ]);

  await db.insert(s.jobs).values([
    { id: "j1", ref: "TW-7KQ2M", restaurantId: "r_vera", dishId: "d_vera_scallops", kind: "film", engine: "wan3", status: "succeeded", input: { duration: 10, move: "push-in" }, output: { videoUrl: "/samples/scallops-film.mp4", poster: img("d_scallops.jpg"), sample: true }, costCents: 70, attempts: 1, origin: "client", createdBy: "u_vera", createdAt: days(3), updatedAt: days(3) },
    { id: "j2", ref: "TW-3HXA9", restaurantId: "r_vera", dishId: "d_vera_fondant", kind: "model3d", engine: "hunyuan3d-2mv", status: "succeeded", input: { views: 4, imageUrl: img("dessert.jpg") }, output: { glbUrl: "/models/fondant.glb", sample: true }, costCents: 16, attempts: 1, origin: "client", createdBy: "u_vera", createdAt: days(5), updatedAt: days(5) },
    { id: "j3", ref: "TW-9PLD4", restaurantId: "r_noir", dishId: "d_noir_0", kind: "film", engine: "wan3", status: "running", input: { duration: 10, move: "orbit", imageUrl: img("d_risotto.jpg") }, output: {}, costCents: 0, attempts: 1, origin: "client", createdBy: "u_noir", createdAt: days(0), updatedAt: days(0) },
    { id: "j4", ref: "TW-2RVN8", restaurantId: "r_kinara", dishId: "d_kinara_2", kind: "film", engine: "h3lite", status: "review", input: { duration: 8, move: "macro" }, output: { videoUrl: "/samples/risotto-film.mp4", poster: img("d_risotto.jpg"), sample: true }, error: "Quality check flagged a soft first second. Waiting for your call.", costCents: 32, attempts: 2, origin: "client", createdBy: "u_kinara", createdAt: days(1), updatedAt: days(1) },
    { id: "j5", ref: "TW-6MWB3", restaurantId: null, dishId: null, kind: "image_create", engine: "flux-kontext-pro", status: "succeeded", input: { prompt: "Seared scallops on dark stoneware, side light" }, output: { imageUrl: img("d_scallops.jpg"), sample: true }, costCents: 4, attempts: 1, origin: "studio", createdBy: "u_owner", createdAt: days(2), updatedAt: days(2) },
    { id: "j6", ref: "TW-4TCE7", restaurantId: "r_lumina", dishId: "d_lumina_1", kind: "film", engine: "wan3", status: "failed", input: { duration: 10, move: "orbit", imageUrl: img("d_lamb.jpg") }, output: {}, error: "Wan 3.0 timed out after 6 min. The backup engine (H3 Lite) was not tried because the account is past due.", costCents: 0, attempts: 1, origin: "client", createdBy: "u_lumina", createdAt: days(4), updatedAt: days(4) },
  ]);

  await db.insert(s.events).values([
    { id: "e1", actorId: "u_maison", restaurantId: "r_maison", action: "signup", detail: "Camille Dubois created an account (Google)", createdAt: days(6) },
    { id: "e2", actorId: "u_maison", restaurantId: "r_maison", action: "trial", detail: "Started a Signature trial", createdAt: days(6) },
    { id: "e3", actorId: "u_vera", restaurantId: "r_vera", action: "capture", detail: "Uploaded a 360 capture of Chocolate Fondant (48 frames)", createdAt: days(5) },
    { id: "e4", actorId: "u_vera", restaurantId: "r_vera", action: "film", detail: "Ordered a film of Seared Scallops", createdAt: days(3) },
    { id: "e5", actorId: "u_kinara", restaurantId: "r_kinara", action: "review", detail: "A film is waiting for your review", createdAt: days(1) },
    { id: "e6", actorId: "u_noir", restaurantId: "r_noir", action: "film", detail: "Ordered a film of Maine Lobster Risotto", createdAt: days(0) },
  ]);
}
