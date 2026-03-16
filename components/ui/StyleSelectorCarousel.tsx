import React from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { DREAM_STYLES } from '@/constants/config';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';

interface StyleSelectorCarouselProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

export function StyleSelectorCarousel({ selectedId, onSelect }: StyleSelectorCarouselProps) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {DREAM_STYLES.map((style) => {
          const isSelected = style.id === selectedId;
          return (
            <Pressable
              key={style.id}
              onPress={() => onSelect(style.id)}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: style.bgColor, borderColor: isSelected ? style.color : Colors.border },
                isSelected && styles.cardSelected,
                pressed && styles.cardPressed,
              ]}
            >
              <Text style={styles.emoji}>{style.emoji}</Text>
              <Text style={[styles.label, { color: isSelected ? style.color : Colors.textSecondary }]}>
                {style.label}
              </Text>
              {isSelected ? (
                <Text style={[styles.desc, { color: style.color }]}>{style.description}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minHeight: 110,
  },
  scroll: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  card: {
    width: 100,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  cardSelected: {
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  cardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  emoji: {
    fontSize: 22,
  },
  label: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.semibold,
    textAlign: 'center',
  },
  desc: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 13,
  },
});
