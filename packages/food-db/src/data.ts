import { readFileSync } from "node:fs";
import type { Dish, Ingredient, Nutrients } from "./types.js";

const load = <T>(file: string): T =>
  JSON.parse(readFileSync(new URL(`../data/${file}`, import.meta.url), "utf8")) as T;

export const ingredients: Ingredient[] = [
  ...load<Ingredient[]>("ingredients.ifct.json"),
  ...load<Ingredient[]>("ingredients.extra.json"),
];
export const ingredientByCode = new Map(ingredients.map((i) => [i.code, i]));

export const dishes: Dish[] = load<Dish[]>("dishes.json");
export const dishById = new Map(dishes.map((d) => [d.id, d]));

export const unitAliases: Record<string, string[]> = load<{ aliases: Record<string, string[]> }>("units.json").aliases;

const ZERO: Nutrients = { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };
const KEYS = Object.keys(ZERO) as (keyof Nutrients)[];

export function scale(n: Nutrients, factor: number): Nutrients {
  const out = { ...ZERO };
  for (const k of KEYS) out[k] = n[k] * factor;
  return out;
}

export function add(a: Nutrients, b: Nutrients): Nutrients {
  const out = { ...ZERO };
  for (const k of KEYS) out[k] = a[k] + b[k];
  return out;
}

export function round(n: Nutrients): Nutrients {
  const out = { ...ZERO };
  for (const k of KEYS) out[k] = k === "kcal" ? Math.round(n[k]) : Math.round(n[k] * 10) / 10;
  return out;
}

/** Nutrients per 100 g of the cooked dish, from its recipe and cooked yield. */
export function dishPer100g(dish: Dish): Nutrients {
  let total = { ...ZERO };
  for (const line of dish.recipe) {
    const ing = ingredientByCode.get(line.code);
    if (!ing) throw new Error(`dish ${dish.id}: unknown ingredient ${line.code}`);
    total = add(total, scale(ing, line.grams / 100));
  }
  return scale(total, 100 / dish.yieldGrams);
}
