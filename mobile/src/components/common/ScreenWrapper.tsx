/**
 * Shared screen-level layout wrapper. Every screen in the app renders
 * its content inside this component to get consistent safe-area insets
 * (notches/status bar/home indicator) and the app's themed background
 * color, without each screen re-implementing that boilerplate.
 */
import React from 'react';
import { SafeAreaView, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/theme/colors';

/**
 * Props for `ScreenWrapper`.
 * - `children`: the screen's content to render inside the safe area.
 * - `style`: optional extra `ViewStyle` merged onto the container,
 *   applied after the base container style so it can override it
 *   (e.g. custom padding per screen).
 */
interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * ScreenWrapper
 *
 * Wraps `children` in a `SafeAreaView` with the themed background
 * color and `flex: 1` so content fills the screen. Intended to be the
 * outermost element of every screen component in `screens/` (auth,
 * jobs, tenders, govtjobs, seeker) for consistent layout/safe-area
 * handling.
 *
 * Props: see `Props` interface above.
 */
export function ScreenWrapper({ children, style }: Props) {
  return (
    <SafeAreaView style={[styles.container, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
