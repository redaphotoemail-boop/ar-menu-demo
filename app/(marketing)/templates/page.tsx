import Link from "next/link";
import { Phone } from "@/components/marketing/Phone";
import { TEMPLATES } from "@/lib/defaults";
import { Icon } from "@/components/icons";
import { btn } from "@/components/ui";

export const metadata = { title: "Templates" };

export default function TemplatesPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 pt-20">
      <div className="max-w-2xl">
        <div className="eyebrow">Templates</div>
        <h1 className="mt-4 font-display text-[56px] leading-[1.02]">Ten looks. Every one has a phone menu and a website.</h1>
        <p className="mt-5 text-mute text-[17px]">These are live. Tap a dish, open the concierge, try the AR dessert.</p>
      </div>
      <div className="mt-20 grid gap-x-10 gap-y-24 sm:grid-cols-2 lg:grid-cols-3 justify-items-center">
        {TEMPLATES.map((t) => (
          <div key={t.key} className="flex flex-col items-center">
            <Phone tpl={t.key} />
            <div className="mt-6 text-center">
              <div className="font-display text-2xl">{t.name}</div>
              <div className="mt-1 text-sm text-mute">{t.mood}</div>
              <div className="mt-5 flex items-center justify-center gap-2">
                <Link href={`/signup?next=${encodeURIComponent(`/app/onboarding?template=${t.key}`)}`} className={btn({ size: "sm" })}>Use this look</Link>
                <a href={`/engine/index.html?tpl=${t.key}&mode=web&chrome=0`} target="_blank" className={btn({ size: "sm", variant: "soft" })}>
                  Website <Icon.external className="size-3.5" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
