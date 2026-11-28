# Setup — from demo to live

The platform runs **without any keys** in demo mode: sample restaurants, sample results, one-tap demo sign-in. Each connection below switches on one real piece. Do them in this order. You do every login and every "accept terms" yourself.

All keys go in **Vercel → this project → Settings → Environment Variables** (Production + Preview), then **Redeploy**.

## 1. Database: Neon Postgres (free tier)
1. In Vercel, go to the project → **Storage** → **Create** → **Neon** (Marketplace), choose the free plan, and connect it to this project.
2. This adds `DATABASE_URL` automatically.
3. Redeploy. Tables are created on first request, and the 3 membership plans and default settings are added. **Demo mode turns off by itself.**
4. Optional: set `DEMO_SEED=1` once to load the sample restaurants into the real database too.

## 2. Owner access
| Variable | Value |
|---|---|
| `ADMIN_EMAILS` | `reda.photoemail@gmail.com` (comma-separate more owners) |
| `SESSION_SECRET` | any long random string (e.g. from 1Password's generator) |
| `APP_URL` | the final address, e.g. `https://tablewren.com` (leave empty on previews) |

Anyone signing in with an `ADMIN_EMAILS` address becomes the **owner**. Add managers, finance and studio staff in **Owner → Team**.

## 3. Google sign-in (same as MotionWren)
1. Go to Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID** → Web application.
2. Authorized redirect URIs:
   - `https://<your-domain>/api/auth/google/callback`
   - `https://ar-menu-demo-git-platform-redaphotoemail-boop.vercel.app/api/auth/google/callback` (the preview)
   - `http://localhost:3000/api/auth/google/callback` (local)
3. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

You can reuse MotionWren's OAuth client: just add the new redirect URIs to it.

## 4. File storage: Vercel Blob
In Vercel, go to the project → **Storage** → **Create** → **Blob** and connect it. This adds `BLOB_READ_WRITE_TOKEN`. Photos, videos, 360 frames and 3D files now upload straight from the phone to storage.

## 5. AI engines: Replicate (same wallet as MotionWren)
Add `REPLICATE_API_TOKEN`. Engines used:

| Use | Engine | Replicate model | Cost |
|---|---|---|---|
| Dish films (primary) | Wan 3.0 | `alibaba/wan-3` | $0.07 / second (720p) |
| Film backup | H3 Lite | `minimax/h3-lite` | $0.04 / second |
| Films (detail) | H3 / H3 Highspeed | `minimax/h3`, `minimax/h3-highspeed` | $0.08 / $0.06 per second |
| Photos | FLUX Kontext Pro | `black-forest-labs/flux-kontext-pro` | ~$0.04 / image |
| AR drafts | Hunyuan3D multi-view | `tencent/hunyuan3d-2mv` | ~$0.16 / model |

A 5-second film on Wan 3.0 costs about **$0.35**. A 10-second film costs about **$0.70**. Replicate's prepaid credit is the spending ceiling.

## 6. Payments: Stripe
1. Use the Stripe account you choose for this business. Add `STRIPE_SECRET_KEY`.
2. Go to Stripe → Developers → Webhooks → **Add endpoint**: `https://<your-domain>/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
3. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Optional: create Products/Prices in Stripe and paste each Price ID in **Owner → Plans**. Without them, Checkout uses the plan's price directly.
5. Turn on the Customer Portal in Stripe (Settings → Billing → Customer portal) so members can manage cards and cancel.

## 7. Optional: KIRI photogrammetry
Add `KIRI_API_KEY` when you want true photogrammetry from full 360 captures. Each scan costs $1, and KIRI requires a $500 minimum top-up.

## Local development
```bash
npm install
npm run dev        # http://localhost:3000 — demo mode, no keys needed
npm run build      # production build check
```
Copy `.env.example` to `.env.local` to use real keys locally.
