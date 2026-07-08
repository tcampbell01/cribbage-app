import { useMemo } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
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
  id: 'computer' | 'player';
  color: string;
};

const TRACK_ROWS = Array.from({ length: 30 }, (_, index) => ({
  left: 30 - index,
  right: 31 + index,
}));
const FINISH_SCORE = 121;
const HOLE_SIZE = 18;
const HOLE_GAP = 8;
const LANE_PADDING = 9;
const ROW_STEP = HOLE_SIZE + HOLE_GAP;
const LANES: Lane[] = [
  { id: 'computer', color: '#D94A3F' },
  { id: 'player', color: '#1777B7' },
];

export function CribbageBoard({
  computerBackPeg,
  computerFrontPeg,
  maxScore = FINISH_SCORE,
  onPegChange,
  playerBackPeg,
  playerFrontPeg,
}: Props) {
  function movePeg(delta: number) {
    onPegChange(Math.max(0, Math.min(maxScore, playerBackPeg + delta)));
  }

  function chooseHole(point: number) {
    const baseLap = Math.floor(playerFrontPeg / 60) * 60;
    const currentTrackPoint = scoreToTrackPoint(playerFrontPeg);
    const crossesStart = currentTrackPoint !== null && point < currentTrackPoint && baseLap < 60;
    const nextScore = Math.min(maxScore, (crossesStart ? 60 : baseLap) + point);

    onPegChange(nextScore);
  }

  return (
    <View style={styles.board}>
      <View style={styles.boardCap}>
        <Text style={styles.boardTitle}>Cribbage Board</Text>
      </View>

      <View style={styles.trackFrame}>
        <TrackLane
          backPeg={computerBackPeg}
          color={LANES[0].color}
          frontPeg={computerFrontPeg}
          frontPegColor="#7A3E2E"
          backPegColor="#5F261D"
        />
        <NumberLine />
        <TrackLane
          backPeg={playerBackPeg}
          color={LANES[1].color}
          frontPeg={playerFrontPeg}
          frontPegColor="#2D5A3B"
          backPegColor="#173D28"
          onChooseHole={chooseHole}
          draggable
        />
      </View>

      <View style={styles.startRow}>
        <StartPegHoles
          pegColors={[
            computerBackPeg <= 0 ? '#5F261D' : null,
            computerFrontPeg <= 0 ? '#7A3E2E' : null,
          ]}
        />
        <View style={styles.departBox}>
          <Text style={styles.departText}>START</Text>
        </View>
        <StartPegHoles
          pegColors={[
            playerBackPeg <= 0 ? '#173D28' : null,
            playerFrontPeg <= 0 ? '#2D5A3B' : null,
          ]}
        />
      </View>

      <View style={styles.finishPocket}>
        <Text style={styles.finishText}>FINISH</Text>
        <View style={styles.finishPegRow}>
          <FinishPeg color="#5F261D" visible={computerBackPeg >= maxScore} />
          <FinishPeg color="#7A3E2E" visible={computerFrontPeg >= maxScore} />
          <FinishPeg color="#173D28" visible={playerBackPeg >= maxScore} />
          <FinishPeg color="#2D5A3B" visible={playerFrontPeg >= maxScore} />
        </View>
      </View>

      <View style={styles.pegControls}>
        <Text style={styles.controlLabel}>Move your back peg</Text>
        <View style={styles.stepper}>
          <Pressable style={styles.stepperButton} onPress={() => movePeg(-5)}>
            <Text style={styles.stepperText}>-5</Text>
          </Pressable>
          <Pressable style={styles.stepperButton} onPress={() => movePeg(-1)}>
            <Feather name="minus" size={18} color="#26302A" />
          </Pressable>
          <Text style={styles.pegValue}>{playerBackPeg}</Text>
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

function StartPegHoles({ pegColors }: { pegColors: [string | null, string | null] }) {
  return (
    <View style={styles.startPegGroup}>
      {pegColors.map((color, index) => (
        <View key={index} style={styles.startHole}>
          {color ? <View style={[styles.startPeg, { backgroundColor: color }]} /> : null}
        </View>
      ))}
    </View>
  );
}

function TrackLane({
  backPeg,
  backPegColor,
  color,
  frontPeg,
  frontPegColor,
  draggable = false,
  onChooseHole,
}: {
  backPeg: number;
  backPegColor: string;
  color: string;
  draggable?: boolean;
  frontPeg: number;
  frontPegColor: string;
  onChooseHole?: (point: number) => void;
}) {
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => draggable && Boolean(onChooseHole),
        onPanResponderRelease: (event) => {
          if (!onChooseHole) return;

          const point = locationToTrackPoint(
            event.nativeEvent.locationX,
            event.nativeEvent.locationY,
          );
          if (point !== null) onChooseHole(point);
        },
      }),
    [draggable, onChooseHole],
  );

  return (
    <View
      style={[styles.lane, { backgroundColor: color }]}
      {...(draggable ? panResponder.panHandlers : {})}
    >
      {TRACK_ROWS.map((row) => (
        <View key={`${row.left}-${row.right}`} style={styles.laneRow}>
          <TrackHole
            backPeg={backPeg}
            backPegColor={backPegColor}
            frontPeg={frontPeg}
            frontPegColor={frontPegColor}
            onChooseHole={onChooseHole}
            point={row.left}
          />
          <TrackHole
            backPeg={backPeg}
            backPegColor={backPegColor}
            frontPeg={frontPeg}
            frontPegColor={frontPegColor}
            onChooseHole={onChooseHole}
            point={row.right}
          />
        </View>
      ))}
    </View>
  );
}

function TrackHole({
  backPeg,
  backPegColor,
  frontPeg,
  frontPegColor,
  onChooseHole,
  point,
}: {
  backPeg: number;
  backPegColor: string;
  frontPeg: number;
  frontPegColor: string;
  onChooseHole?: (point: number) => void;
  point: number;
}) {
  const HoleContainer = onChooseHole ? Pressable : View;
  const isFiveLine = point % 5 === 0;
  const backTrackPoint = scoreToTrackPoint(backPeg);
  const frontTrackPoint = scoreToTrackPoint(frontPeg);

  return (
    <HoleContainer
      accessibilityLabel={onChooseHole ? `Move back peg to ${point}` : undefined}
      onPress={onChooseHole ? () => onChooseHole(point) : undefined}
      style={[
        styles.hole,
        isFiveLine ? styles.fiveLineHole : null,
        onChooseHole ? styles.clickableHole : null,
      ]}
    >
      {backTrackPoint !== null && point === backTrackPoint ? (
        <Peg color={backPegColor} offset="back" />
      ) : null}
      {frontTrackPoint !== null && point === frontTrackPoint ? (
        <Peg color={frontPegColor} offset="front" />
      ) : null}
    </HoleContainer>
  );
}

function NumberLine() {
  return <View style={styles.numberLine} />;
}

function scoreToTrackPoint(score: number) {
  if (score <= 0 || score >= FINISH_SCORE) return null;
  if (score <= 60) return score;
  return score - 60;
}

function locationToTrackPoint(x: number, y: number) {
  const row = Math.max(
    0,
    Math.min(TRACK_ROWS.length - 1, Math.round((y - LANE_PADDING - HOLE_SIZE / 2) / ROW_STEP)),
  );
  const leftCenter = LANE_PADDING + HOLE_SIZE / 2;
  const rightCenter = LANE_PADDING + HOLE_SIZE + HOLE_GAP + HOLE_SIZE / 2;
  const side = Math.abs(x - leftCenter) <= Math.abs(x - rightCenter) ? 'left' : 'right';

  return TRACK_ROWS[row][side];
}

function FinishPeg({ color, visible }: { color: string; visible: boolean }) {
  return (
    <View style={styles.finishHole}>
      {visible ? <View style={[styles.finishPeg, { backgroundColor: color }]} /> : null}
    </View>
  );
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

const styles = StyleSheet.create({
  board: {
    backgroundColor: '#D9A76F',
    borderColor: '#9C6C38',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    maxWidth: 340,
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
    alignSelf: 'center',
    backgroundColor: '#EBC389',
    borderColor: '#B37D43',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  finishPegRow: {
    flexDirection: 'row',
    gap: 4,
  },
  finishHole: {
    backgroundColor: '#4D3320',
    borderColor: '#2F2116',
    borderRadius: 999,
    borderWidth: 1,
    height: 16,
    position: 'relative',
    width: 16,
  },
  finishPeg: {
    borderColor: '#FDF8EE',
    borderRadius: 999,
    borderWidth: 1,
    height: 20,
    left: 2,
    position: 'absolute',
    top: -7,
    width: 10,
  },
  finishText: {
    color: '#5B3D22',
    fontSize: 12,
    fontWeight: '900',
  },
  trackFrame: {
    alignSelf: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    flexDirection: 'row',
    gap: 8,
    padding: 0,
  },
  lane: {
    borderColor: 'rgba(64, 39, 19, 0.36)',
    borderRadius: 999,
    borderWidth: 1,
    gap: 8,
    padding: 9,
    width: 80,
  },
  laneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  hole: {
    backgroundColor: '#4D3320',
    borderColor: '#2F2116',
    borderRadius: 999,
    borderWidth: 1,
    height: 18,
    position: 'relative',
    width: 18,
  },
  fiveLineHole: {
    borderBottomColor: '#FDF8EE',
    borderBottomWidth: 3,
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
  numberLine: {
    alignItems: 'center',
    backgroundColor: '#F9F7EF',
    borderColor: 'rgba(64, 39, 19, 0.28)',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'space-between',
    paddingVertical: 12,
    width: 34,
  },
  startRow: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  startPegGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  startHole: {
    backgroundColor: '#4D3320',
    borderColor: '#2F2116',
    borderRadius: 999,
    borderWidth: 1,
    height: 18,
    position: 'relative',
    width: 18,
  },
  startPeg: {
    borderColor: '#FDF8EE',
    borderRadius: 999,
    borderWidth: 1,
    height: 22,
    left: 3,
    position: 'absolute',
    top: -8,
    width: 11,
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
