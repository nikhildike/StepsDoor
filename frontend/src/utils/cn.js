/**
 * cn.js — Conditional Tailwind class-name helper.
 *
 * Combines `clsx` (conditional class composition — supports strings,
 * arrays, and object maps of `{ className: boolean }`) with
 * `tailwind-merge` (resolves conflicting Tailwind utility classes by
 * keeping only the last one that wins, e.g. `px-2` vs `px-4`).
 *
 * Used throughout the app — components and pages under
 * `frontend/src/components/` and `frontend/src/pages/` — anywhere a
 * className needs to be built conditionally (variants, active states,
 * responsive overrides) with shadcn/ui-style components.
 */
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges any number of class-name inputs (strings, arrays, conditional
 * objects) into a single de-duplicated, conflict-resolved className string.
 *
 * @param {...(string|Array|Object|undefined|null|false)} inputs - Class name
 *   values, in any form accepted by `clsx` (falsy values are ignored).
 * @returns {string} The final merged className, safe to pass to a `className` prop.
 *
 * @example
 * cn('px-2 py-1', isActive && 'bg-primary', { 'text-white': isActive })
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
