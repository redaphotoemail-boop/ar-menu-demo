# TableWren — product brief

*Working name. Change it in `lib/brand.ts`.* Operated by REDA.PHOTO, Boston.

## What it is
A membership platform for restaurants (Boston and Massachusetts first, then anywhere). The member gets:

1. **A premium menu** on their phone and website. It uses one of 10 designed templates (Véra Light, Sand, Dark, Coast, Noir, Nova, Kinara, Lùmina, Vélora, Maison Vertè).
2. **AR dishes.** Guests see the plate on their own table, at true size. There's no app: iPhone opens Quick Look and Android opens Scene Viewer.
3. **An AI Concierge** offering personalized recommendations, smart customization (diet, allergens, spice, budget, languages), and nutrition and allergen insights.
4. **Dish films.** A phone video becomes a short, premium commercial (Wan 3.0 or H3 on Replicate).
5. **Pro photo re-creation.** A phone photo becomes a studio-grade photo of the same dish. *This is OFF for clients, and shows greyed out, until the owner turns it on in Settings.*
6. **Guided capture.** The camera tells the client exactly where to stand, or they can book a photographer at cost.

## Three faces
| Face | Who | Where |
|---|---|---|
| Website | Restaurants we pitch | `/`, `/templates`, `/pricing`, live demo `/m/vera` |
| Client app | A restaurant member | `/app` (onboarding → menu → capture → studio → look → concierge → QR → membership) |
| Owner app | Reda + team (manager, finance, studio) | `/admin` (dashboard, studio, clients, jobs, finance, team, plans, settings) |
| Diner menu | Guests at the table | `/m/<slug>` (QR target), `/ar/<dishId>` (one dish in AR) |

## Rules (always)
- **The dish is the truth.** AI may improve light, camera and setting, never the food. Every image and film prompt carries `DISH_LOCK` and `FOOD_NEGATIVE` (`lib/ai/prompts.ts`).
- **Allergens and nutrition come only from the kitchen.** The concierge repeats what the kitchen confirmed. If a dish isn't confirmed, it tells the guest to ask their server.
- **Clients never see a broken result.** Jobs retry once on a backup engine (Wan 3.0 → H3 Lite). Anything doubtful goes to *Needs review* for the owner.
- **Every job has a reference (TW-XXXXX), an engine and a cost in dollars.** When something stops, the real reason is kept, along with the tail of the engine log.
- **Delete means delete.**
- **Apple-style minimalism.** Lots of white space, one idea per screen, very few words, no card borders, no dense paragraphs.
- **Never remove, hide or rewrite a working feature while changing something else.**

## Negative brief: what we do NOT build or use
**AR**
- No 8th Wall. Its hosted platform shut down on 28 February 2026.
- No WebXR-only AR. iPhone Safari has no WebXR, so iPhone must go through Quick Look (USDZ). `<model-viewer>` does this automatically, generating a USDZ when none is uploaded.
- No paid per-view AR SDKs or apps the guest must install.
- Don't present single-image 3D (an AI guessing the back of the plate) as the final model for a client's hero dish. Use multi-view (4 sides), true photogrammetry (KIRI, or Apple Object Capture on the Mac), or the owner's own studio build.
- Don't ship heavy models. Aim for under about 8 MB, textures of 2048 px or less, real-world metric scale (a 28 cm plate is 0.28 m), and models centred and sitting on the ground.

**AI**
- Prompts must not change plating, garnish, portions or ingredients, or add hands, people, text, logos or cutlery.
- No camera shake, whip pans or fast zooms. Motion is slow and stabilised, motion-control style.
- No AI-written allergen or nutrition facts.
- No engines the owner hasn't approved. The defaults are Wan 3.0 for films, H3 Lite as backup, FLUX Kontext for photos, and Hunyuan3D multi-view for AR drafts. Change them in Settings.

**Product**
- No Reserve feature on the menus. The AI Concierge is the featured tool.
- No boxed menu items. Every template has its own immersive, boxless menu style.

## How the AR pipeline works
1. **Client capture (phone).** In `/app/capture → 360 for AR`, the ring fills as the client walks around the plate: 24 segments × 2 laps, captured automatically using the phone's heading and tilt. On a device without motion sensors, the client turns the plate instead and frames are taken every 1.1 s. Soft frames are dropped on the device.
2. **Build.** The four sides (front, right, back, left) go to **Hunyuan3D multi-view** on Replicate, at about $0.16 a run. All frames are kept for **KIRI photogrammetry** ($1 a scan, but KIRI needs a $500 top-up to start), so you can switch when quality matters.
3. **Studio grade (best).** Shoot 60–120 photos on a turntable, build the model free with **Apple Object Capture** on the Mac, and upload the GLB and USDZ in Owner → Studio → AR & 360.
4. **View.** `<model-viewer>` on the dish page, at `/ar/<dish>`, and on the table QR cards.

## Films
- **Input:** the client's phone video. The sharpest, best-lit frame is picked on the device, and the video itself is kept as a reference.
- **Engine:** Wan 3.0 image-to-video ($0.07/s at 720p), with H3, H3 Highspeed and H3 Lite available. These are the same Replicate endpoints and input shapes already proven in MotionWren.
- **Camera moves:** push-in, orbit, macro glide, rack-focus reveal, overhead drift.
- **Plan limits:** films per month are capped by the plan.

## Roadmap (not built yet)
- Multi-shot films stitched into one edit (reuse MotionWren's editor/container).
- Auto-translation of dishes into French and Spanish (the engine already falls back to English).
- Diner app (discovery across restaurants, saved favourites) to build the diner database.
- Ordering and POS integrations (Toast, Square).
- An LLM phrasing layer for the concierge, behind the `conciergeAI` flag.
- Analytics: scans, AR opens and concierge questions per dish.
