/* Engine catalog. Replicate endpoints and input shapes for Wan 3.0 and H3 are
   the ones already proven in MotionWren (same Replicate wallet). Prices are
   per second of video or per generation, in dollars. */

export type EngineKind = "film" | "image" | "model3d";

export type Engine = {
  key: string;
  kind: EngineKind;
  name: string;
  note: string;
  provider: "replicate" | "kiri" | "manual";
  endpoint?: string; // models/{owner}/{name}
  version?: string; // community models run by version
  priceCents: number; // per second for films, per run otherwise
  perSecond?: boolean;
  experimental?: boolean;
};

export const ENGINES: Engine[] = [
  { key: "wan3", kind: "film", name: "Wan 3.0", note: "Primary. Natural camera feel, keeps the photo unchanged.", provider: "replicate", endpoint: "alibaba/wan-3", priceCents: 7, perSecond: true },
  { key: "h3", kind: "film", name: "MiniMax H3", note: "Fine detail. Can also follow a reference video.", provider: "replicate", endpoint: "minimax/h3", priceCents: 8, perSecond: true },
  { key: "h3highspeed", kind: "film", name: "H3 Highspeed", note: "Faster, everyday quality.", provider: "replicate", endpoint: "minimax/h3-highspeed", priceCents: 6, perSecond: true },
  { key: "h3lite", kind: "film", name: "H3 Lite", note: "Backup engine when Wan 3.0 stalls. Drafts.", provider: "replicate", endpoint: "minimax/h3-lite", priceCents: 4, perSecond: true },

  { key: "flux-kontext-pro", kind: "image", name: "FLUX Kontext Pro", note: "Edits a reference photo while keeping the dish.", provider: "replicate", endpoint: "black-forest-labs/flux-kontext-pro", priceCents: 4 },
  { key: "nano-banana", kind: "image", name: "Gemini Image (Nano Banana)", note: "Strong at keeping real details from a photo.", provider: "replicate", endpoint: "google/nano-banana", priceCents: 4 },
  { key: "flux-pro", kind: "image", name: "FLUX 1.1 Pro", note: "Text to image, for mood and marketing shots.", provider: "replicate", endpoint: "black-forest-labs/flux-1.1-pro", priceCents: 4 },

  { key: "hunyuan3d-2mv", kind: "model3d", name: "Hunyuan3D multi-view", note: "Fast AR model from 4 sides of the plate (front, back, left, right).", provider: "replicate", endpoint: "tencent/hunyuan3d-2mv", version: "71798fbc3c9f7b7097e3bb85496e5a797d8b8f616b550692e7c3e176a8e9e5db", priceCents: 16 },
  { key: "kiri", kind: "model3d", name: "KIRI photogrammetry", note: "True photogrammetry from the full 360 capture. $1 a scan (KIRI needs a $500 top-up to start).", provider: "kiri", priceCents: 100 },
  { key: "object-capture", kind: "model3d", name: "Apple Object Capture (Mac)", note: "Best quality. Shoot, build on your Mac for free, upload the USDZ/GLB here.", provider: "manual", priceCents: 0 },
];

export function engine(key: string) {
  return ENGINES.find((e) => e.key === key);
}

export function enginesOf(kind: EngineKind) {
  return ENGINES.filter((e) => e.kind === kind);
}

export function estimateCents(key: string, seconds = 5) {
  const e = engine(key);
  if (!e) return 0;
  return e.perSecond ? e.priceCents * seconds : e.priceCents;
}

export const FILM_DURATIONS = [5, 8, 10] as const;
