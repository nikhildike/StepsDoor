/**
 * Shared screen-level layout wrapper. Every screen in the app renders
 * its content inside this component to get consistent safe-area insets
 * (notches/home indicator) and the app's themed background color, without
 * each screen re-implementing that boilerplate. Excludes the `top` edge —
 * every tab screen already sits below `BurgerMenu`'s persistent top bar
 * (see `AppNavigator`), which consumes the top safe-area inset itself, so
 * applying it again here would double the gap under the status bar.
 */
import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '@/theme/colors';

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
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.container, style]}>
      {children}
    </SafeAreaView>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
