import { dishesFor, getRestaurantBySlug } from "@/lib/data";
import { menuPayload } from "@/lib/menu";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const r = await getRestaurantBySlug(slug);
  if (!r) return Response.json({ error: "Menu not found" }, { status: 404 });
  const dishes = await dishesFor(r.id);
  return Response.json(menuPayload(r, dishes), { headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } });
}
