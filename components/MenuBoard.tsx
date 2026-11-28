"use client";

import { useCallback, useState } from "react";
import type { Dish } from "@/lib/db/schema";
import { CATEGORIES, money } from "@/lib/defaults";
import { DishEditor } from "./DishEditor";
import { deleteDish, toggleAvailable } from "@/app/app/actions";
import { Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";

export function MenuBoard({ dishes, blobEnabled }: { dishes: Dish[]; blobEnabled: boolean }) {
  const [editing, setEditing] = useState<Dish | "new" | null>(null);
  const close = useCallback(() => setEditing(null), []);
  return (
    <>
      <div className="flex justify-end -mt-4 mb-8">
        <Button onClick={() => setEditing("new")}><Icon.plus className="size-4" /> Add a dish</Button>
      </div>
      {CATEGORIES.map((c) => {
        const list = dishes.filter((d) => d.category === c);
        if (!list.length) return null;
        return (
          <section key={c} className="mb-12">
            <h2 className="font-display text-3xl mb-4">{c[0].toUpperCase() + c.slice(1)}</h2>
            <div className="space-y-1.5">
              {list.map((d) => (
                <div key={d.id} className={`flex items-center gap-4 rounded-3xl bg-surface px-4 py-3 ${d.available ? "" : "opacity-55"}`}>
                  <button onClick={() => setEditing(d)} className="size-16 flex-none overflow-hidden rounded-2xl bg-surface-2">
                    {d.imageUrl ? <img src={d.imageUrl} alt="" className="size-full object-cover" /> : <Icon.camera className="size-5 m-auto text-mute" />}
                  </button>
                  <button onClick={() => setEditing(d)} className="min-w-0 flex-1 text-left">
                    <div className="flex items-baseline gap-3">
                      <span className="text-[16px] font-medium truncate">{d.name}</span>
                      <span className="text-[14px] text-mute">{money(d.priceCents)}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {d.modelGlbUrl ? <Badge tone="info">AR</Badge> : null}
                      {d.videoUrl ? <Badge tone="info">Film</Badge> : null}
                      {d.allergensConfirmed ? <Badge tone="ok">Allergens confirmed</Badge> : <Badge tone="warn">Allergens to confirm</Badge>}
                      {!d.imageUrl ? <Badge>No photo</Badge> : null}
                      {d.tags.includes("signature") ? <Badge>Signature</Badge> : null}
                    </div>
                  </button>
                  <form action={toggleAvailable}>
                    <input type="hidden" name="id" value={d.id} />
                    <button className="text-[13px] text-mute hover:text-ink px-2">{d.available ? "Hide" : "Show"}</button>
                  </form>
                  <form action={deleteDish} onSubmit={(e) => { if (!confirm(`Delete ${d.name}? This can't be undone.`)) e.preventDefault(); }}>
                    <input type="hidden" name="id" value={d.id} />
                    <button className="text-[13px] text-mute hover:text-bad px-2">Delete</button>
                  </form>
                </div>
              ))}
            </div>
          </section>
        );
      })}
      {!dishes.length ? <p className="text-mute">No dishes yet. Add your first one.</p> : null}
      {editing ? <DishEditor dish={editing === "new" ? undefined : editing} blobEnabled={blobEnabled} onClose={close} /> : null}
    </>
  );
}
