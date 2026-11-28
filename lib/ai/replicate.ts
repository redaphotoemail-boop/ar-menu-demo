import "server-only";
import { env } from "../env";
import { engine as findEngine } from "./engines";
import { FOOD_NEGATIVE } from "./prompts";

const API = "https://api.replicate.com/v1";

export type Prediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: unknown;
  error?: string | null;
  logs?: string;
  metrics?: { predict_time?: number };
};

export type EngineRequest = {
  prompt: string;
  imageUrl?: string; // first frame / reference photo
  views?: { front: string; back: string; left: string; right: string }; // 3D multi-view
  referenceVideoUrl?: string; // H3 can follow a client's video
  duration?: number;
  aspect?: "16:9" | "9:16" | "1:1" | "4:5";
};

/* Input shapes per engine. Wan 3.0 / H3 mirror MotionWren's working shapes. */
export function buildInput(key: string, r: EngineRequest): Record<string, unknown> {
  switch (key) {
    case "wan3":
      return { image: r.imageUrl, prompt: r.prompt.slice(0, 3600), resolution: "720p", aspect_ratio: r.aspect === "4:5" ? "9:16" : r.aspect ?? "9:16", duration: r.duration ?? 5, enable_prompt_expansion: false, negative_prompt: FOOD_NEGATIVE };
    case "h3":
    case "h3highspeed":
    case "h3lite": {
      const input: Record<string, unknown> = { prompt: r.prompt.slice(0, 3700), duration: Math.max(4, r.duration ?? 5), resolution: key === "h3lite" ? "768P" : "768P" };
      if (r.imageUrl) input.first_frame_image = r.imageUrl;
      if (r.referenceVideoUrl && key === "h3") input.reference_video_urls = [r.referenceVideoUrl];
      return input;
    }
    case "flux-kontext-pro":
      return { prompt: `${r.prompt} Avoid: ${FOOD_NEGATIVE}.`, input_image: r.imageUrl, aspect_ratio: "match_input_image", output_format: "jpg", safety_tolerance: 2 };
    case "nano-banana":
      return { prompt: `${r.prompt} Avoid: ${FOOD_NEGATIVE}.`, image_input: r.imageUrl ? [r.imageUrl] : [], output_format: "jpg" };
    case "flux-pro":
      return { prompt: `${r.prompt} Avoid: ${FOOD_NEGATIVE}.`, aspect_ratio: r.aspect ?? "4:5", output_format: "jpg" };
    case "hunyuan3d-2mv":
      return { front_image: r.views?.front, back_image: r.views?.back, left_image: r.views?.left, right_image: r.views?.right, file_type: "glb", steps: 30, seed: 1234 };
    default:
      throw new Error(`Engine ${key} cannot be run through Replicate.`);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.replicateToken}`, "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Replicate ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
}

export async function startPrediction(key: string, request: EngineRequest): Promise<Prediction> {
  const e = findEngine(key);
  if (!e || e.provider !== "replicate") throw new Error(`Unknown Replicate engine: ${key}`);
  const input = buildInput(key, request);
  if (e.version) return call<Prediction>("/predictions", { method: "POST", body: JSON.stringify({ version: e.version, input }) });
  return call<Prediction>(`/models/${e.endpoint}/predictions`, { method: "POST", body: JSON.stringify({ input }) });
}

export function getPrediction(id: string) {
  return call<Prediction>(`/predictions/${id}`);
}

/* Replicate returns a string, an array, or an object. Take the first file URL. */
export function firstUrl(output: unknown): string | null {
  if (!output) return null;
  if (typeof output === "string") return output.startsWith("http") ? output : null;
  if (Array.isArray(output)) {
    for (const item of output) {
      const u = firstUrl(item);
      if (u) return u;
    }
    return null;
  }
  if (typeof output === "object") {
    for (const v of Object.values(output as Record<string, unknown>)) {
      const u = firstUrl(v);
      if (u) return u;
    }
  }
  return null;
}
