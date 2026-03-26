"use client";

/**
 * SportCourtCanvas — Canvas overlay for smooth shuttlecock + player animation.
 * Renders on top of the CSS court background (transparent canvas).
 *
 * Features:
 * - Shuttlecock animates along a quadratic bezier arc between agents
 * - Motion trail (fading ghost positions along the path)
 * - Birdie shape: cork sphere + feather cone
 * - Player tokens: avatar portrait or colored diamond, lean in movement direction
 * - Impact burst particles on SMASH / SPECIAL / POINT
 * - Speed lines on DRIVE / SMASH
 */

import { useRef, useEffect, useCallback } from "react";

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
  lastAction: string; // SMASH | DRIVE | DROP | CLEAR | LOB | BLOCK | SPECIAL | SERVE
  tick: number;       // increments every rally step — drives animation reset
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
  angle: number,  // direction of travel in radians
  scale = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2); // nose points along travel dir

  const r = 6 * scale;

  // Feather skirt — cone pointing backward
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

  // Individual feather lines
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(i * (skirtRadius / 2.5), skirtLen);
    ctx.strokeStyle = "rgba(255, 230, 170, 0.3)";
    ctx.lineWidth = 0.5 * scale;
    ctx.stroke();
  }

  // Cork (nose) — white sphere with glow
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
  lean: number,           // radians — tilt toward movement dir
  img: HTMLImageElement | null,
  name: string,
  glowAlpha = 0.6,
) {
  const [r, g, b] = hexToRgb(color);
  const size = 22;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean * 0.3); // subtle lean

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
    // Fallback: colored fill + initial
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

export function SportCourtCanvas({
  agentPosA, agentPosB,
  colorA, colorB,
  avatarA, avatarB,
  nameA, nameB,
  lastAction, tick,
  attackerIsA,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    // Shuttle animation
    shuttleT: 1,          // 0→1 along bezier; 1 = reached target
    shuttleSpeed: 0.035,  // progress per frame
    // Shuttle trail
    trail: [] as [number, number][],
    // Particle effects
    particles: [] as Particle[],
    // Prev agent positions (for lean calc)
    prevA: agentPosA,
    prevB: agentPosB,
    leanA: 0,
    leanB: 0,
    // Loaded images
    imgA: null as HTMLImageElement | null,
    imgB: null as HTMLImageElement | null,
    imagesLoaded: false,
    // Current tick
    lastTick: -1,
    rafId: 0,
  });

  // Load avatar images
  useEffect(() => {
    const s = stateRef.current;
    let loaded = 0;
    const check = () => { if (++loaded >= 2) s.imagesLoaded = true; };
    if (avatarA) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = check;
      img.onerror = check;
      img.src = avatarA;
      s.imgA = img;
    } else { s.imgA = null; check(); }
    if (avatarB) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = check;
      img.onerror = check;
      img.src = avatarB;
      s.imgB = img;
    } else { s.imgB = null; check(); }
  }, [avatarA, avatarB]);

  // On tick change: reset shuttle + spawn particles
  useEffect(() => {
    const s = stateRef.current;
    if (tick === s.lastTick) return;
    s.lastTick = tick;

    // Update lean from position delta
    const dxA = agentPosA.x - s.prevA.x;
    const dyA = agentPosA.y - s.prevA.y;
    const dxB = agentPosB.x - s.prevB.x;
    const dyB = agentPosB.y - s.prevB.y;
    s.leanA = Math.atan2(dyA, dxA);
    s.leanB = Math.atan2(dyB, dxB);
    s.prevA = agentPosA;
    s.prevB = agentPosB;

    // Reset shuttle flight
    s.shuttleT = 0;
    s.trail = [];

    // Action-specific speed + particles
    const canvas = canvasRef.current;
    const w = canvas?.clientWidth ?? 400;
    const h = canvas?.clientHeight ?? 300;
    const ax = (attackerIsA ? agentPosA.x : agentPosB.x) / 100 * w;
    const ay = (attackerIsA ? agentPosA.y : agentPosB.y) / 100 * h;

    if (lastAction === "SMASH" || lastAction === "SPECIAL") {
      s.shuttleSpeed = 0.065;
      spawnBurst(s.particles, ax, ay, attackerIsA ? colorA : colorB, 18, 4);
      // White flash particles
      spawnBurst(s.particles, ax, ay, "#ffffff", 8, 6);
    } else if (lastAction === "DRIVE") {
      s.shuttleSpeed = 0.055;
      spawnBurst(s.particles, ax, ay, attackerIsA ? colorA : colorB, 8, 2.5);
    } else if (lastAction === "POINT") {
      spawnBurst(s.particles, ax, ay, "#ffe6aa", 24, 5);
      spawnBurst(s.particles, ax, ay, "#ffffff", 10, 8);
      s.shuttleT = 1; // no flight on point
    } else {
      s.shuttleSpeed = 0.035;
    }
  }, [tick]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const s = stateRef.current;
    const ax = agentPosA.x / 100 * w;
    const ay = agentPosA.y / 100 * h;
    const bx = agentPosB.x / 100 * w;
    const by = agentPosB.y / 100 * h;

    // Arc control point: midpoint raised above both agents
    const midX = (ax + bx) / 2;
    const peakY = Math.min(ay, by) - (Math.abs(ax - bx) * 0.35 + 30);
    const ctrl: [number, number] = [midX, peakY];
    const start: [number, number] = attackerIsA ? [ax, ay] : [bx, by];
    const end: [number, number] = attackerIsA ? [bx, by] : [ax, ay];

    // ── Speed lines (SMASH/DRIVE) ──────────────────────────────────────────
    if ((lastAction === "SMASH" || lastAction === "DRIVE") && s.shuttleT < 0.5) {
      const [sx, sy] = qbez(s.shuttleT, start, ctrl, end);
      const [sx0, sy0] = qbez(Math.max(0, s.shuttleT - 0.05), start, ctrl, end);
      const angle = Math.atan2(sy - sy0, sx - sx0);
      const lineColor = attackerIsA ? colorA : colorB;
      const [r, g, b] = hexToRgb(lineColor);
      for (let i = 0; i < 6; i++) {
        const spread = (i - 2.5) * 8;
        const px = sx - Math.sin(angle) * spread;
        const py = sy + Math.cos(angle) * spread;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - Math.cos(angle) * (20 + Math.random() * 20), py - Math.sin(angle) * (20 + Math.random() * 20));
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.12 - i * 0.015})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // ── Trail ─────────────────────────────────────────────────────────────
    if (s.shuttleT < 1) {
      s.shuttleT = Math.min(1, s.shuttleT + s.shuttleSpeed);
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

    // ── Shuttlecock ───────────────────────────────────────────────────────
    const [sx, sy] = qbez(s.shuttleT, start, ctrl, end);
    // Direction of travel
    const tPrev = Math.max(0, s.shuttleT - 0.03);
    const [spx, spy] = qbez(tPrev, start, ctrl, end);
    const travelAngle = Math.atan2(sy - spy, sx - spx);

    // Glow behind shuttle
    const glowGrad = ctx.createRadialGradient(sx, sy, 2, sx, sy, 18);
    glowGrad.addColorStop(0, "rgba(255,230,170,0.6)");
    glowGrad.addColorStop(1, "rgba(255,230,170,0)");
    ctx.beginPath();
    ctx.arc(sx, sy, 18, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    drawShuttle(ctx, sx, sy, travelAngle, 1);

    // ── Particles ─────────────────────────────────────────────────────────
    const decayRate = 0.035;
    for (let i = s.particles.length - 1; i >= 0; i--) {
      const p = s.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12; // gravity
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= decayRate;
      if (p.life <= 0) { s.particles.splice(i, 1); continue; }
      const [r, g, b] = hexToRgb(p.color === "#ffffff" ? "#ffffff" : p.color);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${p.life * 0.9})`;
      ctx.fill();
    }

    // ── Player tokens ─────────────────────────────────────────────────────
    drawPlayer(ctx, ax, ay, colorA, s.leanA, s.imgA, nameA);
    drawPlayer(ctx, bx, by, colorB, s.leanB, s.imgB, nameB);

    s.rafId = requestAnimationFrame(draw);
  }, [agentPosA, agentPosB, colorA, colorB, nameA, nameB, attackerIsA, lastAction]);

  useEffect(() => {
    const s = stateRef.current;
    s.rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(s.rafId);
  }, [draw]);

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
