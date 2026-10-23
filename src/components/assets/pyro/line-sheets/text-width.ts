/** Geist advance widths (em × 100, weight 400): a–z, A–Z and common symbols; figures are tabular (tnum is on globally). */
const ADV_LOWER = [55, 60, 55, 60, 56, 40, 59, 58, 24, 26, 59, 27, 88, 58, 57, 60, 60, 38, 52, 39, 58, 54, 82, 58, 54, 54];
const ADV_UPPER = [67, 68, 70, 69, 60, 59, 70, 71, 27, 60, 64, 58, 88, 74, 74, 65, 73, 67, 64, 55, 69, 67, 94, 61, 58, 54];
const ADV_OTHER: Record<string, number> = { " ": 25, ".": 20, ",": 20, ":": 30, "·": 20, "-": 42, "/": 48, "°": 40, "%": 80, "(": 27, ")": 27, "+": 56, "—": 91, "–": 59 };

/** Width of a string set in Geist at `size` (SVG units), so chips fit the product font. */
export function textWidth(text: string, size: number, weight = 400, tracking = 0): number {
  let em = 0;
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (c >= 97 && c <= 122) em += ADV_LOWER[c - 97];
    else if (c >= 65 && c <= 90) em += ADV_UPPER[c - 65];
    else if (c >= 48 && c <= 57) em += 60;
    else em += ADV_OTHER[ch] ?? 62;
  }
  const bold = weight >= 600 ? 1.049 : weight >= 500 ? 1.023 : 1;
  return (em / 100) * size * bold + tracking * size * text.length;
}
