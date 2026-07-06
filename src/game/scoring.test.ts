import { describe, expect, it } from 'vitest';

import { Card } from './cards';
import { scoreShowHand } from './scoring';

function c(rank: Card['rank'], suit: Card['suit']): Card {
  return { rank, suit };
}

describe('scoreShowHand', () => {
  it('scores the famous 29-point hand', () => {
    const result = scoreShowHand(
      [c('5', 'hearts'), c('5', 'clubs'), c('5', 'diamonds'), c('J', 'spades')],
      c('5', 'spades'),
    );

    expect(result.total).toBe(29);
  });

  it('scores double runs without also counting shorter sub-runs', () => {
    const result = scoreShowHand(
      [c('7', 'clubs'), c('8', 'diamonds'), c('8', 'spades'), c('9', 'hearts')],
      c('10', 'clubs'),
    );

    expect(result.items.filter((item) => item.category === 'runs')).toHaveLength(2);
    expect(result.total).toBe(14);
  });

  it('counts a five-card flush in the hand', () => {
    const result = scoreShowHand(
      [c('A', 'hearts'), c('4', 'hearts'), c('8', 'hearts'), c('J', 'hearts')],
      c('K', 'hearts'),
    );

    expect(result.items.find((item) => item.category === 'flush')?.points).toBe(5);
  });

  it('requires a five-card flush in the crib', () => {
    const result = scoreShowHand(
      [c('2', 'clubs'), c('3', 'clubs'), c('4', 'clubs'), c('5', 'clubs')],
      c('9', 'diamonds'),
      true,
    );

    expect(result.items.some((item) => item.category === 'flush')).toBe(false);
  });
});
