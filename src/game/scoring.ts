import { Card, cardLabel, cardValue, rankOrder, sameRank } from './cards';

export type ScoreCategory = 'fifteens' | 'pairs' | 'runs' | 'flush' | 'nobs';

export type ScoreItem = {
  category: ScoreCategory;
  points: number;
  cards: Card[];
  label: string;
};

export type ScoreResult = {
  total: number;
  items: ScoreItem[];
};

export function scoreShowHand(hand: Card[], starter: Card, isCrib = false): ScoreResult {
  const allCards = [...hand, starter];
  const items: ScoreItem[] = [
    ...scoreFifteens(allCards),
    ...scorePairs(allCards),
    ...scoreRuns(allCards),
    ...scoreFlush(hand, starter, isCrib),
    ...scoreNobs(hand, starter),
  ];

  return {
    total: items.reduce((sum, item) => sum + item.points, 0),
    items,
  };
}

function scoreFifteens(cards: Card[]): ScoreItem[] {
  return combinations(cards)
    .filter((combo) => combo.reduce((sum, card) => sum + cardValue(card), 0) === 15)
    .map((combo) => ({
      category: 'fifteens' as const,
      points: 2,
      cards: combo,
      label: `Fifteen: ${combo.map(cardLabel).join(' ')}`,
    }));
}

function scorePairs(cards: Card[]): ScoreItem[] {
  const items: ScoreItem[] = [];

  for (let first = 0; first < cards.length; first += 1) {
    for (let second = first + 1; second < cards.length; second += 1) {
      if (sameRank(cards[first], cards[second])) {
        const pair = [cards[first], cards[second]];
        items.push({
          category: 'pairs',
          points: 2,
          cards: pair,
          label: `Pair: ${pair.map(cardLabel).join(' ')}`,
        });
      }
    }
  }

  return items;
}

function scoreRuns(cards: Card[]): ScoreItem[] {
  const runCombos = combinations(cards)
    .filter((combo) => combo.length >= 3)
    .filter(isRun);

  const longest = Math.max(0, ...runCombos.map((combo) => combo.length));

  return runCombos
    .filter((combo) => combo.length === longest)
    .map((combo) => ({
      category: 'runs' as const,
      points: combo.length,
      cards: combo,
      label: `Run of ${combo.length}: ${combo
        .slice()
        .sort((left, right) => rankOrder(left) - rankOrder(right))
        .map(cardLabel)
        .join(' ')}`,
    }));
}

function scoreFlush(hand: Card[], starter: Card, isCrib: boolean): ScoreItem[] {
  const handSuit = hand[0]?.suit;
  if (!handSuit || !hand.every((card) => card.suit === handSuit)) return [];
  const includesStarter = starter.suit === handSuit;

  if (isCrib && !includesStarter) return [];

  const cards = includesStarter ? [...hand, starter] : hand;
  return [
    {
      category: 'flush',
      points: cards.length,
      cards,
      label: `${cards.length}-card flush`,
    },
  ];
}

function scoreNobs(hand: Card[], starter: Card): ScoreItem[] {
  const jack = hand.find((card) => card.rank === 'J' && card.suit === starter.suit);
  if (!jack) return [];

  return [
    {
      category: 'nobs',
      points: 1,
      cards: [jack],
      label: `Nobs: ${cardLabel(jack)} matches the starter suit`,
    },
  ];
}

function combinations(cards: Card[]): Card[][] {
  const results: Card[][] = [];

  function visit(start: number, combo: Card[]) {
    if (combo.length > 0) results.push(combo);
    for (let index = start; index < cards.length; index += 1) {
      visit(index + 1, [...combo, cards[index]]);
    }
  }

  visit(0, []);
  return results;
}

function isRun(cards: Card[]) {
  const ranks = cards.map(rankOrder).sort((left, right) => left - right);
  const uniqueRanks = new Set(ranks);
  if (uniqueRanks.size !== ranks.length) return false;

  return ranks.every((rank, index) => index === 0 || rank === ranks[index - 1] + 1);
}
