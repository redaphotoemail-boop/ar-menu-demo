/* Only allow internal redirects after sign-in. */
export function safeNext(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "";
  return next;
}
