import { describe, expect, it } from "vitest";
import { dishes, ingredientByCode, normalize, resolveItem, resolveMeal, searchDishes } from "../src/index.js";
import { dishPer100g } from "../src/data.js";

describe("normalize", () => {
  it("folds common romanisation variants together", () => {
    expect(normalize("Daal")).toBe(normalize("dal"));
    expect(normalize("dhal")).toBe(normalize("dal"));
    expect(normalize("chapatti")).toBe(normalize("chapati"));
    expect(normalize("idly")).toBe(normalize("idli"));
    expect(normalize("rajmah")).toBe(normalize("rajma"));
    expect(normalize("chawal")).toBe(normalize("chaval"));
  });
});

describe("data integrity", () => {
  it("every recipe line points at a known ingredient", () => {
    for (const d of dishes) for (const l of d.recipe) expect(ingredientByCode.has(l.code), `${d.id} ${l.code}`).toBe(true);
  });
  it("every dish has a portion for its default unit", () => {
    for (const d of dishes) expect(d.portions[d.defaultUnit], d.id).toBeGreaterThan(0);
  });
  it("aliases are unique across dishes", () => {
    const seen = new Map<string, string>();
    for (const d of dishes) {
      for (const a of d.aliases) {
        const n = normalize(a);
        expect(seen.get(n) ?? d.id, `"${a}" is on ${seen.get(n)} and ${d.id}`).toBe(d.id);
        seen.set(n, d.id);
      }
    }
  });
  it("oils get Atwater energy even though IFCT lists 0", () => {
    expect(ingredientByCode.get("T013")?.kcal).toBe(900);
  });
  it("cooked dal is far less energy-dense than raw dal", () => {
    const dal = dishes.find((d) => d.id === "toor-dal")!;
    expect(dishPer100g(dal).kcal).toBeLessThan(ingredientByCode.get("B021")!.kcal / 2);
  });
});

describe("lookup", () => {
  it("finds dishes by regional names", () => {
    expect(searchDishes("pappu")[0]?.dish.id).toBe("toor-dal");
    expect(searchDishes("thayir sadam")[0]?.dish.id).toBe("curd-rice");
    expect(searchDishes("machher jhol")[0]?.dish.id).toBe("fish-curry");
  });
  it("converts portions to grams", () => {
    const roti = resolveItem("phulka", 2);
    expect(roti?.grams).toBe(76);
    expect(roti?.unit).toBe("piece");
    expect(resolveItem("curd", 200, "g")?.grams).toBe(200);
  });
  it("returns null instead of guessing unknown foods", () => {
    expect(resolveItem("pizza margherita")).toBeNull();
  });
});

describe("resolveMeal", () => {
  it("splits combos like rajma chawal", () => {
    expect(resolveMeal("rajma chawal").items.map((i) => i.dish.id)).toEqual(["rajma", "rice"]);
  });
  it("reports what it could not match", () => {
    const r = resolveMeal("2 roti and a slice of pizza");
    expect(r.items.map((i) => i.dish.id)).toEqual(["roti"]);
    expect(r.unknown).toEqual(["pizza"]);
  });
  it("totals the meal", () => {
    const r = resolveMeal("2 roti, 1 katori dal");
    expect(r.total.kcal).toBe(r.items.reduce((s, i) => s + i.nutrients.kcal, 0));
  });
});
