import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Phone } from "@/components/marketing/Phone";
import { Plans } from "@/components/marketing/Plans";
import { ModelViewer } from "@/components/ModelViewer";
import { listPlans } from "@/lib/data";
import { TEMPLATES } from "@/lib/defaults";

export default async function Home() {
  const plans = await listPlans();
  return (
    <>
      {/* Hero */}
      <section className="relative -mt-16 h-[100svh] min-h-[640px] overflow-hidden bg-ink">
        <img src="/engine/assets/h_lumina.jpg" alt="" className="absolute inset-0 size-full object-cover object-[70%_50%]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        <div className="relative h-full mx-auto max-w-6xl px-6 flex flex-col justify-end pb-24">
          <p className="eyebrow !text-ivory/70">AR menus · AI concierge · Dish films</p>
          <h1 className="mt-5 font-display text-ivory text-[56px] sm:text-[84px] leading-[.98] max-w-3xl">Your menu, on their table.</h1>
          <p className="mt-6 text-ivory/80 text-lg max-w-xl">Diners see every dish in 3D on their own table, ask a concierge that knows your kitchen, and order with confidence.</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/m/vera" size="lg" variant="gold">See a live menu</ButtonLink>
            <ButtonLink href="/pricing" size="lg" className="!bg-white/15 !text-ivory backdrop-blur hover:!bg-white/25">Become a member</ButtonLink>
          </div>
        </div>
      </section>

      {/* Statement */}
      <section className="mx-auto max-w-3xl px-6 py-32 text-center">
        <p className="font-display text-[34px] sm:text-[44px] leading-[1.15]">Guests decide with their eyes. We make every plate impossible to scroll past.</p>
      </section>

      {/* AR */}
      <section id="ar" className="mx-auto max-w-6xl px-6 py-20 grid md:grid-cols-2 gap-16 items-center">
        <div className="order-2 md:order-1 aspect-square rounded-[2.5rem] bg-surface overflow-hidden">
          <ModelViewer src="/models/fondant.glb" alt="Chocolate fondant in 3D" className="size-full" />
        </div>
        <div className="order-1 md:order-2">
          <div className="eyebrow">AR on the table</div>
          <h2 className="mt-4 font-display text-5xl leading-[1.05]">Before it&apos;s ordered, it&apos;s already there.</h2>
          <p className="mt-6 text-mute text-[17px] max-w-md">Point a phone at the table and the dish appears, true to size. No app. Works on iPhone and Android.</p>
          <p className="mt-4 text-[13px] text-mute">Try it: drag the dessert, or open this page on your phone.</p>
        </div>
      </section>

      {/* Concierge */}
      <section id="concierge" className="mx-auto max-w-6xl px-6 py-24 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <div className="eyebrow">AI Concierge</div>
          <h2 className="mt-4 font-display text-5xl leading-[1.05]">A concierge that knows your kitchen.</h2>
          <ul className="mt-10 space-y-7">
            {[
              [Icon.spark, "Personal recommendations", "Light tonight, high protein, a dish for two — picked from your menu."],
              [Icon.settings, "Smart customization", "Filters for gluten, dairy, nuts, spice and budget, in any language."],
              [Icon.chart, "Nutrition and allergen insights", "Only from your kitchen's confirmed data. Never guessed."],
            ].map(([I, t, d]) => {
              const Ico = I as (p: { className?: string }) => React.ReactElement;
              return (
                <li key={t as string} className="flex gap-5">
                  <span className="mt-1 grid size-10 flex-none place-items-center rounded-full bg-surface text-gold"><Ico className="size-5" /></span>
                  <div>
                    <div className="font-medium">{t as string}</div>
                    <div className="mt-1 text-[15px] text-mute">{d as string}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex justify-center">
          <Phone menu="/api/public/menus/vera" tpl="velora" label="Vélora template · tap “What are you craving?”" />
        </div>
      </section>

      {/* Films */}
      <section id="films" className="relative mt-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-ink aspect-[16/9] sm:aspect-[21/9]">
            <video src="/samples/scallops-film.mp4" poster="/engine/assets/d_scallops.jpg" autoPlay muted loop playsInline className="absolute inset-0 size-full object-cover opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-8 sm:p-14 max-w-lg">
              <div className="eyebrow !text-ivory/70">Dish films</div>
              <h2 className="mt-4 font-display text-ivory text-4xl sm:text-5xl leading-[1.05]">Films that make people hungry.</h2>
              <p className="mt-4 text-ivory/75 text-[15px]">Send a phone video of a dish. Get back a short, premium commercial.</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-mute">Sample motion preview.</p>
        </div>
      </section>

      {/* Templates */}
      <section className="mt-32">
        <div className="mx-auto max-w-6xl px-6 flex items-end justify-between gap-6">
          <div>
            <div className="eyebrow">Templates</div>
            <h2 className="mt-4 font-display text-5xl leading-[1.05]">Ten looks. One feels like you.</h2>
          </div>
          <Link href="/templates" className="hidden sm:inline-flex items-center gap-2 text-sm text-ink-2 hover:text-ink">All templates <Icon.arrow className="size-4" /></Link>
        </div>
        <div className="mt-14 flex gap-10 overflow-x-auto no-scrollbar px-6 pb-6 snap-x" style={{ paddingLeft: "max(1.5rem, calc((100vw - 72rem) / 2 + 1.5rem))" }}>
          {TEMPLATES.slice(0, 6).map((t) => (
            <div key={t.key} className="snap-start">
              <Phone tpl={t.key} label={t.name} />
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-6 pt-32">
        <div className="eyebrow text-center">How it works</div>
        <div className="mt-12 grid sm:grid-cols-3 gap-12 text-center">
          {[
            ["01", "Shoot with your phone.", "We guide every angle on screen."],
            ["02", "We craft it.", "AR dishes, films, your menu."],
            ["03", "Guests scan.", "And order with confidence."],
          ].map(([n, t, d]) => (
            <div key={n}>
              <div className="font-display text-gold text-2xl">{n}</div>
              <div className="mt-3 text-lg font-medium">{t}</div>
              <div className="mt-1 text-mute text-[15px]">{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Membership */}
      <section id="membership" className="mx-auto max-w-6xl px-6 pt-32">
        <div className="text-center mb-14">
          <div className="eyebrow">Membership</div>
          <h2 className="mt-4 font-display text-5xl">One membership. Everything made for you.</h2>
        </div>
        <Plans plans={plans} />
      </section>

      {/* Close */}
      <section className="mx-auto max-w-3xl px-6 pt-36 text-center">
        <h2 className="font-display text-5xl leading-[1.05]">Let your best dish sell itself.</h2>
        <div className="mt-10 flex justify-center gap-3">
          <ButtonLink href="/signup" size="lg">Start your membership</ButtonLink>
          <ButtonLink href="/m/vera" size="lg" variant="soft">See a live menu</ButtonLink>
        </div>
      </section>
    </>
  );
}
