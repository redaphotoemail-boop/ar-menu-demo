"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";

export type NavItem = { href: string; label: string; icon: keyof typeof Icon; badge?: string | number };

export function NavLinks({ items, horizontal = false }: { items: NavItem[]; horizontal?: boolean }) {
  const path = usePathname();
  const active = (href: string) => (href === "/app" || href === "/admin" ? path === href : path.startsWith(href));
  if (horizontal) {
    return (
      <div className="flex gap-1.5 w-max">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className={`flex items-center gap-2 rounded-full px-3.5 h-9 text-[13px] whitespace-nowrap transition ${active(it.href) ? "bg-ink text-ivory" : "bg-surface text-ink-2"}`}>
            {it.label}
            {it.badge ? <span className="text-[11px] opacity-70">{it.badge}</span> : null}
          </Link>
        ))}
      </div>
    );
  }
  return (
    <ul className="space-y-0.5">
      {items.map((it) => {
        const I = Icon[it.icon];
        const on = active(it.href);
        return (
          <li key={it.href}>
            <Link href={it.href} className={`flex items-center gap-3 rounded-2xl px-3 h-10 text-[14px] transition ${on ? "bg-surface text-ink font-medium" : "text-ink-2 hover:bg-surface/70"}`}>
              <I className={`size-[18px] ${on ? "text-gold" : "text-mute"}`} />
              <span className="flex-1">{it.label}</span>
              {it.badge ? <span className="rounded-full bg-gold/15 text-gold text-[11px] px-2 h-5 grid place-items-center">{it.badge}</span> : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
