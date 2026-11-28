import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt } from "drizzle-orm";
import { getDb, schema } from "./db";
import { demoMode, env } from "./env";
import { newId } from "./id";
import type { Role, User } from "./db/schema";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
export const SESSION_COOKIE = "tw_session";
const SESSION_DAYS = 14;
export const STAFF_ROLES: Role[] = ["owner", "manager", "finance", "studio"];

function secret() {
  return process.env.SESSION_SECRET || createHash("sha256").update(`tw:${env.databaseUrl}:${env.googleClientSecret}:demo`).digest("hex");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null) {
  if (!stored) return false;
  const [, saltHex, keyHex] = stored.split("$");
  if (!saltHex || !keyHex) return false;
  const key = await scrypt(password, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(keyHex, "hex");
  return expected.length === key.length && timingSafeEqual(expected, key);
}

type Payload = { sid: string; uid: string; email: string; name: string; role: Role; exp: number };

function sign(data: string) {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

function encode(p: Payload) {
  const body = Buffer.from(JSON.stringify(p)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(token: string | undefined): Payload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload;
    return p.exp > Date.now() ? p : null;
  } catch {
    return null;
  }
}

/* Owner access is only granted to a Google-verified identity, never to an email/password signup. */
export function roleForEmail(email: string, current?: Role, verified = false): Role {
  if (verified && env.adminEmails.includes(email.toLowerCase())) return "owner";
  return current ?? "client";
}

/* Creates the session row + signed cookie. Call from a Route Handler or Server Action. */
export async function startSession(user: Pick<User, "id" | "email" | "name" | "role">) {
  const db = await getDb();
  const sid = newId("s");
  const exp = Date.now() + SESSION_DAYS * 86400000;
  await db.insert(schema.sessions).values({ id: sid, userId: user.id, tokenHash: sid, expiresAt: new Date(exp) });
  await db.update(schema.users).set({ lastSeenAt: new Date() }).where(eq(schema.users.id, user.id));
  const jar = await cookies();
  jar.set(SESSION_COOKIE, encode({ sid, uid: user.id, email: user.email, name: user.name, role: user.role, exp }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function endSession() {
  const jar = await cookies();
  const p = decode(jar.get(SESSION_COOKIE)?.value);
  if (p) {
    const db = await getDb();
    await db.delete(schema.sessions).where(eq(schema.sessions.id, p.sid));
  }
  jar.delete(SESSION_COOKIE);
}

export async function getUser(): Promise<User | null> {
  const p = decode((await cookies()).get(SESSION_COOKIE)?.value);
  if (!p) return null;
  const db = await getDb();
  if (!demoMode) {
    // Production: the session must still exist (logout and suspensions revoke it).
    const live = await db
      .select({ id: schema.sessions.id })
      .from(schema.sessions)
      .where(and(eq(schema.sessions.id, p.sid), gt(schema.sessions.expiresAt, new Date())))
      .limit(1);
    if (!live[0]) return null;
  }
  let row = (await db.select().from(schema.users).where(eq(schema.users.id, p.uid)).limit(1))[0];
  if (!row && demoMode) {
    // Demo database is in memory per server instance — restore the account from the signed cookie.
    await db.insert(schema.users).values({ id: p.uid, email: p.email, name: p.name, role: p.role }).onConflictDoNothing();
    row = (await db.select().from(schema.users).where(eq(schema.users.id, p.uid)).limit(1))[0];
  }
  if (!row || row.status !== "active") return null;
  return row;
}

export async function requireUser(next = "/app"): Promise<User> {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireStaff(roles: Role[] = STAFF_ROLES): Promise<User> {
  const user = await requireUser("/admin");
  if (!roles.includes(user.role)) redirect(user.role === "client" ? "/app" : "/admin");
  return user;
}

export function isStaff(user: Pick<User, "role"> | null) {
  return Boolean(user && STAFF_ROLES.includes(user.role));
}

/* Find or create an account from a verified identity (Google or email signup). */
export async function upsertUser(input: { email: string; name: string; googleSub?: string; passwordHash?: string }) {
  const db = await getDb();
  const email = input.email.trim().toLowerCase();
  const found = (await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1))[0];
  if (found) {
    const role = roleForEmail(email, found.role, Boolean(input.googleSub));
    await db
      .update(schema.users)
      .set({ role, googleSub: input.googleSub ?? found.googleSub, name: found.name || input.name })
      .where(eq(schema.users.id, found.id));
    return { ...found, role, created: false };
  }
  const user = {
    id: newId("u"),
    email,
    name: input.name || email.split("@")[0],
    role: roleForEmail(email, undefined, Boolean(input.googleSub)),
    googleSub: input.googleSub ?? null,
    passwordHash: input.passwordHash ?? null,
  };
  await db.insert(schema.users).values(user);
  await db.insert(schema.events).values({ id: newId("e"), actorId: user.id, action: "signup", detail: `${user.name} created an account${input.googleSub ? " (Google)" : ""}` });
  const row = (await db.select().from(schema.users).where(eq(schema.users.id, user.id)).limit(1))[0];
  return { ...row, created: true };
}

export function homeFor(user: Pick<User, "role">) {
  return isStaff(user) ? "/admin" : "/app";
}
