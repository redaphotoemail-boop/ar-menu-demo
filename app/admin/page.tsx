import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { ownerStats, restaurantsWithPlans } from "@/lib/data";
import { refreshJob } from "@/lib/jobs";
import { integrations } from "@/lib/env";
import { money } from "@/lib/defaults";
import { PageHead, SectionTitle, Stat } from "@/components/ui";
import { JobRow, ago } from "@/components/JobRow";
import { Icon } from "@/components/icons";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const me = await requireStaff();
  const [s, rs] = await Promise.all([ownerStats(), restaurantsWithPlans()]);
  const jobs = await Promise.all(s.jobs.map(refreshJob));
  const names = new Map(rs.map((r) => [r.restaurant.id, r.restaurant.name]));
  const missing = Object.entries(integrations).filter(([, v]) => !v).map(([k]) => k);
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHead eyebrow="Dashboard" title={`${hello}, ${me.name.split(" ")[0]}.`} sub={`${s.live} menus live · ${s.running} pieces being made · ${s.review} waiting for you.`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Monthly revenue" value={money(s.mrr)} sub={`${money(s.mrr * 12)} a year`} />
        <Stat label="Active members" value={s.active} sub={`${s.trialing} on trial · ${s.pastDue} past due`} />
        <Stat label="New this month" value={s.newSignups} sub={`${s.clients} restaurants in total`} />
        <Stat label="AI spend, 30 days" value={money(s.spend30)} sub={s.mrr ? `${Math.round((s.spend30 / s.mrr) * 100)}% of revenue` : "—"} />
      </div>

      {missing.length ? (
        <Link href="/admin/settings" className="mt-6 flex items-center justify-between rounded-3xl bg-gold-soft/50 px-6 py-4 text-[14px]">
          <span>Still to connect: {missing.join(", ")}.</span>
          <span className="inline-flex items-center gap-1.5 font-medium">Settings <Icon.arrow className="size-4" /></span>
        </Link>
      ) : null}

      <div className="grid xl:grid-cols-[1fr_360px] gap-12 mt-4">
        <div>
          <SectionTitle action={<Link href="/admin/jobs" className="text-sm text-mute hover:text-ink">All jobs</Link>}>Latest work</SectionTitle>
          <div className="space-y-1.5">{jobs.map((j) => <JobRow key={j.id} job={j} showCost restaurantName={j.restaurantId ? names.get(j.restaurantId) : "Studio"} />)}</div>

          <SectionTitle action={<Link href="/admin/clients" className="text-sm text-mute hover:text-ink">All clients</Link>}>Clients</SectionTitle>
          <div className="space-y-1.5">
            {rs.slice(0, 5).map(({ restaurant: r, plan, sub, dishCount, arCount }) => (
              <Link key={r.id} href={`/admin/clients/${r.id}`} className="flex items-center gap-4 rounded-3xl bg-surface px-5 py-4 hover:bg-surface-2 transition">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium">{r.name}</div>
                  <div className="text-[13px] text-mute">{r.city} · {dishCount} dishes · {arCount} in AR</div>
                </div>
                <div className="text-right">
                  <div className="text-[14px]">{plan ? `${plan.name} · ${money(plan.priceCents)}` : "No plan"}</div>
                  <div className="text-[12px] text-mute">{sub?.status ?? "—"}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <aside>
          <SectionTitle>Activity</SectionTitle>
          <ul className="space-y-4">
            {s.events.map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="mt-2 size-1.5 flex-none rounded-full bg-gold" />
                <div>
                  <div className="text-[14px]">{e.detail}</div>
                  <div className="text-[12px] text-mute">{ago(e.createdAt)}</div>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
