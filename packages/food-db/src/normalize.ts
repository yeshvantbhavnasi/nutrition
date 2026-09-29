/**
 * Folds the many ways Indian food names get romanised onto one spelling, so
 * "daal", "dhal" and "dal" or "chawal" and "chaval" compare equal.
 * Applied to both stored aliases and user text, so it only has to be consistent, not pretty.
 */
export function normalize(text: string): string {
  let s = text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
  s = s.replace(/[^a-z0-9\s]/g, " ");
  s = s
    .replace(/aa/g, "a")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/w/g, "v")
    .replace(/z/g, "j")
    .replace(/([bcdgjkpt])h/g, "$1") // dhal -> dal, bhindi -> bindi, chhole -> cole
    .replace(/sh/g, "s")
    .replace(/(.)\1+/g, "$1") // chapatti -> chapati, idly -> idly
    .replace(/y\b/g, "i") // idly -> idli
    .replace(/h\b/g, ""); // rajmah -> rajma, dalh
  return s.replace(/\s+/g, " ").trim();
}

/** Sørensen–Dice similarity over character bigrams of normalised strings. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const grams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return m;
  };
  const ga = grams(a);
  const gb = grams(b);
  let overlap = 0;
  for (const [g, n] of ga) overlap += Math.min(n, gb.get(g) ?? 0);
  return (2 * overlap) / (a.length - 1 + b.length - 1);
}
