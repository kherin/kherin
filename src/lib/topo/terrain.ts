/**
 * The mountain. Deterministic ridged-fBm heightfield and the trail that
 * climbs it — shared source of truth for the topographic hero map.
 *
 * The noise uses a fixed internal seed so the terrain is identical every
 * load (and identical to the 3D splat scene this map replaced).
 */

export type V3 = [number, number, number];

// terrain domain
export const X_MIN = -12;
export const X_MAX = 12;
export const Z_MIN = -8;
export const Z_MAX = 8;

// mulberry32 — tiny deterministic PRNG
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Seeded lattice value noise + ridged fBm ────────────────────────────────

function makeNoise2D(seed: number): (x: number, y: number) => number {
  const r = rng(seed);
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (r() * (i + 1)) | 0;
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) vals[i] = r();
  const lat = (xi: number, yi: number) => vals[perm[(perm[xi & 255] + yi) & 255]];

  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = lat(xi, yi), b = lat(xi + 1, yi);
    const c = lat(xi, yi + 1), d = lat(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; // 0..1
  };
}

const noise2 = makeNoise2D(1337);

/** Ridged fBm: creases where the underlying noise crosses its midline. */
function ridged(x: number, y: number, octaves: number): number {
  let sum = 0, amp = 0.55, freq = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    const n = noise2(x * freq, y * freq);
    const rr = 1 - Math.abs(2 * n - 1);
    sum += rr * rr * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.05;
  }
  return sum / norm; // 0..1
}

// ─── Heightfield: one long ridge rising to a summit at x≈10 ────────────────

function crestZ(x: number): number {
  return 1.3 * Math.sin(x * 0.22) + 0.4 * Math.sin(x * 0.53 + 1.7);
}

function crestH(x: number): number {
  const t = Math.min(1, Math.max(0, (x + 12) / 22)); // −12 → 10
  let h = 0.7 + 4.4 * t * t * (3 - 2 * t);
  if (x > 10) h -= (x - 10) * (x - 10) * 0.35; // ease down past the summit
  return h;
}

/** Terrain height at (x, z). */
export function terrainHeight(x: number, z: number): number {
  const dz = z - crestZ(x);
  const env = crestH(x) * Math.exp(-(dz * dz) / (2 * 3.1 * 3.1));
  const d = ridged(x * 0.33 + 7.3, z * 0.33 + 3.1, 5);
  const detail = (d - 0.45) * (0.35 + 0.28 * env);
  return Math.max(0.02, env * 0.82 + detail);
}

// ─── Trail: monotonic x from trailhead (−11) to summit (10) ────────────────

/** Centripetal-ish Catmull-Rom through points, clamped at the ends. */
export function catmullRom(pts: V3[], t: number): V3 {
  const n = pts.length;
  const seg = Math.min(n - 2, Math.max(0, Math.floor(t * (n - 1))));
  const lt = t * (n - 1) - seg;
  const p0 = pts[Math.max(0, seg - 1)];
  const p1 = pts[seg];
  const p2 = pts[seg + 1];
  const p3 = pts[Math.min(n - 1, seg + 2)];
  const out: V3 = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const v0 = (p2[i] - p0[i]) * 0.5;
    const v1 = (p3[i] - p1[i]) * 0.5;
    const a = 2 * p1[i] - 2 * p2[i] + v0 + v1;
    const b = -3 * p1[i] + 3 * p2[i] - 2 * v0 - v1;
    out[i] = ((a * lt + b) * lt + v0) * lt + p1[i];
  }
  return out;
}

const TRAIL_PTS: V3[] = ([
  [-11.0,  2.6],
  [-8.5,   1.9],
  [-6.0,   1.2],
  [-3.5,  -0.6],
  [-1.0,   0.8],
  [ 1.8,  -1.1],
  [ 4.4,   0.7],
  [ 6.8,  -0.5],
  [ 8.6,   0.3],
  [10.0,   0.0],
] as Array<[number, number]>).map(([x, dz]) => [x, 0, crestZ(x) + dz] as V3);

/** Point on the trail, t∈[0,1] from trailhead to summit, snapped to terrain. */
export function trailPoint(t: number): V3 {
  const p = catmullRom(TRAIL_PTS, Math.min(1, Math.max(0, t)));
  p[1] = terrainHeight(p[0], p[2]) + 0.05;
  return p;
}
