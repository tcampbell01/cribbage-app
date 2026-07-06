import { Card, RANKS, SUITS, cardLabel } from './cards';

export type PracticeDeal = {
  hand: Card[];
  starter: Card;
  isCrib: boolean;
};

export function createDeck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })));
}

export function shuffleDeck(deck: Card[], random = Math.random): Card[] {
  const shuffled = [...deck];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function dealPracticeHand(random = Math.random): PracticeDeal {
  const [starter, ...hand] = shuffleDeck(createDeck(), random).slice(0, 5);

  return {
    hand,
    starter,
    isCrib: false,
  };
}

export function dealKey(deal: PracticeDeal) {
  return [deal.starter, ...deal.hand].map(cardLabel).join('-');
}
