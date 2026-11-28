import Link from "next/link";
import { Shell } from "@/components/shell/Shell";
import type { NavItem } from "@/components/shell/NavLinks";
import { getClientContext } from "@/lib/client";
import { demoMode } from "@/lib/env";
import { jobsFor } from "@/lib/data";
import { stopViewingAs } from "@/app/admin/actions";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const { restaurant, viewingAs } = await getClientContext();
  const jobs = await jobsFor(restaurant.id, 50);
  const making = jobs.filter((j) => j.status === "running" || j.status === "queued").length;
  const items: NavItem[] = [
    { href: "/app", label: "Overview", icon: "home" },
    { href: "/app/menu", label: "Menu", icon: "menu" },
    { href: "/app/capture", label: "Capture", icon: "camera" },
    { href: "/app/studio", label: "Studio", icon: "film", badge: making || undefined },
    { href: "/app/look", label: "Look", icon: "layout" },
    { href: "/app/concierge", label: "Concierge", icon: "spark" },
    { href: "/app/share", label: "QR & sharing", icon: "qr" },
    { href: "/app/billing", label: "Membership", icon: "card" },
  ];
  const top = (
    <>
      {viewingAs ? (
        <div className="bg-ink text-ivory text-[13px] px-5 sm:px-10 lg:px-14 py-2.5 flex items-center justify-between">
          <span>You&apos;re viewing {restaurant.name} as the owner.</span>
          <form action={stopViewingAs}><button className="underline underline-offset-4">Back to admin</button></form>
        </div>
      ) : null}
      {demoMode && !viewingAs ? (
        <div className="bg-gold-soft/60 text-[12.5px] text-ink-2 px-5 sm:px-10 lg:px-14 py-2">Demo mode — sample data that resets. <Link href="/login" className="underline underline-offset-2">Switch account</Link></div>
      ) : null}
    </>
  );
  return (
    <Shell items={items} title={restaurant.name} subtitle={restaurant.city || restaurant.cuisine} top={top}>
      {children}
    </Shell>
  );
}
