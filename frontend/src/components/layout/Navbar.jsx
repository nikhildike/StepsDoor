import { Link, NavLink } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'

const NAV_LINKS = [
  { to: '/jobs',        label: 'Jobs'        },
  { to: '/shopping',      label: 'Shopping'       },
  { to: '/retail-stores', label: 'Retail Stores'  },
  { to: '/services',    label: 'Services'    },
  { to: '/govt-jobs',   label: 'Govt Jobs'   },
  { to: '/tenders',     label: 'Tenders'     },
  { to: '/companies',   label: 'Companies'   },
  { to: '/freelancers', label: 'Freelancers' },
  { to: '/pricing',     label: 'Pricing', companyOnly: true },
]

export default function Navbar() {
  const { token, user } = useAuthStore()
  const { signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const isSeeker     = token && user && !user.is_company && !user.is_store_owner
  const isCompany    = token && user?.is_company
  const isStoreOwner = token && user?.is_store_owner

  const links = NAV_LINKS.filter(l => !(l.companyOnly && (isSeeker || isStoreOwner)))

  return (
    <header className="hidden md:block border-b bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-primary">Linksdoor</Link>

        <nav className="flex items-center gap-6 text-sm font-medium">
          {links.map(({ to, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
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
