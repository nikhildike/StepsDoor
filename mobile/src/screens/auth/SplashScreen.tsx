/**
 * SplashScreen.tsx
 *
 * App boot screen shown by `RootNavigator` before it decides whether to
 * mount `AuthNavigator` or `AppNavigator`. Not part of either navigator
 * itself — it renders standalone while the stored auth token is loaded from
 * AsyncStorage, then reports the result back up via the `onReady` callback.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { useAuthStore } from '@/store/authStore';

interface Props {
  onReady: (isAuthenticated: boolean) => void;
}

/**
 * Renders the StepsDoor splash/logo screen while checking for a persisted
 * session. Reads no route params (rendered directly by `RootNavigator`, not
 * inside a stack); its only prop is the `onReady` callback (see `Props`)
 * which `RootNavigator` uses to decide which navigator to mount. Use case:
 * brief branded loading screen that also performs the auth-token bootstrap
 * so the user lands on the right screen (Login vs. the tab navigator).
 */
export function SplashScreen({ onReady }: Props) {
  // loadFromStorage reads the persisted token/user from AsyncStorage into
  // the auth store; `token` reflects the store's current value.
  const { loadFromStorage, token } = useAuthStore();

  // On mount: hydrate auth state from AsyncStorage, then, after a short
  // delay (to let the splash branding show), tell RootNavigator whether the
  // user is authenticated so it can pick AuthNavigator vs. AppNavigator.
  useEffect(() => {
    loadFromStorage().then(() => {
      setTimeout(() => onReady(!!token), 800);
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>StepsDoor</Text>
      <Text style={styles.tagline}>Jobs & Tenders in India</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: FontSize['3xl'], fontWeight: FontWeight.bold, color: Colors.white },
  tagline: { fontSize: FontSize.base, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
});
