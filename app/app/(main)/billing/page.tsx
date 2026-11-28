import { getClientContext } from "@/lib/client";
import { listPlans, subscriptionFor } from "@/lib/data";
import { integrations } from "@/lib/env";
import { money } from "@/lib/defaults";
import { DemoNote, PageHead, SectionTitle, Status } from "@/components/ui";
import { Icon } from "@/components/icons";
import { choosePlan, manageBilling } from "../../actions";

export const metadata = { title: "Membership" };

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const sp = await searchParams;
  const { restaurant } = await getClientContext();
  const [sub, plans] = await Promise.all([subscriptionFor(restaurant.id), listPlans()]);
  const plan = plans.find((p) => p.id === sub?.planId);
  return (
    <>
      <PageHead eyebrow="Membership" title={plan ? `${plan.name} membership.` : "Choose a membership."} sub={sub?.currentPeriodEnd ? `Renews ${new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric" })}.` : undefined} action={sub ? <Status value={sub.status} /> : undefined} />
      {sp.done ? <div className="mb-8 rounded-3xl bg-ok/10 text-ok px-5 py-4 text-[14px]">Thank you — your membership is on.</div> : null}
      {!integrations.stripe ? <div className="mb-8"><DemoNote>Payments aren&apos;t connected yet, so choosing a plan switches it on without charging. Stripe turns on real checkout.</DemoNote></div> : null}
      <div className="grid md:grid-cols-3 gap-3">
        {plans.map((p) => {
          const current = p.id === plan?.id;
          return (
            <form key={p.id} action={choosePlan} className={`rounded-[2rem] p-7 flex flex-col ${current ? "bg-ink text-ivory" : "bg-surface"}`}>
              <input type="hidden" name="plan" value={p.id} />
              <div className="font-display text-3xl">{p.name}</div>
              <div className="mt-4 text-3xl font-semibold tracking-tight">{money(p.priceCents)}<span className="text-sm font-normal opacity-60"> / mo</span></div>
              <ul className="mt-6 space-y-2 text-[14px] flex-1">
                {p.features.map((f) => <li key={f} className="flex gap-2"><Icon.check className="size-4 mt-0.5 flex-none opacity-70" />{f}</li>)}
              </ul>
              <button disabled={current} className={`mt-8 h-11 rounded-full text-sm font-medium ${current ? "bg-white/10 text-ivory/70" : "bg-ink text-ivory"}`}>{current ? "Your plan" : plan ? `Switch to ${p.name}` : `Choose ${p.name}`}</button>
            </form>
          );
        })}
      </div>
      <SectionTitle>Billing</SectionTitle>
      <form action={manageBilling} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-surface px-6 py-5">
        <div>
          <div className="text-[15px] font-medium">Payment method, invoices and cancellation</div>
          <div className="text-[13px] text-mute">Handled securely by Stripe.</div>
        </div>
        <button disabled={!integrations.stripe || !sub?.stripeCustomerId} className="h-10 rounded-full bg-white px-5 text-[13px] font-medium disabled:opacity-40">Manage billing</button>
      </form>
    </>
  );
}
