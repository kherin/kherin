/**
 * 2D-canvas HUD layer, composited by the browser above the topo-map
 * canvas. Redraws are capped at ~30fps and skipped entirely when nothing
 * changed — the layers are independent, so the map keeps its own cadence.
 */

export interface HudState {
  progress: number;    // scroll progress 0..1
  altitude: number;    // display altitude, metres
  gridCols: number;    // contour sampling grid
  gridRows: number;
  ciMeters: number;    // contour interval, metres
  level: number;       // fractional active contour level
  numLevels: number;
  reducedMotion: boolean;
}

const EMBER = '#F5A623';
const DIM = 'rgba(244,241,234,0.30)';
const FAINT = 'rgba(244,241,234,0.14)';
const MONO = '10px "JetBrains Mono", ui-monospace, monospace';

// altitude range shown on the little gauge (trailhead → summit)
const ALT_MIN = 120;
const ALT_MAX = 710;

export class HudPainter {
  private ctx: CanvasRenderingContext2D | null;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private lastDraw = 0;
  private lastKey = '';

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d');
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    this.w = cssW;
    this.h = cssH;
    this.dpr = dpr;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.lastKey = '';
  }

  draw(s: HudState, now: number): void {
    const ctx = this.ctx;
    if (!ctx || this.w < 10) return;
    if (now - this.lastDraw < 33) return; // ~30fps cap

    // skip identical frames (e.g. idle at rest)
    const key = `${s.progress.toFixed(3)}|${s.altitude | 0}|${s.level.toFixed(2)}`;
    if (key === this.lastKey && !s.reducedMotion) return;
    this.lastKey = key;
    this.lastDraw = now;

    const { w, h, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const inset = Math.max(14, Math.min(26, w * 0.02));
    const compact = w < 640;

    // ── corner brackets ────────────────────────────────────────
    ctx.strokeStyle = FAINT;
    ctx.lineWidth = 1;
    const L = compact ? 14 : 22;
    const corners: Array<[number, number, number, number]> = [
      [inset, inset, 1, 1], [w - inset, inset, -1, 1],
      [inset, h - inset, 1, -1], [w - inset, h - inset, -1, -1],
    ];
    for (const [cx, cy, sx, sy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * L, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + sy * L);
      ctx.stroke();
    }
    // amber tick on the top-left bracket
    ctx.strokeStyle = EMBER;
    ctx.beginPath();
    ctx.moveTo(inset, inset + 6);
    ctx.lineTo(inset, inset + 14);
    ctx.stroke();

    ctx.font = MONO;
    ctx.textBaseline = 'alphabetic';

    // ── waypoint markers (right edge) ──────────────────────────
    if (!compact) {
      const waypoints = ['WP1', 'WP2', 'SUMMIT'];
      const active = Math.min(2, Math.floor(s.progress * 3));
      waypoints.forEach((label, i) => {
        const y = h * 0.42 + i * 26;
        const on = i <= active;
        ctx.fillStyle = on ? EMBER : DIM;
        ctx.fillText(label, w - inset - 46, y);
        ctx.strokeStyle = on ? EMBER : FAINT;
        ctx.beginPath();
        ctx.moveTo(w - inset - 58, y - 3);
        ctx.lineTo(w - inset - 54, y - 3);
        ctx.stroke();
      });
    }

    // ── map diagnostics (bottom-left): engineer-brand easter egg ─
    const bx = inset + 8;
    let by = h - inset - (compact ? 24 : 44);
    ctx.fillStyle = DIM;
    if (!compact) {
      ctx.fillText(`GRID ${s.gridCols}×${s.gridRows}`, bx, by);
      by += 14;
      ctx.fillText(`CI ${s.ciMeters} M`, bx, by);
      by += 14;
    }
    ctx.fillText(`LVL ${Math.min(s.numLevels, Math.ceil(s.level + 0.001))}/${s.numLevels}`, bx, by);

    // ── altitude readout (bottom-right) ────────────────────────
    const sx = w - inset - 8;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(244,241,234,0.75)';
    ctx.font = `${compact ? 20 : 28}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.fillText(String(Math.round(s.altitude)), sx - 44, h - inset - 10);
    ctx.font = MONO;
    ctx.fillStyle = DIM;
    ctx.fillText('ALT M', sx, h - inset - 10);
    // little climb gauge
    const bw = compact ? 44 : 64;
    ctx.fillStyle = FAINT;
    ctx.fillRect(sx - bw, h - inset - 4, bw, 2);
    ctx.fillStyle = EMBER;
    const climb = Math.min(1, Math.max(0, (s.altitude - ALT_MIN) / (ALT_MAX - ALT_MIN)));
    ctx.fillRect(sx - bw, h - inset - 4, bw * climb, 2);
    ctx.textAlign = 'left';
  }
}
