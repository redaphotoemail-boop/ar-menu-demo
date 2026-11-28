import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { homeFor, startSession, upsertUser } from "@/lib/auth";
import { getMyRestaurant } from "@/lib/data";
import { safeNext } from "@/lib/nav";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jar = await cookies();
  const [stateCookie, next] = (jar.get("tw_google_state")?.value || "").split("|");
  jar.delete("tw_google_state");
  const fail = () => Response.redirect(new URL("/login?error=google", request.url), 302);
  const code = url.searchParams.get("code");
  if (!code || !stateCookie || stateCookie !== url.searchParams.get("state")) return fail();

  const redirectUri = new URL("/api/auth/google/callback", env.appUrl || request.url).toString();
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: env.googleClientId, client_secret: env.googleClientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
  });
  if (!tokenRes.ok) return fail();
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) return fail();
  const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  if (!profileRes.ok) return fail();
  const profile = (await profileRes.json()) as { sub?: string; email?: string; email_verified?: boolean; name?: string };
  if (!profile.email || profile.email_verified === false) return fail();

  const user = await upsertUser({ email: profile.email, name: profile.name || "", googleSub: profile.sub });
  if (user.status !== "active") return fail();
  await startSession(user);
  let dest = safeNext(next) || homeFor(user);
  if (dest === "/app" && !(await getMyRestaurant(user))) dest = "/app/onboarding";
  return Response.redirect(new URL(dest, request.url), 302);
}
