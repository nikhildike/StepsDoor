/**
 * ProfileScreen.tsx
 *
 * Account screen for the "Profile" bottom tab: shows the signed-in user's
 * basic info and a sign-out action, or a guest prompt when not
 * authenticated. Root screen of that tab (no further stack navigation).
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/common/Button';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { Colors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

/**
 * Renders the current user's avatar (initial), name, email, and account
 * type with a sign-out button; falls back to a "browsing as a guest"
 * message when no user is signed in. Reads no route params. Use case:
 * account hub for the Profile tab, and the primary way for a job seeker to
 * sign out.
 */
export function ProfileScreen() {
  // Auth state (user, isAuthenticated) and the signOut action, sourced from
  // the persisted auth store via useAuth().
  const { user, signOut, isAuthenticated } = useAuth();

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
                <Text style={styles.infoValue}>Job Seeker</Text>
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
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
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
  guestContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  guestTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.text, textAlign: 'center' },
  guestSubtitle: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing[2] },
});
