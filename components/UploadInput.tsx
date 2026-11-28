"use client";

import { useState } from "react";
import { uploadFile } from "@/lib/upload-client";

/* A file picker that uploads immediately and puts the URL in a hidden field,
   so it works inside any server-action form. */
export function UploadInput({ name, label, accept = "image/*", blobEnabled, className = "", compact = false }: { name: string; label: string; accept?: string; blobEnabled: boolean; className?: string; compact?: boolean }) {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState("");
  const [pct, setPct] = useState<number | null>(null);
  const isImage = accept.startsWith("image");
  return (
    <label className={`relative block cursor-pointer overflow-hidden rounded-2xl bg-surface ${compact ? "h-24" : "aspect-[4/3]"} ${className}`}>
      <input type="hidden" name={name} value={url} />
      {preview && isImage ? <img src={preview} alt="" className="absolute inset-0 size-full object-cover" /> : null}
      <span className={`absolute inset-0 grid place-items-center px-3 text-center text-[13px] ${preview && isImage ? "bg-black/0 text-transparent hover:bg-black/30 hover:text-white" : "text-mute"} transition`}>
        {pct !== null && pct < 100 ? `Uploading ${pct}%` : url ? (isImage ? "Change" : "Uploaded ✓") : label}
      </span>
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (isImage) setPreview(URL.createObjectURL(f));
          setPct(0);
          const u = await uploadFile(f, `studio/${f.name}`, blobEnabled, setPct);
          setUrl(u);
          setPct(100);
        }}
      />
    </label>
  );
}
