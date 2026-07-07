import { describe, expect, it } from 'vitest';

import { cardLabel } from './cards';
import {
  chooseDealerFromCut,
  choosePlayerCut,
  chooseStarterCut,
  dealAfterCut,
  finishDiscard,
  legalPeggingCards,
  passPlayerPeggingTurn,
  playPeggingCard,
  playPlayerPeggingCardOnly,
  scorePeggingPlay,
  startComputerRound,
  startDealtRound,
} from './computerGame';

describe('computer game round', () => {
  it('starts with an uncut deck for first crib selection', () => {
    const round = startComputerRound();

    expect(round.phase).toBe('cut');
    expect(round.dealer).toBeNull();
    expect(round.cut.deck).toHaveLength(52);
    expect(round.cut.player).toBeNull();
    expect(round.cut.computer).toBeNull();
    expect(round.playerHand).toHaveLength(0);
    expect(round.computerHand).toHaveLength(0);
  });

  it('lets the player choose a cut card before the computer cuts', () => {
    const round = chooseNonTiedCutRound();
    const uniqueCuts = new Set([round.cut.player!, round.cut.computer!].map(cardLabel));

    expect(round.phase).toBe('cut');
    expect(round.dealer).not.toBeNull();
    expect(round.cut.player).not.toBeNull();
    expect(round.cut.computer).not.toBeNull();
    expect(uniqueCuts.size).toBe(2);
    expect(round.remainingDeck).toHaveLength(50);
  });

  it('deals 6 cards for each player after the cut', () => {
    const round = dealAfterCut(chooseNonTiedCutRound());
    const allVisibleCards = [...round.playerHand, ...round.computerHand];
    const uniqueCards = new Set(allVisibleCards.map(cardLabel));

    expect(round.phase).toBe('discard');
    expect(round.playerHand).toHaveLength(6);
    expect(round.computerHand).toHaveLength(6);
    expect(round.starter).toBeNull();
    expect(uniqueCards.size).toBe(12);
  });

  it('starts later hands already dealt with the chosen dealer', () => {
    const round = startDealtRound('computer');

    expect(round.phase).toBe('discard');
    expect(round.dealer).toBe('computer');
    expect(round.peggingTurn).toBe('player');
    expect(round.playerHand).toHaveLength(6);
    expect(round.computerHand).toHaveLength(6);
    expect(round.starter).toBeNull();
    expect(round.remainingDeck).toHaveLength(40);
  });

  it('finishes discarding with 4-card hands, a 4-card crib, and a starter cut phase', () => {
    const round = dealAfterCut(chooseNonTiedCutRound());
    const nextRound = finishDiscard(round, round.playerHand.slice(0, 2));

    expect(nextRound.phase).toBe('starterCut');
    expect(nextRound.playerHand).toHaveLength(4);
    expect(nextRound.computerHand).toHaveLength(4);
    expect(nextRound.playerPeggingHand).toHaveLength(4);
    expect(nextRound.computerPeggingHand).toHaveLength(4);
    expect(nextRound.crib).toHaveLength(4);
  });

  it('cuts a starter card before pegging begins', () => {
    const dealtRound = dealAfterCut(chooseNonTiedCutRound());
    const discardRound = finishDiscard(dealtRound, dealtRound.playerHand.slice(0, 2));
    const peggingRound = chooseStarterCut(discardRound, 0);

    expect(peggingRound.phase).toBe('pegging');
    expect(peggingRound.starter).not.toBeNull();
    expect(peggingRound.remainingDeck).toHaveLength(discardRound.remainingDeck.length - 1);
  });

  it('lets the player lay down a legal pegging card', () => {
    const dealtRound = dealAfterCut(chooseNonTiedCutRound());
    const discardRound = finishDiscard(dealtRound, dealtRound.playerHand.slice(0, 2));
    const round = chooseStarterCut(discardRound, 0);
    const legalCard = legalPeggingCards(round.playerPeggingHand, round.peggingCount)[0];
    const nextRound = playPeggingCard({ ...round, peggingTurn: 'player' }, legalCard);

    expect(nextRound.peggingPlayed[0].player).toBe('player');
    expect(nextRound.playerPeggingHand).toHaveLength(3);
  });

  it('can pause after the player lays a scoring pegging card before the computer plays', () => {
    const round = {
      ...startComputerRound(),
      phase: 'pegging' as const,
      playerHand: [],
      computerHand: [],
      playerPeggingHand: [{ rank: '5', suit: 'clubs' }],
      computerPeggingHand: [{ rank: 'K', suit: 'spades' }],
      peggingCount: 10,
      peggingTurn: 'player' as const,
    };

    const nextRound = playPlayerPeggingCardOnly(round, { rank: '5', suit: 'clubs' });

    expect(nextRound.peggingPlayed).toHaveLength(1);
    expect(nextRound.peggingPlayed[0]).toMatchObject({ player: 'player', points: 2 });
    expect(nextRound.peggingTurn).toBe('computer');
    expect(nextRound.computerPeggingHand).toHaveLength(1);
  });

  it('awards the computer 1 point for go when neither player can play after the player passes', () => {
    const round = {
      ...startComputerRound(),
      phase: 'pegging' as const,
      playerHand: [],
      computerHand: [],
      playerPeggingHand: [{ rank: '5', suit: 'clubs' }],
      computerPeggingHand: [{ rank: '8', suit: 'diamonds' }],
      peggingCount: 28,
      peggingTurn: 'player' as const,
    };

    const nextRound = passPlayerPeggingTurn(round);

    expect(nextRound.peggingScores.computer).toBe(1);
    expect(nextRound.peggingCount).toBe(0);
    expect(nextRound.peggingTurn).toBe('player');
  });

  it('awards 1 point for the last card when pegging ends short of 31', () => {
    const round = {
      ...startComputerRound(),
      phase: 'pegging' as const,
      playerHand: [],
      computerHand: [],
      playerPeggingHand: [{ rank: '7', suit: 'clubs' }],
      computerPeggingHand: [],
      peggingCount: 20,
      peggingTurn: 'player' as const,
    };

    const nextRound = playPlayerPeggingCardOnly(round, { rank: '7', suit: 'clubs' });

    expect(nextRound.phase).toBe('count');
    expect(nextRound.peggingScores.player).toBe(1);
    expect(nextRound.peggingPlayed[0]).toMatchObject({
      points: 1,
      label: 'last card for 1',
    });
  });

  it('does not add a last-card point on top of 31 for 2', () => {
    const round = {
      ...startComputerRound(),
      phase: 'pegging' as const,
      playerHand: [],
      computerHand: [],
      playerPeggingHand: [{ rank: 'A', suit: 'clubs' }],
      computerPeggingHand: [],
      peggingCount: 30,
      peggingTurn: 'player' as const,
    };

    const nextRound = playPlayerPeggingCardOnly(round, { rank: 'A', suit: 'clubs' });

    expect(nextRound.phase).toBe('count');
    expect(nextRound.peggingScores.player).toBe(2);
    expect(nextRound.peggingPlayed[0]).toMatchObject({
      points: 2,
      label: '31 for 2',
    });
  });

  it('does not deal before both players have cut', () => {
    expect(() => dealAfterCut(startComputerRound())).toThrow(/Cannot deal/);
  });

  it('awards first crib to the lower cut card', () => {
    expect(
      chooseDealerFromCut({ rank: 'A', suit: 'spades' }, { rank: 'K', suit: 'clubs' }),
    ).toBe('player');
    expect(
      chooseDealerFromCut({ rank: 'Q', suit: 'spades' }, { rank: '2', suit: 'clubs' }),
    ).toBe('computer');
    expect(
      chooseDealerFromCut({ rank: '8', suit: 'spades' }, { rank: '8', suit: 'clubs' }),
    ).toBeNull();
  });

  it('scores pegging points for 15, pairs, and runs', () => {
    expect(scorePeggingPlay([{ rank: '5', suit: 'clubs' }, { rank: '10', suit: 'hearts' }], 15)).toMatchObject({
      points: 2,
    });
    expect(scorePeggingPlay([{ rank: '8', suit: 'clubs' }, { rank: '8', suit: 'hearts' }], 16)).toMatchObject({
      points: 2,
    });
    expect(
      scorePeggingPlay(
        [
          { rank: '4', suit: 'clubs' },
          { rank: '6', suit: 'hearts' },
          { rank: '5', suit: 'spades' },
        ],
        15,
      ),
    ).toMatchObject({
      points: 5,
    });
  });
});

function chooseNonTiedCutRound() {
  const round = startComputerRound();

  for (let index = 0; index < round.cut.deck.length; index += 1) {
    const cutRound = choosePlayerCut(round, index);
    if (cutRound.dealer) return cutRound;
  }

  throw new Error('Expected at least one non-tied cut in the deck.');
}
