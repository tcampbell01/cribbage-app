import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  type ComputerRound,
  type PeggingPlay,
  type PlayerId,
} from '@/game/computerGame';
import { dealPracticeHand } from '@/game/deck';
import { scoreShowHand } from '@/game/scoring';
import { formatScoreBreakdown } from '@/game/teaching';

type AppSection = 'practice' | 'computer' | 'realtime';
type PendingPegMove = {
  anchor: number;
  from: number;
  label: string;
  points: number;
  target: number;
};
type CountStep = 'player' | 'computer' | 'crib';
type CoachMessage = {
  body: string;
  title: string;
};

const GAME_LIMIT = 121;

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
  const [cribGuess, setCribGuess] = useState('');
  const [cribSubmitted, setCribSubmitted] = useState(false);
  const [cribPegSubmitted, setCribPegSubmitted] = useState(false);
  const [playerScore, setPlayerScore] = useState(0);
  const [computerGameScore, setComputerGameScore] = useState(0);
  const [playerBackScore, setPlayerBackScore] = useState(0);
  const [computerBackScore, setComputerBackScore] = useState(0);
  const [roundStartPlayerScore, setRoundStartPlayerScore] = useState(0);
  const [playerPeg, setPlayerPeg] = useState(0);
  const [pegSubmitted, setPegSubmitted] = useState(false);
  const [pendingPegMove, setPendingPegMove] = useState<PendingPegMove | null>(null);
  const [pendingPegChecked, setPendingPegChecked] = useState(false);
  const [peggingSummaryDismissed, setPeggingSummaryDismissed] = useState(false);
  const [computerGoNoticeKey, setComputerGoNoticeKey] = useState('');
  const [dismissedGoPopupKey, setDismissedGoPopupKey] = useState('');
  const [completedCounts, setCompletedCounts] = useState<CountStep[]>([]);
  const [dealWarning, setDealWarning] = useState('');
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
  const cribScore = useMemo(
    () =>
      computerRound.starter
        ? scoreShowHand(computerRound.crib, computerRound.starter, true)
        : { total: 0, items: [] },
    [computerRound],
  );
  const numericGuess = Number.parseInt(guess, 10);
  const numericComputerGuess = Number.parseInt(computerGuess, 10);
  const numericCribGuess = Number.parseInt(cribGuess, 10);
  const hasGuess = Number.isFinite(numericGuess);
  const hasComputerGuess = Number.isFinite(numericComputerGuess);
  const hasCribGuess = Number.isFinite(numericCribGuess);
  const isCorrect = submitted && hasGuess && numericGuess === score.total;
  const isComputerCorrect =
    computerSubmitted && hasComputerGuess && numericComputerGuess === computerScore.total;
  const isCribCorrect = cribSubmitted && hasCribGuess && numericCribGuess === cribScore.total;
  const starterJackDealer =
    computerRound.starter?.rank === 'J' && computerRound.dealer ? computerRound.dealer : null;
  const starterJackPlayerPoints = starterJackDealer === 'player' ? 2 : 0;
  const starterJackComputerPoints = starterJackDealer === 'computer' ? 2 : 0;
  const playerPeggingScoreEvents = [
    starterJackPlayerPoints,
    ...computerRound.peggingPlayed
      .filter((play) => play.player === 'player' && play.points > 0)
      .map((play) => play.points),
  ];
  const computerPeggingScoreEvents = [
    starterJackComputerPoints,
    ...computerRound.peggingPlayed
      .filter((play) => play.player === 'computer' && play.points > 0)
      .map((play) => play.points),
  ];
  const postPeggingPlayerScore = Math.min(
    GAME_LIMIT,
    playerScore + starterJackPlayerPoints + computerRound.peggingScores.player,
  );
  const postPeggingComputerScore = Math.min(
    GAME_LIMIT,
    computerGameScore + starterJackComputerPoints + computerRound.peggingScores.computer,
  );
  const countOrder: CountStep[] =
    computerRound.dealer === 'player'
      ? ['computer', 'player', 'crib']
      : ['player', 'computer', 'crib'];
  const isPeggingSummaryActive =
    computerRound.phase === 'count' &&
    computerRound.peggingPlayed.length > 0 &&
    !pendingPegMove &&
    !peggingSummaryDismissed;
  const currentCountStep =
    computerRound.phase === 'count' && !pendingPegMove && !isPeggingSummaryActive
      ? countOrder.find((owner) => !completedCounts.includes(owner)) ?? null
      : null;
  const isPlayerCountTurn = currentCountStep === 'player';
  const isComputerCountTurn = currentCountStep === 'computer';
  const isCribCountTurn = currentCountStep === 'crib';
  const isPlayerCribCountTurn = isCribCountTurn && computerRound.dealer === 'player';
  const isCountComplete =
    computerRound.phase === 'count' && !isPeggingSummaryActive && currentCountStep === null;
  const playerCountVisible = completedCounts.includes('player') || isPlayerCountTurn;
  const computerCountVisible = completedCounts.includes('computer') || isComputerCountTurn;
  const cribCountVisible = completedCounts.includes('crib') || isCribCountTurn;
  const isCountingPegPractice =
    activeSection === 'computer' &&
    computerRound.phase === 'count' &&
    isPlayerCountTurn &&
    computerSubmitted;
  const isCribPegPractice =
    activeSection === 'computer' &&
    computerRound.phase === 'count' &&
    isPlayerCribCountTurn &&
    cribSubmitted;
  const countingPegStartScore = isCountingPegPractice ? roundStartPlayerScore : postPeggingPlayerScore;
  const expectedPlayerPeg = Math.min(GAME_LIMIT, countingPegStartScore + computerScore.total);
  const playerAfterHandScore = completedCounts.includes('player') ? expectedPlayerPeg : postPeggingPlayerScore;
  const expectedCribPeg = Math.min(GAME_LIMIT, playerAfterHandScore + cribScore.total);
  const computerAfterHandScore = completedCounts.includes('computer')
    ? Math.min(GAME_LIMIT, postPeggingComputerScore + computerHandScore.total)
    : postPeggingComputerScore;
  const displayedPlayerScore = completedCounts.includes('crib') && computerRound.dealer === 'player'
    ? Math.min(GAME_LIMIT, playerAfterHandScore + cribScore.total)
    : isCribPegPractice
      ? playerPeg
    : completedCounts.includes('player')
      ? playerAfterHandScore
    : isCountingPegPractice
      ? playerPeg
      : postPeggingPlayerScore;
  const displayedComputerScore = completedCounts.includes('crib') && computerRound.dealer === 'computer'
    ? Math.min(GAME_LIMIT, computerAfterHandScore + cribScore.total)
    : computerCountVisible
      ? computerAfterHandScore
      : postPeggingComputerScore;
  const playerBackAfterPegging = hasScoringEvent(playerPeggingScoreEvents)
    ? previousScoringPeg(playerScore, playerPeggingScoreEvents)
    : playerBackScore;
  const playerBackAfterHand = completedCounts.includes('player')
    ? computerScore.total > 0
      ? countingPegStartScore
      : playerBackAfterPegging
    : playerBackAfterPegging;
  const playerBackAfterCrib = completedCounts.includes('crib') && computerRound.dealer === 'player'
    ? cribScore.total > 0
      ? playerAfterHandScore
      : playerBackAfterHand
    : playerBackAfterHand;
  const computerBackAfterPegging = hasScoringEvent(computerPeggingScoreEvents)
    ? previousScoringPeg(computerGameScore, computerPeggingScoreEvents)
    : computerBackScore;
  const computerBackAfterHand = completedCounts.includes('computer')
    ? computerHandScore.total > 0
      ? postPeggingComputerScore
      : computerBackAfterPegging
    : computerBackAfterPegging;
  const computerBackAfterCrib = completedCounts.includes('crib') && computerRound.dealer === 'computer'
    ? cribScore.total > 0
      ? computerAfterHandScore
      : computerBackAfterHand
    : computerBackAfterHand;
  const playerBoardFrontPeg =
    pendingPegMove
      ? pendingPegMove.anchor
      : isCribPegPractice
        ? playerAfterHandScore
      : isCountingPegPractice
        ? countingPegStartScore
      : completedCounts.includes('crib') && computerRound.dealer === 'player'
        ? displayedPlayerScore
      : completedCounts.includes('player')
        ? playerAfterHandScore
        : postPeggingPlayerScore;
  const playerBoardBackPeg =
    pendingPegMove
      ? playerPeg
      : isCribPegPractice
        ? playerPeg
      : isCountingPegPractice
        ? playerPeg
      : completedCounts.includes('crib') && computerRound.dealer === 'player'
        ? playerBackAfterCrib
      : completedCounts.includes('player')
        ? playerBackAfterHand
        : playerBackAfterPegging;
  const computerBoardBackPeg = completedCounts.includes('crib') && computerRound.dealer === 'computer'
    ? computerBackAfterCrib
    : computerCountVisible
      ? computerBackAfterHand
      : computerBackAfterPegging;
  const computerBoardFrontPeg = displayedComputerScore;
  const isPendingPegCorrect =
    Boolean(pendingPegMove) && playerPeg === pendingPegMove?.target;
  const isPegCorrect = pegSubmitted && playerPeg === expectedPlayerPeg;
  const isCribPegCorrect = cribPegSubmitted && playerPeg === expectedCribPeg;
  const playerHasLegalPeggingCard =
    computerRound.phase === 'pegging' &&
    !pendingPegMove &&
    legalPeggingCards(computerRound.playerPeggingHand, computerRound.peggingCount).length > 0;
  const lastPeggingPlay = computerRound.peggingPlayed.at(-1);
  const cribOwnerText = computerRound.dealer === 'player' ? 'your crib' : "the computer's crib";
  const goAwardOwner = getGoAwardOwner(computerRound);
  const goAwardExplanation = goAwardOwner
    ? `${goAwardOwner === 'player' ? 'You get' : 'Computer gets'} 1 point for Go because neither player can play another card without taking the count over 31. The count starts over at 0, and pegging continues.`
    : null;
  const goPopupKey = goAwardOwner
    ? `${goAwardOwner}-${computerRound.peggingScores[goAwardOwner]}-${computerRound.peggingPlayed.length}`
    : computerGoNoticeKey;
  const goPopupMessage = goAwardOwner
    ? getGoPopupMessage(goAwardOwner)
    : computerGoNoticeKey
      ? getComputerSaysGoPopupMessage()
      : null;
  const showGoPopup = Boolean(goPopupMessage && goPopupKey !== dismissedGoPopupKey);
  const peggingCallout = getPeggingCallout(pendingPegMove, lastPeggingPlay);
  const starterJackCallout = starterJackDealer ? getStarterJackCallout(starterJackDealer) : null;
  const peggingDialogue =
    computerRound.phase === 'pegging' || pendingPegMove
      ? getPeggingDialogue(computerRound, pendingPegMove)
      : '';
  const peggingSummaryLines = getPeggingSummaryLines(computerRound.peggingPlayed);
  const practiceCoachMessage = getPracticeCoachMessage({
    hasGuess,
    isCorrect,
    scoreTotal: score.total,
    submitted,
  });
  const computerCoachMessage = getComputerCoachMessage({
    completedCounts,
    computerRound,
    cribScoreTotal: cribScore.total,
    cribSubmitted,
    currentCountStep,
    hasCribGuess,
    hasComputerGuess,
    isCribCorrect,
    isComputerCorrect,
    lastPeggingPlay,
    pendingPegMove,
    playerHasLegalPeggingCard,
    cribOwnerText,
    goAwardExplanation,
    isPeggingSummaryActive,
    selectedDiscardCount: selectedDiscards.length,
    starterJackDealer,
  });
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
    setPeggingSummaryDismissed(false);
    setComputerGoNoticeKey('');
    setDismissedGoPopupKey('');
    setCompletedCounts([]);
    setDealWarning('');
    setCribGuess('');
    setCribSubmitted(false);
    setCribPegSubmitted(false);
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
    setCribGuess('');
    setCribSubmitted(false);
    setCribPegSubmitted(false);
    resetPegPrompts(0);
  }

  function newComputerRound() {
    setComputerRound(startComputerRound());
    setPlayerBackScore(0);
    setComputerBackScore(0);
    setPlayerScore(0);
    setComputerGameScore(0);
    setSelectedDiscards([]);
    setComputerGuess('');
    setComputerSubmitted(false);
    setCribGuess('');
    setCribSubmitted(false);
    setCribPegSubmitted(false);
    resetPegPrompts();
  }

  function dealComputerHand() {
    setComputerRound((round) => dealAfterCut(round));
    setSelectedDiscards([]);
    setComputerGuess('');
    setComputerSubmitted(false);
    setCribGuess('');
    setCribSubmitted(false);
    setCribPegSubmitted(false);
    resetPegPrompts();
  }

  function chooseCutCard(index: number) {
    setComputerRound((round) => choosePlayerCut(round, index));
  }

  function applyStarterCut(round: typeof computerRound, index: number) {
    const peggingRound = chooseStarterCut(round, index);

    if (peggingRound.starter?.rank === 'J' && peggingRound.dealer === 'player') {
      queuePendingPegMove(0, 2, 'heels for 2', playerBackScore, 0);
      return peggingRound;
    }

    return peggingRound.peggingTurn === 'computer'
      ? playComputerPeggingTurn(peggingRound)
      : peggingRound;
  }

  function chooseStarterCard(index: number) {
    setComputerRound((round) => applyStarterCut(round, index));
  }

  function letComputerCutStarter() {
    setComputerRound((round) => applyStarterCut(round, Math.floor(round.remainingDeck.length / 2)));
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
          getBackPegBeforePlayerPeggingScore(
            round,
            previousPlayerPeggingScore,
            playerScore,
            playerBackScore,
            starterJackPlayerPoints,
          ),
        );
        return afterPlayer;
      }

      if (afterPlayer.phase !== 'pegging') return afterPlayer;

      const afterComputerResponse = playComputerPeggingTurn(afterPlayer);
      noteComputerSaysGo(afterPlayer, afterComputerResponse);
      if (afterComputerResponse.peggingScores.player > previousPlayerPeggingScore) {
        queuePendingPegMove(
          previousPlayerPeggingScore,
          afterComputerResponse.peggingScores.player,
          'go for 1',
          getBackPegBeforePlayerPeggingScore(
            round,
            previousPlayerPeggingScore,
            playerScore,
            playerBackScore,
            starterJackPlayerPoints,
          ),
        );
      }

      return afterComputerResponse;
    });
  }

  function queuePendingPegMove(
    fromPeggingScore: number,
    targetPeggingScore: number,
    label: string,
    backPegStart: number,
    extraBasePoints = starterJackPlayerPoints,
  ) {
    const anchor = Math.min(GAME_LIMIT, playerScore + extraBasePoints + fromPeggingScore);
    const target = Math.min(GAME_LIMIT, playerScore + extraBasePoints + targetPeggingScore);

    setPlayerPeg(backPegStart);
    setPendingPegMove({
      anchor,
      from: backPegStart,
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
    setComputerRound((round) => {
      if (round.phase !== 'pegging' || round.peggingTurn !== 'computer') return round;

      const previousPlayerPeggingScore = round.peggingScores.player;
      const afterComputerResponse = playComputerPeggingTurn(round);
      noteComputerSaysGo(round, afterComputerResponse);
      if (afterComputerResponse.peggingScores.player > previousPlayerPeggingScore) {
        queuePendingPegMove(
          previousPlayerPeggingScore,
          afterComputerResponse.peggingScores.player,
          getLatestPlayerPeggingScoreLabel(afterComputerResponse, 'go for 1'),
          getBackPegBeforePlayerPeggingScore(
            round,
            previousPlayerPeggingScore,
            playerScore,
            playerBackScore,
            starterJackPlayerPoints,
          ),
        );
      }
      return afterComputerResponse;
    });
  }

  function submitComputerCount() {
    setComputerSubmitted(true);
    setRoundStartPlayerScore(postPeggingPlayerScore);
    setPlayerPeg(playerBackAfterPegging);
    setPegSubmitted(false);
  }

  function submitCribCount() {
    setDealWarning('');
    setCribSubmitted(true);
    setPlayerPeg(playerBackAfterHand);
    setCribPegSubmitted(false);
  }

  function checkPlayerPeg() {
    setPegSubmitted(true);
    if (playerPeg === expectedPlayerPeg) {
      setCompletedCounts((current) =>
        current.includes('player') ? current : [...current, 'player'],
      );
    }
  }

  function checkCribPeg() {
    setDealWarning('');
    setCribPegSubmitted(true);
    if (playerPeg === expectedCribPeg) {
      setCompletedCounts((current) =>
        current.includes('crib') ? current : [...current, 'crib'],
      );
    }
  }

  function continueAfterComputerCount() {
    setDealWarning('');
    setCompletedCounts((current) =>
      current.includes('computer') ? current : [...current, 'computer'],
    );
  }

  function continueAfterCribCount() {
    setDealWarning('');
    setCompletedCounts((current) =>
      current.includes('crib') ? current : [...current, 'crib'],
    );
  }

  function continueToCountingPhase() {
    setDealWarning('');
    setPeggingSummaryDismissed(true);
  }

  function dealNextComputerHand() {
    if (!isCountComplete) {
      setDealWarning("You can't deal the next hand until you've counted both hands and the crib.");
      return;
    }

    const nextDealer = computerRound.dealer === 'player' ? 'computer' : 'player';
    const nextPlayerScore =
      computerRound.dealer === 'player'
        ? Math.min(GAME_LIMIT, playerAfterHandScore + cribScore.total)
        : displayedPlayerScore;
    const nextComputerScore =
      computerRound.dealer === 'computer'
        ? Math.min(GAME_LIMIT, computerAfterHandScore + cribScore.total)
        : displayedComputerScore;

    setPlayerScore(nextPlayerScore);
    setComputerGameScore(nextComputerScore);
    setPlayerBackScore(playerBackAfterCrib);
    setComputerBackScore(computerBackAfterCrib);
    setComputerRound(startDealtRound(nextDealer));
    setSelectedDiscards([]);
    setComputerGuess('');
    setComputerSubmitted(false);
    setCribGuess('');
    setCribSubmitted(false);
    setCribPegSubmitted(false);
    setRoundStartPlayerScore(nextPlayerScore);
    setPlayerPeg(nextPlayerScore);
    setPegSubmitted(false);
    setPendingPegMove(null);
    setPendingPegChecked(false);
    setPeggingSummaryDismissed(false);
    setComputerGoNoticeKey('');
    setDismissedGoPopupKey('');
    setCompletedCounts([]);
    setDealWarning('');
  }

  function noteComputerSaysGo(before: ComputerRound, after: ComputerRound) {
    if (!didComputerSayGo(before, after)) return;

    setComputerGoNoticeKey(
      `computer-go-${after.peggingPlayed.length}-${after.peggingCount}-${after.playerPeggingHand.length}-${after.computerPeggingHand.length}`,
    );
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
          <CoachBox message={practiceCoachMessage} />

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
                  ? 'Draw low card for crib.'
                  : computerRound.phase === 'discard'
                    ? `Choose 2 crib cards for ${cribOwnerText}.`
                    : computerRound.phase === 'starterCut'
                      ? 'Cut the starter card.'
                      : computerRound.phase === 'pegging'
                        ? 'Lay down cards toward 31.'
                        : isPlayerCribCountTurn
                          ? 'Count your crib.'
                          : 'Count your hand.'}
              </Text>
            </View>
            <Pressable style={styles.iconButton} onPress={newComputerRound} accessibilityLabel="New computer round">
              <Feather name="refresh-cw" size={20} color="#26302A" />
            </Pressable>
          </View>
          <Text style={styles.modeCopy}>
            {computerRound.phase === 'cut'
              ? 'Pick a card from the deck to cut. The computer will cut after you, and the lower card gets the crib.'
              : computerRound.phase === 'discard'
                ? `The dealer always gets the crib. Choose 2 crib cards to put into ${cribOwnerText}. The player without the crib starts first.`
              : computerRound.phase === 'starterCut'
                  ? 'Cut the starter card before pegging begins. This extra card counts with both hands and the crib. The player without the crib starts first.'
                  : computerRound.phase === 'pegging'
                    ? 'Lay down cards in turn and count pegging points as the running total moves toward 31. The player without the crib starts first.'
                    : 'Pegging is complete. Count your hand before asking the coach.'}
          </Text>
          {computerRound.phase !== 'pegging' && !pendingPegMove ? (
            <CoachBox message={computerCoachMessage} />
          ) : null}

          {computerRound.phase === 'pegging' || pendingPegMove ? (
            <PeggingStatusStrip
              computerPeggingPoints={computerRound.peggingScores.computer}
              count={computerRound.peggingCount}
              pendingPegMove={Boolean(pendingPegMove)}
              playerPeggingPoints={computerRound.peggingScores.player}
              turn={computerRound.peggingTurn}
            />
          ) : null}

          {computerRound.phase !== 'pegging' && !pendingPegMove ? (
            <GamePointsPanel
              cribOwner={computerRound.dealer}
              computerScore={displayedComputerScore}
              playerScore={displayedPlayerScore}
            />
          ) : null}

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
                      ? 'You cut the lower card, so you deal first and get the crib. The dealer always gets the crib, and the player without the crib starts first.'
                      : 'The computer cut the lower card, so it deals first and gets the crib. The dealer always gets the crib, and the player without the crib starts first.'}
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
              {computerRound.dealer === 'player' ? (
                <>
                  <Text style={styles.sectionTitle}>Computer cuts the starter</Text>
                  <Text style={styles.modeCopy}>
                    You dealt this hand, so the computer cuts the starter card.
                  </Text>
                  <Pressable
                    style={[styles.primaryButton, styles.fitButton]}
                    onPress={letComputerCutStarter}
                  >
                    <Feather name="scissors" size={18} color="#FAFBF8" />
                    <Text style={styles.primaryButtonText}>Computer cut</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>Choose the starter cut</Text>
                  <CutDeck count={15} onChoose={chooseStarterCard} />
                </>
              )}
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
            <CardBackRow
              count={
                computerRound.phase === 'pegging'
                  ? computerRound.computerPeggingHand.length
                  : computerRound.computerHand.length
              }
            />
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
          {computerRound.phase === 'pegging' && computerRound.starter ? (
            <View style={styles.peggingContextRow}>
              <View style={styles.playedCardsColumn}>
                {peggingCallout || starterJackCallout ? (
                  <PeggingCallout callout={peggingCallout ?? starterJackCallout} />
                ) : null}
                <PlayedTimeline plays={computerRound.peggingPlayed} />
              </View>
              <View style={styles.peggingSideStack}>
                <View style={styles.starterSidePanel}>
                  <Text style={styles.sectionTitle}>Starter card</Text>
                  <CardRow cards={[computerRound.starter]} size="small" />
                  <Text style={styles.feedbackCopy}>Counts for hands and crib, not pegging.</Text>
                  {starterJackDealer ? (
                    <Text style={styles.feedbackCopy}>
                      {starterJackDealer === 'player' ? 'You peg' : 'Computer pegs'} 2 for the starter
                      jack.
                    </Text>
                  ) : null}
                </View>
                <GamePointsPanel
                  compact
                  cribOwner={computerRound.dealer}
                  computerScore={displayedComputerScore}
                  playerScore={displayedPlayerScore}
                />
              </View>
            </View>
          ) : null}

          {computerRound.phase === 'count' && computerRound.starter ? (
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

          {cribCountVisible ? (
            <View style={styles.starterBlock}>
              <Text style={styles.sectionTitle}>
                {computerRound.dealer === 'player' ? 'Your crib' : 'Computer crib'}
              </Text>
              <CardRow cards={computerRound.crib} size="small" />
              {isCribCountTurn && computerRound.dealer === 'player' ? (
                <>
                  <View style={styles.answerRow}>
                    <TextInput
                      value={cribGuess}
                      onChangeText={(value) => {
                        setCribGuess(value.replace(/[^0-9]/g, ''));
                        setCribSubmitted(false);
                        setCribPegSubmitted(false);
                      }}
                      keyboardType="number-pad"
                      placeholder="Your crib points"
                      placeholderTextColor="#7A8178"
                      style={styles.input}
                      maxLength={2}
                    />
                    <Pressable style={styles.primaryButton} onPress={submitCribCount}>
                      <Feather name="check" size={18} color="#FAFBF8" />
                      <Text style={styles.primaryButtonText}>Check</Text>
                    </Pressable>
                  </View>
                  {cribSubmitted ? (
                    <View style={[styles.feedback, isCribCorrect ? styles.correct : styles.missed]}>
                      <Text style={styles.feedbackTitle}>
                        {isCribCorrect ? 'Correct.' : `Your crib scores ${cribScore.total}.`}
                      </Text>
                      <Text style={styles.feedbackCopy}>
                        {hasCribGuess
                          ? isCribCorrect
                            ? 'Good crib count. The full breakdown is below.'
                            : `You entered ${numericCribGuess}. Here is what the coach found.`
                          : 'Enter a number first, then try again.'}
                      </Text>
                      {hasCribGuess ? (
                        <View style={styles.breakdown}>
                          {formatScoreBreakdown(cribScore).map((line) => (
                            <Text key={line} style={styles.breakdownLine}>
                              {line}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </>
              ) : isCribCountTurn ? (
                <View style={[styles.feedback, styles.correct]}>
                  <Text style={styles.feedbackTitle}>Crib scores {cribScore.total}.</Text>
                  <Text style={styles.feedbackCopy}>
                    {computerRound.dealer === 'player' ? 'You move' : 'Computer moves'} from{' '}
                    {computerRound.dealer === 'player' ? playerAfterHandScore : computerAfterHandScore}{' '}
                    to{' '}
                    {computerRound.dealer === 'player'
                      ? Math.min(GAME_LIMIT, playerAfterHandScore + cribScore.total)
                      : Math.min(GAME_LIMIT, computerAfterHandScore + cribScore.total)}
                    .
                  </Text>
                  <View style={styles.breakdown}>
                    {formatScoreBreakdown(cribScore).map((line) => (
                      <Text key={line} style={styles.breakdownLine}>
                        {line}
                      </Text>
                    ))}
                  </View>
                  <Pressable
                    style={[styles.primaryButton, styles.fitButton]}
                    onPress={continueAfterCribCount}
                  >
                    <Feather name="play" size={18} color="#FAFBF8" />
                    <Text style={styles.primaryButtonText}>Continue</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {computerRound.phase === 'pegging' || pendingPegMove ? 'Your pegging cards' : 'Your hand'}
            </Text>
            {computerRound.phase === 'discard' ? (
              <Text style={styles.mutedText}>{selectedDiscards.length}/2 selected</Text>
            ) : null}
          </View>
          {pendingPegMove ? (
            <View style={styles.peggingPanel}>
                <View style={styles.pegPrompt}>
                  {computerRound.phase === 'count' && peggingCallout ? (
                    <PeggingCallout callout={peggingCallout} />
                  ) : null}
                  <View>
                    <Text style={styles.sectionTitle}>
                      {computerRound.phase === 'count'
                        ? 'Move your back peg before counting'
                        : 'Move your back peg before the computer plays'}
                    </Text>
                    <Text style={styles.feedbackCopy}>
                      {formatPendingPegMove(pendingPegMove, computerRound.phase)}
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
            </View>
          ) : null}
          {computerRound.phase !== 'count' || (playerCountVisible && !isPeggingSummaryActive) ? (
            <CardRow
              cards={
                computerRound.phase === 'pegging'
                  ? computerRound.playerPeggingHand
                  : pendingPegMove
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
          ) : !isPeggingSummaryActive ? (
            <Text style={styles.mutedText}>Your hand counts after the computer.</Text>
          ) : null}

          {isPeggingSummaryActive ? (
            <View style={styles.peggingSummary}>
              <View>
                <Text style={styles.sectionTitle}>Pegging summary</Text>
                <Text style={styles.feedbackCopy}>
                  Pegging is complete. Check the last-card point here before moving on to count
                  hands and crib.
                </Text>
              </View>
              <View style={styles.scoreStrip}>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreLabel}>Your pegging</Text>
                  <Text style={styles.scoreValue}>{computerRound.peggingScores.player}</Text>
                </View>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreLabel}>Computer pegging</Text>
                  <Text style={styles.scoreValue}>{computerRound.peggingScores.computer}</Text>
                </View>
              </View>
              <View style={styles.breakdown}>
                {peggingSummaryLines.length > 0 ? (
                  peggingSummaryLines.map((line) => (
                    <Text key={line} style={styles.breakdownLine}>
                      {line}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.breakdownLine}>No pegging points were scored.</Text>
                )}
              </View>
              <Pressable
                style={[styles.primaryButton, styles.fitButton]}
                onPress={continueToCountingPhase}
              >
                <Feather name="arrow-right-circle" size={18} color="#FAFBF8" />
                <Text style={styles.primaryButtonText}>Go on to counting phase</Text>
              </Pressable>
            </View>
          ) : null}

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
              <Text style={styles.modeTitle}>Move your back peg on the board.</Text>
            </View>
          </View>
          <Text style={styles.modeCopy}>
            Move your back peg ahead of your front peg by the points you counted. The coach will
            only confirm after you check it.
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

      {activeSection === 'computer' &&
      computerRound.phase === 'count' &&
      isPlayerCribCountTurn &&
      cribSubmitted &&
      hasCribGuess ? (
        <View style={styles.practicePanel}>
          <View style={styles.modeHeader}>
            <View>
              <Text style={styles.modeKicker}>Peg your crib points</Text>
              <Text style={styles.modeTitle}>Move your back peg on the board.</Text>
            </View>
          </View>
          <Text style={styles.modeCopy}>
            Move your back peg ahead of your front peg by the crib points you counted.
          </Text>
          <Pressable style={[styles.primaryButton, styles.fitButton]} onPress={checkCribPeg}>
            <Feather name="map-pin" size={18} color="#FAFBF8" />
            <Text style={styles.primaryButtonText}>Check peg</Text>
          </Pressable>
          {cribPegSubmitted ? (
            <View style={[styles.feedback, isCribPegCorrect ? styles.correct : styles.missed]}>
              <Text style={styles.feedbackTitle}>
                {isCribPegCorrect ? 'Peg is correct.' : 'That peg is not quite right.'}
              </Text>
              <Text style={styles.feedbackCopy}>
                {isCribPegCorrect
                  ? `You moved from ${playerAfterHandScore} to ${expectedCribPeg}.`
                  : `You should land on ${expectedCribPeg} for this crib.`}
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

      {activeSection === 'computer' && dealWarning ? (
        <View style={[styles.feedback, styles.missed]}>
          <Text style={styles.feedbackTitle}>Finish counting first.</Text>
          <Text style={styles.feedbackCopy}>{dealWarning}</Text>
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
          {peggingDialogue ? <DialogueBox text={peggingDialogue} /> : null}
        </View>
      </View>
      {goPopupMessage ? (
        <Modal
          animationType="fade"
          transparent
          visible={showGoPopup}
          onRequestClose={() => setDismissedGoPopupKey(goPopupKey)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.goModal}>
              <Text style={styles.modeKicker}>{goAwardOwner ? 'Go for 1' : 'Computer says go'}</Text>
              <Text style={styles.feedbackTitle}>{goPopupMessage.title}</Text>
              <Text style={styles.feedbackCopy}>{goPopupMessage.body}</Text>
              <Pressable
                style={[styles.primaryButton, styles.fitButton]}
                onPress={() => setDismissedGoPopupKey(goPopupKey)}
              >
                <Feather name="check" size={18} color="#FAFBF8" />
                <Text style={styles.primaryButtonText}>Got it</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </ScrollView>
  );
}

function previousScoringPeg(startScore: number, pointEvents: number[]) {
  const scoringEvents = pointEvents.filter((points) => points > 0);
  if (scoringEvents.length === 0) return startScore;

  const scoreBeforeLastPeg = scoringEvents
    .slice(0, -1)
    .reduce((total, points) => Math.min(GAME_LIMIT, total + points), startScore);

  return scoreBeforeLastPeg;
}

function hasScoringEvent(pointEvents: number[]) {
  return pointEvents.some((points) => points > 0);
}

function getBackPegBeforePlayerPeggingScore(
  round: ComputerRound,
  currentPeggingScore: number,
  playerScore: number,
  playerBackScore: number,
  starterJackPlayerPoints: number,
) {
  const pointEvents = [
    starterJackPlayerPoints,
    ...round.peggingPlayed
      .filter((play) => play.player === 'player' && play.points > 0)
      .map((play) => play.points),
  ];
  const calculatedBackPeg = hasScoringEvent(pointEvents)
    ? previousScoringPeg(playerScore, pointEvents)
    : playerBackScore;
  const currentFrontPeg = Math.min(GAME_LIMIT, playerScore + starterJackPlayerPoints + currentPeggingScore);

  return Math.min(calculatedBackPeg, currentFrontPeg);
}

function getLatestPlayerPeggingScoreLabel(round: ComputerRound, fallback: string) {
  const latestPlayerPlay = round.peggingPlayed.findLast((play) => play.player === 'player');

  return latestPlayerPlay?.points && latestPlayerPlay.points > 0 ? latestPlayerPlay.label : fallback;
}

function unexplainedGoPoints(plays: PeggingPlay[], score: number, player: PlayerId) {
  const cardPoints = plays
    .filter((play) => play.player === player)
    .reduce((total, play) => total + play.points, 0);

  return Math.max(0, score - cardPoints);
}

function getGoAwardOwner(round: ComputerRound) {
  const lastPlay = round.peggingPlayed.at(-1);

  if (round.phase !== 'pegging' || round.peggingCount !== 0 || !lastPlay) return null;

  return unexplainedGoPoints(round.peggingPlayed, round.peggingScores[lastPlay.player], lastPlay.player) >
    0
    ? lastPlay.player
    : null;
}

function getGoPopupMessage(owner: PlayerId): CoachMessage {
  if (owner === 'player') {
    return {
      title: 'You get 1 point for Go.',
      body: 'The computer does not have a card they can play without taking the count over 31, so you score 1 for Go. The count starts over at 0.',
    };
  }

  return {
    title: 'Computer gets 1 point for Go.',
    body: 'You said Go because you do not have a card you can play without taking the count over 31. The computer takes 1 point for Go, and the count starts over at 0.',
  };
}

function getComputerSaysGoPopupMessage(): CoachMessage {
  return {
    title: 'Computer says Go.',
    body: 'The computer does not have a card they can play without taking the count over 31. No point is scored yet, and it is your turn to play if you can.',
  };
}

function didComputerSayGo(before: ComputerRound, after: ComputerRound) {
  return (
    before.phase === 'pegging' &&
    after.phase === 'pegging' &&
    before.peggingTurn === 'computer' &&
    after.peggingTurn === 'player' &&
    before.peggingPlayed.length === after.peggingPlayed.length &&
    before.peggingCount === after.peggingCount &&
    before.peggingScores.player === after.peggingScores.player &&
    before.peggingScores.computer === after.peggingScores.computer
  );
}

function formatPendingPegMove(move: PendingPegMove, phase: ComputerRound['phase']) {
  const nextStep = phase === 'count' ? 'before counting' : 'before the computer plays';

  if (move.label === 'go for 1') {
    return `You get a Go for 1 because the computer does not have a card they can play without taking the count over 31. Move your back peg from ${move.from} to ${move.target}, ahead of your front peg, then check it ${nextStep}.`;
  }

  if (move.label === 'heels for 2') {
    return `The starter is a jack, so you get heels for 2. Move your back peg from ${move.from} to ${move.target}, ahead of your front peg, then check it ${nextStep}.`;
  }

  if (move.label.includes('31 for 2')) {
    return `You get 2 points for landing exactly on 31. Move your back peg from ${move.from} to ${move.target}, ahead of your front peg, then check it ${nextStep}.`;
  }

  return `${move.label}. Move your back peg from ${move.from} to ${move.target}, ahead of your front peg, then check it ${nextStep}.`;
}

function getPeggingCallout(
  pendingPegMove: PendingPegMove | null,
  lastPlay: PeggingPlay | undefined,
): CoachMessage | null {
  if (pendingPegMove) {
    const phrase = formatPeggingSay(pendingPegMove.label);
    return {
      title: phrase,
      body: `Say "${phrase}", then move your back peg from ${pendingPegMove.from} to ${pendingPegMove.target}, ahead of your front peg.`,
    };
  }

  if (!lastPlay || lastPlay.player !== 'computer' || lastPlay.points <= 0) return null;

  const phrase = formatPeggingSay(lastPlay.label);
  return {
    title: `Computer says: ${phrase}`,
    body: `The computer played ${cardLabel(lastPlay.card)} and scored ${lastPlay.points}.`,
  };
}

function getStarterJackCallout(owner: PlayerId): CoachMessage {
  return owner === 'player'
    ? {
        title: 'Heels for 2',
        body: 'Say "heels for 2." The starter is a jack, so you peg 2 before pegging starts.',
      }
    : {
        title: 'Computer says: Heels for 2',
        body: 'The starter is a jack, so the computer pegs 2 before pegging starts.',
      };
}

function formatPeggingSay(label: string) {
  if (label === 'go for 1') return 'Go for 1';

  return label
    .split(', ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(', ');
}

function getPeggingDialogue(round: ComputerRound, pendingPegMove: PendingPegMove | null) {
  const goAwardOwner = getGoAwardOwner(round);
  if (goAwardOwner === 'computer') {
    return `You said Go, and the computer took 1 point for Go because you did not have a card you could play without taking the count over 31. Now we start over. Count is now 0, and it is your turn.`;
  }

  if (goAwardOwner === 'player') {
    return `The computer could not play without taking the count over 31, so you get 1 point for Go. Move your back peg if needed, then the count starts over at 0.`;
  }

  const recentPlays = round.peggingPlayed.slice(-2);
  const resetPlay = recentPlays.length === 2 && recentPlays[0].count === 31 ? recentPlays[0] : null;
  const afterResetPlay = resetPlay ? recentPlays[1] : null;
  if (resetPlay && afterResetPlay) {
    const resetPlayer = resetPlay.player === 'player' ? 'You' : 'Computer';
    const nextPlayer = afterResetPlay.player === 'player' ? 'You' : 'Computer';
    const nextPointText =
      afterResetPlay.label && afterResetPlay.label !== 'No points'
        ? formatPeggingSay(afterResetPlay.label)
        : 'No points';
    const turnText = pendingPegMove
      ? 'move your back peg'
      : round.peggingTurn === 'player'
        ? "it's your turn"
        : "it's the computer's turn";

    return `${resetPlayer} played ${cardLabel(
      resetPlay.card,
    )} and hit 31 for 2, so we started over. ${nextPlayer} played ${cardLabel(
      afterResetPlay.card,
    )}. ${nextPointText}. Count is now ${round.peggingCount}, and ${turnText}.`;
  }

  const playText =
    recentPlays.length > 0
      ? recentPlays
          .map((play) => `${play.player === 'player' ? 'You' : 'Computer'} played ${cardLabel(play.card)}`)
          .join(', then ')
      : 'No cards have been played yet';
  const lastPlay = recentPlays.at(-1);
  const pointText = pendingPegMove
    ? pendingPegMove.label
    : lastPlay?.label && lastPlay.label !== 'No points'
      ? lastPlay.label
      : 'No points';
  const turnText = pendingPegMove
    ? 'move your back peg'
    : round.peggingTurn === 'player'
      ? 'it is your turn'
      : "it is the computer's turn";

  return `${playText}. ${pointText}. Count is now ${round.peggingCount}, and ${turnText}.`;
}

function getPeggingSummaryLines(plays: PeggingPlay[]) {
  return plays
    .filter((play) => play.points > 0)
    .map(
      (play, index) =>
        `${index + 1}. ${play.player === 'player' ? 'You' : 'Computer'} played ${cardLabel(
          play.card,
        )}: ${play.label}`,
    );
}

function getPracticeCoachMessage({
  hasGuess,
  isCorrect,
  scoreTotal,
  submitted,
}: {
  hasGuess: boolean;
  isCorrect: boolean;
  scoreTotal: number;
  submitted: boolean;
}): CoachMessage {
  if (!submitted) {
    return {
      title: 'Count the hand',
      body: 'Add the hand and starter yourself, then enter the total points and check your answer.',
    };
  }

  if (!hasGuess) {
    return {
      title: 'Enter your count',
      body: 'Type the number of points you think the hand is worth before asking the coach to check it.',
    };
  }

  if (isCorrect) {
    return {
      title: 'Correct count',
      body: 'Now read the breakdown and look for the fifteens, pairs, runs, flush, and nobs that made the total.',
    };
  }

  return {
    title: 'Compare the count',
    body: `This hand scores ${scoreTotal}. Use the breakdown below to see which points you missed or overcounted.`,
  };
}

function getComputerCoachMessage({
  completedCounts,
  computerRound,
  cribScoreTotal,
  cribSubmitted,
  currentCountStep,
  hasCribGuess,
  hasComputerGuess,
  isCribCorrect,
  isComputerCorrect,
  lastPeggingPlay,
  pendingPegMove,
  playerHasLegalPeggingCard,
  cribOwnerText,
  goAwardExplanation,
  isPeggingSummaryActive,
  selectedDiscardCount,
  starterJackDealer,
}: {
  completedCounts: CountStep[];
  computerRound: ComputerRound;
  cribScoreTotal: number;
  cribSubmitted: boolean;
  currentCountStep: CountStep | null;
  hasCribGuess: boolean;
  hasComputerGuess: boolean;
  isCribCorrect: boolean;
  isComputerCorrect: boolean;
  lastPeggingPlay: PeggingPlay | undefined;
  pendingPegMove: PendingPegMove | null;
  playerHasLegalPeggingCard: boolean;
  cribOwnerText: string;
  goAwardExplanation: string | null;
  isPeggingSummaryActive: boolean;
  selectedDiscardCount: number;
  starterJackDealer: PlayerId | null;
}): CoachMessage {
  if (computerRound.phase === 'cut') {
    if (!computerRound.cut.player) {
      return {
        title: 'Cut for crib',
        body: 'Choose one card from the deck. The lower cut deals first and gets the crib.',
      };
    }

    if (!computerRound.dealer) {
      return {
        title: 'Cut again',
        body: 'Both cuts were the same rank, so nobody wins the crib yet. Cut again to break the tie.',
      };
    }

    return {
      title: 'Deal the first hand',
        body:
          computerRound.dealer === 'player'
          ? 'You cut lower, so you deal first and get the crib. The dealer always gets the crib, and the player without the crib starts first. Deal the hand when you are ready.'
          : 'The computer cut lower, so it deals first and gets the crib. The dealer always gets the crib, and the player without the crib starts first. Deal the hand when you are ready.',
    };
  }

  if (computerRound.phase === 'discard') {
    return {
      title: 'Choose the crib cards',
      body:
        selectedDiscardCount === 2
          ? `You have selected 2 crib cards for ${cribOwnerText}. The player without the crib starts first. Send them to continue.`
          : `Select ${2 - selectedDiscardCount} more crib card${
              selectedDiscardCount === 1 ? '' : 's'
            } to put into ${cribOwnerText}. The player without the crib starts first.`,
    };
  }

  if (computerRound.phase === 'starterCut') {
    return {
      title: 'Cut the starter',
      body:
        computerRound.dealer === 'player'
          ? 'You dealt, so the computer cuts the starter. If the starter is a jack, you peg 2 for heels. The player without the crib starts first.'
          : 'Choose the starter cut. If the starter is a jack, the computer pegs 2 for heels. The player without the crib starts first.',
    };
  }

  if (computerRound.phase === 'pegging') {
    if (pendingPegMove) {
      return {
        title: 'Move your back peg',
        body: formatPendingPegMove(pendingPegMove, computerRound.phase),
      };
    }

    if (starterJackDealer && computerRound.peggingPlayed.length === 0) {
      return {
        title: 'Starter jack',
        body:
          starterJackDealer === 'player'
            ? 'The starter is a jack, so you peg 2 for heels before pegging begins.'
            : 'The starter is a jack, so the computer pegs 2 for heels before pegging begins.',
      };
    }

    if (goAwardExplanation) {
      return {
        title: 'Go for 1',
        body: `${goAwardExplanation} ${
          computerRound.peggingTurn === 'player'
            ? 'It is your turn to play into the new count.'
            : 'The computer will play into the new count.'
        }`,
      };
    }

    if (computerRound.peggingTurn === 'player') {
      if (playerHasLegalPeggingCard) {
        return {
          title: "It's your turn",
          body: lastPeggingPlay
            ? `${lastPeggingPlay.player === 'player' ? 'You' : 'Computer'} played ${cardLabel(
                lastPeggingPlay.card,
              )}: ${lastPeggingPlay.label}. Play a card without taking the count over 31.`
            : 'The player without the crib starts first. Play a card without taking the running count over 31.',
        };
      }

      return {
        title: 'Say go',
        body: 'You do not have a legal card that keeps the count at 31 or lower, so press Go.',
      };
    }

    if (lastPeggingPlay && lastPeggingPlay.points > 0) {
      return {
        title: 'Pegging points',
        body: `${lastPeggingPlay.player === 'player' ? 'You' : 'Computer'} played ${cardLabel(
          lastPeggingPlay.card,
        )} and scored ${lastPeggingPlay.label}.`,
      };
    }

    return {
      title: 'Computer turn',
      body: 'The computer will play a legal card automatically. Watch the played card row and the running count.',
    };
  }

  if (computerRound.phase === 'count') {
    if (isPeggingSummaryActive) {
      return {
        title: 'Review pegging',
        body: 'Pegging is complete. Review each pegging score, including any last-card point, then go on to counting hands.',
      };
    }

    if (!currentCountStep) {
      return {
        title: 'Hand complete',
        body: 'Both hands and the crib have been counted. Deal the next hand to alternate the dealer.',
      };
    }

    if (currentCountStep === 'computer') {
      return {
        title: 'Computer counts',
        body: 'The non-dealer counts first. Review the computer hand and continue after its points are pegged.',
      };
    }

    if (currentCountStep === 'crib') {
      if (computerRound.dealer === 'player') {
        if (!cribSubmitted || !hasCribGuess) {
          return {
            title: 'Count your crib',
            body: 'The dealer counts the crib last. Enter your crib total, then move your back peg by the crib points.',
          };
        }

        if (isCribCorrect) {
          return {
            title: 'Peg your crib points',
            body: 'Your crib count is correct. Move your back peg ahead of your front peg by that many points, then check the peg.',
          };
        }

        return {
          title: 'Check your crib count',
          body: 'Compare your crib answer with the breakdown, then move your back peg to the score the coach found.',
        };
      }

      return {
        title: 'Count the crib',
        body: `The dealer counts the crib last. This crib scores ${cribScoreTotal}, then the hand is complete.`,
      };
    }

    if (!hasComputerGuess) {
      return {
        title: 'Count your hand',
        body:
          completedCounts.length === 0
            ? 'You are the non-dealer, so you count first. Enter your hand total before checking it.'
            : 'Now count your hand. Enter the total points, then check it before moving your peg.',
      };
    }

    if (isComputerCorrect) {
      return {
        title: 'Peg your hand points',
        body: 'Your count is correct. Move your back peg ahead of your front peg by that many points, then check the peg.',
      };
    }

    return {
      title: 'Fix the count',
      body: 'Compare your answer with the breakdown, then move your back peg to the score the coach found.',
    };
  }

  return {
    title: 'Coach',
    body: 'Follow the current step and count your own points before asking the coach to check.',
  };
}

function CoachBox({ message }: { message: CoachMessage }) {
  return (
    <View style={styles.coachBox}>
      <View style={styles.coachIcon}>
        <Feather name="message-circle" size={18} color="#2D5A3B" />
      </View>
      <View style={styles.coachTextBlock}>
        <Text style={styles.coachTitle}>{message.title}</Text>
        <Text style={styles.coachBody}>{message.body}</Text>
      </View>
    </View>
  );
}

function DialogueBox({ text }: { text: string }) {
  return (
    <View style={styles.dialogueBox}>
      <Text style={styles.scoreGroupTitle}>Pegging dialogue</Text>
      <Text style={styles.dialogueText}>{text}</Text>
    </View>
  );
}

function GamePointsPanel({
  compact = false,
  cribOwner,
  computerScore,
  playerScore,
}: {
  compact?: boolean;
  cribOwner: PlayerId | null;
  computerScore: number;
  playerScore: number;
}) {
  return (
    <View style={[styles.gamePointsPanel, compact ? styles.gamePointsSidePanel : null]}>
      <Text style={styles.scoreGroupTitle}>Game points</Text>
      <View style={compact ? styles.gamePointsList : styles.scoreStrip}>
        <View style={compact ? styles.gamePointRow : styles.scoreBox}>
          <Text style={styles.scoreLabel}>You</Text>
          <Text style={compact ? styles.gamePointValue : styles.scoreValue}>{playerScore}</Text>
        </View>
        <View style={compact ? styles.gamePointRow : styles.scoreBox}>
          <Text style={styles.scoreLabel}>Computer</Text>
          <Text style={compact ? styles.gamePointValue : styles.scoreValue}>{computerScore}</Text>
        </View>
        <View
          style={[
            compact ? styles.gamePointRow : styles.scoreBox,
            compact ? styles.cribGamePointRow : styles.cribScoreBox,
          ]}
        >
          <Text style={styles.scoreLabel}>Crib</Text>
          <Text style={compact ? styles.cribGamePointOwner : styles.cribScoreValue}>
            {cribOwner ? (cribOwner === 'player' ? 'You' : 'Computer') : 'Cut'}
          </Text>
        </View>
      </View>
    </View>
  );
}

function PeggingCallout({ callout }: { callout: CoachMessage }) {
  return (
    <View style={styles.peggingCallout}>
      <Text style={styles.scoreGroupTitle}>Say it out loud</Text>
      <Text style={styles.peggingCalloutTitle}>{callout.title}!</Text>
      <Text style={styles.peggingCalloutBody}>{callout.body}</Text>
    </View>
  );
}

function PeggingStatusStrip({
  computerPeggingPoints,
  count,
  pendingPegMove,
  playerPeggingPoints,
  turn,
}: {
  computerPeggingPoints: number;
  count: number;
  pendingPegMove: boolean;
  playerPeggingPoints: number;
  turn: PlayerId;
}) {
  return (
    <View style={styles.peggingStatusPanel}>
      <Text style={styles.scoreGroupTitle}>Pegging points</Text>
      <View style={styles.scoreStrip}>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Pegging count</Text>
          <Text style={styles.scoreValue}>{count}</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Turn</Text>
          <Text style={styles.scoreValueSmall}>
            {pendingPegMove ? 'Move back peg' : turn === 'player' ? 'You' : 'Computer'}
          </Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Your peg pts</Text>
          <Text style={styles.scoreValue}>{playerPeggingPoints}</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Computer peg pts</Text>
          <Text style={styles.scoreValue}>{computerPeggingPoints}</Text>
        </View>
      </View>
    </View>
  );
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

function PlayedTimeline({ plays }: { plays: PeggingPlay[] }) {
  return (
    <View style={styles.playedTimeline}>
      <Text style={styles.playedRowLabel}>Played cards</Text>
      {plays.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.timelineRows}>
            <TimelineRow label="Computer" plays={plays} player="computer" />
            <TimelineRow label="You" plays={plays} player="player" />
          </View>
        </ScrollView>
      ) : (
        <Text style={styles.mutedText}>No cards yet.</Text>
      )}
    </View>
  );
}

function TimelineRow({
  label,
  player,
  plays,
}: {
  label: string;
  player: PlayerId;
  plays: PeggingPlay[];
}) {
  return (
    <View style={styles.timelineRow}>
      <Text style={styles.timelineLabel}>{label}</Text>
      <View style={styles.timelineCards}>
        {plays.map((play, index) => {
          const previousPlay = plays[index - 1];
          const startsNewCount = Boolean(previousPlay && play.count <= previousPlay.count);

          return (
            <View
              key={`${index}-${cardLabel(play.card)}`}
              style={[styles.timelineSlot, startsNewCount ? styles.timelineResetSlot : null]}
            >
              {play.player === player ? (
                <CardRow cards={[play.card]} size="small" />
              ) : (
                <View style={styles.emptyTimelineSlot} />
              )}
            </View>
          );
        })}
      </View>
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
  coachBox: {
    alignItems: 'flex-start',
    backgroundColor: '#F1F6EE',
    borderColor: '#BFD4B7',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  coachIcon: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D6E5D0',
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  coachTextBlock: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  coachTitle: {
    color: '#26302A',
    fontSize: 15,
    fontWeight: '900',
  },
  coachBody: {
    color: '#4F5B51',
    fontSize: 14,
    lineHeight: 20,
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
  peggingContextRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  playedCardsColumn: {
    flex: 1,
    gap: 10,
    minWidth: 420,
  },
  peggingSideStack: {
    gap: 12,
    width: 220,
  },
  starterSidePanel: {
    backgroundColor: '#F7F4EE',
    borderColor: '#DDD5C8',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    width: '100%',
    padding: 10,
  },
  peggingCallout: {
    backgroundColor: '#FFF6D7',
    borderColor: '#D7A94B',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    minHeight: 0,
    padding: 12,
    width: '100%',
  },
  peggingCalloutTitle: {
    color: '#26302A',
    fontSize: 24,
    fontWeight: '900',
  },
  peggingCalloutBody: {
    color: '#5C4A24',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
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
  gamePointsPanel: {
    gap: 8,
  },
  gamePointsSidePanel: {
    backgroundColor: '#F7F4EE',
    borderColor: '#DDD5C8',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    width: '100%',
  },
  gamePointsList: {
    gap: 8,
  },
  gamePointRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DDD5C8',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 40,
    paddingHorizontal: 10,
  },
  cribGamePointRow: {
    backgroundColor: '#FDEDEA',
    borderColor: '#C34B3D',
    minHeight: 52,
    paddingHorizontal: 12,
  },
  gamePointValue: {
    color: '#26302A',
    fontSize: 22,
    fontWeight: '900',
  },
  gamePointOwner: {
    color: '#26302A',
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'right',
  },
  cribGamePointOwner: {
    color: '#8E2F28',
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'right',
  },
  cribScoreBox: {
    backgroundColor: '#FDEDEA',
    borderColor: '#C34B3D',
    minHeight: 68,
    minWidth: 140,
  },
  cribScoreValue: {
    color: '#8E2F28',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 6,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(31, 36, 31, 0.42)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  goModal: {
    backgroundColor: '#EAF4FA',
    borderColor: '#6EA8CC',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    maxWidth: 440,
    padding: 18,
    shadowColor: '#1E241F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    width: '100%',
  },
  dialogueBox: {
    backgroundColor: '#EAF4FA',
    borderColor: '#8DB9D6',
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  dialogueText: {
    color: '#17384F',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
  },
  peggingStatusPanel: {
    backgroundColor: '#F7F4EE',
    borderColor: '#DDD5C8',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  scoreGroupTitle: {
    color: '#7A3E2E',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
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
  playedTimeline: {
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
  timelineRows: {
    gap: 8,
  },
  timelineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  timelineLabel: {
    color: '#586158',
    fontSize: 13,
    fontWeight: '900',
    minWidth: 76,
    textTransform: 'uppercase',
  },
  timelineCards: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  timelineSlot: {
    alignItems: 'center',
    minHeight: 90,
    width: 62,
  },
  emptyTimelineSlot: {
    height: 86,
    width: 62,
  },
  timelineResetSlot: {
    borderLeftColor: '#D9C9AF',
    borderLeftWidth: 1,
    marginLeft: 6,
    paddingLeft: 14,
    width: 76,
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
  peggingSummary: {
    backgroundColor: '#F7F4EE',
    borderColor: '#D9C9AF',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
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
