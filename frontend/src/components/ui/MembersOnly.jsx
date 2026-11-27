/**
 * MembersOnly.jsx
 *
 * Sign-in prompt shown in place of scraped tender / govt job listings for
 * visitors who aren't logged in. The API serves that data to members only
 * (anonymous requests get 401), so pages render this instead of calling it.
 * Used by pages/public/Home.jsx for its tender and govt job previews.
 */
import { Link, useLocation } from 'react-router-dom'
import { Lock } from 'lucide-react'

/**
 * MembersOnly
 *
 * Bordered card with a lock icon, a short explanation and Sign in / Create
 * account links. Both links carry the current path as `state.from`, so
 * useAuth returns the visitor to this page after they sign in or register.
 *
 * Props:
 * - what (string, required) — what's behind the sign-in, e.g. "the latest government tenders".
 * - source (string, optional) — where the data comes from, shown as "updated every day from <source>" (default "official portals").
 */
export function MembersOnly({ what, source = 'official portals' }) {
  const location = useLocation()
  const from = location.pathname + location.search // where to come back to after auth

  return (
    <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-center">
      <Lock className="mx-auto h-5 w-5 text-muted-foreground" />
      <p className="mt-2 text-sm font-medium text-foreground">Free for members</p>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to see {what}, updated every day from {source}.</p>
      <div className="mt-4 flex justify-center gap-2">
        <Link
          to="/login"
          state={{ from }}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sign in
        </Link>
        <Link
          to="/register"
          state={{ from }}
          className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Create free account
        </Link>
      </div>
    </div>
  )
}
