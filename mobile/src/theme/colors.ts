/**
 * theme/colors.ts
 *
 * Single source of truth for every colour value used across the mobile
 * app. Per project convention, components/screens must import tokens from
 * here (`Colors.primary`, etc.) rather than hardcoding hex values, so a
 * palette change only needs to happen in one place.
 */
export const Colors = {
  // Primary brand colour — use for primary buttons, active tab/nav
  // states, links, and other main call-to-action elements.
  primary: '#1D4ED8',       // Blue — brand colour
  // Light tint of primary — use for subtle backgrounds/badges behind
  // primary-coloured content (e.g. selected filter chips, info banners).
  primaryLight: '#DBEAFE',
  // Darker shade of primary — use for pressed/active states of primary
  // elements or text needing extra contrast on light backgrounds.
  primaryDark: '#1E3A8A',
  // Secondary/accent colour — use sparingly for highlights that should
  // stand out from primary actions (e.g. badges, promotional callouts).
  secondary: '#F59E0B',     // Amber — accent
  // App/screen background colour (behind cards and surfaces).
  background: '#F8FAFC',
  // Elevated surface colour — cards, sheets, modals sit on this rather
  // than directly on `background`.
  surface: '#FFFFFF',
  // Hairline border/divider colour for cards, inputs, and separators.
  border: '#E2E8F0',
  // Primary/body text colour — highest-contrast text on `background`/`surface`.
  text: '#0F172A',
  // Secondary text colour — subtitles, metadata, less prominent copy.
  textSecondary: '#64748B',
  // Muted text colour — placeholders, disabled/inactive text, timestamps.
  textMuted: '#94A3B8',
  // Success state colour — confirmations, positive status badges (e.g. "Applied").
  success: '#10B981',
  // Error state colour — form validation errors, failed states, destructive actions.
  error: '#EF4444',
  // Warning state colour — cautionary banners/badges (shares the amber accent hue).
  warning: '#F59E0B',
  // Pure white — use for text/icons needing full contrast on coloured
  // (e.g. primary-filled) backgrounds.
  white: '#FFFFFF',
  // Pure black — reserved for cases needing true black (rare; prefer `text`).
  black: '#000000',
} as const;
