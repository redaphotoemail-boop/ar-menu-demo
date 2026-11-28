export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
/* Short human reference for every job (like MotionWren's video reference numbers). */
export function newRef() {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return "TW-" + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "restaurant";
}
