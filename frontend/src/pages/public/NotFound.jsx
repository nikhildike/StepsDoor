/**
 * NotFound.jsx
 *
 * Catch-all 404 page. Mounted at the wildcard route `*` in App.jsx, so it
 * renders for any URL that doesn't match one of the defined public, company,
 * or seeker routes.
 */
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

/**
 * Simple centered "page not found" message with a link back to the home page.
 * Purely presentational — no data fetching, state, or props.
 */
export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="mt-4 text-xl font-semibold">Page not found</p>
      <p className="mt-2 text-muted-foreground">The page you're looking for doesn't exist.</p>
      <Link to="/" className="mt-6">
        <Button>Go back home</Button>
      </Link>
    </div>
  )
}
