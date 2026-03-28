# Plan: Pre-Match Strategy + Smooth In-Match Decisions

## What Already Exists (good news)

The architecture is **mostly built**:

1. **`TrainerStrategy` type** — `gameplan`, `shotBias`, `targetZones`, `specialTiming`, `customInstructions`
2. **Challenge Board UI** — lets trainer pick gameplan (aggressive/defensive/counter-attack/balanced), shot emphasis presets, target zones (3×3 grid), special timing (early/late/never), tactical notes
3. **`/api/challenges` POST** — receives `strategy` and embeds it into `gameState.strategies[challengerAgentId]`
4. **`generateMockDecision()`** — already reads `strategy` param and adjusts shot biases, target zones, special timing
5. **`adjustStrategyAsync()`** — LLM tactical advisor runs every 3 rallies (fire-and-forget), adjusts `shotBias` based on match state
6. **Trainer command input** — live UI lets coach type "SMASH!", "play safe", etc. during command windows

## What's Missing / Broken

### Problem 1: Opponent strategy is never set
When a challenge is created, only the **challenger's** strategy is embedded. The **opponent** (target agent) has no strategy — defaults to raw archetype biases. The opponent's trainer should also be able to set strategy.

**Fix:** When accepting a challenge (or auto-accepting), prompt opponent trainer for strategy. Store in `gameState.strategies[targetAgentId]`.

### Problem 2: LLM decisions still block first serve
The orchestrator calls `executeSportAgentTurn()` for the serve with a 2s timeout. If Groq/Gemini are down (403 errors), this adds 2s latency every rally.

**Fix:** Make LLM serve decision truly optional — if it doesn't resolve in 500ms, use `generateMockDecision()` immediately. The LLM strategy advisor already runs async every 3 rallies.

### Problem 3: Strategies not visible to spectators
Spectators and the opponent can't see what strategy each trainer chose. This matters for betting — knowing if a trainer went "aggressive smash-heavy" vs "defensive rally" affects odds.

**Fix:** Show strategy summary in the match HUD (small badge per player).

### Problem 4: In-match trainer commands feel disconnected
The command input exists but: (a) command window timing is unclear, (b) commands only work if WebSocket is connected, (c) no visual feedback that command was applied.

**Fix:** Make commands work via HTTP fallback. Show "COMMAND APPLIED" flash on court.

## Implementation Plan

### Step 1: Both trainers set strategy pre-match
- In `/challenges` page, when selecting opponent, show strategy config for YOUR agent
- When challenge is accepted, the accepting player also picks strategy (or uses default)
- `/api/challenges` POST stores challenger strategy immediately
- `/api/challenges/[id]/accept` POST stores acceptor strategy
- Both strategies embedded in `gameState.strategies`

### Step 2: Reduce LLM serve timeout to 500ms
- In orchestrator `decisionFn`, change serve LLM timeout from 2000ms → 500ms
- If LLM doesn't respond in 500ms, use `generateMockDecision()` with the trainer's strategy applied
- This means rallies compute in <100ms total (no network dependency)

### Step 3: Strategy badges in match HUD
- Add small strategy indicator per player: e.g. "⚔️ Aggressive" or "🛡️ Defensive"
- Show shot emphasis as mini bar chart (smash/drop/drive/clear distribution)
- Visible to spectators for informed betting

### Step 4: Trainer commands via HTTP fallback
- If WebSocket disconnected, POST trainer command to `/api/competitions/[id]/command`
- Visual flash on court: "⚡ TRAINER: SMASH!" overlay for 1.5s
- SFX on command application

### Step 5: Tick interval tuning
- Currently 8s — too slow for batch rallies that compute in <100ms
- Change to 3s: enough for rally animation (5-8 shots × 350-700ms avg = ~2.5s) + small buffer
- Result: continuous gameplay with no dead time between rallies

## Files to Change

| File | Change |
|------|--------|
| `src/lib/orchestrator.ts` | Reduce LLM serve timeout to 500ms |
| `src/components/arena/live-match-runner.ts` | Tick interval 8s → 3s |
| `src/app/api/challenges/[id]/accept/route.ts` | Accept opponent strategy |
| `src/components/arena/challenge-board.tsx` | Strategy UI for both sides |
| `src/app/competitions/[id]/live/live-match-client.tsx` | Strategy badges + command flash |
| `src/app/api/competitions/[id]/command/route.ts` | HTTP fallback for trainer commands |

## Expected Result
- Pre-match: both trainers configure gameplan, shot bias, zones, special timing
- Match starts instantly (<100ms per rally, no LLM dependency)
- Rallies animate at game speed (3s cycle: compute → animate → next)
- Mid-match: trainers can override with commands, LLM advisor adjusts every 3 rallies
- Spectators see strategy badges, can bet informed
