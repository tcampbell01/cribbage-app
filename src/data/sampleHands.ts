import { Card } from '@/game/cards';

export type SampleHand = {
  hand: Card[];
  starter: Card;
  isCrib: boolean;
};

export const SAMPLE_HANDS: SampleHand[] = [
  {
    hand: [
      { rank: '5', suit: 'hearts' },
      { rank: '5', suit: 'clubs' },
      { rank: '5', suit: 'diamonds' },
      { rank: 'J', suit: 'spades' },
    ],
    starter: { rank: '5', suit: 'spades' },
    isCrib: false,
  },
  {
    hand: [
      { rank: '7', suit: 'clubs' },
      { rank: '8', suit: 'diamonds' },
      { rank: '8', suit: 'spades' },
      { rank: '9', suit: 'hearts' },
    ],
    starter: { rank: '10', suit: 'clubs' },
    isCrib: false,
  },
  {
    hand: [
      { rank: 'A', suit: 'hearts' },
      { rank: '4', suit: 'hearts' },
      { rank: '8', suit: 'hearts' },
      { rank: 'J', suit: 'hearts' },
    ],
    starter: { rank: 'K', suit: 'hearts' },
    isCrib: false,
  },
  {
    hand: [
      { rank: '2', suit: 'clubs' },
      { rank: '3', suit: 'clubs' },
      { rank: '4', suit: 'clubs' },
      { rank: '5', suit: 'clubs' },
    ],
    starter: { rank: '9', suit: 'diamonds' },
    isCrib: true,
  },
];
