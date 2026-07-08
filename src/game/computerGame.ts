import { Card, cardLabel, cardValue, rankOrder } from './cards';
import { createDeck, shuffleDeck } from './deck';
import { scoreShowHand } from './scoring';

export type PlayerId = 'player' | 'computer';
export type ComputerRoundPhase = 'cut' | 'discard' | 'starterCut' | 'pegging' | 'count';

export type PeggingPlay = {
  player: PlayerId;
  card: Card;
  count: number;
  points: number;
  label: string;
};

export type ComputerRound = {
  phase: ComputerRoundPhase;
  playerHand: Card[];
  computerHand: Card[];
  playerPeggingHand: Card[];
  computerPeggingHand: Card[];
  peggingCount: number;
  peggingScores: Record<PlayerId, number>;
  peggingSegment: Card[];
  peggingTurn: PlayerId;
  peggingPlayed: PeggingPlay[];
  crib: Card[];
  starter: Card | null;
  remainingDeck: Card[];
  dealer: PlayerId | null;
  cut: {
    deck: Card[];
    player: Card | null;
    computer: Card | null;
  };
};

export function startComputerRound(random = Math.random): ComputerRound {
  const deck = shuffleDeck(createDeck(), random);

  return {
    phase: 'cut',
    playerHand: [],
    computerHand: [],
    playerPeggingHand: [],
    computerPeggingHand: [],
    peggingCount: 0,
    peggingScores: { player: 0, computer: 0 },
    peggingSegment: [],
    peggingTurn: 'player',
    peggingPlayed: [],
    starter: null,
    crib: [],
    remainingDeck: deck,
    dealer: null,
    cut: {
      deck,
      player: null,
      computer: null,
    },
  };
}

export function startDealtRound(dealer: PlayerId, random = Math.random): ComputerRound {
  const deck = shuffleDeck(createDeck(), random);

  return {
    phase: 'discard',
    playerHand: deck.slice(0, 6),
    computerHand: deck.slice(6, 12),
    playerPeggingHand: [],
    computerPeggingHand: [],
    peggingCount: 0,
    peggingScores: { player: 0, computer: 0 },
    peggingSegment: [],
    peggingTurn: nonDealer(dealer),
    peggingPlayed: [],
    starter: null,
    crib: [],
    remainingDeck: deck.slice(12),
    dealer,
    cut: {
      deck,
      player: null,
      computer: null,
    },
  };
}

export function choosePlayerCut(round: ComputerRound, playerCutIndex: number): ComputerRound {
  if (round.phase !== 'cut') return round;
  if (playerCutIndex < 0 || playerCutIndex >= round.cut.deck.length) {
    throw new Error('Cut index is outside the deck.');
  }

  const playerCut = round.cut.deck[playerCutIndex];
  const remainingAfterPlayerCut = round.cut.deck.filter((_, index) => index !== playerCutIndex);
  const computerCutIndex = Math.floor(remainingAfterPlayerCut.length / 2);
  const computerCut = remainingAfterPlayerCut[computerCutIndex];
  const remainingDeck = remainingAfterPlayerCut.filter((_, index) => index !== computerCutIndex);

  return {
    ...round,
    remainingDeck,
    dealer: chooseDealerFromCut(playerCut, computerCut),
    cut: {
      deck: round.cut.deck,
      player: playerCut,
      computer: computerCut,
    },
  };
}

export function dealAfterCut(round: ComputerRound): ComputerRound {
  if (!round.dealer || !round.cut.player || !round.cut.computer) {
    throw new Error('Cannot deal before both players cut for first crib.');
  }

  const deck = round.remainingDeck;

  return {
    ...round,
    phase: 'discard',
    playerHand: deck.slice(0, 6),
    computerHand: deck.slice(6, 12),
    playerPeggingHand: [],
    computerPeggingHand: [],
    peggingCount: 0,
    peggingScores: { player: 0, computer: 0 },
    peggingSegment: [],
    peggingTurn: nonDealer(round.dealer),
    peggingPlayed: [],
    starter: null,
    crib: [],
    remainingDeck: deck.slice(12),
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
    phase: 'starterCut',
    playerHand,
    computerHand: computerChoice.keep,
    playerPeggingHand: playerHand,
    computerPeggingHand: computerChoice.keep,
    peggingCount: 0,
    peggingScores: { player: 0, computer: 0 },
    peggingSegment: [],
    peggingTurn: nonDealer(round.dealer),
    peggingPlayed: [],
    crib: [...playerDiscards, ...computerChoice.discards],
  };
}

export function chooseStarterCut(round: ComputerRound, starterCutIndex: number): ComputerRound {
  if (round.phase !== 'starterCut') return round;
  if (starterCutIndex < 0 || starterCutIndex >= round.remainingDeck.length) {
    throw new Error('Starter cut index is outside the deck.');
  }

  const starter = round.remainingDeck[starterCutIndex];
  const remainingDeck = round.remainingDeck.filter((_, index) => index !== starterCutIndex);

  return {
    ...round,
    phase: 'pegging',
    starter,
    remainingDeck,
  };
}

export function playPlayerPeggingCardOnly(round: ComputerRound, card: Card): ComputerRound {
  if (round.phase !== 'pegging') return round;
  if (round.peggingTurn !== 'player') return round;
  if (!isLegalPeggingPlay(card, round.peggingCount)) {
    return round;
  }

  const afterPlayer = applyPeggingPlay(round, 'player', card);
  if (isPeggingComplete(afterPlayer)) return finishPegging(afterPlayer);

  return afterPlayer;
}

export function playPeggingCard(round: ComputerRound, card: Card): ComputerRound {
  const afterPlayer = playPlayerPeggingCardOnly(round, card);
  if (afterPlayer === round || afterPlayer.phase !== 'pegging') return afterPlayer;

  return playComputerPeggingTurn(afterPlayer);
}

export function playComputerPeggingTurn(round: ComputerRound): ComputerRound {
  if (round.phase !== 'pegging') return round;

  const legalCard = round.computerPeggingHand.find((card) =>
    isLegalPeggingPlay(card, round.peggingCount),
  );

  if (!legalCard) {
    if (legalPeggingCards(round.playerPeggingHand, round.peggingCount).length > 0) {
      return {
        ...round,
        peggingTurn: 'player',
      };
    }

    return awardGo(round, 'player');
  }

  const afterComputer = applyPeggingPlay(round, 'computer', legalCard);
  return isPeggingComplete(afterComputer) ? finishPegging(afterComputer) : afterComputer;
}

export function passPlayerPeggingTurn(round: ComputerRound): ComputerRound {
  if (round.phase !== 'pegging') return round;
  if (round.peggingTurn !== 'player') return round;
  if (legalPeggingCards(round.playerPeggingHand, round.peggingCount).length > 0) return round;

  if (legalPeggingCards(round.computerPeggingHand, round.peggingCount).length > 0) {
    return playComputerPeggingTurn({
      ...round,
      peggingTurn: 'computer',
    });
  }

  return awardGo(round, 'computer');
}

export function legalPeggingCards(cards: Card[], count: number) {
  return cards.filter((card) => isLegalPeggingPlay(card, count));
}

export function chooseDealerFromCut(playerCut: Card, computerCut: Card): PlayerId | null {
  const playerRank = rankOrder(playerCut);
  const computerRank = rankOrder(computerCut);

  if (playerRank < computerRank) return 'player';
  if (computerRank < playerRank) return 'computer';

  return null;
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

function applyPeggingPlay(round: ComputerRound, player: PlayerId, card: Card): ComputerRound {
  const label = cardLabel(card);
  const nextCount = round.peggingCount + cardValue(card);
  const nextSegment = [...round.peggingSegment, card];
  const peggingScore = scorePeggingPlay(nextSegment, nextCount);

  return {
    ...round,
    playerPeggingHand:
      player === 'player'
        ? removeCardByLabel(round.playerPeggingHand, label)
        : round.playerPeggingHand,
    computerPeggingHand:
      player === 'computer'
        ? removeCardByLabel(round.computerPeggingHand, label)
        : round.computerPeggingHand,
    peggingCount: nextCount === 31 ? 0 : nextCount,
    peggingScores: {
      ...round.peggingScores,
      [player]: round.peggingScores[player] + peggingScore.points,
    },
    peggingSegment: nextCount === 31 ? [] : nextSegment,
    peggingTurn: player === 'player' ? 'computer' : 'player',
    peggingPlayed: [...round.peggingPlayed, { player, card, count: nextCount, ...peggingScore }],
  };
}

function awardGo(round: ComputerRound, player: PlayerId): ComputerRound {
  const nextRound = {
    ...round,
    peggingCount: 0,
    peggingScores: {
      ...round.peggingScores,
      [player]: round.peggingScores[player] + 1,
    },
    peggingSegment: [],
    peggingTurn: player === 'player' ? 'computer' as const : 'player' as const,
  };

  if (!isPeggingComplete(nextRound)) return nextRound;

  return {
    ...nextRound,
    phase: 'count',
    peggingPlayed: nextRound.peggingPlayed.map((play, index) =>
      index === nextRound.peggingPlayed.length - 1 && play.player === player
        ? {
            ...play,
            points: play.points + 1,
            label:
              play.label === 'No points'
                ? 'last card for 1'
                : `${play.label}, last card for 1`,
          }
        : play,
    ),
  };
}

function finishPegging(round: ComputerRound): ComputerRound {
  const lastPlay = round.peggingPlayed.at(-1);
  const shouldAwardLastCard = Boolean(lastPlay) && round.peggingCount > 0;

  if (lastPlay && shouldAwardLastCard) {
    return {
      ...round,
      phase: 'count',
      peggingCount: 0,
      peggingScores: {
        ...round.peggingScores,
        [lastPlay.player]: round.peggingScores[lastPlay.player] + 1,
      },
      peggingPlayed: round.peggingPlayed.map((play, index) =>
        index === round.peggingPlayed.length - 1
          ? {
              ...play,
              points: play.points + 1,
              label:
                play.label === 'No points'
                  ? 'last card for 1'
                  : `${play.label}, last card for 1`,
            }
          : play,
      ),
    };
  }

  return {
    ...round,
    phase: 'count',
    peggingCount: 0,
  };
}

function isPeggingComplete(round: ComputerRound) {
  return round.playerPeggingHand.length === 0 && round.computerPeggingHand.length === 0;
}

function isLegalPeggingPlay(card: Card, count: number) {
  return count + cardValue(card) <= 31;
}

export function scorePeggingPlay(segment: Card[], count: number) {
  const points: string[] = [];

  if (count === 15) points.push('15 for 2');
  if (count === 31) points.push('31 for 2');

  const pairPoints = scoreTrailingPairs(segment);
  if (pairPoints === 2) points.push('pair for 2');
  if (pairPoints === 6) points.push('three of a kind for 6');
  if (pairPoints === 12) points.push('four of a kind for 12');

  const runPoints = scoreTrailingRun(segment);
  if (runPoints > 0) points.push(`run of ${runPoints} for ${runPoints}`);

  return {
    points:
      (count === 15 ? 2 : 0) +
      (count === 31 ? 2 : 0) +
      pairPoints +
      runPoints,
    label: points.length > 0 ? points.join(', ') : 'No points',
  };
}

function scoreTrailingPairs(segment: Card[]) {
  const lastCard = segment.at(-1);
  if (!lastCard) return 0;

  let sameRankCount = 0;
  for (let index = segment.length - 1; index >= 0; index -= 1) {
    if (segment[index].rank !== lastCard.rank) break;
    sameRankCount += 1;
  }

  if (sameRankCount === 2) return 2;
  if (sameRankCount === 3) return 6;
  if (sameRankCount >= 4) return 12;
  return 0;
}

function scoreTrailingRun(segment: Card[]) {
  for (let length = segment.length; length >= 3; length -= 1) {
    const candidate = segment.slice(segment.length - length);
    const ranks = candidate.map(rankOrder).sort((left, right) => left - right);
    const uniqueRanks = new Set(ranks);
    if (uniqueRanks.size !== ranks.length) continue;
    if (ranks.every((rank, index) => index === 0 || rank === ranks[index - 1] + 1)) {
      return length;
    }
  }

  return 0;
}

function removeCardByLabel(cards: Card[], label: string) {
  let removed = false;
  return cards.filter((card) => {
    if (!removed && cardLabel(card) === label) {
      removed = true;
      return false;
    }
    return true;
  });
}

function nonDealer(dealer: PlayerId | null): PlayerId {
  return dealer === 'player' ? 'computer' : 'player';
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
