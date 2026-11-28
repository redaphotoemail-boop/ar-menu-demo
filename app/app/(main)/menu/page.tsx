import { getClientContext } from "@/lib/client";
import { dishesFor } from "@/lib/data";
import { integrations } from "@/lib/env";
import { PageHead } from "@/components/ui";
import { MenuBoard } from "@/components/MenuBoard";

export const metadata = { title: "Menu" };

export default async function MenuPage() {
  const { restaurant } = await getClientContext();
  const dishes = await dishesFor(restaurant.id);
  return (
    <>
      <PageHead eyebrow="Menu" title="Your dishes." sub="Everything here feeds your live menu, the concierge and the AR viewer." />
      <MenuBoard dishes={dishes} blobEnabled={integrations.blob} />
    </>
  );
}
