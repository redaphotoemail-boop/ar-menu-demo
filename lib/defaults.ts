/* Defaults that are safe to import on the client and the server. */

export type Flags = {
  clientFilms: boolean; // clients can order dish films from their own videos
  photoRecreation: boolean; // clients can upload phone photos and get a pro re-creation (OFF until the owner turns it on)
  auto3d: boolean; // AR models are built automatically after a 360 capture
  conciergeAI: boolean; // the concierge may phrase answers with an LLM (facts still come from the kitchen's data)
  photographerBooking: boolean; // clients can request an in-person shoot
};

export const DEFAULT_FLAGS: Flags = {
  clientFilms: true,
  photoRecreation: false,
  auto3d: true,
  conciergeAI: false,
  photographerBooking: true,
};

export type EngineChoice = { film: string; filmBackup: string; image: string; model3d: string };

export const DEFAULT_ENGINES: EngineChoice = {
  film: "wan3",
  filmBackup: "h3lite",
  image: "flux-kontext-pro",
  model3d: "hunyuan3d-2mv",
};

export const FLAG_COPY: Record<keyof Flags, { label: string; help: string }> = {
  clientFilms: { label: "Dish films for clients", help: "Clients upload a phone video and get a short premium film of the dish." },
  photoRecreation: { label: "Pro photo re-creation", help: "Clients upload phone photos and get studio-grade versions. Shown greyed out to clients while off." },
  auto3d: { label: "Automatic AR models", help: "A finished 360 capture is sent to the 3D engine without waiting for review." },
  conciergeAI: { label: "AI phrasing for the concierge", help: "Answers are worded by an AI model. Dishes, allergens and nutrition always come from the kitchen's data." },
  photographerBooking: { label: "Photographer booking", help: "Clients can request an in-person shoot instead of using their phone." },
};

export const TEMPLATES = [
  { key: "veralight", name: "Véra Light", mood: "Bright, airy, plates on white" },
  { key: "verasand", name: "Véra Sand", mood: "Warm sand, editorial photo bands" },
  { key: "veradark", name: "Véra Dark", mood: "Candlelit, numbered carte in gold" },
  { key: "veramed", name: "Véra Coast", mood: "Mediterranean terrace, sun-warmed" },
  { key: "noir", name: "Noir", mood: "Steakhouse drama, one story per dish" },
  { key: "nova", name: "Nova", mood: "Cinematic swipe gallery" },
  { key: "kinara", name: "Kinara", mood: "Dark botanical, voice-first concierge" },
  { key: "lumina", name: "Lùmina", mood: "Full-screen dishes, page by page" },
  { key: "velora", name: "Vélora", mood: "Steel blue, AI concierge first" },
  { key: "maison", name: "Maison Vertè", mood: "Printed carte, quiet luxury" },
] as const;

export type TemplateKey = (typeof TEMPLATES)[number]["key"];

export const ALLERGENS = ["Gluten", "Dairy", "Eggs", "Fish", "Shellfish", "Tree nuts", "Peanuts", "Soy", "Sesame"] as const;
export const DIET_TAGS = ["signature", "vegetarian", "vegan", "gluten-free", "high-protein", "low-carb"] as const;
export const CATEGORIES = ["starters", "mains", "desserts", "drinks"] as const;

export function money(cents: number) {
  const v = cents / 100;
  return "$" + (Number.isInteger(v) ? v.toLocaleString("en-US") : v.toFixed(2));
}
