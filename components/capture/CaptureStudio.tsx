"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Dish } from "@/lib/db/schema";
import type { Flags } from "@/lib/defaults";
import { CAMERA_MOVES, type CameraMove } from "@/lib/ai/prompts";
import { recordMedia, requestFilm, requestModel, requestShoot } from "@/app/app/actions";
import { uploadFile } from "@/lib/upload-client";
import { GuidedCamera, type CaptureMode, type CaptureResult } from "./GuidedCamera";
import { Icon } from "@/components/icons";

const MODES: { key: CaptureMode; title: string; sub: string; icon: keyof typeof Icon; time: string }[] = [
  { key: "photo", title: "Photos", sub: "Three guided angles for your menu.", icon: "camera", time: "1 min" },
  { key: "scan", title: "360 for AR", sub: "Walk around the plate. We build the AR model.", icon: "ar", time: "2 min" },
  { key: "video", title: "Dish video", sub: "10–20 seconds. We turn it into a premium film.", icon: "film", time: "1 min" },
];

export function CaptureStudio({ dishes, blobEnabled, flags, initialMode, initialDish }: { dishes: Dish[]; blobEnabled: boolean; flags: Flags; initialMode?: CaptureMode; initialDish?: string }) {
  const router = useRouter();
  const [dishId, setDishId] = useState(initialDish && dishes.some((d) => d.id === initialDish) ? initialDish : dishes[0]?.id ?? "");
  const [mode, setMode] = useState<CaptureMode | null>(null);
  const [film, setFilm] = useState<{ videoUrl: string; frameUrl: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<CaptureMode>(initialMode ?? "photo");
  const [pending, start] = useTransition();
  const dish = dishes.find((d) => d.id === dishId);

  async function handleDone(r: CaptureResult) {
    setMode(null);
    if (!dish) return;
    if (r.mode === "photo") {
      for (let i = 0; i < r.urls.length; i++) await recordMedia({ kind: "photo", url: r.urls[i], dishId: dish.id, meta: { angle: ["hero", "top", "side"][i] }, setAsDishPhoto: i === 0 });
      setMessage(`Saved ${r.urls.length} photos of ${dish.name}. The hero shot is now on your menu.`);
    } else if (r.mode === "scan") {
      await recordMedia({ kind: "scan", url: r.urls[0] || r.views.front, dishId: dish.id, meta: { frames: r.frames, urls: r.urls } });
      const f = new FormData();
      f.set("dishId", dish.id);
      f.set("frames", String(r.frames));
      Object.entries(r.views).forEach(([k, v]) => f.set(k, v));
      await requestModel(f);
      setMessage(`${r.frames} frames captured. Your AR model of ${dish.name} is being made — it appears in Studio.`);
    } else {
      await recordMedia({ kind: "video", url: r.videoUrl, dishId: dish.id, meta: { seconds: r.seconds } });
      if (flags.clientFilms) setFilm({ videoUrl: r.videoUrl, frameUrl: r.frameUrl });
      else setMessage(`Video of ${dish.name} saved.`);
    }
    router.refresh();
  }

  async function uploadVideo(file: File) {
    if (!dish) return;
    setMessage("Uploading your video…");
    const videoUrl = await uploadFile(file, `videos/${file.name}`, blobEnabled);
    const frameUrl = await bestFrameFromFile(file, blobEnabled);
    await recordMedia({ kind: "video", url: videoUrl, dishId: dish.id, meta: { uploaded: true } });
    setMessage(null);
    if (flags.clientFilms) setFilm({ videoUrl, frameUrl });
  }

  async function uploadPhotos(files: FileList) {
    if (!dish) return;
    setMessage("Uploading…");
    const list = Array.from(files).slice(0, 6);
    for (let i = 0; i < list.length; i++) {
      const url = await uploadFile(list[i], `captures/${list[i].name}`, blobEnabled);
      await recordMedia({ kind: "photo", url, dishId: dish.id, meta: { uploaded: true }, setAsDishPhoto: i === 0 });
    }
    setMessage(`Saved ${list.length} photo${list.length > 1 ? "s" : ""} of ${dish.name}.`);
    router.refresh();
  }

  if (!dishes.length) return <p className="text-mute">Add a dish to your menu first, then come back to capture it.</p>;

  return (
    <div className="space-y-10">
      <div>
        <div className="text-[13px] font-medium text-ink-2 mb-3">Which dish?</div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {dishes.map((d) => (
            <button key={d.id} onClick={() => setDishId(d.id)} className={`flex flex-none items-center gap-3 rounded-full pl-1.5 pr-4 h-12 transition ${d.id === dishId ? "bg-ink text-ivory" : "bg-surface hover:bg-surface-2"}`}>
              <span className="size-9 overflow-hidden rounded-full bg-surface-2">{d.imageUrl ? <img src={d.imageUrl} alt="" className="size-full object-cover" /> : null}</span>
              <span className="text-[14px] whitespace-nowrap">{d.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {MODES.map((m) => {
          const I = Icon[m.icon];
          return (
            <button key={m.key} onClick={() => setSelected(m.key)} className={`text-left rounded-[2rem] p-6 transition ${selected === m.key ? "bg-ink text-ivory" : "bg-surface hover:bg-surface-2"}`}>
              <div className="flex items-center justify-between">
                <I className={`size-6 ${selected === m.key ? "text-gold-soft" : "text-gold"}`} />
                <span className={`text-[12px] ${selected === m.key ? "text-ivory/60" : "text-mute"}`}>{m.time}</span>
              </div>
              <div className="mt-6 font-display text-2xl">{m.title}</div>
              <div className={`mt-1 text-[14px] ${selected === m.key ? "text-ivory/70" : "text-mute"}`}>{m.sub}</div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setMode(selected)} className="h-14 rounded-full bg-ink px-8 text-[15px] font-medium text-ivory inline-flex items-center gap-2">
          <Icon.camera className="size-5" /> Open guided camera
        </button>
        {selected === "photo" ? (
          <label className="h-14 rounded-full bg-surface px-6 text-[14px] inline-flex items-center cursor-pointer">
            Upload photos
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => e.target.files && uploadPhotos(e.target.files)} />
          </label>
        ) : null}
        {selected === "video" ? (
          <label className="h-14 rounded-full bg-surface px-6 text-[14px] inline-flex items-center cursor-pointer">
            Upload a video
            <input type="file" accept="video/*" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadVideo(e.target.files[0])} />
          </label>
        ) : null}
      </div>

      {message ? <div className="rounded-3xl bg-ok/10 text-ok px-5 py-4 text-[14px]">{message}</div> : null}

      {flags.photographerBooking ? (
        <div className="rounded-[2rem] bg-surface p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-medium">Rather have a photographer?</div>
            <div className="text-sm text-mute">A pro shoot at your restaurant, at cost.</div>
          </div>
          <form action={async () => { await requestShoot(); setMessage("Request sent. We'll reach out to book your shoot."); }}>
            <button className="h-11 rounded-full bg-white px-5 text-sm font-medium">Request a shoot</button>
          </form>
        </div>
      ) : null}

      {mode && dish ? <GuidedCamera mode={mode} dishName={dish.name} blobEnabled={blobEnabled} onDone={handleDone} onClose={() => setMode(null)} /> : null}

      {film && dish ? (
        <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/30 backdrop-blur-[2px]">
          <form
            action={(f) => start(() => requestFilm(f))}
            className="w-full sm:max-w-lg rounded-t-[2rem] sm:rounded-[2rem] bg-ivory p-8"
          >
            <input type="hidden" name="dishId" value={dish.id} />
            <input type="hidden" name="frameUrl" value={film.frameUrl.startsWith("blob:") ? "" : film.frameUrl} />
            <input type="hidden" name="videoUrl" value={film.videoUrl.startsWith("blob:") ? "" : film.videoUrl} />
            <div className="flex gap-4 items-center">
              {film.frameUrl ? <img src={film.frameUrl} alt="" className="size-20 rounded-2xl object-cover" /> : null}
              <div>
                <div className="eyebrow">Dish film</div>
                <div className="font-display text-3xl">{dish.name}</div>
              </div>
            </div>
            <div className="mt-6 text-[13px] font-medium text-ink-2 mb-2">Camera move</div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(CAMERA_MOVES) as CameraMove[]).map((k, i) => (
                <label key={k} className="cursor-pointer">
                  <input type="radio" name="move" value={k} defaultChecked={i === 0} className="peer sr-only" />
                  <span className="flex h-11 items-center justify-center rounded-full bg-surface text-[13px] peer-checked:bg-ink peer-checked:text-ivory">{CAMERA_MOVES[k].label}</span>
                </label>
              ))}
            </div>
            <div className="mt-5 text-[13px] font-medium text-ink-2 mb-2">Length</div>
            <div className="flex gap-2">
              {[5, 8, 10].map((s, i) => (
                <label key={s} className="cursor-pointer flex-1">
                  <input type="radio" name="duration" value={s} defaultChecked={i === 0} className="peer sr-only" />
                  <span className="flex h-11 items-center justify-center rounded-full bg-surface text-[13px] peer-checked:bg-ink peer-checked:text-ivory">{s} sec</span>
                </label>
              ))}
            </div>
            <p className="mt-5 text-xs text-mute">We keep your dish exactly as it is — only light and camera change.</p>
            <div className="mt-6 flex gap-3">
              <button disabled={pending} className="h-12 flex-1 rounded-full bg-ink text-ivory text-[15px] font-medium">{pending ? "Sending…" : "Make my film"}</button>
              <button type="button" onClick={() => setFilm(null)} className="h-12 rounded-full px-5 text-[15px]">Later</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

/* Pick the sharpest, best-lit frame from an uploaded video. */
async function bestFrameFromFile(file: File, blobEnabled: boolean): Promise<string> {
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.src = url;
  v.muted = true;
  v.playsInline = true;
  await new Promise((r) => (v.onloadeddata = r));
  const { frameStats, grab } = await import("./quality");
  let best: { score: number; blob: Blob | null } = { score: -1, blob: null };
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    v.currentTime = (v.duration * i) / (steps + 1);
    await new Promise((r) => (v.onseeked = r));
    const { blob, canvas } = await grab(v, 2048, 0.92);
    const s = frameStats(canvas, canvas.width, canvas.height);
    const score = s.sharpness - Math.abs(s.brightness - 135) * 0.6;
    if (score > best.score) best = { score, blob };
  }
  URL.revokeObjectURL(url);
  return best.blob ? uploadFile(best.blob, `videos/${file.name}-best.jpg`, blobEnabled) : "";
}
