/**
 * Native-stack navigator for the "Jobs" bottom tab.
 *
 * Provides the list -> detail flow for private job listings: the job
 * list (`HomeScreen`) pushes to `JobDetailScreen` when a `JobCard` is
 * pressed. Mounted as the `Jobs` tab's `component` inside
 * `AppNavigator` (see `navigation/AppNavigator.tsx`). Header styling
 * (background/tint/title weight) is theme-driven via `@/theme/colors`.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '@/screens/jobs/HomeScreen';
import { JobDetailScreen } from '@/screens/jobs/JobDetailScreen';
import { Colors } from '@/theme/colors';

const Stack = createNativeStackNavigator();

/**
 * JobsStackNavigator
 *
 * Native-stack navigator for the Jobs tab. No props/params — screen
 * options below only set static header titles (no typed route params
 * declared). Rendered as the `component` for the "Jobs" tab in
 * `AppNavigator`.
 */
export function JobsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        // Header colors/weight pulled from the shared theme rather than hardcoded.
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      {/* Route "Home" -> HomeScreen (@/screens/jobs/HomeScreen). Job listing screen; header title "Jobs". Entry screen for this stack. */}
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Jobs' }} />
      {/* Route "JobDetail" -> JobDetailScreen (@/screens/jobs/JobDetailScreen). Reached by navigating from a JobCard press on HomeScreen; header title "Job Detail". */}
      <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: 'Job Detail' }} />
    </Stack.Navigator>
  );
}
