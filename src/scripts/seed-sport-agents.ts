/**
 * Seed script: rebrand trading agents → sport athlete personas
 * Run with: npx tsx src/scripts/seed-sport-agents.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SPORT_AGENTS = [
  {
    id: 'momentum-bot',
    name: 'Striker',
    archetype: 'Net Dominator',
    strategy: 'Lightning-fast attacks from the net, loves drop shots and smashes. Wins points in the first 3 shots or burns out trying.',
    risk: 'Aggressive',
    bio: 'Born in the heat of fast-paced court battles, Striker lives for the aggressive net play. If the shuttle is high, it\'s getting smashed.',
    traits: JSON.stringify(['NET RUSH', 'SMASH KING', 'QUICK FEET', 'AGGRESSIVE']),
    speed: 9,
    power: 9,
    stamina: 5,
    accuracy: 7,
    specialMoves: JSON.stringify(['Thunder Smash', 'Net Kill']),
  },
  {
    id: 'mean-revert',
    name: 'Phantom',
    archetype: 'Counter Specialist',
    strategy: 'Patient defensive player who waits for the opponent to overcommit, then punishes with precision cross-court drops.',
    risk: 'Defensive',
    bio: 'Phantom reads the game like no other. Every shot is a trap. Every rally is a chess match. Wins by making you beat yourself.',
    traits: JSON.stringify(['DECEPTION', 'COUNTER PUNCH', 'READS PLAY', 'DEFENSIVE']),
    speed: 7,
    power: 6,
    stamina: 9,
    accuracy: 9,
    specialMoves: JSON.stringify(['Ghost Drop', 'Phantom Clear']),
  },
  {
    id: 'whale-follower',
    name: 'Apex',
    archetype: 'Adaptive All-Rounder',
    strategy: 'Adapts strategy mid-match based on opponent patterns. Can attack or defend equally well. The most dangerous agent in a long match.',
    risk: 'Moderate',
    bio: 'No fixed style — Apex evolves. In set 1 it studies you. In set 2 it exploits you. In set 3 it finishes you.',
    traits: JSON.stringify(['ADAPTIVE', 'READS FLOW', 'ALL-COURT', 'MODERATE']),
    speed: 8,
    power: 7,
    stamina: 8,
    accuracy: 8,
    specialMoves: JSON.stringify(['Mirror Drive', 'Adaptive Smash']),
  },
  {
    id: 'diversi-bot',
    name: 'Iron',
    archetype: 'Endurance Baseliner',
    strategy: 'Never loses stamina. Forces the opponent into ultra-long rallies and outlasts everyone. Gets stronger as the match goes on.',
    risk: 'Conservative',
    bio: 'Iron doesn\'t win matches. Iron watches opponents lose them. Every clear is a trap. Every lob is an invitation to tire yourself out.',
    traits: JSON.stringify(['IRON STAMINA', 'DEEP COURT', 'OUTLAST', 'CONSERVATIVE']),
    speed: 5,
    power: 6,
    stamina: 10,
    accuracy: 8,
    specialMoves: JSON.stringify(['Silk Drop', 'Endurance Drive']),
  },
];

async function main() {
  for (const agent of SPORT_AGENTS) {
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        name:         agent.name,
        archetype:    agent.archetype,
        strategy:     agent.strategy,
        risk:         agent.risk,
        bio:          agent.bio,
        traits:       agent.traits,
        speed:        agent.speed,
        power:        agent.power,
        stamina:      agent.stamina,
        accuracy:     agent.accuracy,
        specialMoves: agent.specialMoves,
      },
    });
    console.log(`✅ Updated ${agent.id} → ${agent.name} (${agent.archetype})`);
    console.log(`   SPD:${agent.speed} PWR:${agent.power} STA:${agent.stamina} ACC:${agent.accuracy}`);
    console.log(`   Specials: ${JSON.parse(agent.specialMoves).join(', ')}`);
  }
  await prisma.$disconnect();
  console.log('\n✨ All seed agents rebranded as sport athletes.');
}

main().catch(e => { console.error(e); process.exit(1); });
