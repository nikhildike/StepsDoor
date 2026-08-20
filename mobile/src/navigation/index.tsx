/**
 * Root of the app's navigation tree.
 *
 * Responsibilities:
 *  - Shows `SplashScreen` while the persisted auth token is being loaded
 *    from AsyncStorage (via `useAuthStore`), giving the store time to
 *    hydrate before any routing decision is made.
 *  - Once hydration is done, switches between `AppNavigator` (job-seeker
 *    is authenticated — 6-tab bottom nav) and `AuthNavigator`
 *    (unauthenticated — Login/Register stack) based on whether a `token`
 *    is present in the auth store.
 *  - Wraps everything in a single `NavigationContainer`, the required
 *    top-level container for React Navigation.
 */
import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '@/store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { SplashScreen } from '@/screens/auth/SplashScreen';

/**
 * RootNavigator
 *
 * Top-level navigator that gates the app behind an auth check.
 * Renders `SplashScreen` until `loading` flips to false, then renders
 * either `AppNavigator` (authenticated) or `AuthNavigator`
 * (unauthenticated) inside a `NavigationContainer`.
 *
 * No props — reads auth state directly from `useAuthStore`.
 * Called once, from `App.tsx`, as the single navigation root.
 */
export function RootNavigator() {
  // Only `token` is needed here — its presence/absence decides Auth vs App stack.
  const { token } = useAuthStore();
  // Local "still hydrating auth state" flag; starts true so SplashScreen shows first.
  const [loading, setLoading] = useState(true);

  if (loading) {
    // SplashScreen is responsible for loading the token from AsyncStorage and
    // signals completion via onReady, which flips `loading` to false and
    // triggers the switch to the real navigator below.
    return <SplashScreen onReady={() => setLoading(false)} />;
  }

  return (
    <NavigationContainer>
      {/* Authenticated job seekers see the 6-tab app; everyone else sees the auth stack. */}
      {token ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
