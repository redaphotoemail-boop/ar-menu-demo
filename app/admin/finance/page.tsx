import { requireStaff } from "@/lib/auth";
import { jobsFor, listPlans, restaurantsWithPlans } from "@/lib/data";
import { engine } from "@/lib/ai/engines";
import { integrations } from "@/lib/env";
import { money } from "@/lib/defaults";
import { DemoNote, PageHead, SectionTitle, Stat, Status } from "@/components/ui";

export const metadata = { title: "Finance" };

export default async function Finance() {
  await requireStaff(["owner", "finance"]);
  const [rows, plans, jobs] = await Promise.all([restaurantsWithPlans(), listPlans(true), jobsFor(null, 500)]);
  const active = rows.filter((r) => r.sub?.status === "active");
  const mrr = active.reduce((s, r) => s + (r.plan?.priceCents ?? 0), 0);
  const monthAgo = Date.now() - 30 * 86400000;
  const recent = jobs.filter((j) => new Date(j.createdAt).getTime() > monthAgo);
  const spend = recent.reduce((s, j) => s + j.costCents, 0);
  const byEngine = new Map<string, number>();
  recent.forEach((j) => byEngine.set(j.engine, (byEngine.get(j.engine) ?? 0) + j.costCents));
  const byPlan = plans.map((p) => ({ p, n: active.filter((r) => r.plan?.id === p.id).length }));
  const atRisk = rows.filter((r) => r.sub?.status === "past_due");

  return (
    <>
      <PageHead eyebrow="Finance" title="The numbers." sub="Revenue from memberships, what the AI engines cost, and the margin on every restaurant." />
      {!integrations.stripe ? <div className="mb-8"><DemoNote>Stripe isn&apos;t connected yet — revenue here comes from memberships recorded in the platform. With Stripe on, payouts and invoices live in your Stripe dashboard.</DemoNote></div> : null}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Monthly recurring" value={money(mrr)} sub={`${active.length} paying members`} />
        <Stat label="Yearly run rate" value={money(mrr * 12)} />
        <Stat label="AI spend, 30 days" value={money(spend)} sub={`${recent.length} jobs`} />
        <Stat label="Gross margin" value={mrr ? `${Math.round(((mrr - spend) / mrr) * 100)}%` : "—"} sub={money(mrr - spend)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        <div>
          <SectionTitle>Members by plan</SectionTitle>
          <div className="space-y-1.5">
            {byPlan.map(({ p, n }) => (
              <div key={p.id} className="flex items-center justify-between rounded-3xl bg-surface px-5 py-4">
                <div><div className="text-[15px] font-medium">{p.name}</div><div className="text-[13px] text-mute">{money(p.priceCents)} / month</div></div>
                <div className="text-right"><div className="text-[15px] font-medium">{n}</div><div className="text-[13px] text-mute">{money(n * p.priceCents)}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionTitle>Spend by engine, 30 days</SectionTitle>
          <div className="space-y-1.5">
            {[...byEngine.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between rounded-3xl bg-surface px-5 py-4">
                <div className="text-[15px]">{engine(k)?.name ?? k}</div>
                <div className="text-[15px] font-medium">{money(v)}</div>
              </div>
            ))}
            {!byEngine.size ? <p className="text-sm text-mute">No spend yet.</p> : null}
          </div>
        </div>
      </div>

      <SectionTitle>Margin by restaurant</SectionTitle>
      <div className="space-y-1.5">
        {rows.map(({ restaurant: r, plan, sub }) => {
          const cost = jobs.filter((j) => j.restaurantId === r.id && new Date(j.createdAt).getTime() > monthAgo).reduce((s, j) => s + j.costCents, 0);
          const rev = sub?.status === "active" ? plan?.priceCents ?? 0 : 0;
          return (
            <div key={r.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-6 rounded-3xl bg-surface px-5 py-4 text-[14px]">
              <div><div className="font-medium">{r.name}</div><div className="text-[12.5px] text-mute">{plan?.name ?? "No plan"}</div></div>
              {sub ? <Status value={sub.status} /> : <span />}
              <div className="text-right"><div>{money(rev)}</div><div className="text-[12px] text-mute">revenue</div></div>
              <div className="text-right w-24"><div className={rev - cost < 0 ? "text-bad" : ""}>{money(rev - cost)}</div><div className="text-[12px] text-mute">after {money(cost)} AI</div></div>
            </div>
          );
        })}
      </div>

      {atRisk.length ? (
        <>
          <SectionTitle>Payments to chase</SectionTitle>
          <div className="space-y-1.5">{atRisk.map(({ restaurant: r, owner, plan }) => <div key={r.id} className="rounded-3xl bg-warn/10 px-5 py-4 text-[14px]">{r.name} — {plan?.name} {plan ? money(plan.priceCents) : ""} past due · {owner?.email}</div>)}</div>
        </>
      ) : null}
    </>
  );
}
