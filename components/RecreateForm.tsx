"use client";

import { useState } from "react";
import { requestRecreate } from "@/app/app/actions";
import { uploadFile } from "@/lib/upload-client";
import { Select } from "@/components/ui";

export function RecreateForm({ dishes, styles, blobEnabled }: { dishes: { id: string; name: string }[]; styles: { key: string; label: string }[]; blobEnabled: boolean }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form action={requestRecreate} className="mt-5 space-y-2">
      <input type="hidden" name="imageUrl" value={url} />
      <Select name="dishId" aria-label="Dish">{dishes.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
      <Select name="style" aria-label="Style">{styles.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>
      <label className="flex h-11 cursor-pointer items-center justify-center rounded-full bg-white text-sm">
        {busy ? "Uploading…" : url ? "Photo ready ✓" : "Choose a phone photo"}
        <input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; setBusy(true); setUrl(await uploadFile(f, `recreate/${f.name}`, blobEnabled)); setBusy(false); }} />
      </label>
      <button disabled={busy} className="h-11 w-full rounded-full bg-ink text-ivory text-sm font-medium disabled:opacity-40">Re-create it</button>
    </form>
  );
}
