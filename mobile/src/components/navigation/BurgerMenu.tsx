/**
 * BurgerMenu.tsx
 *
 * Persistent top bar mounted by `AppNavigator` directly above its
 * `Tab.Navigator` (in normal layout flow, not a floating overlay), so it
 * stays visible across every tab and can never be drawn over by a screen's
 * own top-of-content elements (e.g. `ShoppingScreen`'s "Online Stores" /
 * "Retail Chains" segmented row used to visually collide with it when it
 * floated as an absolutely-positioned overlay). Holds a "Sign In" link
 * (signed-out only) and the hamburger button on the right; tapping the
 * hamburger opens a small dropdown panel listing the destinations that
 * used to be their own bottom tabs — Profile and Alerts — plus Saved Jobs, Saved Tenders and Settings.
 * Each is registered as a root-stack screen (see `navigation/index.tsx`),
 * so `useNavigation()` here (resolving to the root stack, since this
 * component sits alongside, not inside, the Tab.Navigator) can navigate
 * to them directly by name.
 */
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

// Destinations shown in the dropdown, in display order. `route` is the
// root-stack screen name registered in `navigation/index.tsx`.
const MENU_ITEMS: { label: string; route: string; icon: string }[] = [
  { label: 'Profile', route: 'Profile', icon: 'person-outline' },
  { label: 'Saved Jobs', route: 'SavedJobs', icon: 'bookmark-outline' },
  { label: 'Saved Tenders', route: 'SavedTenders', icon: 'document-text-outline' },
  { label: 'Alerts', route: 'Alerts', icon: 'notifications-outline' },
  { label: 'Settings', route: 'Settings', icon: 'settings-outline' },
];

/**
 * BurgerMenu
 *
 * Renders the top bar (a "Sign In" text link when signed out, plus the
 * hamburger button) and, when the hamburger is tapped, a `Modal` dropdown
 * with `MENU_ITEMS`. Reads no props/route params — mounted once by
 * `AppNavigator`, above its `Tab.Navigator`. Tapping a menu item navigates
 * to that root-stack screen and closes the dropdown; tapping the backdrop
 * closes it without navigating.
 */
export function BurgerMenu() {
  const navigation = useNavigation<any>();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  // Measured height of the top bar (safe-area inset + row), used to anchor
  // the dropdown panel directly beneath it instead of a guessed pixel offset.
  const [barHeight, setBarHeight] = useState(0);
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);

  const navigateTo = (route: string) => {
    setOpen(false);
    navigation.navigate(route);
  };

  const onBarLayout = (e: LayoutChangeEvent) => setBarHeight(e.nativeEvent.layout.height);

  return (
    <>
      <SafeAreaView edges={['top']} style={styles.topBar} onLayout={onBarLayout}>
        <View style={styles.topBarRow}>
          {/* Sign In link — only shown while signed out, so it never
              overlaps/competes with an authenticated user's own account state.
              Plain clickable text (no button/pill background), matching the
              rest of the bar's minimal chrome. */}
          {!isAuthenticated && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Auth')}
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
            >
              <Text style={styles.signInText}>Sign In</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setOpen(true)}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
          >
            <Ionicons name="menu-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        {/* Backdrop: tapping anywhere outside the panel closes the menu without navigating. */}
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.panel, { top: barHeight + Spacing[1] }]}>
            {MENU_ITEMS.map((item, index) => (
              <TouchableOpacity
                key={item.route}
                style={[styles.item, index > 0 && styles.itemBorder]}
                onPress={() => navigateTo(item.route)}
                activeOpacity={0.7}
              >
                <Ionicons name={item.icon as any} size={20} color={Colors.textSecondary} />
                <Text style={styles.itemLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  topBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing[4],
    paddingHorizontal: Spacing[4],
    height: 48,
  },
  signInText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  menuButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  panel: {
    position: 'absolute',
    right: Spacing[4],
    width: 200,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  itemBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  itemLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
});
