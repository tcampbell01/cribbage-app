import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';

import { CardRow } from '@/components/CardRow';
import { CribbageBoard } from '@/components/CribbageBoard';
import { Card, cardLabel } from '@/game/cards';
import {
  choosePlayerCut,
  chooseStarterCut,
  dealAfterCut,
  finishDiscard,
  legalPeggingCards,
  passPlayerPeggingTurn,
  playComputerPeggingTurn,
  playPlayerPeggingCardOnly,
  startComputerRound,
  startDealtRound,
} from '@/game/computerGame';
import { dealPracticeHand } from '@/game/deck';
import { scoreShowHand } from '@/game/scoring';
import { formatScoreBreakdown } from '@/game/teaching';

type AppSection = 'practice' | 'computer' | 'realtime';
type PendingPegMove = {
  from: number;
  label: string;
  points: number;
  target: number;
};
type CountOwner = 'player' | 'computer';

const SECTIONS: Array<{
  id: AppSection;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}> = [
  { id: 'practice', label: 'Practice', icon: 'target' },
  { id: 'computer', label: 'Computer', icon: 'cpu' },
  { id: 'realtime', label: 'Realtime', icon: 'users' },
];

export default function HomeScreen() {
  const [activeSection, setActiveSection] = useState<AppSection>('practice');
  const [deal, setDeal] = useState(() => dealPracticeHand());
  const [guess, setGuess] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [computerRound, setComputerRound] = useState(() => startComputerRound());
  const [selectedDiscards, setSelectedDiscards] = useState<string[]>([]);
  const [computerGuess, setComputerGuess] = useState('');
  const [computerSubmitted, setComputerSubmitted] = useState(false);
  const [playerScore, setPlayerScore] = useState(0);
  const [computerGameScore, setComputerGameScore] = useState(0);
  const [roundStartPlayerScore, setRoundStartPlayerScore] = useState(0);
  const [playerPeg, setPlayerPeg] = useState(0);
  const [pegSubmitted, setPegSubmitted] = useState(false);
  const [pendingPegMove, setPendingPegMove] = useState<PendingPegMove | null>(null);
  const [pendingPegChecked, setPendingPegChecked] = useState(false);
  const [completedCounts, setCompletedCounts] = useState<CountOwner[]>([]);
  const score = useMemo(() => scoreShowHand(deal.hand, deal.starter, deal.isCrib), [deal]);
  const computerScore = useMemo(
    () =>
      computerRound.starter
        ? scoreShowHand(computerRound.playerHand, computerRound.starter, false)
        : { total: 0, items: [] },
    [computerRound],
  );
  const computerHandScore = useMemo(
    () =>
      computerRound.starter
        ? scoreShowHand(computerRound.computerHand, computerRound.starter, false)
        : { total: 0, items: [] },
    [computerRound],
  );
  const numericGuess = Number.parseInt(guess, 10);
  const numericComputerGuess = Number.parseInt(computerGuess, 10);
  const hasGuess = Number.isFinite(numericGuess);
  const hasComputerGuess = Number.isFinite(numericComputerGuess);
  const isCorrect = submitted && hasGuess && numericGuess === score.total;
  const isComputerCorrect =
    computerSubmitted && hasComputerGuess && numericComputerGuess === computerScore.total;
  const postPeggingPlayerScore = Math.min(120, playerScore + computerRound.peggingScores.player);
  const postPeggingComputerScore = Math.min(120, computerGameScore + computerRound.peggingScores.computer);
  const countOrder: CountOwner[] =
    computerRound.dealer === 'player' ? ['computer', 'player'] : ['player', 'computer'];
  const currentCountOwner =
    computerRound.phase === 'count'
      ? countOrder.find((owner) => !completedCounts.includes(owner)) ?? null
      : null;
  const isPlayerCountTurn = currentCountOwner === 'player';
  const isComputerCountTurn = currentCountOwner === 'computer';
  const isCountComplete = computerRound.phase === 'count' && currentCountOwner === null;
  const playerCountVisible = completedCounts.includes('player') || isPlayerCountTurn;
  const computerCountVisible = completedCounts.includes('computer') || isComputerCountTurn;
  const isCountingPegPractice =
    activeSection === 'computer' &&
    computerRound.phase === 'count' &&
    isPlayerCountTurn &&
    computerSubmitted;
  const countingPegStartScore = isCountingPegPractice ? roundStartPlayerScore : postPeggingPlayerScore;
  const expectedPlayerPeg = Math.min(120, countingPegStartScore + computerScore.total);
  const displayedPlayerScore = completedCounts.includes('player')
    ? expectedPlayerPeg
    : isCountingPegPractice
      ? playerPeg
      : postPeggingPlayerScore;
  const displayedComputerScore = computerCountVisible
    ? Math.min(120, postPeggingComputerScore + computerHandScore.total)
    : postPeggingComputerScore;
  const playerBoardFrontPeg =
    pendingPegMove
      ? playerPeg
      : isCountingPegPractice
        ? playerPeg
        : postPeggingPlayerScore;
  const playerBoardBackPeg =
    pendingPegMove
      ? pendingPegMove.from
      : isCountingPegPractice
        ? countingPegStartScore
        : previousScoringPeg(playerScore, computerRound.peggingPlayed, 'player');
  const computerBoardBackPeg = computerCountVisible
    ? postPeggingComputerScore
    : previousScoringPeg(computerGameScore, computerRound.peggingPlayed, 'computer');
  const computerBoardFrontPeg = displayedComputerScore;
  const isPendingPegCorrect =
    Boolean(pendingPegMove) && playerPeg === pendingPegMove?.target;
  const isPegCorrect = pegSubmitted && playerPeg === expectedPlayerPeg;
  const playerHasLegalPeggingCard =
    computerRound.phase === 'pegging' &&
    !pendingPegMove &&
    legalPeggingCards(computerRound.playerPeggingHand, computerRound.peggingCount).length > 0;
  const lastPeggingPlay = computerRound.peggingPlayed.at(-1);
  const playerPlayedCards = computerRound.peggingPlayed
    .filter((play) => play.player === 'player')
    .map((play) => play.card);
  const computerPlayedCards = computerRound.peggingPlayed
    .filter((play) => play.player === 'computer')
    .map((play) => play.card);
  const starterJackDealer =
    computerRound.starter?.rank === 'J' && computerRound.dealer ? computerRound.dealer : null;

  function checkAnswer() {
    setSubmitted(true);
  }

  function nextHand() {
    setDeal(dealPracticeHand());
    setGuess('');
    setSubmitted(false);
  }

  function resetPegPrompts(nextPlayerScore = playerScore) {
    setRoundStartPlayerScore(nextPlayerScore);
    setPlayerPeg(nextPlayerScore);
    setPegSubmitted(false);
    setPendingPegMove(null);
    setPendingPegChecked(false);
    setCompletedCounts([]);
  }

  function toggleDiscard(card: Card) {
    const label = cardLabel(card);
    setSelectedDiscards((current) => {
      if (current.includes(label)) return current.filter((selected) => selected !== label);
      if (current.length >= 2) return current;
      return [...current, label];
    });
  }

  function submitDiscards() {
    const discardSet = new Set(selectedDiscards);
    const cards = computerRound.playerHand.filter((card) => discardSet.has(cardLabel(card)));
    setComputerRound((round) => finishDiscard(round, cards));
    setSelectedDiscards([]);
    setComputerGuess('');
    setComputerSubmitted(false);
    resetPegPrompts();
  }

  function newComputerRound() {
    setComputerRound(startComputerRound());
    setSelectedDiscards([]);
    setComputerGuess('');
    setComputerSubmitted(false);
    resetPegPrompts();
  }

  function dealComputerHand() {
    setComputerRound((round) => dealAfterCut(round));
    setSelectedDiscards([]);
    setComputerGuess('');
    setComputerSubmitted(false);
    resetPegPrompts();
  }

  function chooseCutCard(index: number) {
    setComputerRound((round) => choosePlayerCut(round, index));
  }

  function chooseStarterCard(index: number) {
    setComputerRound((round) => {
      const peggingRound = chooseStarterCut(round, index);
      if (peggingRound !== round && peggingRound.starter?.rank === 'J' && peggingRound.dealer) {
        if (peggingRound.dealer === 'player') {
          setPlayerScore((currentScore) => Math.min(120, currentScore + 2));
        } else {
          setComputerGameScore((currentScore) => Math.min(120, currentScore + 2));
        }
      }

      return peggingRound.peggingTurn === 'computer'
        ? playComputerPeggingTurn(peggingRound)
        : peggingRound;
    });
  }

  function playPlayerPeggingCard(card: Card) {
    if (pendingPegMove) return;

    setComputerRound((round) => {
      const previousPlayerPeggingScore = round.peggingScores.player;
      const afterPlayer = playPlayerPeggingCardOnly(round, card);
      const lastPlay = afterPlayer.peggingPlayed.at(-1);

      if (afterPlayer === round) return round;

      if (lastPlay?.player === 'player' && lastPlay.points > 0) {
        queuePendingPegMove(
          previousPlayerPeggingScore,
          afterPlayer.peggingScores.player,
          lastPlay.label,
        );
        return afterPlayer;
      }

      if (afterPlayer.phase !== 'pegging') return afterPlayer;

      const afterComputerResponse = playComputerPeggingTurn(afterPlayer);
      if (afterComputerResponse.peggingScores.player > previousPlayerPeggingScore) {
        queuePendingPegMove(
          previousPlayerPeggingScore,
          afterComputerResponse.peggingScores.player,
          'go for 1',
        );
      }

      return afterComputerResponse;
    });
  }

  function queuePendingPegMove(fromPeggingScore: number, targetPeggingScore: number, label: string) {
    const from = Math.min(120, playerScore + fromPeggingScore);
    const target = Math.min(120, playerScore + targetPeggingScore);

    setPlayerPeg(from);
    setPendingPegMove({
      from,
      target,
      points: targetPeggingScore - fromPeggingScore,
      label,
    });
    setPendingPegChecked(false);
  }

  function passPeggingTurn() {
    if (pendingPegMove) return;
    setComputerRound((round) => passPlayerPeggingTurn(round));
  }

  function checkPendingPegMove() {
    if (!pendingPegMove) return;

    setPendingPegChecked(true);
    if (playerPeg !== pendingPegMove.target) return;

    setPendingPegMove(null);
    setPendingPegChecked(false);
    setComputerRound((round) =>
      round.phase === 'pegging' && round.peggingTurn === 'computer'
        ? playComputerPeggingTurn(round)
        : round,
    );
  }

  function submitComputerCount() {
    setComputerSubmitted(true);
    setRoundStartPlayerScore(postPeggingPlayerScore);
    setPlayerPeg(postPeggingPlayerScore);
    setPegSubmitted(false);
  }

  function checkPlayerPeg() {
    setPegSubmitted(true);
    if (playerPeg === expectedPlayerPeg) {
      setCompletedCounts((current) =>
        current.includes('player') ? current : [...current, 'player'],
      );
    }
  }

  function continueAfterComputerCount() {
    setCompletedCounts((current) =>
      current.includes('computer') ? current : [...current, 'computer'],
    );
  }

  function dealNextComputerHand() {
    const nextDealer = computerRound.dealer === 'player' ? 'computer' : 'player';
    const nextPlayerScore = displayedPlayerScore;
    const nextComputerScore = displayedComputerScore;

    setPlayerScore(nextPlayerScore);
    setComputerGameScore(nextComputerScore);
    setComputerRound(startDealtRound(nextDealer));
    setSelectedDiscards([]);
    setComputerGuess('');
    setComputerSubmitted(false);
    setRoundStartPlayerScore(nextPlayerScore);
    setPlayerPeg(nextPlayerScore);
    setPegSubmitted(false);
    setPendingPegMove(null);
    setPendingPegChecked(false);
    setCompletedCounts([]);
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.kicker}>Cribbage Coach</Text>
        <Text style={styles.title}>Learn by counting your own points.</Text>
        <Text style={styles.copy}>
          Practice hands, play guided games against the computer, or sit down for a real-time match
          with another player.
        </Text>
      </View>

      <View style={styles.sectionNav}>
        {SECTIONS.map((section) => {
          const isActive = section.id === activeSection;
          return (
            <Pressable
              key={section.id}
              style={[styles.sectionButton, isActive ? styles.activeSectionButton : null]}
              onPress={() => setActiveSection(section.id)}
            >
              <Feather name={section.icon} size={18} color={isActive ? '#FAFBF8' : '#26302A'} />
              <Text style={[styles.sectionButtonText, isActive ? styles.activeSectionText : null]}>
                {section.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.gameLayout}>
        <View style={styles.mainColumn}>
      {activeSection === 'practice' ? (
        <View style={styles.practicePanel}>
          <View style={styles.modeHeader}>
            <View>
              <Text style={styles.modeKicker}>Count it yourself practice</Text>
              <Text style={styles.modeTitle}>What is this hand worth?</Text>
            </View>
            <Text style={styles.badge}>{deal.isCrib ? 'Crib' : 'Hand'}</Text>
          </View>
          <Text style={styles.modeCopy}>
            Add the points before asking the coach. Each deal gives you four random hand cards and
            one random starter from a full deck.
          </Text>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your hand</Text>
        </View>
        <CardRow cards={deal.hand} />

        <View style={styles.starterBlock}>
          <Text style={styles.sectionTitle}>Starter card</Text>
          <CardRow cards={[deal.starter]} size="small" />
        </View>

        <View style={styles.answerRow}>
          <TextInput
            value={guess}
            onChangeText={(value) => {
              setGuess(value.replace(/[^0-9]/g, ''));
              setSubmitted(false);
            }}
            keyboardType="number-pad"
            placeholder="Points"
            placeholderTextColor="#7A8178"
            style={styles.input}
            maxLength={2}
          />
          <Pressable style={styles.primaryButton} onPress={checkAnswer}>
            <Feather name="check" size={18} color="#FAFBF8" />
            <Text style={styles.primaryButtonText}>Check</Text>
          </Pressable>
          <Pressable style={styles.iconButton} onPress={nextHand} accessibilityLabel="Next hand">
            <Feather name="refresh-cw" size={20} color="#26302A" />
          </Pressable>
        </View>
      </View>
      ) : null}

      {activeSection === 'computer' ? (
        <View style={styles.practicePanel}>
          <View style={styles.modeHeader}>
            <View>
              <Text style={styles.modeKicker}>Computer game</Text>
              <Text style={styles.modeTitle}>
                {computerRound.phase === 'cut'
                  ? 'Draw low card for first crib.'
                  : computerRound.phase === 'discard'
                    ? 'Choose 2 cards for the crib.'
                    : computerRound.phase === 'starterCut'
                      ? 'Cut the starter card.'
                      : computerRound.phase === 'pegging'
                        ? 'Lay down cards toward 31.'
                        : 'Count your hand.'}
              </Text>
            </View>
            <Pressable style={styles.iconButton} onPress={newComputerRound} accessibilityLabel="New computer round">
              <Feather name="refresh-cw" size={20} color="#26302A" />
            </Pressable>
          </View>
          <Text style={styles.modeCopy}>
            {computerRound.phase === 'cut'
              ? 'Pick a card from the deck to cut. The computer will cut after you, and the lower card gets the first crib.'
              : computerRound.phase === 'discard'
                ? 'The first crib is set. Choose two cards to send to the crib.'
                : computerRound.phase === 'starterCut'
                  ? 'Cut the starter card before pegging begins. This extra card counts with both hands and the crib.'
                  : computerRound.phase === 'pegging'
                    ? 'Lay down cards in turn and count pegging points as the running total moves toward 31.'
                    : 'Pegging is complete. Count your hand before asking the coach.'}
          </Text>

            <View style={styles.scoreStrip}>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>You</Text>
              <Text style={styles.scoreValue}>{displayedPlayerScore}</Text>
            </View>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>Computer</Text>
              <Text style={styles.scoreValue}>{displayedComputerScore}</Text>
            </View>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>First crib</Text>
              <Text style={styles.scoreValueSmall}>
                {computerRound.dealer
                  ? computerRound.dealer === 'player'
                    ? 'You'
                    : 'Computer'
                  : 'Cut'}
              </Text>
            </View>
          </View>

          {computerRound.phase === 'cut' ? (
            <View style={styles.cutPanel}>
              {!computerRound.cut.player ? (
                <>
                  <Text style={styles.sectionTitle}>Choose your cut card</Text>
                  <CutDeck count={15} onChoose={chooseCutCard} />
                </>
              ) : (
                <>
                  <View style={styles.cutResultRow}>
                    <View style={styles.cutColumn}>
                      <Text style={styles.sectionTitle}>Your cut</Text>
                      <CardRow cards={[computerRound.cut.player]} size="small" />
                    </View>
                    {computerRound.cut.computer ? (
                      <View style={styles.cutColumn}>
                        <Text style={styles.sectionTitle}>Computer cut</Text>
                        <CardRow cards={[computerRound.cut.computer]} size="small" />
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.modeCopy}>
                    {!computerRound.dealer
                      ? 'You cut the same rank, so nobody gets the crib yet. Cut again.'
                      : computerRound.dealer === 'player'
                      ? 'You cut the lower card, so you deal first and get the first crib.'
                      : 'The computer cut the lower card, so it deals first and gets the first crib.'}
                  </Text>
                  {computerRound.dealer ? (
                    <Pressable style={[styles.primaryButton, styles.fitButton]} onPress={dealComputerHand}>
                      <Feather name="play" size={18} color="#FAFBF8" />
                      <Text style={styles.primaryButtonText}>Deal hand</Text>
                    </Pressable>
                  ) : (
                    <Pressable style={[styles.primaryButton, styles.fitButton]} onPress={newComputerRound}>
                      <Feather name="refresh-cw" size={18} color="#FAFBF8" />
                      <Text style={styles.primaryButtonText}>Cut again</Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          ) : null}

          {computerRound.phase === 'starterCut' ? (
            <View style={styles.cutPanel}>
              <Text style={styles.sectionTitle}>Choose the starter cut</Text>
              <CutDeck count={15} onChoose={chooseStarterCard} />
            </View>
          ) : null}

          {computerRound.phase !== 'cut' && computerRound.phase !== 'starterCut' ? (
            <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Computer hand</Text>
            <Text style={styles.mutedText}>
              {computerRound.phase === 'discard'
                ? '6 cards'
                : computerRound.phase === 'pegging'
                  ? `${computerRound.computerPeggingHand.length} cards left`
                  : computerCountVisible
                    ? `${computerHandScore.total} points`
                    : '4 cards kept'}
            </Text>
          </View>
          {computerCountVisible ? (
            <CardRow cards={computerRound.computerHand} />
          ) : (
            <CardBackRow count={computerRound.computerHand.length} />
          )}
          {isComputerCountTurn ? (
            <View style={[styles.feedback, styles.correct]}>
              <Text style={styles.feedbackTitle}>
                Computer hand scores {computerHandScore.total}.
              </Text>
              <Text style={styles.feedbackCopy}>
                Computer moves from {postPeggingComputerScore} to {displayedComputerScore}.
              </Text>
              <View style={styles.breakdown}>
                {formatScoreBreakdown(computerHandScore).map((line) => (
                  <Text key={line} style={styles.breakdownLine}>
                    {line}
                  </Text>
                ))}
              </View>
              <Pressable
                style={[styles.primaryButton, styles.fitButton]}
                onPress={continueAfterComputerCount}
              >
                <Feather name="play" size={18} color="#FAFBF8" />
                <Text style={styles.primaryButtonText}>Continue</Text>
              </Pressable>
            </View>
          ) : null}
          {computerRound.phase === 'pegging' ? (
            <PlayedCardRow label="Computer played" cards={computerPlayedCards} />
          ) : null}

          {(computerRound.phase === 'pegging' || computerRound.phase === 'count') &&
          computerRound.starter ? (
            <View style={styles.starterBlock}>
              <Text style={styles.sectionTitle}>Starter card</Text>
              <CardRow cards={[computerRound.starter]} size="small" />
              {starterJackDealer ? (
                <Text style={styles.feedbackCopy}>
                  {starterJackDealer === 'player' ? 'You peg' : 'Computer pegs'} 2 for the starter
                  jack.
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {computerRound.phase === 'pegging' ? 'Your pegging cards' : 'Your hand'}
            </Text>
            {computerRound.phase === 'discard' ? (
              <Text style={styles.mutedText}>{selectedDiscards.length}/2 selected</Text>
            ) : computerRound.phase === 'pegging' ? (
              <Text style={styles.mutedText}>Count: {computerRound.peggingCount}</Text>
            ) : null}
          </View>
          {computerRound.phase === 'pegging' ? (
            <View style={styles.peggingPanel}>
              <View style={styles.scoreStrip}>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreLabel}>Pegging count</Text>
                  <Text style={styles.scoreValue}>{computerRound.peggingCount}</Text>
                </View>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreLabel}>Turn</Text>
                  <Text style={styles.scoreValueSmall}>
                    {pendingPegMove
                      ? 'Move peg'
                      : computerRound.peggingTurn === 'player'
                        ? 'You'
                        : 'Computer'}
                  </Text>
                </View>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreLabel}>Your peg pts</Text>
                  <Text style={styles.scoreValue}>{computerRound.peggingScores.player}</Text>
                </View>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreLabel}>Computer peg pts</Text>
                  <Text style={styles.scoreValue}>{computerRound.peggingScores.computer}</Text>
                </View>
              </View>
              {lastPeggingPlay ? (
                <View style={styles.peggingScoreNote}>
                  <Text style={styles.feedbackCopy}>
                    {lastPeggingPlay.player === 'player' ? 'You' : 'Computer'} played{' '}
                    {cardLabel(lastPeggingPlay.card)}: {lastPeggingPlay.label}
                  </Text>
                </View>
              ) : null}
              {pendingPegMove ? (
                <View style={styles.pegPrompt}>
                  <View>
                    <Text style={styles.sectionTitle}>Move your peg before the computer plays</Text>
                    <Text style={styles.feedbackCopy}>
                      {pendingPegMove.label}. Move from {pendingPegMove.from} to{' '}
                      {pendingPegMove.target}, then check it.
                    </Text>
                  </View>
                  <Pressable style={[styles.primaryButton, styles.fitButton]} onPress={checkPendingPegMove}>
                    <Feather name="map-pin" size={18} color="#FAFBF8" />
                    <Text style={styles.primaryButtonText}>Check peg</Text>
                  </Pressable>
                  {pendingPegChecked ? (
                    <Text style={[styles.feedbackCopy, isPendingPegCorrect ? styles.correctText : styles.missedText]}>
                      {isPendingPegCorrect
                        ? 'Correct. The computer can play now.'
                        : `Not quite. Your peg should land on ${pendingPegMove.target}.`}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              <PlayedCardRow label="You played" cards={playerPlayedCards} />
            </View>
          ) : null}
          {computerRound.phase !== 'count' || playerCountVisible ? (
            <CardRow
              cards={
                computerRound.phase === 'pegging'
                  ? computerRound.playerPeggingHand
                  : computerRound.playerHand
              }
              onCardPress={
                computerRound.phase === 'discard'
                  ? toggleDiscard
                  : computerRound.phase === 'pegging' && !pendingPegMove
                    ? playPlayerPeggingCard
                    : undefined
              }
              selectedCards={selectedDiscards}
            />
          ) : (
            <Text style={styles.mutedText}>Your hand counts after the computer.</Text>
          )}

          {computerRound.phase === 'discard' ? (
            <Pressable
              style={[
                styles.primaryButton,
                selectedDiscards.length !== 2 ? styles.disabledButton : null,
                styles.fitButton,
              ]}
              disabled={selectedDiscards.length !== 2}
              onPress={submitDiscards}
            >
              <Feather name="send" size={18} color="#FAFBF8" />
              <Text style={styles.primaryButtonText}>Send to crib</Text>
            </Pressable>
          ) : computerRound.phase === 'pegging' ? (
            <View style={styles.peggingActions}>
              <Text style={styles.modeCopy}>
                {pendingPegMove
                  ? 'Peg your points on the board. The computer will wait until you check the move.'
                  : 'Click a card to lay it down. If you score, the computer waits while you move and check your peg.'}
              </Text>
              {!pendingPegMove && !playerHasLegalPeggingCard ? (
                <Pressable style={[styles.primaryButton, styles.fitButton]} onPress={passPeggingTurn}>
                  <Feather name="corner-down-right" size={18} color="#FAFBF8" />
                  <Text style={styles.primaryButtonText}>Go</Text>
                </Pressable>
              ) : null}
            </View>
          ) : computerRound.phase === 'count' && !isPlayerCountTurn ? null : (
            <View style={styles.answerRow}>
              <TextInput
                value={computerGuess}
                onChangeText={(value) => {
                  setComputerGuess(value.replace(/[^0-9]/g, ''));
                  setComputerSubmitted(false);
                }}
                keyboardType="number-pad"
                placeholder="Your hand points"
                placeholderTextColor="#7A8178"
                style={styles.input}
                maxLength={2}
              />
              <Pressable style={styles.primaryButton} onPress={submitComputerCount}>
                <Feather name="check" size={18} color="#FAFBF8" />
                <Text style={styles.primaryButtonText}>Check</Text>
              </Pressable>
            </View>
          )}
            </>
          ) : null}
        </View>
      ) : null}

      {activeSection === 'realtime' ? (
        <ModePreview
          icon="users"
          title="Play someone else in real time"
          copy="Realtime play will use rooms so two players can share a board, count their own points, and settle disputes with the coach."
          bullets={['Invite code rooms', 'Shared board state', 'Point challenges and confirmations']}
        />
      ) : null}

      {activeSection === 'practice' && submitted ? (
        <View style={[styles.feedback, isCorrect ? styles.correct : styles.missed]}>
          <Text style={styles.feedbackTitle}>
            {isCorrect ? 'Correct.' : `This one scores ${score.total}.`}
          </Text>
          <Text style={styles.feedbackCopy}>
            {hasGuess
              ? isCorrect
                ? 'Nice counting. Here is the full breakdown.'
                : `You entered ${numericGuess}. Compare your count with the coach notes below.`
              : 'Enter a number first, then try again.'}
          </Text>
          {hasGuess ? (
            <View style={styles.breakdown}>
              {formatScoreBreakdown(score).map((line) => (
                <Text key={line} style={styles.breakdownLine}>
                  {line}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {activeSection === 'computer' &&
      computerRound.phase === 'count' &&
      playerCountVisible &&
      computerSubmitted ? (
        <View style={[styles.feedback, isComputerCorrect ? styles.correct : styles.missed]}>
          <Text style={styles.feedbackTitle}>
            {isComputerCorrect ? 'Correct.' : `Your hand scores ${computerScore.total}.`}
          </Text>
          <Text style={styles.feedbackCopy}>
            {hasComputerGuess
              ? isComputerCorrect
                ? 'Good count. The full breakdown is below.'
                : `You entered ${numericComputerGuess}. Here is what the coach found.`
              : 'Enter a number first, then try again.'}
          </Text>
          {hasComputerGuess ? (
            <View style={styles.breakdown}>
              {formatScoreBreakdown(computerScore).map((line) => (
                <Text key={line} style={styles.breakdownLine}>
                  {line}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {activeSection === 'computer' &&
      computerRound.phase === 'count' &&
      isPlayerCountTurn &&
      computerSubmitted &&
      hasComputerGuess ? (
        <View style={styles.practicePanel}>
          <View style={styles.modeHeader}>
            <View>
              <Text style={styles.modeKicker}>Peg your points</Text>
              <Text style={styles.modeTitle}>Move your peg on the board.</Text>
            </View>
          </View>
          <Text style={styles.modeCopy}>
            Start from your current score and move your peg by the points you counted. The coach
            will only confirm after you check it.
          </Text>
          <Pressable style={[styles.primaryButton, styles.fitButton]} onPress={checkPlayerPeg}>
            <Feather name="map-pin" size={18} color="#FAFBF8" />
            <Text style={styles.primaryButtonText}>Check peg</Text>
          </Pressable>
          {pegSubmitted ? (
            <View style={[styles.feedback, isPegCorrect ? styles.correct : styles.missed]}>
              <Text style={styles.feedbackTitle}>
                {isPegCorrect ? 'Peg is correct.' : 'That peg is not quite right.'}
              </Text>
              <Text style={styles.feedbackCopy}>
                {isPegCorrect
                  ? `You moved from ${roundStartPlayerScore} to ${expectedPlayerPeg}.`
                  : `You should land on ${expectedPlayerPeg} for this hand.`}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {activeSection === 'computer' && isCountComplete ? (
        <View style={styles.practicePanel}>
          <View style={styles.modeHeader}>
            <View>
              <Text style={styles.modeKicker}>Hand complete</Text>
              <Text style={styles.modeTitle}>Deal the next hand.</Text>
            </View>
          </View>
          <Text style={styles.modeCopy}>
            Scores carry forward and the deal alternates to{' '}
            {computerRound.dealer === 'player' ? 'the computer' : 'you'}.
          </Text>
          <Pressable style={[styles.primaryButton, styles.fitButton]} onPress={dealNextComputerHand}>
            <Feather name="play" size={18} color="#FAFBF8" />
            <Text style={styles.primaryButtonText}>Deal next hand</Text>
          </Pressable>
        </View>
      ) : null}
        </View>

        <View style={styles.boardRail}>
          <CribbageBoard
            computerBackPeg={computerBoardBackPeg}
            computerFrontPeg={computerBoardFrontPeg}
            onPegChange={(nextPeg) => {
              setPlayerPeg(nextPeg);
              setPegSubmitted(false);
            }}
            playerBackPeg={playerBoardBackPeg}
            playerFrontPeg={playerBoardFrontPeg}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function previousScoringPeg(startScore: number, plays: { player: string; points: number }[], player: string) {
  const playerScoringPlays = plays.filter((play) => play.player === player && play.points > 0);
  if (playerScoringPlays.length === 0) return startScore;

  const scoreBeforeLastPeg = playerScoringPlays
    .slice(0, -1)
    .reduce((total, play) => Math.min(120, total + play.points), startScore);

  return scoreBeforeLastPeg;
}

function CardBackRow({ count }: { count: number }) {
  return (
    <View style={styles.cardBackRow}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.cardBack}>
          <View style={styles.cardBackInner} />
        </View>
      ))}
    </View>
  );
}

function PlayedCardRow({ cards, label }: { cards: Card[]; label: string }) {
  return (
    <View style={styles.playedRow}>
      <Text style={styles.playedRowLabel}>{label}</Text>
      {cards.length > 0 ? (
        <CardRow cards={cards} size="small" />
      ) : (
        <Text style={styles.mutedText}>No cards yet.</Text>
      )}
    </View>
  );
}

function CutDeck({ count, onChoose }: { count: number; onChoose: (index: number) => void }) {
  return (
    <View style={styles.cutDeck}>
      {Array.from({ length: count }).map((_, index) => (
        <Pressable
          key={index}
          accessibilityLabel={`Cut card ${index + 1}`}
          onPress={() => onChoose(index)}
          style={[styles.cutCardBack, { marginLeft: index === 0 ? 0 : -32 }]}
        >
          <View style={styles.cutCardBackInner} />
        </Pressable>
      ))}
    </View>
  );
}

function ModePreview({
  icon,
  title,
  copy,
  bullets,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  copy: string;
  bullets: string[];
}) {
  return (
    <View style={styles.modePreview}>
      <View style={styles.previewIcon}>
        <Feather name={icon} size={26} color="#2D5A3B" />
      </View>
      <Text style={styles.previewTitle}>{title}</Text>
      <Text style={styles.previewCopy}>{copy}</Text>
      <View style={styles.previewList}>
        {bullets.map((bullet) => (
          <View key={bullet} style={styles.previewItem}>
            <Feather name="check-circle" size={17} color="#2D5A3B" />
            <Text style={styles.previewItemText}>{bullet}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    marginHorizontal: 'auto',
    maxWidth: 1360,
    padding: 20,
    gap: 20,
    width: '100%',
  },
  gameLayout: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  mainColumn: {
    flex: 1,
    gap: 20,
    minWidth: 0,
  },
  boardRail: {
    flexShrink: 0,
    maxWidth: '100%',
    width: 340,
  },
  header: {
    gap: 8,
  },
  kicker: {
    color: '#7A3E2E',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: '#26302A',
    fontSize: 34,
    fontWeight: '800',
  },
  copy: {
    color: '#586158',
    fontSize: 16,
    lineHeight: 23,
  },
  sectionNav: {
    backgroundColor: '#E8E1D4',
    borderRadius: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 6,
  },
  sectionButton: {
    alignItems: 'center',
    borderRadius: 7,
    flexDirection: 'row',
    gap: 7,
    minHeight: 42,
    paddingHorizontal: 13,
  },
  activeSectionButton: {
    backgroundColor: '#2D5A3B',
  },
  sectionButtonText: {
    color: '#26302A',
    fontSize: 15,
    fontWeight: '800',
  },
  activeSectionText: {
    color: '#FAFBF8',
  },
  practicePanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DFD8CB',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    gap: 18,
  },
  modeHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
  },
  modeKicker: {
    color: '#7A3E2E',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  modeTitle: {
    color: '#26302A',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  modeCopy: {
    color: '#586158',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 680,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#26302A',
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: '#E8F0E7',
    borderRadius: 999,
    color: '#315C3F',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  starterBlock: {
    gap: 10,
  },
  answerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    backgroundColor: '#F7F4EE',
    borderColor: '#D7CFC0',
    borderRadius: 8,
    borderWidth: 1,
    color: '#26302A',
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2D5A3B',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  disabledButton: {
    opacity: 0.45,
  },
  fitButton: {
    alignSelf: 'flex-start',
  },
  primaryButtonText: {
    color: '#FAFBF8',
    fontSize: 16,
    fontWeight: '800',
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#ECE6DA',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  scoreStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  scoreBox: {
    backgroundColor: '#F7F4EE',
    borderColor: '#DDD5C8',
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 110,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  scoreLabel: {
    color: '#586158',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  scoreValue: {
    color: '#26302A',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 2,
  },
  scoreValueSmall: {
    color: '#26302A',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 6,
  },
  cutPanel: {
    backgroundColor: '#F7F4EE',
    borderColor: '#DDD5C8',
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 14,
  },
  cutColumn: {
    gap: 10,
  },
  cutResultRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  cutDeck: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingLeft: 32,
    paddingVertical: 8,
  },
  cutCardBack: {
    alignItems: 'center',
    aspectRatio: 0.7,
    backgroundColor: '#2D5A3B',
    borderColor: '#1F3F2A',
    borderRadius: 7,
    borderWidth: 1,
    height: 102,
    justifyContent: 'center',
    padding: 6,
    shadowColor: '#1E241F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  cutCardBackInner: {
    borderColor: '#D9E7D3',
    borderRadius: 5,
    borderWidth: 2,
    height: '100%',
    width: '100%',
  },
  peggingPanel: {
    backgroundColor: '#F7F4EE',
    borderColor: '#DDD5C8',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  peggingScoreNote: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDD5C8',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  playedRow: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDD5C8',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 10,
  },
  playedRowLabel: {
    color: '#26302A',
    fontSize: 14,
    fontWeight: '800',
  },
  pegPrompt: {
    backgroundColor: '#EEF5EA',
    borderColor: '#BFD4B7',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  peggingActions: {
    gap: 10,
  },
  correctText: {
    color: '#2D5A3B',
    fontWeight: '800',
  },
  missedText: {
    color: '#9A392F',
    fontWeight: '800',
  },
  mutedText: {
    color: '#7A8178',
    fontSize: 14,
    fontWeight: '700',
  },
  cardBackRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardBack: {
    alignItems: 'center',
    aspectRatio: 0.7,
    backgroundColor: '#2D5A3B',
    borderColor: '#1F3F2A',
    borderRadius: 7,
    borderWidth: 1,
    height: 150,
    justifyContent: 'center',
    padding: 8,
    shadowColor: '#1E241F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  cardBackInner: {
    borderColor: '#D9E7D3',
    borderRadius: 5,
    borderWidth: 2,
    height: '100%',
    width: '100%',
  },
  feedback: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  correct: {
    backgroundColor: '#EEF7EC',
    borderColor: '#B8D7AE',
  },
  missed: {
    backgroundColor: '#FFF4EA',
    borderColor: '#E2B58B',
  },
  feedbackTitle: {
    color: '#26302A',
    fontSize: 22,
    fontWeight: '800',
  },
  feedbackCopy: {
    color: '#586158',
    fontSize: 15,
    lineHeight: 21,
  },
  breakdown: {
    gap: 6,
    paddingTop: 6,
  },
  breakdownLine: {
    color: '#26302A',
    fontSize: 15,
    lineHeight: 21,
  },
  modePreview: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DFD8CB',
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 720,
    padding: 20,
    gap: 12,
  },
  previewIcon: {
    alignItems: 'center',
    backgroundColor: '#E8F0E7',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  previewTitle: {
    color: '#26302A',
    fontSize: 25,
    fontWeight: '900',
  },
  previewCopy: {
    color: '#586158',
    fontSize: 16,
    lineHeight: 23,
  },
  previewList: {
    gap: 9,
    paddingTop: 4,
  },
  previewItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  previewItemText: {
    color: '#26302A',
    fontSize: 15,
    fontWeight: '700',
  },
});
