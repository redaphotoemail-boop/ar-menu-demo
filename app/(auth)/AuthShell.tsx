import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { demoMode, integrations } from "@/lib/env";
import { Icon } from "@/components/icons";
import { demoSignIn } from "./actions";
import { AuthForm } from "./AuthForm";

export function AuthShell({ mode, next, error }: { mode: "login" | "signup"; next: string; error?: string }) {
  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      <section className="relative hidden lg:block overflow-hidden bg-ink">
        <img src="/engine/assets/h_lumina.jpg" alt="" className="absolute inset-0 size-full object-cover opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-14 left-14 right-14 text-ivory">
          <p className="font-display text-5xl leading-[1.05]">{BRAND.tagline}</p>
          <p className="mt-4 text-ivory/70 text-[15px]">AR dishes, an AI concierge and cinematic films — in one membership.</p>
        </div>
      </section>
      <section className="flex flex-col px-6 sm:px-12 py-10">
        <Link href="/" className="font-display text-2xl tracking-[.2em]">{BRAND.name.toUpperCase()}</Link>
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-sm mx-auto py-12">
            <h1 className="font-display text-[42px] leading-tight">{mode === "login" ? "Welcome back." : "Start your membership."}</h1>
            <p className="mt-2 text-mute text-[15px]">{mode === "login" ? "Sign in to your kitchen." : "Two minutes to set up. Cancel anytime."}</p>

            <a
              href={integrations.google ? `/api/auth/google${next ? `?next=${encodeURIComponent(next)}` : ""}` : undefined}
              aria-disabled={!integrations.google}
              className={`mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-full bg-white text-[15px] font-medium shadow-[0_1px_0_rgba(0,0,0,.04),0_6px_20px_-8px_rgba(0,0,0,.18)] transition hover:shadow-md ${integrations.google ? "" : "opacity-50 pointer-events-none"}`}
            >
              <Icon.google /> Continue with Google
            </a>
            {!integrations.google ? <p className="mt-2 text-xs text-mute text-center">Google sign-in turns on when the Google keys are added.</p> : null}
            {error === "google" ? <p className="mt-3 text-sm text-bad text-center">Google sign-in didn&apos;t complete. Please try again.</p> : null}

            <div className="my-8 flex items-center gap-4 text-xs text-mute"><span className="hairline flex-1" />or<span className="hairline flex-1" /></div>
            <AuthForm mode={mode} next={next} />

            {demoMode ? (
              <div className="mt-12 rounded-3xl bg-surface p-5">
                <div className="eyebrow mb-3">Demo</div>
                <p className="text-[13px] text-mute mb-4">Explore with sample data. Nothing here is real or saved for long.</p>
                <form action={demoSignIn} className="grid gap-2">
                  <button name="as" value="client" className="h-11 rounded-full bg-white text-sm font-medium hover:bg-ivory transition">Enter as a restaurant (Véra)</button>
                  <button name="as" value="new" className="h-11 rounded-full bg-white text-sm font-medium hover:bg-ivory transition">Start as a new restaurant</button>
                  <button name="as" value="owner" className="h-11 rounded-full bg-ink text-ivory text-sm font-medium hover:bg-ink-2 transition">Enter as the owner</button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
        <p className="text-xs text-mute">By continuing you agree to the <Link href="/terms" className="underline underline-offset-2">terms</Link> and <Link href="/privacy" className="underline underline-offset-2">privacy policy</Link>.</p>
      </section>
    </main>
  );
}
