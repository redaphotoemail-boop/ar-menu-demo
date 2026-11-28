import { requireStaff } from "@/lib/auth";
import { getEngines, getFlags } from "@/lib/data";
import { demoMode, integrations } from "@/lib/env";
import { FLAG_COPY, type Flags } from "@/lib/defaults";
import { enginesOf, estimateCents } from "@/lib/ai/engines";
import { money } from "@/lib/defaults";
import { Field, PageHead, SectionTitle, Select } from "@/components/ui";
import { Icon } from "@/components/icons";
import { saveEngines, toggleFlag } from "../actions";

export const metadata = { title: "Settings" };

const CONNECT: { key: keyof typeof integrations; name: string; env: string; what: string }[] = [
  { key: "database", name: "Database (Neon Postgres)", env: "DATABASE_URL", what: "Saves everything for real. Add Neon from the Vercel Marketplace — it fills this in. Demo mode turns off by itself." },
  { key: "google", name: "Google sign-in", env: "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET", what: "“Continue with Google”, same as MotionWren." },
  { key: "blob", name: "File storage (Vercel Blob)", env: "BLOB_READ_WRITE_TOKEN", what: "Photos, videos, 360 frames and 3D files. Add a Blob store in Vercel → Storage." },
  { key: "replicate", name: "AI engines (Replicate)", env: "REPLICATE_API_TOKEN", what: "Wan 3.0, H3, FLUX, Hunyuan3D. Same wallet as MotionWren." },
  { key: "stripe", name: "Payments (Stripe)", env: "STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET", what: "Memberships with card, Apple Pay and Google Pay." },
  { key: "kiri", name: "KIRI photogrammetry (optional)", env: "KIRI_API_KEY", what: "True photogrammetry from the full 360 capture. $1 a scan, $500 minimum top-up." },
];

export default async function Settings() {
  await requireStaff(["owner"]);
  const [flags, engines] = await Promise.all([getFlags(), getEngines()]);
  return (
    <>
      <PageHead eyebrow="Settings" title="How the platform runs." sub={demoMode ? "You're in demo mode. Connect the database to start saving for real." : "Live mode — everything is saved."} />

      <SectionTitle>Features</SectionTitle>
      <div className="rounded-[2rem] bg-surface px-6">
        {(Object.keys(FLAG_COPY) as (keyof Flags)[]).map((k, i) => (
          <form key={k} action={toggleFlag} className={`flex items-center justify-between gap-6 py-5 ${i ? "border-t border-ink/5" : ""}`}>
            <input type="hidden" name="key" value={k} />
            <div>
              <div className="text-[15px] font-medium">{FLAG_COPY[k].label}</div>
              <div className="text-[13px] text-mute mt-0.5 max-w-xl">{FLAG_COPY[k].help}</div>
            </div>
            <button aria-label={`Turn ${FLAG_COPY[k].label} ${flags[k] ? "off" : "on"}`} className={`relative h-7 w-12 flex-none rounded-full transition ${flags[k] ? "bg-ok" : "bg-surface-2"}`}>
              <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition ${flags[k] ? "left-6" : "left-1"}`} />
            </button>
          </form>
        ))}
      </div>

      <SectionTitle>Default engines</SectionTitle>
      <form action={saveEngines} className="rounded-[2rem] bg-surface p-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <Field label="Dish films"><Select name="film" defaultValue={engines.film} className="!bg-white">{enginesOf("film").map((e) => <option key={e.key} value={e.key}>{e.name} · {money(estimateCents(e.key, 5))}/5s</option>)}</Select></Field>
        <Field label="Film backup"><Select name="filmBackup" defaultValue={engines.filmBackup} className="!bg-white">{enginesOf("film").map((e) => <option key={e.key} value={e.key}>{e.name}</option>)}</Select></Field>
        <Field label="Photos"><Select name="image" defaultValue={engines.image} className="!bg-white">{enginesOf("image").map((e) => <option key={e.key} value={e.key}>{e.name}</option>)}</Select></Field>
        <Field label="AR models"><Select name="model3d" defaultValue={engines.model3d} className="!bg-white">{enginesOf("model3d").map((e) => <option key={e.key} value={e.key}>{e.name}</option>)}</Select></Field>
        <button className="h-11 rounded-full bg-ink px-6 text-sm font-medium text-ivory sm:col-span-2 lg:col-span-4 justify-self-start">Save engines</button>
      </form>

      <SectionTitle>Connections</SectionTitle>
      <div className="space-y-1.5">
        {CONNECT.map((c) => (
          <div key={c.key} className="flex items-start gap-4 rounded-3xl bg-surface px-5 py-4">
            <span className={`mt-0.5 grid size-7 flex-none place-items-center rounded-full ${integrations[c.key] ? "bg-ok text-white" : "bg-white text-mute"}`}>{integrations[c.key] ? <Icon.check className="size-4" /> : <span className="size-1.5 rounded-full bg-current" />}</span>
            <div className="flex-1">
              <div className="text-[15px] font-medium">{c.name}</div>
              <div className="text-[13px] text-mute mt-0.5">{c.what}</div>
              <div className="mt-1 text-[12px] font-mono text-ink-2/70">{c.env}</div>
            </div>
            <span className="text-[12.5px] text-mute">{integrations[c.key] ? "Connected" : "Not yet"}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[13px] text-mute">Keys are added in Vercel → Project → Settings → Environment Variables. Step-by-step: docs/SETUP.md in the repo.</p>
    </>
  );
}
