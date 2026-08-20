/**
 * Input.jsx
 *
 * shadcn/ui-style styled <input> primitive. Used across the app for
 * text/search/number inputs — e.g. JobFilter's search box, form fields
 * (React Hook Form + Zod) on Login/Register/PostJob/Profile pages, etc.
 * Wrapped in forwardRef so it works as a controlled input inside React Hook
 * Form's `register()`/`Controller` bindings, which need a ref to the
 * underlying DOM element.
 */
import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

/**
 * Input
 *
 * Styled text input primitive, ref-forwarding to the underlying <input>.
 *
 * Props:
 * - className (string, optional) — extra classes merged in via cn().
 * - ref — forwarded to the native <input> element (required for React Hook Form integration).
 * - ...props — all other native <input> props (value, onChange, type, placeholder, disabled, etc.) are spread through.
 *
 * Used throughout forms (React Hook Form + Zod validated fields) and simple
 * filter/search boxes such as JobFilter's search input.
 */
export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
})
