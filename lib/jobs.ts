import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { env, integrations } from "./env";
import { newId, newRef } from "./id";
import { engine as findEngine, estimateCents } from "./ai/engines";
import { firstUrl, getPrediction, startPrediction, type EngineRequest } from "./ai/replicate";
import { persist } from "./storage";
import { logEvent } from "./data";
import type { Job, JobKind } from "./db/schema";

export type NewJob = {
  kind: JobKind;
  engine: string;
  restaurantId?: string | null;
  dishId?: string | null;
  origin: "client" | "studio";
  createdBy: string;
  request: EngineRequest;
  meta?: Record<string, unknown>;
};

const BACKUP: Record<string, string> = { wan3: "h3lite" }; // MotionWren rule: a stalled Wan 3.0 scene retries once on H3 Lite.
const STALL_MS = 8 * 60 * 1000;
const DEMO_MS = 9000;

function demo() {
  return !integrations.replicate;
}

export async function createJob(j: NewJob): Promise<Job> {
  const db = await getDb();
  const e = findEngine(j.engine);
  if (!e) throw new Error("Unknown engine");
  const id = newId("j");
  const seconds = Number(j.request.duration ?? 5);
  const row = {
    id,
    ref: newRef(),
    restaurantId: j.restaurantId ?? null,
    dishId: j.dishId ?? null,
    kind: j.kind,
    engine: j.engine,
    status: "queued" as const,
    input: { ...j.request, ...j.meta, estimateCents: estimateCents(j.engine, seconds) },
    output: {},
    origin: j.origin,
    createdBy: j.createdBy,
  };
  await db.insert(schema.jobs).values(row);

  if (e.provider === "manual") {
    await update(id, { status: "review", error: "Waiting for the model file. Build it with Object Capture on your Mac, then upload the GLB/USDZ in Studio → 3D." });
  } else if (e.provider === "kiri") {
    await update(id, { status: "review", error: integrations.kiri ? "Frames saved. KIRI upload runs from Studio → 3D." : "KIRI is not connected yet (add KIRI_API_KEY). Frames are saved and ready." });
  } else if (demo()) {
    await update(id, { status: "running", providerId: `demo:${Date.now()}`, attempts: 1 });
  } else {
    try {
      const p = await startPrediction(j.engine, j.request);
      await update(id, { status: "running", providerId: p.id, attempts: 1 });
    } catch (err) {
      await update(id, { status: "failed", error: (err as Error).message });
    }
  }
  return (await db.select().from(schema.jobs).where(eq(schema.jobs.id, id)).limit(1))[0];
}

async function update(id: string, set: Partial<typeof schema.jobs.$inferInsert>) {
  const db = await getDb();
  await db.update(schema.jobs).set({ ...set, updatedAt: new Date() }).where(eq(schema.jobs.id, id));
}

/* Poll-on-read: a job page asks for fresh status; we check the provider and
   finish the job (copy files, attach to the dish, log cost). Works without
   webhooks, so preview deployments behind Vercel protection still complete. */
export async function refreshJob(job: Job): Promise<Job> {
  if (job.status !== "running" || !job.providerId) return job;
  const db = await getDb();

  if (job.providerId.startsWith("demo:")) {
    const started = Number(job.providerId.slice(5));
    if (Date.now() - started < DEMO_MS) return job;
    await finish(job, demoOutput(job), estimateCents(job.engine, Number(job.input.duration ?? 5)));
  } else {
    const p = await getPrediction(job.providerId);
    if (p.status === "succeeded") {
      const url = firstUrl(p.output);
      if (!url) {
        await update(job.id, { status: "failed", error: "The engine finished but returned no file." });
      } else {
        const ext = job.kind === "film" ? "mp4" : job.kind === "model3d" ? "glb" : "jpg";
        const saved = await persist(url, `jobs/${job.ref}.${ext}`);
        await finish(job, outputFor(job, saved), estimateCents(job.engine, Number(job.input.duration ?? 5)));
      }
    } else if (p.status === "failed" || p.status === "canceled") {
      await retryOrFail(job, p.error || "The engine stopped without a reason.", p.logs);
    } else if (Date.now() - new Date(job.updatedAt).getTime() > STALL_MS) {
      await retryOrFail(job, "The engine stalled for more than 8 minutes.");
    }
  }
  return (await db.select().from(schema.jobs).where(eq(schema.jobs.id, job.id)).limit(1))[0];
}

async function retryOrFail(job: Job, reason: string, logs?: string) {
  const backup = BACKUP[job.engine];
  if (backup && job.attempts < 2) {
    try {
      const p = await startPrediction(backup, job.input as unknown as EngineRequest);
      await update(job.id, { engine: backup, providerId: p.id, attempts: job.attempts + 1, error: `${reason} Retried on ${findEngine(backup)?.name}.` });
      return;
    } catch (err) {
      reason += ` Backup failed: ${(err as Error).message}`;
    }
  }
  // Keep the real reason (and the tail of the engine log, which Replicate deletes after about an hour).
  await update(job.id, { status: "failed", error: reason, output: logs ? { logTail: logs.slice(-1500) } : {} });
}

function outputFor(job: Job, url: string) {
  if (job.kind === "film") return { videoUrl: url, poster: (job.input as EngineRequest).imageUrl };
  if (job.kind === "model3d") return { glbUrl: url };
  return { imageUrl: url };
}

function demoOutput(job: Job) {
  const image = (job.input as EngineRequest).imageUrl || "/engine/assets/d_scallops.jpg";
  if (job.kind === "film") return { videoUrl: image.includes("risotto") ? "/samples/risotto-film.mp4" : "/samples/scallops-film.mp4", poster: image, sample: true };
  if (job.kind === "model3d") return { glbUrl: "/models/fondant.glb", sample: true };
  return { imageUrl: image, sample: true };
}

async function finish(job: Job, output: Record<string, unknown>, costCents: number) {
  const db = await getDb();
  await update(job.id, { status: "succeeded", output, costCents, error: null });
  // Attach the result to the dish so the live menu updates by itself.
  if (job.dishId) {
    if (job.kind === "film" && output.videoUrl && (job.origin === "client" || job.input.attach)) await db.update(schema.dishes).set({ videoUrl: String(output.videoUrl) }).where(eq(schema.dishes.id, job.dishId));
    if (job.kind === "model3d" && output.glbUrl) await db.update(schema.dishes).set({ modelGlbUrl: String(output.glbUrl) }).where(eq(schema.dishes.id, job.dishId));
  }
  const kind = job.kind === "film" ? "film" : job.kind === "model3d" ? "model" : "image";
  const url = String(output.videoUrl || output.glbUrl || output.imageUrl || "");
  if (url) await db.insert(schema.media).values({ id: newId("m"), restaurantId: job.restaurantId, dishId: job.dishId, kind, url, source: "ai", meta: { job: job.ref, engine: job.engine } });
  await logEvent(job.createdBy, job.restaurantId, "job", `${job.ref} finished (${findEngine(job.engine)?.name ?? job.engine})`);
}

/* Owner action: attach a hand-made model (Object Capture) or approve a job in review. */
export async function completeManually(jobId: string, output: Record<string, unknown>) {
  const db = await getDb();
  const job = (await db.select().from(schema.jobs).where(eq(schema.jobs.id, jobId)).limit(1))[0];
  if (!job) throw new Error("Job not found");
  await finish(job, { ...job.output, ...output }, job.costCents);
}

export const usingDemoEngines = () => demo();
export const appUrl = () => env.appUrl;
