import Link from "next/link";
import { getClientContext } from "@/lib/client";
import { dishesFor, getFlags, jobsFor, listPlans, subscriptionFor } from "@/lib/data";
import { refreshJob } from "@/lib/jobs";
import { CAMERA_MOVES, PHOTO_STYLES } from "@/lib/ai/prompts";
import { Badge, PageHead, SectionTitle, Select } from "@/components/ui";
import { Icon } from "@/components/icons";
import { JobRow } from "@/components/JobRow";
import { AutoRefresh } from "@/components/AutoRefresh";
import { RecreateForm } from "@/components/RecreateForm";
import { integrations } from "@/lib/env";
import { requestFilm, applyResultAsPhoto } from "../../actions";

export const metadata = { title: "Studio" };

export default async function StudioPage() {
  const { restaurant } = await getClientContext();
  const [dishes, raw, flags, sub, plans] = await Promise.all([dishesFor(restaurant.id), jobsFor(restaurant.id, 40), getFlags(), subscriptionFor(restaurant.id), listPlans(true)]);
  const jobs = await Promise.all(raw.map(refreshJob));
  const plan = plans.find((p) => p.id === sub?.planId);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const filmsThisMonth = jobs.filter((j) => j.kind === "film" && new Date(j.createdAt).getTime() >= monthStart && j.status !== "failed").length;
  const filmLimit = plan?.limits.filmsPerMonth ?? 0;
  const making = jobs.some((j) => j.status === "running" || j.status === "queued");

  return (
    <>
      <AutoRefresh active={making} />
      <PageHead eyebrow="Studio" title="Made for your menu." sub="Films, AR models and photos made from your captures. Finished pieces go live on your menu by themselves." />

      <div className="grid lg:grid-cols-3 gap-3">
        {/* Film */}
        <div className="rounded-[2rem] bg-surface p-6 flex flex-col">
          <div className="flex items-center justify-between"><Icon.film className="size-6 text-gold" /><span className="text-[12px] text-mute">{filmLimit ? `${filmsThisMonth} of ${filmLimit} this month` : "Not in your plan"}</span></div>
          <div className="mt-5 font-display text-2xl">Dish film</div>
          <p className="mt-1 text-[14px] text-mute">Best from a phone video. A photo works too.</p>
          {flags.clientFilms ? (
            <form action={requestFilm} className="mt-5 space-y-2">
              <Select name="dishId" aria-label="Dish">{dishes.filter((d) => d.imageUrl).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
              <div className="grid grid-cols-2 gap-2">
                <Select name="move" aria-label="Camera move">{Object.entries(CAMERA_MOVES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
                <Select name="duration" aria-label="Length"><option value="5">5 sec</option><option value="8">8 sec</option><option value="10">10 sec</option></Select>
              </div>
              <button disabled={!filmLimit || filmsThisMonth >= filmLimit} className="h-11 w-full rounded-full bg-ink text-ivory text-sm font-medium disabled:opacity-40">Make a film from the photo</button>
              <Link href="/app/capture?type=video" className="block text-center text-[13px] text-mute underline underline-offset-4 pt-1">Or record a video first</Link>
            </form>
          ) : <p className="mt-5 text-sm text-mute">Films are paused for now.</p>}
        </div>

        {/* AR */}
        <div className="rounded-[2rem] bg-surface p-6 flex flex-col">
          <div className="flex items-center justify-between"><Icon.ar className="size-6 text-gold" /><span className="text-[12px] text-mute">{dishes.filter((d) => d.modelGlbUrl).length} of {plan?.limits.arDishes ?? 0} AR dishes</span></div>
          <div className="mt-5 font-display text-2xl">AR model</div>
          <p className="mt-1 text-[14px] text-mute">Walk around the plate with the guided camera. We build the 3D dish.</p>
          <div className="flex-1" />
          <Link href="/app/capture?type=scan" className="mt-5 h-11 rounded-full bg-ink text-ivory text-sm font-medium grid place-items-center">Start a 360 capture</Link>
        </div>

        {/* Pro photo */}
        <div className={`rounded-[2rem] p-6 flex flex-col ${flags.photoRecreation ? "bg-surface" : "bg-surface/60"}`}>
          <div className="flex items-center justify-between"><Icon.image className={`size-6 ${flags.photoRecreation ? "text-gold" : "text-mute"}`} />{flags.photoRecreation ? null : <Badge>Coming soon</Badge>}</div>
          <div className={`mt-5 font-display text-2xl ${flags.photoRecreation ? "" : "text-mute"}`}>Pro photo re-creation</div>
          <p className="mt-1 text-[14px] text-mute">Upload a phone photo. Get a studio-grade version of the same dish.</p>
          {flags.photoRecreation ? (
            <RecreateForm dishes={dishes.map((d) => ({ id: d.id, name: d.name }))} styles={Object.entries(PHOTO_STYLES).map(([k, v]) => ({ key: k, label: v.label }))} blobEnabled={integrations.blob} />
          ) : (
            <>
              <div className="flex-1" />
              <button disabled className="mt-5 h-11 rounded-full bg-surface-2 text-mute text-sm font-medium cursor-not-allowed inline-flex items-center justify-center gap-2"><Icon.lock className="size-4" /> Not available yet</button>
            </>
          )}
        </div>
      </div>

      <SectionTitle>Your pieces</SectionTitle>
      {jobs.length ? (
        <div className="space-y-1.5">
          {jobs.map((j) => (
            <div key={j.id}>
              <JobRow job={j} dish={dishes.find((d) => d.id === j.dishId)} />
              {j.kind === "photo_recreate" && j.status === "succeeded" ? (
                <form action={applyResultAsPhoto} className="pl-[88px] pt-1"><input type="hidden" name="jobId" value={j.id} /><button className="text-[13px] underline underline-offset-4">Use as the dish photo</button></form>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-mute">Nothing yet. Your first capture will show up here.</p>
      )}
    </>
  );
}
