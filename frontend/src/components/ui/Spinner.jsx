/**
 * Spinner.jsx
 *
 * Small shadcn/ui-style loading indicator: a circular border with a
 * spinning primary-color arc. Used across the app wherever async data is
 * loading — page loading states, button loading states, GlobalSearch's
 * "Searching..." indicator context, etc.
 */
import { cn } from '@/utils/cn'

/**
 * Spinner
 *
 * Rotating circular loading indicator.
 *
 * Props:
 * - className (string, optional) — extra classes merged in via cn(), commonly used to override the default `h-5 w-5` size or add margin.
 *
 * Used anywhere a lightweight loading affordance is needed: page-level
 * loading states, in-button loading indicators, async list/detail fetches.
 */
export function Spinner({ className }) {
  return (
    <div className={cn('animate-spin rounded-full border-2 border-muted border-t-primary h-5 w-5', className)} />
  )
}
