import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRestaurantBySlug } from "@/lib/data";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const r = await getRestaurantBySlug((await params).slug);
  return { title: r ? `${r.name} — Menu` : "Menu" };
}

/* The page diners open from the table QR code: the restaurant's template, full screen. */
export default async function DinerMenu({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ tpl?: string; mode?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const r = await getRestaurantBySlug(slug);
  if (!r) notFound();
  if (r.status === "paused") {
    return (
      <main className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <div className="font-display text-4xl">{r.name}</div>
          <p className="mt-3 text-mute">This menu is resting for now. Please ask your server.</p>
        </div>
      </main>
    );
  }
  const q = new URLSearchParams({ menu: `/api/public/menus/${r.slug}`, chrome: "0" });
  if (sp.tpl) q.set("tpl", sp.tpl);
  if (sp.mode === "web") q.set("mode", "web");
  return <iframe src={`/engine/index.html?${q}`} title={`${r.name} menu`} className="fixed inset-0 size-full border-0" allow="xr-spatial-tracking; camera; fullscreen" />;
}
