"use client";

import { useState } from "react";

export function CopyField({ label, value, multiline, hint }: { label: string; value: string; multiline?: boolean; hint?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="text-[13px] font-medium text-ink-2 mb-1.5">{label}</div>
      <div className="flex gap-2 items-start">
        {multiline ? (
          <textarea readOnly value={value} rows={3} className="flex-1 rounded-2xl bg-surface px-4 py-3 text-[13px] font-mono text-ink-2 outline-none resize-none" />
        ) : (
          <input readOnly value={value} className="flex-1 rounded-2xl bg-surface px-4 h-12 text-[14px] outline-none" />
        )}
        <button type="button" onClick={async () => { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="h-12 rounded-full bg-ink px-5 text-[13px] text-ivory">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {hint ? <p className="mt-1.5 text-xs text-mute">{hint}</p> : null}
    </div>
  );
}
