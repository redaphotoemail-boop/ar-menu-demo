# Standing rules (read first, every session)

1. **Never remove, hide, gate or rewrite a working feature that isn't part of the request.** Change only what was agreed. If unsure, keep it and ask.
2. **Never publish to Reda's own sites or domains.** Stage on Vercel previews; he reviews and publishes.
3. He does all logins, authorizations and "accept terms". Never create accounts, buy anything, or enter his passwords.
4. **Show copy drafts** before committing new marketing copy to a page.
5. Ask before merging to `main`, before anything irreversible, and before any destructive git.
6. Never commit secrets. Keys live in Vercel environment variables.
7. **The dish is the truth:** never loosen `DISH_LOCK` / `FOOD_NEGATIVE` in `lib/ai/prompts.ts`. Upgrades may add to them, never weaken them.
8. Allergens and nutrition only ever come from the kitchen's own data.
9. Prices to Reda are always in **dollars** (per video, per second, per run), never in credits.
10. Design: Apple-style minimalism. Heavy white space, one idea per screen, low word count, no card borders, no dense paragraphs.

@AGENTS.md

# Map
- `app/(marketing)` — the website (home, templates, pricing, legal)
- `app/(auth)` — sign in / sign up (Google + email), demo sign-in
- `app/app` — client app; `app/app/onboarding` is the 6-step wizard; `app/app/actions.ts` holds the client server actions
- `app/admin` — owner app; `app/admin/actions.ts`
- `app/m/[slug]` — diner menu (QR target) · `app/ar/[dishId]` — one dish in AR
- `public/engine/index.html` — the 10 menu templates (vanilla JS). It reads a restaurant via `?menu=/api/public/menus/<slug>`, and also `?tpl=`, `?chrome=0`, `?mode=web` and `?dish=`
- `lib/db` — Drizzle schema, Neon (prod) or PGlite (demo) · `drizzle/` migrations (`npx drizzle-kit generate`)
- `lib/ai` — engine catalog, Replicate client, prompts · `lib/jobs.ts` — job lifecycle (poll-on-read, backup retry, Blob copy)
- `lib/concierge.ts` — deterministic recommendations, filters, nutrition and allergen answers
- `components/capture/GuidedCamera.tsx` — the guided phone camera (photo · 360 ring · video)
- `docs/PRODUCT_BRIEF.md` — vision, rules, negative brief · `docs/SETUP.md` — connecting services
