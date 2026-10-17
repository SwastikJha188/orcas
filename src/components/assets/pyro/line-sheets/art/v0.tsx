/**
 * Sheets V-0 … V-7 — Schultheiss VPC 066 — Automatic Vacuum-Pressure Casting Machine
 * (Jewellery casting section).
 *
 * V-0: Overview schematic (1144.5 × 479) matching the engineering schematic:
 *   - Left column: Control Cabinet (E1), Induction Generator (8888 display,
 *     coil power busbars), Vacuum Pump & Vacuum Line (V1, T4, P4, E2).
 *   - Center column: Vertical two-chamber casting machine with Sealing Rod
 *     Actuator (S1), Upper Melting Chamber (crucible, molten alloy, induction
 *     coil, T1, P1), inter-chamber nozzle & closure interlock (S2), Lower Flask
 *     Chamber (perforated investment flask with jewellery mould tree, P2), and
 *     spring-mounted Flask Support / Vibration Base (V2).
 *   - Right column: Cooling Pump & Cooling Water In/Out manifold (F1, T2, T3,
 *     DT1), and Gas Supply cylinder with regulator, pressure gauge (P3) &
 *     Solenoid Valve feeding the upper melting chamber.
 *
 * V-1 … V-7: Detail sheets (824 × 704) for each of the 7 subassemblies.
 */
import React from "react";
import { Bolt, CornerBolts, Coupling, Fan, GroundLine, MX, MachineLabel, Motor, PAINT } from "@/components/assets/machine-kit/machine-kit";
import { Cabinet, Pipe } from "../../drawings/fkp-parts";
import type { LineSheetArt } from "../types";

const W0 = 1144.5;
const H0 = 479;
const GROUND0 = 450;

const WD = 824;
const HD = 704;

/* -------------------------------------------------------------------------- */
/* V-0: OVERVIEW SHEET                                                        */
/* -------------------------------------------------------------------------- */

function ControlAndInductionV0() {
  return (
    <g>
      {/* Top-left: CONTROL CABINET */}
      <Cabinet x={62} y={48} w={132} h={118} />
      <rect x={76} y={62} width={64} height={42} rx={3} {...PAINT.recess} />
      {/* Screen trace lines */}
      <polyline points="82,92 94,82 106,86 118,72 132,76" fill="none" stroke={MX.metal} strokeWidth={1.4} />
      {/* Status indicator & pushbuttons */}
      <circle cx={164} cy={72} r={7} {...PAINT.raised} />
      <circle cx={164} cy={72} r={4} {...PAINT.material} />
      <rect x={154} y={90} width={20} height={10} rx={2} {...PAINT.raised} />
      <rect x={76} y={116} width={104} height={34} rx={2} {...PAINT.recess} />
      {[88, 108, 128, 148, 168].map((x) => (
        <line key={x} x1={x} y1={122} x2={x} y2={144} stroke={MX.fine} strokeWidth={1.2} />
      ))}
      <MachineLabel x={128} y={38} size={8.5}>
        CONTROL CABINET
      </MachineLabel>

      {/* Conduit from Control Cabinet to Induction Generator */}
      <Pipe pts={[[128, 166], [128, 196]]} d={6} elbows={false} />

      {/* Mid-left: INDUCTION GENERATOR */}
      <rect x={58} y={196} width={144} height={92} rx={5} {...PAINT.body} />
      <CornerBolts x={58} y={196} w={144} h={92} inset={5} r={1.2} />
      {/* Digital 8888 readout */}
      <rect x={72} y={210} width={68} height={24} rx={3} {...PAINT.recess} />
      <MachineLabel x={106} y={226} size={11} tone="ink">
        8888
      </MachineLabel>
      {/* Indicator lamps & selector dials */}
      <circle cx={158} cy={216} r={4} {...PAINT.material} />
      <circle cx={174} cy={216} r={4} {...PAINT.raised} />
      <circle cx={158} cy={230} r={4} {...PAINT.raised} />
      <circle cx={174} cy={230} r={4} {...PAINT.raised} />
      {/* Cooling louver vents on generator body */}
      {[248, 256, 264, 272].map((y) => (
        <line key={y} x1={72} y1={y} x2={188} y2={y} stroke={MX.fine} strokeWidth={1.4} />
      ))}
      <MachineLabel x={130} y={302} size={8.5}>
        INDUCTION GENERATOR
      </MachineLabel>

      {/* Dual heavy copper HF busbars / cables into the melting chamber coil */}
      <Pipe pts={[[202, 224], [346, 224], [346, 148], [472, 148]]} d={6} flanges={[[346, 186]]} />
      <Pipe pts={[[202, 242], [360, 242], [360, 188], [472, 188]]} d={6} flanges={[[360, 214]]} />
    </g>
  );
}

function VacuumSystemV0() {
  return (
    <g>
      {/* Pump baseplate skid */}
      <rect x={48} y={440} width={196} height={10} rx={2} {...PAINT.body} />
      <Bolt x={58} y={445} r={1.3} />
      <Bolt x={234} y={445} r={1.3} />

      {/* Vacuum pump electric motor */}
      <Motor x={56} y={386} w={74} h={54} />
      <Coupling x={132} y={405} w={12} h={16} />

      {/* Vacuum pump stage & oil housing */}
      <rect x={144} y={376} width={88} height={64} rx={6} {...PAINT.body} />
      <rect x={152} y={368} width={72} height={8} rx={2} {...PAINT.raised} />
      <Fan cx={176} cy={408} r={18} />
      {/* Oil sight glass */}
      <rect x={204} y={394} width={18} height={28} rx={3} {...PAINT.recess} />
      <rect x={206} y={406} width={14} height={14} rx={2} {...PAINT.material} />
      <MachineLabel x={146} y={468} size={8.5}>
        VACUUM PUMP
      </MachineLabel>

      {/* Main vacuum suction manifold */}
      <Pipe
        pts={[
          [188, 368],
          [188, 344],
          [318, 344],
        ]}
        d={9}
        flanges={[[238, 344]]}
      />
      {/* Vacuum branch down to lower flask chamber */}
      <Pipe
        pts={[
          [318, 344],
          [406, 344],
        ]}
        d={9}
        flanges={[[364, 344]]}
      />
      {/* Vacuum branch up to upper melting chamber */}
      <Pipe
        pts={[
          [318, 344],
          [318, 114],
          [406, 114],
        ]}
        d={8}
        flanges={[[318, 230], [364, 114]]}
      />
      {/* Vacuum isolation valve on lower branch */}
      <rect x={344} y={334} width={16} height={20} rx={3} {...PAINT.raised} />
      {/* Vacuum isolation valve on upper branch */}
      <rect x={344} y={104} width={16} height={20} rx={3} {...PAINT.raised} />

      <MachineLabel x={256} y={331} size={7.8}>
        VACUUM LINE
      </MachineLabel>
    </g>
  );
}

function CastingTowerV0() {
  return (
    <g>
      {/* Heavy floor base frame & columns */}
      <rect x={380} y={440} width={320} height={10} rx={2} {...PAINT.body} />
      <rect x={392} y={54} width={14} height={386} rx={2} {...PAINT.cylinderV} />
      <rect x={674} y={54} width={14} height={386} rx={2} {...PAINT.cylinderV} />
      {/* Top bridge crosshead */}
      <rect x={384} y={44} width={312} height={14} rx={3} {...PAINT.raised} />
      <Bolt x={400} y={51} r={1.5} />
      <Bolt x={680} y={51} r={1.5} />

      {/* Top Sealing Rod Pneumatic / Servo Actuator */}
      <rect x={516} y={14} width={48} height={30} rx={4} {...PAINT.body} />
      <rect x={524} y={8} width={32} height={6} rx={2} {...PAINT.raised} />
      {/* Stopper rod descending through upper chamber lid into crucible nozzle */}
      <rect x={537} y={44} width={6} height={168} {...PAINT.shaft} />
      {/* Conical graphite stopper tip at crucible bottom nozzle */}
      <polygon points="534,208 546,208 540,222" {...PAINT.raised} />
      <MachineLabel x={498} y={26} anchor="end" size={8}>
        SEALING ROD ACTUATOR
      </MachineLabel>

      {/* UPPER MELTING CHAMBER (flanged pressure/vacuum vessel) */}
      <rect x={406} y={66} width={268} height={180} rx={8} {...PAINT.body} />
      <rect x={400} y={64} width={280} height={10} rx={2} {...PAINT.raised} />
      <rect x={400} y={240} width={280} height={10} rx={2} {...PAINT.raised} />
      {/* Interior chamber cavity */}
      <rect x={418} y={78} width={244} height={158} rx={5} {...PAINT.recess} />

      {/* Graphite/ceramic Crucible in centre of Upper Chamber */}
      <path d="M 482 108 H 598 V 196 Q 598 220 552 222 H 528 Q 482 220 482 196 Z" {...PAINT.body} />
      {/* Molten alloy bath inside crucible */}
      <path d="M 490 132 H 590 V 194 Q 590 212 550 214 H 530 Q 490 212 490 194 Z" {...PAINT.material} />
      {/* Induction heating coil turns around crucible */}
      {[124, 142, 160, 178, 196].map((y) => (
        <g key={y}>
          <rect x={464} y={y - 5} width={16} height={10} rx={4} {...PAINT.material} />
          <rect x={600} y={y - 5} width={16} height={10} rx={4} {...PAINT.material} />
          <line x1={480} y1={y} x2={600} y2={y} stroke={MX.heat} strokeWidth={1.6} strokeDasharray="5 3" />
        </g>
      ))}
      {/* Crucible thermocouple lance (T1) */}
      <rect x={448} y={96} width={18} height={12} rx={2} {...PAINT.raised} />
      <line x1={466} y1={102} x2={504} y2={148} stroke={MX.edge} strokeWidth={2.2} />

      <MachineLabel x={540} y={94} size={8.8} tone="ink">
        MELTING CHAMBER
      </MachineLabel>
      <MachineLabel x={540} y={168} size={8} tone="ink">
        CRUCIBLE
      </MachineLabel>

      {/* Inter-chamber partition & bottom pouring nozzle */}
      <rect x={400} y={248} width={280} height={18} rx={2} {...PAINT.raised} />
      {/* Pouring channel between crucible nozzle and flask sprue */}
      <rect x={532} y={220} width={16} height={56} {...PAINT.recess} />
      <rect x={536} y={222} width={8} height={54} {...PAINT.material} />
      {/* Chamber seal & door interlock switch housing on right flange */}
      <rect x={678} y={244} width={24} height={24} rx={4} {...PAINT.body} />

      {/* LOWER FLASK CHAMBER */}
      <rect x={406} y={266} width={268} height={152} rx={8} {...PAINT.body} />
      <rect x={400} y={410} width={280} height={10} rx={2} {...PAINT.raised} />
      <rect x={418} y={274} width={244} height={132} rx={5} {...PAINT.recess} />

      {/* Perforated investment flask & jewellery mould tree */}
      <rect x={480} y={278} width={120} height={120} rx={4} {...PAINT.body} />
      <rect x={474} y={276} width={132} height={8} rx={2} {...PAINT.raised} />
      {/* Perforation holes on flask wall */}
      {[296, 316, 336, 356, 376].map((y) => (
        <g key={y}>
          <circle cx={486} cy={y} r={2.2} {...PAINT.recess} />
          <circle cx={594} cy={y} r={2.2} {...PAINT.recess} />
        </g>
      ))}
      {/* Investment mould cavity with central sprue and jewellery tree branches */}
      <rect x={494} y={286} width={92} height={104} rx={3} {...PAINT.recess} />
      <rect x={536} y={278} width={8} height={96} {...PAINT.material} />
      {[302, 322, 342, 362].map((y) => (
        <g key={y}>
          <line x1={540} y1={y} x2={510} y2={y - 10} stroke={MX.heat} strokeWidth={3} strokeLinecap="round" />
          <circle cx={508} cy={y - 11} r={4.5} {...PAINT.material} />
          <line x1={540} y1={y} x2={570} y2={y - 10} stroke={MX.heat} strokeWidth={3} strokeLinecap="round" />
          <circle cx={572} cy={y - 11} r={4.5} {...PAINT.material} />
        </g>
      ))}
      <MachineLabel x={540} y={401} size={8.5} tone="ink">
        FLASK CHAMBER
      </MachineLabel>

      {/* Bottom Flask Support & Direct Vibration Base */}
      <rect x={456} y={420} width={168} height={12} rx={3} {...PAINT.raised} />
      {/* Isolation springs under vibration table */}
      {[476, 518, 562, 604].map((x) => (
        <path
          key={x}
          d={`M ${x} 432 l -5 3 l 10 3 l -10 3 l 5 3`}
          fill="none"
          stroke={MX.edge}
          strokeWidth={1.6}
        />
      ))}
      <MachineLabel x={540} y={468} size={8.5}>
        FLASK SUPPORT / VIBRATION BASE
      </MachineLabel>
    </g>
  );
}

function CoolingAndGasV0() {
  return (
    <g>
      {/* Upper-right: COOLING WATER IN / OUT & COOLING PUMP */}
      {/* Supply line (COOLING WATER IN) from pump manifold into induction coil / chamber jacket */}
      <Pipe
        pts={[
          [978, 118],
          [674, 118],
        ]}
        d={8}
        flanges={[[740, 118], [946, 118]]}
      />
      {/* Return line (COOLING WATER OUT) from chamber jacket back to cooling unit */}
      <Pipe
        pts={[
          [674, 178],
          [978, 178],
        ]}
        d={8}
        flanges={[[740, 178], [946, 178]]}
      />
      {/* Inline flowmeter F1 body */}
      <rect x={808} y={106} width={28} height={24} rx={4} {...PAINT.raised} />
      {/* Cooling pump & heat-exchanger skid */}
      <rect x={978} y={96} width={114} height={106} rx={6} {...PAINT.body} />
      <CornerBolts x={978} y={96} w={114} h={106} inset={5} r={1.2} />
      <Fan cx={1018} cy={148} r={22} />
      <Motor x={1046} y={126} w={38} h={44} />
      <MachineLabel x={1035} y={84} size={8.5}>
        COOLING PUMP
      </MachineLabel>
      <MachineLabel x={822} y={96} size={7.8}>
        COOLING WATER IN
      </MachineLabel>
      <MachineLabel x={822} y={202} size={7.8}>
        COOLING WATER OUT
      </MachineLabel>

      {/* Lower-right: INERT GAS SUPPLY CYLINDER, REGULATOR & SOLENOID VALVE */}
      {/* High-pressure gas cylinder */}
      <path d="M 1004 316 Q 1004 282 1034 282 Q 1064 282 1064 316 V 440 H 1004 Z" {...PAINT.cylinderV} />
      <rect x={998} y={440} width={72} height={10} rx={2} {...PAINT.raised} />
      {/* Cylinder neck & valve */}
      <rect x={1026} y={266} width={16} height={16} rx={2} {...PAINT.raised} />
      {/* Pressure regulator & analog gauge */}
      <circle cx={988} cy={272} r={11} {...PAINT.body} />
      <circle cx={988} cy={272} r={7} {...PAINT.recess} />
      <line x1={988} y1={272} x2={993} y2={267} stroke={MX.edge} strokeWidth={1.4} />
      {/* Gas delivery pipe from regulator through solenoid valve into Upper Melting Chamber */}
      <Pipe
        pts={[
          [1026, 274],
          [940, 274],
          [940, 312],
          [756, 312],
          [756, 86],
          [674, 86],
        ]}
        d={7}
        flanges={[[900, 312], [756, 200]]}
      />
      {/* Solenoid valve on gas line */}
      <rect x={808} y={298} width={36} height={28} rx={4} {...PAINT.raised} />
      <rect x={816} y={284} width={20} height={14} rx={2} {...PAINT.body} />
      <MachineLabel x={826} y={342} size={7.8}>
        SOLENOID VALVE
      </MachineLabel>
      <MachineLabel x={1034} y={372} size={8.2} tone="ink">
        GAS
      </MachineLabel>
      <MachineLabel x={1034} y={386} size={8.2} tone="ink">
        SUPPLY
      </MachineLabel>
      <MachineLabel x={1034} y={468} size={8.5}>
        GAS SUPPLY
      </MachineLabel>
    </g>
  );
}

function ArtV0() {
  return (
    <g>
      <GroundLine x1={24} x2={1120} y={GROUND0} />
      <ControlAndInductionV0 />
      <VacuumSystemV0 />
      <CastingTowerV0 />
      <CoolingAndGasV0 />
    </g>
  );
}

export const VPC_PADS_V0: LineSheetArt["pads"] = {
  E1: [128, 82],
  T1: [448, 102],
  S1: [564, 28],
  P1: [652, 86],
  P3: [940, 292],
  S2: [690, 256],
  P2: [652, 344],
  V1: [176, 376],
  T4: [212, 376],
  P4: [268, 344],
  E2: [92, 386],
  F1: [822, 118],
  T2: [892, 118],
  T3: [852, 178],
  DT1: [926, 178],
  V2: [624, 426],
};

export const v0: LineSheetArt = {
  id: "V-0",
  ready: true,
  width: W0,
  height: H0,
  Art: ArtV0,
  pads: VPC_PADS_V0,
};

/* -------------------------------------------------------------------------- */
/* V-1 … V-7: SUBSYSTEM DETAIL SHEETS (824 × 704)                             */
/* -------------------------------------------------------------------------- */

function ArtV1() {
  return (
    <g>
      <GroundLine x1={40} x2={784} y={640} />
      {/* Left: Control cabinet & Induction Generator */}
      <Cabinet x={72} y={120} w={180} h={220} />
      <rect x={94} y={148} width={96} height={64} rx={4} {...PAINT.recess} />
      <polyline points="104,196 124,178 144,184 164,162 180,168" fill="none" stroke={MX.metal} strokeWidth={2} />
      <circle cx={218} cy={168} r={10} {...PAINT.material} />
      <MachineLabel x={162} y={102} size={11}>
        CONTROL CABINET (PLC &amp; POWER MODULE)
      </MachineLabel>

      <rect x={68} y={380} width={188} height={260} rx={6} {...PAINT.body} />
      <CornerBolts x={68} y={380} w={188} h={260} inset={8} r={1.6} />
      <rect x={92} y={410} width={104} height={38} rx={4} {...PAINT.recess} />
      <MachineLabel x={144} y={435} size={15} tone="ink">
        8888 kW
      </MachineLabel>
      {[480, 500, 520, 540, 560, 580].map((y) => (
        <line key={y} x1={92} y1={y} x2={232} y2={y} stroke={MX.fine} strokeWidth={2} />
      ))}
      <MachineLabel x={162} y={664} size={11}>
        INDUCTION GENERATOR (12 kW MEDIUM-FREQ)
      </MachineLabel>

      {/* HF copper busbars to crucible coil */}
      <Pipe pts={[[256, 440], [380, 440], [380, 290], [468, 290]]} d={12} flanges={[[380, 365]]} />
      <Pipe pts={[[256, 480], [404, 480], [404, 370], [468, 370]]} d={12} flanges={[[404, 425]]} />

      {/* Right: Enlarged Crucible, Induction Coil & Type S Thermocouple */}
      <rect x={440} y={160} width={300} height={340} rx={10} {...PAINT.body} />
      <rect x={458} y={178} width={264} height={304} rx={6} {...PAINT.recess} />
      <path d="M 508 220 H 672 V 390 Q 672 436 608 440 H 572 Q 508 436 508 390 Z" {...PAINT.body} />
      <path d="M 520 264 H 660 V 386 Q 660 422 604 426 H 576 Q 520 422 520 386 Z" {...PAINT.material} />
      {[250, 285, 320, 355, 390].map((y) => (
        <g key={y}>
          <rect x={482} y={y - 8} width={24} height={16} rx={6} {...PAINT.material} />
          <rect x={674} y={y - 8} width={24} height={16} rx={6} {...PAINT.material} />
          <line x1={506} y1={y} x2={674} y2={y} stroke={MX.heat} strokeWidth={2.2} strokeDasharray="7 4" />
        </g>
      ))}
      {/* Thermocouple pocket T1 */}
      <rect x={468} y={196} width={32} height={20} rx={3} {...PAINT.raised} />
      <line x1={500} y1={206} x2={556} y2={296} stroke={MX.edge} strokeWidth={3.5} />
      <MachineLabel x={590} y={142} size={11}>
        UPPER MELTING CHAMBER &amp; CRUCIBLE COIL
      </MachineLabel>
    </g>
  );
}

export const v1: LineSheetArt = {
  id: "V-1",
  ready: true,
  width: WD,
  height: HD,
  Art: ArtV1,
  pads: { E1: [162, 180], T1: [484, 206] },
  chips: { E1: [260, 88], T1: [370, 152] },
};

function ArtV2() {
  return (
    <g>
      <GroundLine x1={40} x2={784} y={640} />
      {/* Top bridge and Sealing Rod Actuator */}
      <rect x={200} y={120} width={424} height={24} rx={4} {...PAINT.raised} />
      <rect x={362} y={52} width={100} height={68} rx={6} {...PAINT.body} />
      <CornerBolts x={362} y={52} w={100} h={68} inset={6} r={1.5} />
      {/* Stopper rod and graphite tip */}
      <rect x={404} y={144} width={16} height={336} {...PAINT.shaft} />
      <polygon points="396,480 428,480 412,516" {...PAINT.raised} />
      {/* Crucible section & bottom nozzle */}
      <path d="M 284 230 H 540 V 460 Q 540 520 444 526 H 380 Q 284 520 284 460 Z" {...PAINT.body} />
      <path d="M 304 290 H 520 V 454 Q 520 500 436 506 H 388 Q 304 500 304 454 Z" {...PAINT.material} />
      {/* Bottom pour nozzle */}
      <rect x={396} y={506} width={32} height={74} {...PAINT.recess} />
      <MachineLabel x={412} y={34} size={11}>
        SEALING ROD ACTUATOR &amp; CRUCIBLE BOTTOM NOZZLE
      </MachineLabel>
      <MachineLabel x={412} y={612} size={10.5}>
        POUR CHANNEL TO LOWER FLASK CHAMBER
      </MachineLabel>
    </g>
  );
}

export const v2: LineSheetArt = {
  id: "V-2",
  ready: true,
  width: WD,
  height: HD,
  Art: ArtV2,
  pads: { S1: [462, 86] },
  chips: { S1: [580, 76] },
};

function ArtV3() {
  return (
    <g>
      <GroundLine x1={40} x2={784} y={640} />
      {/* Left: Upper Melting Chamber pressure zone */}
      <rect x={80} y={160} width={280} height={360} rx={10} {...PAINT.body} />
      <rect x={98} y={180} width={244} height={320} rx={6} {...PAINT.recess} />
      <MachineLabel x={220} y={138} size={11}>
        UPPER MELTING CHAMBER (VACUUM / OVERPRESSURE)
      </MachineLabel>

      {/* Gas delivery pipe */}
      <Pipe pts={[[640, 260], [360, 260]]} d={14} flanges={[[440, 260], [580, 260]]} />
      {/* Solenoid valve */}
      <rect x={476} y={238} width={64} height={44} rx={6} {...PAINT.raised} />
      <rect x={490} y={214} width={36} height={24} rx={4} {...PAINT.body} />
      <MachineLabel x={508} y={306} size={10}>
        OVERPRESSURE SOLENOID VALVE
      </MachineLabel>

      {/* Gas cylinder & regulator */}
      <path d="M 640 310 Q 640 250 690 250 Q 740 250 740 310 V 630 H 640 Z" {...PAINT.cylinderV} />
      <circle cx={614} cy={232} r={20} {...PAINT.body} />
      <circle cx={614} cy={232} r={13} {...PAINT.recess} />
      <MachineLabel x={690} y={450} size={11} tone="ink">
        INERT GAS
      </MachineLabel>
      <MachineLabel x={690} y={470} size={11} tone="ink">
        CYLINDER
      </MachineLabel>
    </g>
  );
}

export const v3: LineSheetArt = {
  id: "V-3",
  ready: true,
  width: WD,
  height: HD,
  Art: ArtV3,
  pads: { P1: [330, 210], P3: [564, 260] },
  chips: { P1: [240, 108], P3: [564, 156] },
};

function ArtV4() {
  return (
    <g>
      <GroundLine x1={40} x2={784} y={640} />
      {/* Inter-chamber flange & seal with S2 interlock */}
      <rect x={160} y={136} width={504} height={32} rx={4} {...PAINT.raised} />
      <rect x={652} y={128} width={44} height={48} rx={6} {...PAINT.body} />
      {/* Lower Flask Chamber */}
      <rect x={180} y={168} width={464} height={410} rx={10} {...PAINT.body} />
      <rect x={204} y={192} width={416} height={362} rx={6} {...PAINT.recess} />
      {/* Perforated investment flask & mould tree */}
      <rect x={292} y={208} width={240} height={320} rx={6} {...PAINT.body} />
      <rect x={316} y={224} width={192} height={288} rx={4} {...PAINT.recess} />
      <rect x={404} y={196} width={16} height={280} {...PAINT.material} />
      {[260, 310, 360, 410, 460].map((y) => (
        <g key={y}>
          <line x1={412} y1={y} x2={348} y2={y - 22} stroke={MX.heat} strokeWidth={5} strokeLinecap="round" />
          <circle cx={344} cy={y - 24} r={9} {...PAINT.material} />
          <line x1={412} y1={y} x2={476} y2={y - 22} stroke={MX.heat} strokeWidth={5} strokeLinecap="round" />
          <circle cx={480} cy={y - 24} r={9} {...PAINT.material} />
        </g>
      ))}
      <MachineLabel x={412} y={108} size={11}>
        LOWER FLASK CHAMBER, MOULD TREE &amp; CLOSURE INTERLOCK
      </MachineLabel>
    </g>
  );
}

export const v4: LineSheetArt = {
  id: "V-4",
  ready: true,
  width: WD,
  height: HD,
  Art: ArtV4,
  pads: { S2: [674, 152], P2: [604, 340] },
  chips: { S2: [690, 78], P2: [708, 340] },
};

function ArtV5() {
  return (
    <g>
      <GroundLine x1={40} x2={784} y={640} />
      <rect x={100} y={560} width={560} height={22} rx={4} {...PAINT.body} />
      <Motor x={124} y={420} w={180} h={140} />
      <Coupling x={308} y={470} w={28} h={40} />
      <rect x={336} y={396} width={220} height={164} rx={10} {...PAINT.body} />
      <Fan cx={416} cy={478} r={46} />
      <rect x={488} y={436} width={44} height={76} rx={5} {...PAINT.recess} />
      <rect x={492} y={472} width={36} height={36} rx={3} {...PAINT.material} />
      {/* Vacuum suction manifold up to chambers */}
      <Pipe pts={[[446, 396], [446, 210], [720, 210]]} d={20} flanges={[[446, 310], [580, 210]]} />
      <MachineLabel x={412} y={616} size={11}>
        VACUUM PUMP UNIT, MOTOR &amp; SUCTION MANIFOLD
      </MachineLabel>
    </g>
  );
}

export const v5: LineSheetArt = {
  id: "V-5",
  ready: true,
  width: WD,
  height: HD,
  Art: ArtV5,
  pads: { E2: [214, 420], V1: [416, 396], T4: [510, 396], P4: [520, 210] },
  chips: { E2: [160, 320], V1: [336, 310], T4: [570, 310], P4: [520, 124] },
};

function ArtV6() {
  return (
    <g>
      <GroundLine x1={40} x2={784} y={640} />
      {/* Cooling water supply & return headers */}
      <Pipe pts={[[560, 240], [120, 240]]} d={18} flanges={[[240, 240], [480, 240]]} />
      <Pipe pts={[[120, 410], [560, 410]]} d={18} flanges={[[240, 410], [480, 410]]} />
      <rect x={280} y={214} width={68} height={52} rx={6} {...PAINT.raised} />
      <rect x={560} y={180} width={180} height={310} rx={10} {...PAINT.body} />
      <CornerBolts x={560} y={180} w={180} h={310} inset={8} r={1.6} />
      <Fan cx={650} cy={290} r={48} />
      <Motor x={600} y={370} w={100} h={84} />
      <MachineLabel x={340} y={192} size={11}>
        COOLING WATER SUPPLY HEADER (INLET)
      </MachineLabel>
      <MachineLabel x={340} y={456} size={11}>
        COOLING WATER RETURN HEADER (OUTLET &amp; ΔT)
      </MachineLabel>
    </g>
  );
}

export const v6: LineSheetArt = {
  id: "V-6",
  ready: true,
  width: WD,
  height: HD,
  Art: ArtV6,
  pads: { F1: [314, 240], T2: [430, 240], T3: [314, 410], DT1: [430, 410] },
  chips: { F1: [270, 134], T2: [450, 134], T3: [270, 516], DT1: [450, 516] },
};

function ArtV7() {
  return (
    <g>
      <GroundLine x1={40} x2={784} y={640} />
      <rect x={180} y={160} width={464} height={300} rx={10} {...PAINT.body} />
      <rect x={292} y={196} width={240} height={240} rx={6} {...PAINT.recess} />
      {/* Vibration base plate & coil springs */}
      <rect x={220} y={468} width={384} height={28} rx={5} {...PAINT.raised} />
      {[260, 336, 412, 488, 564].map((x) => (
        <path
          key={x}
          d={`M ${x} 496 l -12 14 l 24 14 l -24 14 l 24 14 l -12 14`}
          fill="none"
          stroke={MX.edge}
          strokeWidth={3}
        />
      ))}
      <rect x={160} y={566} width={504} height={24} rx={4} {...PAINT.body} />
      <MachineLabel x={412} y={128} size={11}>
        LOWER FLASK SUPPORT &amp; DIRECT VIBRATION BASE (OPTIONAL)
      </MachineLabel>
    </g>
  );
}

export const v7: LineSheetArt = {
  id: "V-7",
  ready: true,
  width: WD,
  height: HD,
  Art: ArtV7,
  pads: { V2: [572, 482] },
  chips: { V2: [668, 412] },
};
