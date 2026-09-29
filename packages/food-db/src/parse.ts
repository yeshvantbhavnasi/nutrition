import { canonicalUnit } from "./lookup.js";
import { normalize } from "./normalize.js";

export interface ParsedItem {
  name: string;
  quantity: number;
  unit?: string;
}

const NUMBER_WORDS: Record<string, number> = {
  half: 0.5, adha: 0.5, aadha: 0.5, dedh: 1.5, dhai: 2.5, one: 1, ek: 1, a: 1, an: 1,
  two: 2, do: 2, three: 3, tin: 3, teen: 3, four: 4, char: 4, chaar: 4, five: 5, panch: 5, paanch: 5,
  six: 6, che: 6, chhe: 6,
};

const MEAL_WORDS = /^(breakfast|lunch|dinner|snack|snacks|nashta|nasta|nashte|brunch|evening snack|today|aaj|i had|had|ate|khaya|khaye|mein|me)\b[:\s-]*/;

/**
 * Rule-based parser for simple logs like "lunch: 2 phulka, 1 katori dal and bhindi".
 * It is the cheap first pass and the eval baseline; the LLM handles anything messier.
 */
export function parseSimpleMeal(message: string): ParsedItem[] {
  let text = message.toLowerCase().replace(/\(.*?\)/g, " ");
  for (let i = 0; i < 3; i++) text = text.trim().replace(MEAL_WORDS, "");
  const parts = text.split(/,|\+|\n|;|\band\b|\baur\b|\bwith\b|\bwithout\b|&/).map((p) => p.trim()).filter(Boolean);
  const items: ParsedItem[] = [];
  for (const part of parts) {
    const tokens = part.split(/\s+/);
    let quantity = 1;
    let i = 0;
    const first = tokens[0] ?? "";
    const numMatch = first.match(/^(\d+(?:\.\d+)?|\d+\/\d+)(.*)$/);
    if (numMatch) {
      const [, n = "1", rest = ""] = numMatch;
      quantity = n.includes("/") ? Number(n.split("/")[0]) / Number(n.split("/")[1]) : Number(n);
      if (rest) tokens[0] = rest; // "200g" -> quantity 200, unit "g"
      else i = 1;
    } else if (NUMBER_WORDS[first] !== undefined) {
      quantity = NUMBER_WORDS[first]!;
      i = 1;
    }
    let unit: string | undefined;
    for (const width of [2, 1]) {
      const candidate = tokens.slice(i, i + width).join(" ");
      if (tokens.length > i + width - 1 && canonicalUnit(candidate)) {
        unit = canonicalUnit(candidate);
        i += width;
        break;
      }
    }
    if (tokens[i] === "of" || tokens[i] === "ka" || tokens[i] === "ki") i++;
    let rest = tokens.slice(i);
    // Quantity after the name: "khichdi 1 bowl", "gulab jamun 2", "dhokla 4 pieces".
    if (!numMatch && i === 0 && rest.length >= 2) {
      const last = rest[rest.length - 1] ?? "";
      const beforeLast = rest[rest.length - 2] ?? "";
      if (/^\d+(\.\d+)?$/.test(last)) {
        quantity = Number(last);
        rest = rest.slice(0, -1);
      } else if (/^\d+(\.\d+)?$/.test(beforeLast) && canonicalUnit(last)) {
        quantity = Number(beforeLast);
        unit = canonicalUnit(last);
        rest = rest.slice(0, -2);
      }
    }
    const name = rest.join(" ").trim();
    if (normalize(name)) items.push({ name, quantity, ...(unit ? { unit } : {}) });
  }
  return items;
}
