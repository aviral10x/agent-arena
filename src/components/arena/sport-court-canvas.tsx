"use client";

/**
 * SportCourtCanvas — Canvas overlay for smooth shuttlecock + player animation.
 * Renders on top of the CSS court background (transparent canvas).
 *
 * PERF: All props are stored in refs to avoid recreating the draw callback.
 * The RAF loop runs continuously without React dependency churn.
 * Delta-time compensation ensures frame-rate-independent animation.
 */

import { useRef, useEffect } from "react";

export type AgentPos = { x: number; y: number }; // 0–100 percent of container

interface Props {
  agentPosA: AgentPos;
  agentPosB: AgentPos;
  colorA: string;
  colorB: string;
  avatarA: string | null;
  avatarB: string | null;
  nameA: string;
  nameB: string;
  lastAction: string;
  tick: number;
  attackerIsA: boolean;
}

// ── hex → [r,g,b] ────────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3
    ? h.split("").map(c => c + c).join("")
    : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ── quadratic bezier point ───────────────────────────────────────────────────
function qbez(t: number, p0: [number,number], p1: [number,number], p2: [number,number]): [number,number] {
  const mt = 1 - t;
  return [
    mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0],
    mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1],
  ];
}

// ── draw one shuttlecock (birdie) ────────────────────────────────────────────
function drawShuttle(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  angle: number,
  scale = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);

  const r = 6 * scale;

  // Feather skirt
  const skirtLen = 14 * scale;
  const skirtRadius = 9 * scale;
  ctx.beginPath();
  ctx.moveTo(-skirtRadius, skirtLen);
  ctx.quadraticCurveTo(0, skirtLen * 0.3, skirtRadius, skirtLen);
  ctx.quadraticCurveTo(0, skirtLen * 1.4, -skirtRadius, skirtLen);
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.strokeStyle = "rgba(255, 230, 170, 0.5)";
  ctx.lineWidth = 0.8 * scale;
  ctx.fill();
  ctx.stroke();

  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(i * (skirtRadius / 2.5), skirtLen);
    ctx.strokeStyle = "rgba(255, 230, 170, 0.3)";
    ctx.lineWidth = 0.5 * scale;
    ctx.stroke();
  }

  // Cork nose
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.5, "#ffe6aa");
  grad.addColorStop(1, "#ffb340");
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.restore();
}

// ── draw player token ────────────────────────────────────────────────────────
function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  color: string,
  lean: number,
  img: HTMLImageElement | null,
  name: string,
  glowAlpha = 0.6,
) {
  const [r, g, b] = hexToRgb(color);
  const size = 22;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean * 0.3);

  // Ground shadow
  ctx.beginPath();
  ctx.ellipse(0, size * 0.9, size * 0.7, size * 0.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0,0,0,0.4)`;
  ctx.fill();

  // Outer glow ring
  const glowGrad = ctx.createRadialGradient(0, 0, size * 0.7, 0, 0, size * 1.6);
  glowGrad.addColorStop(0, `rgba(${r},${g},${b},${glowAlpha})`);
  glowGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.beginPath();
  ctx.arc(0, 0, size * 1.6, 0, Math.PI * 2);
  ctx.fillStyle = glowGrad;
  ctx.fill();

  // Portrait clipped to diamond
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.75, 0);
  ctx.lineTo(0, size);
  ctx.lineTo(-size * 0.75, 0);
  ctx.closePath();
  ctx.clip();

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, -size * 0.75, -size, size * 1.5, size * 2);
  } else {
    ctx.fillStyle = `rgba(${r},${g},${b},0.25)`;
    ctx.fill();
    ctx.fillStyle = color;
    ctx.font = `bold ${size * 0.8}px 'Bebas Neue', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name.slice(0, 1).toUpperCase(), 0, 0);
  }
  ctx.restore();

  // Diamond border
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.75, 0);
  ctx.lineTo(0, size);
  ctx.lineTo(-size * 0.75, 0);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Name tag
  ctx.font = `bold 9px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = color;
  ctx.fillText(name.slice(0, 8).toUpperCase(), 0, size + 4);

  ctx.restore();
}

// ── Particle system ──────────────────────────────────────────────────────────
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
}

function spawnBurst(
  particles: Particle[],
  x: number, y: number,
  color: string,
  count: number,
  speed: number,
) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const v = speed * (0.5 + Math.random() * 0.8);
    particles.push({
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: 1,
      maxLife: 1,
      size: 1.5 + Math.random() * 3,
      color,
    });
  }
}

// Target 60fps — 16.67ms per frame
const TARGET_DT = 1000 / 60;

export function SportCourtCanvas(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Store ALL props in a ref so the draw loop never needs to restart ──
  const propsRef = useRef(props);
  propsRef.current = props; // Update every render, zero cost

  const stateRef = useRef({
    shuttleT: 1,
    shuttleSpeed: 0.035,
    trail: [] as [number, number][],
    particles: [] as Particle[],
    // Smooth lerp state — rendered positions interpolate toward props
    renderA: { x: props.agentPosA.x, y: props.agentPosA.y },
    renderB: { x: props.agentPosB.x, y: props.agentPosB.y },
    prevA: props.agentPosA,
    prevB: props.agentPosB,
    leanA: 0,
    leanB: 0,
    imgA: null as HTMLImageElement | null,
    imgB: null as HTMLImageElement | null,
    imagesLoaded: false,
    lastTick: -1,
    rafId: 0,
    lastFrameTime: 0,
  });

  // Load avatar images
  useEffect(() => {
    const s = stateRef.current;
    let loaded = 0;
    const check = () => { if (++loaded >= 2) s.imagesLoaded = true; };
    if (props.avatarA) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = check;
      img.onerror = check;
      img.src = props.avatarA;
      s.imgA = img;
    } else { s.imgA = null; check(); }
    if (props.avatarB) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = check;
      img.onerror = check;
      img.src = props.avatarB;
      s.imgB = img;
    } else { s.imgB = null; check(); }
  }, [props.avatarA, props.avatarB]);

  // On tick change: reset shuttle + spawn particles (reads from propsRef)
  useEffect(() => {
    const s = stateRef.current;
    const p = propsRef.current;
    if (p.tick === s.lastTick) return;
    s.lastTick = p.tick;

    const dxA = p.agentPosA.x - s.prevA.x;
    const dyA = p.agentPosA.y - s.prevA.y;
    const dxB = p.agentPosB.x - s.prevB.x;
    const dyB = p.agentPosB.y - s.prevB.y;
    s.leanA = Math.atan2(dyA, dxA);
    s.leanB = Math.atan2(dyB, dxB);
    s.prevA = p.agentPosA;
    s.prevB = p.agentPosB;

    s.shuttleT = 0;
    s.trail = [];

    const canvas = canvasRef.current;
    const w = canvas?.clientWidth ?? 400;
    const h = canvas?.clientHeight ?? 300;
    const ax = (p.attackerIsA ? p.agentPosA.x : p.agentPosB.x) / 100 * w;
    const ay = (p.attackerIsA ? p.agentPosA.y : p.agentPosB.y) / 100 * h;

    if (p.lastAction === "SMASH" || p.lastAction === "SPECIAL") {
      s.shuttleSpeed = 0.065;
      spawnBurst(s.particles, ax, ay, p.attackerIsA ? p.colorA : p.colorB, 18, 4);
      spawnBurst(s.particles, ax, ay, "#ffffff", 8, 6);
    } else if (p.lastAction === "DRIVE") {
      s.shuttleSpeed = 0.055;
      spawnBurst(s.particles, ax, ay, p.attackerIsA ? p.colorA : p.colorB, 8, 2.5);
    } else if (p.lastAction === "POINT") {
      spawnBurst(s.particles, ax, ay, "#ffe6aa", 24, 5);
      spawnBurst(s.particles, ax, ay, "#ffffff", 10, 8);
      s.shuttleT = 1;
    } else {
      s.shuttleSpeed = 0.035;
    }
  }, [props.tick]);

  // ── Single RAF loop that runs from mount to unmount — never restarts ──
  useEffect(() => {
    const s = stateRef.current;
    s.lastFrameTime = performance.now();

    function draw(now: number) {
      const canvas = canvasRef.current;
      if (!canvas) { s.rafId = requestAnimationFrame(draw); return; }
      const ctx = canvas.getContext("2d");
      if (!ctx) { s.rafId = requestAnimationFrame(draw); return; }

      // Delta-time compensation: normalize to 60fps
      const dt = Math.min(now - s.lastFrameTime, 50); // cap at 50ms (20fps min)
      s.lastFrameTime = now;
      const dtScale = dt / TARGET_DT; // 1.0 at 60fps, 2.0 at 30fps, etc.

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Read current props from ref (zero-cost, no dependency)
      const p = propsRef.current;

      // Smooth lerp rendered positions toward target (frame-rate compensated)
      const LERP = 1 - Math.pow(0.92, dtScale); // ~0.08 at 60fps, auto-adjusts
      s.renderA.x += (p.agentPosA.x - s.renderA.x) * LERP;
      s.renderA.y += (p.agentPosA.y - s.renderA.y) * LERP;
      s.renderB.x += (p.agentPosB.x - s.renderB.x) * LERP;
      s.renderB.y += (p.agentPosB.y - s.renderB.y) * LERP;

      const ax = s.renderA.x / 100 * w;
      const ay = s.renderA.y / 100 * h;
      const bx = s.renderB.x / 100 * w;
      const by = s.renderB.y / 100 * h;

      // Arc control point
      const midX = (ax + bx) / 2;
      const peakY = Math.min(ay, by) - (Math.abs(ax - bx) * 0.35 + 30);
      const ctrl: [number, number] = [midX, peakY];
      const start: [number, number] = p.attackerIsA ? [ax, ay] : [bx, by];
      const end: [number, number] = p.attackerIsA ? [bx, by] : [ax, ay];

      // ── Speed lines (SMASH/DRIVE) ──
      if ((p.lastAction === "SMASH" || p.lastAction === "DRIVE") && s.shuttleT < 0.5) {
        const [sx, sy] = qbez(s.shuttleT, start, ctrl, end);
        const [sx0, sy0] = qbez(Math.max(0, s.shuttleT - 0.05), start, ctrl, end);
        const angle = Math.atan2(sy - sy0, sx - sx0);
        const lineColor = p.attackerIsA ? p.colorA : p.colorB;
        const [r, g, b] = hexToRgb(lineColor);
        for (let i = 0; i < 6; i++) {
          const spread = (i - 2.5) * 8;
          const px = sx - Math.sin(angle) * spread;
          const py = sy + Math.cos(angle) * spread;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(
            px - Math.cos(angle) * (20 + Math.random() * 20),
            py - Math.sin(angle) * (20 + Math.random() * 20),
          );
          ctx.strokeStyle = `rgba(${r},${g},${b},${0.12 - i * 0.015})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // ── Trail + shuttle advance (delta-time compensated) ──
      if (s.shuttleT < 1) {
        s.shuttleT = Math.min(1, s.shuttleT + s.shuttleSpeed * dtScale);
        const pos = qbez(s.shuttleT, start, ctrl, end);
        s.trail.push(pos);
        if (s.trail.length > 18) s.trail.shift();
      }

      for (let i = 0; i < s.trail.length; i++) {
        const [tx, ty] = s.trail[i];
        const alpha = (i / s.trail.length) * 0.55;
        const r2 = 5 * (i / s.trail.length);
        ctx.beginPath();
        ctx.arc(tx, ty, r2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 230, 170, ${alpha})`;
        ctx.fill();
      }

      // ── Shuttlecock ──
      const [sx, sy] = qbez(s.shuttleT, start, ctrl, end);
      const tPrev = Math.max(0, s.shuttleT - 0.03);
      const [spx, spy] = qbez(tPrev, start, ctrl, end);
      const travelAngle = Math.atan2(sy - spy, sx - spx);

      const glowGrad = ctx.createRadialGradient(sx, sy, 2, sx, sy, 18);
      glowGrad.addColorStop(0, "rgba(255,230,170,0.6)");
      glowGrad.addColorStop(1, "rgba(255,230,170,0)");
      ctx.beginPath();
      ctx.arc(sx, sy, 18, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      drawShuttle(ctx, sx, sy, travelAngle, 1);

      // ── Particles (delta-time compensated) ──
      const decayRate = 0.035 * dtScale;
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const particle = s.particles[i];
        particle.x += particle.vx * dtScale;
        particle.y += particle.vy * dtScale;
        particle.vy += 0.12 * dtScale; // gravity
        particle.vx *= Math.pow(0.95, dtScale);
        particle.vy *= Math.pow(0.95, dtScale);
        particle.life -= decayRate;
        if (particle.life <= 0) { s.particles.splice(i, 1); continue; }
        const [r, g, b] = hexToRgb(particle.color === "#ffffff" ? "#ffffff" : particle.color);
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${particle.life * 0.9})`;
        ctx.fill();
      }

      // ── Player tokens ──
      drawPlayer(ctx, ax, ay, p.colorA, s.leanA, s.imgA, p.nameA);
      drawPlayer(ctx, bx, by, p.colorB, s.leanB, s.imgB, p.nameB);

      s.rafId = requestAnimationFrame(draw);
    }

    s.rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(s.rafId);
  }, []); // ← EMPTY deps: loop runs once, reads propsRef each frame

  // Resize canvas to match display size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    });
    ro.observe(canvas);
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    return () => ro.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
}
