import { cookies } from "next/headers";
import { env } from "@/lib/env";

/* Sign in with Google — same flow as MotionWren (no third-party auth library). */
export async function GET(request: Request) {
  if (!env.googleClientId) return Response.redirect(new URL("/login?error=google", request.url), 302);
  const url = new URL(request.url);
  const state = crypto.randomUUID().replace(/-/g, "");
  const next = url.searchParams.get("next") || "";
  const jar = await cookies();
  jar.set("tw_google_state", `${state}|${next}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    response_type: "code",
    scope: "openid email profile",
    redirect_uri: new URL("/api/auth/google/callback", env.appUrl || request.url).toString(),
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 302);
}
