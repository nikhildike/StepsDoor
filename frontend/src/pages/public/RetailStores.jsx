/**
 * RetailStores.jsx
 *
 * Public directory page mounted at `/retail-stores` (see App.jsx). Two content
 * layers stacked together: (1) a static, hand-curated directory of well-known
 * Indian offline retail chains grouped by category (RETAIL_GROUPS below) —
 * plain outbound links, no backend involved; and (2) "featured" stores that
 * are actual StepsDoor storefront subscribers (fetched live via
 * storeService.listRetail()), rendered with a click-tracking redirect and an
 * optional affiliate-network badge. Supports category filtering (sidebar on
 * desktop, pill strip on mobile) and a search that spans both layers.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { ExternalLink, Store, ShoppingCart, Shirt, Smartphone, Gem, Pill, BookOpen, Dumbbell, Sofa, Sparkles, Footprints, Utensils, Car, PackageSearch, MapPin, BadgeCheck, Link as LinkIcon, Search, Tag, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { storeService } from '@/services/storeService'

// Static directory data: one entry per category, each holding its icon, accent
// color, and the list of chains shown as plain outbound link cards. This is
// hand-maintained content, not fetched from the backend.
const RETAIL_GROUPS = [
  {
    id: 'supermarkets',
    label: 'Supermarkets & Grocery',
    icon: ShoppingCart,
    color: 'green',
    stores: [
      { name: 'DMart',            url: 'https://www.dmart.in',            desc: 'Avenue Supermarts — value grocery chain',        tag: 'PAN India' },
      { name: 'Reliance Fresh',   url: 'https://www.reliancefresh.com',   desc: 'Reliance Retail neighbourhood grocery',           tag: 'PAN India' },
      { name: 'Big Bazaar',       url: 'https://www.bigbazaar.com',       desc: 'Future Group hypermarket chain',                  tag: 'PAN India' },
      { name: "Spencer's Retail", url: 'https://www.spencers.in',         desc: 'Supermarket & hypermarket chain',                 tag: 'PAN India' },
      { name: 'More Retail',      url: 'https://www.more.in',             desc: 'Aditya Birla grocery supermarket',                tag: 'PAN India' },
      { name: 'Nature\'s Basket', url: 'https://www.naturesbasket.co.in', desc: 'Godrej premium gourmet grocery stores' },
      { name: 'Spar Hypermarket', url: 'https://www.sparindia.com',       desc: 'International hypermarket chain in India' },
      { name: 'Star Bazaar',      url: 'https://www.starbazaar.com',      desc: 'Tata-Tesco hypermarket chain' },
      { name: 'Metro Cash & Carry',url: 'https://www.metro.co.in',        desc: 'B2B wholesale cash & carry stores',              tag: 'B2B' },
    ],
  },
  {
    id: 'department',
    label: 'Department & Apparel',
    icon: Shirt,
    color: 'pink',
    stores: [
      { name: 'Shoppers Stop',    url: 'https://www.shoppersstop.com',    desc: 'Premium department store chain' },
      { name: 'Lifestyle Stores', url: 'https://www.lifestylestores.com', desc: 'Landmark Group lifestyle department stores' },
      { name: 'Westside',         url: 'https://www.westside.com',        desc: 'Trent fashion retail chain' },
      { name: 'Pantaloons',       url: 'https://www.pantaloons.com',      desc: 'ABFRL fashion department stores' },
      { name: 'Reliance Trends',  url: 'https://www.relianceretail.com',  desc: 'Reliance value fashion stores' },
      { name: 'Zudio',            url: 'https://www.zudio.com',           desc: 'Trent affordable fashion chain' },
      { name: 'Max Fashion',      url: 'https://www.maxfashion.in',       desc: 'Value family fashion stores' },
      { name: 'Central',          url: 'https://www.centraloffashion.com',desc: 'Future Group mall-format fashion' },
      { name: 'FBB',              url: 'https://www.fbb.in',              desc: 'Fashion at Big Bazaar stores' },
      { name: 'Fabindia',         url: 'https://www.fabindia.com',        desc: 'Indian handcraft & ethnic clothing' },
      { name: 'Global Desi',      url: 'https://www.global-desi.in',      desc: 'Ethnic & fusion Indo-western wear' },
      { name: 'AND',              url: 'https://www.andindia.com',        desc: 'Contemporary western wear for women' },
    ],
  },
  {
    id: 'electronics',
    label: 'Electronics & Appliances',
    icon: Smartphone,
    color: 'blue',
    stores: [
      { name: 'Croma',            url: 'https://www.croma.com',           desc: 'Tata electronics retail chain' },
      { name: 'Reliance Digital', url: 'https://www.reliancedigital.in',  desc: 'Reliance consumer electronics stores' },
      { name: 'Vijay Sales',      url: 'https://www.vijaysales.com',      desc: 'Consumer electronics chain (West India)' },
      { name: 'Poorvika Mobiles', url: 'https://www.poorvika.com',        desc: 'Mobile & electronics chain (South India)' },
      { name: 'Sangeetha Mobiles',url: 'https://www.sangeethastores.com', desc: 'Mobile stores (South India)' },
      { name: 'LOT Mobiles',      url: 'https://www.lotmobiles.com',      desc: 'Mobile & accessories chain (South India)' },
      { name: 'Next Retail',      url: 'https://www.nextretail.in',       desc: 'Videocon consumer electronics chain' },
      { name: 'Apple Authorised', url: 'https://locate.apple.com/in',     desc: 'Apple Premium Resellers across India',           tag: 'Reseller' },
    ],
  },
  {
    id: 'jewellery',
    label: 'Jewellery',
    icon: Gem,
    color: 'yellow',
    stores: [
      { name: 'Tanishq',          url: 'https://www.tanishq.co.in',       desc: 'Tata premium jewellery retail chain' },
      { name: 'Kalyan Jewellers', url: 'https://www.kalyanjewellers.net', desc: 'Pan-India jewellery chain' },
      { name: 'Malabar Gold & Diamonds', url: 'https://www.malabargoldanddiamonds.com', desc: 'One of India\'s largest jewellery groups' },
      { name: 'PC Jeweller',      url: 'https://www.pcjeweller.com',      desc: 'PAN India jewellery retail chain' },
      { name: 'Joyalukkas',       url: 'https://www.joyalukkas.com',      desc: 'South India heritage jewellery chain' },
      { name: 'Senco Gold',       url: 'https://www.sencogoldanddiamonds.com', desc: 'East India prominent jewellery chain' },
      { name: 'TBZ — The Original', url: 'https://www.tbztheoriginal.com',desc: 'Tribhovandas Bhimji Zaveri jewellery' },
      { name: 'GRT Jewellers',    url: 'https://www.grtjewels.com',       desc: 'South India jewellery chain' },
      { name: 'PNG Jewellers',    url: 'https://www.pngjewellers.com',    desc: 'Maharashtra heritage jewellery brand' },
      { name: 'Mia by Tanishq',   url: 'https://www.mia.tanishq.co.in',  desc: 'Tata work-wear jewellery sub-brand' },
    ],
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy & Health',
    icon: Pill,
    color: 'red',
    stores: [
      { name: 'Apollo Pharmacy',  url: 'https://www.apollopharmacy.in',   desc: 'India\'s largest pharmacy chain' },
      { name: 'MedPlus',          url: 'https://www.medplusmart.com',      desc: 'Leading pharmacy chain (South India)' },
      { name: 'Wellness Forever', url: 'https://www.wellnessforever.com',  desc: 'Maharashtra pharmacy & wellness chain' },
      { name: 'Netmeds Store',    url: 'https://www.netmeds.com',          desc: 'Reliance offline pharmacy chain' },
      { name: '1mg Health Stores',url: 'https://www.1mg.com',             desc: 'Tata 1mg pharmacy & diagnostics' },
      { name: 'Fortis Healthworld',url:'https://www.fortishealthworld.com',desc: 'Fortis hospital pharmacy network' },
      { name: 'Noble Plus',       url: 'https://www.nobleplus.com',        desc: 'Pharmacy chain (Maharashtra)' },
    ],
  },
  {
    id: 'beauty',
    label: 'Beauty & Personal Care',
    icon: Sparkles,
    color: 'purple',
    stores: [
      { name: 'Nykaa Stores',     url: 'https://www.nykaa.com/store-locator', desc: 'Nykaa offline beauty retail stores' },
      { name: 'Forest Essentials', url: 'https://www.forestessentialsindia.com', desc: 'Luxury Ayurvedic beauty brand stores' },
      { name: 'Kama Ayurveda',    url: 'https://www.kamaayurveda.com',     desc: 'Ayurvedic luxury skincare stores' },
      { name: 'The Body Shop',    url: 'https://www.thebodyshop.in',       desc: 'International ethical beauty chain' },
      { name: 'MAC Cosmetics',    url: 'https://www.maccosmetics.in',      desc: 'Professional makeup & cosmetics stores' },
      { name: 'L\'Occitane',      url: 'https://www.loccitane.com/en-in',  desc: 'French premium skincare boutiques' },
      { name: 'Innisfree',        url: 'https://www.innisfree.in',         desc: 'Korean natural beauty brand stores' },
      { name: 'Colorbar',         url: 'https://www.colorbar.in',          desc: 'India\'s homegrown colour cosmetics chain' },
      { name: 'SUGAR Cosmetics',  url: 'https://www.sugarcosmetics.com',   desc: 'D2C beauty brand with retail outlets' },
      { name: 'Lakme Salon',      url: 'https://www.lakmesalon.in',        desc: 'Premium beauty salon chain (HUL)' },
    ],
  },
  {
    id: 'footwear',
    label: 'Footwear',
    icon: Footprints,
    color: 'orange',
    stores: [
      { name: 'Bata India',       url: 'https://www.bata.in',             desc: 'India\'s largest footwear retail chain' },
      { name: 'Liberty Shoes',    url: 'https://www.libertyshoes.com',     desc: 'India heritage footwear brand' },
      { name: 'Metro Shoes',      url: 'https://www.metroshoes.net',       desc: 'Premium footwear chain (West India)' },
      { name: 'Khadim\'s',        url: 'https://www.khadims.com',          desc: 'Value footwear chain (East India)' },
      { name: 'Woodland',         url: 'https://www.woodland.co.in',       desc: 'Outdoor & casual footwear brand stores' },
      { name: 'Mochi',            url: 'https://www.mochishoes.com',       desc: 'Trend-focused footwear & accessories' },
      { name: 'Regal Shoes',      url: 'https://www.regalshoes.in',        desc: 'Classic formal footwear chain' },
      { name: 'Nike Factory',     url: 'https://www.nike.com/in',          desc: 'Nike brand & factory stores in India' },
      { name: 'Adidas Originals', url: 'https://www.adidas.co.in',         desc: 'Adidas brand stores & Originals outlets' },
      { name: 'Puma',             url: 'https://in.puma.com',              desc: 'Puma sport & lifestyle stores' },
    ],
  },
  {
    id: 'sports',
    label: 'Sports & Fitness',
    icon: Dumbbell,
    color: 'indigo',
    stores: [
      { name: 'Decathlon',        url: 'https://www.decathlon.in',         desc: 'World\'s largest sporting goods chain' },
      { name: 'Sportskeeda Store',url: 'https://store.sportskeeda.com',    desc: 'Sports merchandise & fan gear' },
      { name: 'Nike India',       url: 'https://www.nike.com/in',          desc: 'Nike performance & lifestyle stores' },
      { name: 'Adidas India',     url: 'https://www.adidas.co.in',         desc: 'Adidas performance & originals stores' },
      { name: 'Columbia',         url: 'https://www.columbiasportswear.in',desc: 'Outdoor & sportswear brand stores' },
      { name: 'Speedo',           url: 'https://www.speedo.in',            desc: 'Swimwear & aquatics brand stores' },
    ],
  },
  {
    id: 'home',
    label: 'Home & Furniture',
    icon: Sofa,
    color: 'amber',
    stores: [
      { name: 'IKEA India',       url: 'https://www.ikea.com/in',          desc: 'Swedish furniture & home furnishings' },
      { name: 'HomeTown',         url: 'https://www.hometown.in',           desc: 'Future Group home furniture chain' },
      { name: '@Home',            url: 'https://www.athome.in',             desc: 'Nilkamal premium home furniture' },
      { name: 'Pepperfry Studio', url: 'https://www.pepperfry.com/studios',desc: 'Online furniture brand offline studios' },
      { name: 'Urban Ladder Store',url:'https://www.urbanladder.com/stores',desc: 'Reliance premium furniture studios' },
      { name: 'Godrej Interio',   url: 'https://www.godrejinterio.com',    desc: 'Godrej furniture & interior solutions' },
      { name: 'Nilkamal',         url: 'https://www.nilkamal.com',          desc: 'India\'s leading furniture brand' },
      { name: 'Durian',           url: 'https://www.durian.in',             desc: 'Premium furniture chain (West India)' },
    ],
  },
  {
    id: 'books',
    label: 'Books & Stationery',
    icon: BookOpen,
    color: 'teal',
    stores: [
      { name: 'Crossword',        url: 'https://www.crossword.in',          desc: 'India\'s largest book retail chain' },
      { name: 'Higginbothams',    url: 'https://www.higginbothams.com',     desc: 'India\'s oldest bookstore chain (since 1844)' },
      { name: 'Landmark',         url: 'https://www.landmarkshopsonline.com',desc: 'Books, toys & music (Lifestyle Group)' },
      { name: 'Oxford Bookstore', url: 'https://www.oxfordbookstore.com',   desc: 'Premium book & stationery stores' },
      { name: 'William Penn',     url: 'https://www.williampenn.in',        desc: 'Premium stationery & pen stores' },
      { name: 'Archies',          url: 'https://www.archiesonline.com',     desc: 'Gifts, stationery & greeting cards' },
    ],
  },
  {
    id: 'food',
    label: 'Food & QSR Chains',
    icon: Utensils,
    color: 'rose',
    stores: [
      { name: 'Haldiram\'s',      url: 'https://www.haldirams.com',         desc: 'India\'s iconic snacks & sweets chain' },
      { name: 'Bikanervala',      url: 'https://www.bikanervala.com',       desc: 'Sweets, snacks & restaurant chain' },
      { name: 'MTR Foods',        url: 'https://www.mtrfoods.com',          desc: 'South India food products & restaurants' },
      { name: 'Monginis',         url: 'https://www.monginis.net',           desc: 'Cakes & confectionery chain (West India)' },
      { name: 'Amul Parlour',     url: 'https://www.amul.com',              desc: 'Amul dairy & ice cream outlets' },
      { name: 'Mother Dairy',     url: 'https://www.motherdairy.com',       desc: 'Dairy & fruit-veg booths (North India)' },
      { name: 'Café Coffee Day',  url: 'https://www.cafecoffeeday.com',     desc: 'India\'s original coffee café chain' },
      { name: 'Barista Coffee',   url: 'https://www.barista.co.in',         desc: 'Premium coffee café chain' },
    ],
  },
  {
    id: 'auto',
    label: 'Auto & Accessories',
    icon: Car,
    color: 'slate',
    stores: [
      { name: 'Reliance AutoZone', url: 'https://www.relianceautozone.com', desc: 'Auto parts & accessories stores' },
      { name: 'Midas Touch',      url: 'https://www.midastouch.in',         desc: 'Car accessories & care chain' },
      { name: 'Bosch Car Service',url: 'https://www.boschcarservice.com',   desc: 'Authorised Bosch service & accessories' },
      { name: 'Castrol Service',  url: 'https://www.castrol.com/en_in',     desc: 'Castrol oil & service centres' },
      { name: 'Mahindra First Choice', url: 'https://www.mahindrafirstchoice.com', desc: 'Multi-brand used car & service stores' },
    ],
  },
]

// Per-category Tailwind class bundle (background/text/icon/border/badge/active
// variants) keyed by the `color` name each RETAIL_GROUPS entry declares.
const COLOR_MAP = {
  green:  { bg: 'bg-green-50',  text: 'text-green-700',  icon: 'text-green-500',  border: 'border-green-100',  badge: 'bg-green-100 text-green-700',   activeBg: 'bg-green-50',  activeText: 'text-green-700'  },
  pink:   { bg: 'bg-pink-50',   text: 'text-pink-700',   icon: 'text-pink-500',   border: 'border-pink-100',   badge: 'bg-pink-100 text-pink-700',     activeBg: 'bg-pink-50',   activeText: 'text-pink-700'   },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: 'text-blue-500',   border: 'border-blue-100',   badge: 'bg-blue-100 text-blue-700',     activeBg: 'bg-blue-50',   activeText: 'text-blue-700'   },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'text-yellow-500', border: 'border-yellow-100', badge: 'bg-yellow-100 text-yellow-700', activeBg: 'bg-yellow-50', activeText: 'text-yellow-700' },
  red:    { bg: 'bg-red-50',    text: 'text-red-700',    icon: 'text-red-500',    border: 'border-red-100',    badge: 'bg-red-100 text-red-700',       activeBg: 'bg-red-50',    activeText: 'text-red-700'    },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-500', border: 'border-purple-100', badge: 'bg-purple-100 text-purple-700', activeBg: 'bg-purple-50', activeText: 'text-purple-700' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-500', border: 'border-orange-100', badge: 'bg-orange-100 text-orange-700', activeBg: 'bg-orange-50', activeText: 'text-orange-700' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: 'text-indigo-500', border: 'border-indigo-100', badge: 'bg-indigo-100 text-indigo-700', activeBg: 'bg-indigo-50', activeText: 'text-indigo-700' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  icon: 'text-amber-500',  border: 'border-amber-100',  badge: 'bg-amber-100 text-amber-700',   activeBg: 'bg-amber-50',  activeText: 'text-amber-700'  },
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-700',   icon: 'text-teal-500',   border: 'border-teal-100',   badge: 'bg-teal-100 text-teal-700',     activeBg: 'bg-teal-50',   activeText: 'text-teal-700'   },
  rose:   { bg: 'bg-rose-50',   text: 'text-rose-700',   icon: 'text-rose-500',   border: 'border-rose-100',   badge: 'bg-rose-100 text-rose-700',     activeBg: 'bg-rose-50',   activeText: 'text-rose-700'   },
  slate:  { bg: 'bg-slate-50',  text: 'text-slate-700',  icon: 'text-slate-500',  border: 'border-slate-100',  badge: 'bg-slate-100 text-slate-700',   activeBg: 'bg-slate-50',  activeText: 'text-slate-700'  },
}

const totalStores = RETAIL_GROUPS.reduce((s, g) => s + g.stores.length, 0)

// Every store, flattened with its group's colour attached — used for search
export const ALL_RETAIL_STORES = RETAIL_GROUPS.flatMap(g => g.stores.map(s => ({ ...s, groupLabel: g.label, groupColor: g.color })))

/**
 * One static-directory retail chain: a plain outbound link card with name,
 * optional tag badge (e.g. "PAN India", "B2B"), and description.
 * @param {{ store: object, color: string }} props - store entry from RETAIL_GROUPS and its group's color key
 */
function RetailCard({ store, color }) {
  const c = COLOR_MAP[color]
  return (
    <a
      href={store.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start justify-between gap-2 p-3.5 bg-white border rounded-lg hover:shadow-md hover:border-primary/30 transition-all group"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{store.name}</p>
          {store.tag && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${c.badge}`}>{store.tag}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-snug">{store.desc}</p>
      </div>
      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
    </a>
  )
}

/**
 * One category section: a colour-coded header (icon, label, chain count)
 * followed by a grid of RetailCard entries for that group's stores.
 * @param {{ group: object }} props - one entry from RETAIL_GROUPS
 */
function RetailGroup({ group }) {
  const c = COLOR_MAP[group.color]
  const Icon = group.icon
  return (
    <div id={group.id}>
      <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg ${c.bg} ${c.border} border`}>
        <Icon className={`h-4 w-4 ${c.icon}`} />
        <h2 className={`text-sm font-bold ${c.text}`}>{group.label}</h2>
        <span className={`ml-auto text-xs font-medium ${c.text} opacity-70`}>{group.stores.length} chains</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {group.stores.map(s => (
          <RetailCard key={s.name} store={s} color={group.color} />
        ))}
      </div>
    </div>
  )
}

/**
 * A StepsDoor storefront-subscriber card (as opposed to a static directory
 * entry) — shows the store's logo/name/tagline, optional "Find Store" locator
 * link, and any `shopping_links` set by the store owner as clickable chips.
 * Visiting the website goes through a click-tracking redirect.
 * @param {{ store: object }} props - a subscribed store record from storeService.listRetail()
 */
function SubscribedRetailCard({ store }) {
  // Logs the click via storeService before opening the store's site, so click-through
  // analytics stay accurate even though we open the link ourselves (not a plain <a href>).
  // Falls back to the raw website_url if the click-tracking call fails, so the click
  // isn't lost to the user just because analytics logging errored.
  const handleVisitClick = useCallback(async (e) => {
    e.preventDefault()
    try {
      const { data } = await storeService.click(store.id)
      window.open(data.redirect_url || store.website_url, '_blank', 'noopener,noreferrer')
    } catch {
      window.open(store.website_url, '_blank', 'noopener,noreferrer')
    }
  }, [store.id, store.website_url])

  // Parse newline-separated shopping_links into a clean URL array
  const shoppingLinks = store.shopping_links
    ? store.shopping_links.split('\n').map(l => l.trim()).filter(Boolean)
    : []

  return (
    <div className="bg-white border border-border rounded-xl hover:shadow-sm transition-shadow overflow-hidden">
      {/* Main store row */}
      <div className="flex items-center gap-3 p-3">
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
              <MapPin className="h-3 w-3" /> Find Store
            </a>
          )}
          <a href={store.website_url} onClick={handleVisitClick}
            className="p-1.5 rounded-md text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Shopping link chips — direct product/category links set by the store owner */}
      {shoppingLinks.length > 0 && (
        <div className="px-3 pb-3 flex flex-wrap gap-1.5">
          {shoppingLinks.map((url, i) => {
            // Show just the hostname as the chip label (e.g. "www.tanishq.co.in" → "tanishq.co.in")
            let label = url
            try { label = new URL(url).hostname.replace(/^www\./, '') } catch { /* keep raw url */ }
            return (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/8 text-primary text-[11px] font-medium hover:bg-primary/15 transition-colors border border-primary/20"
              >
                <LinkIcon className="h-2.5 w-2.5 shrink-0" />
                {label}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * Modal overlay that lists all Special Offer links from subscribed retail
 * stores. Closes on backdrop click, Escape key, or the X button.
 * @param {{ entries: Array, onClose: function }} props
 */
function SpecialOffersModal({ entries, onClose }) {
  const overlayRef = useRef(null)

  // Close on Escape key
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    /* Full-screen backdrop */
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">

        {/* Modal header */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b">
          <Tag className="h-4 w-4 text-orange-500 shrink-0" />
          <h2 className="text-sm font-bold text-foreground flex-1">Special Offers</h2>
          <span className="text-xs text-muted-foreground mr-2">
            {entries.length} deal{entries.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable offer list */}
        <div className="overflow-y-auto p-5">
          <div className="grid sm:grid-cols-2 gap-3">
            {entries.map(({ url, storeName, storeLogo, storeId }, idx) => {
              // Extract a readable hostname label (e.g. "www.amazon.in" → "amazon.in")
              let hostLabel = url
              try { hostLabel = new URL(url).hostname.replace(/^www\./, '') } catch { /* keep raw url */ }
              return (
                <a
                  key={`${storeId}-${idx}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 hover:border-orange-300 hover:shadow-sm transition-all group"
                >
                  {storeLogo ? (
                    <img src={storeLogo} alt={storeName} className="h-8 w-8 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-orange-200 flex items-center justify-center shrink-0">
                      <Tag className="h-4 w-4 text-orange-600" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-orange-900 truncate leading-tight">{storeName}</p>
                    <p className="text-[11px] text-orange-600 truncate leading-tight">{hostLabel}</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-orange-400 group-hover:text-orange-600 shrink-0 transition-colors" />
                </a>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Renders the retail-store directory page: featured StepsDoor-subscribed
 * stores at the top (if any), then the static category directory with a
 * sidebar (desktop) / pill strip (mobile) filter and cross-cutting search.
 */
export default function RetailStores() {
  const [activeCategory, setActiveCategory] = useState('all') // which static-directory category is shown ('all' or a RETAIL_GROUPS id)
  const [subscribedStores, setSubscribedStores] = useState([]) // live StepsDoor storefront subscribers fetched below
  const [search, setSearch] = useState('') // search box value — spans both subscribed and static-directory stores
  const [offersModalOpen, setOffersModalOpen] = useState(false) // controls the Special Offers modal

  // Fetch StepsDoor's actual retail-store subscribers once on mount; silently
  // ignore failures so the static directory below still renders regardless.
  useEffect(() => {
    storeService.listRetail().then(({ data }) => setSubscribedStores(data.results ?? data)).catch(() => {})
  }, [])

  // Parse every `offers_links` field (newline-separated URLs) from subscribed
  // retail stores into a flat array for the modal.
  const offerEntries = subscribedStores.flatMap(store => {
    if (!store.offers_links) return []
    return store.offers_links
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(url => ({ url, storeName: store.name, storeLogo: store.logo, storeId: store.id }))
  })

  const visibleGroups = activeCategory === 'all'
    ? RETAIL_GROUPS
    : RETAIL_GROUPS.filter(g => g.id === activeCategory)

  // Search spans every category, ignoring whichever one is currently selected
  const isSearching = search.trim().length > 0
  const q = search.toLowerCase()
  const searchedStores = ALL_RETAIL_STORES.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.desc.toLowerCase().includes(q) ||
    s.groupLabel.toLowerCase().includes(q)
  )

  // Sidebar/pill category click handler: switches the active category and either
  // scrolls to that category's section (by DOM id) or back to the top for "all"
  function handleCategoryClick(id) {
    setActiveCategory(id)
    if (id !== 'all') {
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Only subscribers with a website_url are worth showing as "featured" cards
  const featuredStores = subscribedStores.filter(s => s.website_url)
  const searchedFeatured = isSearching
    ? featuredStores.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.tagline && s.tagline.toLowerCase().includes(q))
      )
    : []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Retail Stores</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          {totalStores} offline retail chains across {RETAIL_GROUPS.length} categories — find stores, check websites & locate branches near you.
        </p>
        {/* Special Offers trigger — only shown when subscribed retail stores have offer links */}
        {offerEntries.length > 0 && (
          <button
            onClick={() => setOffersModalOpen(true)}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-xl text-sm font-semibold text-orange-700 hover:bg-orange-100 hover:border-orange-300 transition-colors"
          >
            <Tag className="h-4 w-4 text-orange-500" />
            Special Offers
            <span className="ml-0.5 text-xs font-normal text-orange-500">
              {offerEntries.length} deal{offerEntries.length !== 1 ? 's' : ''}
            </span>
          </button>
        )}
      </div>

      {/* Special Offers modal */}
      {offersModalOpen && (
        <SpecialOffersModal entries={offerEntries} onClose={() => setOffersModalOpen(false)} />
      )}

      {/* Search — spans every category, ignoring the current sidebar selection */}
      <div className="mb-6 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search stores or categories..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {/* While searching, show a flat cross-section of featured + directory results instead of the normal browse layout */}
      {isSearching ? (
        <div>
          <p className="text-xs text-muted-foreground mb-4">
            {searchedFeatured.length + searchedStores.length} result{(searchedFeatured.length + searchedStores.length) !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
          </p>
          {searchedFeatured.length === 0 && searchedStores.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">No stores match your search.</div>
          ) : (
            <div className="space-y-8">
              {searchedFeatured.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-primary mb-3 flex items-center gap-1.5">
                    <BadgeCheck className="h-4 w-4" /> Retail Stores on StepsDoor
                  </h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {searchedFeatured.map(store => (
                      <SubscribedRetailCard key={store.id} store={store} />
                    ))}
                  </div>
                </div>
              )}
              {searchedStores.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-foreground mb-3">Store Directory</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {searchedStores.map(s => (
                      <RetailCard key={s.name + s.groupLabel} store={s} color={s.groupColor} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
      <>

      {/* Featured: subscribed stores with website links (only rendered once the fetch above resolves) */}
      {featuredStores.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
            <BadgeCheck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-primary">Retail Stores on StepsDoor</h2>
            <span className="ml-auto text-xs font-medium text-primary opacity-70">{featuredStores.length} verified</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {featuredStores.map(store => (
              <SubscribedRetailCard key={store.id} store={store} />
            ))}
          </div>
          <div className="border-t mt-8" />
        </div>
      )}

      {/* Mobile: horizontal category strip */}
      <div className="flex md:hidden gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        <button
          onClick={() => handleCategoryClick('all')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            activeCategory === 'all'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-white border-border text-muted-foreground'
          }`}
        >
          All ({totalStores})
        </button>
        {/* One pill per category, highlighted when active — mirrors the desktop sidebar below */}
        {RETAIL_GROUPS.map(g => {
          const c = COLOR_MAP[g.color]
          const isActive = activeCategory === g.id
          return (
            <button
              key={g.id}
              onClick={() => handleCategoryClick(g.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                isActive ? `${c.activeBg} ${c.activeText} ${c.border}` : 'bg-white border-border text-muted-foreground'
              }`}
            >
              {g.label}
            </button>
          )
        })}
      </div>

      {/* Sidebar + main */}
      <div className="flex gap-6 items-start">

        {/* Sticky sidebar (desktop only) */}
        <aside className="hidden md:block w-52 shrink-0 sticky top-4">
          <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-3 py-2.5 border-b bg-gray-50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Categories</p>
            </div>
            <nav className="py-1">
              <button
                onClick={() => handleCategoryClick('all')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left ${
                  activeCategory === 'all'
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-gray-50 hover:text-foreground'
                }`}
              >
                <PackageSearch className="h-3.5 w-3.5 shrink-0" />
                All Categories
                <span className="ml-auto text-xs opacity-60">{totalStores}</span>
              </button>

              <div className="my-1 border-t" />

              {/* One nav item per category, each showing its icon, label, and store count */}
              {RETAIL_GROUPS.map(g => {
                const c = COLOR_MAP[g.color]
                const Icon = g.icon
                const isActive = activeCategory === g.id
                return (
                  <button
                    key={g.id}
                    onClick={() => handleCategoryClick(g.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left ${
                      isActive
                        ? `${c.activeBg} ${c.activeText} font-semibold`
                        : 'text-muted-foreground hover:bg-gray-50 hover:text-foreground'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? c.icon : ''}`} />
                    <span className="truncate">{g.label}</span>
                    <span className="ml-auto text-xs opacity-60 shrink-0">{g.stores.length}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* Main content — renders every category section (or just the selected one) */}
        <div className="flex-1 min-w-0 space-y-10">
          {visibleGroups.map(g => (
            <RetailGroup key={g.id} group={g} />
          ))}
        </div>
      </div>
      </>
      )}

      <div className="border-t pt-6 mt-10">
        <p className="text-xs text-muted-foreground text-center">
          StepsDoor links to official chain websites. Store availability varies by city. Use the store locator on each brand's website to find your nearest branch.
        </p>
      </div>
    </div>
  )
}
