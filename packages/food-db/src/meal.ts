import { add, round } from "./data.js";
import { MIN_CONFIDENCE, resolveItem, searchDishes } from "./lookup.js";
import { parseSimpleMeal, type ParsedItem } from "./parse.js";
import type { Nutrients, ResolvedItem } from "./types.js";

/** A split is only taken when both halves are near-exact matches, e.g. "rajma" + "chawal". */
const SPLIT_CONFIDENCE = 0.9;

/**
 * Pairs like "rajma chawal", "dal chawal" or "vada sambar" are two dishes written as one.
 * Split a phrase in two when both halves match better than the whole phrase does.
 * The quantity stays on the first dish; the second gets its default portion.
 */
function splitCombo(item: ParsedItem): ParsedItem[] {
  const tokens = item.name.split(/\s+/);
  const whole = searchDishes(item.name, 1)[0]?.score ?? 0;
  if (tokens.length < 2 || whole >= 0.95) return [item];
  let best: { parts: ParsedItem[]; score: number } | undefined;
  for (let cut = 1; cut < tokens.length; cut++) {
    const left = tokens.slice(0, cut).join(" ");
    const right = tokens.slice(cut).join(" ");
    const l = searchDishes(left, 1)[0]?.score ?? 0;
    const r = searchDishes(right, 1)[0]?.score ?? 0;
    const score = Math.min(l, r);
    if (score >= SPLIT_CONFIDENCE && score > whole && (!best || score > best.score)) {
      best = {
        score,
        parts: [{ ...item, name: left }, { name: right, quantity: 1 }],
      };
    }
  }
  return best?.parts ?? [item];
}

export interface MealResult {
  items: ResolvedItem[];
  /** Phrases no dish matched; the bot should ask about these rather than guess. */
  unknown: string[];
  total: Nutrients;
}

/** Parse a simple meal message and resolve each food against the database. */
export function resolveMeal(message: string): MealResult {
  const items: ResolvedItem[] = [];
  const unknown: string[] = [];
  for (const parsed of parseSimpleMeal(message).flatMap(splitCombo)) {
    const r = resolveItem(parsed.name, parsed.quantity, parsed.unit);
    if (r && r.confidence >= MIN_CONFIDENCE) items.push(r);
    else unknown.push(parsed.name);
  }
  const total = round(items.reduce((acc, i) => add(acc, i.nutrients), { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 }));
  return { items, unknown, total };
}
