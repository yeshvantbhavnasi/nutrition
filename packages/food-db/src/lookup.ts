import { dishes, dishPer100g, round, scale, unitAliases } from "./data.js";
import { normalize, similarity } from "./normalize.js";
import type { Dish, ResolvedItem } from "./types.js";

/** Below this, the bot should ask the user what they meant instead of logging a guess. */
export const MIN_CONFIDENCE = 0.72;

const aliasIndex: { alias: string; dish: Dish }[] = dishes.flatMap((dish) =>
  [dish.name, dish.id.replace(/-/g, " "), ...dish.aliases].map((a) => ({ alias: normalize(a), dish })),
);

export interface DishMatch {
  dish: Dish;
  score: number;
  matchedAlias: string;
}

/** Ranked dish candidates for a food name as the user typed it. */
export function searchDishes(name: string, limit = 5): DishMatch[] {
  const q = normalize(name);
  if (!q) return [];
  // "rotis", "eggs", "pakoras": also try with an English plural s dropped from each word.
  const singular = q.replace(/(\w{2,})s\b/g, "$1");
  const best = new Map<string, DishMatch>();
  for (const { alias, dish } of aliasIndex) {
    let score = Math.max(similarity(q, alias), similarity(singular, alias));
    // "dal tadka with jeera" should still find "dal tadka": reward a whole-alias word match.
    if (score < 1 && alias.length >= 3 && (` ${q} `.includes(` ${alias} `) || ` ${singular} `.includes(` ${alias} `))) {
      score = Math.max(score, 0.75 + 0.2 * (alias.length / q.length));
    }
    const prev = best.get(dish.id);
    if (!prev || score > prev.score) best.set(dish.id, { dish, score, matchedAlias: alias });
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

const unitIndex = new Map<string, string>();
for (const [unit, words] of Object.entries(unitAliases)) {
  for (const w of words) unitIndex.set(normalize(w), unit);
}

/** Canonical unit for a typed unit word, or undefined if unknown. */
export function canonicalUnit(word: string | undefined): string | undefined {
  if (!word) return undefined;
  return unitIndex.get(normalize(word));
}

/** Grams for `quantity` of `unit` of a dish. Unknown units fall back to the dish default. */
export function portionGrams(dish: Dish, quantity: number, unit?: string): { grams: number; unit: string } {
  const u = canonicalUnit(unit) ?? dish.defaultUnit;
  if (u === "g" || u === "ml") return { grams: quantity, unit: u };
  const per = dish.portions[u] ?? (u === "bowl" && dish.portions.katori ? dish.portions.katori * 1.7 : undefined);
  if (per === undefined) {
    const def = dish.portions[dish.defaultUnit];
    if (def === undefined) throw new Error(`dish ${dish.id} has no portion for its default unit`);
    return { grams: quantity * def, unit: dish.defaultUnit };
  }
  return { grams: quantity * per, unit: u };
}

/** Resolve one food mention into grams and nutrients, or null when no dish matches confidently. */
export function resolveItem(name: string, quantity = 1, unit?: string): ResolvedItem | null {
  const [top] = searchDishes(name, 1);
  if (!top || top.score < MIN_CONFIDENCE) return null;
  const { grams, unit: u } = portionGrams(top.dish, quantity, unit);
  return {
    dish: top.dish,
    quantity,
    unit: u,
    grams,
    nutrients: round(scale(dishPer100g(top.dish), grams / 100)),
    confidence: Math.round(top.score * 100) / 100,
  };
}
