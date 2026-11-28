import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMyRestaurant, getRestaurant } from "./data";
import { isStaff, requireUser } from "./auth";
import type { Restaurant, User } from "./db/schema";

export const VIEW_AS_COOKIE = "tw_view_as";

/* The signed-in restaurant (or, for the owner/staff, the restaurant they chose
   to "view as" from the admin). Sends new accounts to onboarding. */
export async function getClientContext(opts: { allowNoRestaurant?: boolean } = {}): Promise<{ user: User; restaurant: Restaurant; viewingAs: boolean }> {
  const user = await requireUser("/app");
  if (isStaff(user)) {
    const rid = (await cookies()).get(VIEW_AS_COOKIE)?.value;
    const r = rid ? await getRestaurant(rid) : null;
    if (!r) redirect("/admin/clients");
    return { user, restaurant: r, viewingAs: true };
  }
  const r = await getMyRestaurant(user);
  if (!r) {
    if (opts.allowNoRestaurant) return { user, restaurant: null as unknown as Restaurant, viewingAs: false };
    redirect("/app/onboarding");
  }
  return { user, restaurant: r, viewingAs: false };
}
