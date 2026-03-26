'use client';
// LiveMatchWrapper — legacy trading component, kept as stub for type compatibility
// All sport competitions use SportMatchClient instead
import type { Competition, TradeEvent } from '@/lib/arena-data';

export function LiveMatchWrapper({}: {
  initialCompetition: Competition;
  initialTrades: TradeEvent[];
  layout?: string;
}) {
  return null;
}
