/**
 * Short HMI label of a measurement ("MTR DE BRG", "C3 OUT", "O₂"), derived
 * from its database name the way control-room mimics abbreviate: where on the
 * equipment the point sits; the unit beside the value says what it measures.
 * Gas species are kept because vol% / ppm alone do not say which gas.
 */

/** Name fragments → abbreviation, matched in name order; longer phrases first. */
const WORDS: Array<[RegExp, string]> = [
  // Pyro sensor list (OSW-PE-SNL-PYR-01): numbered gates, load cells, hoppers and the parallel solid-flow meters.
  [/\bair slide (\d) outlet gate\b/, "GATE $1"],
  [/\bdischarge gate ([ab])\b/, "GATE $1"],
  [/\bkiln feed bin\b/, "BIN"],
  [/\bload cell (\d)\b/, "CELL $1"],
  [/\bcommon air slide\b/, "COMMON SLIDE"],
  [/\bsfm ([ab])\b(?!\/)/, "SFM $1"],
  [/\bsilo dust[- ]collector fan\b/, "SILO DC FAN"],
  [/\bfeed[- ]bin dust[- ]collector fan\b/, "BIN DC FAN"],
  [/\bsilo dust[- ]collector\b/, "SILO DC"],
  [/\bfeed[- ]bin dust[- ]collector\b/, "BIN DC"],
  [/\bdifferential pressure\b/, "ΔP"],
  [/\bpurge sequence\b/, "PURGE"],
  [/\bboot\b/, "BOOT"],
  [/\bbelt sway\b/, "SWAY"],
  [/\bmeal[- ]split\b/, "SPLIT"],
  [/\btertiary[- ]air\b/, "TA"],
  [/\bcalciner\b/, "CALC"],
  [/\bpulse[- ]cleaning\b/, "PULSE"],
  [/\bstack dust\b/, "STACK DUST"],
  [/\bbaghouse fan\b/, "BAG FAN"],
  [/\bairlock\b/, "AIRLOCK"],
  [/\bdust[- ]hopper\b/, "HOPPER"],
  [/\b(?:under[- ]grate )?hopper (\d)\b/, "HOPPER $1"],
  [/\bmain[- ]drive health( and motor cooling fans)?\b|\bdrive health\b/, "DRIVE HEALTH"],
  [/\bshell cooling fans\b/, "SHELL FANS"],
  [/\bgrease[- ]lube\b/, "GREASE"],
  [/\bspray controller\b/, "SPRAY CTRL"],
  [/\bcow[- ]shell\b/, "SHROUD"],
  [/\bburning[- ]zone\b/, "BZ"],
  [/\bspray circuit (\d)\b/, "SPRAY $1"],
  [/\btyre (\d)\b/, "TYRE $1"],
  [/\bleft roller\b/, "L"],
  [/\bright roller\b/, "R"],
  [/\bleft ([ab]) bearing\b/, "L BRG $1"],
  [/\bright ([ab]) bearing\b/, "R BRG $1"],
  [/\bnon[- ]drive[- ]end\b/, "NDE"],
  [/\bdrive[- ]end\b/, "DE"],
  [/\bbearing ([ab])\b/, "BRG $1"],
  [/\bauxiliary drive\b/, "AUX DRV"],
  [/\bauxiliary brake\b|\bbrake\b/, "BRAKE"],
  [/\bgirth[- ]gear spray\b/, "SPRAY"],
  [/\bshell scanner\b/, "SCANNER"],
  [/\bhandheld\b/, "HANDHELD"],
  [/\bcooling shroud\b/, "SHROUD"],
  [/\bsector[- ]plate\b/, "SECTOR"],
  [/\bflame\b/, "FLAME"],
  [/\bcoal conveying blower\b/, "COAL BLWR"],
  [/\bcoal conveying line\b/, "COAL LINE"],
  [/\bsolid[- ]flow meter\b/, "METER"],
  [/\btorque( \/ motor current)?\b/, "TORQUE"],
  [/\bwear iron\b/, "FE"],
  [/\bflow switch\b/, "FLOW SW"],
  [/\bhigh[- ]level\b/, "HI LVL"],
  [/\blow[- ]level\b/, "LO LVL"],
  [/\bsecondary air\b/, "SEC AIR"],
  [/\bprimary[- ]air fan\b/, "PA FAN"],
  [/\bprimary[- ]air\b/, "PA"],
  [/\bid fan\b/, "ID FAN"],
  [/\bvent fan\b/, "VENT FAN"],
  [/\bdust[- ]collector fan\b/, "DUST FAN"],
  [/\bcooling fan (\d)\b/, "FAN $1"],
  [/\bcooling[- ]fan\b/, "FAN"],
  [/\blimit switch(es)?\b/, "LIMIT"],
  [/\bgas analy[sz]er\b/, "ANALYSER"],
  [/\bburner fuel\b|\bfuel\b/, "FUEL"],
  [/\bseal\b/, "SEAL"],
  [/\boverlap\b/, "OVERLAP"],
  [/\bcompartment (\d)\b/, "CMP $1"],
  [/\bbucket elevator\b|\belevator\b/, "ELEV"],
  [/\bpan conveyor\b|\bconveyor\b/, "CONV"],
  [/\bair[- ]slide\b/, "SLIDE"],
  [/\baeration\b/, "AER"],
  [/\bblower\b/, "BLWR"],
  [/\bfalse[- ]air\b/, "FALSE AIR"],
  [/\bhot meal\b/, "MEAL"],
  [/\bfine[- ]coal bin\b/, "COAL BIN"],
  [/\bfeed bin\b/, "BIN"],
  [/\bkiln feed\b/, "FEED"],
  [/\bkiln coal\b|\bcoal mass flow\b/, "COAL"],
  [/\bcoal[- ]to[- ]feed\b/, "COAL/FEED"],
  [/\bclinker silo\b/, "SILO"],
  [/\braw[- ]meal silo\b/, "SILO"],
  [/\bstroke rate\b/, "STROKES"],
  [/\bshell temperature map maximum\b|\bshell .*maximum\b/, "SHELL MAX"],
  [/\b(c[1-6])\b/, "$1"],
  [/\bo₂|\bo2\b/, "O₂"],
  [/\bnoₓ|\bnox\b/, "NOₓ"],
  [/\bco\b/, "CO"],
  [/\bnde\b/, "NDE"],
  [/\bde\b/, "DE"],
  [/\bmotor\b/, "MTR"],
  [/\bwinding\b/, "WDG"],
  [/\bgearbox\b/, "GB"],
  [/\bpinion\b/, "PINION"],
  [/\brotor\b/, "ROTOR"],
  [/\bcrusher\b/, "CRUSHER"],
  [/\bbearing\b/, "BRG"],
  [/\binput\b/, "IN"],
  [/\boutput\b/, "OUT"],
  [/\boil\b/, "OIL"],
  [/\bfilter\b/, "FLT"],
  [/\bsupply\b/, "SUP"],
  [/\bgrate\b/, "GRATE"],
  [/\bhydraulic\b/, "HYD"],
  [/\bthrust\b/, "THRUST"],
  [/\baxial position\b/, "AXIAL"],
  [/\bswirl\b/, "SWIRL"],
  [/\baxial\b/, "AXIAL"],
  [/\bheader\b/, "HDR"],
  [/\binlet\b/, "INLET"],
  [/\boutlet\b/, "OUT"],
  [/\bexit\b/, "EXIT"],
  [/\briser\b/, "RISER"],
  [/\bcone\b/, "CONE"],
  [/\bhood\b/, "HOOD"],
  [/\bdischarge\b/, "DISCH"],
  [/\bexhaust\b/, "EXH"],
  [/\bbaghouse\b/, "BAG"],
  [/\bdamper\b/, "DMPR"],
  [/\bgate\b/, "GATE"],
  [/\bdraft\b/, "DRAFT"],
  [/\bspeed\b/, "SPEED"],
  [/\bpower\b/, "POWER"],
  [/\blevel\b/, "LVL"],
  [/\bweight\b/, "WT"],
  [/\bposition\b/, "POS"],
  [/\bratio\b/, "RATIO"],
  [/\bcoverage\b/, "COVER"],
];

/** Up to three abbreviations in the order they appear in the name; "" when nothing matches. */
export function hmiLabel(name: string, max = 3): string {
  // A named pressure tap in brackets ("(P2)", "(P1, slides A + B)") is the label plant people use: keep it.
  const tap = /\(p([1-9])\b/i.exec(name);
  const lower = name.toLowerCase().replace(/\(.*?\)/g, " ");
  const hits: Array<{ at: number; end: number; text: string }> = [];
  for (const [re, abbr] of WORDS) {
    const m = re.exec(lower);
    if (!m) continue;
    const at = m.index;
    const end = at + m[0].length;
    // A shorter phrase inside one already taken ("air" inside "secondary air") adds nothing.
    if (hits.some((h) => at < h.end && end > h.at)) continue;
    hits.push({ at, end, text: m[0].replace(re, abbr).toUpperCase() });
  }
  const seen = new Set<string>();
  let words = hits
    .sort((a, b) => a.at - b.at)
    .map((h) => h.text)
    .filter((t) => (seen.has(t) ? false : (seen.add(t), true)));
  if (tap) words = [`P${tap[1]}`, ...words.filter((w) => w !== "SLIDE" && w !== "BIN")];
  // A winding reading keeps "WDG" when the name is long ("AER BLWR WDG", not "AER BLWR MTR").
  if (words.length > max && words.includes("WDG")) words = words.filter((w) => w !== "MTR");
  return words.slice(0, max).join(" ");
}
