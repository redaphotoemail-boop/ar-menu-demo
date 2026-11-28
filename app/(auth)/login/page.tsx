import { redirect } from "next/navigation";
import { getUser, homeFor } from "@/lib/auth";
import { AuthShell } from "../AuthShell";

export const metadata = { title: "Sign in" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const user = await getUser();
  if (user) redirect(homeFor(user));
  return <AuthShell mode="login" next={sp.next ?? ""} error={sp.error} />;
}
