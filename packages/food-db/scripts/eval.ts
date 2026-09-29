/**
 * Runs evals/meals.jsonl through the parser and lookup, and checks every dish's default
 * portion against evals/reference.json. Exits non-zero if accuracy drops below the bar,
 * so CI catches regressions when recipes, aliases or the parser change.
 */
import { readFileSync } from "node:fs";
import { dishes, dishPer100g, round, scale } from "../src/data.js";
import { resolveMeal } from "../src/meal.js";

const root = new URL("../../../evals/", import.meta.url);
const cases = readFileSync(new URL("meals.jsonl", root), "utf8")
  .split("\n").filter(Boolean)
  .map((l) => JSON.parse(l) as { message: string; expected: { dish: string; quantity: number }[] });
const reference = JSON.parse(readFileSync(new URL("reference.json", root), "utf8")).ranges as Record<string, [number, number]>;

const MIN_MEAL_ACCURACY = 0.9;

let exact = 0;
const failures: string[] = [];
for (const c of cases) {
  const got = resolveMeal(c.message).items.map((i) => `${i.dish.id}×${i.quantity}`).sort();
  const want = c.expected.map((e) => `${e.dish}×${e.quantity}`).sort();
  if (JSON.stringify(got) === JSON.stringify(want)) exact++;
  else failures.push(`  "${c.message}"\n    want ${want.join(", ")}\n    got  ${got.join(", ") || "(nothing)"}`);
}

const outOfRange: string[] = [];
for (const d of dishes) {
  const range = reference[d.id];
  const kcal = round(scale(dishPer100g(d), (d.portions[d.defaultUnit] ?? 100) / 100)).kcal;
  if (!range) outOfRange.push(`  ${d.id}: no reference range`);
  else if (kcal < range[0] || kcal > range[1]) outOfRange.push(`  ${d.id}: ${kcal} kcal, reference ${range[0]}–${range[1]}`);
}

const accuracy = exact / cases.length;
console.log(`Meal parsing: ${exact}/${cases.length} exact (${(accuracy * 100).toFixed(1)}%)`);
if (failures.length) console.log(failures.join("\n"));
console.log(`Dish values: ${dishes.length - outOfRange.length}/${dishes.length} within reference range`);
if (outOfRange.length) console.log(outOfRange.join("\n"));
if (accuracy < MIN_MEAL_ACCURACY || outOfRange.length) process.exit(1);
