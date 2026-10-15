/** Inter advance widths (em × 100, weight 400): a–z, A–Z and common symbols; figures are tabular (tnum is on globally). */
const ADV_LOWER = [56, 61, 57, 61, 58, 37, 61, 59, 24, 24, 55, 24, 88, 59, 60, 61, 61, 38, 53, 33, 59, 56, 82, 55, 56, 55];
const ADV_UPPER = [69, 65, 73, 72, 60, 59, 75, 74, 27, 57, 67, 56, 90, 75, 76, 64, 76, 64, 64, 65, 74, 69, 98, 68, 68, 63];
const ADV_OTHER: Record<string, number> = { " ": 28, ".": 27, ",": 27, ":": 27, "·": 29, "-": 46, "/": 36, "°": 46, "%": 98, "(": 37, ")": 37, "+": 66, "—": 100, "–": 70 };

/** Width of a string set in Inter at `size` (SVG units), so chips fit the product font. */
export function textWidth(text: string, size: number, weight = 400, tracking = 0): number {
  let em = 0;
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (c >= 97 && c <= 122) em += ADV_LOWER[c - 97];
    else if (c >= 65 && c <= 90) em += ADV_UPPER[c - 65];
    else if (c >= 48 && c <= 57) em += 65;
    else em += ADV_OTHER[ch] ?? 62;
  }
  const bold = weight >= 600 ? 1.026 : weight >= 500 ? 1.013 : 1;
  return (em / 100) * size * bold + tracking * size * text.length;
}
