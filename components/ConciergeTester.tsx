"use client";

import { useState } from "react";

const SUGGEST = ["Something light tonight", "High protein, no dairy", "Gluten-free starters", "Anniversary dinner for two", "What wine goes with the mains?", "Under $30, not spicy"];

/* Try the concierge exactly as a guest would. */
export function ConciergeTester({ slug }: { slug: string }) {
  const [q, setQ] = useState("");
  const [lang, setLang] = useState<"en" | "fr" | "es">("en");
  const [log, setLog] = useState<{ q: string; a: string; notes: string[] }[]>([]);
  const [busy, setBusy] = useState(false);
  async function ask(text: string) {
    if (!text.trim()) return;
    setBusy(true);
    const r = await fetch("/api/concierge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, q: text, lang }) }).then((x) => x.json());
    setLog((l) => [{ q: text, a: r.text ?? "…", notes: r.notes ?? [] }, ...l].slice(0, 6));
    setQ("");
    setBusy(false);
  }
  return (
    <div className="rounded-[2rem] bg-surface p-6">
      <div className="flex items-center justify-between">
        <div className="font-medium">Try it</div>
        <div className="flex rounded-full bg-white p-1 text-[12px]">
          {(["en", "fr", "es"] as const).map((l) => (
            <button key={l} type="button" onClick={() => setLang(l)} className={`px-3 h-7 rounded-full ${lang === l ? "bg-ink text-ivory" : "text-mute"}`}>{l.toUpperCase()}</button>
          ))}
        </div>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="mt-4 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask like a guest…" className="flex-1 rounded-full bg-white px-5 h-12 text-[15px] outline-none" />
        <button disabled={busy} className="h-12 rounded-full bg-ink px-5 text-sm text-ivory">Ask</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {SUGGEST.map((s) => <button key={s} type="button" onClick={() => ask(s)} className="h-8 rounded-full bg-white px-3 text-[12.5px] text-ink-2">{s}</button>)}
      </div>
      <div className="mt-6 space-y-5">
        {log.map((m, i) => (
          <div key={i}>
            <div className="text-[13px] text-mute">“{m.q}”</div>
            <div className="mt-1 text-[15px] leading-relaxed">{m.a}</div>
            {m.notes.map((n) => <div key={n} className="mt-1 text-[12.5px] text-warn">{n}</div>)}
          </div>
        ))}
      </div>
    </div>
  );
}
