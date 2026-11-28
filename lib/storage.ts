import "server-only";
import { env } from "./env";

/* Replicate links expire after about an hour, so finished files are copied to
   Vercel Blob. Without Blob connected (demo), the original link is kept. */
export async function persist(url: string, path: string): Promise<string> {
  if (!env.blobToken || !url.startsWith("http")) return url;
  try {
    const { put } = await import("@vercel/blob");
    const res = await fetch(url);
    if (!res.ok) return url;
    const blob = await res.blob();
    const saved = await put(path, blob, { access: "public", addRandomSuffix: true, token: env.blobToken });
    return saved.url;
  } catch {
    return url;
  }
}
