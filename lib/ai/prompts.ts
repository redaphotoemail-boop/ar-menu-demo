/* Every prompt the platform sends to an AI engine lives here, so the look of the
   whole product can be tuned in one file. Rule zero: the dish is the truth.
   Engines may improve light, camera and setting — never the food itself. */

export const DISH_LOCK =
  "STRICT: this is a real dish served at a real restaurant. Keep the food exactly as photographed — same ingredients, same portions, same plating, same garnish, same plate. Add nothing that is not on the plate and remove nothing. No new food, no new props, no hands, no people, no text.";

/* Negative prompt for every food image and film. */
export const FOOD_NEGATIVE = [
  "changed plating", "different garnish", "invented ingredients", "extra food", "missing ingredients", "duplicated items",
  "plastic-looking food", "CGI", "3D render look", "cartoon", "illustration", "painting",
  "oversaturated", "HDR halos", "harsh flash", "blown highlights", "crushed blacks", "color cast",
  "text", "letters", "watermark", "logo", "menu text", "signage",
  "hands", "fingers", "people", "faces", "cutlery appearing", "moving cutlery",
  "warping", "morphing", "melting plate", "plate changing shape", "flicker", "jitter", "camera shake", "handheld wobble", "fast zoom", "whip pan",
  "low resolution", "noise", "motion blur on the food", "smudged plate rim", "crumbs that were not there",
].join(", ");

export type CameraMove = "push-in" | "orbit" | "macro" | "reveal" | "top-down";

export const CAMERA_MOVES: Record<CameraMove, { label: string; line: string }> = {
  "push-in": { label: "Slow push-in", line: "a very slow, perfectly smooth dolly push-in toward the dish, ending on the hero bite" },
  orbit: { label: "Gentle orbit", line: "a slow, steady quarter orbit around the plate at table height, keeping the dish centered and level" },
  macro: { label: "Macro glide", line: "a slow macro slider move across the textures of the dish, shallow depth of field, focus rolling across the garnish" },
  reveal: { label: "Rack-focus reveal", line: "starts softly out of focus and racks focus onto the dish while the camera eases forward" },
  "top-down": { label: "Overhead drift", line: "an overhead top-down shot drifting slowly across the plate with a very slight rotation" },
};

/* Image-to-video: a premium restaurant commercial shot of one dish. */
export function filmPrompt(input: { dishName: string; description?: string; move: CameraMove; mood?: string }) {
  const move = CAMERA_MOVES[input.move] ?? CAMERA_MOVES["push-in"];
  return [
    `High-end restaurant commercial, one continuous cinematic shot of ${input.dishName}${input.description ? ` (${input.description})` : ""}.`,
    `Camera: ${move.line}. Motion is slow, silky and fully stabilised, like a motion-control rig.`,
    `Light: soft, directional, warm key light with gentle falloff, natural specular highlights on sauces and glazes, rich true-to-life color.`,
    input.mood ? `Mood: ${input.mood}.` : "Mood: refined, appetising, quietly luxurious.",
    "Subtle realistic life only: a faint wisp of steam if the dish is hot, a glint of light. Nothing else moves.",
    DISH_LOCK,
    "No dialogue, no music, no sound effects.",
  ].join(" ");
}

/* Phone photo → studio photo (OFF for clients until the owner enables it). */
export function recreatePrompt(input: { dishName: string; style: PhotoStyle }) {
  const style = PHOTO_STYLES[input.style] ?? PHOTO_STYLES.editorial;
  return [
    `Re-create this phone photo of ${input.dishName} as a professional restaurant menu photograph.`,
    `Style: ${style.line}`,
    "Improve only light, color, sharpness, angle consistency, background and the cleanliness of the plate rim.",
    DISH_LOCK,
  ].join(" ");
}

export type PhotoStyle = "editorial" | "moody" | "window" | "overhead";

export const PHOTO_STYLES: Record<PhotoStyle, { label: string; line: string }> = {
  editorial: { label: "Bright editorial", line: "bright, airy, soft daylight from the side, clean neutral background, crisp detail, 45-degree hero angle." },
  moody: { label: "Dark & moody", line: "low-key, single soft key light, deep warm shadows, dark stoneware and wood, rich contrast, intimate fine-dining feel." },
  window: { label: "Warm window light", line: "golden late-afternoon window light, natural linen and stone surfaces, gentle shadows, inviting and warm." },
  overhead: { label: "Overhead flat lay", line: "perfect top-down composition, even soft light, minimal styling, generous negative space around the plate." },
};

/* Studio: create a premium image from a reference photo (or describe one). */
export function studioImagePrompt(input: { subject: string; style: PhotoStyle; extra?: string; hasReference: boolean }) {
  const style = PHOTO_STYLES[input.style] ?? PHOTO_STYLES.editorial;
  return [
    input.hasReference ? `Turn this reference into a premium, high-end restaurant photograph of ${input.subject}.` : `A premium, high-end restaurant photograph of ${input.subject}.`,
    `Style: ${style.line}`,
    "Shot on a full-frame camera with a 100mm macro lens, true-to-life color, Michelin-guide quality.",
    input.extra ? input.extra : "",
    input.hasReference ? DISH_LOCK : "No text, no hands, no people.",
  ]
    .filter(Boolean)
    .join(" ");
}

/* Guidance the camera screens show to clients. Kept here so the copy and the
   capture rules stay in one place. */
export const CAPTURE_GUIDE = {
  photo: [
    { title: "Hero angle", tip: "Hold the phone at a 45° angle, about an arm's length away. Fill the circle with the plate." },
    { title: "From above", tip: "Hold the phone flat, straight above the plate. Keep it level until the line turns gold." },
    { title: "Side view", tip: "Bring the phone down to table height. Show the height and layers of the dish." },
  ],
  scan: [
    { title: "Set the plate", tip: "Place the dish on a plain table, away from busy patterns. Turn off the flash." },
    { title: "First lap", tip: "Walk slowly all the way around the plate at a 30° angle. Each segment of the ring fills as you go." },
    { title: "Second lap", tip: "Raise the phone higher (about 60°) and walk around once more." },
    { title: "Top", tip: "Finish with a few shots straight from above." },
  ],
  video: [
    { title: "Light first", tip: "Use soft natural light. No flash, no overhead spotlights straight above." },
    { title: "Move slowly", tip: "Record 10–20 seconds. Glide slowly around the plate or push in gently. Keep the phone steady." },
    { title: "Keep it clean", tip: "Clean plate rim, no hands in frame, no people behind." },
  ],
} as const;
