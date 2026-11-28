import { getClientContext } from "@/lib/client";
import { dishesFor } from "@/lib/data";
import { Field, Input, PageHead, Select } from "@/components/ui";
import { ConciergeTester } from "@/components/ConciergeTester";
import { saveConcierge } from "../../actions";

export const metadata = { title: "Concierge" };

function Toggle({ name, label, help, defaultChecked }: { name: string; label: string; help: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-start justify-between gap-6 py-4 cursor-pointer">
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        <span className="block text-[13px] text-mute mt-0.5">{help}</span>
      </span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="relative mt-1 h-7 w-12 flex-none rounded-full bg-surface-2 transition peer-checked:bg-ok after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}

export default async function ConciergePage() {
  const { restaurant } = await getClientContext();
  const dishes = await dishesFor(restaurant.id);
  const c = restaurant.concierge ?? {};
  const unconfirmed = dishes.filter((d) => !d.allergensConfirmed).length;
  return (
    <>
      <PageHead eyebrow="AI Concierge" title="Your digital maître d’." sub="It recommends, filters and answers from your menu only — allergens and nutrition exactly as your kitchen confirmed them." />
      {unconfirmed ? <div className="mb-8 rounded-3xl bg-warn/10 text-warn px-5 py-4 text-[14px]">{unconfirmed} dish{unconfirmed > 1 ? "es have" : " has"} allergens still to confirm. Until then, the concierge asks guests to check with their server.</div> : null}
      <div className="grid lg:grid-cols-2 gap-10 items-start">
        <form action={saveConcierge} className="space-y-6">
          <div>
            <div className="text-[13px] font-medium text-ink-2 mb-2">Languages</div>
            <div className="flex gap-2">
              {[["en", "English"], ["fr", "Français"], ["es", "Español"]].map(([k, l]) => (
                <label key={k} className="cursor-pointer">
                  <input type="checkbox" name="languages" value={k} defaultChecked={restaurant.languages.includes(k)} className="peer sr-only" />
                  <span className="inline-flex h-10 items-center rounded-full bg-surface px-4 text-[13px] peer-checked:bg-ink peer-checked:text-ivory">{l}</span>
                </label>
              ))}
            </div>
          </div>
          <Field label="Tone">
            <Select name="tone" defaultValue={c.tone ?? "warm"}>
              <option value="warm">Warm and welcoming</option>
              <option value="refined">Refined and concise</option>
              <option value="playful">Playful</option>
            </Select>
          </Field>
          <Field label="Greeting" hint="The first line guests see."><Input name="greeting" defaultValue={c.greeting ?? ""} placeholder="Good evening. What are you in the mood for?" /></Field>
          <div className="rounded-3xl bg-surface px-5">
            <Toggle name="pairings" label="Wine and cocktail pairings" help="Suggest the pairing you entered for each dish." defaultChecked={c.pairings ?? true} />
            <div className="hairline" />
            <Toggle name="nutrition" label="Nutrition insights" help="Answer calorie and protein questions from your numbers." defaultChecked={c.nutrition ?? true} />
          </div>
          <div>
            <div className="text-[13px] font-medium text-ink-2 mb-2">Dishes to favour</div>
            <div className="flex flex-wrap gap-2">
              {dishes.map((d) => (
                <label key={d.id} className="cursor-pointer">
                  <input type="checkbox" name="featured" value={d.id} defaultChecked={c.featured?.includes(d.id)} className="peer sr-only" />
                  <span className="inline-flex h-9 items-center rounded-full bg-surface px-4 text-[13px] peer-checked:bg-ink peer-checked:text-ivory">{d.name}</span>
                </label>
              ))}
            </div>
          </div>
          <button className="h-12 rounded-full bg-ink px-7 text-[15px] font-medium text-ivory">Save</button>
        </form>
        <ConciergeTester slug={restaurant.slug} />
      </div>
    </>
  );
}
