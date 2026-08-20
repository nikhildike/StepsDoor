/**
 * Unauthenticated navigation stack.
 *
 * Rendered by `RootNavigator` (see `navigation/index.tsx`) when there is no
 * auth token in `useAuthStore`. Provides a simple native-stack flow:
 * Login -> Register. Headers are hidden for both screens since each screen
 * presumably renders its own branding/header UI.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';

const Stack = createNativeStackNavigator();

/**
 * AuthNavigator
 *
 * Native-stack navigator for the logged-out flow. No props/params —
 * both routes are untyped (no route params passed). Mounted by
 * `RootNavigator` whenever `token` is falsy.
 */
export function AuthNavigator() {
  return (
    // Native stack header is hidden globally; Login/Register screens handle
    // their own headers/branding internally.
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Route "Login" -> LoginScreen (@/screens/auth/LoginScreen). No route params. Initial screen shown on entry to this stack. */}
      <Stack.Screen name="Login" component={LoginScreen} />
      {/* Route "Register" -> RegisterScreen (@/screens/auth/RegisterScreen). No route params. Reached by navigating from LoginScreen. */}
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
