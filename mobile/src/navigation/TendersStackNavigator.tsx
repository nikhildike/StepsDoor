/**
 * Native-stack navigator for the "Tenders" bottom tab.
 *
 * Provides the list -> detail flow for government tenders: the tender
 * list (`TendersScreen`) pushes to `TenderDetailScreen` when a
 * `TenderCard` is pressed. Mounted as the `Tenders` tab's `component`
 * inside `AppNavigator` (see `navigation/AppNavigator.tsx`). Header
 * styling (background/tint/title weight) is theme-driven via
 * `@/theme/colors`.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TendersScreen } from '@/screens/tenders/TendersScreen';
import { TenderDetailScreen } from '@/screens/tenders/TenderDetailScreen';
import { Colors } from '@/theme/colors';

const Stack = createNativeStackNavigator();

/**
 * TendersStackNavigator
 *
 * Native-stack navigator for the Tenders tab. No props/params — screen
 * options below only set static header titles (no typed route params
 * declared). Rendered as the `component` for the "Tenders" tab in
 * `AppNavigator`.
 */
export function TendersStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        // Header colors/weight pulled from the shared theme rather than hardcoded.
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      {/* Route "TendersList" -> TendersScreen (@/screens/tenders/TendersScreen). Tender listing screen; header title "Tenders". Entry screen for this stack. */}
      <Stack.Screen name="TendersList" component={TendersScreen} options={{ title: 'Tenders' }} />
      {/* Route "TenderDetail" -> TenderDetailScreen (@/screens/tenders/TenderDetailScreen). Reached by navigating from a TenderCard press on TendersScreen; header title "Tender Detail". */}
      <Stack.Screen name="TenderDetail" component={TenderDetailScreen} options={{ title: 'Tender Detail' }} />
    </Stack.Navigator>
  );
}
