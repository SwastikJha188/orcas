/**
 * Callout wording of the ULTRON machine diagram sheets D01–D11, as printed on
 * each page of the diagrams PDF (D4-OSW-PE-PYR Rev. 02). The sheet view shows
 * this short description in the callout box; the full D4 parameter stays in
 * the accessible name and the tooltip. D06 places these callouts inside their
 * station panel as the PDF does, and still names the station in the roller and
 * oil-bath wording so the phone-width list (no panels) stays unambiguous.
 */

const tyres = Object.fromEntries([1, 2, 3].map((n) => [`MIG-KLN-0${n}`, `Tyre ${n} migration`]));

/** TMP-KLN-01…12: per station, left roller A / B then right roller A / B. */
const rollers = Object.fromEntries(
  Array.from({ length: 12 }, (_, i) => {
    const station = Math.floor(i / 4) + 1;
    const side = i % 4 < 2 ? "left" : "right";
    const end = i % 2 === 0 ? "A" : "B";
    return [`TMP-KLN-${String(i + 1).padStart(2, "0")}`, `Station ${station} ${side} roller ${end}`];
  }),
);

/** LEV-KLN-02…07: per station, left then right oil bath. */
const baths = Object.fromEntries(
  Array.from({ length: 6 }, (_, i) => [`LEV-KLN-0${i + 2}`, `Station ${Math.floor(i / 2) + 1} ${i % 2 === 0 ? "left" : "right"} oil bath`]),
);

const spray = Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => [`PRX-KLN-0${n}`, `Spray circuit ${n} (HOLD: OEM proof)`]));

const fans13 = Object.fromEntries(
  [1, 2, 3].flatMap((n) => [
    [`PRS-CLR-0${n}`, `Compartment ${n} under-grate pressure`],
    [`TMP-CLR-0${n}`, `Fan ${n} bearing temperature`],
    [`VIB-CLR-0${n}`, `Fan ${n} bearing vibration`],
    [`ELE-CLR-0${n}`, `Fan ${n} motor current`],
  ]),
);

const fans46 = Object.fromEntries(
  [4, 5, 6].flatMap((n) => [
    [`PRS-CLR-0${n}`, `Compartment ${n} pressure`],
    [`TMP-CLR-0${n}`, `Fan ${n} bearing temperature`],
    [`ELE-CLR-0${n}`, `Fan ${n} motor current`],
  ]),
);

export const SHEET_CALLOUT: Record<string, string> = {
  // D01 · FSL-01 + KFS-01
  "LEV-FSL-01": "Silo level (radar)",
  "STS-FSL-01": "Extraction gate status",
  "PRS-FSL-01": "Aeration header pressure",
  "ELE-FSL-01": "Aeration blower motor current",
  "STS-FSL-02": "Blower run / duty-standby",
  "LEV-KFS-01": "Feed bin level (radar)",
  "LEV-KFS-02": "Feed bin high level switch",
  "LEV-KFS-03": "Feed bin low level switch",
  "POS-KFS-01": "Dosing gate position",
  "WGT-KFS-01": "Feed bin weight (load cells)",
  "PRS-KFS-01": "Air-slide pressure",
  "PRS-KFS-02": "SFM back-pressure",
  "FLO-KFS-01": "Kiln feed mass flow",
  "ELE-KFS-01": "Elevator motor current",
  "VIB-KFS-01": "Head-drive vibration",
  "TMP-KFS-01": "Head bearing temperature",
  "SPD-KFS-01": "Elevator speed / slip",
  // D02 · PHC-01 tower
  "TMP-PHC-01": "C1 gas outlet temperature",
  "PRS-PHC-01": "Preheater exit draft (C1)",
  "TMP-PHC-02": "C2 gas outlet temperature",
  "PRS-PHC-02": "C2 stage draft",
  "TMP-PHC-03": "C3 gas outlet temperature",
  "PRS-PHC-03": "C3 stage draft",
  "TMP-PHC-04": "C4 gas outlet temperature",
  "PRS-PHC-04": "C4 stage draft",
  "PRS-PHC-07": "C4 cone pressure (purged tap)",
  "TMP-PHC-05": "C5 gas outlet temperature",
  "PRS-PHC-05": "C5 stage draft",
  "PRS-PHC-08": "C5 cone pressure (purged tap)",
  "TMP-PHC-06": "C6 gas outlet temperature",
  "PRS-PHC-06": "C6 / riser draft",
  "PRS-PHC-09": "C6 cone pressure (purged tap)",
  "TMP-PHC-08": "Riser duct gas temperature",
  "TMP-PHC-07": "Hot meal to kiln temperature",
  // D03 · PHC-01 exit gas and ID fan
  "GAS-PHC-01": "Preheater exit O₂",
  "GAS-PHC-02": "Preheater exit CO",
  "POS-PHC-01": "ID fan inlet damper position",
  "SPD-PHC-01": "ID fan speed",
  "ELE-PHC-01": "ID fan motor current / power",
  "VIB-PHC-02": "ID fan NDE vibration",
  "TMP-PHC-10": "ID fan NDE bearing temperature",
  "VIB-PHC-01": "ID fan DE vibration",
  "TMP-PHC-09": "ID fan DE bearing temperature",
  // D04 · KLN-01 main drive, lubrication, auxiliary drive
  "TMP-KLN-21": "Motor winding temperature",
  "ELE-KLN-01": "Main motor current / torque",
  "TMP-KLN-20": "Motor NDE bearing temperature",
  "TMP-KLN-19": "Motor DE bearing temperature",
  "SPD-KLN-01": "Kiln speed (encoder / VFD)",
  "VIB-KLN-01": "Motor DE vibration",
  "TMP-KLN-22": "Gearbox input bearing temperature",
  "VIB-KLN-02": "Gearbox input vibration",
  "VIB-KLN-03": "Gearbox output vibration",
  "TMP-KLN-23": "Gearbox output bearing temperature",
  "VIB-KLN-04": "Pinion bearing vibration",
  "TMP-KLN-15": "Gearbox oil temperature",
  "LEV-KLN-01": "Gearbox oil low level",
  "LAB-KLN-01": "Oil laboratory result (sample port)",
  "PRS-KLN-04": "Gearbox oil pressure",
  "FLO-KLN-05": "Gearbox oil flow switch",
  "PRS-KLN-05": "Oil filter differential pressure",
  "STS-KLN-11": "Auxiliary drive status",
  "LIM-KLN-01": "Aux brake-pad wear limit",
  // D05 · KLN-01 spray lubrication
  "STS-KLN-05": "Spray controller status / fault",
  ...spray,
  // D06 · KLN-01 support stations, tyres, thrust
  ...tyres,
  ...rollers,
  ...baths,
  "POS-KLN-01": "Kiln axial position (LVDT)",
  "POS-KLN-02": "Thrust travel limit switches",
  "PRS-KLN-07": "Thrust hydraulic pressure",
  // D07 · KLN-01 shell, inlet, outlet
  "TMP-KLN-13": "Kiln inlet gas temperature",
  "PRS-KLN-01": "Kiln inlet draft",
  "GAS-KLN-01": "Kiln inlet O₂",
  "GAS-KLN-02": "Kiln inlet CO",
  "GAS-KLN-03": "Kiln inlet NOₓ",
  "STS-KLN-06": "Gas analyser status",
  "STS-KLN-08": "Shell scanner: map, shell maximum",
  "MAN-KLN-01": "Handheld shell scan (manual record)",
  "TMP-KLN-25": "Outlet cooling-air supply temperature",
  "TMP-KLN-26": "Cow-shell (shroud) surface temperature",
  "TMP-KLN-14": "Burning-zone temperature (pyrometer)",
  "TMP-KLN-27": "Kiln hood temperature",
  "PRS-KLN-03": "Hood pressure",
  // D08 · BRN-01
  "CAM-BRN-01": "Flame camera",
  "PRS-BRN-01": "Swirl (helical) air pressure",
  "PRS-BRN-02": "Axial (jet) air pressure",
  "PRS-BRN-03": "Primary-air header pressure",
  "TMP-BRN-02": "Secondary air temperature",
  "TMP-BRN-04": "Fine-coal bin temperature",
  // The PDF prints "CO"; the D4 schedule lists CO / CO₂ (confirmation gate open), so both are kept.
  "GAS-BRN-01": "Fine-coal bin CO / CO₂ (fire / explosion)",
  "LEV-BRN-01": "Fine-coal bin level",
  "FLO-BRN-01": "Kiln coal mass flow",
  "PRS-BRN-04": "Coal conveying line pressure",
  "VIB-BRN-01": "Primary-air fan vibration",
  "TMP-BRN-01": "Primary-air fan bearing temperature",
  "ELE-BRN-01": "Primary-air fan motor current",
  "VIB-BRN-02": "Coal blower vibration",
  "ELE-BRN-02": "Coal blower motor current",
  // D09 / D10 · CLR-01
  ...fans13,
  ...fans46,
  "TMP-CLR-08": "Clinker discharge temperature (IR)",
  "TMP-CLR-09": "Cooler exhaust gas temperature",
  "VIB-CLR-07": "Vent fan vibration",
  "ELE-CLR-07": "Vent fan motor current",
  "TMP-CLR-10": "Vent fan bearing temperature",
  "SPD-CLR-01": "Grate stroke rate",
  "TMP-CLR-07": "Grate hydraulic oil temperature",
  "PRS-CLR-07": "Grate hydraulic pressure",
  // D11 · HMR-01 + CSL-01
  "TMP-HMR-03": "Crusher motor winding temperature",
  "ELE-HMR-01": "Crusher motor current / trip",
  "SPD-HMR-01": "Crusher rotor speed (jam / underspeed)",
  "VIB-HMR-02": "Rotor NDE bearing vibration",
  "TMP-HMR-02": "Rotor NDE bearing temperature",
  "VIB-HMR-01": "Rotor DE bearing vibration",
  "TMP-HMR-01": "Rotor DE bearing temperature",
  "VIB-CSL-01": "Pan conveyor head drive vibration",
  "ELE-CSL-01": "Pan conveyor motor current",
  "SPD-CSL-01": "Chain speed / zero-speed (tail)",
  "PRS-CSL-01": "Baghouse differential pressure",
  "ELE-CSL-02": "Dust fan motor current",
  "LEV-CSL-01": "Clinker silo level",
};

/**
 * Tag line of a callout whose D4 entry names more than one tag. K-K33 is one
 * scanner entry, "STS-KLN-08 / CAL-KLN-03": scanner status plus the shell
 * temperature map, whose maximum ULTRON keeps as CAL-KLN-03.
 */
export const SHEET_TAG_LABEL: Record<string, string> = {
  "STS-KLN-08": "STS-KLN-08 / CAL-KLN-03",
};
