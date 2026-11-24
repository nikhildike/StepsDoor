/**
 * Sign-in prompt shown in place of scraped tender / govt job data for guests.
 *
 * The API serves that data to logged-in members only (anonymous requests get
 * 401), so screens render this instead of calling it. "Sign In" / "Create free
 * account" open the root `Auth` stack; Login/Register `goBack()` on success,
 * which returns the user to the screen that showed this prompt — that screen
 * then loads its data because it re-renders with a token.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { Spacing, BorderRadius } from '@/theme/spacing';
import { Button } from './Button';

/**
 * Props for `MembersOnly`.
 * - `what`: what's behind the sign-in, e.g. "government tenders".
 * - `compact`: inline card (inside a scrolling list such as Home search
 *   results) instead of a full-screen, centred prompt.
 */
interface Props {
  what: string;
  compact?: boolean;
}

/**
 * MembersOnly
 *
 * Lock icon, short explanation, and Sign In / Create free account actions.
 * Used by TendersScreen, TenderDetailScreen, GovtJobDetailScreen, the Govt
 * Jobs segment of the Jobs tab (HomeScreen), and HomeTabScreen's search results.
 *
 * Props: see `Props` interface above.
 */
export function MembersOnly({ what, compact = false }: Props) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  // Root-stack screen names aren't in each tab's param list, hence the loose type.
  const navigation = useNavigation<any>();

  return (
    <View style={compact ? styles.card : styles.container}>
      <Ionicons name="lock-closed-outline" size={compact ? 20 : 32} color={Colors.textSecondary} />
      <Text style={styles.title}>Free for members</Text>
      <Text style={styles.description}>Sign in to see {what}, updated every day from official portals.</Text>
      <Button title="Sign In" onPress={() => navigation.navigate('Auth')} style={styles.button} />
      <TouchableOpacity onPress={() => navigation.navigate('Auth', { screen: 'Register' })} style={styles.link}>
        <Text style={styles.linkText}>Create free account</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing[8] },
  card: {
    alignItems: 'center',
    padding: Spacing[5],
    marginVertical: Spacing[3],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
  },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.text, marginTop: Spacing[3], textAlign: 'center' },
  description: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing[2] },
  button: { marginTop: Spacing[5], alignSelf: 'stretch' },
  link: { marginTop: Spacing[3], padding: Spacing[2] },
  linkText: { fontSize: FontSize.base, color: Colors.primary, fontWeight: FontWeight.medium },
});
