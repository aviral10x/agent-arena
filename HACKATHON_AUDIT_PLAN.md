# Agent Arena Hackathon Audit Plan

Date: 2026-03-28

## Executive Summary

Agent Arena is already compelling as an X Layer-native AI experience, but it is not yet submission-safe for the strongest payment-oriented interpretation of the hackathon.

Right now the project is best positioned for:

- Primary track: AI Agent Playground
- Secondary story: Agentic Payments
- Stretch track: AI DeFi

The fastest path to a strong submission is not to broaden scope. It is to harden three things:

1. Make spectator betting provably real on X Layer testnet with USDC.
2. Make agent-to-agent or agent-to-platform x402 payments real, autonomous, and traceable through Onchain OS.
3. Produce at least one X Layer mainnet transaction hash tied to a real in-product action, because the submission form explicitly asks for mainnet proof.

## Reality Check Against The Rules

Based on the hackathon post and submission form text:

- Phase 1 in the pasted thread ran from March 12, 2026 to March 26, 2026.
- Today is March 28, 2026.
- The submission form asks for at least one X Layer mainnet transaction hash.
- Bonus points are explicitly called out for x402 and Onchain OS usage.

Implication:

- If there is no extension or later phase, eligibility timing needs immediate organizer confirmation.
- Even if the product demos beautifully on testnet, testnet-only betting is not enough for the form because it asks for mainnet proof.

## Track Eligibility

### 1. AI Agent Playground

Current status: Eligible now.

Why:

- The live core experience is already an AI-vs-AI arena.
- Users can build agents, challenge opponents, watch live matches, and follow outcomes.
- The sport engine is actually wired and running.

Why this should be the primary submission:

- This is the most complete, least aspirational part of the product.
- It aligns with the judging criteria around AI agent collaboration, architecture, and ecosystem impact.
- It gives us the best chance to tell a sharp story without depending on unfinished trading infrastructure.

### 2. Agentic Payment

Current status: Plausible, but not yet submission-safe.

Why it is close:

- The repo has x402 verification primitives.
- Tournaments and challenges already attempt x402-gated flows.
- Agent-side payment signing through Onchain OS exists.

Why it is not safe yet:

- Spectator betting accepts demo payloads.
- Bet claims do not actually pay out on-chain.
- Agent x402 payments are signed but not fully settled and surfaced as product receipts.

This becomes a strong secondary or even co-primary narrative once the payment rails are made provable.

### 3. AI DeFi

Current status: Stretch only.

Why:

- There is meaningful X Layer DeFi infrastructure in the repo.
- OKX DEX and X Layer token integrations exist.
- But the live competition engine is currently sport-only, not trading-driven.

Recommendation:

- Do not lead with AI DeFi unless the trading loop becomes real, visible, and on-chain in the product itself.
- If time permits, ship one real trading exhibition lane after the betting/payment fixes.

## Compliance Matrix

### Build on X Layer

Status: Partial pass.

Evidence:

- X Layer wallet and chain logic exist.
- X Layer testnet USDC transfer flow exists for betting.
- X Layer DeFi integration code exists.

Risk:

- The codebase mixes chain 196 and chain 1952 assumptions in different places.

### Use x402

Status: Partial pass.

Evidence:

- `src/lib/x402-verify.ts` verifies EIP-3009-style payment payloads.
- Tournament enrollment and challenge creation call `verifyX402Payment`.
- Agent-side payment signing exists through `src/lib/agent-wallet.ts`.

Risk:

- The most visible payment flow, spectator betting, does not actually verify x402.
- Some UI copy suggests x402-gated features that are not fully wired.

### Open source repo

Status: Likely pass, but presentation is weak.

Risk:

- `README.md` is still the default Create Next App template.
- That weakens the judging story and makes the repo look less production-grade than the app itself.

### Mainnet transaction proof

Status: Failing until we generate a real X Layer mainnet action.

This is the biggest non-UI submission blocker.

## Highest-Risk Product Findings

### P0. Spectator betting is not cryptographically enforced today

Files:

- `src/app/api/competitions/[id]/bet/route.ts`
- `src/lib/betting.ts`
- `src/app/api/bets/claim/route.ts`

What is happening:

- The bet API imports `verifyX402Payment` but never uses it.
- If no `txHash` is provided, the API still accepts a demo bet.
- If a `txHash` is provided, the server still does not verify the transfer on-chain.
- Bet claims only mark a row as claimed and write a placeholder claim hash.

Why this matters:

- Judges can reasonably interpret the current flow as simulated betting rather than real betting.
- This is the single biggest blocker to the "betting flow flawlessly on testnet using USDC" goal.

### P0. Database rules and betting code disagree

Files:

- `prisma/schema.prisma`
- `src/lib/betting.ts`

What is happening:

- The schema enforces one bet per wallet per competition.
- The betting code comments say multiple bets are allowed.
- The betting code appends randomness to `txSignature`, which undermines the schema's uniqueness model instead of working with it.

Why this matters:

- This creates fragile settlement semantics and weakens replay protection.
- It also makes analytics and receipts harder to trust.

### P0. Chain and token configuration is inconsistent

Files:

- `src/hooks/use-wallet.tsx`
- `src/lib/x402-verify.ts`
- `src/lib/agent-wallet.ts`
- `src/lib/defi-xlayer.ts`

What is happening:

- The testnet betting transfer path uses chain 1952 and the testnet USDC contract.
- The x402 signing path uses chain 196.
- Agentic wallet x402 signing also uses chain 196.
- The codebase currently treats "X Layer" as both testnet and mainnet depending on the file.

Why this matters:

- This creates user-facing confusion.
- It also makes it difficult to prove exactly what is happening on-chain during a demo.

### P0. Agent x402 payments are signed, but not yet product-grade

Files:

- `src/lib/agent-wallet.ts`
- `src/lib/orchestrator.ts`

What is happening:

- Agents sign match-entry payments when a match begins.
- But those payments are not clearly verified, settled, persisted as receipts, or surfaced in the UI as first-class on-chain events.

Why this matters:

- The hackathon specifically rewards autonomous payment flow and agent collaboration architecture.
- This feature is very valuable, but today it reads as "interesting internal plumbing" rather than a judged product capability.

### P1. Challenge and tournament messaging are inconsistent with the payment model

Files:

- `src/components/arena/challenge-board.tsx`
- `src/app/api/challenges/route.ts`
- `src/components/arena/tournament-enroll-client.tsx`

What is happening:

- The challenge UI says challenge creation is free and x402 happens later.
- The challenge API supports optional x402 at creation.
- Tournament enroll can fall back to demo payloads even though the server expects real payment verification.

Why this matters:

- Demo copy and backend logic should tell one story.
- Payment UX needs to be precise if we want judges to trust it.

### P1. Some x402 UI paths are advertised but not fully implemented

Files:

- `src/components/arena/x402-btn.tsx`
- `src/components/arena/tutorial-modal.tsx`
- `src/components/arena/live-leaderboard.tsx`

What is happening:

- `x402-btn` posts to `/api/x402/verify`, but there is no such route in `src/app/api`.
- The tutorial says live leaderboards are x402-gated.
- The leaderboard UI shows "x402 active" without an actual access-control path.

Why this matters:

- This makes the product feel more complete than the implementation really is.
- Judges notice when monetization claims are decorative rather than functional.

### P1. The live match UI contains receipt bugs

Files:

- `src/app/competitions/[id]/live/live-match-client.tsx`

What is happening:

- The live confirmation view links to an explorer URL using the wallet address instead of the transaction hash.

Why this matters:

- This breaks trust at the exact moment the user expects proof.

### P2. The current repo presentation undersells the project

Files:

- `README.md`

What is happening:

- The repository landing page does not explain Agent Arena, X Layer, Onchain OS, x402, or the demo flow.

Why this matters:

- The judges will look at the repo.
- Right now the code tells a better story than the README.

## Recommended Winning Strategy

### Positioning

Lead with:

- "AI sports agents on X Layer"
- "Autonomous agent payments through Onchain OS"
- "USDC spectator betting with on-chain receipts"

Do not lead with:

- "full AI trading arena"

That can still be a follow-up slide or stretch feature, but it is not the most defensible primary narrative today.

### Product Story For Judges

The cleanest winning flow is:

1. A user creates an agent.
2. The user launches a live challenge.
3. Both agents autonomously make a small x402 payment through Onchain OS for match entry or premium match intelligence.
4. Spectators place USDC bets on X Layer testnet.
5. The match settles automatically.
6. Winner and bettors receive payout receipts.
7. We also show at least one X Layer mainnet tx hash tied to a real app action for submission proof.

This tells one coherent story:

- real agents
- real payment intent
- real on-chain coordination
- real user participation

## Execution Plan

### Phase 0: Submission Blockers

Target: first.

#### 1. Define a canonical network matrix

Create one source of truth for:

- X Layer mainnet chain id
- X Layer testnet chain id
- mainnet USDC and/or x402 settlement token
- testnet USDC contract
- explorer URLs
- arena receiver wallet

Decision:

- Use X Layer testnet for spectator bet QA and demo repeatability.
- Use X Layer mainnet for the official submission tx hash and at least one autonomous payment event.

Note:

- Official OKX payment docs need runtime confirmation before we promise mainnet USDC x402 specifically.
- The current official docs are inconsistent enough that we should treat supported settlement token as a live integration check, not a documentation assumption.

#### 2. Harden the spectator betting flow

Requirements:

- No demo fallback in hackathon mode.
- If using direct ERC-20 transfer on testnet, verify:
  - chain
  - token contract
  - recipient
  - amount
  - successful receipt
  - uniqueness of tx hash plus log index
- Reopen and close betting strictly from `bettingOpen` and `bettingClosedAt`.
- Persist verified on-chain receipt details in the bet record.

Also:

- Remove the random suffix from `txSignature`.
- Decide whether bets are one-per-wallet or multi-bet, then align schema and code.

#### 3. Make claim payouts real

Requirements:

- `POST /api/bets/claim` must trigger a real USDC payout.
- Store the real payout tx hash.
- Surface payout status in the UI.

#### 4. Make agent payments real and visible

Requirements:

- Every autonomous agent payment must be:
  - signed
  - verified or settled
  - persisted
  - linked to a match or action
  - visible in the product as a receipt

Best version:

- Agents pay x402 to unlock a premium coaching or scouting endpoint during the match.

That turns x402 into part of the competitive loop rather than a side mechanic.

#### 5. Produce the mainnet proof path

Requirements:

- One action in the product must generate a real X Layer mainnet tx hash that we can include in the form.

Best candidate:

- agent-side x402 payment through Onchain OS

Backup candidate:

- challenge entry payment or premium unlock flow on mainnet

### Phase 1: Demo Integrity

Target: immediately after blockers.

#### 1. Fix UX trust gaps

- Correct all chain labels.
- Correct explorer links.
- Show actual tx hashes, token, chain, and amount.
- Remove or gate all demo wording behind an explicit dev flag.

#### 2. Tighten payment copy

- Decide whether challenge entry is free or paid.
- Decide whether tournament enrollment is strict x402 or not.
- Make UI, backend, and docs say the same thing.

#### 3. Add an operator receipts panel

Show:

- match entry payments
- spectator bets
- winner prize payout
- bettor claims
- chain
- token
- tx hash
- status

This turns the app into a judge-friendly system, not just a flashy frontend.

### Phase 2: Submission Story

Target: after the product is honest and reliable.

#### 1. Rewrite the README

Include:

- what Agent Arena is
- why it belongs on X Layer
- how Onchain OS is used
- how x402 is used
- architecture diagram
- setup instructions
- demo flow
- sample tx hashes

#### 2. Prepare the social/demo assets

Need:

- one clean X post from the project account
- one short demo video
- 3 to 5 screenshots
- one public repo
- one mainnet tx hash

#### 3. Frame the judging narrative explicitly

Map demo scenes to judging criteria:

- on-chain AI integration
- autonomous payment flow
- multi-agent collaboration architecture
- ecosystem relevance

### Phase 3: Stretch Features

Only do these if Phase 0 and Phase 1 are already done.

#### 1. Add one real AI DeFi exhibition mode

Use the existing `defi-xlayer` work to run:

- one visible trading agent challenge
- one real quote-to-execution path
- one live feed of X Layer tx hashes

This makes AI DeFi credible without rewriting the whole app.

#### 2. Add paid agent services

Example:

- coach advice
- opponent scouting
- tactical simulation
- premium rally prediction

If agents invoke those services autonomously via x402, that is powerful hackathon material.

## What We Should Build Next

If we want the highest odds of winning, the next build order should be:

1. Canonical chain and token config
2. Verified USDC bet placement on testnet
3. Real USDC claim payout
4. Real autonomous agent x402 payment with stored receipts
5. Mainnet proof transaction path
6. README and demo packaging
7. Optional AI DeFi exhibition

## Final Recommendation

Agent Arena should enter as an AI Agent Playground project with a hardened Agentic Payments backbone.

That gives us:

- the strongest current product surface
- the clearest X Layer relevance
- the best use of Onchain OS
- the most believable x402 story

If we nail the real-money rails and produce clean receipts, the project becomes much more than a cool visual demo. It becomes a judge-friendly proof that AI agents, spectators, and payment infrastructure can all interact coherently on X Layer.
