/**
 * EmptyState.jsx
 *
 * shadcn/ui-style placeholder shown in place of a list/grid when there is
 * no data to display (e.g. "No jobs found", "No saved jobs yet"). Used
 * across job listing pages, dashboard tables, and seeker pages wherever a
 * collection can be empty.
 */

/**
 * EmptyState
 *
 * Centered placeholder message for empty lists/collections.
 *
 * Props:
 * - title (string, required) — primary message (e.g. "No jobs found").
 * - description (string, optional) — secondary explanatory text shown below the title; omitted entirely when not provided.
 * - action (node, optional) — optional call-to-action element (e.g. a Button) rendered below the description.
 *
 * Used wherever a list/grid of data (jobs, tenders, saved items, dashboard
 * tables, etc.) can be empty and needs a friendly placeholder instead of a
 * blank area.
 */
export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-lg font-medium text-foreground">{title}</p>
      {/* Description is optional — only rendered when supplied */}
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {/* Optional call-to-action (e.g. a "Post a Job" or "Browse Jobs" button) */}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
