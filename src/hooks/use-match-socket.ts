"use client";

/**
 * useMatchSocket — PartyKit WebSocket hook for live match rooms.
 *
 * Connects to the PartyKit match room for a competition.
 * Handles:
 *   - Joining as a player (with agentId + stats) or spectator
 *   - Receiving real-time game state updates
 *   - Sending trainer commands during the command window
 *   - Automatic reconnection (partysocket handles this)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import PartySocket from "partysocket";
import type { GameState, RallyFrame } from "@/lib/game-engine";

export type MatchSide = "a" | "b" | "spectator";

export interface PlayerJoinConfig {
  userId: string;
  agentId: string;
  agentName: string;
  agentColor: string;
  side: "a" | "b";
  stats: { speed: number; power: number; stamina: number; accuracy: number };
  strategy: string;
  risk: string;
  specialMoves: string[];
}

export interface RallyEvent {
  description: string;
  action: string;
  attackerSide: "a" | "b";
  rallyLength: number;
  pointWon: boolean;
  pointWinnerId: string;
}

export interface MatchState {
  gameState: GameState | null;
  status: "connecting" | "waiting" | "live" | "command_window" | "settled";
  side: MatchSide;
  commandWindowMs: number;   // ms remaining in current command window
  commandWindowOpen: boolean;
  lastRally: RallyEvent | null;
  /** Batch rally frames for client-side sequencer playback */
  batchFrames: RallyFrame[] | null;
  players: Partial<Record<"a" | "b", { agentId: string; agentName: string; agentColor: string }>>;
  winner: { agentId: string; agentName: string } | null;
  statusMessage: string;
}

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999";

export function useMatchSocket(
  competitionId: string,
  playerConfig: PlayerJoinConfig | null, // null = spectate
) {
  const socketRef = useRef<PartySocket | null>(null);
  const cmdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<MatchState>({
    gameState: null,
    status: "connecting",
    side: "spectator",
    commandWindowMs: 0,
    commandWindowOpen: false,
    lastRally: null,
    batchFrames: null,
    players: {},
    winner: null,
    statusMessage: "Connecting...",
  });

  const sendCommand = useCallback((text: string) => {
    socketRef.current?.send(JSON.stringify({ type: "command", text }));
  }, []);

  useEffect(() => {
    if (!competitionId) return;

    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: competitionId,
    });
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      // Join as player or spectator
      if (playerConfig) {
        socket.send(JSON.stringify({ type: "join", ...playerConfig }));
      } else {
        socket.send(JSON.stringify({ type: "spectate", userId: "anon-" + Math.random().toString(36).slice(2) }));
      }
    });

    socket.addEventListener("message", (evt) => {
      let msg: any;
      try { msg = JSON.parse(evt.data); } catch { return; }

      switch (msg.type) {
        case "connected":
          setState(s => ({
            ...s,
            side: msg.side,
            gameState: msg.gameState ?? s.gameState,
            players: msg.players ?? s.players,
            status: s.status === "connecting" ? "waiting" : s.status,
            statusMessage: "Connected",
          }));
          break;

        case "waiting":
          setState(s => ({ ...s, status: "waiting", statusMessage: msg.message }));
          break;

        case "match_start":
          setState(s => ({ ...s, status: "live", gameState: msg.gameState, statusMessage: "Match started!" }));
          break;

        case "tick_open":
          // Command window opened — start a countdown
          if (cmdTimerRef.current) clearTimeout(cmdTimerRef.current);
          setState(s => ({ ...s, commandWindowOpen: true, commandWindowMs: msg.timeMs, statusMessage: "Send your command!" }));
          // Auto-close countdown in state
          cmdTimerRef.current = setTimeout(() => {
            setState(s => ({ ...s, commandWindowOpen: false, commandWindowMs: 0 }));
          }, msg.timeMs);
          break;

        case "tick_close":
          setState(s => ({ ...s, commandWindowOpen: false, commandWindowMs: 0, statusMessage: "AI deciding..." }));
          break;

        case "rally":
          setState(s => ({
            ...s,
            gameState: msg.gameState,
            status: "live",
            commandWindowOpen: false,
            // If server sent batch frames, store them for the sequencer
            batchFrames: msg.batchFrames ?? null,
            lastRally: {
              description: msg.description,
              action: msg.action,
              attackerSide: msg.attackerSide,
              rallyLength: msg.rallyLength,
              pointWon: msg.pointWon,
              pointWinnerId: msg.pointWinnerId,
            },
            statusMessage: msg.description,
          }));
          break;

        case "match_over":
          setState(s => ({
            ...s,
            gameState: msg.gameState,
            status: "settled",
            winner: { agentId: msg.winnerId, agentName: msg.winnerName },
            statusMessage: `${msg.winnerName} wins!`,
          }));
          break;
      }
    });

    socket.addEventListener("error", () => {
      setState(s => ({ ...s, statusMessage: "Connection error — retrying..." }));
    });

    return () => {
      socket.close();
      socketRef.current = null;
      if (cmdTimerRef.current) clearTimeout(cmdTimerRef.current);
    };
  }, [competitionId]);

  return { ...state, sendCommand };
}
