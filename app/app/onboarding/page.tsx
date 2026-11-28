import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { requireUser, isStaff } from "@/lib/auth";
import { getMyRestaurant, listPlans, dishesFor, subscriptionFor } from "@/lib/data";
import { CATEGORIES, money } from "@/lib/defaults";
import { Field, Input, Select } from "@/components/ui";
import { Icon } from "@/components/icons";
import { TemplatePicker } from "@/components/TemplatePicker";
import { obBasics, obCapture, obDishes, obFinish, obPlan, obTemplate } from "../actions";
import { redirect } from "next/navigation";

export const metadata = { title: "Welcome" };

const STEPS = ["Restaurant", "Look", "Signature dishes", "Capture", "Membership", "Ready"];

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ step?: string; template?: string; plan?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser("/app/onboarding");
  if (isStaff(user)) redirect("/admin");
  const r = await getMyRestaurant(user);
  const maxStep = r ? Math.min(r.onboardingStep + 1, 6) : 1;
  const step = Math.max(1, Math.min(Number(sp.step) || maxStep, maxStep));

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 sm:px-10 h-20 flex items-center justify-between">
        <Link href="/" className="font-display text-xl tracking-[.22em]">{BRAND.name.toUpperCase()}</Link>
        {r && r.onboardingStep >= 6 ? <Link href="/app" className="text-sm text-mute hover:text-ink">Go to dashboard</Link> : null}
      </header>
      <div className="px-6 sm:px-10">
        <div className="mx-auto max-w-5xl flex gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1 rounded-full ${i + 1 <= step ? "bg-ink" : "bg-surface-2"}`} />
              <div className={`mt-2 text-[11px] hidden sm:block ${i + 1 === step ? "text-ink" : "text-mute"}`}>{s}</div>
            </div>
          ))}
        </div>
      </div>

      <section className="flex-1 px-6 sm:px-10 py-14">
        <div className="mx-auto max-w-5xl">
          {step === 1 && (
            <div className="max-w-md">
              <h1 className="font-display text-5xl leading-tight">Welcome, {user.name.split(" ")[0]}.</h1>
              <p className="mt-3 text-mute">First, tell us about your restaurant.</p>
              <form action={obBasics} className="mt-10 space-y-5">
                <input type="hidden" name="template" value={sp.template ?? ""} />
                <Field label="Restaurant name"><Input name="name" defaultValue={r?.name} placeholder="Véra" required /></Field>
                <Field label="City"><Input name="city" defaultValue={r?.city} placeholder="Boston, MA" /></Field>
                <Field label="Cuisine"><Input name="cuisine" defaultValue={r?.cuisine} placeholder="Modern Mediterranean" /></Field>
                <button className="h-12 rounded-full bg-ink px-7 text-[15px] font-medium text-ivory">Continue</button>
              </form>
            </div>
          )}

          {step === 2 && r && (
            <div>
              <h1 className="font-display text-5xl leading-tight">Choose your look.</h1>
              <p className="mt-3 text-mute mb-10">Every template has a phone menu and a website. You can change it anytime.</p>
              <TemplatePicker current={sp.template || r.template} menu={`/api/public/menus/${r.slug}`} submitLabel="Use this look" action={obTemplate} />
            </div>
          )}

          {step === 3 && r && <DishesStep slug={r.slug} rid={r.id} />}

          {step === 4 && (
            <div className="max-w-3xl">
              <h1 className="font-display text-5xl leading-tight">How should we capture your dishes?</h1>
              <p className="mt-3 text-mute">Either way, you get the same AR models, films and photos.</p>
              <form action={obCapture} className="mt-10 grid sm:grid-cols-2 gap-4">
                <button name="route" value="phone" className="text-left rounded-[2rem] bg-surface p-8 hover:bg-surface-2 transition">
                  <Icon.camera className="size-7 text-gold" />
                  <div className="mt-6 font-display text-3xl">With my phone</div>
                  <p className="mt-2 text-mute text-[15px]">The camera guides every angle on screen. About 2 minutes a dish.</p>
                </button>
                <button name="route" value="photographer" className="text-left rounded-[2rem] bg-surface p-8 hover:bg-surface-2 transition">
                  <Icon.image className="size-7 text-gold" />
                  <div className="mt-6 font-display text-3xl">Send a photographer</div>
                  <p className="mt-2 text-mute text-[15px]">A pro shoot at your restaurant, at cost. We&apos;ll reach out to book it.</p>
                </button>
              </form>
            </div>
          )}

          {step === 5 && <PlanStep preselect={sp.plan} />}

          {step === 6 && r && <ReadyStep rid={r.id} slug={r.slug} name={r.name} />}
        </div>
      </section>
    </main>
  );
}

async function DishesStep({ slug, rid }: { slug: string; rid: string }) {
  const existing = await dishesFor(rid);
  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-5xl leading-tight">Your signature dishes.</h1>
      <p className="mt-3 text-mute">Start with up to three. You&apos;ll add the full menu, allergens and nutrition later.</p>
      {existing.length ? <p className="mt-4 text-sm text-ok">{existing.length} dish{existing.length > 1 ? "es" : ""} already on your menu.</p> : null}
      <form action={obDishes} className="mt-10 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid grid-cols-[1fr_110px_140px] gap-2">
            <Input name={`name${i}`} placeholder={["Seared scallops", "Herb-crusted lamb", "Chocolate fondant"][i]} aria-label="Dish name" />
            <Input name={`price${i}`} type="number" step="1" min="0" placeholder="$" aria-label="Price" />
            <Select name={`cat${i}`} defaultValue={["starters", "mains", "desserts"][i]} aria-label="Course">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>
              ))}
            </Select>
          </div>
        ))}
        <div className="pt-6 flex items-center gap-4">
          <button className="h-12 rounded-full bg-ink px-7 text-[15px] font-medium text-ivory">Continue</button>
          <span className="text-sm text-mute">Leave empty to skip.</span>
        </div>
      </form>
      <p className="mt-10 text-xs text-mute">Preview your menu anytime at /m/{slug}</p>
    </div>
  );
}

async function PlanStep({ preselect }: { preselect?: string }) {
  const plans = await listPlans();
  return (
    <div>
      <h1 className="font-display text-5xl leading-tight">Choose your membership.</h1>
      <p className="mt-3 text-mute">Monthly. Cancel anytime from your billing page.</p>
      <form action={obPlan} className="mt-10 grid md:grid-cols-3 gap-4">
        {plans.map((p) => (
          <button key={p.id} name="plan" value={p.id} className={`text-left rounded-[2rem] p-8 transition flex flex-col ${preselect === p.id || (!preselect && p.highlight) ? "bg-ink text-ivory" : "bg-surface hover:bg-surface-2"}`}>
            <div className="font-display text-3xl">{p.name}</div>
            <div className="mt-6 text-4xl font-semibold tracking-tight">{money(p.priceCents)}<span className="text-base font-normal opacity-60"> / mo</span></div>
            <ul className="mt-6 space-y-2 text-[14px] opacity-90">
              {p.features.slice(0, 4).map((f) => (
                <li key={f} className="flex gap-2"><Icon.check className="size-4 mt-0.5 flex-none" />{f}</li>
              ))}
            </ul>
            <span className="mt-8 text-sm font-medium underline underline-offset-4">Choose {p.name}</span>
          </button>
        ))}
      </form>
    </div>
  );
}

async function ReadyStep({ rid, slug, name }: { rid: string; slug: string; name: string }) {
  const sub = await subscriptionFor(rid);
  return (
    <div className="max-w-xl">
      <div className="grid size-14 place-items-center rounded-full bg-ok/10 text-ok"><Icon.check className="size-7" /></div>
      <h1 className="mt-8 font-display text-5xl leading-tight">{name} is set up.</h1>
      <p className="mt-3 text-mute">{sub ? "Your membership is active. " : ""}Next: capture your first dish. It takes about two minutes.</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <form action={obFinish}><button className="h-12 rounded-full bg-ink px-7 text-[15px] font-medium text-ivory">Capture my first dish</button></form>
        <a href={`/m/${slug}`} target="_blank" className="h-12 inline-flex items-center rounded-full bg-surface px-7 text-[15px] font-medium">Preview my menu</a>
      </div>
    </div>
  );
}
