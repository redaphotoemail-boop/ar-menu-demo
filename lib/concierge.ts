/* The AI Concierge's brain. Facts (dishes, allergens, nutrition, pairings)
   come only from the kitchen's own data — the concierge never invents them.
   Personalized recommendations, smart customization and nutrition/allergen
   insights are worked out deterministically here; an LLM may only re-phrase. */

export type ConciergeDish = {
  id: string;
  name: string;
  category: string;
  price: number; // dollars
  short: string;
  allergens: string[];
  allergensConfirmed: boolean;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  spice: number;
  tags: string[];
  pairing: string;
};

export type ConciergeReply = { text: string; dishIds: string[]; notes: string[] };
type Lang = "en" | "fr" | "es";

const has = (msg: string, words: string[]) => words.some((w) => msg.includes(w));

const ALLERGEN_WORDS: Record<string, string[]> = {
  Gluten: ["gluten", "celiac", "coeliac", "wheat", "blé", "sans gluten", "sin gluten", "trigo"],
  Dairy: ["dairy", "lactose", "milk", "lait", "laitier", "lácteo", "lacteo", "leche"],
  Eggs: ["egg", "oeuf", "œuf", "huevo"],
  Fish: ["fish", "poisson", "pescado"],
  Shellfish: ["shellfish", "seafood", "crustac", "fruits de mer", "marisco"],
  "Tree nuts": ["nut", "noix", "nuez", "fruits à coque"],
  Peanuts: ["peanut", "arachide", "cacahu", "maní"],
  Soy: ["soy", "soja"],
  Sesame: ["sesame", "sésame", "sésamo"],
};

const AVOID = ["no ", "without", "free", "allerg", "avoid", "intoleran", "sans", "sin ", "pas de", "évite", "evitar", "alérg", "allergi"];

const T = {
  en: {
    picks: "Here is what I'd suggest",
    none: "Nothing on tonight's menu matches all of that. Try loosening one wish and I'll look again.",
    light: "light", hp: "high in protein", lc: "low in carbs", veg: "vegetarian", vegan: "vegan", spicy: "with some heat", mild: "gentle on spice",
    avoid: (a: string) => `without ${a.toLowerCase()}`,
    unconfirmed: (d: string) => `${d}: allergens not yet confirmed by the kitchen. Please ask your server.`,
    pair: (d: string, p: string) => `${d} pairs with ${p}.`,
    course: "A three-course path for the table",
    kcal: "kcal", prot: "g protein",
    safety: "Allergen information comes from the kitchen. Please tell your server about any allergy.",
  },
  fr: {
    picks: "Voici ce que je vous propose",
    none: "Rien au menu ce soir ne correspond à tout cela. Retirez un critère et je cherche à nouveau.",
    light: "léger", hp: "riche en protéines", lc: "pauvre en glucides", veg: "végétarien", vegan: "végétalien", spicy: "relevé", mild: "doux",
    avoid: (a: string) => `sans ${a.toLowerCase()}`,
    unconfirmed: (d: string) => `${d} : allergènes pas encore confirmés par la cuisine. Demandez à votre serveur.`,
    pair: (d: string, p: string) => `${d} s’accorde avec ${p}.`,
    course: "Un parcours en trois temps pour la table",
    kcal: "kcal", prot: "g de protéines",
    safety: "Les allergènes sont fournis par la cuisine. Signalez toute allergie à votre serveur.",
  },
  es: {
    picks: "Esto es lo que le sugiero",
    none: "Nada en el menú de hoy cumple todo eso. Quite un deseo y vuelvo a buscar.",
    light: "ligero", hp: "alto en proteína", lc: "bajo en carbohidratos", veg: "vegetariano", vegan: "vegano", spicy: "con picante", mild: "suave",
    avoid: (a: string) => `sin ${a.toLowerCase()}`,
    unconfirmed: (d: string) => `${d}: alérgenos aún no confirmados por la cocina. Pregunte a su mesero.`,
    pair: (d: string, p: string) => `${d} marida con ${p}.`,
    course: "Un recorrido de tres tiempos para la mesa",
    kcal: "kcal", prot: "g de proteína",
    safety: "La información de alérgenos viene de la cocina. Avise a su mesero de cualquier alergia.",
  },
};

export function answer(message: string, dishes: ConciergeDish[], lang: Lang = "en", featured: string[] = []): ConciergeReply {
  const t = T[lang] ?? T.en;
  const msg = ` ${message.toLowerCase()} `;
  let pool = dishes.slice();
  const wants: string[] = [];
  const notes: string[] = [];

  // Allergens to avoid (only when the guest signals avoidance).
  const avoiding = has(msg, AVOID);
  const avoid = avoiding ? Object.entries(ALLERGEN_WORDS).filter(([, words]) => has(msg, words)).map(([a]) => a) : [];
  for (const a of avoid) {
    pool = pool.filter((d) => !d.allergens.includes(a));
    wants.push(t.avoid(a));
  }

  if (has(msg, ["vegan", "végétalien", "vegano"])) { pool = pool.filter((d) => d.tags.includes("vegan")); wants.push(t.vegan); }
  else if (has(msg, ["vegetarian", "veggie", "végé", "vegetarien", "végétarien", "vegetarian", "vegetariano", "no meat", "sans viande", "sin carne"])) { pool = pool.filter((d) => d.tags.includes("vegetarian") || d.tags.includes("vegan")); wants.push(t.veg); }
  if (has(msg, ["protein", "protéin", "proteín", "protein", "muscle", "gym"])) { pool = pool.filter((d) => (d.protein ?? 0) >= 24).sort((a, b) => (b.protein ?? 0) - (a.protein ?? 0)); wants.push(t.hp); }
  if (has(msg, ["light", "léger", "leger", "ligero", "low cal", "healthy", "sain", "saludable", "calorie"])) { pool = pool.filter((d) => (d.kcal ?? 999) <= 450).sort((a, b) => (a.kcal ?? 0) - (b.kcal ?? 0)); wants.push(t.light); }
  if (has(msg, ["low carb", "keto", "glucide", "carbohidrato"])) { pool = pool.filter((d) => d.tags.includes("low-carb") || (d.carbs ?? 99) <= 20); wants.push(t.lc); }
  if (has(msg, ["not spicy", "no spice", "mild", "pas épicé", "doux", "sin picante", "suave"])) { pool = pool.filter((d) => d.spice <= 1); wants.push(t.mild); }
  else if (has(msg, ["spicy", "heat", "épicé", "relevé", "picante"])) { pool = pool.filter((d) => d.spice >= 2); wants.push(t.spicy); }
  if (has(msg, ["starter", "appetizer", "entrée", "entree", "entrada"])) pool = pool.filter((d) => d.category === "starters");
  if (has(msg, ["main", " plat", "principal"])) pool = pool.filter((d) => d.category === "mains");
  if (has(msg, ["dessert", "sweet", "sucré", "postre", "dulce"])) pool = pool.filter((d) => d.category === "desserts");
  const budget = /(?:under|below|less than|moins de|menos de)\s*\$?\s*(\d{1,3})/.exec(msg);
  if (budget) pool = pool.filter((d) => d.price <= Number(budget[1]));

  // Pairings
  if (has(msg, ["wine", "pair", "vin", "accord", "vino", "marid", "cocktail", "drink", "boisson", "bebida"])) {
    const target = pool.filter((d) => d.pairing).slice(0, 3);
    if (!target.length) return { text: t.none, dishIds: [], notes };
    return { text: target.map((d) => t.pair(d.name, d.pairing)).join(" "), dishIds: target.map((d) => d.id), notes };
  }

  // Occasions: a three-course path
  if (has(msg, ["anniversary", "date", "for two", "celebrat", "tasting", "anniversaire", "pour deux", "dégustation", "aniversario", "para dos", "degustación"])) {
    const pick = (c: string) => pool.filter((d) => d.category === c).sort((a, b) => Number(b.tags.includes("signature")) - Number(a.tags.includes("signature")))[0];
    const path = [pick("starters"), pick("mains"), pick("desserts")].filter(Boolean) as ConciergeDish[];
    if (!path.length) return { text: t.none, dishIds: [], notes };
    const total = path.reduce((s, d) => s + d.price, 0);
    return { text: `${t.course}: ${path.map((d) => d.name).join(" → ")}. ~$${total} per guest.`, dishIds: path.map((d) => d.id), notes };
  }

  const rank = (d: ConciergeDish) => (featured.includes(d.id) ? 2 : 0) + (d.tags.includes("signature") ? 1 : 0);
  if (!wants.length && !budget) pool.sort((a, b) => rank(b) - rank(a));
  const picks = pool.slice(0, 3);
  if (!picks.length) return { text: t.none, dishIds: [], notes };

  for (const d of picks) if (avoid.length && !d.allergensConfirmed) notes.push(t.unconfirmed(d.name));
  if (avoid.length) notes.push(t.safety);

  const detail = (d: ConciergeDish) => {
    const bits = [`$${d.price}`];
    if (d.kcal) bits.push(`${d.kcal} ${t.kcal}`);
    if (d.protein && wants.includes(t.hp)) bits.push(`${d.protein} ${t.prot}`);
    return `${d.name} (${bits.join(" · ")})`;
  };
  const lead = wants.length ? `${t.picks}, ${wants.join(", ")}:` : `${t.picks}:`;
  return { text: `${lead} ${picks.map(detail).join("; ")}.`, dishIds: picks.map((d) => d.id), notes };
}
