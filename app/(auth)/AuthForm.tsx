"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, signUp, type AuthState } from "./actions";
import { Button, Field, Input } from "@/components/ui";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? signIn : signUp, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {mode === "signup" ? (
        <Field label="Your name">
          <Input name="name" autoComplete="name" placeholder="Élise Martin" required />
        </Field>
      ) : null}
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" placeholder="you@restaurant.com" required />
      </Field>
      <Field label="Password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
        <Input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required />
      </Field>
      {state.error ? <p className="text-sm text-bad">{state.error}</p> : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}
      </Button>
      <p className="text-center text-sm text-mute pt-2">
        {mode === "login" ? (
          <>New here? <Link className="text-ink underline underline-offset-4" href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link></>
        ) : (
          <>Already a member? <Link className="text-ink underline underline-offset-4" href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Sign in</Link></>
        )}
      </p>
    </form>
  );
}
