import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Icon } from "@/components/icons";
import { NavLinks, type NavItem } from "./NavLinks";

export function Shell({ items, title, subtitle, children, top, footer }: { items: NavItem[]; title: string; subtitle?: string; children: React.ReactNode; top?: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:flex flex-col sticky top-0 h-screen px-5 py-7">
        <Link href="/" className="font-display text-xl tracking-[.22em] px-3">{BRAND.name.toUpperCase()}</Link>
        <div className="mt-8 px-3">
          <div className="text-[15px] font-semibold truncate">{title}</div>
          {subtitle ? <div className="text-xs text-mute truncate mt-0.5">{subtitle}</div> : null}
        </div>
        <nav className="mt-6 flex-1 overflow-y-auto no-scrollbar">
          <NavLinks items={items} />
        </nav>
        {footer}
        <form action="/api/auth/logout" method="post" className="px-1">
          <button className="flex w-full items-center gap-3 rounded-2xl px-3 h-10 text-[14px] text-mute hover:bg-surface hover:text-ink transition">
            <Icon.logout className="size-[18px]" /> Sign out
          </button>
        </form>
      </aside>

      <div className="min-w-0">
        {/* Mobile top bar + scrollable nav */}
        <div className="lg:hidden sticky top-0 z-30 bg-ivory/90 backdrop-blur-xl">
          <div className="flex items-center justify-between px-5 h-14">
            <Link href="/" className="font-display text-lg tracking-[.22em]">{BRAND.name.toUpperCase()}</Link>
            <span className="text-sm font-medium truncate max-w-[50%]">{title}</span>
          </div>
          <div className="overflow-x-auto no-scrollbar px-3 pb-2">
            <NavLinks items={items} horizontal />
          </div>
        </div>
        {top}
        <main className="px-5 sm:px-10 lg:px-14 py-10 lg:py-14 max-w-6xl">{children}</main>
      </div>
    </div>
  );
}
