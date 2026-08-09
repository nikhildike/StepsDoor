import { Link } from 'react-router-dom'

const FOOTER_SECTIONS = [
  {
    heading: 'Browse',
    links: [
      { to: '/jobs',          label: 'Jobs' },
      { to: '/shopping',      label: 'Shopping' },
      { to: '/retail-stores', label: 'Retail Stores' },
      { to: '/services',      label: 'Services' },
      { to: '/govt-jobs',     label: 'Govt Jobs' },
      { to: '/tenders',       label: 'Tenders' },
      { to: '/companies',     label: 'Companies' },
      { to: '/freelancers',   label: 'Freelancers' },
    ],
  },
  {
    heading: 'Employers',
    links: [
      { to: '/pricing',            label: 'Pricing' },
      { to: '/register',           label: 'Post a Job' },
      { to: '/dashboard',          label: 'Dashboard' },
      { to: '/dashboard/post-job', label: 'Post New Job' },
      { to: '/dashboard/analytics',label: 'Analytics' },
    ],
  },
  {
    heading: 'Job Seekers',
    links: [
      { to: '/register',       label: 'Create Account' },
      { to: '/login',          label: 'Sign In' },
      { to: '/seeker/saved',   label: 'Saved Jobs' },
      { to: '/seeker/alerts',  label: 'Job Alerts' },
      { to: '/seeker/profile', label: 'My Profile' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="hidden md:block border-t bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Top: brand + columns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link to="/" className="text-lg font-bold text-primary">Linksdoor</Link>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed max-w-xs">
              India's all-in-one destination for private jobs, government tenders, sarkari naukri, freelance gigs, and shopping.
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_SECTIONS.map(({ heading, links }) => (
            <div key={heading}>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">{heading}</p>
              <ul className="space-y-2">
                {links.map(({ to, label }) => (
                  <li key={to}>
                    <Link to={to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t text-center text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Linksdoor. All rights reserved.</span>
        </div>

      </div>
    </footer>
  )
}
