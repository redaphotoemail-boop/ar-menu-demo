import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { ModelViewer } from "@/components/ModelViewer";

export const metadata = { title: "View in AR" };

/* One dish, ready for AR. Printed table cards and the owner's Studio link here. */
export default async function ArPage({ params }: { params: Promise<{ dishId: string }> }) {
  const { dishId } = await params;
  const db = await getDb();
  const dish = (await db.select().from(schema.dishes).where(eq(schema.dishes.id, dishId)).limit(1))[0];
  if (!dish || !dish.modelGlbUrl) notFound();
  const r = (await db.select().from(schema.restaurants).where(eq(schema.restaurants.id, dish.restaurantId)).limit(1))[0];
  return (
    <main className="fixed inset-0 flex flex-col bg-ivory">
      <header className="px-6 pt-8 text-center">
        <div className="eyebrow">{r?.name}</div>
        <h1 className="mt-2 font-display text-4xl">{dish.name}</h1>
        <p className="mt-1 text-sm text-mute">{dish.short}</p>
      </header>
      <ModelViewer src={dish.modelGlbUrl} iosSrc={dish.modelUsdzUrl} alt={dish.name} poster={dish.imageUrl ?? undefined} className="flex-1" />
      <p className="pb-6 text-center text-xs text-mute">Tap the button, then point your phone at the table.</p>
    </main>
  );
}
