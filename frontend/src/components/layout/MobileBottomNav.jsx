import { NavLink, Link } from 'react-router-dom'
import { Home, Briefcase, FileText, ShoppingBag, Building2, Users, Landmark, Tag, LogIn, UserCircle, LayoutDashboard, Store, Wrench } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAuth } from '@/hooks/useAuth'

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

export default function MobileBottomNav() {
  const { token, user } = useAuthStore()
  const { signOut } = useAuth()
  const isSeeker     = token && user && !user.is_company && !user.is_store_owner
  const isCompany    = token && user?.is_company
  const isStoreOwner = token && user?.is_store_owner

  const items = NAV_ITEMS.filter(item => {
    if (item.companyOnly && isSeeker) return false
    if (item.companyOnly && isStoreOwner) return false
    return true
  })

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

        {token ? (
          <>
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
