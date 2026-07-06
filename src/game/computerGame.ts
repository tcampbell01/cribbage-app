import { Card, cardLabel } from './cards';
import { createDeck, shuffleDeck } from './deck';
import { scoreShowHand } from './scoring';

export type ComputerRoundPhase = 'discard' | 'count';

export type ComputerRound = {
  phase: ComputerRoundPhase;
  playerHand: Card[];
  computerHand: Card[];
  crib: Card[];
  starter: Card;
  remainingDeck: Card[];
};

export function startComputerRound(random = Math.random): ComputerRound {
  const deck = shuffleDeck(createDeck(), random);

  return {
    phase: 'discard',
    playerHand: deck.slice(0, 6),
    computerHand: deck.slice(6, 12),
    starter: deck[12],
    crib: [],
    remainingDeck: deck.slice(13),
  };
}

export function finishDiscard(round: ComputerRound, playerDiscards: Card[]): ComputerRound {
  if (playerDiscards.length !== 2) {
    throw new Error('A cribbage discard must contain exactly 2 cards.');
  }

  const playerDiscardLabels = new Set(playerDiscards.map(cardLabel));
  const playerHand = round.playerHand.filter((card) => !playerDiscardLabels.has(cardLabel(card)));
  const computerChoice = chooseComputerDiscards(round.computerHand, round.remainingDeck);

  return {
    ...round,
    phase: 'count',
    playerHand,
    computerHand: computerChoice.keep,
    crib: [...playerDiscards, ...computerChoice.discards],
  };
}

export function chooseComputerDiscards(hand: Card[], possibleStarters: Card[]) {
  const choices = chooseDiscards(hand);
  let bestChoice = choices[0];
  let bestScore = Number.NEGATIVE_INFINITY;

  choices.forEach((choice) => {
    const expectedScore = averageHandScore(choice.keep, possibleStarters);
    if (expectedScore > bestScore) {
      bestChoice = choice;
      bestScore = expectedScore;
    }
  });

  return {
    ...bestChoice,
    expectedScore: bestScore,
  };
}

function averageHandScore(hand: Card[], possibleStarters: Card[]) {
  if (possibleStarters.length === 0) return 0;

  const total = possibleStarters.reduce(
    (sum, starter) => sum + scoreShowHand(hand, starter, false).total,
    0,
  );

  return total / possibleStarters.length;
}

function chooseDiscards(hand: Card[]) {
  const choices: Array<{ keep: Card[]; discards: Card[] }> = [];

  for (let first = 0; first < hand.length; first += 1) {
    for (let second = first + 1; second < hand.length; second += 1) {
      const discardIndexes = new Set([first, second]);
      choices.push({
        discards: [hand[first], hand[second]],
        keep: hand.filter((_, index) => !discardIndexes.has(index)),
      });
    }
  }

  return choices;
}
