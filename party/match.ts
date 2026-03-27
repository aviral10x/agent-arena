/**
 * PartyKit Match Server
 *
 * One room per competition (room ID = competitionId).
 * Handles:
 *   - Player WebSocket connections (identified by userId + agentId)
 *   - 2.5s command window per rally for human trainer input
 *   - AI fallback via Groq when no command received
 *   - Rally resolution via game-engine.ts
 *   - Broadcasting game state to all clients (players + spectators)
 *   - Persisting match result to Next.js API on completion
 */

import type * as Party from "partykit/server";
import {
  initGameState,
  resolveRally,
  type GameState,
  type ShotDecision,
  type SportAction,
} from "../src/lib/game-engine";
import { generateMockDecision } from "../src/lib/sport-agent-runner";

// ── Types ────────────────────────────────────────────────────────────────────

interface PlayerInfo {
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

// Messages client → server
type ClientMsg =
  | { type: "join"; userId: string; agentId: string; agentName: string; agentColor: string; side: "a" | "b"; stats: PlayerInfo["stats"]; strategy: string; risk: string; specialMoves: string[] }
  | { type: "spectate"; userId: string }
  | { type: "command"; text: string };

// Messages server → client
type ServerMsg =
  | { type: "connected"; side: "a" | "b" | "spectator"; gameState: GameState | null; players: Partial<Record<"a" | "b", { agentId: string; agentName: string; agentColor: string }>> }
  | { type: "waiting"; message: string }
  | { type: "match_start"; gameState: GameState }
  | { type: "tick_open"; timeMs: number; rallyCount: number }
  | { type: "tick_close" }
  | { type: "rally"; gameState: GameState; description: string; action: string; attackerSide: "a" | "b"; rallyLength: number; pointWon: boolean; pointWinnerId: string }
  | { type: "match_over"; winnerId: string; winnerName: string; gameState: GameState }
  | { type: "error"; message: string };

const COMMAND_WINDOW_MS = 2500;
// Variable tick interval — break rhythmic pattern
function tickInterval(gameState: GameState | null): number {
  if (!gameState) return 3000;
  const base = 2800;
  const jitter = Math.random() * 800; // 0–800ms random
  // After a point: longer pause (celebration / reset)
  if (gameState.rallyLength === 0) return base + 700 + jitter;
  // Deep in rally: faster pace
  if (gameState.rallyLength > 6) return base - 400 + jitter;
  return base + jitter;
}

// ── Room state ───────────────────────────────────────────────────────────────

export default class MatchRoom implements Party.Server {
  options: Party.ServerOptions = { hibernate: false };

  gameState: GameState | null = null;
  sport: "badminton" = "badminton";
  players: Map<string, PlayerInfo> = new Map();
  connections: Map<string, Party.Connection> = new Map();
  pendingCommands: Map<string, string> = new Map();
  tickTimer: ReturnType<typeof setTimeout> | null = null;
  commandTimer: ReturnType<typeof setTimeout> | null = null;
  matchTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  isRunning = false;
  matchOver = false;
  matchStartedAt: number = 0;

  constructor(readonly room: Party.Room) {}

  // ── Connection lifecycle ──────────────────────────────────────────────────

  onConnect(conn: Party.Connection) {
    // Send current state immediately on connect
    conn.send(JSON.stringify({
      type: "connected",
      side: "spectator",
      gameState: this.gameState,
      players: this.getPlayerSummary(),
    } satisfies ServerMsg));
  }

  onClose(conn: Party.Connection) {
    // Find and remove disconnected user
    for (const [userId, c] of this.connections.entries()) {
      if (c.id === conn.id) {
        this.connections.delete(userId);
        break;
      }
    }
  }

  // ── Message handling ──────────────────────────────────────────────────────

  async onMessage(raw: string, conn: Party.Connection) {
    let msg: ClientMsg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === "join") {
      this.handleJoin(msg, conn);
    } else if (msg.type === "spectate") {
      this.connections.set(msg.userId, conn);
      conn.send(JSON.stringify({
        type: "connected",
        side: "spectator",
        gameState: this.gameState,
        players: this.getPlayerSummary(),
      } satisfies ServerMsg));
    } else if (msg.type === "command") {
      // Find which agent this connection belongs to
      for (const [userId, c] of this.connections.entries()) {
        if (c.id === conn.id) {
          const player = this.players.get(userId);
          if (player) this.pendingCommands.set(player.agentId, msg.text);
          break;
        }
      }
    }
  }

  // ── Join ─────────────────────────────────────────────────────────────────

  handleJoin(msg: Extract<ClientMsg, { type: "join" }>, conn: Party.Connection) {
    const player: PlayerInfo = {
      userId: msg.userId,
      agentId: msg.agentId,
      agentName: msg.agentName,
      agentColor: msg.agentColor,
      side: msg.side,
      stats: msg.stats,
      strategy: msg.strategy,
      risk: msg.risk,
      specialMoves: msg.specialMoves,
    };
    this.players.set(msg.userId, player);
    this.connections.set(msg.userId, conn);

    conn.send(JSON.stringify({
      type: "connected",
      side: msg.side,
      gameState: this.gameState,
      players: this.getPlayerSummary(),
    } satisfies ServerMsg));

    // Broadcast updated player list to all
    this.broadcast({ type: "connected", side: msg.side, gameState: this.gameState, players: this.getPlayerSummary() });

    const playerCount = [...this.players.values()].filter(p => p.side === "a" || p.side === "b").length;

    if (playerCount === 1) {
      this.broadcast({ type: "waiting", message: "Waiting for opponent..." });
    } else if (playerCount >= 2 && !this.isRunning && !this.matchOver) {
      this.startMatch();
    }
  }

  // ── Match lifecycle ───────────────────────────────────────────────────────

  startMatch() {
    const playerA = [...this.players.values()].find(p => p.side === "a");
    const playerB = [...this.players.values()].find(p => p.side === "b");
    if (!playerA || !playerB) return;

    this.gameState = initGameState(this.sport, [playerA.agentId, playerB.agentId], playerA.agentId);
    this.isRunning = true;
    this.matchStartedAt = Date.now();

    this.broadcast({ type: "match_start", gameState: this.gameState });
    this.scheduleNextTick();

    // Match timeout: force-settle after 10 minutes
    const MATCH_TIMEOUT_MS = 10 * 60 * 1000;
    this.matchTimeoutTimer = setTimeout(() => {
      if (!this.matchOver && this.isRunning && this.gameState) {
        this.forceSettle();
      }
    }, MATCH_TIMEOUT_MS);
  }

  scheduleNextTick() {
    if (this.tickTimer) clearTimeout(this.tickTimer);
    this.tickTimer = setTimeout(() => this.openCommandWindow(), tickInterval(this.gameState));
  }

  openCommandWindow() {
    if (!this.isRunning || this.matchOver || !this.gameState) return;
    const rallyCount = this.gameState.rallyCount;

    this.broadcast({ type: "tick_open", timeMs: COMMAND_WINDOW_MS, rallyCount });

    this.commandTimer = setTimeout(() => this.resolveNextRally(), COMMAND_WINDOW_MS);
  }

  async resolveNextRally() {
    if (!this.isRunning || this.matchOver || !this.gameState) return;

    this.broadcast({ type: "tick_close" });

    const playerA = [...this.players.values()].find(p => p.side === "a")!;
    const playerB = [...this.players.values()].find(p => p.side === "b")!;

    // Inject pending trainer commands into game state
    const gs = { ...this.gameState };
    gs.trainerCommands = {
      [playerA.agentId]: this.pendingCommands.get(playerA.agentId) ?? null,
      [playerB.agentId]: this.pendingCommands.get(playerB.agentId) ?? null,
    };
    this.pendingCommands.clear();

    // Get AI decisions for both agents
    const [decA, decB] = await Promise.all([
      this.getDecision(playerA, gs, playerB.agentId, playerB.agentName),
      this.getDecision(playerB, gs, playerA.agentId, playerA.agentName),
    ]);

    const decisions = { [playerA.agentId]: decA, [playerB.agentId]: decB };
    const agentStats = {
      [playerA.agentId]: playerA.stats,
      [playerB.agentId]: playerB.stats,
    };

    const result = resolveRally(gs, decisions, agentStats);
    this.gameState = result.newGameState;

    const attackerSide: "a" | "b" =
      result.attackerId === playerA.agentId ? "a" : "b";

    this.broadcast({
      type: "rally",
      gameState: this.gameState,
      description: result.description,
      action: result.action,
      attackerSide,
      rallyLength: result.rallyLength,
      pointWon: result.isWinner,
      pointWinnerId: result.pointWinnerId,
    });

    if (result.matchOver || this.gameState.matchOver) {
      this.matchOver = true;
      this.isRunning = false;
      const winner = this.gameState.winner === playerA.agentId ? playerA : playerB;
      this.broadcast({ type: "match_over", winnerId: winner.agentId, winnerName: winner.agentName, gameState: this.gameState });
      // Persist to DB via Next.js API
      this.persistResult(winner.agentId).catch(console.error);
    } else {
      this.scheduleNextTick();
    }
  }

  // ── AI decision ───────────────────────────────────────────────────────────

  async getDecision(
    player: PlayerInfo,
    gameState: GameState,
    opponentId: string,
    opponentName: string,
  ): Promise<ShotDecision> {
    const myScore = gameState.sets[gameState.currentSet]?.agentScores[player.agentId] ?? 0;
    const oppScore = gameState.sets[gameState.currentSet]?.agentScores[opponentId] ?? 0;
    const momentum = gameState.momentum[player.agentId] ?? 50;
    const trainerCmd = gameState.trainerCommands[player.agentId];

    const shuttleH = gameState.shuttleHeight ?? 2.0;
    const fatigue  = (gameState.fatigue as Record<string,number>)?.[player.agentId] ?? 0;
    const heightLabel =
      shuttleH >= 2.5 ? "OVERHEAD — prime smash height" :
      shuttleH >= 2.0 ? "HIGH — overhead drop/clear/smash" :
      shuttleH >= 1.5 ? "MID-HIGH — drop or drive" :
      shuttleH >= 0.8 ? "MID — drive or lob" :
      "LOW — lob or net shot only";

    const prompt = `You are a badminton AI agent.
Name: ${player.agentName} | Style: ${player.strategy}
Stats: Speed ${player.stats.speed}/10, Power ${player.stats.power}/10, Accuracy ${player.stats.accuracy}/10, Stamina ${player.stats.stamina}/10
Score: You ${myScore} – ${oppScore} ${opponentName} | Set ${gameState.currentSet + 1}
Momentum: ${momentum.toFixed(0)}/100${momentum > 65 ? " 🔥" : momentum < 35 ? " 🥶" : ""}
FATIGUE: ${fatigue.toFixed(0)}/100${fatigue > 70 ? " (exhausted — play CLEAR or LOB)" : ""}
SHUTTLE HEIGHT: ${shuttleH.toFixed(1)} → ${heightLabel}
Rally length: ${gameState.rallyLength} | Last shot: ${gameState.lastAction}
${trainerCmd ? `TRAINER: "${trainerCmd}" — FOLLOW THIS NOW!` : ""}

PHYSICS RULES:
- SMASH only valid if shuttleHeight >= 2.0 (choosing SMASH at low height = ~8% success)
- LOB/BLOCK only valid if shuttleHeight <= 1.2
- If fatigue > 70: must play CLEAR or LOB`;

    const SYSTEM_MSG = `You are a badminton AI agent. OBEY shuttle height physics — do NOT pick SMASH when height < 2.0. Reply ONLY with JSON: {"action":"SMASH"|"DROP"|"CLEAR"|"DRIVE"|"LOB"|"BLOCK"|"SERVE"|"SPECIAL","targetZone":1-9,"specialMove":null,"rationale":"one sentence"}`;
    const validActions = ["SERVE","SMASH","DROP","CLEAR","DRIVE","LOB","BLOCK","SPECIAL"];

    const parseAI = (raw: string): ShotDecision | null => {
      try {
        const p = JSON.parse(raw);
        if (validActions.includes(p.action)) {
          return { action: p.action as SportAction, targetZone: Math.max(1, Math.min(9, Number(p.targetZone) || 5)), specialMove: p.specialMove ?? null, rationale: p.rationale ?? "AI decision." };
        }
      } catch {}
      return null;
    };

    // Primary: OpenAI gpt-4o-mini
    const openaiKey = this.room.env.OPENAI_API_KEY as string | undefined;
    if (openaiKey) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: SYSTEM_MSG }, { role: "user", content: prompt }],
            temperature: 0.6, max_tokens: 100, response_format: { type: "json_object" },
          }),
        });
        if (res.ok) {
          const data = await res.json() as any;
          const d = parseAI(data.choices?.[0]?.message?.content ?? "{}");
          if (d) return d;
        }
      } catch (e: any) { console.warn("[match] OpenAI failed:", e.message?.slice(0, 60)); }
    }

    // Secondary: Gemini Flash
    const googleKey = this.room.env.GOOGLE_AI_API_KEY as string | undefined;
    if (googleKey) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${SYSTEM_MSG}\n\n${prompt}` }] }],
            generationConfig: { temperature: 0.6, maxOutputTokens: 100, responseMimeType: "application/json" },
          }),
        });
        if (res.ok) {
          const data = await res.json() as any;
          const d = parseAI(data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}");
          if (d) return d;
        }
      } catch (e: any) { console.warn("[match] Gemini failed:", e.message?.slice(0, 60)); }
    }

    // Tertiary: Groq
    const groqKey = this.room.env.GROQ_API_KEY as string | undefined;
    if (groqKey) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "system", content: SYSTEM_MSG }, { role: "user", content: prompt }],
            temperature: 0.6, max_tokens: 100, response_format: { type: "json_object" },
          }),
        });
        if (res.ok) {
          const data = await res.json() as any;
          const d = parseAI(data.choices?.[0]?.message?.content ?? "{}");
          if (d) return d;
        }
      } catch (e: any) { console.warn("[match] Groq failed:", e.message?.slice(0, 60)); }
    }

    console.warn(`[match] ALL AI providers failed for ${player.agentName} — physics fallback`);
    return this.mockDecision(player, gameState);
  }

  mockDecision(player: PlayerInfo, gameState: GameState): ShotDecision {
    // Read trainer strategy from game state (set pre-match)
    const strategy = (gameState as any).strategies?.[player.agentId] ?? undefined;

    return generateMockDecision(
      {
        id:        player.agentId,
        speed:     player.stats.speed,
        power:     player.stats.power,
        accuracy:  player.stats.accuracy,
        stamina:   player.stats.stamina,
        archetype: player.strategy,
      },
      gameState,
      player.specialMoves,
      strategy,
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  broadcast(msg: ServerMsg) {
    const str = JSON.stringify(msg);
    for (const conn of this.room.getConnections()) {
      try { conn.send(str); } catch {}
    }
  }

  getPlayerSummary(): Partial<Record<"a" | "b", { agentId: string; agentName: string; agentColor: string }>> {
    const result: Partial<Record<"a" | "b", { agentId: string; agentName: string; agentColor: string }>> = {};
    for (const p of this.players.values()) {
      result[p.side] = { agentId: p.agentId, agentName: p.agentName, agentColor: p.agentColor };
    }
    return result;
  }

  forceSettle() {
    if (!this.gameState) return;
    const playerA = [...this.players.values()].find(p => p.side === "a");
    const playerB = [...this.players.values()].find(p => p.side === "b");
    if (!playerA || !playerB) return;

    // Determine winner by sets won, then current set score
    const gs = this.gameState;
    const countSets = (agentId: string) =>
      gs.sets.filter((s, i) => {
        const vals = Object.values(s.agentScores);
        return s.agentScores[agentId] === Math.max(...vals) && Math.max(...vals) > 0;
      }).length;
    const setsA = countSets(playerA.agentId);
    const setsB = countSets(playerB.agentId);
    const currentA = gs.sets[gs.currentSet]?.agentScores[playerA.agentId] ?? 0;
    const currentB = gs.sets[gs.currentSet]?.agentScores[playerB.agentId] ?? 0;

    const winnerId = setsA > setsB ? playerA.agentId
      : setsB > setsA ? playerB.agentId
      : currentA >= currentB ? playerA.agentId : playerB.agentId;

    const winner = winnerId === playerA.agentId ? playerA : playerB;
    this.matchOver = true;
    this.isRunning = false;
    this.gameState.matchOver = true;
    this.gameState.winner = winnerId;

    this.broadcast({ type: "match_over", winnerId: winner.agentId, winnerName: winner.agentName, gameState: this.gameState });
    this.persistResult(winnerId).catch(console.error);
  }

  async persistResult(winnerId: string) {
    const baseUrl = this.room.env.NEXT_PUBLIC_BASE_URL as string ?? "http://localhost:3000";
    const secret = this.room.env.CRON_SECRET as string ?? "";
    try {
      await fetch(`${baseUrl}/api/competitions/${this.room.id}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-cron-secret": secret },
        body: JSON.stringify({ winnerId, gameState: this.gameState }),
      });
    } catch (e) {
      console.error("[match] Failed to persist result:", e);
    }
  }
}

MatchRoom satisfies Party.Worker;
