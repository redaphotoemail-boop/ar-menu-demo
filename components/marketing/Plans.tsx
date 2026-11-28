import Link from "next/link";
import type { Plan } from "@/lib/db/schema";
import { money } from "@/lib/defaults";
import { Icon } from "@/components/icons";
import { btn } from "@/components/ui";

export function Plans({ plans }: { plans: Plan[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {plans.map((p) => (
        <div key={p.id} className={`rounded-[2rem] p-8 flex flex-col ${p.highlight ? "bg-ink text-ivory" : "bg-surface"}`}>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-3xl">{p.name}</h3>
            {p.highlight ? <span className="text-[11px] tracking-[.2em] uppercase text-gold-soft">Most chosen</span> : null}
          </div>
          <p className={`mt-2 text-sm ${p.highlight ? "text-ivory/70" : "text-mute"}`}>{p.blurb}</p>
          <div className="mt-8 flex items-baseline gap-1">
            <span className="text-5xl font-semibold tracking-tight">{money(p.priceCents)}</span>
            <span className={p.highlight ? "text-ivory/60" : "text-mute"}>/ month</span>
          </div>
          <ul className="mt-8 space-y-3 text-[14px] flex-1">
            {p.features.map((f) => (
              <li key={f} className="flex gap-3">
                <Icon.check className={`size-4 mt-0.5 flex-none ${p.highlight ? "text-gold-soft" : "text-gold"}`} />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Link href={`/signup?plan=${p.id}`} className={btn({ variant: p.highlight ? "gold" : "primary", size: "lg", className: "mt-10 w-full" })}>
            Choose {p.name}
          </Link>
        </div>
      ))}
    </div>
  );
}
