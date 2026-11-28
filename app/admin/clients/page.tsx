import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { restaurantsWithPlans } from "@/lib/data";
import { money } from "@/lib/defaults";
import { PageHead, Status } from "@/components/ui";
import { viewAs } from "../actions";

export const metadata = { title: "Clients" };

export default async function Clients() {
  await requireStaff();
  const rows = await restaurantsWithPlans();
  return (
    <>
      <PageHead eyebrow="Clients" title="Restaurants." sub={`${rows.length} accounts. Open one to see its menu, media, work and billing.`} />
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-[14px] min-w-[760px] border-separate border-spacing-y-1.5">
          <thead>
            <tr className="text-left text-[12px] text-mute">
              <th className="font-normal px-4 py-2">Restaurant</th>
              <th className="font-normal px-4 py-2">Owner</th>
              <th className="font-normal px-4 py-2">Membership</th>
              <th className="font-normal px-4 py-2">Menu</th>
              <th className="font-normal px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ restaurant: r, owner, plan, sub, dishCount, arCount }) => (
              <tr key={r.id} className="group">
                <td className="px-4 py-4 rounded-l-3xl bg-surface group-hover:bg-surface-2">
                  <Link href={`/admin/clients/${r.id}`} className="font-medium hover:underline underline-offset-4">{r.name}</Link>
                  <div className="text-[12.5px] text-mute">{r.city || "—"} · {r.cuisine || "—"}</div>
                </td>
                <td className="px-4 py-4 bg-surface group-hover:bg-surface-2">
                  <div>{owner?.name}</div>
                  <div className="text-[12.5px] text-mute">{owner?.email}</div>
                </td>
                <td className="px-4 py-4 bg-surface group-hover:bg-surface-2">
                  {plan ? <div>{plan.name} · {money(plan.priceCents)}</div> : <div className="text-mute">None</div>}
                  {sub ? <div className="mt-1"><Status value={sub.status} /></div> : null}
                </td>
                <td className="px-4 py-4 bg-surface group-hover:bg-surface-2">{dishCount} dishes · {arCount} AR<div className="text-[12.5px] text-mute">Step {Math.min(r.onboardingStep, 6)} of 6</div></td>
                <td className="px-4 py-4 bg-surface group-hover:bg-surface-2"><Status value={r.status} /></td>
                <td className="px-4 py-4 rounded-r-3xl bg-surface group-hover:bg-surface-2 text-right whitespace-nowrap">
                  <form action={viewAs} className="inline"><input type="hidden" name="rid" value={r.id} /><button className="text-[13px] underline underline-offset-4 mr-4">View as client</button></form>
                  <a href={`/m/${r.slug}`} target="_blank" className="text-[13px] underline underline-offset-4">Menu</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
