import * as THREE from "three";

/* ==========================================================================
   Procedural surface textures for the machine twin (canvas-generated, no
   downloads): concrete, brushed / painted metal grain, steel grating and the
   kiln shell skin (plate courses, welds, inlet dust, burning-zone temper).
   Colours come from the --twin-* / --mx-* tokens passed in.
   ========================================================================== */

/** Small deterministic PRNG, so the textures are the same on every load. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, g: c.getContext("2d")! };
}

function finish(c: HTMLCanvasElement, repeat: [number, number], srgb: boolean) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

const hex = (c: THREE.Color) => `#${c.getHexString()}`;

/** Grey value noise: fine grain plus soft blotches. Used as roughness / bump. */
export function grainTexture(seed: number, repeat: [number, number] = [4, 4], streak = 0) {
  const N = 256;
  const { c, g } = canvas(N, N);
  const r = rng(seed);
  const img = g.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const v = 150 + (r() - 0.5) * 70;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // soft blotches
  for (let i = 0; i < 60; i++) {
    const x = r() * N;
    const y = r() * N;
    const rad = 8 + r() * 40;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    const a = 0.08 + r() * 0.1;
    grd.addColorStop(0, r() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // brushing: long faint strokes
  for (let i = 0; i < streak; i++) {
    const y = r() * N;
    g.strokeStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},0.05)`;
    g.lineWidth = 0.6 + r();
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(N, y + (r() - 0.5) * 4);
    g.stroke();
  }
  return finish(c, repeat, false);
}

/** Cast concrete: base tone, aggregate speckle, formwork lines, ground-line grime. */
export function concreteTexture(base: string) {
  const N = 512;
  const { c, g } = canvas(N, N);
  const r = rng(11);
  const b = new THREE.Color(base);
  g.fillStyle = hex(b);
  g.fillRect(0, 0, N, N);
  for (let i = 0; i < 9000; i++) {
    const k = (r() - 0.5) * 0.18;
    g.fillStyle = hex(b.clone().offsetHSL(0, 0, k));
    const s = r() * 2.2;
    g.fillRect(r() * N, r() * N, s, s);
  }
  for (let i = 0; i < 40; i++) {
    const x = r() * N;
    const y = r() * N;
    const rad = 20 + r() * 70;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, `rgba(0,0,0,${0.04 + r() * 0.06})`);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // formwork joints
  g.strokeStyle = "rgba(0,0,0,0.10)";
  g.lineWidth = 1.5;
  for (const y of [N * 0.33, N * 0.66]) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(N, y);
    g.stroke();
  }
  // rain / grime streaks from the top
  for (let i = 0; i < 26; i++) {
    const x = r() * N;
    const h = 40 + r() * 160;
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "rgba(0,0,0,0.08)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(x, 0, 1.5 + r() * 3, h);
  }
  return finish(c, [1, 1], true);
}

/** Open steel grating (platform floors). Light bars on dark gaps. */
export function gratingTexture(base: string) {
  const N = 128;
  const { c, g } = canvas(N, N);
  const b = new THREE.Color(base);
  g.fillStyle = hex(b.clone().multiplyScalar(0.35));
  g.fillRect(0, 0, N, N);
  g.fillStyle = hex(b);
  for (let x = 0; x < N; x += 8) g.fillRect(x, 0, 3, N);
  for (let y = 0; y < N; y += 32) g.fillRect(0, y, N, 2);
  return finish(c, [6, 6], true);
}

/** Painted / plated surface: colour with slight tonal unevenness. */
export function paintTexture(base: string, seed: number) {
  const N = 256;
  const { c, g } = canvas(N, N);
  const r = rng(seed);
  const b = new THREE.Color(base);
  g.fillStyle = hex(b);
  g.fillRect(0, 0, N, N);
  for (let i = 0; i < 50; i++) {
    const x = r() * N;
    const y = r() * N;
    const rad = 10 + r() * 50;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    const k = (r() - 0.5) * 0.08;
    grd.addColorStop(0, hex(b.clone().offsetHSL(0, 0, k)));
    grd.addColorStop(1, `${hex(b)}00`);
    g.fillStyle = grd;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  return finish(c, [1, 1], true);
}

/**
 * Kiln shell skin. CylinderGeometry UVs: u around the circumference, v along
 * the axis (v = 0 at the bottom of the unrotated cylinder, which OnAxis turns
 * to the outlet end). Plate courses, circumferential and longitudinal welds,
 * meal dust toward the inlet, and the burning zone (40–66 m) tempered darker
 * and warmer, as a real shell looks after a campaign.
 */
export function shellTexture(shell: string, heat: string, length: number, burning: [number, number]) {
  const W = 512;
  const H = 2048;
  const { c, g } = canvas(W, H);
  const r = rng(7);
  const base = new THREE.Color(shell);
  const hot = new THREE.Color(heat);
  // y = 0 is v = 1 (canvas top) → inlet end after OnAxis; y = H is the outlet.
  const yOf = (m: number) => (m / length) * H;
  const courses = 22;
  for (let i = 0; i < courses; i++) {
    const y0 = (i / courses) * H;
    const tone = base.clone().offsetHSL(0, 0, (r() - 0.5) * 0.05);
    g.fillStyle = hex(tone);
    g.fillRect(0, y0, W, H / courses + 1);
  }
  // burning zone temper: smooth ramp in and out
  const [b0, b1] = burning;
  const grd = g.createLinearGradient(0, yOf(b0 - 6), 0, yOf(b1 + 4));
  const hotA = (a: number) => `rgba(${Math.round(hot.r * 255)},${Math.round(hot.g * 255)},${Math.round(hot.b * 255)},${a})`;
  grd.addColorStop(0, hotA(0));
  grd.addColorStop(0.2, hotA(0.75));
  grd.addColorStop(0.75, hotA(0.9));
  grd.addColorStop(1, hotA(0));
  g.fillStyle = grd;
  g.fillRect(0, yOf(b0 - 6), W, yOf(b1 + 4) - yOf(b0 - 6));
  // inlet meal dust (light, patchy, mostly on the lower half)
  for (let i = 0; i < 220; i++) {
    const y = r() * yOf(12);
    const x = r() * W;
    const rad = 6 + r() * 30;
    const d = g.createRadialGradient(x, y, 0, x, y, rad);
    d.addColorStop(0, `rgba(205,198,182,${0.08 + r() * 0.12})`);
    d.addColorStop(1, "rgba(205,198,182,0)");
    g.fillStyle = d;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // grime and heat streaks
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `rgba(0,0,0,${0.02 + r() * 0.05})`;
    g.fillRect(r() * W, r() * H, 1 + r() * 2, 6 + r() * 40);
  }
  // circumferential welds between courses
  for (let i = 1; i < courses; i++) {
    const y = (i / courses) * H;
    g.fillStyle = "rgba(0,0,0,0.35)";
    g.fillRect(0, y - 1, W, 2);
    g.fillStyle = "rgba(255,255,255,0.10)";
    g.fillRect(0, y + 1, W, 1);
  }
  // longitudinal welds, staggered per course
  for (let i = 0; i < courses; i++) {
    const x = ((i % 2 ? 0.25 : 0.75) + (r() - 0.5) * 0.05) * W;
    g.fillStyle = "rgba(0,0,0,0.28)";
    g.fillRect(x, (i / courses) * H, 2, H / courses);
  }
  const t = finish(c, [1, 1], true);
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
