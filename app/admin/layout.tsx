import Link from "next/link";
import { Shell } from "@/components/shell/Shell";
import type { NavItem } from "@/components/shell/NavLinks";
import { requireStaff } from "@/lib/auth";
import { demoMode } from "@/lib/env";
import { jobsFor } from "@/lib/data";

export const metadata = { title: { default: "Owner", template: "%s · Owner" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaff();
  const jobs = await jobsFor(null, 200);
  const review = jobs.filter((j) => j.status === "review" || j.status === "failed").length;
  const all: (NavItem & { roles: string[] })[] = [
    { href: "/admin", label: "Dashboard", icon: "chart", roles: ["owner", "manager", "finance", "studio"] },
    { href: "/admin/studio", label: "Studio", icon: "spark", roles: ["owner", "manager", "studio"] },
    { href: "/admin/clients", label: "Clients", icon: "users", roles: ["owner", "manager", "studio", "finance"] },
    { href: "/admin/jobs", label: "Jobs", icon: "queue", roles: ["owner", "manager", "studio"], badge: review || undefined },
    { href: "/admin/finance", label: "Finance", icon: "card", roles: ["owner", "finance"] },
    { href: "/admin/team", label: "Team", icon: "users", roles: ["owner"] },
    { href: "/admin/plans", label: "Plans", icon: "plan", roles: ["owner", "finance"] },
    { href: "/admin/settings", label: "Settings", icon: "settings", roles: ["owner"] },
  ];
  const items = all.filter((i) => i.roles.includes(me.role));
  const top = demoMode ? <div className="bg-gold-soft/60 text-[12.5px] text-ink-2 px-5 sm:px-10 lg:px-14 py-2">Demo mode — sample data that resets. Connect the database in Settings to go live. <Link href="/login" className="underline underline-offset-2">Switch account</Link></div> : null;
  return (
    <Shell items={items} title={me.name} subtitle={`${me.role[0].toUpperCase()}${me.role.slice(1)} · ${me.email}`} top={top}>
      {children}
    </Shell>
  );
}
