/**
 * Everyday words for engineering names (see docs/plain-language.md): expands the
 * abbreviations a newcomer cannot read, and writes a sensor-limit alarm as
 * sentences anyone can follow.
 */

/** Abbreviation → everyday words. Whole words only; order matters (longer first). */
const WORDS: Array<[RegExp, string]> = [
  [/\bID[- ]fan\b/gi, "exhaust fan"],
  [/\bPA[- ]fan\b/gi, "primary air fan"],
  [/\bNDE\b/g, "far-end"],
  [/\bDE\b/g, "drive-end"],
  [/\bHPU\b/g, "hydraulic pump unit"],
  [/\bSFM\b/g, "feed flow meter"],
  [/\bMCC\b/g, "motor control panel"],
  [/\bVFD\b/g, "speed drive"],
  [/\bTA\b(?=\s+(duct|damper|air))/g, "tertiary air"],
  [/ΔP\b/g, "pressure difference"],
  [/\bRMS\b/g, "vibration level"],
  [/\bRPM\b/gi, "speed"],
  [/\bO₂\b/g, "oxygen (O₂)"],
  [/\bCO\b/g, "carbon monoxide (CO)"],
  [/\bNO[xₓ]\b/g, "nitrogen oxides (NOₓ)"],
];

/** A name or sentence with its abbreviations spelled out. Leaves anything it does not know as it is. */
export function plainWords(text: string): string {
  let out = text;
  for (const [re, word] of WORDS) out = out.replace(re, word);
  return out;
}

/** "40–65" / "< 40" / "≥ 2" + unit → "between 40 and 65 °C" / "below 40 °C" / "above 2 bar"; a state word stays as it is. */
export function normalPhrase(band: string | null | undefined, unit: string | null | undefined): string | null {
  const b = (band ?? "").trim();
  if (!b) return null;
  const u = unit && unit !== "state" ? ` ${unit}` : "";
  const range = /^(-?[\d.,]+)\s*[–-]\s*(-?[\d.,]+)$/.exec(b);
  if (range) return `between ${range[1]} and ${range[2]}${u}`;
  const cmp = /^(<|≤|<=|>|≥|>=)\s*(-?[\d.,]+)$/.exec(b);
  if (cmp) return `${cmp[1].startsWith("<") || cmp[1] === "≤" ? "below" : "above"} ${cmp[2]}${u}`;
  return b;
}

/** Plain text of a sensor reading outside its normal range. */
export function plainLimitAlarm({
  name,
  reading,
  normal,
  higher,
  critical,
  where,
  settling,
}: {
  /** Sensor name ("ID fan DE bearing vibration"). */
  name: string;
  /** The reading with its unit ("3.8 mm/s"). */
  reading: string;
  /** Its normal range in words ("below 2.3 mm/s", from `normalPhrase`), if known. */
  normal: string | null;
  /** True when the reading is above normal, false below, null when unknown. */
  higher: boolean | null;
  critical: boolean;
  /** The part it measures ("Bucket elevator"), if known. */
  where: string | null;
  /** The reading is back in range while its alarm is still shown (it clears after a calm spell). */
  settling?: boolean;
}): { title: string; what: string; todo: string } {
  const what0 = plainWords(name);
  const subject = what0.charAt(0).toUpperCase() + what0.slice(1);
  const dir = higher === null ? "outside its normal range" : higher ? "higher than normal" : "lower than normal";
  // Lower-case only an ordinary first word ("Cyclones C1–C3" → "cyclones C1–C3"), never a code.
  const w = where ? plainWords(where) : null;
  const part = w ? (/^[A-Z][a-z]/.test(w) ? w.charAt(0).toLowerCase() + w.slice(1) : w) : "this part";
  if (settling)
    return {
      title: `${subject} was ${dir}`,
      what: `It reads ${reading} now, back inside its alarm limits${normal ? ` (it is normally ${normal})` : ""}. The alarm stays up for a few minutes in case it goes out again.`,
      todo: `Nothing to do unless it goes out of range again.`,
    };
  return {
    title: `${subject} is ${dir}`,
    what: `The sensor reads ${reading}${normal ? `; it is normally ${normal}` : ""}.${critical ? " It has gone far enough that someone must act now." : " It has gone far enough that someone should take a look."}`,
    todo: critical
      ? `Check the ${part} now and slow down or stop it if the reading keeps moving away from normal.`
      : `Ask someone to check the ${part} and watch whether the reading keeps changing.`,
  };
}
