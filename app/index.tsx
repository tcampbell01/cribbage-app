import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';

import { CardRow } from '@/components/CardRow';
import { CribbageBoard } from '@/components/CribbageBoard';
import { Card, cardLabel } from '@/game/cards';
import { finishDiscard, startComputerRound } from '@/game/computerGame';
import { dealPracticeHand } from '@/game/deck';
import { scoreShowHand } from '@/game/scoring';
import { formatScoreBreakdown } from '@/game/teaching';

type AppSection = 'practice' | 'computer' | 'realtime';

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
  const [computerGameScore] = useState(0);
  const [roundStartPlayerScore, setRoundStartPlayerScore] = useState(0);
  const [playerPeg, setPlayerPeg] = useState(0);
  const [pegSubmitted, setPegSubmitted] = useState(false);
  const score = useMemo(() => scoreShowHand(deal.hand, deal.starter, deal.isCrib), [deal]);
  const computerScore = useMemo(
    () => scoreShowHand(computerRound.playerHand, computerRound.starter, false),
    [computerRound],
  );
  const numericGuess = Number.parseInt(guess, 10);
  const numericComputerGuess = Number.parseInt(computerGuess, 10);
  const hasGuess = Number.isFinite(numericGuess);
  const hasComputerGuess = Number.isFinite(numericComputerGuess);
  const isCorrect = submitted && hasGuess && numericGuess === score.total;
  const isComputerCorrect =
    computerSubmitted && hasComputerGuess && numericComputerGuess === computerScore.total;
  const expectedPlayerPeg = Math.min(120, roundStartPlayerScore + computerScore.total);
  const isPegCorrect = pegSubmitted && playerPeg === expectedPlayerPeg;

  function checkAnswer() {
    setSubmitted(true);
  }

  function nextHand() {
    setDeal(dealPracticeHand());
    setGuess('');
    setSubmitted(false);
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
    setRoundStartPlayerScore(playerScore);
    setPlayerPeg(playerScore);
    setPegSubmitted(false);
  }

  function newComputerRound() {
    setComputerRound(startComputerRound());
    setSelectedDiscards([]);
    setComputerGuess('');
    setComputerSubmitted(false);
    setRoundStartPlayerScore(playerScore);
    setPlayerPeg(playerScore);
    setPegSubmitted(false);
  }

  function checkPlayerPeg() {
    setPegSubmitted(true);
    if (playerPeg === expectedPlayerPeg) {
      setPlayerScore(expectedPlayerPeg);
    }
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
                {computerRound.phase === 'discard' ? 'Choose 2 cards for the crib.' : 'Count your hand.'}
              </Text>
            </View>
            <Pressable style={styles.iconButton} onPress={newComputerRound} accessibilityLabel="New computer round">
              <Feather name="refresh-cw" size={20} color="#26302A" />
            </Pressable>
          </View>
          <Text style={styles.modeCopy}>
            This first computer mode starts with the discard and counting parts of a round. Pegging
            comes next.
          </Text>

          <View style={styles.scoreStrip}>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>You</Text>
              <Text style={styles.scoreValue}>{playerScore}</Text>
            </View>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>Computer</Text>
              <Text style={styles.scoreValue}>{computerGameScore}</Text>
            </View>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>Crib</Text>
              <Text style={styles.scoreValue}>{computerRound.crib.length}</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Computer hand</Text>
            <Text style={styles.mutedText}>
              {computerRound.phase === 'discard' ? '6 cards' : '4 cards kept'}
            </Text>
          </View>
          <CardBackRow count={computerRound.computerHand.length} />

          {computerRound.phase === 'count' ? (
            <View style={styles.starterBlock}>
              <Text style={styles.sectionTitle}>Starter card</Text>
              <CardRow cards={[computerRound.starter]} size="small" />
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your hand</Text>
            {computerRound.phase === 'discard' ? (
              <Text style={styles.mutedText}>{selectedDiscards.length}/2 selected</Text>
            ) : null}
          </View>
          <CardRow
            cards={computerRound.playerHand}
            onCardPress={computerRound.phase === 'discard' ? toggleDiscard : undefined}
            selectedCards={selectedDiscards}
          />

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
          ) : (
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
              <Pressable style={styles.primaryButton} onPress={() => setComputerSubmitted(true)}>
                <Feather name="check" size={18} color="#FAFBF8" />
                <Text style={styles.primaryButtonText}>Check</Text>
              </Pressable>
            </View>
          )}
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

      {activeSection === 'computer' && computerRound.phase === 'count' && computerSubmitted ? (
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
        </View>

        <View style={styles.boardRail}>
          <CribbageBoard
            computerBackPeg={0}
            computerFrontPeg={computerGameScore}
            onPegChange={(nextPeg) => {
              setPlayerPeg(nextPeg);
              setPegSubmitted(false);
            }}
            playerBackPeg={roundStartPlayerScore}
            playerFrontPeg={playerPeg}
          />
        </View>
      </View>
    </ScrollView>
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
