/**
 * MobileBottomNav.jsx
 *
 * Fixed bottom tab bar shown only on small screens (`md:hidden`), giving
 * mobile users primary site navigation plus role-aware account links
 * (Dashboard/Profile/Sign out for signed-in users, Sign in otherwise).
 * Rendered once inside PublicLayout alongside Navbar/Footer, so it appears
 * at the bottom of every public page on mobile viewports.
 */
import { NavLink, Link } from 'react-router-dom'
import { Home, Briefcase, FileText, ShoppingBag, Building2, Users, Landmark, Tag, LogIn, UserCircle, LayoutDashboard, Store, Wrench } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAuth } from '@/hooks/useAuth'

// Primary tab entries. `companyOnly: true` marks items that should be hidden
// for job-seeker and store-owner accounts (see filtering logic below).
const NAV_ITEMS = [
  { to: '/',            label: 'Home',        icon: Home        },
  { to: '/jobs',        label: 'Jobs',        icon: Briefcase   },
  { to: '/shopping',      label: 'Shopping',      icon: ShoppingBag },
  { to: '/retail-stores', label: 'Retail',        icon: Store       },
  { to: '/services',    label: 'Services',    icon: Wrench      },
  { to: '/govt-jobs',   label: 'Govt Jobs',   icon: Landmark    },
  { to: '/tenders',     label: 'Tenders',     icon: FileText    },
  { to: '/companies',   label: 'Companies',   icon: Building2   },
  { to: '/freelancers', label: 'Freelancers', icon: Users       },
  { to: '/pricing',     label: 'Pricing',     icon: Tag, companyOnly: true },
]

/**
 * MobileBottomNav
 *
 * Mobile-only fixed bottom navigation bar: horizontally scrollable primary
 * tabs plus a role-aware trailing section (Dashboard/Profile/Sign out links
 * for authenticated users, a Sign in link for anonymous visitors).
 *
 * Props: none — reads auth state from useAuthStore/useAuth directly.
 *
 * Rendered inside PublicLayout so it appears on every public page; hidden on
 * `md`+ screens where Navbar is used instead.
 */
export default function MobileBottomNav() {
  const { token, user } = useAuthStore()
  const { signOut } = useAuth()
  // Role flags derived from the signed-in user: a user is one of seeker/company/store-owner
  // (or, if `token` is falsy, none of them — i.e. an anonymous visitor)
  const isSeeker     = token && user && !user.is_company && !user.is_store_owner
  const isCompany    = token && user?.is_company
  const isStoreOwner = token && user?.is_store_owner

  // Hide company-only nav items (e.g. Pricing) from seekers and store owners
  const items = NAV_ITEMS.filter(item => {
    if (item.companyOnly && isSeeker) return false
    if (item.companyOnly && isStoreOwner) return false
    return true
  })

  // Determine which profile page the "Profile" tab should link to based on account type;
  // null (no profile link rendered) when the visitor isn't signed in as any of these roles
  const profileTo = isCompany
    ? '/dashboard/profile'
    : isSeeker
    ? '/seeker/profile'
    : isStoreOwner
    ? '/store/account'
    : null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t md:hidden">
      <div className="flex overflow-x-auto scrollbar-hide">

        {/* Primary nav tabs — highlight the active route; '/' uses `end` so it only matches the exact home route */}
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3.5 py-2.5 min-w-fit flex-shrink-0 text-xs font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Divider */}
        <div className="w-px bg-border my-2 mx-1 flex-shrink-0" />

        {/* Trailing section: role-aware account links when signed in, otherwise just Sign in */}
        {token ? (
          <>
            {/* Dashboard shortcut only for company/store-owner accounts (seekers have no dashboard) */}
            {(isCompany || isStoreOwner) && (
              <NavLink
                to={isCompany ? '/dashboard' : '/store'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-3.5 py-2.5 min-w-fit flex-shrink-0 text-xs font-medium transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <LayoutDashboard className="h-5 w-5" />
                    <span>Dashboard</span>
                  </>
                )}
              </NavLink>
            )}
            {/* Profile link only rendered when we resolved a valid profile route above */}
            {profileTo && (
              <NavLink
                to={profileTo}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-3.5 py-2.5 min-w-fit flex-shrink-0 text-xs font-medium transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <UserCircle className="h-5 w-5" />
                    <span>Profile</span>
                  </>
                )}
              </NavLink>
            )}
            <button
              onClick={signOut}
              className="flex flex-col items-center gap-0.5 px-3.5 py-2.5 min-w-fit flex-shrink-0 text-xs font-medium text-muted-foreground"
            >
              <LogIn className="h-5 w-5 rotate-180" />
              <span>Sign out</span>
            </button>
          </>
        ) : (
          <NavLink
            to="/login"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3.5 py-2.5 min-w-fit flex-shrink-0 text-xs font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <LogIn className="h-5 w-5" />
                <span>Sign in</span>
              </>
            )}
          </NavLink>
        )}

      </div>
    </nav>
  )
}
