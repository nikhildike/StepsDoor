import { useState } from 'react'
import { ExternalLink, Globe, MapPin, Code, Palette, PenLine, Zap, Wifi, Building2, TrendingUp, Mic, BookOpen, IndianRupee } from 'lucide-react'

// region: 'global' | 'india' | 'europe'
// indiaPayment: true = confirmed India-friendly payout (bank transfer / UPI / Payoneer available)
//               false = known restrictions or US/EU-only payout
//               null = unverified — check platform before committing

const PLATFORM_GROUPS = [
  {
    id: 'global',
    label: 'Global Platforms',
    icon: Globe,
    color: 'blue',
    platforms: [
      { name: 'Upwork',          url: 'https://www.upwork.com/nx/search/jobs/',                region: 'global', indiaPayment: true,  desc: 'Largest freelance marketplace' },
      { name: 'Fiverr',          url: 'https://www.fiverr.com',                                region: 'global', indiaPayment: true,  desc: 'Services starting at $5' },
      { name: 'Freelancer',      url: 'https://www.freelancer.com/jobs',                       region: 'global', indiaPayment: true,  desc: 'Bid on projects worldwide' },
      { name: 'PeoplePerHour',   url: 'https://www.peopleperhour.com/freelance-jobs',          region: 'global', indiaPayment: null,  desc: 'Hourly & fixed-price projects' },
      { name: 'Guru',            url: 'https://www.guru.com/d/jobs/',                          region: 'global', indiaPayment: true,  desc: 'Professional freelance network' },
      { name: 'Toptal',          url: 'https://www.toptal.com/talent/apply',                   region: 'global', indiaPayment: true,  desc: 'Top 3% of freelance talent' },
      { name: 'Truelancer',      url: 'https://www.truelancer.com/freelance-jobs',             region: 'global', indiaPayment: true,  desc: 'Verified freelancers' },
      { name: 'Workana',         url: 'https://www.workana.com/en/jobs',                       region: 'global', indiaPayment: false, desc: 'Latin America & global jobs' },
      { name: 'Hubstaff Talent', url: 'https://www.hubstaff.com/talent',                       region: 'global', indiaPayment: true,  desc: 'Free, no commission' },
      { name: 'Twago',           url: 'https://www.twago.com',                                 region: 'europe', indiaPayment: false, desc: 'European freelance platform' },
      { name: 'Zeerk',           url: 'https://www.zeerk.com',                                 region: 'global', indiaPayment: true,  desc: 'Micro-service marketplace' },
      { name: 'SEOClerk',        url: 'https://www.seoclerk.com',                              region: 'global', indiaPayment: true,  desc: 'SEO micro-gigs & services' },
      { name: 'Legiit',          url: 'https://legiit.com',                                    region: 'global', indiaPayment: true,  desc: 'Digital services marketplace' },
      { name: 'Kolabtree',       url: 'https://kolabtree.com',                                 region: 'global', indiaPayment: null,  desc: 'Freelance scientists & researchers' },
      { name: 'Outsourcely',     url: 'https://www.outsourcely.com',                           region: 'global', indiaPayment: null,  desc: 'Remote work for startups' },
      { name: 'Gigged.ai',       url: 'https://www.gigged.ai',                                 region: 'global', indiaPayment: null,  desc: 'AI-matched freelance projects' },
      { name: 'Contra',          url: 'https://contra.com',                                    region: 'global', indiaPayment: true,  desc: 'Commission-free freelancing' },
      { name: 'Malt',            url: 'https://www.malt.com',                                  region: 'europe', indiaPayment: false, desc: 'Europe-focused freelancers' },
      { name: 'Catalant',        url: 'https://www.catalant.com',                              region: 'global', indiaPayment: null,  desc: 'Business strategy consultants' },
      { name: 'Upstack',         url: 'https://www.upstack.co',                                region: 'global', indiaPayment: null,  desc: 'Vetted remote developers' },
    ],
  },
  {
    id: 'india',
    label: 'India-Focused',
    icon: MapPin,
    color: 'orange',
    platforms: [
      { name: 'WorknHire',  url: 'https://www.worknhire.com/browse-projects', region: 'india', indiaPayment: true, desc: 'Indian freelance projects' },
      { name: 'Flexiple',   url: 'https://flexiple.com/freelance-jobs/',       region: 'india', indiaPayment: true, desc: 'Premium tech freelancers' },
      { name: 'Refrens',    url: 'https://www.refrens.com/freelancers',        region: 'india', indiaPayment: true, desc: 'India\'s freelancer network' },
      { name: 'Awign',      url: 'https://www.awign.com/find-work',            region: 'india', indiaPayment: true, desc: 'Gig & enterprise work' },
      { name: 'Taskmo',     url: 'https://taskmo.com/gig-workers',             region: 'india', indiaPayment: true, desc: 'On-demand gig platform' },
      { name: 'Frapp',      url: 'https://frapp.in/gigs',                      region: 'india', indiaPayment: true, desc: 'Campus & youth gigs' },
      { name: 'Tacnique',   url: 'https://tacnique.com',                       region: 'india', indiaPayment: true, desc: 'Tech freelancers, India' },
      { name: 'Uplers',     url: 'https://www.uplers.com/talent',              region: 'india', indiaPayment: true, desc: 'Remote work for global clients' },
    ],
  },
  {
    id: 'developers',
    label: 'Developers',
    icon: Code,
    color: 'violet',
    platforms: [
      { name: 'Turing',     url: 'https://www.turing.com/jobs',              region: 'global', indiaPayment: true,  desc: 'AI-vetted remote dev jobs' },
      { name: 'Arc.dev',    url: 'https://arc.dev/remote-jobs',              region: 'global', indiaPayment: true,  desc: 'Remote developer jobs' },
      { name: 'Lemon.io',   url: 'https://lemon.io/for-developers/',         region: 'global', indiaPayment: null,  desc: 'Handpicked dev network' },
      { name: 'Gun.io',     url: 'https://gun.io/find-work/',                region: 'global', indiaPayment: null,  desc: 'Top freelance engineers' },
      { name: 'Codementor', url: 'https://www.codementor.io/freelance-jobs', region: 'global', indiaPayment: true,  desc: 'Mentoring & dev projects' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing & Finance',
    icon: TrendingUp,
    color: 'cyan',
    platforms: [
      { name: 'Mayple',            url: 'https://www.mayple.com',              region: 'global', indiaPayment: null,  desc: 'Vetted marketing experts' },
      { name: 'Growth Collective', url: 'https://growthcollective.com',        region: 'global', indiaPayment: null,  desc: 'Fractional marketers' },
      { name: 'Paro.ai',           url: 'https://www.paro.ai',                 region: 'global', indiaPayment: false, desc: 'Finance & accounting freelancers' },
    ],
  },
  {
    id: 'design',
    label: 'Design & Creative',
    icon: Palette,
    color: 'pink',
    platforms: [
      { name: '99designs',         url: 'https://99designs.com/designers',                     region: 'global', indiaPayment: true,  desc: 'Graphic design contests' },
      { name: 'Dribbble',          url: 'https://dribbble.com/jobs?contract=freelance',        region: 'global', indiaPayment: null,  desc: 'Freelance design jobs' },
      { name: 'Behance',           url: 'https://www.behance.net/joblist',                     region: 'global', indiaPayment: null,  desc: 'Creative job board' },
      { name: 'DesignCrowd',       url: 'https://www.designcrowd.com/register/designer',       region: 'global', indiaPayment: true,  desc: 'Crowdsourced design' },
      { name: 'Designhill',        url: 'https://www.designhill.com/designers',                region: 'india',  indiaPayment: true,  desc: 'India-founded design platform' },
      { name: 'Crowdspring',       url: 'https://crowdspring.com/creatives/',                  region: 'global', indiaPayment: null,  desc: 'Logo, web & naming contests' },
      { name: 'Freelanced',        url: 'https://www.freelanced.com',                          region: 'global', indiaPayment: null,  desc: 'Creative freelancer directory' },
      { name: 'Coroflot',          url: 'https://www.coroflot.com/jobs',                       region: 'global', indiaPayment: null,  desc: 'Design job board' },
      { name: 'Working Not Working', url: 'https://www.workingnotworking.com',                 region: 'global', indiaPayment: null,  desc: 'Top creative talent' },
    ],
  },
  {
    id: 'writing',
    label: 'Writing & Content',
    icon: PenLine,
    color: 'green',
    platforms: [
      { name: 'WriterAccess',    url: 'https://www.writeraccess.com/writers/',    region: 'global', indiaPayment: null,  desc: 'Content writing platform' },
      { name: 'iWriter',         url: 'https://www.iwriter.com/writers',          region: 'global', indiaPayment: null,  desc: 'Article & blog writing' },
      { name: 'PepperContent',   url: 'https://www.peppercontent.io/creators/',   region: 'india',  indiaPayment: true,  desc: 'Indian content platform' },
      { name: 'ProBlogger Jobs', url: 'https://problogger.com/jobs/',             region: 'global', indiaPayment: null,  desc: 'Blogging & writing gigs' },
      { name: 'FreelanceWriting',url: 'https://www.freelancewriting.com/jobs/',   region: 'global', indiaPayment: null,  desc: 'Writing job board' },
      { name: 'Constant Content',url: 'https://www.constant-content.com',         region: 'global', indiaPayment: null,  desc: 'Sell pre-written articles' },
      { name: 'Draft',           url: 'https://draft.co',                         region: 'global', indiaPayment: null,  desc: 'Content as a service' },
    ],
  },
  {
    id: 'microtasks',
    label: 'Micro-Tasks',
    icon: Zap,
    color: 'yellow',
    platforms: [
      { name: 'Amazon MTurk', url: 'https://www.mturk.com/worker',                 region: 'global', indiaPayment: false, desc: 'India payout restricted ⚠️' },
      { name: 'Clickworker',  url: 'https://www.clickworker.com/clickworker/',      region: 'global', indiaPayment: null,  desc: 'Text & categorisation tasks' },
      { name: 'Appen',        url: 'https://www.appen.com/jobs/',                   region: 'global', indiaPayment: true,  desc: 'AI training data tasks' },
      { name: 'Microworkers', url: 'https://www.microworkers.com',                  region: 'global', indiaPayment: true,  desc: 'Paid micro-tasks' },
      { name: 'Rapidworkers', url: 'https://www.rapidworkers.com',                  region: 'global', indiaPayment: true,  desc: 'Quick online tasks' },
      { name: 'Toloka',       url: 'https://toloka.ai',                             region: 'global', indiaPayment: true,  desc: 'Yandex crowdsourcing tasks' },
      { name: 'UserTesting',  url: 'https://www.usertesting.com/get-paid-to-test',  region: 'global', indiaPayment: false, desc: 'Website usability testing' },
      { name: 'Testbirds',    url: 'https://www.testbirds.com/testers/',             region: 'global', indiaPayment: true,  desc: 'App & software testing' },
      { name: 'uTest',        url: 'https://utest.com',                             region: 'global', indiaPayment: true,  desc: 'QA & bug testing' },
    ],
  },
  {
    id: 'voice',
    label: 'Video / Audio / Voice',
    icon: Mic,
    color: 'purple',
    platforms: [
      { name: 'Voices.com',      url: 'https://www.voices.com/talents',      region: 'global', indiaPayment: null, desc: 'Voice acting marketplace' },
      { name: 'Voice123',        url: 'https://voice123.com',                region: 'global', indiaPayment: null, desc: 'Voice-over for brands' },
      { name: 'Production Hub',  url: 'https://www.production-hub.com',      region: 'global', indiaPayment: null, desc: 'Film & video production gigs' },
    ],
  },
  {
    id: 'teaching',
    label: 'Tutoring & Teaching',
    icon: BookOpen,
    color: 'teal',
    platforms: [
      { name: 'Chegg Tutors', url: 'https://www.chegg.com/tutors/become-a-tutor/', region: 'global', indiaPayment: false, desc: 'US-focused tutoring platform' },
      { name: 'Preply',       url: 'https://preply.com/en/teach',                  region: 'global', indiaPayment: true,  desc: 'Language tutoring worldwide' },
      { name: 'Vedantu',      url: 'https://www.vedantu.com/teach',                region: 'india',  indiaPayment: true,  desc: 'India live tutoring platform' },
      { name: 'Cuemath',      url: 'https://www.cuemath.com/teach/',               region: 'india',  indiaPayment: true,  desc: 'India maths tutoring gigs' },
    ],
  },
  {
    id: 'remote',
    label: 'Remote Job Boards',
    icon: Wifi,
    color: 'indigo',
    platforms: [
      { name: 'We Work Remotely', url: 'https://weworkremotely.com/remote-jobs',                         region: 'global', indiaPayment: true,  desc: 'Largest remote work community' },
      { name: 'RemoteOK',         url: 'https://remoteok.com/remote-freelance-jobs',                     region: 'global', indiaPayment: true,  desc: 'Remote freelance jobs' },
      { name: 'FlexJobs',         url: 'https://www.flexjobs.com/search?joblocations=&search=freelance', region: 'global', indiaPayment: false, desc: 'Vetted flexible jobs (US focus)' },
      { name: 'Wellfound',        url: 'https://wellfound.com/jobs',                                     region: 'global', indiaPayment: true,  desc: 'Startup jobs & freelance' },
      { name: 'LinkedIn Services',url: 'https://www.linkedin.com/services/',                             region: 'global', indiaPayment: null,  desc: 'Professional services marketplace' },
      { name: 'Remotive',         url: 'https://remotive.com',                                           region: 'global', indiaPayment: true,  desc: 'Curated remote job board' },
      { name: 'Jobspresso',       url: 'https://jobspresso.co',                                          region: 'global', indiaPayment: null,  desc: 'Hand-picked remote jobs' },
      { name: 'Working Nomads',   url: 'https://www.workingnomads.com/jobs',                             region: 'global', indiaPayment: null,  desc: 'Remote jobs for nomads' },
      { name: 'EuRemoteJobs',     url: 'https://euremotejobs.com',                                       region: 'europe', indiaPayment: false, desc: 'Europe remote jobs' },
      { name: 'Himalayas',        url: 'https://himalayas.app/jobs',                                     region: 'global', indiaPayment: true,  desc: 'Remote jobs with pay transparency' },
      { name: 'Dynamite Jobs',    url: 'https://dynamitejobs.com',                                       region: 'global', indiaPayment: null,  desc: 'Remote jobs for entrepreneurs' },
    ],
  },
  {
    id: 'localgig',
    label: 'Local Gig — India',
    icon: Building2,
    color: 'red',
    platforms: [
      { name: 'Apna',          url: 'https://apna.co/jobs',                                    region: 'india', indiaPayment: true, desc: 'Blue-collar & local gigs' },
      { name: 'WorkIndia',     url: 'https://www.workindia.in/jobs/',                          region: 'india', indiaPayment: true, desc: 'Jobs for non-tech workers' },
      { name: 'Urban Company', url: 'https://www.urbancompany.com/register-as-a-professional', region: 'india', indiaPayment: true, desc: 'Home services professionals' },
      { name: 'OLX Jobs',      url: 'https://www.olx.in/jobs',                                region: 'india', indiaPayment: true, desc: 'High-traffic informal listings' },
      { name: 'QuikrJobs',     url: 'https://www.quikr.com/jobs',                             region: 'india', indiaPayment: true, desc: 'Classifieds + job listings' },
      { name: 'JobHai',        url: 'https://www.jobhai.com',                                  region: 'india', indiaPayment: true, desc: 'Blue collar jobs (InfoEdge)' },
    ],
  },
]

const COLOR_MAP = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: 'text-blue-500',   border: 'border-blue-100',   badge: 'bg-blue-100 text-blue-700' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-500', border: 'border-orange-100', badge: 'bg-orange-100 text-orange-700' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', icon: 'text-violet-500', border: 'border-violet-100', badge: 'bg-violet-100 text-violet-700' },
  cyan:   { bg: 'bg-cyan-50',   text: 'text-cyan-700',   icon: 'text-cyan-500',   border: 'border-cyan-100',   badge: 'bg-cyan-100 text-cyan-700' },
  pink:   { bg: 'bg-pink-50',   text: 'text-pink-700',   icon: 'text-pink-500',   border: 'border-pink-100',   badge: 'bg-pink-100 text-pink-700' },
  green:  { bg: 'bg-green-50',  text: 'text-green-700',  icon: 'text-green-500',  border: 'border-green-100',  badge: 'bg-green-100 text-green-700' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'text-yellow-500', border: 'border-yellow-100', badge: 'bg-yellow-100 text-yellow-700' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-500', border: 'border-purple-100', badge: 'bg-purple-100 text-purple-700' },
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-700',   icon: 'text-teal-500',   border: 'border-teal-100',   badge: 'bg-teal-100 text-teal-700' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: 'text-indigo-500', border: 'border-indigo-100', badge: 'bg-indigo-100 text-indigo-700' },
  red:    { bg: 'bg-red-50',    text: 'text-red-700',    icon: 'text-red-500',    border: 'border-red-100',    badge: 'bg-red-100 text-red-700' },
}

const REGION_LABELS = { global: 'Global', india: 'India', europe: 'Europe' }

function PlatformCard({ platform, color }) {
  const c = COLOR_MAP[color]
  return (
    <a
      href={platform.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col gap-2 p-3.5 bg-white border rounded-lg hover:shadow-md hover:border-primary/30 transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors leading-tight">
          {platform.name}
        </p>
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
      </div>
      <p className="text-xs text-muted-foreground leading-snug">{platform.desc}</p>
      <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-1">
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${c.badge}`}>
          {REGION_LABELS[platform.region]}
        </span>
        {platform.indiaPayment === true && (
          <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-green-100 text-green-700 flex items-center gap-0.5">
            <IndianRupee className="h-2.5 w-2.5" /> India Pay ✓
          </span>
        )}
        {platform.indiaPayment === false && (
          <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-red-50 text-red-600">
            Pay restricted
          </span>
        )}
      </div>
    </a>
  )
}

function PlatformGroup({ group, filter }) {
  const c = COLOR_MAP[group.color]
  const Icon = group.icon

  const platforms = filter === 'india_pay'
    ? group.platforms.filter(p => p.indiaPayment === true)
    : filter === 'india_region'
    ? group.platforms.filter(p => p.region === 'india')
    : group.platforms

  if (platforms.length === 0) return null

  return (
    <div id={group.id}>
      <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg ${c.bg} ${c.border} border`}>
        <Icon className={`h-4 w-4 ${c.icon}`} />
        <h2 className={`text-sm font-bold ${c.text}`}>{group.label}</h2>
        <span className={`ml-auto text-xs font-medium ${c.text} opacity-70`}>{platforms.length} platforms</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {platforms.map(p => (
          <PlatformCard key={p.name} platform={p} color={group.color} />
        ))}
      </div>
    </div>
  )
}

export default function Freelancers() {
  const [filter, setFilter] = useState('all')
  const [activeCategory, setActiveCategory] = useState('all')

  const allPlatforms = PLATFORM_GROUPS.flatMap(g => g.platforms)
  const total = allPlatforms.length
  const indiaPayCount = allPlatforms.filter(p => p.indiaPayment === true).length

  const FILTERS = [
    { id: 'all',          label: `All (${total})` },
    { id: 'india_pay',    label: `₹ India Pay (${indiaPayCount})` },
    { id: 'india_region', label: 'India-Focused' },
  ]

  const visibleGroups = PLATFORM_GROUPS.filter(group => {
    if (activeCategory !== 'all' && group.id !== activeCategory) return false
    const platforms = filter === 'india_pay'
      ? group.platforms.filter(p => p.indiaPayment === true)
      : filter === 'india_region'
      ? group.platforms.filter(p => p.region === 'india')
      : group.platforms
    return platforms.length > 0
  })

  const handleCategoryClick = (id) => {
    setActiveCategory(id)
    if (id !== 'all') {
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Freelancer Platforms</h1>
        <p className="text-muted-foreground text-sm">
          {total} platforms across {PLATFORM_GROUPS.length} categories.
          Cards tagged <span className="inline-flex items-center gap-0.5 text-green-700 font-medium"><IndianRupee className="h-3 w-3" />India Pay ✓</span> support Indian bank payouts.
          <span className="text-red-600 font-medium ml-1">"Pay restricted"</span> = known India payout issues — verify before committing.
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === f.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-white border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Sidebar + content layout */}
      <div className="flex gap-6 items-start">

        {/* ── Sidebar ── */}
        <aside className="hidden md:block w-52 shrink-0 sticky top-4">
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="px-3 py-2.5 border-b bg-gray-50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Categories</p>
            </div>
            <nav className="py-1">
              {/* All categories */}
              <button
                onClick={() => handleCategoryClick('all')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left ${
                  activeCategory === 'all'
                    ? 'bg-primary/8 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-gray-50 hover:text-foreground'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" />
                All Categories
                <span className="ml-auto text-xs opacity-60">{total}</span>
              </button>

              <div className="my-1 border-t" />

              {/* Each category */}
              {PLATFORM_GROUPS.map(group => {
                const c = COLOR_MAP[group.color]
                const Icon = group.icon
                const isActive = activeCategory === group.id
                const count = filter === 'india_pay'
                  ? group.platforms.filter(p => p.indiaPayment === true).length
                  : filter === 'india_region'
                  ? group.platforms.filter(p => p.region === 'india').length
                  : group.platforms.length
                if (count === 0) return null
                return (
                  <button
                    key={group.id}
                    onClick={() => handleCategoryClick(group.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left ${
                      isActive
                        ? `${c.bg} ${c.text} font-semibold`
                        : 'text-muted-foreground hover:bg-gray-50 hover:text-foreground'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? c.icon : ''}`} />
                    <span className="truncate">{group.label}</span>
                    <span className="ml-auto text-xs opacity-60 shrink-0">{count}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* ── Mobile: horizontal scrollable category strip ── */}
        <div className="md:hidden w-full mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => handleCategoryClick('all')}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activeCategory === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-white border-border text-muted-foreground'
              }`}
            >
              All
            </button>
            {PLATFORM_GROUPS.map(group => {
              const c = COLOR_MAP[group.color]
              const Icon = group.icon
              const isActive = activeCategory === group.id
              return (
                <button
                  key={group.id}
                  onClick={() => handleCategoryClick(group.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    isActive
                      ? `${c.bg} ${c.text} ${c.border} font-semibold`
                      : 'bg-white border-border text-muted-foreground'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {group.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0 space-y-10">
          {visibleGroups.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              No platforms match the current filter.
            </div>
          ) : (
            visibleGroups.map(group => (
              <PlatformGroup key={group.id} group={group} filter={filter} />
            ))
          )}

          {/* Footer note */}
          <div className="border-t pt-6 space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              Linksdoor is not affiliated with any platforms listed above. Links open in a new tab.
            </p>
            <p className="text-xs text-muted-foreground text-center">
              ⚠️ Freelance platforms shut down or change payout policies frequently.
              Verify India payout methods directly on each platform before committing work.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
