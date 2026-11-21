/**
 * Native-stack navigator for the "Jobs" bottom tab.
 *
 * Provides the list -> detail flow for private job listings: the job
 * list (`HomeScreen`, which also hosts the Jobs/Govt Jobs/Companies
 * segmented row — Govt Jobs and Companies are rendered *inline* there via
 * local state, not as separate routes, so the segmented row stays
 * constant no matter which segment is active) pushes to `JobDetailScreen`
 * when a `JobCard` is pressed, to `GovtJobDetailScreen` when a govt job
 * card is pressed from the Govt Jobs segment, and to
 * `CompanyCareersScreen` (StepsDoor's own branded careers page for that
 * company) when a company card is pressed from the Companies segment.
 * Mounted as the `Jobs` tab's `component` inside `AppNavigator` (see
 * `navigation/AppNavigator.tsx`). Header styling (background/tint/title
 * weight) is theme-driven via `@/theme/colors`.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '@/screens/jobs/HomeScreen';
import { JobDetailScreen } from '@/screens/jobs/JobDetailScreen';
import { CompanyCareersScreen } from '@/screens/jobs/CompanyCareersScreen';
import { GovtJobDetailScreen } from '@/screens/govtjobs/GovtJobDetailScreen';
import { useThemeColors } from '@/theme/colors';

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
  const Colors = useThemeColors();
  return (
    <Stack.Navigator
      screenOptions={{
        // Header colors/weight pulled from the shared theme rather than hardcoded.
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      {/* Route "Home" -> HomeScreen (@/screens/jobs/HomeScreen). Job listing screen, with the Jobs/Govt Jobs/Companies segmented row; header title "Jobs". Entry screen for this stack. */}
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Jobs' }} />
      {/* Route "JobDetail" -> JobDetailScreen (@/screens/jobs/JobDetailScreen). Reached by navigating from a JobCard press on HomeScreen's Jobs segment; header title "Job Detail". */}
      <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: 'Job Detail' }} />
      {/* Route "GovtJobDetail" -> GovtJobDetailScreen (@/screens/govtjobs/GovtJobDetailScreen). Reached by navigating from a card press on HomeScreen's Govt Jobs segment; header title "Job Detail". */}
      <Stack.Screen name="GovtJobDetail" component={GovtJobDetailScreen} options={{ title: 'Job Detail' }} />
      {/* Route "CompanyCareers" -> CompanyCareersScreen (@/screens/jobs/CompanyCareersScreen). Reached by navigating from a company card press on HomeScreen's Companies segment; header title "Careers". */}
      <Stack.Screen name="CompanyCareers" component={CompanyCareersScreen} options={{ title: 'Careers' }} />
    </Stack.Navigator>
  );
}
