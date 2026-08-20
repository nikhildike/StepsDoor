/**
 * Badge.jsx
 *
 * shadcn/ui-style pill/label primitive for short status or category text
 * (e.g. job type on JobCard, plan status on Subscription, etc). Used
 * throughout public and dashboard pages wherever a small colored tag is
 * needed.
 */
import { cn } from '@/utils/cn'

// Visual variants for Badge, keyed by the `variant` prop:
const variants = {
  default: 'bg-primary/10 text-primary',       // tinted primary color — general/default emphasis
  secondary: 'bg-secondary text-secondary-foreground', // neutral secondary color — low-emphasis/informational tags (e.g. job type)
  outline: 'border border-border text-foreground',     // outlined, no fill — subtle/minimal emphasis
  destructive: 'bg-destructive/10 text-destructive',    // tinted destructive/red — warnings, errors, negative status
}

/**
 * Badge
 *
 * Small rounded pill for status/category labels.
 *
 * Props:
 * - className (string, optional) — extra classes merged in via cn(), e.g. spacing overrides.
 * - variant (string, default 'default') — one of 'default' | 'secondary' | 'outline' | 'destructive'; see `variants` above.
 * - children (node) — the label content/text.
 *
 * Used wherever a compact tag is needed, e.g. JobCard's job-type badge,
 * subscription/payment status indicators, etc.
 */
export function Badge({ className, variant = 'default', children }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}
