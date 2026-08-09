import { useState, useEffect } from 'react'
import { ExternalLink, Store, ShoppingCart, Shirt, Smartphone, Gem, Pill, BookOpen, Dumbbell, Sofa, Sparkles, Footprints, Utensils, Car, PackageSearch, MapPin, BadgeCheck, Link as LinkIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { storeService } from '@/services/storeService'

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

function SubscribedRetailCard({ store }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-border rounded-xl hover:shadow-sm transition-shadow">
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
        <a href={store.website_url} target="_blank" rel="noopener noreferrer"
          className="p-1.5 rounded-md text-muted-foreground hover:text-primary transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  )
}

export default function RetailStores() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [subscribedStores, setSubscribedStores] = useState([])

  useEffect(() => {
    storeService.listRetail().then(({ data }) => setSubscribedStores(data.results ?? data)).catch(() => {})
  }, [])

  const visibleGroups = activeCategory === 'all'
    ? RETAIL_GROUPS
    : RETAIL_GROUPS.filter(g => g.id === activeCategory)

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

  const featuredStores = subscribedStores.filter(s => s.website_url)

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
      </div>

      {/* Featured: subscribed stores with website links */}
      {featuredStores.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
            <BadgeCheck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-primary">Retail Stores on Linksdoor</h2>
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

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-10">
          {visibleGroups.map(g => (
            <RetailGroup key={g.id} group={g} />
          ))}

          <div className="border-t pt-6">
            <p className="text-xs text-muted-foreground text-center">
              Linksdoor links to official chain websites. Store availability varies by city. Use the store locator on each brand's website to find your nearest branch.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
