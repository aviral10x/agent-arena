'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { GameState } from '@/lib/game-engine';

/**
 * Premium 2D court canvas — works everywhere (no WebGL required)
 * Smooth interpolated animations, glow effects, particle bursts
 */

interface CourtCanvasProps {
  gameState:   GameState;
  agentNames:  Record<string, string>;
  agentColors: Record<string, string>;
  className?:  string;
}

// Smooth interpolation state
interface AnimState {
  agents: Record<string, { x: number; y: number; targetX: number; targetY: number }>;
  shuttle: { x: number; y: number; targetX: number; targetY: number };
  particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[];
  lastAction: string;
  flashAlpha: number;
}

const ACTION_COLORS: Record<string, string> = {
  SMASH:   '#ef4444', DROP:  '#a855f7', CLEAR:  '#3b82f6',
  DRIVE:   '#f59e0b', LOB:   '#10b981', BLOCK:  '#6b7280',
  SERVE:   '#f0f0f0', SPECIAL: '#fbbf24',
};

const ACTION_EMOJI: Record<string, string> = {
  SMASH: '💥', DROP: '🎯', CLEAR: '↩️', DRIVE: '⚡',
  LOB: '🌙', BLOCK: '🛡️', SERVE: '🏸', SPECIAL: '✨',
};

export function CourtCanvas({ gameState, agentNames, agentColors, className }: CourtCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<AnimState | null>(null);
  const frameRef  = useRef<number>(0);

  // Initialize animation state
  const getOrCreateAnim = useCallback((): AnimState => {
    if (!animRef.current) {
      const agents: AnimState['agents'] = {};
      for (const [id, pos] of Object.entries(gameState.agentPositions)) {
        agents[id] = { x: pos.x, y: pos.y, targetX: pos.x, targetY: pos.y };
      }
      animRef.current = {
        agents,
        shuttle: {
          x: gameState.shuttlePosition.x, y: gameState.shuttlePosition.y,
          targetX: gameState.shuttlePosition.x, targetY: gameState.shuttlePosition.y,
        },
        particles: [],
        lastAction: '',
        flashAlpha: 0,
      };
    }
    return animRef.current;
  }, []);

  // Update targets when game state changes
  useEffect(() => {
    const anim = getOrCreateAnim();
    for (const [id, pos] of Object.entries(gameState.agentPositions)) {
      if (anim.agents[id]) {
        anim.agents[id].targetX = pos.x;
        anim.agents[id].targetY = pos.y;
      } else {
        anim.agents[id] = { x: pos.x, y: pos.y, targetX: pos.x, targetY: pos.y };
      }
    }
    anim.shuttle.targetX = gameState.shuttlePosition.x;
    anim.shuttle.targetY = gameState.shuttlePosition.y;

    // Spawn particles on action change
    if (gameState.lastAction !== anim.lastAction && gameState.lastAction !== 'SERVE') {
      anim.flashAlpha = 1;
      const color = ACTION_COLORS[gameState.lastAction] ?? '#fff';
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i + Math.random() * 0.5;
        anim.particles.push({
          x: gameState.shuttlePosition.x, y: gameState.shuttlePosition.y,
          vx: Math.cos(angle) * (1.5 + Math.random()), vy: Math.sin(angle) * (1.5 + Math.random()),
          life: 1, color,
        });
      }
      anim.lastAction = gameState.lastAction;
    }
  }, [gameState, getOrCreateAnim]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    function draw() {
      if (!running || !ctx || !canvas) return;
      const W = canvas.width;
      const H = canvas.height;
      const anim = getOrCreateAnim();

      // Lerp positions
      const lerp = 0.12;
      for (const a of Object.values(anim.agents)) {
        a.x += (a.targetX - a.x) * lerp;
        a.y += (a.targetY - a.y) * lerp;
      }
      anim.shuttle.x += (anim.shuttle.targetX - anim.shuttle.x) * lerp * 1.5;
      anim.shuttle.y += (anim.shuttle.targetY - anim.shuttle.y) * lerp * 1.5;

      // Coordinate mapping
      const cx = (pct: number) => W * 0.08 + (pct / 100) * W * 0.84;
      const cy = (pct: number) => H * 0.04 + (pct / 100) * H * 0.92;

      // ── Background ──────────────────────────────────────────────────────
      ctx.fillStyle = '#060d1a';
      ctx.fillRect(0, 0, W, H);

      // Court surface gradient
      const courtGrad = ctx.createLinearGradient(0, H * 0.04, 0, H * 0.96);
      courtGrad.addColorStop(0, '#0d1a2e');
      courtGrad.addColorStop(0.5, '#0a1628');
      courtGrad.addColorStop(1, '#0d1a2e');
      ctx.fillStyle = courtGrad;
      ctx.fillRect(W * 0.08, H * 0.04, W * 0.84, H * 0.92);

      // Court lines
      ctx.strokeStyle = '#1a3050';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(W * 0.08, H * 0.04, W * 0.84, H * 0.92);

      // Service lines
      ctx.strokeStyle = '#142540';
      ctx.lineWidth = 1;
      [[0.33, false], [0.67, false], [0.5, true]].forEach(([frac, isCenterLine]) => {
        ctx.beginPath();
        if (isCenterLine) {
          ctx.moveTo(cx(50), H * 0.04 + H * 0.92 * 0.25);
          ctx.lineTo(cx(50), H * 0.04 + H * 0.92 * 0.75);
        } else {
          ctx.moveTo(W * 0.08, H * 0.04 + H * 0.92 * (frac as number));
          ctx.lineTo(W * 0.92, H * 0.04 + H * 0.92 * (frac as number));
        }
        ctx.stroke();
      });

      // ── Net (glowing) ────────────────────────────────────────────────────
      const netY = H * 0.04 + H * 0.92 * 0.5;
      // Net glow
      ctx.shadowColor = '#4a9eff';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#4a9eff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(W * 0.06, netY);
      ctx.lineTo(W * 0.94, netY);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Net posts
      ctx.fillStyle = '#4a9eff';
      ctx.fillRect(W * 0.06 - 3, netY - 8, 6, 16);
      ctx.fillRect(W * 0.94 - 3, netY - 8, 6, 16);

      // ── Particles ────────────────────────────────────────────────────────
      anim.particles = anim.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
        if (p.life <= 0) return false;
        ctx.globalAlpha = p.life * 0.7;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(cx(p.x), cy(p.y), 3 * p.life, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });
      ctx.globalAlpha = 1;

      // ── Shuttle trail + shuttle ───────────────────────────────────────────
      const sx = cx(anim.shuttle.x);
      const sy = cy(anim.shuttle.y);
      // Trail
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 15;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.arc(sx, sy, 12, 0, Math.PI * 2);
      ctx.fill();
      // Shuttle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // ── Agents ────────────────────────────────────────────────────────────
      const agentIds = Object.keys(gameState.agentPositions);
      for (const id of agentIds) {
        const a = anim.agents[id];
        if (!a) continue;
        const px = cx(a.x);
        const py = cy(a.y);
        const color = agentColors[id] ?? '#4a9eff';
        const name  = agentNames[id] ?? id;
        const mom   = gameState.momentum[id] ?? 50;
        const isHot = mom > 60;
        const isServing = gameState.servingAgentId === id;

        // Momentum glow ring
        if (isHot) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 18;
        }
        ctx.strokeStyle = color + (isHot ? 'aa' : '44');
        ctx.lineWidth = isHot ? 3 : 2;
        ctx.beginPath();
        ctx.arc(px, py, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Agent body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, 12, 0, Math.PI * 2);
        ctx.fill();

        // Inner highlight
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(px - 3, py - 3, 5, 0, Math.PI * 2);
        ctx.fill();

        // Serving indicator
        if (isServing) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(px, py, 22, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Name
        ctx.fillStyle = color;
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(name.slice(0, 10), px, py - 24);

        // Momentum mini-bar
        const barW = 30;
        ctx.fillStyle = '#0d1a2e';
        ctx.fillRect(px - barW / 2, py - 34, barW, 3);
        ctx.fillStyle = mom > 60 ? '#22c55e' : mom < 40 ? '#ef4444' : color;
        ctx.fillRect(px - barW / 2, py - 34, barW * (mom / 100), 3);
      }

      // ── Action flash overlay ──────────────────────────────────────────────
      if (anim.flashAlpha > 0) {
        anim.flashAlpha *= 0.92;
        const fColor = ACTION_COLORS[gameState.lastAction] ?? '#fff';
        ctx.globalAlpha = anim.flashAlpha * 0.3;
        ctx.fillStyle = fColor;
        ctx.beginPath();
        ctx.arc(sx, sy, 40 * (1 + (1 - anim.flashAlpha) * 2), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // ── Action badge (top) ────────────────────────────────────────────────
      if (gameState.lastAction) {
        const emoji = ACTION_EMOJI[gameState.lastAction] ?? '•';
        const label = `${emoji} ${gameState.lastAction}`;
        ctx.font = 'bold 11px system-ui, sans-serif';
        const tw = ctx.measureText(label).width + 16;
        const bx = W / 2 - tw / 2;
        const fColor = ACTION_COLORS[gameState.lastAction] ?? '#fff';

        ctx.fillStyle = fColor + '18';
        ctx.strokeStyle = fColor + '44';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(bx, 4, tw, 20, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = fColor;
        ctx.textAlign = 'center';
        ctx.fillText(label, W / 2, 18);
      }

      ctx.textAlign = 'left';
      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
    };
  }, [gameState, agentNames, agentColors, getOrCreateAnim]);

  return (
    <canvas
      ref={canvasRef}
      width={380}
      height={480}
      className={`rounded-xl border border-white/10 w-full max-w-[380px] ${className ?? ''}`}
      style={{ aspectRatio: '380/480' }}
    />
  );
}
