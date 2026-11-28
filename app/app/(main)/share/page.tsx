import QRCode from "qrcode";
import { getClientContext } from "@/lib/client";
import { dishesFor } from "@/lib/data";
import { siteOrigin } from "@/lib/site";
import { PageHead, SectionTitle, Status } from "@/components/ui";
import { CopyField } from "@/components/CopyField";
import { setLive } from "../../actions";

export const metadata = { title: "QR & sharing" };

export default async function SharePage() {
  const { restaurant } = await getClientContext();
  const origin = await siteOrigin();
  const url = `${origin}/m/${restaurant.slug}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#17140f", light: "#ffffff" } });
  const svgData = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  const dishes = (await dishesFor(restaurant.id)).filter((d) => d.modelGlbUrl);
  const arQrs = await Promise.all(dishes.map(async (d) => ({ d, svg: await QRCode.toString(`${origin}/ar/${d.id}`, { type: "svg", margin: 1 }) })));
  const embed = `<iframe src="${url}" style="width:100%;height:820px;border:0;border-radius:24px" allow="xr-spatial-tracking; fullscreen" title="${restaurant.name} menu"></iframe>`;

  return (
    <>
      <PageHead eyebrow="QR & sharing" title="Put it on every table." sub="One QR code opens your menu, the concierge and AR — no app to download." />
      <div className="grid lg:grid-cols-[320px_1fr] gap-12 items-start">
        <div className="rounded-[2rem] bg-white p-8 text-center shadow-[0_30px_60px_-30px_rgba(0,0,0,.25)]">
          <div className="font-display text-3xl">{restaurant.name}</div>
          <div className="eyebrow mt-2">Scan for the menu</div>
          <img src={svgData} alt="Menu QR code" className="mx-auto mt-6 size-52" />
          <p className="mt-5 text-[12px] text-mute">See every dish on your table in AR</p>
          <a href={svgData} download={`${restaurant.slug}-menu-qr.svg`} className="mt-6 inline-flex h-10 items-center rounded-full bg-surface px-5 text-[13px] font-medium">Download QR (SVG)</a>
        </div>
        <div className="space-y-8">
          <div className="flex items-center justify-between rounded-3xl bg-surface px-6 py-5">
            <div>
              <div className="text-[15px] font-medium">Menu status</div>
              <div className="text-[13px] text-mute">{restaurant.status === "live" ? "Guests can open your menu." : "Only you can see it for now."}</div>
            </div>
            <div className="flex items-center gap-4">
              <Status value={restaurant.status} />
              <form action={setLive}>
                <input type="hidden" name="live" value={restaurant.status === "live" ? "0" : "1"} />
                <button className="h-10 rounded-full bg-ink px-5 text-[13px] text-ivory">{restaurant.status === "live" ? "Unpublish" : "Publish"}</button>
              </form>
            </div>
          </div>
          <CopyField label="Menu link" value={url} />
          <CopyField label="Website embed" value={embed} multiline hint="Paste into your website builder (Squarespace, Wix, WordPress…) as custom code." />
          <SectionTitle>AR table cards</SectionTitle>
          {arQrs.length ? (
            <div className="grid sm:grid-cols-3 gap-3">
              {arQrs.map(({ d, svg }) => (
                <div key={d.id} className="rounded-3xl bg-white p-5 text-center">
                  <img src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} alt="" className="mx-auto size-28" />
                  <div className="mt-3 text-[14px] font-medium">{d.name}</div>
                  <div className="text-[12px] text-mute">Scan to see it on your table</div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-mute">Once a dish is in AR, its table card appears here.</p>}
        </div>
      </div>
    </>
  );
}
