/**
 * Native-stack navigator for the "Govt Jobs" bottom tab.
 *
 * Provides the list -> detail flow for government jobs: the govt job
 * list (`GovtJobsScreen`) pushes to `GovtJobDetailScreen` when a list
 * item is pressed. Mounted as the `Govt Jobs` tab's `component` inside
 * `AppNavigator` (see `navigation/AppNavigator.tsx`). Header styling
 * (background/tint/title weight) is theme-driven via `@/theme/colors`.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GovtJobsScreen } from '@/screens/govtjobs/GovtJobsScreen';
import { GovtJobDetailScreen } from '@/screens/govtjobs/GovtJobDetailScreen';
import { Colors } from '@/theme/colors';

const Stack = createNativeStackNavigator();

/**
 * GovtJobsStackNavigator
 *
 * Native-stack navigator for the Govt Jobs tab. No props/params —
 * screen options below only set static header titles (no typed route
 * params declared). Rendered as the `component` for the "Govt Jobs" tab
 * in `AppNavigator`.
 */
export function GovtJobsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        // Header colors/weight pulled from the shared theme rather than hardcoded.
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      {/* Route "GovtJobsList" -> GovtJobsScreen (@/screens/govtjobs/GovtJobsScreen). Govt job listing screen; header title "Govt Jobs". Entry screen for this stack. */}
      <Stack.Screen name="GovtJobsList" component={GovtJobsScreen} options={{ title: 'Govt Jobs' }} />
      {/* Route "GovtJobDetail" -> GovtJobDetailScreen (@/screens/govtjobs/GovtJobDetailScreen). Reached by navigating from a list item press on GovtJobsScreen; header title "Job Detail". */}
      <Stack.Screen name="GovtJobDetail" component={GovtJobDetailScreen} options={{ title: 'Job Detail' }} />
    </Stack.Navigator>
  );
}
