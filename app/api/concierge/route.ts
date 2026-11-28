import { z } from "zod";
import { dishesFor, getRestaurantBySlug } from "@/lib/data";
import { answer } from "@/lib/concierge";
import { conciergeDishes } from "@/lib/menu";

const Body = z.object({ slug: z.string().min(1), q: z.string().min(1).max(500), lang: z.enum(["en", "fr", "es"]).default("en") });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const r = await getRestaurantBySlug(parsed.data.slug);
  if (!r) return Response.json({ error: "Menu not found" }, { status: 404 });
  const dishes = await dishesFor(r.id);
  return Response.json(answer(parsed.data.q, conciergeDishes(dishes, parsed.data.lang), parsed.data.lang, r.concierge?.featured ?? []));
}
