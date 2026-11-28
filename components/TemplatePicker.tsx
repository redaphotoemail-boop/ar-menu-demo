"use client";

import { useState } from "react";
import { TEMPLATES } from "@/lib/defaults";

/* Pick a look and see it live on your own menu as you choose. */
export function TemplatePicker({ current, menu, submitLabel, action, hiddenFields }: { current: string; menu?: string; submitLabel: string; action: (form: FormData) => void; hiddenFields?: Record<string, string> }) {
  const [tpl, setTpl] = useState(current);
  const [web, setWeb] = useState(false);
  const q = new URLSearchParams({ chrome: "0", tpl });
  if (menu) q.set("menu", menu);
  if (web) q.set("mode", "web");
  return (
    <form action={action} className="grid lg:grid-cols-[1fr_auto] gap-12 items-start">
      {Object.entries(hiddenFields ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div>
        <div className="grid sm:grid-cols-2 gap-2">
          {TEMPLATES.map((t) => (
            <label key={t.key} className={`cursor-pointer rounded-3xl px-5 py-4 transition ${tpl === t.key ? "bg-ink text-ivory" : "bg-surface hover:bg-surface-2"}`}>
              <input type="radio" name="template" value={t.key} checked={tpl === t.key} onChange={() => setTpl(t.key)} className="sr-only" />
              <div className="font-display text-xl">{t.name}</div>
              <div className={`text-[13px] mt-0.5 ${tpl === t.key ? "text-ivory/70" : "text-mute"}`}>{t.mood}</div>
            </label>
          ))}
        </div>
        <button className="mt-8 inline-flex h-12 items-center rounded-full bg-ink px-7 text-[15px] font-medium text-ivory hover:bg-ink-2 transition">{submitLabel}</button>
      </div>
      <div className="flex flex-col items-center gap-4">
        <div className="flex rounded-full bg-surface p-1 text-[13px]">
          <button type="button" onClick={() => setWeb(false)} className={`px-4 h-8 rounded-full ${!web ? "bg-white shadow-sm" : "text-mute"}`}>Phone</button>
          <button type="button" onClick={() => setWeb(true)} className={`px-4 h-8 rounded-full ${web ? "bg-white shadow-sm" : "text-mute"}`}>Website</button>
        </div>
        {web ? (
          <div className="w-[min(640px,90vw)] aspect-[16/10] rounded-3xl overflow-hidden bg-white shadow-[0_30px_70px_-30px_rgba(0,0,0,.35)]">
            <iframe key={`w-${tpl}`} src={`/engine/index.html?${q}`} className="w-[200%] h-[200%] origin-top-left scale-50 border-0" title="Website preview" />
          </div>
        ) : (
          <div className="phone">
            <iframe key={tpl} src={`/engine/index.html?${q}`} title="Menu preview" />
          </div>
        )}
      </div>
    </form>
  );
}
