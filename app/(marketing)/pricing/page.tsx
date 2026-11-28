import { Plans } from "@/components/marketing/Plans";
import { listPlans } from "@/lib/data";

export const metadata = { title: "Membership" };

const FAQ = [
  ["Do I need a photographer?", "No. The app guides your phone through every angle. If you prefer, request a pro shoot at cost."],
  ["Does AR need an app?", "No. Guests scan your QR code. iPhone opens Quick Look, Android opens Scene Viewer."],
  ["Who writes allergen and nutrition info?", "Your kitchen does. The concierge only repeats what you confirm."],
  ["Can I cancel?", "Anytime, from your billing page. Your menu stays online until the end of the month."],
];

export default async function PricingPage() {
  const plans = await listPlans();
  return (
    <div className="mx-auto max-w-6xl px-6 pt-20">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <div className="eyebrow">Membership</div>
        <h1 className="mt-4 font-display text-[56px] leading-[1.02]">Everything made for you. Monthly.</h1>
        <p className="mt-5 text-mute text-[17px]">Pick a plan, set up in two minutes, cancel anytime.</p>
      </div>
      <Plans plans={plans} />
      <div className="mx-auto max-w-3xl mt-32">
        {FAQ.map(([q, a]) => (
          <div key={q} className="py-7">
            <div className="text-lg font-medium">{q}</div>
            <p className="mt-2 text-mute">{a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
