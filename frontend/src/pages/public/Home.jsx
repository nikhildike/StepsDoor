import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, MapPin, Clock, Building2, FileText, Briefcase, ArrowRight, IndianRupee, Users, ShoppingBag, Monitor, Shirt, Smartphone, ShoppingCart, Sparkles, Home as HomeIcon, BookOpen, Dumbbell, Store, Wrench, Truck, HeartPulse, GraduationCap, Globe, UtensilsCrossed, Plane, BadgeCheck, ExternalLink } from 'lucide-react'
import { jobService } from '@/services/jobService'
import { tenderService } from '@/services/tenderService'
import { govtJobService } from '@/services/govtJobService'
import { companyService } from '@/services/companyService'
import { storeService } from '@/services/storeService'
import { timeAgo, formatDate } from '@/utils/formatDate'
import { JOB_TYPES } from '@/utils/constants'

function JobCard({ job }) {
  const typeLabel = JOB_TYPES.find(t => t.value === job.job_type)?.label ?? job.job_type
  return (
    <Link
      to={`/jobs/${job.id}`}
      className="flex items-start gap-4 p-4 rounded-lg border border-border bg-white hover:shadow-sm transition-shadow"
    >
      {job.company_logo ? (
        <img src={job.company_logo} alt={job.company_name} className="h-10 w-10 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Building2 className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{job.title}</p>
        <p className="text-sm text-muted-foreground">{job.company_name}</p>
        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.city}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(job.created_at)}</span>
          <span className="text-primary font-medium">{typeLabel}</span>
        </div>
      </div>
    </Link>
  )
}

function TenderCard({ tender }) {
  return (
    <Link
      to={`/tenders/${tender.id}`}
      className="block p-4 rounded-lg border border-border bg-white hover:shadow-sm transition-shadow"
    >
      <p className="font-medium text-foreground line-clamp-2 text-sm">{tender.title}</p>
      <p className="text-xs text-muted-foreground mt-1">{tender.organisation}</p>
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{tender.state}</span>
        {tender.submission_deadline && (
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Due {formatDate(tender.submission_deadline)}</span>
        )}
      </div>
    </Link>
  )
}

function GovtJobCard({ job }) {
  return (
    <Link
      to={`/govt-jobs/${job.id}`}
      className="block p-4 rounded-lg border border-border bg-white hover:shadow-sm transition-shadow"
    >
      <p className="font-medium text-foreground line-clamp-2 text-sm">{job.title}</p>
      <p className="text-xs text-muted-foreground mt-1">{job.organisation}</p>
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        {job.vacancy_count && <span>{job.vacancy_count} vacancies</span>}
        {job.application_deadline && (
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Last date {formatDate(job.application_deadline)}</span>
        )}
      </div>
    </Link>
  )
}

const FREELANCER_HIGHLIGHTS = [
  { name: 'Upwork',       url: 'https://www.upwork.com',       tag: 'Global' },
  { name: 'Fiverr',       url: 'https://www.fiverr.com',       tag: 'Global' },
  { name: 'Toptal',       url: 'https://www.toptal.com',       tag: 'Elite' },
  { name: 'Freelancer',   url: 'https://www.freelancer.in',    tag: 'Global' },
  { name: 'Internshala',  url: 'https://internshala.com',      tag: 'India' },
  { name: 'WorkIndia',    url: 'https://workindia.in',         tag: 'India' },
  { name: 'PeoplePerHour',url: 'https://www.peopleperhour.com',tag: 'Global' },
  { name: '99designs',    url: 'https://99designs.com',        tag: 'Design' },
  { name: 'Guru',         url: 'https://www.guru.com',         tag: 'Global' },
  { name: 'LinkedIn Jobs',url: 'https://www.linkedin.com/jobs',tag: 'Remote' },
  { name: 'Truelancer',   url: 'https://www.truelancer.com',   tag: 'India' },
  { name: 'Flexjobs',     url: 'https://www.flexjobs.com',     tag: 'Remote' },
]

const SERVICE_CATEGORIES = [
  { label: 'Marketplaces',   icon: Globe,          bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-100'   },
  { label: 'Home Repairs',   icon: Wrench,         bg: 'bg-cyan-50',   text: 'text-cyan-700',   border: 'border-cyan-100'   },
  { label: 'Healthcare',     icon: HeartPulse,     bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-100'   },
  { label: 'Food & Hotels',  icon: UtensilsCrossed,bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100' },
  { label: 'Logistics',      icon: Truck,          bg: 'bg-slate-50',  text: 'text-slate-700',  border: 'border-slate-100'  },
  { label: 'IT & Software',  icon: Monitor,        bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' },
  { label: 'Education',      icon: GraduationCap,  bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-100'   },
  { label: 'Travel',         icon: Plane,          bg: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-100'    },
]

const RETAIL_CATEGORIES = [
  { label: 'Supermarkets', icon: ShoppingCart, bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-100'  },
  { label: 'Fashion',      icon: Shirt,        bg: 'bg-pink-50',   text: 'text-pink-700',   border: 'border-pink-100'   },
  { label: 'Electronics',  icon: Smartphone,   bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-100'   },
  { label: 'Jewellery',    icon: Sparkles,     bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100' },
  { label: 'Pharmacy',     icon: BookOpen,     bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-100'    },
  { label: 'Home & Decor', icon: HomeIcon,     bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-100'  },
  { label: 'Footwear',     icon: Dumbbell,     bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100' },
  { label: 'Beauty',       icon: Store,        bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100' },
]

const SHOPPING_CATEGORIES = [
  { label: 'Marketplaces', icon: ShoppingCart, bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-100' },
  { label: 'Fashion',      icon: Shirt,        bg: 'bg-pink-50',    text: 'text-pink-700',    border: 'border-pink-100'   },
  { label: 'Electronics',  icon: Smartphone,   bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-100'   },
  { label: 'Grocery',      icon: ShoppingBag,  bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-100'  },
  { label: 'Beauty',       icon: Sparkles,     bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-100' },
  { label: 'Home & Decor', icon: HomeIcon,     bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-100' },
  { label: 'Books',        icon: BookOpen,     bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-100' },
  { label: 'Sports',       icon: Dumbbell,     bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-100'    },
]

export default function Home() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [jobs, setJobs] = useState([])
  const [tenders, setTenders] = useState([])
  const [govtJobs, setGovtJobs] = useState([])
  const [companies, setCompanies] = useState([])
  const [retailStores, setRetailStores] = useState([])

  useEffect(() => {
    jobService.list({ page_size: 6 }).then(({ data }) => setJobs((data.results ?? data).slice(0, 6))).catch(() => {})
    tenderService.list({ page_size: 4 }).then(({ data }) => setTenders((data.results ?? data).slice(0, 4))).catch(() => {})
    govtJobService.list({ page_size: 4 }).then(({ data }) => setGovtJobs((data.results ?? data).slice(0, 4))).catch(() => {})
    companyService.list().then(({ data }) => setCompanies(data.results ?? data)).catch(() => {})
    storeService.listRetail().then(({ data }) => {
      const all = data.results ?? data
      setRetailStores(all.filter(s => s.website_url))
    }).catch(() => {})
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    navigate(`/jobs${searchQuery.trim() ? `?search=${encodeURIComponent(searchQuery.trim())}` : ''}`)
  }

  return (
    <div className="bg-gray-50 min-h-screen">

      {/* Hero */}
      <section className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
            Find Your Next Opportunity in India
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Private jobs, government tenders, sarkari naukri, freelance gigs &amp; shopping — all in one place.
          </p>

          <form onSubmit={handleSearch} className="mt-8 flex gap-2 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Job title, company, or keyword..."
                className="w-full h-11 pl-9 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              className="h-11 px-6 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Search
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            {companies.length > 0 && <span><strong className="text-foreground">{companies.length}+</strong> companies hiring</span>}
            {jobs.length > 0 && <span><strong className="text-foreground">New</strong> jobs added daily</span>}
            <span><strong className="text-foreground">Free</strong> to browse & apply</span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-14">

        {/* Latest Private Jobs */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold">Latest Jobs</h2>
              <p className="text-sm text-muted-foreground mt-0.5">From companies hiring right now</p>
            </div>
            <Link to="/jobs" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {jobs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No jobs yet — check back soon.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map(job => <JobCard key={job.id} job={job} />)}
            </div>
          )}
        </section>

        {/* Companies Hiring */}
        {companies.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <BadgeCheck className="h-5 w-5 text-primary" /> Companies Hiring on Linksdoor
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">Verified companies — browse open positions and apply directly</p>
              </div>
              <Link to="/companies" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {companies.slice(0, 6).map(company => (
                <Link
                  key={company.id}
                  to={`/careers/${company.slug}`}
                  className="flex items-center gap-3 p-3 bg-white border border-border rounded-xl hover:shadow-sm transition-shadow"
                >
                  {company.logo ? (
                    <img src={company.logo} alt={company.name} className="h-10 w-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                      {company.name}
                      <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                    </p>
                    <p className="text-xs text-muted-foreground">{company.active_job_count} open position{company.active_job_count !== 1 ? 's' : ''}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Freelancers */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Freelance &amp; Remote Work
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">Top platforms to find gigs, contracts &amp; remote jobs</p>
            </div>
            <Link to="/freelancers" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {FREELANCER_HIGHLIGHTS.map(p => (
              <a
                key={p.name}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-lg hover:shadow-sm transition-shadow text-sm font-medium"
              >
                {p.name}
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{p.tag}</span>
              </a>
            ))}
          </div>
        </section>

        {/* Services */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" /> Service Providers
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">Home, legal, accounting, IT, logistics &amp; more</p>
            </div>
            <Link to="/services" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {SERVICE_CATEGORIES.map(({ label, icon: Icon, bg, text, border }) => (
              <Link
                key={label}
                to="/services"
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${bg} ${border} hover:shadow-sm transition-shadow text-center`}
              >
                <Icon className={`h-6 w-6 ${text}`} />
                <span className={`text-xs font-semibold ${text}`}>{label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Shopping */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" /> Shopping &amp; Stores
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">100+ Indian &amp; global stores across all categories</p>
            </div>
            <Link to="/shopping" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {SHOPPING_CATEGORIES.map(({ label, icon: Icon, bg, text, border }) => (
              <Link
                key={label}
                to="/shopping"
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${bg} ${border} hover:shadow-sm transition-shadow text-center`}
              >
                <Icon className={`h-6 w-6 ${text}`} />
                <span className={`text-xs font-semibold ${text}`}>{label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Retail Stores */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" /> Retail Stores
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">Offline retail chains — supermarkets, fashion, electronics &amp; more</p>
            </div>
            <Link to="/retail-stores" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {RETAIL_CATEGORIES.map(({ label, icon: Icon, bg, text, border }) => (
              <Link
                key={label}
                to="/retail-stores"
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${bg} ${border} hover:shadow-sm transition-shadow text-center`}
              >
                <Icon className={`h-6 w-6 ${text}`} />
                <span className={`text-xs font-semibold ${text}`}>{label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Retail Stores on Linksdoor */}
        {retailStores.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <BadgeCheck className="h-5 w-5 text-primary" /> Retail Stores on Linksdoor
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">Verified retail stores — visit their website or find a store near you</p>
              </div>
              <Link to="/retail-stores" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {retailStores.slice(0, 6).map(store => (
                <div key={store.id} className="flex items-center gap-3 p-3 bg-white border border-border rounded-xl hover:shadow-sm transition-shadow">
                  {store.logo ? (
                    <img src={store.logo} alt={store.name} className="h-10 w-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Store className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                      {store.name}
                      <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                    </p>
                    {store.tagline && <p className="text-xs text-muted-foreground truncate">{store.tagline}</p>}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {store.store_locator_url && (
                      <a href={store.store_locator_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                      >
                        <MapPin className="h-3 w-3" /> Find
                      </a>
                    )}
                    <a href={store.website_url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-md text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tenders + Govt Jobs side by side */}
        <div className="grid gap-10 lg:grid-cols-2">

          {/* Tenders */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Government Tenders
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">Latest notices from official portals</p>
              </div>
              <Link to="/tenders" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {tenders.length === 0 ? (
              <p className="text-muted-foreground text-sm">No tenders yet.</p>
            ) : (
              <div className="space-y-3">
                {tenders.map(t => <TenderCard key={t.id} tender={t} />)}
              </div>
            )}
          </section>

          {/* Govt Jobs */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" /> Government Jobs
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">UPSC, SSC, Railways, Banking & more</p>
              </div>
              <Link to="/govt-jobs" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {govtJobs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No government jobs yet.</p>
            ) : (
              <div className="space-y-3">
                {govtJobs.map(j => <GovtJobCard key={j.id} job={j} />)}
              </div>
            )}
          </section>
        </div>

        {/* Employer CTA */}
        <section className="bg-primary rounded-2xl p-10 text-center text-primary-foreground">
          <h2 className="text-2xl font-bold">Hiring? Post your jobs on Linksdoor</h2>
          <p className="mt-2 text-primary-foreground/80 max-w-lg mx-auto">
            Reach thousands of active job seekers across India. Get your own branded career page included.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Link
              to="/register"
              className="px-6 py-2.5 bg-white text-primary rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              to="/pricing"
              className="px-6 py-2.5 border border-white/40 text-white rounded-lg text-sm font-semibold hover:bg-white/10 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </section>

      </div>
    </div>
  )
}
