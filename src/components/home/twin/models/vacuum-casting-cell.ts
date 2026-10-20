/**
 * Vacuum investment casting cell: machine-kit 3D twin from a vacuum casting cell
 * schematic (diagram-skill sample), in metres. x runs left → right across the drawing (control cabinet at
 * the left, gas bottle at the right), y is up, +z faces the viewer (front).
 * Upper melting chamber (induction coil, crucible, stopper actuator) stacked on the
 * lower flask chamber (investment flask, pour gate), with the vacuum pump, induction
 * generator, control cabinet, gas bottle and cooling-water pipes around them.
 * Scale: no printed dimensions; the control cabinet is taken as 2.0 m tall.
 */
import type { Kit, KitMats, KV3 } from "@/components/home/twin/machine-kit-3d";
import { kitParts } from "@/components/home/twin/machine-kit-3d-parts";

/* ---------------------------------------------------------------- layout (metres, from the inventory) */

const CTRL = { x: -4.0, z: -1.6, w: 1.2, h: 2.0, d: 0.8 };
const GEN = { x: -2.0, z: -1.6, w: 1.2, h: 1.4, d: 0.8 };
const PUMP = { x: -3.45, z: 0, w: 1.3, h: 0.74, d: 0.8 };
const MOTOR = { x0: -2.8, x1: -2.07, y: 0.36, z: 0, r: 0.27 };
const LOWER = { x: 0, z: 0, r: 0.8, y: 0.25, h: 2.35 };
const UPPER = { x: 0, z: 0, r: 0.85, y: 2.8, h: 2.7 };
const GATE = { y: 2.6, w: 1.66, t: 0.2 };
const FLASK = { y: 0.52, w: 0.82, h: 1.39 };
const ACT = { h: 0.75, r: 0.17 };
const GAS = { x: 3.25, r: 0.14, h: 1.5 };
const HDR_X = -1.67;
const VAC_UP_Y = 4.9;
const VAC_FL_Y = 1.27;
const COOL = { inX: 3.57, inY: 2.95, outY: 2.48, retY: 3.2, supY: 3.5, tee: 1.9, f1X: 2.35 };
/** Top of the upper chamber lid, as p.chamber returns it (lid on). */
const UPPER_TOP = UPPER.y + UPPER.h + 0.05 + UPPER.r * 0.22;

/** Measurement points: surface point and outward normal. */
const POINTS: Array<{ tag: string; at: KV3; n: KV3 }> = [
  { tag: "P1", at: [0.85, 5.2, 0], n: [1, 0, 0] },
  { tag: "T1", at: [0.45, 4.2, 0.72], n: [0.53, 0, 0.85] },
  { tag: "S1", at: [-0.17, 6.0, 0], n: [-1, 0, 0] },
  { tag: "S2", at: [0.85, 2.7, 0], n: [1, 0, 0] },
  { tag: "P2", at: [0.8, 1.9, 0], n: [1, 0, 0] },
  { tag: "T2", at: [0.65, 3.0, 0.55], n: [0.77, 0, 0.64] },
  { tag: "T3", at: [1.4, 3.25, 0], n: [0, 1, 0] },
  { tag: "F1", at: [COOL.f1X, COOL.inY + 0.05, 0], n: [0, 1, 0] },
  { tag: "P3", at: [2.9, 4.69, 0], n: [0, 1, 0] },
  { tag: "T4", at: [-2.4, MOTOR.y + MOTOR.r, 0], n: [0, 1, 0] },
  { tag: "V1", at: [-3.6, 0.5, 0.4], n: [0, 0, 1] },
  { tag: "V2", at: [0, 0.15, 0.85], n: [0, 0, 1] },
  { tag: "E1", at: [GEN.x, 0.9, GEN.z + GEN.d / 2], n: [0, 0, 1] },
];

/* ---------------------------------------------------------------- model */

export const model = {
  id: "vacuum-casting-cell",
  name: "Vacuum investment casting cell",
  /** Overall size [x length, y height, z depth] in metres, as read from the image. */
  size: [8.2, 6.54, 3.54] as [number, number, number],
  build(k: Kit, mats: KitMats, part: (name: string | null) => void) {
    const p = kitParts(k, mats);

    /* shared: cable tray posts and the cable tray over the cabinets */
    part(null);
    k.beam([CTRL.x, 2.5, -2.3], [GEN.x + GEN.w / 2, 2.5, -2.3], 0.25, 0.06, mats.steel);
    k.box(0.08, 2.5, 0.08, CTRL.x, 0, -2.3, mats.steel);
    k.box(0.08, 2.5, 0.08, GEN.x + GEN.w / 2, 0, -2.3, mats.steel);
    k.box(0.2, 0.02, 0.2, CTRL.x, 0, -2.3, mats.plate);
    k.box(0.2, 0.02, 0.2, GEN.x + GEN.w / 2, 0, -2.3, mats.plate);
    for (let x = CTRL.x + 0.2; x < GEN.x + GEN.w / 2 - 0.1; x += 0.3) k.beam([x, 2.53, -2.42], [x, 2.53, -2.18], 0.03, 0.03, mats.steel); // tray rungs

    /* control cabinet, PLC / HMI */
    part("Control cabinet");
    p.cabinet({ x: CTRL.x, z: CTRL.z, w: CTRL.w, h: CTRL.h, d: CTRL.d, doors: 1, screen: true, face: "+z" });

    /* induction generator, power electronics */
    part("Induction generator");
    p.cabinet({ x: GEN.x, z: GEN.z, w: GEN.w, h: GEN.h, d: GEN.d, doors: 1, face: "+z" });
    for (let i = 0; i < 5; i++) k.box(0.7, 0.012, 0.02, GEN.x, 0.7 + i * 0.1, GEN.z + GEN.d / 2 + 0.01, mats.recess);
    k.cyl(0.05, 0.12, GEN.x, GEN.h, GEN.z, mats.machined, 12);
    for (let i = 0; i < 5; i++) k.box(0.12, 0.01, 0.04, GEN.x - 0.3 + i * 0.15, GEN.h, GEN.z, mats.recess); // top vent slots

    /* upper melting chamber: cut-away, induction coil, crucible, stopper */
    part("Melting chamber");
    p.chamber({ x: UPPER.x, z: UPPER.z, r: UPPER.r, h: UPPER.h, y: UPPER.y, cut: true, viewports: 2 });
    for (const yy of [3.8, 4.6, 5.2]) k.ring(UPPER.r + 0.02, 0.025, UPPER.x, yy, UPPER.z, "y", mats.steel, 48);
    k.boltCircle(UPPER.x, UPPER.y + UPPER.h + 0.06, UPPER.z, 0.88, 16, "y", 0.02);
    p.coil(0, 0, 0.46, 3.4, 4.9, 7, 0.025);
    k.lathe(
      [
        [0, 0],
        [0.24, 0],
        [0.24, 1.1],
        [0.2, 1.1],
        [0.2, 0.1],
        [0, 0.1],
      ],
      0,
      3.4,
      0,
      mats.model,
      32,
    );
    k.cyl(0.19, 0.9, 0, 3.5, 0, mats.material, 24); // melt
    k.cyl(0.075, 0.6, 0, UPPER.y, 0, mats.machined, 16); // stopper seat / pour tube
    k.cyl(0.025, UPPER_TOP - UPPER.y, 0, UPPER.y, 0, mats.machined, 12); // stopper rod
    k.cyl(ACT.r, ACT.h, 0, UPPER_TOP, 0, mats.model, 24); // stopper actuator
    k.cyl(ACT.r + 0.03, 0.05, 0, UPPER_TOP, 0, mats.machined, 24);
    k.boltCircle(0, UPPER_TOP + 0.05, 0, ACT.r + 0.02, 8, "y", 0.012); // actuator flange bolts
    k.cyl(0.2, 0.05, 0, UPPER_TOP + ACT.h, 0, mats.machined, 24);

    /* lower flask chamber: cut-away, investment flask with wax tree, pour gate */
    part("Flask chamber");
    p.plinth(LOWER.x, LOWER.z, 1.7, 1.7, LOWER.y);
    p.chamber({ x: LOWER.x, z: LOWER.z, r: LOWER.r, h: LOWER.h, y: LOWER.y, cut: true, lid: false, viewports: 1 });
    for (const yy of [1.2, 2.2]) k.ring(LOWER.r + 0.02, 0.025, LOWER.x, yy, LOWER.z, "y", mats.steel, 48);
    k.box(0.9, 0.19, 0.9, 0, LOWER.y, 0, mats.steel); // vibration table
    k.cyl(0.46, 0.08, 0, 0.44, 0, mats.machined, 32); // turntable
    const fw = FLASK.w;
    k.box(fw, FLASK.h, 0.03, 0, FLASK.y, -fw / 2 + 0.015, mats.concrete); // back wall
    k.box(0.03, FLASK.h, fw, -fw / 2 + 0.015, FLASK.y, 0, mats.concrete);
    k.box(0.03, FLASK.h, fw, fw / 2 - 0.015, FLASK.y, 0, mats.concrete);
    k.box(fw, 0.05, fw, 0, FLASK.y, 0, mats.concrete); // flask base
    k.cyl(0.02, 1.1, 0, 0.7, 0, mats.model, 8); // sprue
    for (let i = 0; i < 5; i++) {
      const yy = 0.85 + i * 0.22;
      k.tube([0, yy, 0], [0.28, yy + 0.14, 0], 0.012, mats.model, 6);
      k.tube([0, yy, 0], [-0.28, yy + 0.14, 0], 0.012, mats.model, 6);
    }
    k.box(GATE.w, GATE.t, GATE.w, 0, GATE.y, 0, mats.steel); // pour gate plate
    k.box(GATE.w + 0.04, 0.03, GATE.w + 0.04, 0, GATE.y + GATE.t, 0, mats.plate);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.bolt(sx * 0.7, GATE.y + GATE.t + 0.03, sz * 0.7, "y", 0.03);
    for (const s of [-1, 1]) {
      k.bolt(s * 0.7, GATE.y + GATE.t + 0.03, 0, "y", 0.03);
      k.bolt(0, GATE.y + GATE.t + 0.03, s * 0.7, "y", 0.03);
    }
    k.cyl(0.03, GATE.y - 1.95, 0, 1.95, 0, mats.material, 12); // melt stream

    /* vacuum pump with drive motor on a steel base */
    part("Vacuum pump");
    k.box(PUMP.w + 0.1, 0.06, PUMP.d + 0.1, PUMP.x, 0, PUMP.z, mats.steel);
    k.box(PUMP.w, PUMP.h - 0.06, PUMP.d, PUMP.x, 0.06, PUMP.z, mats.model);
    k.panel("+z", PUMP.x - 0.6, PUMP.x + 0.6, 0.15, 0.6, PUMP.z - PUMP.d / 2, PUMP.z + PUMP.d / 2, 0.07);
    k.cyl(0.06, 0.12, PUMP.x + 0.3, PUMP.h, 0, mats.machined, 16); // exhaust stub
    k.motor(MOTOR.x0, MOTOR.x1, MOTOR.y, MOTOR.z, MOTOR.r, 1);
    k.disc(0.1, 0.05, PUMP.x - PUMP.w / 2 - 0.02, MOTOR.y, PUMP.z, "x", mats.machined, 20); // suction flange
    k.boltCircle(PUMP.x - PUMP.w / 2 - 0.05, MOTOR.y, PUMP.z, 0.13, 8, "x", 0.015);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.bolt(PUMP.x + sx * (PUMP.w / 2 - 0.1), 0.07, PUMP.z + sz * (PUMP.d / 2 - 0.08), "y", 0.025); // anchor bolts
    for (let i = 0; i < 4; i++) k.box(0.04, 0.5, 0.04, PUMP.x - 0.4 + i * 0.27, 0.2, PUMP.z + PUMP.d / 2 + 0.005, mats.steel); // casing stiffeners

    /* vacuum piping: upper and flask branches into one header, valves */
    part("Vacuum piping");
    p.pipeRun(
      [
        [UPPER.x - UPPER.r, VAC_UP_Y, 0],
        [HDR_X, VAC_UP_Y, 0],
        [HDR_X, MOTOR.y, 0],
        [MOTOR.x1 + 0.02, MOTOR.y, 0],
      ],
      0.07,
      mats.steel,
    );
    p.pipeRun(
      [
        [LOWER.x - LOWER.r, VAC_FL_Y, 0],
        [HDR_X, VAC_FL_Y, 0],
      ],
      0.07,
      mats.steel,
    );
    p.valve([-1.28, VAC_UP_Y, 0], "x", 0.07, true);
    p.valve([-1.28, VAC_FL_Y, 0], "x", 0.07, false);
    for (const yy of [1.5, 3.0, 4.3]) k.ring(0.1, 0.015, HDR_X, yy, 0, "y", mats.steel, 16); // pipe clamps on the header

    /* gas supply: bottle on the floor, regulator and valve on the line into the chamber */
    part("Gas supply");
    p.gasCylinder(GAS.x, 0, GAS.r, GAS.h);
    p.pipeRun(
      [
        [UPPER.x + UPPER.r, 3.7, 0],
        [2.2, 3.7, 0],
        [2.2, 4.5, 0],
        [GAS.x, 4.5, 0],
        [GAS.x, GAS.h + 0.1, 0],
      ],
      0.04,
      mats.steel,
    );
    p.valve([2.5, 4.5, 0], "x", 0.04, false);
    p.valve([2.9, 4.5, 0], "x", 0.04, true);
    for (const yy of [0.5, 1.0]) k.ring(GAS.r + 0.02, 0.012, GAS.x, yy, 0, "y", mats.steel, 24); // bottle restraint rings
    k.box(0.4, 0.04, 0.4, GAS.x, 0, 0, mats.steel); // bottle base plate

    /* cooling water: supply and return to the melting chamber, flow meter, outside stubs */
    part("Cooling water");
    p.pipeRun(
      [
        [COOL.inX, COOL.inY, 0],
        [COOL.tee, COOL.inY, 0],
        [COOL.tee, COOL.supY, 0],
        [UPPER.r, COOL.supY, 0],
      ],
      0.05,
      mats.steel,
    );
    p.pipeRun(
      [
        [UPPER.r, COOL.retY, 0],
        [COOL.tee, COOL.retY, 0],
      ],
      0.05,
      mats.steel,
    );
    p.valve([3.0, COOL.inY, 0], "x", 0.05, false);
    k.disc(0.09, 0.2, COOL.f1X, COOL.inY, 0, "x", mats.model, 20); // flow meter body
    for (const dx of [-0.11, 0.11]) {
      k.disc(0.11, 0.03, COOL.f1X + dx, COOL.inY, 0, "x", mats.machined, 20);
      k.boltCircle(COOL.f1X + dx * 1.1, COOL.inY, 0, 0.085, 6, "x", 0.012);
    }
    p.pipeRun(
      [
        [COOL.f1X, COOL.inY, 0],
        [COOL.f1X, COOL.outY, 0],
        [COOL.inX, COOL.outY, 0],
      ],
      0.05,
      mats.steel,
    );

    /* wiring: conduit from the generator to the coil, cable tray over the cabinets */
    part("Wiring and instruments");
    k.pipe(
      [
        [GEN.x, GEN.h, GEN.z],
        [GEN.x, 4.0, GEN.z],
        [GEN.x, 4.0, -0.5],
        [-0.7, 4.0, -0.5],
      ],
      0.035,
      mats.machined,
    );

    for (const yy of [2.0, 3.0]) k.ring(0.05, 0.01, GEN.x, yy, GEN.z, "y", mats.steel, 16); // conduit clips

    /* instruments: pressure, temperature, flow, level / status, vibration, power */
    for (const pt of POINTS) p.transmitter(pt.at, pt.n);
  },
};
