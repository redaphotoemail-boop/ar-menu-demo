import Link from "next/link";
import { getClientContext } from "@/lib/client";
import { dishesFor, jobsFor, listPlans, subscriptionFor } from "@/lib/data";
import { refreshJob } from "@/lib/jobs";
import { money } from "@/lib/defaults";
import { ButtonLink, PageHead, SectionTitle, Status } from "@/components/ui";
import { Icon } from "@/components/icons";
import { JobRow } from "@/components/JobRow";
import { setLive } from "../actions";

export default async function Overview() {
  const { restaurant, user, viewingAs } = await getClientContext();
  const [dishes, rawJobs, sub, plans] = await Promise.all([dishesFor(restaurant.id), jobsFor(restaurant.id, 6), subscriptionFor(restaurant.id), listPlans(true)]);
  const jobs = await Promise.all(rawJobs.map(refreshJob));
  const plan = plans.find((p) => p.id === sub?.planId);
  const withPhoto = dishes.filter((d) => d.imageUrl).length;
  const withAR = dishes.filter((d) => d.modelGlbUrl).length;
  const withFilm = dishes.filter((d) => d.videoUrl).length;
  const confirmed = dishes.filter((d) => d.allergensConfirmed).length;
  const steps = [
    { done: dishes.length >= 3, label: "Add your dishes", sub: `${dishes.length} on the menu`, href: "/app/menu" },
    { done: dishes.length > 0 && withPhoto === dishes.length, label: "Photograph every dish", sub: `${withPhoto} of ${dishes.length}`, href: "/app/capture" },
    { done: dishes.length > 0 && confirmed === dishes.length, label: "Confirm allergens", sub: `${confirmed} of ${dishes.length} confirmed by the kitchen`, href: "/app/menu" },
    { done: withAR > 0, label: "Put a dish in AR", sub: `${withAR} in AR`, href: "/app/capture?type=scan" },
    { done: withFilm > 0, label: "Order your first film", sub: `${withFilm} films`, href: "/app/studio" },
    { done: restaurant.status === "live", label: "Go live", sub: restaurant.status === "live" ? "Guests can scan your menu" : "Publish when you're ready", href: "/app/share" },
  ];
  const done = steps.filter((s) => s.done).length;

  return (
    <>
      <PageHead
        eyebrow={restaurant.status === "live" ? "Live" : "Setting up"}
        title={viewingAs ? restaurant.name : `Welcome back, ${user.name.split(" ")[0]}.`}
        sub={`${done} of ${steps.length} steps done. ${done === steps.length ? "Everything is in place." : "Here's what's next."}`}
        action={<ButtonLink href={`/m/${restaurant.slug}`} target="_blank" variant="soft">Open live menu <Icon.external className="size-4" /></ButtonLink>}
      />

      <div className="grid xl:grid-cols-[1fr_320px] gap-12">
        <div>
          <ul className="space-y-1.5">
            {steps.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className="flex items-center gap-4 rounded-3xl bg-surface px-5 py-4 hover:bg-surface-2 transition">
                  <span className={`grid size-8 place-items-center rounded-full ${s.done ? "bg-ok text-white" : "bg-white text-mute"}`}>{s.done ? <Icon.check className="size-4" /> : <Icon.arrow className="size-4" />}</span>
                  <div className="flex-1">
                    <div className={`text-[15px] font-medium ${s.done ? "text-mute line-through decoration-mute/40" : ""}`}>{s.label}</div>
                    <div className="text-[13px] text-mute">{s.sub}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {restaurant.status !== "live" && dishes.length > 0 ? (
            <form action={setLive} className="mt-4">
              <input type="hidden" name="live" value="1" />
              <button className="h-11 rounded-full bg-ink px-6 text-sm font-medium text-ivory">Publish my menu</button>
            </form>
          ) : null}

          <SectionTitle action={<Link href="/app/studio" className="text-sm text-mute hover:text-ink">All</Link>}>Studio</SectionTitle>
          {jobs.length ? (
            <div className="space-y-1.5">{jobs.map((j) => <JobRow key={j.id} job={j} dish={dishes.find((d) => d.id === j.dishId)} />)}</div>
          ) : (
            <p className="text-sm text-mute">Nothing in the studio yet. Capture a dish to begin.</p>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-[2rem] bg-surface p-6">
            <div className="text-[13px] text-mute">Membership</div>
            <div className="mt-2 flex items-center justify-between">
              <div className="font-display text-3xl">{plan?.name ?? "None yet"}</div>
              {sub ? <Status value={sub.status} /> : null}
            </div>
            {plan ? <div className="mt-1 text-sm text-mute">{money(plan.priceCents)} / month</div> : null}
            <Link href="/app/billing" className="mt-5 inline-block text-sm underline underline-offset-4">Manage</Link>
          </div>
          <div className="flex justify-center">
            <div className="phone">
              <iframe src={`/engine/index.html?chrome=0&menu=/api/public/menus/${restaurant.slug}`} title="Your menu" loading="lazy" />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
