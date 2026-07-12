/**
 * Hero scene orchestrator — scroll-reactive topographic map.
 *
 * Layers:
 *  - offscreen canvas: the full contour map in faint ink (redrawn on resize only)
 *  - main 2D canvas: base map composited with parallax + dynamic strokes —
 *    the ember "altitude sweep" band that climbs contour levels with scroll,
 *    a dash shimmer on the active band while scrolling, and the trail line
 *    with a headlamp dot riding it uphill
 *  - HUD canvas: waypoint markers + altitude readout (own ~30fps cadence)
 *
 * The rAF loop stops when everything has settled (scroll, shimmer, parallax)
 * and wakes on scroll/mousemove/visibility. Reduced motion renders one
 * static frame. No WebGL — plain 2D canvas.
 */
import { HudPainter } from './hud';
import { trailPoint } from './terrain';
import { buildContours, type ContourSet } from './contours';

// altitude readout: trailhead ≈120m → summit ≈710m
const ALT_BASE = 120;
const ALT_GAIN = 590;

// terrain domain extents (kept in sync with terrain.ts)
const SPAN_X = 24;
const SPAN_Z = 16;

const INK_FAINT = 'rgba(244,241,234,0.10)';
const INK_INDEX = 'rgba(244,241,234,0.18)';

const TRAIL_SAMPLES = 128;

export function initHeroScene(): void {
  const section = document.getElementById('hero-scroll');
  if (!section || section.dataset.topoInit) return;
  section.dataset.topoInit = '1';

  const canvas = section.querySelector<HTMLCanvasElement>('#topo-canvas');
  const hudCanvas = section.querySelector<HTMLCanvasElement>('#hud-canvas');
  const sticky = section.querySelector<HTMLElement>('.hero-sticky');
  const progressBar = section.querySelector<HTMLElement>('.hero-progressbar');
  if (!canvas || !hudCanvas || !sticky) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    section.classList.add('hero-flat');
    delete section.dataset.topoInit;
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hud = new HudPainter(hudCanvas);

  // ── contours (coarser grid on small screens) ───────────────────────────
  const coarse = window.innerWidth < 768;
  const contours: ContourSet = buildContours(coarse ? 177 : 257, coarse ? 121 : 177);
  const numLevels = contours.levels.length;
  const ciMeters = Math.round(ALT_GAIN / numLevels);

  // trail samples in terrain space
  const trailXZ: Array<[number, number]> = [];
  for (let i = 0; i <= TRAIL_SAMPLES; i++) {
    const p = trailPoint(i / TRAIL_SAMPLES);
    trailXZ.push([p[0], p[2]]);
  }

  // ── state ──────────────────────────────────────────────────────────────
  let disposed = false;
  let visible = true;
  let raf = 0;
  let width = 1;
  let height = 1;
  let dpr = 1;
  let portrait = false;
  let scrollP = 0;
  let smoothP = 0;
  let altDisplay = ALT_BASE;
  let shimmer = 0;      // 0..1, driven by scroll velocity
  let dashT = 0;        // marching-dash phase
  let lastP = 0;
  let lastFrameT = performance.now();
  let mouseX = 0;
  let mouseY = 0;
  let curMX = 0;
  let curMY = 0;
  let firstFrame = true;

  const nativeTimeline =
    typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()');

  // ── projection: terrain (x,z) → screen; portrait rotates the map 90°
  //    so the trail climbs bottom → summit at the top ─────────────────────
  let scale = 1;
  let ox = 0;
  let oy = 0;

  function projX(x: number, z: number): number {
    return portrait ? ox + z * scale : ox + x * scale;
  }
  function projY(x: number, z: number): number {
    return portrait ? oy - x * scale : oy + z * scale;
  }

  let levelPaths: Path2D[] = [];
  let trailPath: Path2D = new Path2D();
  let trailScreen: Array<[number, number]> = [];
  const base = document.createElement('canvas');
  const baseCtx = base.getContext('2d');

  function rebuildProjection(): void {
    portrait = width / height < 0.85;
    // cover fit: lines always fill the viewport
    scale = portrait
      ? Math.max(width / SPAN_Z, height / SPAN_X) * 1.02
      : Math.max(width / SPAN_X, height / SPAN_Z) * 1.02;
    ox = width / 2;
    oy = height / 2;

    levelPaths = contours.levels.map(({ polylines }) => {
      const path = new Path2D();
      for (const line of polylines) {
        path.moveTo(projX(line[0], line[1]), projY(line[0], line[1]));
        for (let i = 2; i < line.length; i += 2) {
          path.lineTo(projX(line[i], line[i + 1]), projY(line[i], line[i + 1]));
        }
      }
      return path;
    });

    trailScreen = trailXZ.map(([x, z]) => [projX(x, z), projY(x, z)]);
    trailPath = new Path2D();
    trailPath.moveTo(trailScreen[0][0], trailScreen[0][1]);
    for (let i = 1; i < trailScreen.length; i++) {
      trailPath.lineTo(trailScreen[i][0], trailScreen[i][1]);
    }

    // static base map, redrawn only here
    if (baseCtx) {
      base.width = Math.round(width * dpr);
      base.height = Math.round(height * dpr);
      baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      baseCtx.clearRect(0, 0, width, height);
      baseCtx.lineJoin = 'round';
      contours.levels.forEach((lvl, k) => {
        baseCtx.strokeStyle = lvl.index ? INK_INDEX : INK_FAINT;
        baseCtx.lineWidth = lvl.index ? 1.2 : 0.8;
        baseCtx.stroke(levelPaths[k]);
      });
    }
  }

  // ── frame ──────────────────────────────────────────────────────────────
  function renderFrame(): void {
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx!.clearRect(0, 0, width, height);

    // subtle parallax against the cursor
    const px = curMX * -8;
    const py = curMY * 6;

    ctx!.drawImage(base, px, py, width, height);

    ctx!.save();
    ctx!.translate(px, py);
    ctx!.lineJoin = 'round';

    // fractional active level, clamped defensively — an out-of-range index
    // here means stroke(undefined), which would kill the whole loop
    const f = Math.max(0, Math.min(numLevels - 1, smoothP * (numLevels - 1)));
    const k0 = Math.floor(f);
    const frac = f - k0;

    // warm afterglow on the levels already climbed
    for (let k = 0; k < k0; k++) {
      const a = 0.028 + 0.06 * Math.exp(-(f - k) / 2.5);
      ctx!.strokeStyle = `rgba(245,166,35,${a.toFixed(3)})`;
      ctx!.lineWidth = 1;
      ctx!.stroke(levelPaths[k]);
    }

    // active band: two adjacent levels, weight-blended so the sweep is continuous
    for (const [k, w] of [[k0, 1 - frac], [k0 + 1, frac]] as Array<[number, number]>) {
      if (k < 0 || k >= numLevels || w < 0.02) continue;
      const path = levelPaths[k];
      // soft halo
      ctx!.strokeStyle = `rgba(245,166,35,${(0.22 * w).toFixed(3)})`;
      ctx!.lineWidth = 5;
      ctx!.stroke(path);
      // bright core (dimmed slightly while the shimmer dash runs over it)
      ctx!.strokeStyle = `rgba(255,201,77,${(0.95 * w * (1 - 0.35 * shimmer)).toFixed(3)})`;
      ctx!.lineWidth = 1.4;
      ctx!.stroke(path);
      // scroll shimmer: marching dashes along the active contour
      if (shimmer > 0.02) {
        ctx!.setLineDash([12, 7]);
        ctx!.lineDashOffset = -dashT * 46;
        ctx!.strokeStyle = `rgba(255,220,150,${(0.9 * w * shimmer).toFixed(3)})`;
        ctx!.lineWidth = 2.2;
        ctx!.stroke(path);
        ctx!.setLineDash([]);
      }
    }

    // trail: dashed route, solid traveled portion, headlamp dot
    ctx!.setLineDash([3, 6]);
    ctx!.strokeStyle = 'rgba(245,166,35,0.35)';
    ctx!.lineWidth = 1.2;
    ctx!.stroke(trailPath);
    ctx!.setLineDash([]);

    const tEnd = smoothP * TRAIL_SAMPLES;
    const iEnd = Math.floor(tEnd);
    const traveled = new Path2D();
    traveled.moveTo(trailScreen[0][0], trailScreen[0][1]);
    for (let i = 1; i <= iEnd && i < trailScreen.length; i++) {
      traveled.lineTo(trailScreen[i][0], trailScreen[i][1]);
    }
    if (iEnd < TRAIL_SAMPLES) {
      const t = tEnd - iEnd;
      const [ax, ay] = trailScreen[iEnd];
      const [bx, by] = trailScreen[iEnd + 1];
      traveled.lineTo(ax + (bx - ax) * t, ay + (by - ay) * t);
    }
    ctx!.strokeStyle = 'rgba(245,166,35,0.15)';
    ctx!.lineWidth = 5;
    ctx!.stroke(traveled);
    ctx!.strokeStyle = 'rgba(255,201,77,0.9)';
    ctx!.lineWidth = 2;
    ctx!.stroke(traveled);

    // waypoint pins on the trail (mirror the HUD's right-edge markers)
    const wpActive = Math.min(2, Math.floor(smoothP * 3));
    ctx!.font = '9px "JetBrains Mono", ui-monospace, monospace';
    (['WP1', 'WP2', 'SUMMIT'] as const).forEach((label, i) => {
      const t = (i + 1) / 3;
      const s = trailScreen[Math.min(TRAIL_SAMPLES, Math.round(t * TRAIL_SAMPLES))];
      const on = i <= wpActive;
      ctx!.strokeStyle = on ? 'rgba(245,166,35,0.9)' : 'rgba(244,241,234,0.3)';
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.moveTo(s[0] - 5, s[1]); ctx!.lineTo(s[0] + 5, s[1]);
      ctx!.moveTo(s[0], s[1] - 5); ctx!.lineTo(s[0], s[1] + 5);
      ctx!.stroke();
      ctx!.fillStyle = on ? 'rgba(245,166,35,0.9)' : 'rgba(244,241,234,0.35)';
      ctx!.fillText(label, s[0] + 8, s[1] - 6);
    });

    // headlamp
    const hx = traveledEndX(tEnd);
    const hy = traveledEndY(tEnd);
    const glow = ctx!.createRadialGradient(hx, hy, 0, hx, hy, 16);
    glow.addColorStop(0, 'rgba(255,220,150,0.5)');
    glow.addColorStop(1, 'rgba(255,220,150,0)');
    ctx!.fillStyle = glow;
    ctx!.beginPath(); ctx!.arc(hx, hy, 16, 0, Math.PI * 2); ctx!.fill();
    ctx!.strokeStyle = 'rgba(245,166,35,0.6)';
    ctx!.lineWidth = 1;
    ctx!.beginPath(); ctx!.arc(hx, hy, 6, 0, Math.PI * 2); ctx!.stroke();
    ctx!.fillStyle = '#FFEFD0';
    ctx!.beginPath(); ctx!.arc(hx, hy, 3, 0, Math.PI * 2); ctx!.fill();

    ctx!.restore();

    if (firstFrame) {
      firstFrame = false;
      section!.classList.add('hero-live');
    }

    hud.draw(
      {
        progress: smoothP,
        altitude: altDisplay,
        gridCols: contours.cols,
        gridRows: contours.rows,
        ciMeters,
        level: f,
        numLevels,
        reducedMotion,
      },
      performance.now(),
    );
  }

  function traveledEndX(tEnd: number): number {
    const i = Math.min(TRAIL_SAMPLES - 1, Math.floor(tEnd));
    const t = tEnd - i;
    return trailScreen[i][0] + (trailScreen[i + 1][0] - trailScreen[i][0]) * t;
  }
  function traveledEndY(tEnd: number): number {
    const i = Math.min(TRAIL_SAMPLES - 1, Math.floor(tEnd));
    const t = tEnd - i;
    return trailScreen[i][1] + (trailScreen[i + 1][1] - trailScreen[i][1]) * t;
  }

  function renderStill(): void {
    resize();
    smoothP = 0;
    altDisplay = ALT_BASE;
    shimmer = 0;
    renderFrame();
  }

  // ── scroll → progress, phase, altitude ─────────────────────────────────
  function readScroll(): void {
    const range = section!.offsetHeight - window.innerHeight;
    scrollP = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
  }

  function updatePhase(): void {
    const phase = smoothP < 0.22 ? 0 : smoothP < 0.5 ? 1 : smoothP < 0.8 ? 2 : 3;
    if (section!.dataset.phase !== String(phase)) section!.dataset.phase = String(phase);
    if (!nativeTimeline && progressBar) {
      progressBar.style.transform = `scaleX(${smoothP.toFixed(4)})`;
    }
  }

  function tick(now: number): void {
    raf = 0;
    if (disposed || reducedMotion) return;

    // rAF timestamps can be slightly earlier than the performance.now()
    // captured in wake() — a negative dt would push smoothP out of [0,1]
    // and out of the contour-level array's bounds
    const dt = Math.min(0.1, Math.max(0, (now - lastFrameT) / 1000));
    lastFrameT = now;

    readScroll();
    smoothP += (scrollP - smoothP) * Math.min(1, dt * 9);
    smoothP = Math.min(1, Math.max(0, smoothP));
    curMX += (mouseX - curMX) * Math.min(1, dt * 4);
    curMY += (mouseY - curMY) * Math.min(1, dt * 4);

    // shimmer follows scroll velocity, then decays back to a solid line
    const vel = Math.abs(smoothP - lastP) / Math.max(1e-3, dt);
    lastP = smoothP;
    const target = Math.min(1, vel * 14);
    shimmer += (target - shimmer) * Math.min(1, dt * (target > shimmer ? 10 : 3));
    if (shimmer > 0.01) dashT += dt * (0.6 + shimmer * 2.2);

    altDisplay += (ALT_BASE + smoothP * ALT_GAIN - altDisplay) * Math.min(1, dt * 5);

    updatePhase();
    renderFrame();

    // sleep when settled; scroll/mouse listeners wake us up
    const settled =
      Math.abs(scrollP - smoothP) < 5e-4 &&
      shimmer < 0.01 &&
      Math.abs(mouseX - curMX) < 3e-3 &&
      Math.abs(mouseY - curMY) < 3e-3 &&
      Math.abs(ALT_BASE + smoothP * ALT_GAIN - altDisplay) < 0.5;
    if (visible && !settled) raf = requestAnimationFrame(tick);
  }

  function wake(): void {
    if (!raf && visible && !disposed && !reducedMotion) {
      lastFrameT = performance.now();
      raf = requestAnimationFrame(tick);
    }
  }

  // ── sizing ─────────────────────────────────────────────────────────────
  function resize(): void {
    const rect = sticky!.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, width < 768 ? 1.5 : 1.75);
    canvas!.width = Math.round(width * dpr);
    canvas!.height = Math.round(height * dpr);
    hud.resize(width, height, dpr);
    rebuildProjection();
  }
  resize();

  // ── listeners & observers ──────────────────────────────────────────────
  const ro = new ResizeObserver(() => {
    resize();
    if (reducedMotion) renderFrame();
    else wake();
  });
  ro.observe(sticky);

  const io = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
    if (visible) wake();
  });
  io.observe(sticky);

  const onVis = (): void => {
    if (!document.hidden) wake();
  };
  document.addEventListener('visibilitychange', onVis);

  const onScroll = (): void => wake();
  window.addEventListener('scroll', onScroll, { passive: true });

  const onMouse = (e: MouseEvent): void => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
    wake();
  };
  const fine = matchMedia('(pointer: fine)').matches;
  if (!reducedMotion && fine) {
    window.addEventListener('mousemove', onMouse, { passive: true });
  }

  readScroll();
  smoothP = scrollP;
  lastP = scrollP;
  altDisplay = ALT_BASE + smoothP * ALT_GAIN;
  updatePhase();
  if (reducedMotion) renderStill();
  else {
    renderFrame();
    wake();
  }

  // ── teardown on view transition ────────────────────────────────────────
  document.addEventListener(
    'astro:before-swap',
    () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('scroll', onScroll);
      if (fine) window.removeEventListener('mousemove', onMouse);
      delete section.dataset.topoInit;
    },
    { once: true },
  );
}
