import { requireStaff } from "@/lib/auth";
import { listPlans } from "@/lib/data";
import { Field, Input, PageHead, Textarea } from "@/components/ui";
import { savePlan } from "../actions";

export const metadata = { title: "Plans" };

export default async function PlansAdmin() {
  await requireStaff(["owner", "finance"]);
  const plans = await listPlans(true);
  return (
    <>
      <PageHead eyebrow="Plans" title="Memberships." sub="Draft prices — set your own. Changes show on the website and checkout right away. Add a Stripe Price ID to use a price you created in Stripe." />
      <div className="grid lg:grid-cols-3 gap-4 items-start">
        {plans.map((p) => (
          <form key={p.id} action={savePlan} className="rounded-[2rem] bg-surface p-6 space-y-4">
            <input type="hidden" name="id" value={p.id} />
            <div className="grid grid-cols-[1fr_110px] gap-2">
              <Field label="Name"><Input name="name" defaultValue={p.name} className="!bg-white" /></Field>
              <Field label="$ / month"><Input name="price" type="number" step="1" defaultValue={p.priceCents / 100} className="!bg-white" /></Field>
            </div>
            <Field label="One line"><Input name="blurb" defaultValue={p.blurb} className="!bg-white" /></Field>
            <Field label="What's included" hint="One per line."><Textarea name="features" rows={6} defaultValue={p.features.join("\n")} className="!bg-white text-[14px]" /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Dishes"><Input name="dishes" type="number" defaultValue={p.limits.dishes ?? 0} className="!bg-white" /></Field>
              <Field label="AR dishes"><Input name="arDishes" type="number" defaultValue={p.limits.arDishes ?? 0} className="!bg-white" /></Field>
              <Field label="Films / month"><Input name="filmsPerMonth" type="number" defaultValue={p.limits.filmsPerMonth ?? 0} className="!bg-white" /></Field>
              <Field label="Templates"><Input name="templates" type="number" defaultValue={p.limits.templates ?? 1} className="!bg-white" /></Field>
            </div>
            <Field label="Stripe Price ID (optional)"><Input name="stripePriceId" defaultValue={p.stripePriceId ?? ""} placeholder="price_…" className="!bg-white" /></Field>
            <div className="flex gap-6 text-[14px]">
              <label className="flex items-center gap-2"><input type="checkbox" name="highlight" defaultChecked={p.highlight} className="size-4" /> Highlight</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={p.active} className="size-4" /> On sale</label>
            </div>
            <button className="h-11 w-full rounded-full bg-ink text-ivory text-sm font-medium">Save {p.name}</button>
          </form>
        ))}
      </div>
    </>
  );
}
