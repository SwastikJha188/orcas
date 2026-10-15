/**
 * Sheet B-1 — BRN-01 · Main burner — Burner and air streams.
 * Composed as PDF page 24: kiln nose and outlet hood (refractory, inspection
 * doors, roof flame camera with its purged sight tube, secondary-air
 * thermocouple, throat from the cooler) on the left; the multi-channel burner
 * in longitudinal section (axial jet / swirl / coal / centre pipe, refractory
 * jacket at the hot end, tip ring with swirl vanes) on its carriage rail; the
 * burner manifold with primary-air header, swirl and axial branches and the
 * coal + conveying-air line on the right.
 */
import React from "react";
import { Bolt, CornerBolts, GroundLine, Housing, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Flange, FlowArrow, Pipe, Transmitter } from "../../drawings/clk-parts";
import { Brick } from "../../sheets/sa-parts";
import type { LineSheetArt } from "../types";
import { ButterflyValve, CoalPipe, HandwheelEdge, TapBoss } from "./parts-b";

const W = 824;
const H = 704;
const GROUND = 660;

/* Burner section geometry (axis at YC). */
const YC = 323;
const TIP = 120;
const MAN = { x: 570, y: 240, w: 113, h: 165 };
/** Channel bands from the axis outward: [inner, outer] half-heights. */
const CENTRE: [number, number] = [0, 8];
const COAL: [number, number] = [10, 25];
const SWIRL: [number, number] = [27, 42];
const AXIAL: [number, number] = [44, 61];
const SHELL = 65;

/* Primary-air pipework (centre lines). */
const HDR_X = 720;
const HDR_Y = 105;
const SWIRL_X = 645.5;
const SWIRL_Y = 185;
const AX_Y = 226;
const AX_X = 680;
const COAL_X = 627;
const COAL_Y = 465;

function bands(r: [number, number]) {
  return [
    { y: YC - r[1], h: r[1] - r[0] },
    { y: YC + r[0], h: r[1] - r[0] },
  ];
}

/** Kiln nose, outlet hood, camera, thermocouple, throat. */
function Hood() {
  return (
    <g>
      {/* kiln nose entering the hood */}
      <rect x={2} y={208} width={34} height={230} rx={4} {...PAINT.cylinder} />
      <rect x={2} y={222} width={28} height={202} rx={3} {...PAINT.recess} />
      <path d="M 3 404 Q 16 398 30 401 L 30 423 L 3 423 Z" fill={MX.material} opacity={0.7} />
      <rect x={30} y={198} width={12} height={250} rx={3} {...PAINT.cylinderV} />
      {[214, 262, 384, 432].map((y) => (
        <Bolt key={y} x={36} y={y} r={1.6} />
      ))}

      {/* hood steel supports */}
      {[40, 200].map((x) => (
        <g key={x}>
          <rect x={x} y={585} width={11} height={GROUND - 585 - 4} rx={1.5} {...PAINT.body} />
          <rect x={x - 5} y={GROUND - 6} width={21} height={6} rx={1.5} {...PAINT.raised} />
        </g>
      ))}
      {/* throat to the cooler, secondary air rising */}
      <rect x={100} y={583} width={96} height={20} rx={3} {...PAINT.body} />
      <rect x={97} y={600} width={102} height={6} rx={2} {...PAINT.raised} />
      {[104, 132, 164, 192].map((x) => (
        <Bolt key={x} x={x} y={603} r={1.3} />
      ))}

      {/* hood casing */}
      <Housing x={42} y={135} w={176} h={450} rx={12} bolts={false} />
      {/* refractory lining, open where the kiln nose enters */}
      <Brick x={48} y={142} w={18} h={58} row={7} course={9} />
      <Brick x={48} y={446} w={18} h={133} row={7} course={9} />
      <rect x={48} y={141} width={164} height={10} rx={2} {...PAINT.recess} />
      <Brick x={70} y={142} w={140} h={9} row={9} course={14} />

      {/* inspection doors */}
      {[158, 432].map((y) => (
        <g key={y}>
          <rect x={150} y={y} width={52} height={64} rx={5} {...PAINT.raised} />
          <rect x={158} y={y + 9} width={36} height={18} rx={2} {...PAINT.recess} />
          <line x1={196} x2={196} y1={y + 34} y2={y + 54} stroke={MX.edge} strokeWidth={1.8} strokeLinecap="round" />
          <CornerBolts x={150} y={y} w={52} h={64} inset={4} r={1.2} />
        </g>
      ))}

      {/* sight tube through the roof: isolating gate, purge collar, camera */}
      <rect x={103} y={62} width={12} height={75} rx={2} {...PAINT.shaft} />
      <rect x={96} y={128} width={26} height={8} rx={2} {...PAINT.raised} />
      <rect x={94} y={92} width={30} height={16} rx={3} {...PAINT.body} />
      <rect x={124} y={96} width={12} height={8} rx={1.5} {...PAINT.raised} />
      <line x1={136} y1={100} x2={146} y2={100} stroke={MX.edge} strokeWidth={1.6} strokeLinecap="round" />
      <rect x={98} y={78} width={22} height={8} rx={2} {...PAINT.raised} />
      <Pipe pts={[[120, 82], [142, 82], [142, 66]]} w={5} />
      <rect x={83} y={30} width={53} height={34} rx={6} {...PAINT.body} />
      <rect x={88} y={35} width={43} height={24} rx={4} fill="none" stroke={MX.fine} strokeWidth={MX.wFine} />
      {[88.5, 92, 126, 129.5].map((x) => (
        <line key={x} x1={x} x2={x} y1={38} y2={56} stroke={MX.fine} strokeWidth={0.8} />
      ))}
      <circle cx={109} cy={47} r={9} {...PAINT.recess} />
      <rect x={95} y={23} width={28} height={7} rx={2} {...PAINT.raised} />
      <line x1={109} y1={137} x2={56} y2={312} stroke={MX.fine} strokeWidth={1} strokeDasharray="3 3" />

      {/* secondary-air thermocouple through the hood floor */}
      <rect x={81} y={557} width={4} height={36} {...PAINT.shaft} />
      <rect x={76} y={551} width={14} height={12} rx={3} {...PAINT.raised} />
      <rect x={75} y={593} width={16} height={11} rx={2.5} {...PAINT.raised} />
      {[124, 173].map((x) => (
        <FlowArrow key={x} x1={x} y1={648} x2={x} y2={588} />
      ))}
    </g>
  );
}

/** Flame from the burner tip into the kiln. */
function Flame() {
  return (
    <g>
      <ellipse cx={58} cy={YC} rx={64} ry={34} fill={MX.heat} />
      <ellipse cx={70} cy={YC} rx={50} ry={22} fill={MX.heat} />
      <ellipse cx={78} cy={YC} rx={40} ry={13} fill={MX.material} opacity={0.5} />
      <ellipse cx={96} cy={YC} rx={18} ry={5} fill={MX.material} opacity={0.6} />
    </g>
  );
}

/** Multi-channel burner in longitudinal section. */
function Burner() {
  const x0 = TIP;
  const x1 = MAN.x;
  const len = x1 - x0;
  const gap = [268, 402];
  const runs = (y: number, n: number, dash: string, key: string) =>
    Array.from({ length: n }).map((_, i) => (
      <g key={`${key}${i}`}>
        <line x1={x0 + 30} x2={gap[0]} y1={y + i * 5} y2={y + i * 5} stroke={MX.fine} strokeWidth={0.8} strokeDasharray={dash} />
        <line x1={gap[1]} x2={x1 - 8} y1={y + i * 5} y2={y + i * 5} stroke={MX.fine} strokeWidth={0.8} strokeDasharray={dash} />
      </g>
    ));
  const helix: React.ReactNode[] = [];
  for (let x = x0 + 34; x < x1 - 10; x += 12) {
    if (x > gap[0] - 6 && x < gap[1]) continue;
    for (const b of bands(SWIRL)) helix.push(<line key={`${x}-${b.y}`} x1={x} y1={b.y + b.h - 2} x2={x + 7} y2={b.y + 2} stroke={MX.fine} strokeWidth={0.8} />);
  }
  const coal: React.ReactNode[] = [];
  for (let x = x0 + 30, i = 0; x < x1 - 8; x += 7, i++) {
    if (x > gap[0] && x < gap[1]) continue;
    for (const b of bands(COAL)) coal.push(<circle key={`${x}-${b.y}`} cx={x} cy={b.y + 4 + ((i * 5) % 8)} r={1.1} fill={MX.material} />);
  }
  return (
    <g>
      {/* carriage rail hung from the hood and its two trolleys */}
      <rect x={218} y={399} width={350} height={6} rx={1.5} {...PAINT.body} />
      <path d="M 226 405 L 242 405 L 226 411 Z" {...PAINT.body} />
      {[300, 500].map((x) => (
        <g key={x}>
          <rect x={x - 18} y={YC + SHELL + 1} width={36} height={5} rx={1.5} {...PAINT.raised} />
          {[x - 10, x + 10].map((wx) => (
            <g key={wx}>
              <circle cx={wx} cy={YC + SHELL + 8} r={3.2} {...PAINT.shaft} stroke={MX.edge} strokeWidth={0.8} />
              <circle cx={wx} cy={YC + SHELL + 8} r={1} fill={MX.deep} />
            </g>
          ))}
        </g>
      ))}

      {/* outer shell */}
      <rect x={x0} y={YC - SHELL} width={len} height={SHELL * 2} rx={5} {...PAINT.cylinder} />
      {/* channels */}
      {bands(AXIAL).map((b) => (
        <rect key={`a${b.y}`} x={x0 + 8} y={b.y} width={len - 8} height={b.h} fill={MX.deep} />
      ))}
      {bands(SWIRL).map((b) => (
        <rect key={`s${b.y}`} x={x0 + 8} y={b.y} width={len - 8} height={b.h} fill={MX.deep} />
      ))}
      {bands(COAL).map((b) => (
        <g key={`c${b.y}`}>
          <rect x={x0 + 8} y={b.y} width={len - 8} height={b.h} fill={MX.deep} />
          <rect x={x0 + 8} y={b.y} width={len - 8} height={b.h} fill={MX.material} opacity={0.22} />
        </g>
      ))}
      <rect x={x0 + 4} y={YC - CENTRE[1]} width={len - 4} height={CENTRE[1] * 2} fill={MX.deep} />
      {/* tube walls between channels */}
      {[AXIAL[0], SWIRL[0], COAL[0]].map((r) =>
        [-1, 1].map((s) => <rect key={`${r}${s}`} x={x0 + 2} y={s < 0 ? YC - r : YC + r - 2} width={len - 2} height={2} {...PAINT.shaft} />),
      )}
      {runs(YC - AXIAL[1] + 4, 3, "10 6", "at")}
      {runs(YC + AXIAL[0] + 4, 3, "10 6", "ab")}
      {helix}
      {coal}

      {/* tip ring, swirl vanes, flame stabiliser */}
      <path d={`M ${x0 + 2} ${YC - SHELL - 2} L ${x0 + 12} ${YC - SHELL - 2} L ${x0 + 12} ${YC + SHELL + 2} L ${x0 + 2} ${YC + SHELL + 2} Z`} {...PAINT.raised} />
      {bands(AXIAL).map((b) => (
        <rect key={`n${b.y}`} x={x0 + 4} y={b.y + 4} width={6} height={b.h - 8} rx={1} {...PAINT.recess} />
      ))}
      {bands(SWIRL).map((b) =>
        [16, 24, 32].map((dx) => <line key={`v${b.y}${dx}`} x1={x0 + dx} y1={b.y + b.h} x2={x0 + dx + 6} y2={b.y} stroke={MX.edge} strokeWidth={1.4} />),
      )}
      <rect x={x0 - 4} y={YC - 12} width={6} height={24} rx={1.5} {...PAINT.shaft} />

      {/* refractory jacket over the hot end inside the hood */}
      <Brick x={x0 + 14} y={YC - SHELL - 8} w={84} h={9} row={9} course={12} />
      <Brick x={x0 + 14} y={YC + SHELL - 1} w={84} h={9} row={9} course={12} />
      {/* hood wall sleeve and seal plate */}
      <rect x={212} y={YC - SHELL - 12} width={14} height={SHELL * 2 + 24} rx={3} {...PAINT.raised} />
      <Bolt x={219} y={YC - SHELL - 6} r={1.5} />
      <Bolt x={219} y={YC + SHELL + 6} r={1.5} />
      {/* shell flange rings */}
      {[450, MAN.x - 6].map((x) => (
        <g key={x}>
          <rect x={x - 3} y={YC - SHELL - 4} width={6} height={SHELL * 2 + 8} rx={1.5} {...PAINT.raised} />
          <Bolt x={x} y={YC - SHELL - 1} r={1.1} />
          <Bolt x={x} y={YC + SHELL + 1} r={1.1} />
        </g>
      ))}
    </g>
  );
}

/** Burner manifold, primary-air header and branches, coal line. */
function Manifold() {
  return (
    <g>
      {/* coal + conveying air from the blower */}
      <CoalPipe pts={[[798, COAL_Y], [COAL_X, COAL_Y], [COAL_X, MAN.y + MAN.h - 4]]} w={15} />
      <Flange x={COAL_X} y={MAN.y + MAN.h + 6} w={15} vertical />
      <Flange x={700} y={COAL_Y} w={15} />
      <FlowArrow x1={814} y1={COAL_Y} x2={802} y2={COAL_Y} />

      {/* primary-air header and branches */}
      <Pipe pts={[[800, HDR_Y], [HDR_X, HDR_Y], [HDR_X, AX_Y], [AX_X, AX_Y], [AX_X, MAN.y + 4]]} w={15} />
      <Pipe pts={[[HDR_X, SWIRL_Y], [SWIRL_X, SWIRL_Y], [SWIRL_X, MAN.y + 4]]} w={15} />
      <Flange x={778} y={HDR_Y} w={15} />
      <Flange x={HDR_X} y={150} w={15} vertical />
      <Flange x={SWIRL_X} y={MAN.y - 3} w={15} vertical />
      <Flange x={AX_X} y={MAN.y - 3} w={15} vertical />
      <ButterflyValve x={688} y={SWIRL_Y} w={15} />
      <ButterflyValve x={HDR_X} y={205} w={15} vertical />
      <TapBoss x={SWIRL_X} y={218} />
      <TapBoss x={698} y={AX_Y} />
      <Transmitter x={HDR_X + 7} y={135.5} dir="right" len={23} />
      <FlowArrow x1={818} y1={HDR_Y} x2={804} y2={HDR_Y} />

      {/* manifold body */}
      <Housing x={MAN.x} y={MAN.y} w={MAN.w} h={MAN.h} rx={12} />
      <rect x={MAN.x + 18} y={MAN.y + 26} width={MAN.w - 36} height={30} rx={3} {...PAINT.recess} />
      {[0, 1].map((i) => {
        const cx = MAN.x + 40 + i * 34;
        return (
          <g key={i}>
            <circle cx={cx} cy={MAN.y + 41} r={10} {...PAINT.raised} />
            <circle cx={cx} cy={MAN.y + 41} r={7} fill={MX.deep} />
            <line x1={cx} y1={MAN.y + 41} x2={cx + 4} y2={MAN.y + 36} stroke={MX.metalHi} strokeWidth={1.2} strokeLinecap="round" />
          </g>
        );
      })}
      {/* stacked chambers: axial / swirl over the coal inlet chamber */}
      {[MAN.y + 76, MAN.y + 112].map((y) => (
        <g key={y}>
          <line x1={MAN.x + 1} x2={MAN.x + MAN.w - 1} y1={y} y2={y} stroke={MX.edge} strokeWidth={1.4} />
          <line x1={MAN.x + 6} x2={MAN.x + MAN.w - 6} y1={y + 3} y2={y + 3} stroke={MX.fine} strokeWidth={0.8} />
          {[18, 40, 62, 84, 100].map((dx) => (
            <Bolt key={dx} x={MAN.x + dx} y={y - 4} r={1.2} />
          ))}
        </g>
      ))}
      <rect x={MAN.x + 14} y={MAN.y + 86} width={MAN.w - 28} height={16} rx={2} {...PAINT.recess} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line key={i} x1={MAN.x + 20 + i * 13} x2={MAN.x + 26 + i * 13} y1={MAN.y + 99} y2={MAN.y + 89} stroke={MX.fine} strokeWidth={0.8} />
      ))}
      <rect x={MAN.x + 22} y={MAN.y + 128} width={50} height={18} rx={2} {...PAINT.recess} />
      <line x1={MAN.x + 27} x2={MAN.x + 67} y1={MAN.y + 134} y2={MAN.y + 134} stroke={MX.fine} strokeWidth={0.8} />
      <line x1={MAN.x + 27} x2={MAN.x + 57} y1={MAN.y + 140} y2={MAN.y + 140} stroke={MX.fine} strokeWidth={0.8} />
      {/* centre-pipe adjustment spindle and handwheel */}
      <rect x={MAN.x + MAN.w} y={YC - 3} width={16} height={6} {...PAINT.shaft} />
      <HandwheelEdge x={MAN.x + MAN.w + 18} y={YC} r={22} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22} x2={804} y={GROUND} />
      <Hood />
      <Flame />
      <Burner />
      <Manifold />

      <MachineLabel x={124} y={126.2} anchor="start" size={9}>
        KILN HOOD
      </MachineLabel>
      <MachineLabel x={150.5} y={81.6} anchor="start" size={8.2}>
        FLAME CAMERA (PURGED SIGHT PORT)
      </MachineLabel>
      <MachineLabel x={337.5} y={271.8} size={7.9}>
        AXIAL (JET) AIR
      </MachineLabel>
      <MachineLabel x={337.5} y={289.3} size={7.9}>
        SWIRL (HELICAL) AIR
      </MachineLabel>
      <MachineLabel x={337.5} y={305.8} size={7.9}>
        COAL + CONVEYING AIR
      </MachineLabel>
      <MachineLabel x={337.5} y={324.7} size={7.1}>
        CENTRE PIPE
      </MachineLabel>
      <MachineLabel x={636} y={233} anchor="end" size={8.2}>
        BURNER MANIFOLD
      </MachineLabel>
      <MachineLabel x={698.4} y={91.7} anchor="end" size={9}>
        FROM PRIMARY-AIR FAN (B-2)
      </MachineLabel>
      <MachineLabel x={597.5} y={171.6} anchor="start" size={8.2}>
        SWIRL
      </MachineLabel>
      <MachineLabel x={743} y={233.1} anchor="start" size={8.2}>
        AXIAL
      </MachineLabel>
      <MachineLabel x={796} y={491} anchor="end" size={9}>
        COAL + CONVEYING AIR FROM BLOWER (B-4)
      </MachineLabel>
      <MachineLabel x={222} y={636.2} anchor="start" size={9}>
        SECONDARY AIR FROM COOLER
      </MachineLabel>
      <MachineLabel x={382} y={418.7} size={9}>
        MULTI-CHANNEL BURNER (LONGITUDINAL SECTION)
      </MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 24. */
const pads: LineSheetArt["pads"] = {
  "CAM-BRN-01": [109, 47],
  "PRS-BRN-03": [750.5, 135.5],
  "PRS-BRN-01": [645.5, 218],
  "PRS-BRN-02": [698, 226],
  "TMP-BRN-02": [83, 557],
};

/** Tag chip centre per point, as on PDF page 24. */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "CAM-BRN-01": [180, 24.5],
  "PRS-BRN-03": [785, 165],
  "PRS-BRN-01": [522, 128],
  "PRS-BRN-02": [761, 278],
  "TMP-BRN-02": [161, 527],
};

export const sheet: LineSheetArt = { id: "B-1", ready: true, width: W, height: H, Art, pads, chips };
