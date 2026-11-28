"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Dish } from "@/lib/db/schema";
import { ALLERGENS, CATEGORIES, DIET_TAGS } from "@/lib/defaults";
import { saveDish, type DishState } from "@/app/app/actions";
import { uploadFile } from "@/lib/upload-client";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";

const TAG_LABEL: Record<string, string> = { signature: "Signature", vegetarian: "Vegetarian", vegan: "Vegan", "gluten-free": "Gluten-free", "high-protein": "High protein", "low-carb": "Low carb" };

function Chip({ name, value, defaultChecked, children }: { name: string; value: string; defaultChecked?: boolean; children: React.ReactNode }) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="inline-flex h-9 items-center rounded-full bg-surface px-4 text-[13px] text-ink-2 transition peer-checked:bg-ink peer-checked:text-ivory">{children}</span>
    </label>
  );
}

export function DishEditor({ dish, blobEnabled, onClose }: { dish?: Dish; blobEnabled: boolean; onClose: () => void }) {
  const [state, action, pending] = useActionState<DishState, FormData>(saveDish, {});
  const [photo, setPhoto] = useState<string | undefined>(dish?.imageUrl ?? undefined);
  const [uploaded, setUploaded] = useState<string>("");
  const [spice, setSpice] = useState<number>(dish?.spice ?? -1);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25 backdrop-blur-[2px]" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className="h-full w-full max-w-xl overflow-y-auto bg-ivory px-6 sm:px-10 pt-10 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-4xl">{dish ? dish.name : "New dish"}</h2>
          <button onClick={onClose} className="size-10 rounded-full bg-surface text-xl leading-none" aria-label="Close">×</button>
        </div>
        <form action={action} className="mt-8 space-y-6">
          {dish ? <input type="hidden" name="id" value={dish.id} /> : null}
          <input type="hidden" name="imageUrl" value={uploaded} />
          <input type="hidden" name="spice" value={spice} />

          <label className="block cursor-pointer">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-surface grid place-items-center">
              {photo ? <img src={photo} alt="" className="absolute inset-0 size-full object-cover" /> : <span className="text-sm text-mute">Add a photo (or capture one later)</span>}
              {busy ? <span className="absolute inset-0 grid place-items-center bg-white/60 text-sm">Uploading…</span> : null}
            </div>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setBusy(true);
                setPhoto(URL.createObjectURL(f));
                const url = await uploadFile(f, `dishes/${f.name}`, blobEnabled);
                setUploaded(url);
                setBusy(false);
              }}
            />
          </label>

          <div className="grid grid-cols-[1fr_120px] gap-3">
            <Field label="Name"><Input name="name" defaultValue={dish?.name} required /></Field>
            <Field label="Price ($)"><Input name="price" type="number" step="0.5" min="0" defaultValue={dish ? dish.priceCents / 100 : ""} required /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Course">
              <Select name="category" defaultValue={dish?.category ?? "mains"}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
              </Select>
            </Field>
            <Field label="Prep time (min)"><Input name="prepMinutes" type="number" min="0" defaultValue={dish?.prepMinutes ?? ""} /></Field>
          </div>
          <Field label="Short line" hint="Shown under the name. E.g. “Cauliflower, citrus, micro herbs”."><Input name="short" defaultValue={dish?.short} maxLength={120} /></Field>
          <Field label="Description"><Textarea name="description" defaultValue={dish?.description} rows={3} /></Field>
          <Field label="Ingredients" hint="Separate with commas."><Input name="ingredients" defaultValue={dish?.ingredients.join(", ")} /></Field>

          <div>
            <div className="text-[13px] font-medium text-ink-2 mb-2">Allergens</div>
            <div className="flex flex-wrap gap-2">{ALLERGENS.map((a) => <Chip key={a} name="allergens" value={a} defaultChecked={dish?.allergens.includes(a)}>{a}</Chip>)}</div>
            <label className="mt-4 flex items-center gap-3 text-[14px]">
              <input type="checkbox" name="allergensConfirmed" defaultChecked={dish?.allergensConfirmed} className="size-5 accent-[#3f7a52]" />
              Confirmed by the kitchen
            </label>
            <p className="mt-1 text-xs text-mute">The concierge only states allergens you&apos;ve confirmed.</p>
          </div>

          <div>
            <div className="text-[13px] font-medium text-ink-2 mb-2">Tags</div>
            <div className="flex flex-wrap gap-2">{DIET_TAGS.map((t) => <Chip key={t} name="tags" value={t} defaultChecked={dish?.tags.includes(t)}>{TAG_LABEL[t]}</Chip>)}</div>
          </div>

          <div>
            <div className="text-[13px] font-medium text-ink-2 mb-2">Spice</div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setSpice(-1)} className={`h-9 rounded-full px-4 text-[13px] ${spice < 0 ? "bg-ink text-ivory" : "bg-surface"}`}>None</button>
              {[0, 1, 2, 3].map((n) => (
                <button key={n} type="button" onClick={() => setSpice(n)} className={`h-9 rounded-full px-3 text-[13px] ${spice === n ? "bg-ink text-ivory" : "bg-surface"}`} aria-label={`Spice ${n}`}>
                  {n === 0 ? "Mild" : "🌶".repeat(n)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[13px] font-medium text-ink-2 mb-2">Nutrition (per serving)</div>
            <div className="grid grid-cols-4 gap-2">
              <Input name="kcal" type="number" min="0" placeholder="kcal" defaultValue={dish?.kcal ?? ""} aria-label="Calories" />
              <Input name="protein" type="number" min="0" placeholder="Protein g" defaultValue={dish?.protein ?? ""} aria-label="Protein" />
              <Input name="carbs" type="number" min="0" placeholder="Carbs g" defaultValue={dish?.carbs ?? ""} aria-label="Carbs" />
              <Input name="fat" type="number" min="0" placeholder="Fat g" defaultValue={dish?.fat ?? ""} aria-label="Fat" />
            </div>
          </div>

          <Field label="Pairing" hint="E.g. “Chablis · $16 a glass”."><Input name="pairing" defaultValue={dish?.pairing} /></Field>
          <Field label="Chef's note"><Input name="chefNote" defaultValue={dish?.chefNote} /></Field>

          {state.error ? <p className="text-sm text-bad">{state.error}</p> : null}
          <div className="sticky bottom-0 -mx-6 sm:-mx-10 px-6 sm:px-10 pt-5 pb-8 bg-ivory/95 backdrop-blur flex gap-3">
            <Button type="submit" size="lg" disabled={pending || busy}>{pending ? "Saving…" : "Save dish"}</Button>
            <Button type="button" variant="ghost" size="lg" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
