/**
 * Root of the app's navigation tree.
 *
 * Responsibilities:
 *  - Shows `SplashScreen` while the persisted auth token is being loaded
 *    from AsyncStorage (via `useAuthStore`), giving the store time to
 *    hydrate before any API call relies on it.
 *  - Always lands the user on `AppNavigator` (the tabbed browsing
 *    experience) regardless of auth state — job listings, tenders, and
 *    govt jobs are free to browse per the product's business model, so
 *    login/register is never a gate on entry. `AuthNavigator`
 *    (Login → Register) is mounted as a screen the user can navigate to
 *    later (e.g. from the Profile screen's "Sign In" prompt) when they
 *    actually want to save jobs or set alerts.
 *  - Registers `Profile`, `Alerts`, and `Settings` as root-stack screens
 *    (not nested tabs) — they're reached via `BurgerMenu`'s dropdown
 *    (mounted inside `AppNavigator`) rather than the bottom tab bar, so
 *    they need to be navigable from anywhere without switching tabs.
 *    Each gets a native header (back button + title) since, unlike the
 *    tab screens, they're stack-pushed over the tab bar rather than
 *    swipeable siblings of it.
 *  - Wraps everything in a single `NavigationContainer`, the required
 *    top-level container for React Navigation.
 */
import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { SplashScreen } from '@/screens/auth/SplashScreen';
import { ProfileScreen } from '@/screens/seeker/ProfileScreen';
import { AlertsScreen } from '@/screens/seeker/AlertsScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { useThemeColors } from '@/theme/colors';

const RootStack = createNativeStackNavigator();

/**
 * RootNavigator
 *
 * Top-level navigator. Renders `SplashScreen` until auth-token/theme
 * hydration finishes, then always mounts `AppNavigator` as the initial
 * screen, with `AuthNavigator`, `Profile`, `Alerts`, and `Settings`
 * reachable as on-demand screens pushed via `navigation.navigate('<name>')`
 * from anywhere in the app (`AuthNavigator` from `ProfileScreen`'s guest
 * prompt; the other three from `BurgerMenu`).
 *
 * No props — reads auth state directly from `useAuthStore` only to decide
 * when hydration is done; the destination screen no longer depends on it.
 * Called once, from `App.tsx`, as the single navigation root.
 */
export function RootNavigator() {
  // Local "still hydrating auth state" flag; starts true so SplashScreen shows first.
  const [loading, setLoading] = useState(true);
  const Colors = useThemeColors();
  // Shared native-header styling for the burger-menu destinations
  // (Profile/Alerts/Settings), matching the header look already used by
  // the tab stacks' own detail screens (e.g. JobDetailScreen).
  const menuScreenOptions = {
    headerShown: true,
    headerStyle: { backgroundColor: Colors.primary },
    headerTintColor: Colors.white,
    headerTitleStyle: { fontWeight: '600' as const },
  };

  if (loading) {
    // SplashScreen is responsible for loading the token from AsyncStorage and
    // signals completion via onReady, which flips `loading` to false.
    return <SplashScreen onReady={() => setLoading(false)} />;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {/* Always the landing screen — browsing jobs/tenders/govt jobs never requires auth. */}
        <RootStack.Screen name="App" component={AppNavigator} />
        {/* Pushed on demand (e.g. from ProfileScreen) when the user chooses to sign in or register. */}
        <RootStack.Screen name="Auth" component={AuthNavigator} />
        {/* Pushed from BurgerMenu — moved off the bottom tab bar to make room for it. */}
        <RootStack.Screen name="Profile" component={ProfileScreen} options={{ ...menuScreenOptions, title: 'Profile' }} />
        <RootStack.Screen name="Alerts" component={AlertsScreen} options={{ ...menuScreenOptions, title: 'Alerts' }} />
        <RootStack.Screen name="Settings" component={SettingsScreen} options={{ ...menuScreenOptions, title: 'Settings' }} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
