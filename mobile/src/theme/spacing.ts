/**
 * theme/spacing.ts
 *
 * Single source of truth for spacing (margins/padding/gaps) and corner
 * radius values used across the mobile app. Per project convention,
 * components/screens must reference these tokens (`Spacing[4]`,
 * `BorderRadius.md`, etc.) rather than hardcoding numeric pixel values.
 */
// Spacing scale, keyed by step number (not pixels) so usage reads as
// "step 4" rather than a raw magic number, while the actual pixel value
// (4px per step, i.e. step N = N*4) stays adjustable in one place. Use
// smaller steps (1-3) for tight/inline spacing (icon gaps, chip padding),
// mid steps (4-6) for standard component padding/margins, and larger
// steps (8-16) for section spacing and screen-level padding.
export const Spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

// Corner radius scale for rounded elements.
export const BorderRadius = {
  sm: 6,    // Small radius — inputs, chips, small badges.
  md: 10,   // Medium radius — default for buttons and cards.
  lg: 14,   // Large radius — bigger cards/sheets.
  xl: 20,   // Extra-large radius — modals, prominent containers.
  full: 9999, // Fully rounded — pills and circular elements (avatars, icon buttons).
} as const;
