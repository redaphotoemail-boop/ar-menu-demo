# TableWren

AR dishes on the diner's table, an AI concierge that knows the menu, and cinematic dish films. All of it sits on a menu template that looks like the restaurant. A membership platform by REDA.PHOTO.

- **Website:** `/` · `/templates` · `/pricing` · live demo `/m/vera`
- **Client app:** `/app` (onboarding, menu, guided capture, studio, look, concierge, QR, membership)
- **Owner app:** `/admin` (dashboard, studio, clients, jobs, finance, team, plans, settings)

```bash
npm install && npm run dev   # demo mode, no keys needed
```

To connect the database, Google sign-in, storage, AI engines and Stripe, follow **[docs/SETUP.md](docs/SETUP.md)**. For the vision, the rules and what we deliberately don't do, read **[docs/PRODUCT_BRIEF.md](docs/PRODUCT_BRIEF.md)**.

Next.js 16 · Drizzle (Neon / PGlite) · Vercel Blob · Replicate (Wan 3.0, H3, FLUX, Hunyuan3D) · Stripe · `<model-viewer>`.
