/**
 * Contour extraction: marching squares over the terrain heightfield,
 * with segment chaining so each iso-line is a continuous polyline
 * (continuous paths are what make dash animation read as movement
 * instead of stipple).
 *
 * Runs once at init on the main thread — ~1M cell evaluations, well
 * under the old splat worker's generation cost.
 */
import { terrainHeight, X_MIN, X_MAX, Z_MIN, Z_MAX } from './terrain';

export interface ContourLevel {
  /** terrain-space height of this iso-line */
  level: number;
  /** index contour (every 4th) — drawn brighter, like a printed map */
  index: boolean;
  /** polylines as flat [x0, z0, x1, z1, …] in terrain space */
  polylines: Float32Array[];
}

export interface ContourSet {
  levels: ContourLevel[];
  interval: number;
  cols: number;
  rows: number;
}

/** terrain-height interval between adjacent contour lines */
export const CONTOUR_INTERVAL = 0.25;

interface Seg {
  aKey: number; ax: number; az: number;
  bKey: number; bx: number; bz: number;
  used: boolean;
}

export function buildContours(cols: number, rows: number): ContourSet {
  const dx = (X_MAX - X_MIN) / (cols - 1);
  const dz = (Z_MAX - Z_MIN) / (rows - 1);

  // sample the heightfield once
  const H = new Float32Array(cols * rows);
  let maxH = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const h = terrainHeight(X_MIN + i * dx, Z_MIN + j * dz);
      H[j * cols + i] = h;
      if (h > maxH) maxH = h;
    }
  }

  // edge keys: 2*(j*cols+i) = horizontal edge (i,j)-(i+1,j); +1 = vertical (i,j)-(i,j+1)
  const hKey = (i: number, j: number) => 2 * (j * cols + i);
  const vKey = (i: number, j: number) => 2 * (j * cols + i) + 1;

  const levels: ContourLevel[] = [];
  let k = 0;
  for (let L = CONTOUR_INTERVAL; L < maxH - 0.01; L += CONTOUR_INTERVAL, k++) {
    const segs: Seg[] = [];
    const byKey = new Map<number, number[]>();

    const addSeg = (
      aKey: number, ax: number, az: number,
      bKey: number, bx: number, bz: number,
    ) => {
      const idx = segs.length;
      segs.push({ aKey, ax, az, bKey, bx, bz, used: false });
      (byKey.get(aKey) ?? byKey.set(aKey, []).get(aKey)!).push(idx);
      (byKey.get(bKey) ?? byKey.set(bKey, []).get(bKey)!).push(idx);
    };

    for (let j = 0; j < rows - 1; j++) {
      const x0 = X_MIN, z0 = Z_MIN + j * dz, z1 = z0 + dz;
      for (let i = 0; i < cols - 1; i++) {
        const tl = H[j * cols + i];
        const tr = H[j * cols + i + 1];
        const bl = H[(j + 1) * cols + i];
        const br = H[(j + 1) * cols + i + 1];
        const code =
          (tl >= L ? 1 : 0) | (tr >= L ? 2 : 0) | (br >= L ? 4 : 0) | (bl >= L ? 8 : 0);
        if (code === 0 || code === 15) continue;

        const xa = x0 + i * dx, xb = xa + dx;
        // interpolated crossing points on each cell edge
        const top = (): [number, number, number] =>
          [hKey(i, j), xa + dx * ((L - tl) / (tr - tl)), z0];
        const bottom = (): [number, number, number] =>
          [hKey(i, j + 1), xa + dx * ((L - bl) / (br - bl)), z1];
        const left = (): [number, number, number] =>
          [vKey(i, j), xa, z0 + dz * ((L - tl) / (bl - tl))];
        const right = (): [number, number, number] =>
          [vKey(i + 1, j), xb, z0 + dz * ((L - tr) / (br - tr))];

        const emit = (
          a: [number, number, number],
          b: [number, number, number],
        ) => addSeg(a[0], a[1], a[2], b[0], b[1], b[2]);

        switch (code) {
          case 1:  emit(left(), top()); break;
          case 2:  emit(top(), right()); break;
          case 3:  emit(left(), right()); break;
          case 4:  emit(right(), bottom()); break;
          case 6:  emit(top(), bottom()); break;
          case 7:  emit(left(), bottom()); break;
          case 8:  emit(bottom(), left()); break;
          case 9:  emit(top(), bottom()); break;
          case 11: emit(right(), bottom()); break;
          case 12: emit(left(), right()); break;
          case 13: emit(top(), right()); break;
          case 14: emit(left(), top()); break;
          case 5: // ambiguous saddles: resolve with the cell-center average
          case 10: {
            const centerHigh = (tl + tr + bl + br) / 4 >= L;
            const pair = code === 5 ? centerHigh : !centerHigh;
            if (pair) { emit(top(), right()); emit(bottom(), left()); }
            else { emit(left(), top()); emit(right(), bottom()); }
            break;
          }
        }
      }
    }

    // chain segments into polylines by walking shared edge keys
    const polylines: Float32Array[] = [];
    const nextUnused = (key: number, self: number): number => {
      const list = byKey.get(key);
      if (!list) return -1;
      for (const idx of list) if (idx !== self && !segs[idx].used) return idx;
      return -1;
    };

    for (let s = 0; s < segs.length; s++) {
      if (segs[s].used) continue;
      segs[s].used = true;
      const pts: number[] = [segs[s].ax, segs[s].az, segs[s].bx, segs[s].bz];
      // walk forward from b, then backward from a
      for (const dir of [1, -1] as const) {
        let key = dir === 1 ? segs[s].bKey : segs[s].aKey;
        let cur = s;
        for (;;) {
          const nxt = nextUnused(key, cur);
          if (nxt < 0) break;
          const seg = segs[nxt];
          seg.used = true;
          const atA = seg.aKey === key;
          const px = atA ? seg.bx : seg.ax;
          const pz = atA ? seg.bz : seg.az;
          if (dir === 1) pts.push(px, pz);
          else pts.unshift(px, pz);
          key = atA ? seg.bKey : seg.aKey;
          cur = nxt;
        }
      }
      if (pts.length >= 6) polylines.push(new Float32Array(pts));
    }

    levels.push({ level: L, index: (k + 1) % 4 === 0, polylines });
  }

  return { levels, interval: CONTOUR_INTERVAL, cols, rows };
}
