import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { dishesFor, getRestaurant, jobsFor, listPlans, mediaFor, subscriptionFor, usersByIds } from "@/lib/data";
import { refreshJob } from "@/lib/jobs";
import { money } from "@/lib/defaults";
import { Badge, PageHead, SectionTitle, Select, Status } from "@/components/ui";
import { JobRow, ago } from "@/components/JobRow";
import { setPlanFor, setRestaurantStatus, setUserStatus, viewAs } from "../../actions";

export default async function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const r = await getRestaurant(id);
  if (!r) notFound();
  const [dishes, raw, sub, plans, media, owners] = await Promise.all([dishesFor(r.id), jobsFor(r.id, 30), subscriptionFor(r.id), listPlans(true), mediaFor(r.id, 24), usersByIds([r.ownerUserId])]);
  const jobs = await Promise.all(raw.map(refreshJob));
  const owner = owners[0];
  const plan = plans.find((p) => p.id === sub?.planId);
  const spend = jobs.reduce((s, j) => s + j.costCents, 0);

  return (
    <>
      <PageHead
        eyebrow={`${r.city || "—"} · ${r.cuisine || "—"}`}
        title={r.name}
        sub={`${owner?.name ?? "—"} · ${owner?.email ?? ""} · joined ${ago(r.createdAt)}`}
        action={
          <div className="flex gap-2">
            <form action={viewAs}><input type="hidden" name="rid" value={r.id} /><button className="h-10 rounded-full bg-ink px-5 text-[13px] text-ivory">View as client</button></form>
            <a href={`/m/${r.slug}`} target="_blank" className="h-10 inline-flex items-center rounded-full bg-surface px-5 text-[13px]">Open menu</a>
          </div>
        }
      />

      <div className="grid md:grid-cols-3 gap-3">
        <div className="rounded-3xl bg-surface p-5">
          <div className="text-[12.5px] text-mute">Menu</div>
          <div className="mt-2 flex items-center gap-3"><Status value={r.status} /><span className="text-sm text-mute">template {r.template}</span></div>
          <form action={setRestaurantStatus} className="mt-4 grid grid-cols-[1fr_auto] gap-2">
            <input type="hidden" name="rid" value={r.id} />
            <Select name="status" defaultValue={r.status} className="!h-10 !text-[13px]"><option value="live">Live</option><option value="draft">Setting up</option><option value="paused">Paused</option></Select>
            <button className="h-10 rounded-full bg-white px-4 text-[13px]">Set</button>
          </form>
        </div>
        <div className="rounded-3xl bg-surface p-5">
          <div className="text-[12.5px] text-mute">Membership</div>
          <div className="mt-2 text-xl font-semibold">{plan ? `${plan.name} · ${money(plan.priceCents)}` : "None"}</div>
          <div className="mt-1">{sub ? <Status value={sub.status} /> : null}</div>
          <form action={setPlanFor} className="mt-4 grid grid-cols-2 gap-2">
            <input type="hidden" name="rid" value={r.id} />
            <Select name="plan" defaultValue={plan?.id} className="!h-10 !text-[13px]">{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
            <Select name="status" defaultValue={sub?.status ?? "active"} className="!h-10 !text-[13px]"><option value="active">Active</option><option value="trialing">Trial</option><option value="past_due">Past due</option><option value="canceled">Canceled</option></Select>
            <button className="col-span-2 h-10 rounded-full bg-white px-4 text-[13px]">Update membership</button>
          </form>
        </div>
        <div className="rounded-3xl bg-surface p-5">
          <div className="text-[12.5px] text-mute">Margin this period</div>
          <div className="mt-2 text-xl font-semibold">{plan ? money(plan.priceCents - spend) : "—"}</div>
          <div className="mt-1 text-[13px] text-mute">AI spend {money(spend)} on {jobs.length} jobs</div>
          {owner ? (
            <form action={setUserStatus} className="mt-4">
              <input type="hidden" name="id" value={owner.id} />
              <input type="hidden" name="status" value={owner.status === "active" ? "suspended" : "active"} />
              <button className="text-[13px] underline underline-offset-4 text-mute">{owner.status === "active" ? "Suspend account" : "Reactivate account"}</button>
            </form>
          ) : null}
        </div>
      </div>

      <SectionTitle>Dishes ({dishes.length})</SectionTitle>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {dishes.map((d) => (
          <div key={d.id} className="flex gap-3 rounded-3xl bg-surface p-3">
            <div className="size-16 flex-none overflow-hidden rounded-2xl bg-surface-2">{d.imageUrl ? <img src={d.imageUrl} alt="" className="size-full object-cover" /> : null}</div>
            <div className="min-w-0">
              <div className="text-[14px] font-medium truncate">{d.name}</div>
              <div className="text-[12.5px] text-mute">{money(d.priceCents)} · {d.category}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {d.modelGlbUrl ? <Badge tone="info">AR</Badge> : null}
                {d.videoUrl ? <Badge tone="info">Film</Badge> : null}
                {!d.allergensConfirmed ? <Badge tone="warn">Allergens</Badge> : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <SectionTitle>Captures</SectionTitle>
      {media.length ? (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {media.map((m) => (
            <div key={m.id} className="relative aspect-square overflow-hidden rounded-2xl bg-surface">
              {m.kind === "photo" || m.kind === "image" || m.kind === "scan" ? (m.url !== "local-only" ? <img src={m.url} alt="" className="size-full object-cover" /> : null) : <div className="grid size-full place-items-center text-[12px] text-mute">{m.kind}</div>}
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-white/90 px-2 text-[10.5px]">{m.kind}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-mute">No captures yet.</p>}

      <SectionTitle>Work</SectionTitle>
      <div className="space-y-1.5">{jobs.length ? jobs.map((j) => <JobRow key={j.id} job={j} dish={dishes.find((d) => d.id === j.dishId)} showCost />) : <p className="text-sm text-mute">Nothing yet.</p>}</div>
    </>
  );
}
