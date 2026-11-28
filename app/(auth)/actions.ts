"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { endSession, hashPassword, homeFor, startSession, upsertUser, verifyPassword } from "@/lib/auth";
import { demoMode, env } from "@/lib/env";
import { getMyRestaurant } from "@/lib/data";
import { safeNext } from "@/lib/nav";

export type AuthState = { error?: string };

const SignUp = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  email: z.string().trim().email("Please enter a valid email."),
  password: z.string().min(8, "Use at least 8 characters."),
});

async function destination(user: { id: string; role: string } & Parameters<typeof homeFor>[0], next: string) {
  const home = homeFor(user);
  if (home === "/app") {
    const r = await getMyRestaurant(user as never);
    if (!r) return "/app/onboarding";
  }
  return safeNext(next) || home;
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = SignUp.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const db = await getDb();
  const existing = (await db.select().from(schema.users).where(eq(schema.users.email, parsed.data.email.toLowerCase())).limit(1))[0];
  if (existing) return { error: "An account with this email already exists. Sign in instead." };
  if (env.adminEmails.includes(parsed.data.email.toLowerCase())) return { error: "This address is reserved for the owner. Continue with Google instead." };
  const user = await upsertUser({ email: parsed.data.email, name: parsed.data.name, passwordHash: await hashPassword(parsed.data.password) });
  await startSession(user);
  redirect(await destination(user, String(form.get("next") || "")));
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const db = await getDb();
  const user = (await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1))[0];
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: user && !user.passwordHash ? "This account uses Google. Continue with Google above." : "That email and password don't match." };
  }
  if (user.status !== "active") return { error: "This account is paused. Contact us to reopen it." };
  await startSession(user);
  redirect(await destination(user, String(form.get("next") || "")));
}

/* Demo only: one tap into a sample account. Disabled automatically once a real database is connected. */
export async function demoSignIn(form: FormData) {
  if (!demoMode) redirect("/login");
  const who = String(form.get("as") || "client");
  const db = await getDb();
  const id = who === "owner" ? "u_owner" : who === "new" ? null : "u_vera";
  if (id) {
    const user = (await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1))[0];
    if (!user) redirect("/login");
    await startSession(user);
    redirect(who === "owner" ? "/admin" : "/app");
  }
  // A brand-new restaurant account, to walk through onboarding.
  const stamp = Date.now().toString(36);
  const user = await upsertUser({ email: `new-${stamp}@tablewren.demo`, name: "Alex Morgan" });
  await startSession(user);
  redirect("/app/onboarding");
}

export async function signOut() {
  await endSession();
  redirect("/");
}
