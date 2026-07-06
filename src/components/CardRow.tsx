import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, SUIT_GLYPHS, cardLabel } from '@/game/cards';

type Props = {
  cards: Card[];
  size?: 'small' | 'regular';
  selectedCards?: string[];
  onCardPress?: (card: Card) => void;
};

export function CardRow({ cards, size = 'regular', selectedCards = [], onCardPress }: Props) {
  return (
    <View style={styles.row}>
      {cards.map((card) => (
        <PlayingCard
          key={`${card.rank}-${card.suit}`}
          card={card}
          isSelected={selectedCards.includes(cardLabel(card))}
          onPress={onCardPress}
          size={size}
        />
      ))}
    </View>
  );
}

function PlayingCard({
  card,
  isSelected,
  onPress,
  size,
}: {
  card: Card;
  isSelected: boolean;
  onPress?: (card: Card) => void;
  size: 'small' | 'regular';
}) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const colorStyle = isRed ? styles.red : styles.black;
  const glyph = SUIT_GLYPHS[card.suit];
  const CardContainer = onPress ? Pressable : View;

  return (
    <CardContainer
      onPress={onPress ? () => onPress(card) : undefined}
      style={[styles.card, isSelected ? styles.selectedCard : null, size === 'small' ? styles.smallCard : null]}
    >
      <View style={styles.corner}>
        <Text style={[styles.cornerRank, colorStyle]}>{card.rank}</Text>
        <Text style={[styles.cornerSuit, colorStyle]}>{glyph}</Text>
      </View>
      <Text style={[styles.centerSuit, size === 'small' ? styles.smallCenterSuit : null, colorStyle]}>
        {glyph}
      </Text>
      <View style={[styles.corner, styles.bottomCorner]}>
        <Text style={[styles.cornerRank, colorStyle]}>{card.rank}</Text>
        <Text style={[styles.cornerSuit, colorStyle]}>{glyph}</Text>
      </View>
    </CardContainer>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    aspectRatio: 0.7,
    backgroundColor: '#FFFDF8',
    borderColor: '#D8D0C1',
    borderRadius: 7,
    borderWidth: 1,
    shadowColor: '#1E241F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    height: 150,
    justifyContent: 'center',
    padding: 8,
    position: 'relative',
  },
  selectedCard: {
    borderColor: '#2D5A3B',
    borderWidth: 3,
    transform: [{ translateY: -8 }],
  },
  smallCard: {
    height: 86,
    padding: 6,
  },
  corner: {
    alignItems: 'center',
    left: 7,
    position: 'absolute',
    top: 6,
  },
  bottomCorner: {
    bottom: 6,
    left: undefined,
    right: 7,
    top: undefined,
    transform: [{ rotate: '180deg' }],
  },
  cornerRank: {
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 19,
  },
  cornerSuit: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 17,
  },
  centerSuit: {
    fontSize: 42,
    fontWeight: '800',
    textAlign: 'center',
  },
  smallCenterSuit: {
    fontSize: 28,
  },
  red: {
    color: '#B72E2A',
  },
  black: {
    color: '#202821',
  },
});
