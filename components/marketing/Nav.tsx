import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { getUser, homeFor } from "@/lib/auth";
import { ButtonLink } from "@/components/ui";

export async function Nav() {
  const user = await getUser();
  return (
    <header className="sticky top-0 z-40 bg-ivory/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-[22px] tracking-[.22em]">{BRAND.name.toUpperCase()}</Link>
        <nav className="hidden md:flex items-center gap-8 text-[14px] text-ink-2">
          <Link href="/#ar" className="hover:text-ink">AR</Link>
          <Link href="/#concierge" className="hover:text-ink">Concierge</Link>
          <Link href="/#films" className="hover:text-ink">Films</Link>
          <Link href="/templates" className="hover:text-ink">Templates</Link>
          <Link href="/pricing" className="hover:text-ink">Membership</Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <ButtonLink href={homeFor(user)} size="sm">Open dashboard</ButtonLink>
          ) : (
            <>
              <Link href="/login" className="hidden sm:inline text-[14px] px-3 text-ink-2 hover:text-ink">Sign in</Link>
              <ButtonLink href="/pricing" size="sm">Become a member</ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-32">
      <div className="mx-auto max-w-6xl px-6 py-14 flex flex-col md:flex-row gap-8 md:items-end justify-between">
        <div>
          <div className="font-display text-xl tracking-[.22em]">{BRAND.name.toUpperCase()}</div>
          <p className="mt-2 text-sm text-mute">Made in {BRAND.city} for restaurants that care how it looks.</p>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-mute">
          <Link href="/templates" className="hover:text-ink">Templates</Link>
          <Link href="/pricing" className="hover:text-ink">Membership</Link>
          <Link href="/m/vera" className="hover:text-ink">Live demo</Link>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <span>© {new Date().getFullYear()} {BRAND.operator}</span>
        </div>
      </div>
    </footer>
  );
}
