import { BRAND } from "@/lib/brand";

export const metadata = { title: "Terms of service" };

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl px-6 pt-20">
      <h1 className="font-display text-5xl">Terms of service</h1>
      <p className="mt-6 text-mute">Draft — to be replaced with the final text before launch.</p>
      <p className="mt-6 leading-7">{BRAND.name} is operated by {BRAND.operator}. Questions: {BRAND.supportEmail}.</p>
    </div>
  );
}
