import type { Dish, Restaurant } from "./db/schema";
import type { ConciergeDish } from "./concierge";

/* The JSON the menu engine (the 10 templates) reads. */
export function menuPayload(r: Restaurant, dishes: Dish[]) {
  return {
    name: r.name,
    slug: r.slug,
    subtitle: r.cuisine ? r.cuisine : "Restaurant",
    template: r.template,
    languages: r.languages?.length ? r.languages : ["en"],
    dishes: dishes
      .filter((d) => d.available)
      .map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        price: Math.round(d.priceCents / 100),
        short: d.short,
        description: d.description,
        ingredients: d.ingredients,
        allergens: d.allergens,
        allergensConfirmed: d.allergensConfirmed,
        kcal: d.kcal,
        protein: d.protein,
        carbs: d.carbs,
        prepMinutes: d.prepMinutes,
        spice: d.spice,
        tags: d.tags,
        pairing: d.pairing,
        chefNote: d.chefNote,
        image: d.imageUrl,
        video: d.videoUrl,
        model: d.modelGlbUrl,
        usdz: d.modelUsdzUrl,
        translations: d.translations,
      })),
  };
}

export function conciergeDishes(dishes: Dish[], lang = "en"): ConciergeDish[] {
  return dishes
    .filter((d) => d.available)
    .map((d) => ({
      id: d.id,
      name: d.translations?.[lang]?.name || d.name,
      category: d.category,
      price: Math.round(d.priceCents / 100),
      short: d.short,
      allergens: d.allergens,
      allergensConfirmed: d.allergensConfirmed,
      kcal: d.kcal,
      protein: d.protein,
      carbs: d.carbs,
      spice: d.spice,
      tags: d.tags,
      pairing: d.pairing,
    }));
}
