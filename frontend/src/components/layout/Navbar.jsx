/**
 * Navbar.jsx
 *
 * Desktop-only (`hidden md:block`) sticky top header for public pages: brand
 * logo/home link, primary nav links, the GlobalSearch box, role-aware auth
 * actions (Dashboard/My Store/Sign out, or Sign in/Post a Job), and a
 * dark-mode toggle. Rendered once inside PublicLayout so it's present on
 * every public page on desktop viewports; MobileBottomNav covers the same
 * role on small screens.
 */
import { Link, NavLink } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import GlobalSearch from '@/components/layout/GlobalSearch'

// Primary nav links. `companyOnly: true` marks links (Pricing) that should
// only be shown to anonymous visitors and signed-in company users, not to
// seekers or store owners (see filtering logic below).
const NAV_LINKS = [
  { to: '/jobs',        label: 'Jobs'        },
  { to: '/shopping',      label: 'Shopping'       },
  { to: '/retail-stores', label: 'Retail Stores'  },
  { to: '/services',    label: 'Services'    },
  { to: '/tenders',     label: 'Tenders'     },
  { to: '/pricing',     label: 'Pricing', companyOnly: true },
]

/**
 * Navbar
 *
 * Desktop sticky top navigation header for the public site.
 *
 * Props: none — reads auth state via useAuthStore/useAuth and theme via useTheme.
 *
 * Rendered once inside PublicLayout; visible only at `md`+ breakpoints
 * (mobile uses MobileBottomNav instead).
 */
export default function Navbar() {
  const { token, user } = useAuthStore()
  const { signOut } = useAuth()
  const { theme, toggle } = useTheme()
  // Role flags derived from the signed-in user (all false/undefined for anonymous visitors)
  const isSeeker     = token && user && !user.is_company && !user.is_store_owner
  const isCompany    = token && user?.is_company
  const isStoreOwner = token && user?.is_store_owner

  // Hide company-only links (Pricing) from seekers and store owners
  const links = NAV_LINKS.filter(l => !(l.companyOnly && (isSeeker || isStoreOwner)))

  return (
    <header className="hidden md:block border-b bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-primary">StepsDoor</Link>

        <nav className="flex items-center gap-6 text-sm font-medium">
          {/* Primary nav links, filtered by role above; active route is highlighted via NavLink's isActive */}
          {links.map(({ to, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <GlobalSearch />
          {/* Auth actions: role-aware shortcuts + sign out when authenticated, sign in / post-a-job CTA otherwise */}
          {token ? (
            <>
              {isCompany    && <Link to="/dashboard" className="text-sm font-medium text-primary hover:underline">Dashboard</Link>}
              {isStoreOwner && <Link to="/store"     className="text-sm font-medium text-primary hover:underline">My Store</Link>}
              <button onClick={signOut} className="text-sm text-muted-foreground hover:text-foreground">Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium hover:text-primary">Sign in</Link>
              <Link to="/register" className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90">Post a Job</Link>
            </>
          )}
          {/* Dark mode toggle — icon reflects the mode you'd switch TO on click */}
          <button
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  )
}
