import { redirect } from "next/navigation";
import { getUser, homeFor } from "@/lib/auth";
import { AuthShell } from "../AuthShell";

export const metadata = { title: "Create your account" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; plan?: string }> }) {
  const sp = await searchParams;
  const user = await getUser();
  if (user) redirect(homeFor(user));
  const next = sp.plan ? `/app/onboarding?plan=${encodeURIComponent(sp.plan)}` : sp.next ?? "";
  return <AuthShell mode="signup" next={next} />;
}
