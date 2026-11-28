"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CAPTURE_GUIDE } from "@/lib/ai/prompts";
import { uploadFile, downscale } from "@/lib/upload-client";
import { frameStats, grab, verdict } from "./quality";

export type CaptureMode = "photo" | "scan" | "video";
export type CaptureResult =
  | { mode: "photo"; urls: string[] }
  | { mode: "scan"; frames: number; urls: string[]; views: { front: string; back: string; left: string; right: string } }
  | { mode: "video"; videoUrl: string; frameUrl: string; seconds: number };

type Props = { mode: CaptureMode; dishName: string; blobEnabled: boolean; onDone: (r: CaptureResult) => void; onClose: () => void };

const SEGMENTS = 24; // one frame every 15° around the plate
const LAPS = [
  { label: "First lap", min: 45, max: 75, hint: "about 30° above the table" },
  { label: "Second lap", min: 15, max: 45, hint: "higher, about 60° above" },
];

type Orientation = { alpha: number | null; beta: number | null; gamma: number | null };

export function GuidedCamera({ mode, dishName, blobEnabled, onDone, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<"intro" | "live" | "saving" | "error">("intro");
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [warn, setWarn] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [ori, setOri] = useState<Orientation>({ alpha: null, beta: null, gamma: null });
  const [hasOri, setHasOri] = useState(false);
  const [turnPlate, setTurnPlate] = useState(false);
  const [progress, setProgress] = useState(0);

  // results
  const photos = useRef<string[]>([]);
  const scanUrls = useRef<string[]>([]);
  const scanViews = useRef<Record<string, string>>({});
  const [lapFilled, setLapFilled] = useState<boolean[][]>([Array(SEGMENTS).fill(false), Array(SEGMENTS).fill(false)]);
  const [lap, setLap] = useState(0);
  const alpha0 = useRef<number | null>(null);
  const lastShot = useRef(0);
  const busy = useRef(false);
  const pending = useRef<Promise<unknown>[]>([]);

  // video
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const bestFrame = useRef<{ score: number; blob: Blob | null }>({ score: -1, blob: null });
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const guide = CAPTURE_GUIDE[mode];

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);
  useEffect(() => stop, [stop]);

  async function start(plateMode = false) {
    setTurnPlate(plateMode);
    // iOS asks permission for motion sensors from a tap.
    try {
      const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
      if (DOE?.requestPermission) await DOE.requestPermission().catch(() => "denied");
    } catch {}
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 3840 }, height: { ideal: 2160 } }, audio: false });
      streamRef.current = stream;
      setPhase("live");
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setError("We couldn't open the camera. Allow camera access in your browser settings, or upload from your camera roll instead.");
      setPhase("error");
    }
  }

  // Motion sensors: level for photos, heading for the 360 ring.
  useEffect(() => {
    if (phase !== "live") return;
    const on = (e: DeviceOrientationEvent) => {
      if (e.beta == null) return;
      setHasOri(true);
      setOri({ alpha: e.alpha, beta: e.beta, gamma: e.gamma });
    };
    window.addEventListener("deviceorientation", on);
    return () => window.removeEventListener("deviceorientation", on);
  }, [phase]);

  const pitch = ori.beta == null ? null : Math.abs(ori.beta);
  const photoAligned = (() => {
    if (pitch == null) return false;
    if (mode !== "photo") return false;
    if (step === 0) return pitch > 30 && pitch < 62; // 45° hero
    if (step === 1) return pitch < 12 && Math.abs(ori.gamma ?? 0) < 12; // flat, straight above
    return pitch > 75 && pitch < 100; // table height
  })();

  async function saveShot(blob: Blob, name: string) {
    const url = await uploadFile(blob, name, blobEnabled, setProgress);
    return url;
  }

  /* ---------- photo ---------- */
  async function shootPhoto() {
    const v = videoRef.current;
    if (!v || busy.current) return;
    busy.current = true;
    const { blob, canvas } = await grab(v, 4096, 0.92);
    const w = verdict(frameStats(canvas, canvas.width, canvas.height));
    setFlash(true);
    setTimeout(() => setFlash(false), 140);
    if (w) {
      setWarn(w);
      busy.current = false;
      return;
    }
    setWarn(null);
    setPhase("saving");
    const url = await saveShot(blob, `captures/${slug(dishName)}-${["hero", "top", "side"][step]}.jpg`);
    photos.current.push(url);
    busy.current = false;
    if (step + 1 < guide.length) {
      setStep(step + 1);
      setPhase("live");
    } else {
      stop();
      onDone({ mode: "photo", urls: photos.current });
    }
  }

  /* ---------- 360 scan ---------- */
  const captureScanFrame = useCallback(
    async (seg: number, lapIndex: number) => {
      const v = videoRef.current;
      if (!v || busy.current) return;
      busy.current = true;
      lastShot.current = Date.now();
      const { blob, canvas } = await grab(v, blobEnabled ? 2048 : 1024, 0.88);
      const s = frameStats(canvas, canvas.width, canvas.height);
      if (s.sharpness < 25) {
        busy.current = false; // soft frame: skip, the segment stays open
        return;
      }
      setFlash(true);
      setTimeout(() => setFlash(false), 90);
      setLapFilled((prev) => {
        const next = prev.map((l) => l.slice());
        next[lapIndex][seg] = true;
        return next;
      });
      // Four sides of the plate from the first lap feed the fast multi-view 3D engine.
      const side = lapIndex === 0 ? ({ 0: "front", 6: "right", 12: "back", 18: "left" } as Record<number, string>)[seg] : undefined;
      if (blobEnabled) {
        pending.current.push(
          uploadFile(blob, `scans/${slug(dishName)}-${lapIndex}-${seg}.jpg`, true).then((url) => {
            scanUrls.current.push(url);
            if (side) scanViews.current[side] = url;
          }),
        );
      } else if (side) {
        scanViews.current[side] = await downscale(blob, 900);
      }
      busy.current = false;
    },
    [blobEnabled, dishName],
  );

  // Auto-capture: walking around the plate (heading) or turning the plate (timer).
  useEffect(() => {
    if (mode !== "scan" || phase !== "live" || lap >= LAPS.length) return;
    if (turnPlate || !hasOri) {
      if (!turnPlate) return;
      const id = setInterval(() => {
        const filled = lapFilled[lap];
        const nextSeg = filled.indexOf(false);
        if (nextSeg >= 0) captureScanFrame(nextSeg, lap);
      }, 1100);
      return () => clearInterval(id);
    }
    if (ori.alpha == null || pitch == null) return;
    if (alpha0.current == null) alpha0.current = ori.alpha;
    const inPitch = pitch >= LAPS[lap].min && pitch <= LAPS[lap].max;
    const rel = (((alpha0.current - ori.alpha) % 360) + 360) % 360;
    const seg = Math.floor(rel / (360 / SEGMENTS)) % SEGMENTS;
    if (inPitch && !lapFilled[lap][seg] && Date.now() - lastShot.current > 300) captureScanFrame(seg, lap);
  }, [ori, mode, phase, lap, hasOri, turnPlate, lapFilled, pitch, captureScanFrame]);

  const lapDone = lapFilled[lap]?.filter(Boolean).length ?? 0;
  useEffect(() => {
    if (mode !== "scan" || lap >= LAPS.length) return;
    if (lapDone >= SEGMENTS) {
      if (lap + 1 < LAPS.length) {
        setLap(lap + 1);
        alpha0.current = null;
      } else {
        finishScan();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lapDone, lap, mode]);

  async function finishScan() {
    setPhase("saving");
    stop();
    await Promise.all(pending.current);
    const frames = lapFilled.flat().filter(Boolean).length;
    const v = scanViews.current;
    const any = v.front || v.right || v.back || v.left || scanUrls.current[0] || "";
    onDone({ mode: "scan", frames, urls: scanUrls.current, views: { front: v.front || any, back: v.back || any, left: v.left || any, right: v.right || any } });
  }

  /* ---------- video ---------- */
  useEffect(() => {
    if (!recording) return;
    const t0 = Date.now();
    const id = setInterval(async () => {
      const s = (Date.now() - t0) / 1000;
      setElapsed(s);
      const v = videoRef.current;
      if (v) {
        const { blob, canvas } = await grab(v, 2048, 0.92);
        const st = frameStats(canvas, canvas.width, canvas.height);
        const score = st.sharpness - Math.abs(st.brightness - 135) * 0.6;
        if (score > bestFrame.current.score) bestFrame.current = { score, blob };
      }
      if (s >= 20) stopRecording();
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    const type = ["video/mp4", "video/webm;codecs=vp9", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t)) || "";
    const rec = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 16_000_000 } : undefined);
    chunks.current = [];
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.onstop = finishVideo;
    rec.start(500);
    recorder.current = rec;
    bestFrame.current = { score: -1, blob: null };
    setRecording(true);
  }

  function stopRecording() {
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    setRecording(false);
  }

  async function finishVideo() {
    setPhase("saving");
    const type = recorder.current?.mimeType || "video/webm";
    const blob = new Blob(chunks.current, { type });
    stop();
    const ext = type.includes("mp4") ? "mp4" : "webm";
    const videoUrl = await uploadFile(blob, `videos/${slug(dishName)}.${ext}`, blobEnabled, setProgress);
    const frameUrl = bestFrame.current.blob ? await uploadFile(bestFrame.current.blob, `videos/${slug(dishName)}-best.jpg`, blobEnabled) : "";
    onDone({ mode: "video", videoUrl, frameUrl, seconds: Math.round(elapsed) });
  }

  /* ---------- UI ---------- */
  const title = mode === "photo" ? guide[step]?.title : mode === "scan" ? (lap < LAPS.length ? LAPS[lap].label : "Done") : recording ? "Recording" : "Dish video";
  const tip =
    mode === "photo"
      ? guide[step]?.tip
      : mode === "scan"
        ? turnPlate
          ? "Keep the phone still and turn the plate slowly. Frames are taken automatically."
          : !hasOri
            ? "Motion sensors are off on this device. Turn the plate slowly instead."
            : pitch != null && lap < LAPS.length && (pitch < LAPS[lap].min || pitch > LAPS[lap].max)
              ? pitch < LAPS[lap].min ? "Tilt the phone up a little." : "Tilt the phone down toward the plate."
              : `Walk slowly around the plate, ${LAPS[Math.min(lap, LAPS.length - 1)].hint}.`
        : recording
          ? "Glide slowly around the plate. Keep it steady."
          : guide[1].tip;

  return (
    <div className="fixed inset-0 z-[60] bg-black text-white">
      {phase === "intro" || phase === "error" ? (
        <div className="h-full overflow-y-auto px-6 py-10 flex flex-col">
          <button onClick={onClose} className="self-end size-10 rounded-full bg-white/10 text-xl" aria-label="Close">×</button>
          <div className="flex-1 max-w-md mx-auto w-full flex flex-col justify-center">
            <div className="text-[11px] tracking-[.28em] uppercase text-white/50">{mode === "scan" ? "360 · AR scan" : mode === "video" ? "Dish video" : "Photos"}</div>
            <h2 className="mt-3 font-display text-4xl">{dishName}</h2>
            <ol className="mt-8 space-y-5">
              {guide.map((g, i) => (
                <li key={g.title} className="flex gap-4">
                  <span className="grid size-7 flex-none place-items-center rounded-full bg-white/10 text-[13px]">{i + 1}</span>
                  <div>
                    <div className="font-medium">{g.title}</div>
                    <div className="text-[14px] text-white/65 mt-0.5">{g.tip}</div>
                  </div>
                </li>
              ))}
            </ol>
            {phase === "error" ? <p className="mt-8 text-[14px] text-[#f0b9a8]">{error}</p> : null}
            <button onClick={() => start(false)} className="mt-10 h-14 rounded-full bg-white text-black text-[15px] font-medium">Open camera</button>
            {mode === "scan" ? <button onClick={() => start(true)} className="mt-3 h-12 rounded-full bg-white/10 text-[14px]">I&apos;ll turn the plate instead</button> : null}
          </div>
        </div>
      ) : (
        <>
          <video ref={videoRef} playsInline muted className="absolute inset-0 size-full object-cover" />
          <div className={`absolute inset-0 bg-white transition-opacity duration-150 pointer-events-none ${flash ? "opacity-60" : "opacity-0"}`} />
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

          {/* top bar */}
          <div className="absolute top-0 inset-x-0 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] flex items-center justify-between">
            <button onClick={() => { stop(); onClose(); }} className="size-10 rounded-full bg-black/40 backdrop-blur text-xl" aria-label="Close">×</button>
            <div className="text-center">
              <div className="text-[15px] font-medium">{title}</div>
              <div className="text-[12px] text-white/60">{mode === "photo" ? `${step + 1} of ${guide.length}` : mode === "scan" ? `${lapFilled.flat().filter(Boolean).length} frames` : recording ? `${Math.floor(elapsed)}s of 10–20s` : dishName}</div>
            </div>
            <span className="size-10" />
          </div>

          {/* overlays */}
          {mode === "photo" ? <PhotoOverlay step={step} aligned={photoAligned} pitch={pitch} /> : null}
          {mode === "scan" && lap < LAPS.length ? <ScanRing filled={lapFilled} lap={lap} /> : null}
          {mode === "video" && recording ? <RecRing seconds={elapsed} /> : null}

          {/* bottom */}
          <div className="absolute inset-x-0 bottom-0 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] text-center">
            {warn ? <div className="mx-auto mb-4 w-fit rounded-full bg-[#b4473c]/90 px-4 py-2 text-[13px]">{warn}</div> : null}
            <p className="mx-auto max-w-sm text-[15px] text-white/90 min-h-[44px]">{tip}</p>
            <div className="mt-5 flex items-center justify-center gap-10">
              {phase === "saving" ? (
                <div className="h-20 grid place-items-center text-sm text-white/80">Saving{progress && progress < 100 ? ` ${progress}%` : "…"}</div>
              ) : mode === "photo" ? (
                <Shutter onClick={shootPhoto} glow={photoAligned} />
              ) : mode === "scan" ? (
                <>
                  {!hasOri && !turnPlate ? <Shutter onClick={() => captureScanFrame(lapFilled[lap].indexOf(false), lap)} glow /> : null}
                  <button onClick={finishScan} disabled={lapFilled.flat().filter(Boolean).length < 8} className="h-12 rounded-full bg-white/15 px-6 text-[14px] disabled:opacity-40">Finish scan</button>
                </>
              ) : recording ? (
                <button onClick={stopRecording} disabled={elapsed < 6} className="size-20 rounded-full border-4 border-white grid place-items-center disabled:opacity-50" aria-label="Stop">
                  <span className="size-7 rounded-md bg-[#e5484d]" />
                </button>
              ) : (
                <button onClick={startRecording} className="size-20 rounded-full border-4 border-white grid place-items-center" aria-label="Record">
                  <span className="size-14 rounded-full bg-[#e5484d]" />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Shutter({ onClick, glow }: { onClick: () => void; glow: boolean }) {
  return (
    <button onClick={onClick} className={`size-20 rounded-full border-4 grid place-items-center transition ${glow ? "border-[#e2c48f]" : "border-white"}`} aria-label="Take photo">
      <span className={`size-[60px] rounded-full transition ${glow ? "bg-[#e2c48f]" : "bg-white"}`} />
    </button>
  );
}

function PhotoOverlay({ step, aligned, pitch }: { step: number; aligned: boolean; pitch: number | null }) {
  const color = aligned ? "#e2c48f" : "rgba(255,255,255,.75)";
  return (
    <div className="absolute inset-0 grid place-items-center pointer-events-none">
      {step === 0 ? (
        <svg viewBox="0 0 300 300" className="w-[78vw] max-w-[420px]"><ellipse cx="150" cy="160" rx="135" ry="88" fill="none" stroke={color} strokeWidth="2" strokeDasharray="6 8" /></svg>
      ) : step === 1 ? (
        <svg viewBox="0 0 300 300" className="w-[78vw] max-w-[420px]"><circle cx="150" cy="150" r="130" fill="none" stroke={color} strokeWidth="2" strokeDasharray="6 8" /><path d="M140 150h20M150 140v20" stroke={color} strokeWidth="2" /></svg>
      ) : (
        <svg viewBox="0 0 300 200" className="w-[86vw] max-w-[460px]"><path d="M10 140h280" stroke={color} strokeWidth="2" strokeDasharray="6 8" /><rect x="60" y="70" width="180" height="70" rx="10" fill="none" stroke={color} strokeWidth="2" strokeDasharray="6 8" /></svg>
      )}
      {pitch != null ? (
        <div className="absolute right-5 top-1/2 -translate-y-1/2 h-40 w-1.5 rounded-full bg-white/20">
          <span className="absolute left-1/2 -translate-x-1/2 size-4 rounded-full transition-all" style={{ top: `${Math.min(100, Math.max(0, (pitch / 100) * 100))}%`, background: color }} />
        </div>
      ) : null}
    </div>
  );
}

function ScanRing({ filled, lap }: { filled: boolean[][]; lap: number }) {
  const r1 = 128;
  const r2 = 104;
  const arc = (r: number, i: number) => {
    const a0 = ((i * 360) / SEGMENTS - 90 + 1.5) * (Math.PI / 180);
    const a1 = (((i + 1) * 360) / SEGMENTS - 90 - 1.5) * (Math.PI / 180);
    return `M ${150 + r * Math.cos(a0)} ${150 + r * Math.sin(a0)} A ${r} ${r} 0 0 1 ${150 + r * Math.cos(a1)} ${150 + r * Math.sin(a1)}`;
  };
  return (
    <div className="absolute inset-0 grid place-items-center pointer-events-none">
      <svg viewBox="0 0 300 300" className="w-[80vw] max-w-[440px]">
        {filled.map((laps, li) =>
          laps.map((on, i) => (
            <path key={`${li}-${i}`} d={arc(li === 0 ? r1 : r2, i)} fill="none" strokeLinecap="round" strokeWidth={li === lap ? 9 : 5} stroke={on ? "#e2c48f" : li === lap ? "rgba(255,255,255,.35)" : "rgba(255,255,255,.12)"} />
          )),
        )}
        <circle cx="150" cy="150" r="70" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.5" strokeDasharray="4 6" />
      </svg>
    </div>
  );
}

function RecRing({ seconds }: { seconds: number }) {
  const pct = Math.min(1, seconds / 20);
  return (
    <div className="absolute top-24 inset-x-0 flex justify-center pointer-events-none">
      <div className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-[13px] backdrop-blur">
        <span className="size-2.5 rounded-full bg-[#e5484d] animate-pulse" />
        <span className="tabular-nums">{Math.floor(seconds)}s</span>
        <span className="h-1 w-24 rounded-full bg-white/20 overflow-hidden"><span className="block h-full bg-white" style={{ width: `${pct * 100}%` }} /></span>
      </div>
    </div>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "dish";
}
