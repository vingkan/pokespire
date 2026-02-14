import type { Combatant } from './types';

// ============================================================
// Deck Management
// ============================================================

/** Hard cap on hand size - cards drawn past this go to discard */
export const MAX_HAND_SIZE = 10;

/** Fisher-Yates shuffle (in-place, returns same array). */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Draw cards until hand has `handSize` cards, or both draw and discard are empty.
 * If draw pile is empty, reshuffle discard into draw pile first.
 * Respects MAX_HAND_SIZE hard cap - excess cards go to discard.
 */
export function drawCards(combatant: Combatant): string[] {
  const drawn: string[] = [];
  const targetSize = Math.min(combatant.handSize, MAX_HAND_SIZE);

  while (combatant.hand.length < targetSize) {
    if (combatant.drawPile.length === 0) {
      if (combatant.discardPile.length === 0) break; // nothing left to draw
      // Reshuffle discard into draw pile
      combatant.drawPile = shuffle([...combatant.discardPile]);
      combatant.discardPile = [];
    }
    const card = combatant.drawPile.pop()!;
    combatant.hand.push(card);
    drawn.push(card);
  }

  return drawn;
}

/**
 * Draw extra cards beyond the normal hand size limit.
 * Used by effects that grant bonus draws mid-turn.
 * Respects MAX_HAND_SIZE hard cap - excess cards go to discard.
 * Returns { drawn: cards added to hand, discarded: cards that overflowed }
 */
export function drawExtraCards(combatant: Combatant, count: number): { drawn: string[], discarded: string[] } {
  const drawn: string[] = [];
  const discarded: string[] = [];

  for (let i = 0; i < count; i++) {
    if (combatant.drawPile.length === 0) {
      if (combatant.discardPile.length === 0) break; // nothing left to draw
      // Reshuffle discard into draw pile
      combatant.drawPile = shuffle([...combatant.discardPile]);
      combatant.discardPile = [];
    }
    if (combatant.drawPile.length === 0) break;
    const card = combatant.drawPile.pop()!;

    if (combatant.hand.length < MAX_HAND_SIZE) {
      combatant.hand.push(card);
      drawn.push(card);
    } else {
      // Hand is full, discard the overflow
      combatant.discardPile.push(card);
      discarded.push(card);
    }
  }

  return { drawn, discarded };
}

/**
 * Discard all cards in hand to discard pile.
 */
export function discardHand(combatant: Combatant): void {
  combatant.discardPile.push(...combatant.hand);
  combatant.hand = [];
}
