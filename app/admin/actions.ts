"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { VIEW_AS_COOKIE } from "@/lib/client";
import { getEngines, getFlags, logEvent, setSetting } from "@/lib/data";
import { newId } from "@/lib/id";
import { completeManually, createJob } from "@/lib/jobs";
import { activate } from "@/lib/billing";
import { filmPrompt, studioImagePrompt, type CameraMove, type PhotoStyle } from "@/lib/ai/prompts";
import { engine } from "@/lib/ai/engines";
import type { Flags } from "@/lib/defaults";
import type { Role } from "@/lib/db/schema";

/* ---------- client view ---------- */

export async function viewAs(form: FormData) {
  await requireStaff();
  (await cookies()).set(VIEW_AS_COOKIE, String(form.get("rid")), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 3600 });
  redirect("/app");
}

export async function stopViewingAs() {
  (await cookies()).delete(VIEW_AS_COOKIE);
  redirect("/admin/clients");
}

export async function setRestaurantStatus(form: FormData) {
  const me = await requireStaff(["owner", "manager"]);
  const db = await getDb();
  const id = String(form.get("rid"));
  const status = String(form.get("status"));
  if (!["live", "draft", "paused"].includes(status)) return;
  await db.update(schema.restaurants).set({ status }).where(eq(schema.restaurants.id, id));
  await logEvent(me.id, id, "status", `Status set to ${status}`);
  revalidatePath(`/admin/clients/${id}`);
}

export async function setPlanFor(form: FormData) {
  await requireStaff(["owner", "manager", "finance"]);
  const rid = String(form.get("rid"));
  await activate(rid, String(form.get("plan")), { status: String(form.get("status") || "active") });
  revalidatePath(`/admin/clients/${rid}`);
}

/* ---------- settings ---------- */

export async function toggleFlag(form: FormData) {
  const me = await requireStaff(["owner"]);
  const flags = await getFlags();
  const key = String(form.get("key")) as keyof Flags;
  if (!(key in flags)) return;
  const next = { ...flags, [key]: !flags[key] };
  await setSetting("flags", next);
  await logEvent(me.id, null, "settings", `${key} turned ${next[key] ? "on" : "off"}`);
  revalidatePath("/admin/settings");
}

export async function saveEngines(form: FormData) {
  await requireStaff(["owner"]);
  const current = await getEngines();
  const pick = (k: keyof typeof current) => {
    const v = String(form.get(k) || current[k]);
    return engine(v) ? v : current[k];
  };
  await setSetting("engines", { film: pick("film"), filmBackup: pick("filmBackup"), image: pick("image"), model3d: pick("model3d") });
  revalidatePath("/admin/settings");
}

/* ---------- plans ---------- */

export async function savePlan(form: FormData) {
  await requireStaff(["owner", "finance"]);
  const db = await getDb();
  const id = String(form.get("id"));
  await db
    .update(schema.plans)
    .set({
      name: String(form.get("name") || "").trim() || "Plan",
      priceCents: Math.round(Number(form.get("price") || 0) * 100),
      blurb: String(form.get("blurb") || ""),
      features: String(form.get("features") || "").split("\n").map((s) => s.trim()).filter(Boolean),
      limits: {
        dishes: Number(form.get("dishes") || 0),
        arDishes: Number(form.get("arDishes") || 0),
        filmsPerMonth: Number(form.get("filmsPerMonth") || 0),
        templates: Number(form.get("templates") || 1),
      },
      stripePriceId: String(form.get("stripePriceId") || "").trim() || null,
      highlight: form.get("highlight") === "on",
      active: form.get("active") === "on",
    })
    .where(eq(schema.plans.id, id));
  revalidatePath("/admin/plans");
}

/* ---------- team ---------- */

export async function addStaff(form: FormData) {
  const me = await requireStaff(["owner"]);
  const email = String(form.get("email") || "").trim().toLowerCase();
  const role = String(form.get("role")) as Role;
  if (!email.includes("@") || !["manager", "finance", "studio"].includes(role)) return;
  const db = await getDb();
  const existing = (await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1))[0];
  if (existing) await db.update(schema.users).set({ role }).where(eq(schema.users.id, existing.id));
  else await db.insert(schema.users).values({ id: newId("u"), email, name: String(form.get("name") || email.split("@")[0]), role });
  await logEvent(me.id, null, "team", `${email} added as ${role}`);
  revalidatePath("/admin/team");
}

export async function setRole(form: FormData) {
  const me = await requireStaff(["owner"]);
  const id = String(form.get("id"));
  const role = String(form.get("role")) as Role;
  if (id === me.id || !["manager", "finance", "studio", "client"].includes(role)) return;
  const db = await getDb();
  await db.update(schema.users).set({ role }).where(eq(schema.users.id, id));
  revalidatePath("/admin/team");
}

export async function setUserStatus(form: FormData) {
  const me = await requireStaff(["owner", "manager"]);
  const id = String(form.get("id"));
  if (id === me.id) return;
  const status = String(form.get("status")) === "suspended" ? "suspended" : "active";
  const db = await getDb();
  await db.update(schema.users).set({ status }).where(eq(schema.users.id, id));
  if (status === "suspended") await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
  revalidatePath("/admin/team");
  revalidatePath("/admin/clients");
}

/* ---------- studio ---------- */

export async function studioImage(form: FormData) {
  const me = await requireStaff(["owner", "manager", "studio"]);
  const engines = await getEngines();
  const reference = String(form.get("imageUrl") || "");
  const chosen = String(form.get("engine") || (reference ? engines.image : "flux-pro"));
  const key = !reference && chosen !== "flux-pro" ? "flux-pro" : chosen; // text-only needs a text-to-image engine
  const prompt = studioImagePrompt({ subject: String(form.get("subject") || "a signature dish"), style: (String(form.get("style")) || "editorial") as PhotoStyle, extra: String(form.get("extra") || ""), hasReference: Boolean(reference) });
  await createJob({ kind: "image_create", engine: key, origin: "studio", createdBy: me.id, restaurantId: String(form.get("rid") || "") || null, dishId: String(form.get("dishId") || "") || null, request: { prompt, imageUrl: reference || undefined, aspect: "4:5" } });
  revalidatePath("/admin/studio");
}

export async function studioFilm(form: FormData) {
  const me = await requireStaff(["owner", "manager", "studio"]);
  const engines = await getEngines();
  const key = String(form.get("engine") || engines.film);
  const move = (String(form.get("move")) || "push-in") as CameraMove;
  const dishId = String(form.get("dishId") || "") || null;
  let imageUrl = String(form.get("imageUrl") || "");
  let dishName = String(form.get("subject") || "the dish");
  let rid: string | null = null;
  if (dishId) {
    const db = await getDb();
    const d = (await db.select().from(schema.dishes).where(eq(schema.dishes.id, dishId)).limit(1))[0];
    if (d) {
      imageUrl ||= d.imageUrl ?? "";
      dishName = d.name;
      rid = d.restaurantId;
    }
  }
  if (!imageUrl) return;
  await createJob({ kind: "film", engine: key, origin: "studio", createdBy: me.id, restaurantId: rid, dishId, request: { prompt: filmPrompt({ dishName, move, mood: String(form.get("mood") || "") || undefined }), imageUrl, duration: Number(form.get("duration") || 5), aspect: (String(form.get("aspect")) as "9:16" | "16:9" | "1:1") || "9:16" }, meta: { move, attach: form.get("attach") === "on" } });
  revalidatePath("/admin/studio");
}

export async function studio3d(form: FormData) {
  const me = await requireStaff(["owner", "manager", "studio"]);
  const engines = await getEngines();
  const key = String(form.get("engine") || engines.model3d);
  const dishId = String(form.get("dishId") || "") || null;
  let rid: string | null = null;
  if (dishId) {
    const db = await getDb();
    rid = (await db.select().from(schema.dishes).where(eq(schema.dishes.id, dishId)).limit(1))[0]?.restaurantId ?? null;
  }
  const v = (k: string) => String(form.get(k) || "");
  const front = v("front");
  await createJob({ kind: "model3d", engine: key, origin: "studio", createdBy: me.id, restaurantId: rid, dishId, request: { prompt: v("subject") || "dish", views: { front, back: v("back") || front, left: v("left") || front, right: v("right") || front } } });
  revalidatePath("/admin/studio");
}

/* Attach a finished model (e.g. built with Apple Object Capture on the Mac) to a dish. */
export async function attachModel(form: FormData) {
  const me = await requireStaff(["owner", "manager", "studio"]);
  const db = await getDb();
  const dishId = String(form.get("dishId"));
  const glb = String(form.get("glbUrl") || "");
  const usdz = String(form.get("usdzUrl") || "");
  const jobId = String(form.get("jobId") || "");
  if (jobId) {
    await completeManually(jobId, { glbUrl: glb });
  }
  if (dishId && (glb || usdz)) {
    await db.update(schema.dishes).set({ ...(glb ? { modelGlbUrl: glb } : {}), ...(usdz ? { modelUsdzUrl: usdz } : {}) }).where(eq(schema.dishes.id, dishId));
    const d = (await db.select().from(schema.dishes).where(eq(schema.dishes.id, dishId)).limit(1))[0];
    await logEvent(me.id, d?.restaurantId ?? null, "model", `AR model attached to ${d?.name}`);
  }
  revalidatePath("/admin/studio");
  revalidatePath("/admin/jobs");
}

/* ---------- jobs ---------- */

export async function approveJob(form: FormData) {
  await requireStaff(["owner", "manager", "studio"]);
  await completeManually(String(form.get("id")), {});
  revalidatePath("/admin/jobs");
}

export async function retryJob(form: FormData) {
  const me = await requireStaff(["owner", "manager", "studio"]);
  const db = await getDb();
  const job = (await db.select().from(schema.jobs).where(eq(schema.jobs.id, String(form.get("id")))).limit(1))[0];
  if (!job) return;
  const engineKey = String(form.get("engine") || job.engine);
  await createJob({ kind: job.kind, engine: engineKey, restaurantId: job.restaurantId, dishId: job.dishId, origin: job.origin as "client" | "studio", createdBy: me.id, request: job.input as never, meta: { retryOf: job.ref } });
  revalidatePath("/admin/jobs");
}

/* Truly deletes the job record (not hidden). Files copied to Blob are removed separately from Storage. */
export async function deleteJob(form: FormData) {
  await requireStaff(["owner", "manager", "studio"]);
  const db = await getDb();
  await db.delete(schema.jobs).where(eq(schema.jobs.id, String(form.get("id"))));
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/studio");
}
