export * from "./types.js";
export { dishes, dishById, ingredients, ingredientByCode, dishPer100g } from "./data.js";
export { normalize, similarity } from "./normalize.js";
export { searchDishes, resolveItem, portionGrams, canonicalUnit, MIN_CONFIDENCE } from "./lookup.js";
export { parseSimpleMeal } from "./parse.js";
export { resolveMeal, type MealResult } from "./meal.js";
