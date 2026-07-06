import { describe, expect, it } from 'vitest';

import { cardLabel } from './cards';
import { createDeck, dealPracticeHand } from './deck';

describe('deck utilities', () => {
  it('creates a standard 52-card deck', () => {
    const deck = createDeck();
    const uniqueCards = new Set(deck.map(cardLabel));

    expect(deck).toHaveLength(52);
    expect(uniqueCards.size).toBe(52);
  });

  it('deals four hand cards and one starter without duplicates', () => {
    const deal = dealPracticeHand();
    const allCards = [deal.starter, ...deal.hand];
    const uniqueCards = new Set(allCards.map(cardLabel));

    expect(deal.hand).toHaveLength(4);
    expect(allCards).toHaveLength(5);
    expect(uniqueCards.size).toBe(5);
  });
});
