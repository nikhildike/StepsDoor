/**
 * Authenticated app's root navigator: a 6-tab bottom tab bar.
 *
 * Rendered by `RootNavigator` (see `navigation/index.tsx`) when a job
 * seeker is logged in. Three tabs (Jobs, Tenders, Govt Jobs) each host
 * their own list->detail native-stack navigator so the tab bar stays
 * visible while drilling into a detail screen; the remaining three tabs
 * (Search, Alerts, Profile) are single screens with no nested stack.
 * Tab icons come from `@expo/vector-icons` (Ionicons) and colors/labels
 * are theme-driven (`@/theme/colors`), never hardcoded per project
 * convention.
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { JobsStackNavigator } from './JobsStackNavigator';
import { TendersStackNavigator } from './TendersStackNavigator';
import { GovtJobsStackNavigator } from './GovtJobsStackNavigator';
import { SearchScreen } from '@/screens/jobs/SearchScreen';
import { ShoppingScreen } from '@/screens/shopping/ShoppingScreen';
import { RetailStoresScreen } from '@/screens/retail/RetailStoresScreen';
import { AlertsScreen } from '@/screens/seeker/AlertsScreen';
import { ProfileScreen } from '@/screens/seeker/ProfileScreen';
import { Colors } from '@/theme/colors';

const Tab = createBottomTabNavigator();

// Maps each tab's route name to its Ionicons glyph (outline style).
// Keyed by the exact `name` used on the corresponding <Tab.Screen> below,
// so this table must be kept in sync with the screen names.
const TAB_ICONS: Record<string, string> = {
  Jobs: 'briefcase-outline',
  Search: 'search-outline',
  Tenders: 'document-text-outline',
  'Govt Jobs': 'school-outline',
  Shopping: 'cart-outline',
  Retail: 'storefront-outline',
  Alerts: 'notifications-outline',
  Profile: 'person-outline',
};

/**
 * AppNavigator
 *
 * Bottom tab navigator for the authenticated job-seeker experience.
 * No props/params — this is the fixed 6-tab shell mounted once the user
 * is logged in. Each tab's icon and active/inactive tint come from the
 * shared `Colors` theme module rather than hardcoded values.
 */
export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // Per-route icon renderer: looks up the Ionicons name for the
        // current tab from TAB_ICONS, falling back to a generic dot icon
        // if a tab name isn't registered in the map.
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={(TAB_ICONS[route.name] ?? 'ellipse-outline') as any}
            size={size}
            color={color}
          />
        ),
        // Active/inactive tab tint colors sourced from the theme, not hardcoded.
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        // Each tab manages its own header (or has none); the tab navigator's
        // own header chrome is disabled here.
        headerShown: false,
      })}
    >
      {/* Tab "Jobs" -> JobsStackNavigator (list->detail stack: Home, JobDetail). Icon: briefcase-outline. */}
      <Tab.Screen name="Jobs" component={JobsStackNavigator} />
      {/* Tab "Search" -> SearchScreen (@/screens/jobs/SearchScreen), single screen, no nested stack. Icon: search-outline. */}
      <Tab.Screen name="Search" component={SearchScreen} />
      {/* Tab "Tenders" -> TendersStackNavigator (list->detail stack: TendersList, TenderDetail). Icon: document-text-outline. */}
      <Tab.Screen name="Tenders" component={TendersStackNavigator} />
      {/* Tab "Govt Jobs" -> GovtJobsStackNavigator (list->detail stack: GovtJobsList, GovtJobDetail). Icon: school-outline. */}
      <Tab.Screen name="Govt Jobs" component={GovtJobsStackNavigator} />
      {/* Tab "Shopping" -> ShoppingScreen (@/screens/shopping/ShoppingScreen), single screen, no nested stack. Icon: cart-outline. */}
      <Tab.Screen name="Shopping" component={ShoppingScreen} />
      {/* Tab "Retail" -> RetailStoresScreen (@/screens/retail/RetailStoresScreen), single screen, no nested stack. Icon: storefront-outline. */}
      <Tab.Screen name="Retail" component={RetailStoresScreen} />
      {/* Tab "Alerts" -> AlertsScreen (@/screens/seeker/AlertsScreen), single screen, no nested stack. Icon: notifications-outline. */}
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      {/* Tab "Profile" -> ProfileScreen (@/screens/seeker/ProfileScreen), single screen, no nested stack. Icon: person-outline. */}
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
