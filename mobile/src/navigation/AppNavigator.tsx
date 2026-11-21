/**
 * Authenticated app's root navigator: a persistent top bar (Sign In link +
 * hamburger menu) above a 5-tab bottom tab bar.
 *
 * Rendered by `RootNavigator` (see `navigation/index.tsx`). Jobs and
 * Tenders each host their own list->detail native-stack navigator so the
 * tab bar stays visible while drilling into a detail screen; Home,
 * Shopping, and Services are single screens with no nested stack. Retail
 * store browsing is no longer a standalone tab — it was merged into the
 * Shopping tab as an "Online Stores" / "Retail Chains" segmented toggle
 * (see `ShoppingScreen`), freeing this tab slot for Services, a
 * database-backed directory of local service providers (lawyers,
 * plumbers, mechanics, etc. — see `backend/apps/services`). Search has no
 * tab of its own — it's a search bar inside the Home tab (see
 * `HomeTabScreen`), sharing `useJobs`/jobStore's filter state with the
 * Jobs tab's own listing, same as it always did. Govt Jobs and Companies
 * are similarly reachable from within the Jobs tab (see
 * `JobsStackNavigator`/`HomeScreen`) rather than being their own
 * top-level tabs; Profile and Alerts are reachable via `BurgerMenu`
 * (mounted below, as a persistent top bar above the tab navigator) rather
 * than the tab bar — see `navigation/index.tsx` for where those three
 * are registered as root-stack screens. Tab icons come from
 * `@expo/vector-icons` (Ionicons) and colors/labels are theme-driven
 * (`@/theme/colors`), never hardcoded per project convention.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { JobsStackNavigator } from './JobsStackNavigator';
import { TendersStackNavigator } from './TendersStackNavigator';
import { BurgerMenu } from '@/components/navigation/BurgerMenu';
import { HomeTabScreen } from '@/screens/home/HomeTabScreen';
import { ShoppingScreen } from '@/screens/shopping/ShoppingScreen';
import { ServicesScreen } from '@/screens/services/ServicesScreen';
import { useThemeColors } from '@/theme/colors';

const Tab = createBottomTabNavigator();

// Maps each tab's route name to its Ionicons glyph (outline style).
// Keyed by the exact `name` used on the corresponding <Tab.Screen> below,
// so this table must be kept in sync with the screen names.
const TAB_ICONS: Record<string, string> = {
  Jobs: 'briefcase-outline',
  Tenders: 'document-text-outline',
  Home: 'home-outline',
  Shopping: 'cart-outline',
  Services: 'construct-outline',
};

/**
 * AppNavigator
 *
 * A persistent `BurgerMenu` top bar (Sign In link + hamburger,
 * Profile/Alerts/Settings dropdown) stacked above the bottom tab
 * navigator for the app's main tabbed experience — both in normal layout
 * flow (not an absolute overlay), so the top bar occupies its own space
 * and no screen's own top-of-content elements can render over it. No
 * props/params — this is the fixed shell mounted whenever the root stack
 * shows the "App" screen. Each tab's icon and active/inactive tint come
 * from the shared `Colors` theme module rather than hardcoded values.
 */
export function AppNavigator() {
  const Colors = useThemeColors();
  return (
    <View style={styles.fill}>
      {/* Persistent top bar — sits above the tab navigator in normal flow,
          not as a floating overlay, so it can never be visually covered by
          a screen's own top-of-content elements (e.g. ShoppingScreen's
          segmented row). */}
      <BurgerMenu />

      <Tab.Navigator
        // Home is the landing tab on app launch, even though it sits in the
        // middle of the tab bar (between Jobs/Tenders and Shopping/Services)
        // — the bar's left-to-right order is unrelated to which tab opens first.
        initialRouteName="Home"
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
        {/* Tab "Jobs" -> JobsStackNavigator (list->detail stack: Home, JobDetail, plus the Govt Jobs and Companies sections reachable from Home). Icon: briefcase-outline. */}
        <Tab.Screen name="Jobs" component={JobsStackNavigator} />
        {/* Tab "Tenders" -> TendersStackNavigator (list->detail stack: TendersList, TenderDetail). Icon: document-text-outline. */}
        <Tab.Screen name="Tenders" component={TendersStackNavigator} />
        {/* Tab "Home" -> HomeTabScreen (@/screens/home/HomeTabScreen): branding header, job search bar, and cross-tab "Recently Viewed" feed. Icon: home-outline. */}
        <Tab.Screen name="Home" component={HomeTabScreen} />
        {/* Tab "Shopping" -> ShoppingScreen (@/screens/shopping/ShoppingScreen): Online Stores / Retail Chains segmented directory, single screen, no nested stack. Icon: cart-outline. */}
        <Tab.Screen name="Shopping" component={ShoppingScreen} />
        {/* Tab "Services" -> ServicesScreen (@/screens/services/ServicesScreen): local service provider directory (lawyers, plumbers, mechanics, etc.), single screen, no nested stack. Icon: construct-outline. */}
        <Tab.Screen name="Services" component={ServicesScreen} />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
