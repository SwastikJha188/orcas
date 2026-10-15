/**
 * Sheet D01 — FSL-01 + KFS-01 · Feed silo & kiln feed system.
 *
 * Composition of PDF page 1, left → right: aeration blower (bottom left) and
 * aeration header rising to the raw-meal feed silo on its steel frame; the
 * silo extraction gate and air slide down to the kiln feed bin (weigh bin on
 * load cells); dosing gate and air slide to the solid-flow meter (SFM); SFM
 * into the bucket elevator boot; elevator head with head drive (gearbox,
 * motor) and the discharge spout "TO PREHEATER".
 */
import React from "react";
import { CornerBolts, MX, MachineLabel, Motor, PAINT } from "../../machine-kit/machine-kit";
import { AirSlide, Brace, Cabinet, Handrail, Ladder, MirrorX, Pipe, Steel, Tube, Volute } from "../drawings/fkp-parts";
import type { PyroSheetDrawing, SheetCalloutAnchor } from "./sheet-types";
import { FlowTag, Gearbox, LoadCell, Plinth, Radar, WallSwitch, sheetMap } from "./sa-parts";

const W = 880;
const H = 590;
const { X, Y, P, R, B } = sheetMap(0.58, 40, 100);

/* ---------------------------------------------------------------- feed silo */
const SL = X(262);
const SRt = X(495);
const SCX = X(379);
const S_TOP = Y(215);
const S_BOT = Y(495);
const S_OUT = Y(595);
const S_OUTH = 11;

function FeedSilo() {
  const legs = [X(278), X(470)];
  const frameBot = Y(660);
  const rings = [260, 305, 350, 395, 440].map(Y);
  return (
    <g>
      {/* access ladder (left) */}
      <Ladder x={X(236)} y1={Y(204)} y2={frameBot} w={9} />
      {/* steel support frame, legs behind the cone */}
      {legs.map((x) => (
        <Steel key={x} x={x} y={S_BOT} w={7} h={frameBot - S_BOT} />
      ))}
      <Brace x1={legs[0] + 7} y1={Y(578)} x2={legs[1]} y2={frameBot - 2} />
      {/* cone */}
      <path d={`M ${SL} ${S_BOT} L ${SRt} ${S_BOT} L ${SCX + S_OUTH} ${S_OUT} L ${SCX - S_OUTH} ${S_OUT} Z`} {...PAINT.cylinderV} />
      <line x1={SL + 30} y1={S_BOT + 3} x2={SCX - 5} y2={S_OUT - 3} {...PAINT.hair} />
      <line x1={SRt - 30} y1={S_BOT + 3} x2={SCX + 5} y2={S_OUT - 3} {...PAINT.hair} />
      {/* frame beams in front of the cone */}
      <Steel x={legs[0] - 3} y={Y(566)} w={legs[1] - legs[0] + 13} h={5} />
      <rect x={X(250)} y={frameBot} width={X(492) - X(250)} height={7} rx={1.5} {...PAINT.body} />
      {/* shell with ring seams */}
      <rect x={SL} y={S_TOP} width={SRt - SL} height={S_BOT - S_TOP} rx={2} {...PAINT.cylinderV} />
      {rings.map((y) => (
        <line key={y} x1={SL + 1.5} x2={SRt - 1.5} y1={y} y2={y} stroke={MX.fine} strokeWidth={1} />
      ))}
      <rect x={SL - 4} y={S_BOT - 4} width={SRt - SL + 8} height={8} rx={2} {...PAINT.raised} />
      {/* conical roof with handrail and radar */}
      <path d={`M ${SL - 3} ${S_TOP + 1} L ${SCX} ${Y(201)} L ${SRt + 3} ${S_TOP + 1} Z`} {...PAINT.raised} />
      <Handrail x1={SL + 1} x2={SRt - 1} y={S_TOP - 1} h={12} step={15} />
      <Radar x={SCX} y={Y(201)} h={12} />
      {/* bottom extraction gate with actuator */}
      <rect x={SCX - S_OUTH - 3} y={S_OUT} width={2 * S_OUTH + 6} height={4} rx={1.5} {...PAINT.raised} />
      <rect {...R(361, 607, 399, 640)} rx={4} {...PAINT.body} />
      <CornerBolts {...B(361, 607, 399, 640)} inset={3.5} r={1.2} />
      <rect {...R(399, 613, 420, 632)} rx={2.5} {...PAINT.raised} />
      <rect x={X(404)} y={Y(618)} width={6} height={4} rx={1} {...PAINT.recess} />
      <rect {...R(366, 640, 394, 652)} rx={1.5} {...PAINT.body} />
    </g>
  );
}

/* ---------------------------------------------------------------- aeration blower + header */
const HDR_X = 104;
/** Blower control cabinet beside the blower skid (sheet units). */
const BLOWER_CAB = { x: X(306), y: Y(968), w: 28, h: Y(1059) - Y(968) };

function AerationBlower() {
  const cx = X(244);
  const cy = Y(1018);
  const r = 22;
  return (
    <g>
      {/* blower skid */}
      <Plinth x={X(48)} y={Y(1050)} w={X(292) - X(48)} h={9} />
      {/* motor, shaft to the blower */}
      <rect x={X(80)} y={Y(1045)} width={10} height={Y(1050) - Y(1045)} {...PAINT.body} />
      <rect x={X(150)} y={Y(1045)} width={10} height={Y(1050) - Y(1045)} {...PAINT.body} />
      <Motor x={X(68)} y={Y(990)} w={64} h={Y(1045) - Y(990)} />
      <rect x={X(178)} y={cy - 3} width={cx - X(178)} height={6} {...PAINT.shaft} />
      {/* blower volute, outlet up into the header */}
      <path d={`M ${cx - r * 0.7} ${cy + r * 0.5} L ${cx + r * 0.7} ${cy + r * 0.5} L ${cx + r * 0.9} ${Y(1050)} L ${cx - r * 0.9} ${Y(1050)} Z`} {...PAINT.body} />
      <Volute cx={cx} cy={cy} r={r} outH={8} dir={-1} rotor={false} />
      {/* aeration header: blower → riser → fluidising pads under the silo cone */}
      <Pipe
        pts={[
          [HDR_X, cy - r - 8],
          [HDR_X, Y(570)],
          [X(330), Y(570)],
        ]}
        d={9}
        flanges={[[HDR_X, Y(880)]]}
      />
      <rect x={X(330)} y={Y(570) - 7} width={5} height={14} rx={1.5} {...PAINT.raised} />
      {/* blower control cabinet (duty / standby run feedback, D4 F-P08), cable tray to the blower */}
      <line x1={cx + r * 0.9} y1={Y(1046)} x2={BLOWER_CAB.x} y2={Y(1046)} stroke={MX.edge} strokeWidth={2} strokeLinecap="round" />
      <Cabinet x={BLOWER_CAB.x} y={BLOWER_CAB.y} w={BLOWER_CAB.w} h={BLOWER_CAB.h} louvres={false} />
    </g>
  );
}

/* ---------------------------------------------------------------- kiln feed bin (weigh bin) */
const BL = X(682);
const BRt = X(884);
const BCX = X(783);
const B_TOP = Y(700);
const B_RIB = Y(790);
const B_OUT = Y(872);
const B_OUTH = 9;
const binConeX = (y: number) => BRt - ((BRt - BCX - B_OUTH) * (y - B_RIB)) / (B_OUT - B_RIB);

function FeedBin() {
  const legs = [X(700), X(856)];
  const base = Y(955);
  return (
    <g>
      {/* weigh frame */}
      {legs.map((x) => (
        <Steel key={x} x={x} y={B_RIB} w={7} h={base - B_RIB} />
      ))}
      <Brace x1={legs[0] + 7} y1={Y(860)} x2={legs[1]} y2={base - 2} />
      <rect x={legs[0] - 6} y={base - 4} width={legs[1] - legs[0] + 19} height={5} rx={1.5} {...PAINT.body} />
      {legs.map((x) => (
        <LoadCell key={`lc${x}`} x={x + 3.5} y={base + 1} />
      ))}
      {/* cone */}
      <path d={`M ${BL} ${B_RIB} L ${BRt} ${B_RIB} L ${BCX + B_OUTH} ${B_OUT} L ${BCX - B_OUTH} ${B_OUT} Z`} {...PAINT.cylinderV} />
      <Steel x={legs[0] - 3} y={Y(852)} w={legs[1] - legs[0] + 13} h={5} />
      {/* shell: ribbed (stiffened) upper course */}
      <rect x={BL} y={B_TOP} width={BRt - BL} height={B_RIB - B_TOP} rx={2} {...PAINT.cylinderV} />
      {[712, 724, 736, 748, 760, 772].map((py) => (
        <line key={py} x1={BL + 1.5} x2={BRt - 1.5} y1={Y(py)} y2={Y(py)} stroke={MX.fine} strokeWidth={0.9} />
      ))}
      <rect x={BL - 3} y={B_RIB - 3} width={BRt - BL + 6} height={6} rx={2} {...PAINT.raised} />
      {/* flat roof with rim, radar, inlet chute */}
      <rect x={BL - 4} y={B_TOP - 5} width={BRt - BL + 8} height={6} rx={2} {...PAINT.raised} />
      <Radar x={BCX} y={B_TOP - 5} h={12} />
      <rect {...R(700, 684, 724, 697)} rx={2} {...PAINT.body} />
      {/* high-level switch (sidewall) and low-level switch (cone) */}
      <WallSwitch x={BRt} y={Y(720)} dir={1} />
      <WallSwitch x={binConeX(Y(827))} y={Y(827)} dir={1} />
      {/* dosing gate with position actuator */}
      <rect x={BCX - B_OUTH - 3} y={B_OUT} width={2 * B_OUTH + 6} height={4} rx={1.5} {...PAINT.raised} />
      <rect {...R(765, 880, 801, 906)} rx={3.5} {...PAINT.body} />
      <CornerBolts {...B(765, 880, 801, 906)} inset={3.5} r={1.1} />
      <rect {...R(741, 885, 765, 901)} rx={3} {...PAINT.cylinder} />
      <rect {...R(734, 889, 742, 897)} rx={1} {...PAINT.raised} />
    </g>
  );
}

/* ---------------------------------------------------------------- bucket elevator + head drive */
const EL = X(1218);
const ER = X(1302);
const ECX = X(1260);
const E_TOP = Y(218);
const E_BOOT = Y(990);
const HEAD_CY = Y(182);

function Elevator() {
  const bands: number[] = [];
  for (let py = 255; py < 985; py += 65) bands.push(Y(py));
  return (
    <g>
      {/* casing, up-leg / down-leg inspection strips, flanged sections */}
      <rect x={EL} y={E_TOP} width={ER - EL} height={E_BOOT - E_TOP} rx={2} {...PAINT.cylinderV} />
      <rect x={ECX - 18} y={E_TOP + 6} width={13} height={E_BOOT - E_TOP - 12} rx={2} {...PAINT.recess} />
      <rect x={ECX + 5} y={E_TOP + 6} width={13} height={E_BOOT - E_TOP - 12} rx={2} {...PAINT.recess} />
      {Array.from({ length: Math.floor((E_BOOT - E_TOP - 14) / 11) }).map((_, i) => {
        const y = E_TOP + 9 + i * 11;
        return (
          <g key={i}>
            <path d={`M ${ECX - 16} ${y} h 9 l -1.5 5 h -6 Z`} fill={MX.flatRaised} stroke={MX.edge} strokeWidth={0.6} />
            <rect x={ECX - 15} y={y + 0.6} width={7} height={2} rx={0.8} fill={MX.material} />
            <path d={`M ${ECX + 7} ${y + 5} h 9 l -1.5 -5 h -6 Z`} fill={MX.flatRaised} stroke={MX.edge} strokeWidth={0.6} />
          </g>
        );
      })}
      {bands.map((y) => (
        <rect key={y} x={EL - 3} y={y - 2} width={ER - EL + 6} height={4} rx={1.2} {...PAINT.raised} />
      ))}
      {/* boot with tail pulley */}
      <rect {...R(1200, 990, 1325, 1055)} rx={6} {...PAINT.body} />
      <circle cx={ECX} cy={Y(1022)} r={11} {...PAINT.raised} />
      <circle cx={ECX} cy={Y(1022)} r={3.5} {...PAINT.shaft} />
      <CornerBolts {...B(1200, 990, 1325, 1055)} inset={5} r={1.4} />
      <Plinth x={X(1190)} y={Y(1055)} w={X(1335) - X(1190)} h={7} bolts={false} />

      {/* discharge spout toward the preheater (behind the head) */}
      <Tube x1={X(1215)} y1={Y(192)} x2={X(1120)} y2={Y(240)} d={13} paint={PAINT.cylinder} />
      <rect x={X(1112)} y={Y(232)} width={7} height={13} rx={1.5} transform={`rotate(-27 ${X(1115)} ${Y(240)})`} {...PAINT.raised} />

      {/* head hood with head pulley */}
      <rect {...R(1203, 145, 1323, 222)} rx={9} {...PAINT.body} />
      <rect {...R(1210, 152, 1316, 215)} rx={6} fill="none" stroke={MX.fine} strokeWidth={1} />
      <circle cx={ECX} cy={HEAD_CY} r={14} fill="none" stroke={MX.fine} strokeWidth={1.2} />
      <circle cx={ECX} cy={HEAD_CY} r={8} {...PAINT.raised} />
      {/* head shaft → drive-end bearing → gearbox */}
      <rect x={ECX} y={HEAD_CY - 3} width={X(1335) - ECX} height={6} {...PAINT.shaft} />
      <circle cx={ECX} cy={HEAD_CY} r={3} {...PAINT.shaft} />
      {/* head bearing block (lower right of the hood) */}
      <rect x={X(1313) - 8} y={Y(205) - 8} width={16} height={16} rx={4} {...PAINT.raised} />
      <circle cx={X(1313)} cy={Y(205)} r={3} {...PAINT.shaft} />

      {/* head drive: gearbox, motor on a base */}
      <Plinth x={X(1328)} y={Y(208)} w={X(1532) - X(1328)} h={6} bolts={false} />
      <Gearbox x={X(1330)} y={Y(150)} w={X(1392) - X(1330)} h={Y(207) - Y(150)} />
      <rect x={X(1392)} y={HEAD_CY - 2.5} width={X(1408) - X(1392)} height={5} {...PAINT.shaft} />
      <MirrorX about={(X(1410) + X(1500)) / 2}>
        <Motor x={X(1410)} y={Y(156)} w={X(1500) - X(1410)} h={Y(208) - Y(156)} />
      </MirrorX>
    </g>
  );
}

/* ---------------------------------------------------------------- slides, SFM */
function FeedLine() {
  return (
    <g>
      {/* silo gate → air slide → kiln feed bin roof */}
      <AirSlide x1={X(392)} y1={Y(655)} x2={X(712)} y2={Y(684)} d={11} />
      {/* dosing gate → air slide → solid-flow meter */}
      <rect {...R(772, 906, 794, 916)} rx={1.5} {...PAINT.body} />
      <AirSlide x1={X(778)} y1={Y(920)} x2={X(1038)} y2={Y(950)} d={12} />
      {/* air-slide aeration air connection into the air box */}
      <rect x={X(866) - 2.5} y={Y(940)} width={5} height={10} {...PAINT.shaft} />
      <rect x={X(866) - 7} y={Y(940) + 9} width={14} height={6} rx={2} {...PAINT.raised} />
      {/* solid-flow meter */}
      <rect x={X(1052)} y={Y(985)} width={6} height={Y(1055) - Y(985)} {...PAINT.body} />
      <rect x={X(1110)} y={Y(985)} width={6} height={Y(1055) - Y(985)} {...PAINT.body} />
      <Plinth x={X(1040)} y={Y(1055)} w={X(1128) - X(1040)} h={6} bolts={false} />
      <rect {...R(1035, 925, 1130, 987)} rx={6} {...PAINT.body} />
      <rect {...R(1043, 933, 1122, 979)} rx={4} fill="none" stroke={MX.fine} strokeWidth={1} />
      <CornerBolts {...B(1035, 925, 1130, 987)} inset={5} r={1.3} />
      <MachineLabel x={X(1082)} y={Y(962)} size={8} tone="ink">
        SFM
      </MachineLabel>
      {/* SFM outlet chute → elevator boot */}
      <Tube x1={X(1128)} y1={Y(970)} x2={X(1212)} y2={Y(1010)} d={11} paint={PAINT.body} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <AerationBlower />
      <FeedSilo />
      <FeedLine />
      <FeedBin />
      <Elevator />
      <FlowTag x1={X(1100)} y1={Y(243)} x2={X(1020)} y2={Y(243)} label="TO PREHEATER" lx={X(1060)} ly={Y(262)} />
      <MachineLabel x={SCX} y={Y(704)}>RAW-MEAL FEED SILO</MachineLabel>
      <MachineLabel x={X(154)} y={Y(1098)}>AERATION BLOWER</MachineLabel>
      <MachineLabel x={BCX + 6} y={Y(1000)}>KILN FEED BIN (WEIGH BIN)</MachineLabel>
      <MachineLabel x={ECX} y={Y(1088)}>BUCKET ELEVATOR</MachineLabel>
    </g>
  );
}

/** Callout boxes as on PDF page 1, next to their feature: top-left corner and width (drawing units). */
const callouts: Record<string, SheetCalloutAnchor> = {
  "LEV-FSL-01": [273.8, 11.3, 115.7],
  "STS-FSL-01": [273.9, 241.1, 101.1],
  "PRS-FSL-01": [-6, 322, 99.5],
  "ELE-FSL-01": [3.3, 432.9, 99.2],
  "STS-FSL-02": [145.9, 533.6, 82.6],
  "LEV-KFS-01": [519.9, 237.3, 93.7],
  "LEV-KFS-02": [534.1, 300.2, 88],
  "LEV-KFS-03": [536.1, 358.8, 83.9],
  "WGT-KFS-01": [249, 520.4, 99.5],
  "POS-KFS-01": [257.9, 420.3, 80],
  "PRS-KFS-01": [461.9, 540.8, 78.8],
  "PRS-KFS-02": [774.1, 444.4, 109.1],
  "FLO-KFS-01": [774.1, 499.8, 119.9],
  "SPD-KFS-01": [774.1, 291.5, 103.3],
  "TMP-KFS-01": [774, 227.2, 81.9],
  "VIB-KFS-01": [774, 166.5, 77.2],
  "ELE-KFS-01": [774, 101.2, 92.5],
};

export const sheet: PyroSheetDrawing = {
  sheet: "D01",
  width: W,
  height: H,
  Art,
  callouts,
  pads: {
    // FSL-01 feed silo + aeration
    "LEV-FSL-01": P(379, 183),
    "STS-FSL-01": P(380, 623),
    "PRS-FSL-01": [HDR_X, Y(770)],
    "ELE-FSL-01": [X(68) + 32, Y(984)],
    // run / duty-standby feedback at the blower control cabinet (D4 location), as in the FSL drawing
    "STS-FSL-02": [BLOWER_CAB.x + BLOWER_CAB.w / 2, BLOWER_CAB.y + 11],
    // KFS-01 kiln feed bin
    "LEV-KFS-01": [BCX, Y(668)],
    "LEV-KFS-02": [BRt + 13, Y(720)],
    "LEV-KFS-03": [binConeX(Y(827)) + 13, Y(827)],
    "WGT-KFS-01": [X(700) + 3.5, Y(955) + 6],
    "POS-KFS-01": P(752, 893),
    // dosing air slide + solid-flow meter
    "PRS-KFS-01": P(915, 938),
    "PRS-KFS-02": P(1128, 930),
    "FLO-KFS-01": P(1081, 984),
    // bucket elevator head drive
    "SPD-KFS-01": [ECX, HEAD_CY],
    "TMP-KFS-01": P(1313, 205),
    "VIB-KFS-01": P(1360, 168),
    "ELE-KFS-01": [(X(1410) + X(1500)) / 2, Y(146)],
  },
};
