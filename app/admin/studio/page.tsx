import Link from "next/link";
import { desc } from "drizzle-orm";
import { requireStaff } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { getEngines, jobsFor } from "@/lib/data";
import { refreshJob, usingDemoEngines } from "@/lib/jobs";
import { integrations } from "@/lib/env";
import { enginesOf, estimateCents } from "@/lib/ai/engines";
import { CAMERA_MOVES, FOOD_NEGATIVE, DISH_LOCK, PHOTO_STYLES } from "@/lib/ai/prompts";
import { money } from "@/lib/defaults";
import { DemoNote, Field, Input, PageHead, SectionTitle, Select, Textarea } from "@/components/ui";
import { JobRow } from "@/components/JobRow";
import { UploadInput } from "@/components/UploadInput";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ModelViewer } from "@/components/ModelViewer";
import { attachModel, deleteJob, studio3d, studioFilm, studioImage } from "../actions";

export const metadata = { title: "Studio" };

const TABS = [
  ["image", "Images"],
  ["video", "Films"],
  ["3d", "AR & 360"],
  ["library", "Library"],
] as const;

export default async function Studio({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireStaff(["owner", "manager", "studio"]);
  const tab = (await searchParams).tab ?? "image";
  const db = await getDb();
  const [engines, raw, allDishes, restaurants] = await Promise.all([
    getEngines(),
    jobsFor(null, 60),
    db.select().from(schema.dishes).orderBy(desc(schema.dishes.createdAt)),
    db.select().from(schema.restaurants),
  ]);
  const jobs = await Promise.all(raw.map(refreshJob));
  const rname = new Map(restaurants.map((r) => [r.id, r.name]));
  const dishOptions = allDishes.map((d) => ({ id: d.id, label: `${rname.get(d.restaurantId) ?? "?"} — ${d.name}`, d }));
  const making = jobs.some((j) => j.status === "running" || j.status === "queued");
  const blob = integrations.blob;

  return (
    <>
      <AutoRefresh active={making} />
      <PageHead eyebrow="Studio" title="Make it premium." sub="Create restaurant-grade images, cinematic films and AR models. Every prompt locks the dish so the food stays exactly as served." />
      {usingDemoEngines() ? <div className="mb-8"><DemoNote>Engines aren&apos;t connected yet (add REPLICATE_API_TOKEN), so jobs finish with sample results after a few seconds. Costs shown are what the real run would cost.</DemoNote></div> : null}

      <div className="mb-10 flex gap-1.5 overflow-x-auto no-scrollbar">
        {TABS.map(([k, l]) => (
          <Link key={k} href={`/admin/studio?tab=${k}`} className={`h-10 rounded-full px-5 grid place-items-center text-[14px] whitespace-nowrap ${tab === k ? "bg-ink text-ivory" : "bg-surface text-ink-2"}`}>{l}</Link>
        ))}
      </div>

      {tab === "image" && (
        <div className="grid lg:grid-cols-[1fr_1fr] gap-10 items-start">
          <form action={studioImage} className="space-y-5">
            <UploadInput name="imageUrl" label="Reference photo (optional) — a phone shot of the real dish" blobEnabled={blob} />
            <Field label="Subject"><Input name="subject" placeholder="Seared scallops with cauliflower purée" required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Style"><Select name="style">{Object.entries(PHOTO_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
              <Field label="Engine">
                <Select name="engine" defaultValue={engines.image}>{enginesOf("image").map((e) => <option key={e.key} value={e.key}>{e.name} · {money(e.priceCents)}</option>)}</Select>
              </Field>
            </div>
            <Field label="Extra direction" hint="Optional. E.g. “dark slate plate, single side light from the left”."><Textarea name="extra" rows={2} /></Field>
            <Field label="For a dish (optional)" hint="The result is saved to that restaurant's library.">
              <Select name="dishId" defaultValue=""><option value="">— None —</option>{dishOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</Select>
            </Field>
            <PromptRules />
            <button className="h-12 rounded-full bg-ink px-7 text-[15px] font-medium text-ivory">Create image</button>
          </form>
          <Results jobs={jobs.filter((j) => j.kind === "image_create" || j.kind === "photo_recreate")} rname={rname} />
        </div>
      )}

      {tab === "video" && (
        <div className="grid lg:grid-cols-[1fr_1fr] gap-10 items-start">
          <form action={studioFilm} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <UploadInput name="imageUrl" label="Upload a dish photo" blobEnabled={blob} />
              <div className="rounded-2xl bg-surface p-4 text-[13px] text-mute">Or pick a dish below — its menu photo is used as the first frame.</div>
            </div>
            <Field label="Dish"><Select name="dishId" defaultValue=""><option value="">— Uploaded photo —</option>{dishOptions.filter((o) => o.d.imageUrl).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</Select></Field>
            <Field label="Subject (when using an upload)"><Input name="subject" placeholder="Wagyu tenderloin with truffle jus" /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Camera"><Select name="move">{Object.entries(CAMERA_MOVES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
              <Field label="Length"><Select name="duration" defaultValue="5"><option value="5">5 sec</option><option value="8">8 sec</option><option value="10">10 sec</option></Select></Field>
              <Field label="Frame"><Select name="aspect" defaultValue="9:16"><option value="9:16">9:16</option><option value="16:9">16:9</option><option value="1:1">1:1</option></Select></Field>
            </div>
            <Field label="Engine" hint={`Wan 3.0 is primary; a stalled run retries once on H3 Lite.`}>
              <Select name="engine" defaultValue={engines.film}>{enginesOf("film").map((e) => <option key={e.key} value={e.key}>{e.name} · {money(estimateCents(e.key, 5))} per 5 s</option>)}</Select>
            </Field>
            <Field label="Mood (optional)"><Input name="mood" placeholder="candlelit, intimate, warm amber" /></Field>
            <label className="flex items-center gap-3 text-[14px]"><input type="checkbox" name="attach" className="size-5" /> Put the finished film on the dish&apos;s menu page</label>
            <PromptRules />
            <button className="h-12 rounded-full bg-ink px-7 text-[15px] font-medium text-ivory">Make film</button>
          </form>
          <Results jobs={jobs.filter((j) => j.kind === "film")} rname={rname} />
        </div>
      )}

      {tab === "3d" && (
        <div className="space-y-14">
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <form action={studio3d} className="space-y-5">
              <h2 className="font-display text-3xl">Build from photos</h2>
              <p className="text-[14px] text-mute -mt-3">Four sides of the plate, shot at table height. Best for a fast AR draft.</p>
              <div className="grid grid-cols-4 gap-2">
                {(["front", "right", "back", "left"] as const).map((k) => <UploadInput key={k} name={k} label={k[0].toUpperCase() + k.slice(1)} blobEnabled={blob} compact />)}
              </div>
              <Field label="Dish"><Select name="dishId" defaultValue=""><option value="">— None —</option>{dishOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</Select></Field>
              <Field label="Engine"><Select name="engine" defaultValue={engines.model3d}>{enginesOf("model3d").map((e) => <option key={e.key} value={e.key}>{e.name} · {money(e.priceCents)}</option>)}</Select></Field>
              <button className="h-12 rounded-full bg-ink px-7 text-[15px] font-medium text-ivory">Build AR model</button>
            </form>
            <form action={attachModel} className="space-y-5">
              <h2 className="font-display text-3xl">Upload a finished model</h2>
              <p className="text-[14px] text-mute -mt-3">Highest quality: shoot 60–120 photos on a turntable, build it free with Apple Object Capture on your Mac, then upload the files here.</p>
              <div className="grid grid-cols-2 gap-2">
                <UploadInput name="glbUrl" label="GLB (Android + web)" accept=".glb,model/gltf-binary" blobEnabled={blob} compact />
                <UploadInput name="usdzUrl" label="USDZ (iPhone, optional)" accept=".usdz,model/vnd.usdz+zip" blobEnabled={blob} compact />
              </div>
              <Field label="Dish"><Select name="dishId" required defaultValue="">{[<option key="" value="" disabled>Choose a dish</option>, ...dishOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)]}</Select></Field>
              <button className="h-12 rounded-full bg-ink px-7 text-[15px] font-medium text-ivory">Attach to dish</button>
            </form>
          </div>

          <div>
            <SectionTitle>Dishes in AR</SectionTitle>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allDishes.filter((d) => d.modelGlbUrl).slice(0, 6).map((d) => (
                <div key={d.id} className="rounded-[2rem] bg-surface overflow-hidden">
                  <ModelViewer src={d.modelGlbUrl!} iosSrc={d.modelUsdzUrl} alt={d.name} className="aspect-square" arLabel="Test on my table" />
                  <div className="px-5 py-4 flex items-center justify-between">
                    <div>
                      <div className="text-[14px] font-medium">{d.name}</div>
                      <div className="text-[12.5px] text-mute">{rname.get(d.restaurantId)}</div>
                    </div>
                    <a href={`/ar/${d.id}`} target="_blank" className="text-[13px] underline underline-offset-4">AR link</a>
                  </div>
                </div>
              ))}
              <div className="rounded-[2rem] bg-surface overflow-hidden">
                <ModelViewer src="/models/barramundi.glb" iosSrc="/models/barramundi.usdz" alt="Test model" className="aspect-square" arLabel="Test on my table" />
                <div className="px-5 py-4 text-[12.5px] text-mute">Test model from your ar-menu-demo repo (GLB + USDZ). Use it to check AR on any phone.</div>
              </div>
            </div>
          </div>
          <div>
            <SectionTitle>3D jobs</SectionTitle>
            <Results jobs={jobs.filter((j) => j.kind === "model3d")} rname={rname} />
          </div>
        </div>
      )}

      {tab === "library" && <Library />}
    </>
  );
}

function PromptRules() {
  return (
    <details className="rounded-2xl bg-surface px-5 py-4 text-[13px]">
      <summary className="cursor-pointer font-medium">Built-in rules (always sent)</summary>
      <p className="mt-3 text-ink-2">{DISH_LOCK}</p>
      <p className="mt-3 text-mute"><span className="font-medium text-ink-2">Never:</span> {FOOD_NEGATIVE}.</p>
    </details>
  );
}

function Results({ jobs, rname }: { jobs: Awaited<ReturnType<typeof jobsFor>>; rname: Map<string, string> }) {
  if (!jobs.length) return <p className="text-sm text-mute">Nothing made yet.</p>;
  return (
    <div className="space-y-3">
      {jobs.map((j) => {
        const out = j.output as { videoUrl?: string; imageUrl?: string; poster?: string };
        return (
          <div key={j.id} className="space-y-2">
            {j.status === "succeeded" && out.videoUrl ? <video src={out.videoUrl} poster={out.poster} controls playsInline className="w-full max-h-[520px] rounded-3xl bg-ink object-contain" /> : null}
            {j.status === "succeeded" && out.imageUrl ? <img src={out.imageUrl} alt="" className="w-full rounded-3xl" /> : null}
            <JobRow job={j} showCost restaurantName={j.restaurantId ? rname.get(j.restaurantId) : "Studio"} />
            <form action={deleteJob} className="text-right"><input type="hidden" name="id" value={j.id} /><button className="text-[12.5px] text-mute hover:text-bad">Delete</button></form>
          </div>
        );
      })}
    </div>
  );
}

async function Library() {
  const db = await getDb();
  const media = await db.select().from(schema.media).orderBy(desc(schema.media.createdAt)).limit(60);
  const dishes = await db.select().from(schema.dishes);
  const pics = [...media.filter((m) => m.url && m.url !== "local-only").map((m) => ({ id: m.id, url: m.url, kind: m.kind })), ...dishes.filter((d) => d.imageUrl).map((d) => ({ id: d.id, url: d.imageUrl!, kind: "menu photo" }))];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
      {pics.map((p) => (
        <a key={p.id} href={p.url} target="_blank" className="relative aspect-square overflow-hidden rounded-2xl bg-surface">
          {p.kind === "film" || p.kind === "video" ? <video src={p.url} muted className="size-full object-cover" /> : p.kind === "model" ? <div className="grid size-full place-items-center text-[12px] text-mute">3D model</div> : <img src={p.url} alt="" className="size-full object-cover" />}
          <span className="absolute bottom-1.5 left-1.5 rounded-full bg-white/90 px-2 text-[10.5px]">{p.kind}</span>
        </a>
      ))}
    </div>
  );
}
