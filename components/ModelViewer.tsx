"use client";

import { useEffect, useRef, useState } from "react";

/* Google's <model-viewer>: 3D in the page, and on phones a real AR view —
   Quick Look on iPhone (USDZ, generated from the GLB when none is given) and
   Scene Viewer on Android. No app, no SDK, no per-view fees. */
let loading: Promise<void> | null = null;
function loadModelViewer() {
  if (typeof window === "undefined") return Promise.resolve();
  if (customElements.get("model-viewer")) return Promise.resolve();
  loading ??= new Promise<void>((resolve) => {
    const s = document.createElement("script");
    s.type = "module";
    s.src = "/vendor/model-viewer.min.js";
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
  return loading;
}

type Props = {
  src: string;
  iosSrc?: string | null;
  alt: string;
  poster?: string;
  className?: string;
  arLabel?: string;
  autoRotate?: boolean;
  showArButton?: boolean;
};

export function ModelViewer({ src, iosSrc, alt, poster, className = "", arLabel = "View on your table", autoRotate = true, showArButton = true }: Props) {
  const ref = useRef<HTMLElement & { canActivateAR?: boolean; activateAR?: () => void }>(null);
  const [ready, setReady] = useState(false);
  const [canAR, setCanAR] = useState(false);

  useEffect(() => {
    let alive = true;
    loadModelViewer().then(() => {
      if (!alive) return;
      setReady(true);
      setTimeout(() => setCanAR(Boolean(ref.current?.canActivateAR)), 400);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <model-viewer
        ref={ref}
        src={src}
        {...(iosSrc ? { "ios-src": iosSrc } : {})}
        alt={alt}
        poster={poster}
        ar=""
        ar-modes="webxr scene-viewer quick-look"
        ar-scale="fixed"
        ar-placement="floor"
        camera-controls=""
        {...(autoRotate ? { "auto-rotate": "" } : {})}
        shadow-intensity="1"
        exposure="1.05"
        interaction-prompt="none"
        touch-action="pan-y"
        style={{ width: "100%", height: "100%", background: "transparent", ["--poster-color" as string]: "transparent" }}
      >
        <span slot="ar-button" />
      </model-viewer>
      {showArButton && ready ? (
        <button
          type="button"
          onClick={() => (canAR ? ref.current?.activateAR?.() : null)}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur px-5 h-11 text-sm font-medium shadow-lg"
          title={canAR ? arLabel : "Open on your phone to place it on your table"}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M12 3 4 7.5v9L12 21l8-4.5v-9z" /><path d="M4 7.5 12 12l8-4.5M12 12v9" /></svg>
          {canAR ? arLabel : "Drag to turn"}
        </button>
      ) : null}
    </div>
  );
}
