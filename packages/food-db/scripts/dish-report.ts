/** Prints each dish's nutrition per default portion, for eyeballing recipes against known values. */
import { dishes, dishPer100g, round, scale } from "../src/data.js";

for (const d of dishes) {
  const grams = d.portions[d.defaultUnit] ?? 100;
  const n = round(scale(dishPer100g(d), grams / 100));
  console.log(
    `${d.id.padEnd(22)} 1 ${d.defaultUnit.padEnd(6)} ${String(grams).padStart(4)} g  ${String(n.kcal).padStart(4)} kcal  P ${n.protein}  F ${n.fat}  C ${n.carbs}`,
  );
}
