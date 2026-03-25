'use client';

import { useEffect, useRef } from 'react';
import type { GameState } from '@/lib/game-engine';

interface CourtCanvasProps {
  gameState: GameState;
  agentNames:  Record<string, string>;  // agentId → display name
  agentColors: Record<string, string>;  // agentId → hex color
  className?: string;
}

const ACTION_COLORS: Record<string, string> = {
  SMASH:   '#ef4444',
  DROP:    '#8b5cf6',
  CLEAR:   '#3b82f6',
  DRIVE:   '#f59e0b',
  LOB:     '#10b981',
  BLOCK:   '#6b7280',
  SERVE:   '#ffffff',
  SPECIAL: '#fbbf24',
};

export function CourtCanvas({ gameState, agentNames, agentColors, className }: CourtCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // ── Background ─────────────────────────────────────────────────────────────
    ctx.fillStyle = '#060d1a';
    ctx.fillRect(0, 0, W, H);

    // ── Court surface ──────────────────────────────────────────────────────────
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(W * 0.08, H * 0.04, W * 0.84, H * 0.92);

    // Court outline
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2;
    ctx.strokeRect(W * 0.08, H * 0.04, W * 0.84, H * 0.92);

    // ── Court grid (faint lanes) ───────────────────────────────────────────────
    ctx.strokeStyle = '#0d1f35';
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      const x = W * 0.08 + (W * 0.84 / 3) * i;
      ctx.beginPath(); ctx.moveTo(x, H * 0.04); ctx.lineTo(x, H * 0.96); ctx.stroke();
    }
    // Horizontal thirds (excluding net)
    [0.33, 0.67].forEach(frac => {
      const y = H * 0.04 + H * 0.46 * frac;
      ctx.beginPath(); ctx.moveTo(W * 0.08, y); ctx.lineTo(W * 0.92, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W * 0.08, H * 0.5 + H * 0.46 * frac); ctx.lineTo(W * 0.92, H * 0.5 + H * 0.46 * frac); ctx.stroke();
    });

    // ── Net ────────────────────────────────────────────────────────────────────
    const netGrad = ctx.createLinearGradient(W * 0.08, H * 0.5, W * 0.92, H * 0.5);
    netGrad.addColorStop(0,   'transparent');
    netGrad.addColorStop(0.1, '#4a9eff');
    netGrad.addColorStop(0.9, '#4a9eff');
    netGrad.addColorStop(1,   'transparent');
    ctx.strokeStyle = netGrad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(W * 0.08, H * 0.5);
    ctx.lineTo(W * 0.92, H * 0.5);
    ctx.stroke();

    // Net posts
    ctx.fillStyle = '#4a9eff';
    ctx.fillRect(W * 0.08 - 2, H * 0.47, 4, H * 0.06);
    ctx.fillRect(W * 0.92 - 2, H * 0.47, 4, H * 0.06);

    // Net label
    ctx.fillStyle = '#4a9eff44';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NET', W * 0.5, H * 0.485);

    // ── Agents ─────────────────────────────────────────────────────────────────
    const agentIds = Object.keys(gameState.agentPositions);
    for (const agentId of agentIds) {
      const pos   = gameState.agentPositions[agentId];
      const x     = W * 0.08 + (pos.x / 100) * W * 0.84;
      const y     = H * 0.04 + (pos.y / 100) * H * 0.92;
      const color = agentColors[agentId] ?? '#4a9eff';
      const name  = agentNames[agentId] ?? 'Agent';
      const mom   = gameState.momentum[agentId] ?? 50;
      const isHot = mom > 65;

      // Momentum glow
      if (isHot) {
        ctx.shadowBlur  = 20;
        ctx.shadowColor = color;
      }

      // Agent circle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner highlight
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(x - 3, y - 3, 5, 0, Math.PI * 2);
      ctx.fill();

      // Serving indicator (shuttlecock emoji approximate)
      if (gameState.servingAgentId === agentId) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = '12px serif';
        ctx.textAlign = 'center';
        ctx.fillText('🏸', x + 15, y + 4);
      }

      // Name label
      ctx.fillStyle = '#e2e8f0';
      ctx.font      = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(name.slice(0, 9), x, y - 16);

      // Momentum bar
      const barW = 34;
      ctx.fillStyle = '#0d1f35';
      ctx.fillRect(x - barW / 2, y - 28, barW, 4);
      ctx.fillStyle = mom > 65 ? '#22c55e' : mom < 35 ? '#ef4444' : '#f59e0b';
      ctx.fillRect(x - barW / 2, y - 28, barW * (mom / 100), 4);
    }

    // ── Shuttle / ball ─────────────────────────────────────────────────────────
    const sx = W * 0.08 + (gameState.shuttlePosition.x / 100) * W * 0.84;
    const sy = H * 0.04 + (gameState.shuttlePosition.y / 100) * H * 0.92;

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur  = 10;
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // ── Last action badge ──────────────────────────────────────────────────────
    if (gameState.lastAction && gameState.lastAction !== 'SERVE') {
      const badgeColor = ACTION_COLORS[gameState.lastAction] ?? '#ffffff';
      const label      = gameState.lastAction;
      ctx.font = 'bold 11px monospace';
      const tw = ctx.measureText(label).width + 16;

      ctx.fillStyle   = badgeColor + '22';
      ctx.strokeStyle = badgeColor + '66';
      ctx.lineWidth   = 1;
      const bx = W / 2 - tw / 2;
      ctx.beginPath();
      ctx.roundRect?.(bx, H * 0.005, tw, 16, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = badgeColor;
      ctx.textAlign = 'center';
      ctx.fillText(label, W / 2, H * 0.005 + 12);
    }

    // Reset text align
    ctx.textAlign = 'left';
  }, [gameState, agentNames, agentColors]);

  return (
    <canvas
      ref={canvasRef}
      width={340}
      height={420}
      className={`rounded-xl border border-white/10 w-full max-w-[340px] ${className ?? ''}`}
    />
  );
}
