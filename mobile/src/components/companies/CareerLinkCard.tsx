/**
 * components/companies/CareerLinkCard.tsx
 *
 * One entry from the static `COMPANY_DIRECTORY` (see
 * `data/companyDirectory.ts`) — a plain outbound link to that company's own
 * careers portal, with a sector badge. StepsDoor doesn't host these
 * listings; tapping the card just opens the company's external site.
 * Mirrors the `CareerLinkCard` component in
 * `frontend/src/pages/public/Companies.jsx`. Used by
 * `CompanyDirectorySection`.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DirectoryCompany, getSectorColors } from '@/data/companyDirectory';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

/**
 * Renders one directory entry (name, description, sector badge) as a
 * pressable row that opens the company's external careers URL.
 * @param entry - The `DirectoryCompany` to render.
 */
export function CareerLinkCard({ entry }: { entry: DirectoryCompany }) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  const sectorColors = getSectorColors(entry.sector);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => Linking.openURL(entry.url)}
    >
      <View style={styles.info}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>{entry.name}</Text>
          <View style={[styles.badge, { backgroundColor: sectorColors.bg }]}>
            <Text style={[styles.badgeText, { color: sectorColors.text }]} numberOfLines={1}>
              {entry.sector}
            </Text>
          </View>
        </View>
        <Text style={styles.desc} numberOfLines={1}>{entry.desc}</Text>
      </View>
      <Ionicons name="open-outline" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing[2],
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing[3],
    marginBottom: Spacing[2],
  },
  info: { flex: 1, minWidth: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  name: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text, flexShrink: 1 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.sm },
  badgeText: { fontSize: 10, fontWeight: FontWeight.medium },
  desc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
});
