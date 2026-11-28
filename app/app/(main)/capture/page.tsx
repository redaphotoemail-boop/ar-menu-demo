import { getClientContext } from "@/lib/client";
import { dishesFor, getFlags } from "@/lib/data";
import { integrations } from "@/lib/env";
import { PageHead } from "@/components/ui";
import { CaptureStudio } from "@/components/capture/CaptureStudio";
import type { CaptureMode } from "@/components/capture/GuidedCamera";

export const metadata = { title: "Capture" };

export default async function CapturePage({ searchParams }: { searchParams: Promise<{ type?: string; dish?: string }> }) {
  const sp = await searchParams;
  const { restaurant } = await getClientContext();
  const [dishes, flags] = await Promise.all([dishesFor(restaurant.id), getFlags()]);
  const type = (["photo", "scan", "video"].includes(sp.type ?? "") ? sp.type : undefined) as CaptureMode | undefined;
  return (
    <>
      <PageHead eyebrow="Capture" title="Shoot it with your phone." sub="Open this page on your phone at the restaurant. The camera tells you exactly where to stand." />
      <CaptureStudio dishes={dishes} blobEnabled={integrations.blob} flags={flags} initialMode={type} initialDish={sp.dish} />
    </>
  );
}
