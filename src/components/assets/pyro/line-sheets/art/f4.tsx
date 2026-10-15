/**
 * Sheet F-4 — KFS-01 · Kiln feed — Solid-flow meter.
 *
 * Composition of PDF page 6: the air slide from the dosing gate (F-3) into
 * the bolted inlet box of the impact-plate solid-flow meter; the meter body
 * with a cut-away showing the meal stream striking the inclined impact plate
 * and the plate's measuring arm out to the force cell; the body pressure tap
 * with root valve and transmitter head; the flow transmitter on its conduit
 * arm; the outlet hopper and the flanged pipe to the bucket-elevator boot
 * (F-5); the splayed support frame with tie and base plates.
 */
import React from "react";
import { Bolt, CornerBolts, GroundLine, MX, MachineLabel, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { AirSlide, Pipe, Tube } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";
import { Arrow, BoltRow } from "./parts-f";

const W = 824;
const H = 704;

const GROUND = 660;
const BODY: [number, number, number, number] = [285, 225, 203, 233];
const WIN: [number, number, number, number] = [315, 255, 143, 173];

function Frame() {
  const legs: [number, number, number, number][] = [
    [300, 452, 270, 657],
    [473, 452, 502, 657],
  ];
  return (
    <g>
      {legs.map(([x1, y1, x2, y2]) => (
        <g key={x1}>
          <Tube x1={x1} y1={y1} x2={x2} y2={y2} d={8} paint={PAINT.body} />
          <rect x={x2 - 13} y={GROUND - 4} width={26} height={4} rx={1} {...PAINT.raised} />
          <Bolt x={x2 - 8} y={GROUND - 2} r={1} />
          <Bolt x={x2 + 8} y={GROUND - 2} r={1} />
        </g>
      ))}
      <rect x={281} y={597} width={211} height={6} rx={1.5} {...PAINT.body} />
      <line x1={292} y1={508} x2={479} y2={597} stroke={MX.fine} strokeWidth={2} />
      <line x1={481} y1={508} x2={292} y2={597} stroke={MX.fine} strokeWidth={2} />
    </g>
  );
}

/** Falling meal: brass dashes (rects, so the material gradient has a box). */
function stream(x: number, y1: number, y2: number) {
  const dashes: React.ReactNode[] = [];
  for (let y = y1; y < y2 - 2; y += 8) dashes.push(<rect key={y} x={x - 1.3} y={y} width={2.6} height={Math.min(5, y2 - y)} rx={1.2} {...PAINT.material} />);
  return <g key={`s${x}`}>{dashes}</g>;
}

function Meter() {
  const [x, y, w, h] = BODY;
  const [wx, wy, ww, wh] = WIN;
  return (
    <g>
      {/* outlet hopper and pipe to the elevator boot */}
      <Pipe
        pts={[
          [387, 512],
          [387, 578],
          [735, 578],
        ]}
        d={18}
        flanges={[
          [387, 530],
          [560, 578],
          [735, 578],
        ]}
      />
      <path d="M 330 458 H 443 L 421 510 H 353 Z" {...PAINT.cylinderV} />
      <rect x={349} y={508} width={76} height={6} rx={1.5} {...PAINT.raised} />
      <rect x={378} y={482} width={18} height={14} rx={2} {...PAINT.recess} />

      {/* inlet box with bolted lid */}
      <rect x={308} y={177} width={113} height={50} rx={6} {...PAINT.body} />
      <rect x={304} y={172} width={121} height={7} rx={2} {...PAINT.raised} />
      <BoltRow x1={310} x2={419} y={175.5} n={8} r={1} />
      <line x1={314} x2={415} y1={204} y2={204} {...PAINT.hair} />
      <rect x={398} y={160} width={14} height={12} rx={2} {...PAINT.cylinderV} />
      <rect x={395} y={157} width={20} height={4} rx={1.2} {...PAINT.raised} />

      {/* body */}
      <rect x={x} y={y} width={w} height={h} rx={12} {...PAINT.body} />
      <rect x={x + 7} y={y + 7} width={w - 14} height={h - 14} rx={8} fill="none" stroke={MX.fine} strokeWidth={1} />
      <CornerBolts x={x} y={y} w={w} h={h} inset={13} r={2} />
      {[
        [300, 220],
        [473, 220],
      ].map(([lx, ly]) => (
        <path key={lx} d={`M ${lx - 7} ${ly + 5} V ${ly - 2} a 7 7 0 0 1 14 0 V ${ly + 5} Z`} {...PAINT.raised} />
      ))}
      <rect x={wx - 3} y={wy - 3} width={ww + 6} height={wh + 6} rx={8} fill="none" stroke={MX.edge} strokeWidth={1} />
      <rect x={wx} y={wy} width={ww} height={wh} rx={6} {...PAINT.recess} />
      {/* meal stream onto the impact plate, then off its lower edge */}
      <path d="M 362 255 H 403 L 397 266 H 368 Z" {...PAINT.raised} />
      {stream(375, 268, 328)}
      {stream(390, 268, 342)}
      {stream(428, 382, 420)}
      {/* impact plate, measuring arm to the force cell */}
      <path d="M 388 335 L 420 311 H 458" fill="none" stroke={MX.metal} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <line x1={341} y1={293} x2={432} y2={375} stroke={MX.edge} strokeWidth={7} strokeLinecap="round" />
      <line x1={341} y1={293} x2={432} y2={375} stroke={MX.metalHi} strokeWidth={4.5} strokeLinecap="round" />
      <circle cx={388} cy={335} r={4} {...PAINT.shaft} />
      <circle cx={420} cy={311} r={3} {...PAINT.raised} />
      <rect x={488} y={298} width={14} height={27} rx={3} {...PAINT.raised} />
      <Bolt x={495} y={303} r={1.1} />
      <Bolt x={495} y={320} r={1.1} />
      <rect x={x + 30} y={438} width={46} height={10} rx={1.5} {...PAINT.recess} />
      <MachineLabel x={385.5} y={419} size={8.2} tone="ink">
        IMPACT PLATE
      </MachineLabel>
    </g>
  );
}

function Instruments() {
  return (
    <g>
      {/* body pressure tap: impulse line, root valve, transmitter head */}
      <path d="M 488 247 H 529 V 236" fill="none" stroke={MX.edge} strokeWidth={5} strokeLinejoin="round" />
      <path d="M 488 247 H 529 V 236" fill="none" stroke={MX.metal} strokeWidth={2.6} strokeLinejoin="round" />
      <rect x={500} y={241} width={11} height={12} rx={2} {...PAINT.raised} />
      <rect x={503} y={233} width={5} height={8} rx={1} {...PAINT.shaft} />
      <rect x={518} y={214} width={22} height={23} rx={6} {...PAINT.body} />
      <circle cx={529} cy={225.5} r={7.5} {...PAINT.recess} />
      {/* flow transmitter on its conduit arm */}
      <rect x={502} y={308} width={23} height={7} {...PAINT.shaft} />
      <rect x={525} y={285} width={91} height={56} rx={7} {...PAINT.body} />
      <rect x={530} y={290} width={81} height={46} rx={4} fill="none" stroke={MX.fine} strokeWidth={1} />
      <rect x={537} y={298} width={67} height={16} rx={2.5} {...PAINT.recess} />
      {[548, 560, 572].map((bx) => (
        <circle key={bx} cx={bx} cy={325} r={3} {...PAINT.raised} />
      ))}
      <rect x={586} y={321} width={18} height={8} rx={1.5} {...PAINT.recess} />
      {[540, 600].map((gx) => (
        <rect key={gx} x={gx - 3} y={341} width={6} height={5} rx={1} {...PAINT.shaft} />
      ))}
      <CornerBolts x={525} y={285} w={91} h={56} inset={5} r={1} />
    </g>
  );
}

function Art() {
  return (
    <g>
      <GroundLine x1={22} x2={804} y={GROUND} />
      <Frame />
      <AirSlide x1={46} y1={152} x2={310} y2={195} d={16} />
      <rect x={43.5} y={142} width={5} height={20} rx={1.2} transform="rotate(9.3 46 152)" {...PAINT.raised} />
      <Meter />
      <Instruments />
      <Arrow x1={742} y1={578} x2={797} y2={578} />
      <MachineLabel x={53} y={126.3} anchor="start" size={9.8}>
        FROM AIR SLIDE (F-3)
      </MachineLabel>
      <MachineLabel x={510} y={355.7} anchor="start" size={9}>
        FLOW TRANSMITTER
      </MachineLabel>
      <MachineLabel x={581.5} y={553.8} anchor="start" size={9.8}>
        TO BUCKET ELEVATOR BOOT (F-5)
      </MachineLabel>
      <MachineLabel x={286} y={682.8} anchor="start" size={9.8}>
        SOLID-FLOW METER (KILN FEED)
      </MachineLabel>
    </g>
  );
}

/** Pad centre per point (sheet units), as on PDF page 6. */
const pads: LineSheetArt["pads"] = {
  "FLO-KFS-01": [570.5, 305.5],
  "PRS-KFS-02": [529, 225.5],
};

/** Tag chip centre per point, as on PDF page 6. */
const chips: NonNullable<LineSheetArt["chips"]> = {
  "FLO-KFS-01": [663.5, 276],
  "PRS-KFS-02": [615, 173],
};

export const sheet: LineSheetArt = { id: "F-4", ready: true, width: W, height: H, Art, pads, chips };
