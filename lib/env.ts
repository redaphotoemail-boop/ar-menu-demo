import "server-only";

/* What is connected. Every integration is optional: when a key is missing the
   platform keeps working in demo mode instead of crashing, and the owner's
   Settings page shows exactly what is still to connect. */
export const env = {
  databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL || "",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  adminEmails: (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean),
  stripeSecret: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  replicateToken: process.env.REPLICATE_API_TOKEN || "",
  blobToken: process.env.BLOB_READ_WRITE_TOKEN || "",
  kiriKey: process.env.KIRI_API_KEY || "",
  appUrl: process.env.APP_URL || "",
};

export const integrations = {
  database: Boolean(env.databaseUrl),
  google: Boolean(env.googleClientId && env.googleClientSecret),
  stripe: Boolean(env.stripeSecret),
  replicate: Boolean(env.replicateToken),
  blob: Boolean(env.blobToken),
  kiri: Boolean(env.kiriKey),
};

/* Demo mode: on automatically until a real database is connected, or forced
   with DEMO_MODE=1. It seeds sample restaurants and offers one-tap demo
   sign-in. It turns itself off once DATABASE_URL is set (unless forced). */
export const demoMode = process.env.DEMO_MODE === "1" || (!integrations.database && process.env.DEMO_MODE !== "0");
