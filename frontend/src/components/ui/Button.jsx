/**
 * Button.jsx
 *
 * shadcn/ui-style Button primitive: a styled <button> (or <a> when an
 * `href` is given) with variant/size class presets. Used across the entire
 * app — public CTAs, forms, dashboard actions — anywhere a clickable action
 * or link-styled-as-a-button is needed.
 */
import { cn } from '@/utils/cn'

// Color/style variants for Button, keyed by the `variant` prop:
const variants = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',        // solid primary color — main/primary call-to-action
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80', // solid neutral secondary color — secondary actions
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground', // bordered, transparent fill — lower-emphasis actions
  ghost: 'hover:bg-accent hover:text-accent-foreground',                     // no border/fill until hover — minimal/tertiary actions (e.g. icon buttons, toolbar actions)
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90', // solid destructive/red — irreversible or dangerous actions (delete, remove, etc.)
}

// Size presets for Button, keyed by the `size` prop:
const sizes = {
  default: 'h-10 px-4 py-2',   // standard button height/padding for most contexts
  sm: 'h-9 rounded-md px-3 text-xs',  // compact button for dense UI (tables, toolbars)
  lg: 'h-11 rounded-md px-8',  // larger button for prominent CTAs (landing/hero sections)
  icon: 'h-10 w-10',           // square button sized for a single icon with no label
}

/**
 * Button
 *
 * Styled button/link primitive with variant and size presets.
 *
 * Props:
 * - className (string, optional) — extra classes merged in via cn().
 * - variant (string, default 'default') — one of 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'; see `variants` above.
 * - size (string, default 'default') — one of 'default' | 'sm' | 'lg' | 'icon'; see `sizes` above.
 * - href (string, optional) — when provided, renders an <a> styled as a button instead of a <button> element (for link-style CTAs, e.g. "Post a Job").
 * - children (node) — button label/content.
 * - ...props — all other props (onClick, type, disabled, target, etc.) are spread onto the underlying <button> or <a>.
 *
 * Used throughout the app for any clickable action: forms, dashboard
 * actions, public page CTAs, etc.
 */
export function Button({ className, variant = 'default', size = 'default', href, children, ...props }) {
  const cls = cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed',
    variants[variant],
    sizes[size],
    className
  )
  // When `href` is supplied, render as an anchor tag styled like a button (for navigation-style CTAs)
  if (href) {
    return (
      <a href={href} className={cls} {...props}>
        {children}
      </a>
    )
  }
  // Default case: render as a real <button> element (for form submits, click handlers, etc.)
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  )
}
