/**
 * ProfileScreen.tsx
 *
 * Account screen reached via `BurgerMenu`'s "Profile" item (registered as
 * a root-stack screen — see `navigation/index.tsx` — rather than a
 * bottom tab). Shows the signed-in user's basic info and a sign-out
 * action, or a guest prompt (with Sign In / Create Account buttons) when
 * not authenticated; also doubles as the app's entry point into the
 * "Auth" screen, since the app never gates browsing behind login.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/common/Button';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

/**
 * Renders the current user's avatar (initial), name, email, and account
 * type with a sign-out button; falls back to a "browsing as a guest"
 * message with Sign In / Create Account buttons when no user is signed in.
 * Reads no route params. Use case: account hub reached from the burger
 * menu, the primary way for a job seeker to sign out, and the on-ramp
 * into registration for a guest who wants to save jobs or set alerts.
 */
export function ProfileScreen() {
  // Auth state (user, isAuthenticated) and the signOut action, sourced from
  // the persisted auth store via useAuth().
  const { user, signOut, isAuthenticated } = useAuth();
  // This screen is itself a root-stack screen (see navigation/index.tsx),
  // so "Auth" is a direct sibling route, not something to bubble up to.
  const navigation = useNavigation<any>();
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Signed-in view vs. guest prompt, based on auth state */}
        {isAuthenticated && user ? (
          <>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user.username?.[0] ?? 'U').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.name}>{user.username}</Text>
            <Text style={styles.email}>{user.email}</Text>

            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Account type</Text>
                {/* Derive a human-readable role label from the user's role flags */}
                <Text style={styles.infoValue}>
                  {user.is_contractor
                    ? 'Contractor'
                    : user.is_company
                    ? 'Company'
                    : 'Job Seeker'}
                </Text>
              </View>
            </View>

            <View style={styles.signOutButton}>
              {/* Sign-out action: clears the persisted token/user via
                  useAuth().signOut, which triggers RootNavigator to switch
                  back to AuthNavigator */}
              <Button
                title="Sign Out"
                variant="outline"
                onPress={signOut}
              />
            </View>
          </>
        ) : (
          <View style={styles.guestContainer}>
            <Text style={styles.guestTitle}>You're browsing as a guest</Text>
            <Text style={styles.guestSubtitle}>
              Sign in to save jobs and set alerts
            </Text>
            <View style={styles.guestButtons}>
              {/* Both routes bubble up to the root stack's "Auth" screen
                  (AuthNavigator), which starts on Login and links to Register. */}
              <Button title="Sign In" onPress={() => navigation.navigate('Auth')} />
              <Button
                title="Create Account"
                variant="outline"
                onPress={() => navigation.navigate('Auth', { screen: 'Register' })}
              />
            </View>
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, padding: Spacing[6], alignItems: 'center' },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing[8],
    marginBottom: Spacing[4],
  },
  avatarText: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: Colors.white },
  name: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  email: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing[6] },
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    marginBottom: Spacing[4],
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  infoValue: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text },
  signOutButton: { width: '100%', marginTop: Spacing[4] },
  guestContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' },
  guestTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.text, textAlign: 'center' },
  guestSubtitle: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing[2] },
  guestButtons: { width: '100%', marginTop: Spacing[6], gap: Spacing[3] },
});
