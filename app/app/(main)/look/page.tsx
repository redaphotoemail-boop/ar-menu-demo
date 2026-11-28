import { getClientContext } from "@/lib/client";
import { PageHead } from "@/components/ui";
import { TemplatePicker } from "@/components/TemplatePicker";
import { setTemplate } from "../../actions";

export const metadata = { title: "Look" };

export default async function LookPage() {
  const { restaurant } = await getClientContext();
  return (
    <>
      <PageHead eyebrow="Look" title="Your template." sub="Switch anytime. Your dishes, films and AR come with you." />
      <TemplatePicker current={restaurant.template} menu={`/api/public/menus/${restaurant.slug}`} submitLabel="Save this look" action={setTemplate} />
    </>
  );
}
