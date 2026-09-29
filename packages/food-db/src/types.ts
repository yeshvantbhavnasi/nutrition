/** Nutrients per 100 g of edible portion. Energy in kcal, everything else in grams. */
export interface Nutrients {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

export interface Ingredient extends Nutrients {
  /** IFCT food code (e.g. "B021") or "X###" for supplementary foods. */
  code: string;
  name: string;
  group: string;
  /** Regional names as printed in IFCT, e.g. "H. Arhar dal; Tam. Thuvaram paruppu". */
  localNames: string;
  source: "IFCT2017" | "USDA-FDC";
  /** Set when the published energy value was replaced by an Atwater calculation. */
  energyNote?: string;
}

export type Diet = "veg" | "egg" | "nonveg" | "vegan";

export interface RecipeLine {
  code: string;
  /** Raw grams that go into one batch. */
  grams: number;
}

export interface Dish {
  id: string;
  name: string;
  /** Names people type: Hindi/regional, transliteration variants, common misspellings. */
  aliases: string[];
  diet: Diet;
  /** Home-style batch recipe; nutrients are summed and divided by the cooked yield. */
  recipe: RecipeLine[];
  /** Cooked weight of the batch in grams (water gained or lost in cooking). */
  yieldGrams: number;
  /** Grams per unit for this dish, e.g. { piece: 40, katori: 150 }. */
  portions: Record<string, number>;
  /** Unit assumed when the user gives only a count, e.g. "2 roti" means 2 pieces. */
  defaultUnit: string;
  /** What the bot should say about its assumption, e.g. "home style, 1 tsp ghee per katori". */
  assumption?: string;
}

export interface ResolvedItem {
  dish: Dish;
  quantity: number;
  unit: string;
  grams: number;
  nutrients: Nutrients;
  /** 0..1 name-match confidence. Below the threshold the bot should ask instead of logging. */
  confidence: number;
}
