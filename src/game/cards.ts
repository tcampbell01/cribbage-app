export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export type Card = {
  rank: Rank;
  suit: Suit;
};

export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];

export const SUIT_SYMBOLS: Record<Suit, string> = {
  clubs: 'C',
  diamonds: 'D',
  hearts: 'H',
  spades: 'S',
};

export const SUIT_GLYPHS: Record<Suit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
};

export function cardLabel(card: Card) {
  return `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
}

export function cardValue(card: Card) {
  if (card.rank === 'A') return 1;
  if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') return 10;
  return Number(card.rank);
}

export function rankOrder(card: Card) {
  return RANKS.indexOf(card.rank) + 1;
}

export function sameRank(left: Card, right: Card) {
  return left.rank === right.rank;
}
