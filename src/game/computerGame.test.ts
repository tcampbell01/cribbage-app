import { describe, expect, it } from 'vitest';

import { cardLabel } from './cards';
import { finishDiscard, startComputerRound } from './computerGame';

describe('computer game round', () => {
  it('starts with 6 cards for each player and a hidden starter', () => {
    const round = startComputerRound();
    const allVisibleCards = [...round.playerHand, ...round.computerHand, round.starter];
    const uniqueCards = new Set(allVisibleCards.map(cardLabel));

    expect(round.phase).toBe('discard');
    expect(round.playerHand).toHaveLength(6);
    expect(round.computerHand).toHaveLength(6);
    expect(uniqueCards.size).toBe(13);
  });

  it('finishes discarding with 4-card hands and a 4-card crib', () => {
    const round = startComputerRound();
    const nextRound = finishDiscard(round, round.playerHand.slice(0, 2));

    expect(nextRound.phase).toBe('count');
    expect(nextRound.playerHand).toHaveLength(4);
    expect(nextRound.computerHand).toHaveLength(4);
    expect(nextRound.crib).toHaveLength(4);
  });
});
