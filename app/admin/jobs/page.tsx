import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { jobsFor, restaurantsWithPlans } from "@/lib/data";
import { refreshJob } from "@/lib/jobs";
import { enginesOf } from "@/lib/ai/engines";
import { money } from "@/lib/defaults";
import { PageHead, Stat } from "@/components/ui";
import { JobRow } from "@/components/JobRow";
import { AutoRefresh } from "@/components/AutoRefresh";
import { approveJob, deleteJob, retryJob } from "../actions";

export const metadata = { title: "Jobs" };

const FILTERS = [["all", "All"], ["running", "Making"], ["review", "Needs review"], ["failed", "Stopped"], ["succeeded", "Ready"]] as const;

export default async function Jobs({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  await requireStaff(["owner", "manager", "studio"]);
  const f = (await searchParams).s ?? "all";
  const [raw, rs] = await Promise.all([jobsFor(null, 200), restaurantsWithPlans()]);
  const jobs = await Promise.all(raw.map(refreshJob));
  const names = new Map(rs.map((r) => [r.restaurant.id, r.restaurant.name]));
  const shown = f === "all" ? jobs : jobs.filter((j) => (f === "running" ? j.status === "running" || j.status === "queued" : j.status === f));
  const spend = jobs.reduce((s, j) => s + j.costCents, 0);
  const films = enginesOf("film");

  return (
    <>
      <AutoRefresh active={jobs.some((j) => j.status === "running" || j.status === "queued")} />
      <PageHead eyebrow="Jobs" title="Everything being made." sub="Every engine run with its reference, engine, cost and — when something stops — the real reason." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        <Stat label="Making now" value={jobs.filter((j) => j.status === "running" || j.status === "queued").length} />
        <Stat label="Needs review" value={jobs.filter((j) => j.status === "review").length} />
        <Stat label="Stopped" value={jobs.filter((j) => j.status === "failed").length} />
        <Stat label="Total spend" value={money(spend)} sub={`${jobs.length} jobs`} />
      </div>
      <div className="mb-6 flex gap-1.5 overflow-x-auto no-scrollbar">
        {FILTERS.map(([k, l]) => <Link key={k} href={`/admin/jobs?s=${k}`} className={`h-9 rounded-full px-4 grid place-items-center text-[13px] whitespace-nowrap ${f === k ? "bg-ink text-ivory" : "bg-surface"}`}>{l}</Link>)}
      </div>
      <div className="space-y-2">
        {shown.map((j) => (
          <div key={j.id}>
            <JobRow job={j} showCost restaurantName={j.restaurantId ? names.get(j.restaurantId) : "Studio"} />
            {(j.output as { logTail?: string }).logTail ? <pre className="mt-1 ml-[88px] max-h-32 overflow-auto rounded-2xl bg-surface px-4 py-3 text-[11px] text-mute whitespace-pre-wrap">{(j.output as { logTail?: string }).logTail}</pre> : null}
            <div className="flex flex-wrap justify-end gap-4 pt-1.5 pr-2 text-[12.5px]">
              {j.status === "review" ? <form action={approveJob}><input type="hidden" name="id" value={j.id} /><button className="underline underline-offset-4">Approve & deliver</button></form> : null}
              {(j.status === "failed" || j.status === "review") && j.kind === "film" ? (
                <form action={retryJob} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={j.id} />
                  <select name="engine" defaultValue={j.engine} className="h-7 rounded-full bg-surface px-2">{films.map((e) => <option key={e.key} value={e.key}>{e.name}</option>)}</select>
                  <button className="underline underline-offset-4">Re-make</button>
                </form>
              ) : null}
              <form action={deleteJob}><input type="hidden" name="id" value={j.id} /><button className="text-mute hover:text-bad">Delete</button></form>
            </div>
          </div>
        ))}
        {!shown.length ? <p className="text-sm text-mute">Nothing here.</p> : null}
      </div>
    </>
  );
}
