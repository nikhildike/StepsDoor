/**
 * components/home/StatCards.tsx
 *
 * A row of tappable dashboard stat cards (icon, number, label, short note), each
 * opening the screen with the details. Shared by the Home tab's job seeker
 * dashboard (`SeekerSummary`) and contractor dashboard (`ContractorSummary`).
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

// One card. `value` is pre-formatted ('–' while loading).
export interface StatCard {
  label: string;
  value: string;
  note: string;
  icon: string; // Ionicons name
  color: string; // icon background, from the theme
  onPress: () => void;
}

/** Formats a count Indian-style ("1,230"), or '–' while it's unknown. */
export const formatCount = (n?: number | null) => (n == null ? '–' : n.toLocaleString('en-IN'));

/** StatCards — one equal-width row of `cards`. */
export function StatCards({ cards }: { cards: StatCard[] }) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  return (
    <View style={styles.cards}>
      {cards.map((c) => (
        <TouchableOpacity key={c.label} style={styles.card} onPress={c.onPress} activeOpacity={0.8}
          accessibilityRole="button" accessibilityLabel={`${c.label}: ${c.value}`}>
          <View style={[styles.icon, { backgroundColor: c.color }]}>
            <Ionicons name={c.icon as any} size={16} color={Colors.white} />
          </View>
          <Text style={styles.value}>{c.value}</Text>
          <Text style={styles.label} numberOfLines={1}>{c.label}</Text>
          <Text style={styles.note} numberOfLines={2}>{c.note}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  cards: { flexDirection: 'row', gap: Spacing[2] },
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing[3],
  },
  icon: { width: 28, height: 28, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text, marginTop: Spacing[2] },
  label: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.text },
  note: { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
});
