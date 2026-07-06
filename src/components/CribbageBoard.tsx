import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

type Props = {
  computerBackPeg: number;
  computerFrontPeg: number;
  maxScore?: number;
  onPegChange: (score: number) => void;
  playerBackPeg: number;
  playerFrontPeg: number;
};

type Lane = {
  id: 'computer' | 'neutral' | 'player';
  color: string;
};

const TRACK_POINTS = Array.from({ length: 61 }, (_, index) => index);
const LANES: Lane[] = [
  { id: 'computer', color: '#D94A3F' },
  { id: 'neutral', color: '#F9F7EF' },
  { id: 'player', color: '#1777B7' },
];

export function CribbageBoard({
  computerBackPeg,
  computerFrontPeg,
  maxScore = 120,
  onPegChange,
  playerBackPeg,
  playerFrontPeg,
}: Props) {
  const playerLap = playerFrontPeg > 60 ? 2 : 1;

  function movePeg(delta: number) {
    onPegChange(Math.max(0, Math.min(maxScore, playerFrontPeg + delta)));
  }

  function chooseHole(point: number) {
    const baseLap = Math.floor(playerFrontPeg / 60) * 60;
    const currentTrackPoint = scoreToTrackPoint(playerFrontPeg);
    const crossesStart = point < currentTrackPoint && baseLap < 60;
    const nextScore = Math.min(maxScore, (crossesStart ? 60 : baseLap) + point);

    onPegChange(nextScore);
  }

  return (
    <View style={styles.board}>
      <View style={styles.boardCap}>
        <Text style={styles.boardTitle}>Cribbage Board</Text>
        <View style={styles.finishPocket}>
          <Text style={styles.finishText}>FINISH</Text>
          <Feather name="flag" size={16} color="#5B3D22" />
        </View>
        <Text style={styles.lapText}>Lap {playerLap} of 2</Text>
      </View>

      <View style={styles.trackFrame}>
        {LANES.map((lane) => (
          <View key={lane.id} style={[styles.lane, { backgroundColor: lane.color }]}>
            {TRACK_POINTS.map((point) => {
              const isPlayerLane = lane.id === 'player';
              const isComputerLane = lane.id === 'computer';
              const hasPlayerBack = isPlayerLane && point === scoreToTrackPoint(playerBackPeg);
              const hasPlayerFront = isPlayerLane && point === scoreToTrackPoint(playerFrontPeg);
              const hasComputerBack = isComputerLane && point === scoreToTrackPoint(computerBackPeg);
              const hasComputerFront =
                isComputerLane && point === scoreToTrackPoint(computerFrontPeg);
              const HoleContainer = isPlayerLane ? Pressable : View;
              const showScoreMarker = lane.id === 'neutral' && point > 0 && point % 5 === 0;

              return (
                <HoleContainer
                  key={point}
                  accessibilityLabel={isPlayerLane ? `Move front peg to ${point}` : undefined}
                  onPress={isPlayerLane ? () => chooseHole(point) : undefined}
                  style={[styles.hole, isPlayerLane ? styles.clickableHole : null]}
                >
                  {showScoreMarker ? <Text style={styles.scoreMarker}>{point}</Text> : null}
                  {hasPlayerBack ? <Peg color="#173D28" offset="back" /> : null}
                  {hasPlayerFront ? <Peg color="#2D5A3B" offset="front" /> : null}
                  {hasComputerBack ? <Peg color="#5F261D" offset="back" /> : null}
                  {hasComputerFront ? <Peg color="#7A3E2E" offset="front" /> : null}
                </HoleContainer>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.departBox}>
        <Text style={styles.departText}>START / DEPART</Text>
      </View>

      <View style={styles.legend}>
        <LegendPeg color="#2D5A3B" label="Your front peg" />
        <LegendPeg color="#173D28" label="Your back peg" />
        <LegendPeg color="#7A3E2E" label="Computer front" />
        <LegendPeg color="#5F261D" label="Computer back" />
      </View>

      <View style={styles.pegControls}>
        <Text style={styles.controlLabel}>Move your front peg</Text>
        <View style={styles.stepper}>
          <Pressable style={styles.stepperButton} onPress={() => movePeg(-5)}>
            <Text style={styles.stepperText}>-5</Text>
          </Pressable>
          <Pressable style={styles.stepperButton} onPress={() => movePeg(-1)}>
            <Feather name="minus" size={18} color="#26302A" />
          </Pressable>
          <Text style={styles.pegValue}>{playerFrontPeg}</Text>
          <Pressable style={styles.stepperButton} onPress={() => movePeg(1)}>
            <Feather name="plus" size={18} color="#26302A" />
          </Pressable>
          <Pressable style={styles.stepperButton} onPress={() => movePeg(5)}>
            <Text style={styles.stepperText}>+5</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function scoreToTrackPoint(score: number) {
  if (score <= 60) return score;
  return score - 60;
}

function Peg({ color, offset }: { color: string; offset: 'back' | 'front' }) {
  return (
    <View
      style={[
        styles.peg,
        { backgroundColor: color },
        offset === 'back' ? styles.backPeg : styles.frontPeg,
      ]}
    />
  );
}

function LegendPeg({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: '#D9A76F',
    borderColor: '#9C6C38',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    maxWidth: 420,
    padding: 20,
    shadowColor: '#1E241F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
  },
  boardCap: {
    alignItems: 'center',
    gap: 8,
  },
  boardTitle: {
    color: '#5B3D22',
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  finishPocket: {
    alignItems: 'center',
    backgroundColor: '#EBC389',
    borderColor: '#B37D43',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  finishText: {
    color: '#5B3D22',
    fontSize: 12,
    fontWeight: '900',
  },
  lapText: {
    color: '#5B3D22',
    fontSize: 13,
    fontWeight: '900',
  },
  trackFrame: {
    alignSelf: 'center',
    backgroundColor: '#EBC389',
    borderColor: '#A76F38',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  lane: {
    alignContent: 'flex-start',
    borderColor: 'rgba(64, 39, 19, 0.36)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 9,
    width: 104,
  },
  hole: {
    backgroundColor: '#4D3320',
    borderColor: '#2F2116',
    borderRadius: 999,
    borderWidth: 1,
    height: 17,
    position: 'relative',
    width: 17,
  },
  clickableHole: {
    borderColor: '#1F3F2A',
  },
  peg: {
    borderColor: '#FDF8EE',
    borderRadius: 999,
    borderWidth: 1,
    height: 22,
    position: 'absolute',
    top: -7,
    width: 11,
    zIndex: 2,
  },
  backPeg: {
    left: -6,
  },
  frontPeg: {
    right: -6,
  },
  scoreMarker: {
    color: '#5B3D22',
    fontSize: 10,
    fontWeight: '900',
    left: -1,
    position: 'absolute',
    top: -15,
  },
  departBox: {
    alignSelf: 'center',
    backgroundColor: '#EBC389',
    borderColor: '#A76F38',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  departText: {
    color: '#5B3D22',
    fontSize: 11,
    fontWeight: '900',
  },
  legend: {
    gap: 5,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  legendDot: {
    borderColor: '#FDF8EE',
    borderRadius: 999,
    borderWidth: 1,
    height: 11,
    width: 11,
  },
  legendText: {
    color: '#5B3D22',
    fontSize: 12,
    fontWeight: '800',
  },
  pegControls: {
    backgroundColor: 'rgba(255, 253, 248, 0.55)',
    borderColor: '#BA854A',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 10,
  },
  controlLabel: {
    color: '#5B3D22',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  stepper: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  stepperButton: {
    alignItems: 'center',
    backgroundColor: '#FFFDF8',
    borderColor: '#B37D43',
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 42,
  },
  stepperText: {
    color: '#26302A',
    fontSize: 14,
    fontWeight: '900',
  },
  pegValue: {
    color: '#26302A',
    fontSize: 23,
    fontWeight: '900',
    minWidth: 38,
    textAlign: 'center',
  },
});
