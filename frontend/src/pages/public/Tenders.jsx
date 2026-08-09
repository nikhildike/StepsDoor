import { useState } from 'react'
import { ExternalLink, Building2, MapPin, ChevronRight } from 'lucide-react'

const CENTRAL_PORTALS = [
  { name: 'eProcure (Central)',  url: 'https://eprocure.gov.in/eprocure/app',            desc: 'Central Govt NIC eProcurement', category: 'Central Procurement' },
  { name: 'GEM',                 url: 'https://gem.gov.in',                              desc: 'Government e-Marketplace', category: 'Central Procurement' },
  { name: 'CPPP',                url: 'https://eprocure.gov.in/cppp/',                   desc: 'Central Public Procurement Portal', category: 'Central Procurement' },
  { name: 'IREPS (Railway)',     url: 'https://www.ireps.gov.in',                        desc: 'Indian Railway e-Procurement', category: 'Railways' },
  { name: 'Defence Procurement', url: 'https://defproc.gov.in',                          desc: 'Ministry of Defence tenders', category: 'Defence' },
  { name: 'MSTC',                url: 'https://www.mstcecommerce.com/eprochome/',        desc: 'Metal Scrap Trade Corp e-Proc', category: 'Central Procurement' },
  { name: 'ONGC Tenders',        url: 'https://etender.ongc.co.in',                     desc: 'Oil & Natural Gas Corporation', category: 'PSU' },
  { name: 'NTPC Tenders',        url: 'https://www.ntpctender.com',                     desc: 'National Thermal Power Corp', category: 'PSU' },
  { name: 'BHEL Tenders',        url: 'https://bhel.com/procurement-tenders',           desc: 'Bharat Heavy Electricals Ltd', category: 'PSU' },
  { name: 'Coal India Tenders',  url: 'https://coalindiatenders.nic.in',               desc: 'Coal India Ltd', category: 'PSU' },
  { name: 'BPCL Tenders',        url: 'https://www.bpcleproc.in',                       desc: 'Bharat Petroleum Corp Ltd', category: 'PSU' },
  { name: 'AAI Tenders',         url: 'https://www.aai.aero/en/tenders',               desc: 'Airports Authority of India', category: 'PSU' },
  { name: 'GAIL Tenders',        url: 'https://etender.gail.co.in',                     desc: 'Gas Authority of India', category: 'PSU' },
  { name: 'BSNL Tenders',        url: 'https://www.bsnl.co.in/opencms/bsnl/BSNL/about_us/company/tenders/', desc: 'BSNL procurement', category: 'PSU' },
  { name: 'TenderWizard',        url: 'https://www.tenderwizard.com/INDIA',             desc: 'Private tender aggregator', category: 'Aggregators' },
  { name: 'Tender Tiger',        url: 'https://www.tendertiger.com',                    desc: 'India\'s largest tender search', category: 'Aggregators' },
]

const STATE_TENDERS = [
  { state: 'Andhra Pradesh',    name: 'AP eProcurement',  url: 'https://tender.apeprocurement.gov.in', desc: 'AP state tender portal' },
  { state: 'Arunachal Pradesh', name: 'Arunachal Tenders',url: 'https://arunachaltenders.gov.in',      desc: 'AR state tender portal' },
  { state: 'Assam',             name: 'Assam Tenders',    url: 'https://assamtenders.gov.in',          desc: 'Assam state tender portal' },
  { state: 'Bihar',             name: 'Bihar eProcure',   url: 'https://eproc.bihar.gov.in',           desc: 'Bihar e-Procurement system' },
  { state: 'Chhattisgarh',      name: 'CG eProcure',      url: 'https://eproc.cgstate.gov.in',         desc: 'CG state tender portal' },
  { state: 'Delhi',             name: 'Delhi Procurement',url: 'https://govtprocurement.delhi.gov.in', desc: 'Delhi Govt procurement' },
  { state: 'Goa',               name: 'Goa Tenders',      url: 'https://goatenders.gov.in',            desc: 'Goa state tender portal' },
  { state: 'Gujarat',           name: 'Gujarat Tenders',  url: 'https://tender.gujarat.gov.in',        desc: 'Gujarat state tender portal' },
  { state: 'Haryana',           name: 'Haryana eTenders', url: 'https://etenders.hry.nic.in',          desc: 'Haryana e-Tender portal' },
  { state: 'Himachal Pradesh',  name: 'HP Tenders',       url: 'https://hptenders.gov.in',             desc: 'HP state tender portal' },
  { state: 'Jammu & Kashmir',   name: 'J&K Tenders',      url: 'https://jktenders.gov.in',             desc: 'J&K tender portal' },
  { state: 'Jharkhand',         name: 'Jharkhand Tenders',url: 'https://jharkhandtenders.gov.in',      desc: 'Jharkhand state tenders' },
  { state: 'Karnataka',         name: 'Karnataka eProcure',url:'https://eproc.karnataka.gov.in',       desc: 'Karnataka e-Procurement' },
  { state: 'Kerala',            name: 'Kerala eTenders',  url: 'https://etenders.kerala.gov.in',       desc: 'Kerala e-Tender portal' },
  { state: 'Madhya Pradesh',    name: 'MP Tenders',       url: 'https://mptenders.gov.in',             desc: 'MP state tender portal' },
  { state: 'Maharashtra',       name: 'Mahatenders',      url: 'https://mahatenders.gov.in',           desc: 'Maharashtra NIC tender portal' },
  { state: 'Manipur',           name: 'Manipur Tenders',  url: 'https://manipurtenders.gov.in',        desc: 'Manipur state tenders' },
  { state: 'Meghalaya',         name: 'Meghalaya Tenders',url: 'https://meghalayatenders.gov.in',      desc: 'Meghalaya state tenders' },
  { state: 'Mizoram',           name: 'Mizoram Tenders',  url: 'https://mizoramtenders.gov.in',        desc: 'Mizoram state tenders' },
  { state: 'Nagaland',          name: 'Nagaland Tenders', url: 'https://nagalandtenders.gov.in',       desc: 'Nagaland state tenders' },
  { state: 'Odisha',            name: 'Odisha Tenders',   url: 'https://tendersodisha.gov.in',         desc: 'Odisha e-Procurement portal' },
  { state: 'Punjab',            name: 'Punjab eProcure',  url: 'https://eproc.punjab.gov.in',          desc: 'Punjab e-Procurement' },
  { state: 'Rajasthan',         name: 'Rajasthan SPPP',   url: 'https://sppp.rajasthan.gov.in',        desc: 'Rajasthan procurement portal' },
  { state: 'Sikkim',            name: 'Sikkim Tenders',   url: 'https://sikkimtender.gov.in',          desc: 'Sikkim state tenders' },
  { state: 'Tamil Nadu',        name: 'TN Procurement',   url: 'https://www.tnprocurement.tn.gov.in',  desc: 'TN e-Procurement system' },
  { state: 'Telangana',         name: 'TS Tenders',       url: 'https://tender.telangana.gov.in',      desc: 'Telangana state tenders' },
  { state: 'Tripura',           name: 'Tripura Tenders',  url: 'https://tripuratenders.gov.in',        desc: 'Tripura state tenders' },
  { state: 'Uttar Pradesh',     name: 'UP eTender',       url: 'https://etender.up.nic.in',            desc: 'UP e-Tender portal' },
  { state: 'Uttarakhand',       name: 'UK Tenders',       url: 'https://uktenders.gov.in',             desc: 'Uttarakhand tender portal' },
  { state: 'West Bengal',       name: 'WB Tenders',       url: 'https://wbtenders.gov.in',             desc: 'West Bengal tender portal' },
]

const CATEGORY_COLORS = {
  'Central Procurement': 'bg-blue-50 text-blue-700',
  'Railways':            'bg-orange-50 text-orange-700',
  'Defence':             'bg-red-50 text-red-700',
  'PSU':                 'bg-violet-50 text-violet-700',
  'Aggregators':         'bg-green-50 text-green-700',
}

const CENTRAL_CATEGORIES = ['Central Procurement', 'Railways', 'Defence', 'PSU', 'Aggregators']

const TOTAL_COUNT = CENTRAL_PORTALS.length + STATE_TENDERS.length

function LinkCard({ name, url, desc, badge, badgeClass }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start justify-between gap-2 p-3.5 bg-white border rounded-lg hover:shadow-md hover:border-primary/30 transition-all group"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{name}</p>
          {badge && <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${badgeClass}`}>{badge}</span>}
        </div>
        <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
      </div>
      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
    </a>
  )
}

export default function Tenders() {
  const [section, setSection] = useState('all')
  const [filter, setFilter]   = useState('all')

  const filteredCentral = filter === 'all'
    ? CENTRAL_PORTALS
    : CENTRAL_PORTALS.filter(p => p.category === filter)

  function handleAllSections() {
    setSection('all')
    setFilter('all')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCentralParent() {
    setSection('central')
    setFilter('all')
  }

  function handleCentralSub(cat) {
    setSection('central')
    setFilter(cat)
  }

  function handleState() {
    setSection('state')
    setFilter('all')
  }

  const showCentral = section === 'all' || section === 'central'
  const showState   = section === 'all' || section === 'state'

  // Sidebar item base classes
  const sidebarItemBase = 'w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between gap-1'
  const sidebarInactive = 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
  const sidebarActivePrimary = 'bg-primary/10 text-primary'
  const sidebarActiveBlue    = 'bg-blue-50 text-blue-700'
  const sidebarActiveOrange  = 'bg-orange-50 text-orange-700'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Government Tenders</h1>
        <p className="text-muted-foreground text-sm">
          Official procurement portals for central government bodies and all state tender systems.
          Click any card to go directly to the official portal and submit your bid.
        </p>
      </div>

      {/* Mobile horizontal pill strip — hidden on md+ */}
      <div className="md:hidden mb-5 -mx-4 px-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { label: 'All',                  action: handleAllSections,                        active: section === 'all' },
            { label: 'Central & PSU',        action: handleCentralParent,                      active: section === 'central' && filter === 'all' },
            { label: 'Central Procurement',  action: () => handleCentralSub('Central Procurement'), active: section === 'central' && filter === 'Central Procurement' },
            { label: 'Railways',             action: () => handleCentralSub('Railways'),       active: section === 'central' && filter === 'Railways' },
            { label: 'Defence',              action: () => handleCentralSub('Defence'),        active: section === 'central' && filter === 'Defence' },
            { label: 'PSU',                  action: () => handleCentralSub('PSU'),            active: section === 'central' && filter === 'PSU' },
            { label: 'Aggregators',          action: () => handleCentralSub('Aggregators'),    active: section === 'central' && filter === 'Aggregators' },
            { label: 'State Tenders',        action: handleState,                              active: section === 'state' },
          ].map(pill => (
            <button
              key={pill.label}
              onClick={pill.action}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors whitespace-nowrap
                ${pill.active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-white border-border text-muted-foreground hover:border-foreground/30'}`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body: sidebar + main content */}
      <div className="flex gap-6 items-start">

        {/* ── Left sidebar (desktop only) ── */}
        <aside className="hidden md:block w-52 shrink-0 sticky top-4">
          <div className="border rounded-lg bg-white overflow-hidden">
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b bg-muted/30">
              Categories
            </p>

            <div className="p-1.5 space-y-0.5">

              {/* All Sections */}
              <button
                onClick={handleAllSections}
                className={`${sidebarItemBase} ${section === 'all' ? sidebarActivePrimary : sidebarInactive}`}
              >
                <span>All Sections</span>
                <span className="shrink-0 tabular-nums opacity-60">{TOTAL_COUNT}</span>
              </button>

              <div className="border-t my-1" />

              {/* Central & PSU parent */}
              <button
                onClick={handleCentralParent}
                className={`${sidebarItemBase} ${section === 'central' ? sidebarActiveBlue : sidebarInactive}`}
              >
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3 shrink-0" />
                  Central &amp; PSU
                </span>
                <span className="shrink-0 tabular-nums opacity-60">{CENTRAL_PORTALS.length}</span>
              </button>

              {/* All Central sub-item */}
              <button
                onClick={handleCentralParent}
                className={`${sidebarItemBase} pl-5 ${section === 'central' && filter === 'all' ? sidebarActiveBlue : sidebarInactive}`}
              >
                <span className="flex items-center gap-0.5">
                  <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
                  All Central
                </span>
                <span className="shrink-0 tabular-nums opacity-60">{CENTRAL_PORTALS.length}</span>
              </button>

              {/* Per-category sub-items */}
              {CENTRAL_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => handleCentralSub(cat)}
                  className={`${sidebarItemBase} pl-5 ${section === 'central' && filter === cat ? sidebarActiveBlue : sidebarInactive}`}
                >
                  <span className="flex items-center gap-0.5 truncate">
                    <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
                    <span className="truncate">{cat}</span>
                  </span>
                  <span className="shrink-0 tabular-nums opacity-60">
                    {CENTRAL_PORTALS.filter(p => p.category === cat).length}
                  </span>
                </button>
              ))}

              <div className="border-t my-1" />

              {/* State Tenders */}
              <button
                onClick={handleState}
                className={`${sidebarItemBase} ${section === 'state' ? sidebarActiveOrange : sidebarInactive}`}
              >
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  State Tenders
                </span>
                <span className="shrink-0 tabular-nums opacity-60">{STATE_TENDERS.length}</span>
              </button>

            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="min-w-0 flex-1 space-y-12">

          {/* Central portals section */}
          {showCentral && (
            <div>
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">
                <Building2 className="h-4 w-4 text-blue-500" />
                <h2 className="text-sm font-bold text-blue-700">Central &amp; PSU Procurement Portals</h2>
                <span className="ml-auto text-xs font-medium text-blue-700 opacity-70">{filteredCentral.length} portals</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {filteredCentral.map(p => (
                  <LinkCard
                    key={p.name}
                    name={p.name}
                    url={p.url}
                    desc={p.desc}
                    badge={p.category}
                    badgeClass={CATEGORY_COLORS[p.category]}
                  />
                ))}
              </div>
            </div>
          )}

          {/* State portals section */}
          {showState && (
            <div>
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-orange-50 border border-orange-100">
                <MapPin className="h-4 w-4 text-orange-500" />
                <h2 className="text-sm font-bold text-orange-700">State Tender Portals</h2>
                <span className="ml-auto text-xs font-medium text-orange-700 opacity-70">{STATE_TENDERS.length} states / UTs</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {STATE_TENDERS.map(s => (
                  <LinkCard
                    key={s.state}
                    name={s.name}
                    url={s.url}
                    desc={s.desc}
                    badge={s.state}
                    badgeClass="bg-orange-50 text-orange-700"
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      <p className="mt-10 text-xs text-muted-foreground text-center border-t pt-6">
        Linksdoor links directly to official government procurement portals. We are not affiliated with any government body.
        Always verify tender details on the official portal before bidding.
      </p>
    </div>
  )
}
