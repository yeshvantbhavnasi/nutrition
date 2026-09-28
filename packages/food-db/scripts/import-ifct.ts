/**
 * Converts the IFCT 2017 composition table (from the @ifct2017/compositions package)
 * into data/ingredients.ifct.json with only the fields the tracker needs.
 *
 * IFCT publishes energy in kJ. Two data problems are handled here:
 *  - Fats and oils have energy 0 in the source; we compute it with Atwater factors.
 *  - A few rows disagree with their own macros by more than half (e.g. N001 chicken leg lists 384 kcal
 *    for 19 g protein / 13 g fat); those also use the Atwater value, and are flagged.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { Ingredient } from "../src/types.js";

const require = createRequire(import.meta.url);
const csvPath = require.resolve("@ifct2017/compositions/index.csv");

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const [header, ...rows] = parseCsv(readFileSync(csvPath, "utf8"));
if (!header) throw new Error("empty IFCT csv");
// Header cells look like "Energy; enerc"; key on the short code after the semicolon.
const col = (key: string) => {
  const i = header.findIndex((h) => h.endsWith(`; ${key}`));
  if (i < 0) throw new Error(`IFCT column ${key} missing`);
  return i;
};
const idx = {
  code: col("code"), name: col("name"), lang: col("lang"), grup: col("grup"),
  enerc: col("enerc"), protein: col("protcnt"), fat: col("fatce"), carbs: col("choavldf"), fiber: col("fibtg"),
};
const num = (s: string | undefined) => (s ? Number(s) || 0 : 0);
const r1 = (n: number) => Math.round(n * 10) / 10;

const out: Ingredient[] = [];
for (const r of rows) {
  const code = r[idx.code];
  if (!code) continue;
  const protein = num(r[idx.protein]);
  const fat = num(r[idx.fat]);
  const carbs = num(r[idx.carbs]);
  const fiber = num(r[idx.fiber]);
  const published = num(r[idx.enerc]) / 4.184;
  // NIN's Atwater factors: 4 protein, 9 fat, 4 carbohydrate, 2 fibre.
  const atwater = 4 * protein + 9 * fat + 4 * carbs + 2 * fiber;
  let kcal = published;
  let energyNote: string | undefined;
  if (published === 0 && atwater > 0) {
    kcal = atwater;
    energyNote = "source energy missing; Atwater value used";
  } else if (atwater > 20 && Math.abs(published - atwater) / atwater > 0.5) {
    kcal = atwater;
    energyNote = `source lists ${Math.round(published)} kcal, inconsistent with macros; Atwater value used`;
  }
  out.push({
    code, name: r[idx.name] ?? "", group: r[idx.grup] ?? "", localNames: r[idx.lang] ?? "",
    source: "IFCT2017",
    kcal: Math.round(kcal), protein: r1(protein), fat: r1(fat), carbs: r1(carbs), fiber: r1(fiber),
    ...(energyNote ? { energyNote } : {}),
  });
}

writeFileSync(new URL("../data/ingredients.ifct.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
const flagged = out.filter((i) => i.energyNote);
console.log(`wrote ${out.length} IFCT foods; ${flagged.length} energy values recomputed`);
for (const f of flagged) console.log(`  ${f.code} ${f.name}: ${f.energyNote}`);
