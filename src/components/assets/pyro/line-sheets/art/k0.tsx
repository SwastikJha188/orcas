/**
 * Sheet K-0 — KLN-01 · Rotary kiln — stage overview.
 *
 * Composition of page 3 of the pyro-line stage-overview PDF (1654 × 774 units).
 * Upper half, elevation: kiln inlet chamber and riser with the inlet gas
 * analyser, the shell on three tyres and roller stations, girth gear, main
 * drive (pinion, gearbox, coupling, motor, drive cabinet), hydraulic thrust
 * roller and its power unit, the stand-off shell scanner, shell cooling fans,
 * burning zone and cow shell with the outlet cooling fan, kiln hood with the
 * burner pipe and the burning-zone pyrometer. Lower half, below the ground:
 * the three roller stations in plan, the gearbox lube skid, the auxiliary
 * drive and the girth-gear spray lubrication.
 */
import React from "react";
import { Bolt, CornerBolts, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Volute } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { KilnShell } from "./parts-kb";

const W = 1654;
const H = 774;
const GROUND = 495;
const SHELL = { x: 229, y: 245, w: 1091, h: 83 };
const TYRES = [375, 790, 1101.5];
const ROLLER_Y = 365;
/** Inset panels below the ground: [x0, x1]. */
const PANELS: [number, number][] = [
  [69.5, 364.5],
  [374.5, 618],
  [626, 761],
  [771, 963.5],
  [974, 1269],
  [1283, 1578],
];
/** Left bearing centre of each station plan. */
const PLANS = [103, 1007.2, 1316.5];
const NOZZLES = [872.5, 886.7, 900.9, 915.1, 929.3, 943.5];

type Pt = [number, number];

/** Filled arrowhead with its tip at (x, y), pointing along `deg` (0 = +x, 90 = +y). */
function Head({ x, y, deg, color, s = 9 }: { x: number; y: number; deg: number; color: string; s?: number }) {
  return (
    <path
      d={`M 0 0 L ${-s} ${-s * 0.55} L ${-s} ${s * 0.55} Z`}
      transform={`translate(${x} ${y}) rotate(${deg})`}
      fill={color}
      stroke={color}
      strokeWidth={0.8}
      strokeLinejoin="round"
    />
  );
}

/** Flow line through `pts`. */
function Flow({ pts, color, dash, w = 2 }: { pts: Pt[]; color: string; dash?: string; w?: number }) {
  return (
    <polyline
      points={pts.map((p) => p.join(",")).join(" ")}
      fill="none"
      stroke={color}
      strokeWidth={w}
      strokeDasharray={dash}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  );
}

/** Hot interior (refractory face) — dark with a heat wash. */
function HotFace({ x, y, w, h, rx = 4 }: { x: number; y: number; w: number; h: number; rx?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={rx} fill={MX.deep} stroke={MX.edge} strokeWidth={MX.w} />
      <rect x={x} y={y} width={w} height={h} rx={rx} fill={MX.heat} opacity={0.3} />
    </g>
  );
}

/** Support roller seen end-on. */
function Roller({ cx }: { cx: number }) {
  return (
    <g>
      <circle cx={cx} cy={ROLLER_Y} r={27} {...PAINT.cylinder} />
      <circle cx={cx} cy={ROLLER_Y} r={21} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      <circle cx={cx} cy={ROLLER_Y} r={10} {...PAINT.recess} />
    </g>
  );
}

/** Roller station in elevation: base frame, two rollers, tapered pier. */
function Station({ r1, r2, frame, pier, bolts }: { r1: number; r2: number; frame: [number, number, number, number]; pier: string; bolts: number[] }) {
  return (
    <g>
      <path d={pier} {...PAINT.body} />
      {bolts.map((bx) => (
        <circle key={bx} cx={bx} cy={478.5} r={2.6} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      ))}
      <rect x={frame[0]} y={frame[1]} width={frame[2]} height={frame[3]} rx={3} {...PAINT.raised} />
      <Roller cx={r1} />
      <Roller cx={r2} />
    </g>
  );
}

function Inlet() {
  return (
    <g>
      {/* riser to the preheater */}
      <rect x={120} y={101} width={61} height={63} rx={6} {...PAINT.cylinderV} />
      {/* inlet chamber: casing, hot face, meal heap */}
      <rect x={90} y={165} width={132} height={325} rx={10} {...PAINT.body} />
      <HotFace x={103} y={179} w={106} h={297} rx={6} />
      <path d="M 111 470 Q 140 446 168 442 Q 193 440 204 447 V 470 Z" {...PAINT.material} opacity={0.75} />
      {/* inlet seal */}
      <rect x={214} y={236} width={15} height={101} rx={4} {...PAINT.raised} />
      {/* gas sample line to the analyser */}
      <line x1={209} y1={202} x2={252} y2={163} {...PAINT.hair} strokeDasharray="3 3" />
    </g>
  );
}

function Analyser() {
  return (
    <g>
      <rect x={252} y={109} width={184} height={60} rx={8} {...PAINT.body} />
      {[264, 303, 341, 386].map((x) => (
        <g key={x}>
          <rect x={x} y={119} width={31.5} height={26} rx={3} {...PAINT.raised} />
          <rect x={x + 3} y={122} width={25.5} height={20} rx={2} {...PAINT.recess} />
        </g>
      ))}
      <MachineLabel x={279.8} y={159.5} size={7.2}>O₂</MachineLabel>
      <MachineLabel x={318.5} y={159.5} size={7.2}>CO</MachineLabel>
      <MachineLabel x={357.2} y={159.5} size={7.2}>NOx</MachineLabel>
    </g>
  );
}

function ShellAndTyres() {
  return (
    <g>
      <KilnShell x={SHELL.x} y={SHELL.y} w={SHELL.w} h={SHELL.h} seam={77.75} axis={false} />
      {/* burning zone */}
      <ellipse cx={1225} cy={287} rx={135} ry={34} fill={MX.heat} opacity={0.28} />
      <ellipse cx={1255} cy={286.5} rx={85} ry={24} fill={MX.heat} opacity={0.45} />
      <ellipse cx={1272} cy={286.5} rx={58} ry={18} fill={MX.heat} />
      <ellipse cx={1290} cy={286.5} rx={30} ry={9} {...PAINT.material} />
      {TYRES.map((x) => (
        <g key={x}>
          <rect x={x} y={235} width={22.5} height={105} rx={6} {...PAINT.cylinderV} />
          <line x1={x + 4} x2={x + 4} y1={241} y2={334} {...PAINT.hair} />
          <line x1={x + 18.5} x2={x + 18.5} y1={241} y2={334} {...PAINT.hair} />
        </g>
      ))}
      {/* girth gear edge-on */}
      <rect x={464} y={211} width={22} height={151} rx={4} {...PAINT.raised} />
      {Array.from({ length: 34 }).map((_, i) => (
        <line key={i} x1={468} x2={482} y1={216 + i * 4.2} y2={216 + i * 4.2} {...PAINT.hair} />
      ))}
      {/* outlet seal */}
      <HotFace x={1313} y={249} w={10} h={74} rx={3} />
    </g>
  );
}

function MainDrive() {
  return (
    <g>
      {/* pinion bearing block on its column */}
      <rect x={456} y={397.5} width={40} height={97.5} rx={3} {...PAINT.body} />
      <line x1={462} x2={462} y1={402} y2={490} {...PAINT.hair} />
      <line x1={490} x2={490} y1={402} y2={490} {...PAINT.hair} />
      <rect x={455} y={367.5} width={41} height={28.5} rx={5} {...PAINT.raised} />
      <rect x={496} y={377.5} width={13} height={10} rx={1.5} {...PAINT.shaft} />
      {/* main gearbox on its plinth */}
      <rect x={509} y={426} width={91} height={69} rx={3} {...PAINT.body} />
      <rect x={508} y={359} width={92} height={66} rx={8} {...PAINT.body} />
      <rect x={513} y={364} width={82} height={56} rx={5} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      <circle cx={565} cy={387.5} r={19.5} fill="none" stroke={MX.edge} strokeWidth={MX.w} />
      <circle cx={565} cy={387.5} r={6} {...PAINT.recess} />
      <circle cx={533} cy={395.5} r={12} fill="none" stroke={MX.edge} strokeWidth={MX.w} />
      <circle cx={533} cy={395.5} r={4} {...PAINT.recess} />
      <CornerBolts x={508} y={359} w={92} h={66} inset={5.5} r={1.3} />
      {/* coupling */}
      <rect x={600} y={389} width={25} height={8.5} rx={1.5} {...PAINT.shaft} />
      <rect x={608} y={384} width={9} height={18} rx={2} {...PAINT.raised} />
      {/* main motor: DE housing, finned frame, terminal box, NDE cover */}
      <rect x={624} y={419} width={93.5} height={76} rx={3} {...PAINT.body} />
      <rect x={624.5} y={372.5} width={23} height={43.5} rx={5} {...PAINT.raised} />
      <rect x={650} y={375} width={65} height={37.5} rx={5} {...PAINT.body} />
      {[383, 390, 397, 404].map((y) => (
        <line key={y} x1={655} x2={710} y1={y} y2={y} {...PAINT.hair} />
      ))}
      <rect x={650} y={354} width={42} height={20} rx={4} {...PAINT.raised} />
      <rect x={715} y={379} width={10} height={30} rx={3} {...PAINT.raised} />
      {/* drive cabinet (VFD / drive health) */}
      <rect x={727.5} y={380} width={27.5} height={30} rx={4} {...PAINT.raised} />
      <rect x={732} y={385} width={18.5} height={20} rx={2} {...PAINT.recess} />
    </g>
  );
}

function ThrustAndScanner() {
  return (
    <g>
      {/* scanner sight lines to the shell */}
      {[790, 870, 1140, 1230].map((tx) => (
        <line key={tx} x1={995.5} y1={372} x2={tx} y2={SHELL.y + SHELL.h + 1} stroke={MX.air} strokeWidth={1} strokeDasharray="4 4" opacity={0.7} />
      ))}
      {/* hydraulic power unit */}
      <rect x={892} y={429} width={82} height={66} rx={6} {...PAINT.body} />
      <rect x={897} y={434} width={72} height={56} rx={4} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      {/* thrust roller, cylinder with its rod, travel-limit switch */}
      <HotFace x={882} y={384} w={27} h={35} rx={4} />
      <rect x={906} y={392.5} width={54} height={16.5} rx={4} {...PAINT.body} />
      <rect x={912.5} y={385.5} width={36.5} height={10} rx={3} fill={MX.air} opacity={0.55} stroke={MX.edge} strokeWidth={MX.wFine} />
      <circle cx={963.2} cy={400.2} r={7.5} {...PAINT.raised} />
      {/* stand-off shell scanner on its post */}
      <rect x={989.5} y={397.5} width={11.5} height={92.5} rx={2} {...PAINT.cylinderV} />
      <rect x={983} y={489} width={24.5} height={6} rx={1.5} {...PAINT.raised} />
      <rect x={970} y={369.5} width={51} height={28} rx={6} {...PAINT.body} />
    </g>
  );
}

function HotEnd() {
  return (
    <g>
      {/* shell cooling fans blowing onto the shell, their starter / status box between them */}
      <rect x={968} y={151} width={21.5} height={18.5} rx={4} {...PAINT.raised} />
      {[943.5, 1015].map((cx) => (
        <g key={cx}>
          <Volute cx={cx} cy={187} r={16} outH={3} dir={-1} />
          <line x1={cx} x2={cx} y1={210} y2={232} stroke={MX.air} strokeWidth={1.6} />
          <Head x={cx} y={240} deg={90} color={MX.air} s={8} />
        </g>
      ))}
      {/* cow shell (cooling shroud) */}
      <rect x={1238} y={230} width={82} height={114} rx={8} fill="none" stroke={MX.air} strokeWidth={1.8} strokeDasharray="6 4" />
      {/* outlet cooling fan and its duct up to the shroud */}
      <rect x={1256.5} y={344} width={12} height={80} rx={1.5} {...PAINT.cylinderV} />
      <Volute cx={1274} cy={452} r={20} outH={10} dir={-1} />
      {/* kiln hood: casing, refractory face, pyrometer, burner pipe */}
      <rect x={1325.5} y={154} width={173.5} height={340} rx={10} {...PAINT.body} />
      <HotFace x={1331.5} y={168.5} w={23.5} h={310.5} rx={5} />
      <line x1={1412} y1={152} x2={1235} y2={272} stroke={MX.air} strokeWidth={1.2} strokeDasharray="5 4" opacity={0.85} />
      <rect x={1400} y={126.5} width={36} height={27.5} rx={4} {...PAINT.raised} />
      <rect x={1405} y={130.5} width={26} height={19} rx={3} fill={MX.air} opacity={0.35} />
      <rect x={1340} y={279} width={257} height={14.5} rx={2} fill={MX.deep} stroke={MX.edge} strokeWidth={MX.w} />
      <line x1={1342} x2={1595} y1={282.5} y2={282.5} {...PAINT.hair} />
    </g>
  );
}

function Flows() {
  const gas = MX.gas;
  // Flat material colour: a gradient paint does not render on straight strokes (zero-height bbox).
  const gold = "var(--mx-material)";
  const air = MX.air;
  return (
    <g>
      {/* hot gas: hood → shell → inlet chamber → riser */}
      <Flow pts={[[1250, 268], [163, 268], [163, 181], [151, 170], [151, 70]]} color={gas} dash="8 6" />
      <Head x={210} y={268} deg={180} color={gas} s={14} />
      <Head x={496} y={268} deg={180} color={gas} s={14} />
      <Head x={997} y={268} deg={180} color={gas} s={14} />
      <Head x={163} y={218} deg={-90} color={gas} s={14} />
      <Head x={151} y={106} deg={-90} color={gas} s={14} />
      {/* meal down the riser, material through the kiln */}
      <Flow pts={[[202, 69], [202, 190]]} color={gold} />
      <Head x={202} y={100} deg={90} color={gold} s={14} />
      <Flow pts={[[240, 319], [1249, 319]]} color={gold} />
      <Head x={510} y={319} deg={0} color={gold} s={14} />
      <Head x={1013} y={319} deg={0} color={gold} s={14} />
      {/* clinker out of the kiln into the cooler, secondary air up to the kiln */}
      <Flow pts={[[1320, 319], [1400, 387.5], [1400, 485]]} color={gold} />
      <Head x={1366} y={358.5} deg={40.6} color={gold} s={14} />
      <Head x={1400} y={448} deg={90} color={gold} s={14} />
      <Flow pts={[[1460, 485], [1460, 347.5], [1332.5, 302.5]]} color={air} />
      <Head x={1460} y={404} deg={-90} color={air} s={14} />
      <Head x={1393} y={324} deg={199.4} color={air} s={14} />
      {/* fuel along the burner pipe */}
      <Flow pts={[[1597, 286.5], [1446, 286.5]]} color={gold} />
      <Head x={1545} y={286.5} deg={180} color={gold} s={14} />
      {/* spray lubricant to the girth gear */}
      <Flow pts={[[485, 362], [485, 519], [907.5, 519], [907.5, 642.5]]} color={gold} dash="5 4" w={1.6} />
      {/* aux drive coupling to the main drive */}
      <line x1={585} y1={450} x2={657.5} y2={630} {...PAINT.hair} strokeDasharray="4 4" />
      {/* gearbox oil: tank → header → gearbox */}
      <Flow pts={[[444, 617.5], [444, 571.5], [514, 571.5]]} color={gold} />
      <Flow pts={[[527.5, 425], [527.5, 556]]} color={gold} />
      <Flow pts={[[552.5, 425], [552.5, 556]]} color={gold} />
      <Flow pts={[[587, 581.5], [587, 589]]} color={gold} />
      {/* spray drum → divider block */}
      <Flow pts={[[845, 662.5], [862.5, 662.5]]} color={gold} />
    </g>
  );
}

function StationPlan({ b }: { b: number }) {
  const rows = [581.2, 690.8];
  return (
    <g>
      {rows.map((y) => (
        <rect key={`s${y}`} x={b + 16} y={y - 11} width={200} height={22} rx={3} {...PAINT.cylinder} />
      ))}
      <rect x={b + 99.5} y={546} width={29} height={179} rx={6} {...PAINT.cylinderV} />
      {rows.map((y) =>
        [b, b + 232].map((x) => (
          <g key={`${x}-${y}`}>
            <rect x={x - 16} y={y - 18.5} width={32} height={37} rx={4} {...PAINT.body} />
            <rect x={x - 11} y={y - 13.5} width={22} height={27} rx={3} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
          </g>
        )),
      )}
      {[550, 707.5].map((y) => (
        <g key={`b${y}`}>
          <rect x={b + 37} y={y} width={62.5} height={12.5} rx={3} {...PAINT.body} />
          <rect x={b + 40} y={y + 2.5} width={56.5} height={7.5} rx={2} {...PAINT.material} />
        </g>
      ))}
    </g>
  );
}

function LubeSkid() {
  return (
    <g>
      {/* oil tank with the oil level */}
      <rect x={389} y={617.5} width={111} height={97.5} rx={6} {...PAINT.body} />
      <rect x={396.5} y={647.5} width={96} height={62.5} rx={3} {...PAINT.recess} />
      <rect x={398.5} y={651} width={92} height={57} rx={2} {...PAINT.material} opacity={0.8} />
      {/* header / cooler block, filter, duty and standby pumps */}
      <rect x={514} y={556} width={77} height={25.5} rx={5} {...PAINT.body} />
      <rect x={577.5} y={589} width={19} height={62} rx={8} {...PAINT.cylinderV} />
      <Volute cx={528} cy={710} r={11} outH={3} dir={-1} />
      <Volute cx={563} cy={710} r={11} outH={3} dir={-1} />
    </g>
  );
}

function AuxDrive() {
  return (
    <g>
      <rect x={685} y={661} width={58} height={6} rx={1.5} {...PAINT.raised} />
      <rect x={670} y={621} width={68} height={42} rx={7} {...PAINT.body} />
      {[630, 637, 644, 651].map((y) => (
        <line key={y} x1={676} x2={732} y1={y} y2={y} {...PAINT.hair} />
      ))}
      <rect x={690} y={636} width={22} height={10} rx={4} {...PAINT.recess} />
      <rect x={736} y={627} width={14} height={30} rx={4} {...PAINT.raised} />
      <rect x={692} y={607} width={29} height={14} rx={3} {...PAINT.raised} />
      {/* brake disc and caliper */}
      <rect x={647} y={624} width={22} height={31} rx={6} {...PAINT.raised} />
      <rect x={652} y={628} width={12} height={23} rx={3} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
    </g>
  );
}

function SprayLube() {
  return (
    <g>
      {/* controller over the lubricant drum */}
      <rect x={785} y={570} width={60} height={144} rx={8} {...PAINT.body} />
      <rect x={791.5} y={577.5} width={46} height={23.5} rx={3} {...PAINT.recess} />
      <rect x={792.5} y={622.5} width={45} height={83.5} rx={3} {...PAINT.recess} />
      <rect x={795} y={626} width={40} height={77} rx={2} {...PAINT.material} opacity={0.8} />
      {/* six-circuit divider block and its nozzles */}
      <rect x={862.5} y={642.5} width={92.5} height={40} rx={6} {...PAINT.body} />
      <rect x={867.5} y={647.5} width={82.5} height={30} rx={4} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      {NOZZLES.map((x) => (
        <rect key={x} x={x - 2} y={682} width={4} height={8} {...PAINT.shaft} />
      ))}
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={70} x2={1580} y={GROUND} />
      {PANELS.map(([x0, x1]) => (
        <rect key={x0} x={x0} y={511} width={x1 - x0} height={224} rx={10} fill="none" stroke={MX.fine} strokeWidth={0.9} strokeDasharray="5 4" opacity={0.85} />
      ))}
      <Station r1={346} r2={424} frame={[297.5, 397.5, 175, 16.5]} pier="M 317 414 H 462 L 470 495 H 305 Z" bolts={[324]} />
      <Station r1={767.5} r2={839} frame={[722, 397.5, 158, 17.5]} pier="M 727.5 415 H 870 L 882 495 H 720 Z" bolts={[740, 861.5]} />
      <Station r1={1072.5} r2={1150} frame={[1024.5, 400, 175.5, 15]} pier="M 1037.5 415 H 1181 L 1195 495 H 1031 Z" bolts={[1051, 1173.5]} />
      <Inlet />
      <Analyser />
      <ShellAndTyres />
      <MainDrive />
      <ThrustAndScanner />
      <HotEnd />
      {PLANS.map((b) => (
        <StationPlan key={b} b={b} />
      ))}
      <LubeSkid />
      <AuxDrive />
      <SprayLube />
      <Flows />
      {/* bolts on the drive plinths */}
      <Bolt x={517} y={480} r={1.6} />
      <Bolt x={592} y={480} r={1.6} />
      <Bolt x={632} y={480} r={1.6} />
      <Bolt x={709} y={480} r={1.6} />

      <MachineLabel x={155} y={159} size={7.6}>RISER</MachineLabel>
      <MachineLabel x={475} y={202} size={10}>GIRTH GEAR</MachineLabel>
      <MachineLabel x={978} y={138} size={10}>SHELL COOLING FANS</MachineLabel>
      <MachineLabel x={1277.5} y={219.5} size={10}>COW SHELL</MachineLabel>
      <MachineLabel x={150.5} y={507.5} size={10}>KILN INLET</MachineLabel>
      <MachineLabel x={596} y={507.5} size={10}>MAIN DRIVE</MachineLabel>
      <MachineLabel x={930} y={507.5} size={10}>THRUST</MachineLabel>
      <MachineLabel x={996} y={507.5} size={10}>SCANNER</MachineLabel>
      <MachineLabel x={1273.5} y={507.5} size={10}>OUTLET FAN</MachineLabel>
      <MachineLabel x={1410} y={507.5} size={10}>KILN HOOD</MachineLabel>
      <MachineLabel x={82} y={531} anchor="start" size={11.5}>STATION 1 · PLAN</MachineLabel>
      <MachineLabel x={387} y={531} anchor="start" size={11.5}>GEARBOX LUBE SKID</MachineLabel>
      <MachineLabel x={641} y={531} anchor="start" size={11.5}>AUX DRIVE</MachineLabel>
      <MachineLabel x={783} y={531} anchor="start" size={11.5}>SPRAY LUBE</MachineLabel>
      <MachineLabel x={986.5} y={531} anchor="start" size={11.5}>STATION 2 · PLAN</MachineLabel>
      <MachineLabel x={1295} y={531} anchor="start" size={11.5}>STATION 3 · PLAN</MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), at the PDF pad where page 3 has one. */
const pads: LineSheetArt["pads"] = {
  // inlet and gas analyser (K-1)
  "GAS-KLN-01": [279.8, 132],
  "GAS-KLN-02": [318.5, 132],
  "GAS-KLN-03": [357.2, 132],
  "STS-KLN-06": [401.8, 132],
  "CAL-KLN-06": [426, 162],
  "TMP-KLN-13": [153.8, 245.8],
  "PRS-KLN-01": [155.8, 418.5],
  // tyres (K-6)
  "MIG-KLN-01": [385.2, 227.5],
  "MIG-KLN-02": [800.5, 227.5],
  "MIG-KLN-03": [1112, 227.5],
  "TMP-KLN-28": [385.2, 308.8],
  "TMP-KLN-29": [800.5, 308.8],
  "TMP-KLN-30": [1112.2, 308.8],
  "STS-KLN-13": [978.8, 160.2],
  // main drive (K-2)
  "VIB-KLN-04": [476, 382],
  "VIB-KLN-02": [522.8, 369.5],
  "VIB-KLN-03": [585.8, 369.8],
  "TMP-KLN-22": [522.8, 410.2],
  "TMP-KLN-23": [585.8, 410.2],
  "VIB-KLN-01": [638.5, 382],
  "TMP-KLN-19": [638.2, 408.5],
  "ELE-KLN-01": [671.2, 367],
  "TMP-KLN-21": [671.2, 396.2],
  "TMP-KLN-20": [705.8, 382],
  "SPD-KLN-01": [705.8, 408.5],
  "STS-KLN-12": [741.2, 395.5],
  // thrust (K-7), shell scanner (K-8)
  "POS-KLN-01": [930.8, 390.2],
  "POS-KLN-02": [963.2, 400.2],
  "PRS-KLN-07": [932, 445],
  "STS-KLN-08": [995.5, 384],
  "CAL-KLN-03": [995.5, 475],
  "MAN-KLN-01": [1055, 418.5],
  // outlet and hood (K-9)
  "TMP-KLN-26": [1281, 229.5],
  "TMP-KLN-25": [1262.5, 388.2],
  "TMP-KLN-14": [1418, 140],
  "TMP-KLN-27": [1471.8, 195],
  "PRS-KLN-03": [1471.8, 357.8],
  // station 1 plan (K-6)
  "TMP-KLN-01": [103, 581.2],
  "TMP-KLN-02": [334.8, 581.2],
  "TMP-KLN-03": [103, 690.8],
  "TMP-KLN-04": [334.8, 690.8],
  "LEV-KLN-02": [171, 556.8],
  "LEV-KLN-03": [171, 713.5],
  // gearbox lube skid (K-4)
  "FLO-KLN-05": [552.2, 510],
  "PRS-KLN-04": [552.2, 540.8],
  "PRS-KLN-05": [586.8, 621.8],
  "TMP-KLN-15": [415.2, 632.2],
  "LEV-KLN-01": [486.2, 693],
  "LAB-KLN-01": [404, 701],
  // aux drive (K-3)
  "STS-KLN-11": [706.8, 613.8],
  "LIM-KLN-01": [659.5, 641],
  // spray lube (K-5)
  "STS-KLN-05": [814.2, 588.5],
  "PRX-KLN-01": [872.5, 695],
  "PRX-KLN-02": [886.7, 695],
  "PRX-KLN-03": [900.9, 695],
  "PRX-KLN-04": [915.1, 695],
  "PRX-KLN-05": [929.3, 695],
  "PRX-KLN-06": [943.5, 695],
  // station 2 plan (K-6)
  "TMP-KLN-05": [1007.2, 581.2],
  "TMP-KLN-06": [1239.2, 581.2],
  "TMP-KLN-07": [1007.2, 690.8],
  "TMP-KLN-08": [1239.2, 690.8],
  "LEV-KLN-04": [1075.5, 556.8],
  "LEV-KLN-05": [1075.5, 713.5],
  // station 3 plan (K-6)
  "TMP-KLN-09": [1316.5, 581.2],
  "TMP-KLN-10": [1548, 581.2],
  "TMP-KLN-11": [1316.5, 690.8],
  "TMP-KLN-12": [1548, 690.8],
  "LEV-KLN-06": [1384.5, 556.8],
  "LEV-KLN-07": [1384.5, 713.5],
};

/** Value-block slot per point: [x, y, anchor] (see LineSheetArt.callouts). */
const callouts: LineSheetArt["callouts"] = {
  // analyser: one column right of the box, rows in pad order
  "GAS-KLN-01": [452, 14, "start"],
  "GAS-KLN-02": [300, 90, "middle"],
  "GAS-KLN-03": [372, 190, "middle"],
  "STS-KLN-06": [452, 101, "start"],
  "CAL-KLN-06": [452, 162, "start"],
  "TMP-KLN-13": [140, 246, "end"],
  "PRS-KLN-01": [160, 418.5, "start"],
  // tyres
  "MIG-KLN-01": [359, 228, "end"],
  "MIG-KLN-02": [812, 228, "start"],
  "MIG-KLN-03": [1100, 198, "start"],
  "TMP-KLN-28": [370, 309, "end"],
  "TMP-KLN-29": [785, 309, "end"],
  "TMP-KLN-30": [1125, 309, "start"],
  "STS-KLN-13": [990, 160, "start"],
  // main drive: row A between shell and drive, three over the shell, rows F / B / C below
  "VIB-KLN-02": [535, 342, "end"],
  "TMP-KLN-20": [694, 342, "start"],
  "VIB-KLN-03": [574, 184, "start"],
  "VIB-KLN-01": [627, 210, "start"],
  "ELE-KLN-01": [660, 236, "start"],
  "VIB-KLN-04": [462, 409, "end"],
  "SPD-KLN-01": [694, 438, "start"],
  "STS-KLN-12": [760, 395.5, "start"],
  "TMP-KLN-22": [535, 438, "end"],
  "TMP-KLN-21": [660, 469, "start"],
  "TMP-KLN-23": [600, 438, "end"],
  "TMP-KLN-19": [650, 469, "end"],
  // thrust and scanner
  "POS-KLN-01": [945, 342, "end"],
  "STS-KLN-08": [990, 342, "start"],
  "POS-KLN-02": [982, 469, "end"],
  "PRS-KLN-07": [980, 469, "end"],
  "MAN-KLN-01": [1068, 442, "start"],
  "CAL-KLN-03": [1012, 475, "start"],
  // outlet and hood
  "TMP-KLN-26": [1290, 229.5, "start"],
  "TMP-KLN-25": [1250, 388, "end"],
  "TMP-KLN-14": [1418, 109, "middle"],
  "TMP-KLN-27": [1490, 195, "start"],
  "PRS-KLN-03": [1490, 358, "start"],
  // station plans: bearing columns at the panel edges, oil baths right of the tyre
  "TMP-KLN-01": [87, 613, "start"],
  "TMP-KLN-03": [87, 660, "start"],
  "TMP-KLN-02": [351, 613, "end"],
  "TMP-KLN-04": [351, 660, "end"],
  "LEV-KLN-02": [150, 556.8, "end"],
  "LEV-KLN-03": [150, 713.5, "end"],
  "TMP-KLN-05": [991, 613, "start"],
  "TMP-KLN-07": [991, 660, "start"],
  "TMP-KLN-06": [1255, 613, "end"],
  "TMP-KLN-08": [1255, 660, "end"],
  "LEV-KLN-04": [1055, 556.8, "end"],
  "LEV-KLN-05": [1090, 713.5, "start"],
  "TMP-KLN-09": [1300.5, 613, "start"],
  "TMP-KLN-11": [1300.5, 660, "start"],
  "TMP-KLN-10": [1564, 613, "end"],
  "TMP-KLN-12": [1564, 660, "end"],
  "LEV-KLN-06": [1364, 556.8, "end"],
  "LEV-KLN-07": [1364, 713.5, "end"],
  // lube skid
  "FLO-KLN-05": [540, 510, "end"],
  "PRS-KLN-04": [540, 540.8, "end"],
  "TMP-KLN-15": [400, 632.2, "end"],
  "PRS-KLN-05": [600, 556, "start"],
  "LEV-KLN-01": [470, 747, "start"],
  "LAB-KLN-01": [425, 747, "end"],
  // aux drive
  "STS-KLN-11": [706, 590, "middle"],
  "LIM-KLN-01": [640, 641, "end"],
  // spray lube: controller above, circuits fanned out below the divider block
  "STS-KLN-05": [814, 556, "middle"],
  "PRX-KLN-01": [862, 712, "end"],
  "PRX-KLN-02": [862, 738, "end"],
  "PRX-KLN-03": [862, 764, "end"],
  "PRX-KLN-06": [954, 738, "start"],
  "PRX-KLN-05": [954, 764, "start"],
  "PRX-KLN-04": [915, 622, "middle"],
};

export const sheet: LineSheetArt = { id: "K-0", ready: true, width: W, height: H, Art, pads, callouts };
