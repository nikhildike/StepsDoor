/**
 * theme/typography.ts
 *
 * Single source of truth for font family, size, weight, and line-height
 * tokens used across the mobile app. Per project convention,
 * components/screens must reference these tokens rather than hardcoding
 * font values, so type styling stays consistent and centrally adjustable.
 */
import { Platform } from 'react-native';

// Platform-appropriate default font families. iOS and Android ship
// different system fonts/monospace faces, so `Platform.select` picks the
// right native-feeling font per OS rather than forcing one look
// everywhere; `default` covers any other platform (e.g. web via Expo).
// `sans` is the general body/UI font; `mono` is for fixed-width content
// (e.g. reference numbers, codes) where used.
export const FontFamily = Platform.select({
  ios: { sans: 'System', mono: 'Courier New' },
  android: { sans: 'Roboto', mono: 'monospace' },
  default: { sans: 'System', mono: 'monospace' },
});

// Font size scale (in points). `base` is the standard body text size;
// smaller steps (`xs`/`sm`) are for captions/metadata/labels, larger
// steps (`lg` and up) are for subheadings, headings, and hero/display text.
export const FontSize = {
  xs: 11,    // Fine print — timestamps, badges, least prominent labels.
  sm: 13,    // Secondary text — captions, metadata, helper text.
  base: 15,  // Default body text size.
  lg: 17,    // Emphasized body text / small subheadings.
  xl: 20,    // Section headings.
  '2xl': 24, // Screen/page titles.
  '3xl': 30, // Large display headings (e.g. hero/empty-state text).
} as const;

// Font weight roles. Use `normal` for body copy, `medium` for slightly
// emphasized text (e.g. labels), `semibold` for subheadings/buttons, and
// `bold` for headings/strong emphasis.
export const FontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Line-height multipliers (relative to font size). `tight` suits large
// headings, `normal` is the default for body text, and `relaxed` suits
// longer-form/paragraph copy (e.g. job descriptions) for readability.
export const LineHeight = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
} as const;
