/**
 * Shopping.jsx
 *
 * Public directory page mounted at `/shopping` (see App.jsx). Combines three
 * layers: (1) a static, hand-curated directory of Indian online stores
 * grouped by category (SHOPPING_GROUPS below); (2) an affiliate layer that
 * tags outbound links to known merchants with an Amazon Associates or
 * Cuelinks/EarnKaro badge (STATIC_AFFILIATE_MAP + affiliateUrl()); and (3)
 * "featured" stores that are actual StepsDoor storefront subscribers
 * (fetched live via storeService.list()), rendered with a click-tracking
 * redirect. Supports category filtering (sidebar/pill strip) and search
 * spanning both the static directory and subscribed stores.
 */
import { useState, useEffect, useCallback } from 'react'
import { ExternalLink, ShoppingBag, Globe, Shirt, Footprints, Smartphone, ShoppingCart, Sparkles, Pill, Home, Gem, BookOpen, Baby, Dumbbell, Glasses, RefreshCw, Briefcase, PackageSearch, BadgeCheck, Search, Tag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { storeService } from '@/services/storeService'

// Append Amazon Associates tag to amazon.in / amzn.in URLs when configured.
// All other merchant links are handled automatically by the Cuelinks JS (loaded in App.jsx).
const _AMAZON_TAG = import.meta.env.VITE_AMAZON_AFFILIATE_TAG || ''
/**
 * Rewrites a store URL to include the Amazon Associates tag when the URL
 * points at amazon.in/amzn.in and a tag is configured; otherwise returns
 * the URL unchanged (non-Amazon affiliate tagging is handled by the
 * Cuelinks script injected globally in App.jsx, not per-link here).
 * @param {string} url - the store's outbound URL
 * @returns {string} the URL, with `?tag=` appended when applicable
 */
function affiliateUrl(url) {
  if (_AMAZON_TAG && /amazon\.in|amzn\.in/i.test(url)) {
    try {
      const u = new URL(url)
      u.searchParams.set('tag', _AMAZON_TAG)
      return u.toString()
    } catch {
      return url
    }
  }
  return url
}

// Static directory data: one entry per shopping category, each holding its
// icon, accent color, and the list of stores shown as outbound link cards.
// Hand-maintained content, not fetched from the backend.
const SHOPPING_GROUPS = [
  {
    id: 'general',
    label: 'General Marketplaces',
    icon: ShoppingCart,
    color: 'blue',
    stores: [
      { name: 'Amazon India',   url: 'https://www.amazon.in',          desc: "India's largest e-commerce marketplace" },
      { name: 'Flipkart',       url: 'https://www.flipkart.com',        desc: "India's leading online marketplace" },
      { name: 'Meesho',         url: 'https://www.meesho.com',          desc: 'Social commerce & reselling platform' },
      { name: 'Snapdeal',       url: 'https://www.snapdeal.com',        desc: 'Value-focused e-commerce marketplace' },
      { name: 'JioMart',        url: 'https://www.jiomart.com',         desc: 'Reliance retail platform' },
      { name: 'ShopClues',      url: 'https://www.shopclues.com',       desc: 'Open marketplace for all categories' },
      { name: 'Paytm Mall',     url: 'https://www.paytmmall.com',       desc: "Paytm's e-commerce platform" },
      { name: 'Tata CLiQ',      url: 'https://www.tatacliq.com',        desc: "Tata's premium phygital marketplace" },
      { name: 'IndiaMart',      url: 'https://www.indiamart.com',       desc: 'B2B marketplace for business buyers', tag: 'B2B' },
      { name: 'Udaan',          url: 'https://www.udaan.com',           desc: 'B2B wholesale trade platform', tag: 'B2B' },
      { name: 'Moglix',         url: 'https://www.moglix.com',          desc: 'B2B industrial supplies marketplace', tag: 'B2B' },
    ],
  },
  {
    id: 'fashion',
    label: 'Fashion & Apparel',
    icon: Shirt,
    color: 'pink',
    stores: [
      { name: 'Myntra',          url: 'https://www.myntra.com',          desc: "India's largest fashion platform" },
      { name: 'AJIO',            url: 'https://www.ajio.com',            desc: 'Reliance fashion & lifestyle' },
      { name: 'Nykaa Fashion',   url: 'https://www.nykaafashion.com',    desc: 'Fashion by Nykaa' },
      { name: 'Bewakoof',        url: 'https://www.bewakoof.com',        desc: 'Youth casual fashion D2C' },
      { name: 'The Souled Store',url: 'https://www.thesouledstore.com',  desc: 'Pop culture merchandise & apparel' },
      { name: 'Snitch',          url: 'https://www.snitch.co.in',        desc: "Men's fast fashion brand" },
      { name: 'Zara India',      url: 'https://www.zara.com/in',         desc: 'International fast fashion (Inditex)' },
      { name: 'H&M India',       url: 'https://www2.hm.com/en_in',       desc: 'Global fashion & homeware brand' },
      { name: 'Westside',        url: 'https://www.westside.com',        desc: 'Trent fashion retail stores' },
      { name: 'Zudio',           url: 'https://www.zudio.com',           desc: 'Affordable fashion (Trent)' },
      { name: 'Max Fashion',     url: 'https://www.maxfashion.in',       desc: 'Value family fashion chain' },
      { name: 'Pantaloons',      url: 'https://www.pantaloons.com',      desc: 'ABFRL fashion department stores' },
      { name: 'Fabindia',        url: 'https://www.fabindia.com',        desc: 'Indian handcrafted products & fabrics' },
      { name: 'Libas',           url: 'https://www.libas.in',            desc: 'Ethnic & fusion wear for women' },
      { name: 'BIBA',            url: 'https://www.biba.in',             desc: 'Indian ethnic wear brand' },
      { name: 'W for Woman',     url: 'https://www.w-woman.com',         desc: "Women's workwear & western fashion" },
      { name: 'Limeroad',        url: 'https://www.limeroad.com',        desc: "Women's fashion discovery platform" },
    ],
  },
  {
    id: 'footwear',
    label: 'Footwear',
    icon: Footprints,
    color: 'amber',
    stores: [
      { name: 'Bata India',    url: 'https://www.bata.in',              desc: "India's leading footwear brand" },
      { name: 'Metro Shoes',   url: 'https://www.metroshoes.com',       desc: 'Premium multi-brand footwear retail' },
      { name: 'Relaxo',        url: 'https://www.relaxofootwear.com',   desc: 'Value footwear — Hawaii & Sparx' },
      { name: 'Campus Shoes',  url: 'https://www.campusshoes.com',      desc: 'Sports & casual activewear footwear' },
      { name: 'Red Tape',      url: 'https://www.redtape.com',          desc: 'Lifestyle, formal & casual footwear' },
    ],
  },
  {
    id: 'electronics',
    label: 'Electronics & Mobiles',
    icon: Smartphone,
    color: 'violet',
    stores: [
      { name: 'Croma',             url: 'https://www.croma.com',                desc: 'Tata electronics retail chain' },
      { name: 'Reliance Digital',  url: 'https://www.reliancedigital.in',       desc: 'Reliance electronics stores' },
      { name: 'Vijay Sales',       url: 'https://www.vijaysales.com',           desc: 'Electronics retail chain' },
      { name: 'Poorvika',          url: 'https://www.poorvika.com',             desc: 'South India mobile & electronics retailer' },
      { name: 'Sangeetha Mobiles', url: 'https://www.sangeethamobiles.com',     desc: 'Mobile phone retail chain' },
      { name: 'Mi Store India',    url: 'https://store.mi.com/in',              desc: 'Xiaomi India official store' },
      { name: 'Samsung India',     url: 'https://www.samsung.com/in/shop',      desc: 'Samsung official India shop' },
      { name: 'Apple India',       url: 'https://www.apple.com/in/store',       desc: 'Apple India online store' },
      { name: 'OnePlus India',     url: 'https://www.oneplus.in',               desc: 'OnePlus official India store' },
      { name: 'boAt',              url: 'https://www.boat-lifestyle.com',       desc: 'Audio & wearables brand' },
      { name: 'Noise',             url: 'https://www.gonoise.com',              desc: 'Smartwatch & TWS earbuds brand' },
      { name: 'Fire-Boltt',        url: 'https://www.fireboltt.com',            desc: 'Smartwatch & fitness band brand' },
    ],
  },
  {
    id: 'grocery',
    label: 'Grocery & Quick Commerce',
    icon: ShoppingBag,
    color: 'green',
    stores: [
      { name: 'BigBasket',        url: 'https://www.bigbasket.com',         desc: 'Online grocery superstore (Tata)' },
      { name: 'Blinkit',          url: 'https://blinkit.com',               desc: '10-minute grocery delivery (Zomato)' },
      { name: 'Zepto',            url: 'https://www.zeptonow.com',          desc: 'Quick grocery delivery startup' },
      { name: 'Swiggy Instamart', url: 'https://www.swiggy.com/instamart',  desc: "Swiggy's grocery & essentials delivery" },
      { name: 'JioMart Groceries',url: 'https://www.jiomart.com/groceries', desc: 'Reliance grocery platform' },
      { name: 'DMart Ready',      url: 'https://www.dmart.in',              desc: 'DMart online grocery service' },
      { name: "Nature's Basket",  url: 'https://www.naturesbasket.co.in',   desc: 'Premium grocery & gourmet retail' },
      { name: 'Licious',          url: 'https://www.licious.in',            desc: 'Fresh meat & seafood delivery' },
      { name: 'FreshToHome',      url: 'https://www.freshtohome.com',       desc: 'Fresh meat & fish delivery' },
      { name: 'Country Delight',  url: 'https://www.countrydelight.in',     desc: 'Fresh farm dairy delivered daily' },
    ],
  },
  {
    id: 'beauty',
    label: 'Beauty & Personal Care',
    icon: Sparkles,
    color: 'rose',
    stores: [
      { name: 'Nykaa',           url: 'https://www.nykaa.com',           desc: "India's largest beauty & wellness platform" },
      { name: 'Purplle',         url: 'https://www.purplle.com',         desc: 'Beauty & wellness marketplace' },
      { name: 'Tira Beauty',     url: 'https://www.tirabeauty.com',      desc: 'Reliance premium beauty retail' },
      { name: 'Mamaearth',       url: 'https://mamaearth.in',            desc: 'Natural personal care D2C brand' },
      { name: 'SUGAR Cosmetics', url: 'https://www.sugarcosmetics.com',  desc: 'Cruelty-free Indian cosmetics brand' },
      { name: 'The Minimalist',  url: 'https://www.minimalist.co',       desc: 'Science-backed affordable skincare' },
      { name: 'Plum Goodness',   url: 'https://www.plumgoodness.com',    desc: '100% vegan beauty brand' },
      { name: 'mCaffeine',       url: 'https://www.mcaffeine.com',       desc: 'Caffeinated personal care products' },
      { name: 'WOW Skin Science',url: 'https://www.wow.in',              desc: 'Natural beauty & wellness products' },
    ],
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy & Health',
    icon: Pill,
    color: 'teal',
    stores: [
      { name: 'PharmEasy',       url: 'https://pharmeasy.in',              desc: 'Online pharmacy & lab tests' },
      { name: '1mg (Tata)',       url: 'https://www.1mg.com',               desc: 'Medicines, lab tests & health info' },
      { name: 'Netmeds',         url: 'https://www.netmeds.com',            desc: 'Reliance online pharmacy' },
      { name: 'Apollo Pharmacy', url: 'https://www.apollopharmacy.in',      desc: 'Apollo Hospitals pharmacy chain' },
      { name: 'Truemeds',        url: 'https://www.truemeds.in',            desc: 'Generic & affordable medicines' },
      { name: 'HealthKart',      url: 'https://www.healthkart.com',         desc: 'Supplements & sports nutrition' },
      { name: 'MuscleBlaze',     url: 'https://www.muscleblaze.com',        desc: "India's #1 sports nutrition brand" },
    ],
  },
  {
    id: 'home',
    label: 'Home, Furniture & Decor',
    icon: Home,
    color: 'orange',
    stores: [
      { name: 'Pepperfry',         url: 'https://www.pepperfry.com',       desc: 'Furniture & home decor marketplace' },
      { name: 'Urban Ladder',      url: 'https://www.urbanladder.com',     desc: 'Premium furniture & decor (Reliance)' },
      { name: 'Wooden Street',     url: 'https://www.woodenstreet.com',    desc: 'Customizable solid wood furniture' },
      { name: 'IKEA India',        url: 'https://www.ikea.com/in/en',      desc: 'Global flat-pack furniture & home' },
      { name: 'Home Centre',       url: 'https://www.homecentre.in',       desc: 'Landmark Group home furnishings' },
      { name: 'Nilkamal Furniture',url: 'https://www.nilkamalfurniture.com', desc: 'Affordable furniture & storage' },
      { name: 'Sleepycat',         url: 'https://www.sleepycat.in',        desc: 'Premium memory foam mattresses' },
      { name: 'Wakefit',           url: 'https://www.wakefit.co',          desc: 'Sleep & home solutions brand' },
      { name: 'The Sleep Company', url: 'https://www.thesleepcompany.in',  desc: 'SmartGrid orthopedic mattresses' },
      { name: 'Nestasia',          url: 'https://www.nestasia.in',         desc: 'Home decor, gifting & lifestyle' },
    ],
  },
  {
    id: 'jewellery',
    label: 'Jewellery',
    icon: Gem,
    color: 'yellow',
    stores: [
      { name: 'Tanishq',         url: 'https://www.tanishq.co.in',                 desc: 'Tata premium jewellery brand' },
      { name: 'CaratLane',       url: 'https://www.caratlane.com',                 desc: 'Tanishq online fine jewellery' },
      { name: 'BlueStone',       url: 'https://www.bluestone.com',                 desc: 'Online jewellery brand' },
      { name: 'Kalyan Jewellers',url: 'https://www.kalyanjewellers.net',           desc: 'Pan-India jewellery retail chain' },
      { name: 'Malabar Gold',    url: 'https://www.malabargoldanddiamonds.com',    desc: 'Premium jewellery retail chain' },
      { name: 'GIVA',            url: 'https://www.giva.co',                       desc: 'Silver jewellery & accessories D2C' },
      { name: 'Melorra',         url: 'https://www.melorra.com',                   desc: 'Lightweight gold jewellery brand' },
    ],
  },
  {
    id: 'books',
    label: 'Books & Stationery',
    icon: BookOpen,
    color: 'indigo',
    stores: [
      { name: 'Amazon Books',   url: 'https://www.amazon.in/books',   desc: 'Books on Amazon India — all genres' },
      { name: 'Crossword',      url: 'https://www.crossword.in',       desc: "India's leading bookstore chain" },
      { name: 'Sapna Online',   url: 'https://www.sapnaonline.com',    desc: 'Kannada & regional language books' },
      { name: 'BooksWagon',     url: 'https://www.bookswagon.com',     desc: 'Discount books online' },
      { name: 'Flipkart Books', url: 'https://www.flipkart.com/books', desc: 'Books on Flipkart' },
    ],
  },
  {
    id: 'baby',
    label: 'Baby & Kids',
    icon: Baby,
    color: 'sky',
    stores: [
      { name: 'FirstCry',   url: 'https://www.firstcry.com',   desc: "India's largest baby & kids store" },
      { name: 'Hopscotch',  url: 'https://www.hopscotch.in',   desc: "Kids' fashion & clothing online" },
      { name: 'BabyHug',    url: 'https://www.babyhug.in',     desc: 'Baby products, clothing & accessories' },
    ],
  },
  {
    id: 'sports',
    label: 'Sports & Fitness',
    icon: Dumbbell,
    color: 'red',
    stores: [
      { name: 'Decathlon India', url: 'https://www.decathlon.in',  desc: 'All-sports equipment & apparel' },
      { name: 'Nike India',      url: 'https://www.nike.com/in',   desc: 'Nike official India store' },
      { name: 'Adidas India',    url: 'https://www.adidas.co.in',  desc: 'Adidas official India store' },
      { name: 'Puma India',      url: 'https://www.puma.com/in',   desc: 'Puma official India store' },
      { name: 'Cult Sport',      url: 'https://www.cultsport.com', desc: 'Cult.fit sports & fitness gear brand' },
    ],
  },
  {
    id: 'eyewear',
    label: 'Eyewear & Watches',
    icon: Glasses,
    color: 'cyan',
    stores: [
      { name: 'Lenskart',      url: 'https://www.lenskart.com',          desc: 'Eyewear, glasses & contact lenses' },
      { name: 'Titan Eye+',    url: 'https://www.titaneyeplus.com',       desc: 'Titan eyewear retail stores' },
      { name: 'Titan Watches', url: 'https://www.titan.co.in',           desc: 'Titan Company watches & accessories' },
      { name: 'Fastrack',      url: 'https://www.fastrack.in',           desc: 'Youth watches & fashion accessories' },
      { name: 'Helios',        url: 'https://www.helioswatchstore.com',  desc: 'Premium multi-brand watch store (Titan)' },
    ],
  },
  {
    id: 'refurbished',
    label: 'Refurbished & Second-Hand',
    icon: RefreshCw,
    color: 'stone',
    stores: [
      { name: 'Cashify',  url: 'https://www.cashify.in',  desc: 'Sell & buy refurbished smartphones' },
      { name: 'OLX India',url: 'https://www.olx.in',      desc: 'Classifieds & second-hand marketplace' },
      { name: 'Quikr',    url: 'https://www.quikr.com',   desc: 'Classifieds & local buying/selling' },
      { name: 'Cars24',   url: 'https://www.cars24.com',  desc: 'Certified pre-owned car marketplace' },
      { name: 'Spinny',   url: 'https://www.spinny.com',  desc: 'Fixed-price certified used cars' },
      { name: 'CredR',    url: 'https://www.credr.com',   desc: 'Certified pre-owned two-wheelers' },
    ],
  },
  {
    id: 'bags',
    label: 'Bags & Luggage',
    icon: Briefcase,
    color: 'purple',
    stores: [
      { name: 'Safari Industries',  url: 'https://www.safari.in',            desc: 'Safari trolleys & travel bags' },
      { name: 'VIP Bags',           url: 'https://www.vipbags.com',           desc: 'VIP luggage & travel accessories' },
      { name: 'American Tourister', url: 'https://www.americantourister.in',  desc: 'American Tourister India official' },
      { name: 'Wildcraft',          url: 'https://www.wildcraft.com',         desc: 'Outdoor, trekking & travel gear' },
      { name: 'Mokobara',           url: 'https://www.mokobara.com',          desc: 'Premium modern travel bags & luggage' },
    ],
  },
  {
    id: 'global',
    label: 'Global (Ships to India)',
    icon: Globe,
    color: 'slate',
    stores: [
      { name: 'AliExpress',  url: 'https://www.aliexpress.com', desc: 'Budget global products marketplace' },
      { name: 'eBay',        url: 'https://www.ebay.com',        desc: 'Global auction & buy-now marketplace' },
      { name: 'SHEIN India', url: 'https://www.shein.in',        desc: 'Fast fashion (re-entered via Reliance)' },
      { name: 'ASOS',        url: 'https://www.asos.com',        desc: 'UK-based fashion & beauty marketplace' },
      { name: 'iHerb',       url: 'https://www.iherb.com',       desc: 'Global health, vitamins & supplements' },
    ],
  },
]

// Per-category Tailwind class bundle keyed by the `color` name each SHOPPING_GROUPS entry declares
const COLOR_MAP = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: 'text-blue-500',   border: 'border-blue-100',   badge: 'bg-blue-100 text-blue-700',   activeBg: 'bg-blue-50',   activeText: 'text-blue-700'   },
  pink:   { bg: 'bg-pink-50',   text: 'text-pink-700',   icon: 'text-pink-500',   border: 'border-pink-100',   badge: 'bg-pink-100 text-pink-700',   activeBg: 'bg-pink-50',   activeText: 'text-pink-700'   },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  icon: 'text-amber-500',  border: 'border-amber-100',  badge: 'bg-amber-100 text-amber-700', activeBg: 'bg-amber-50',  activeText: 'text-amber-700'  },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', icon: 'text-violet-500', border: 'border-violet-100', badge: 'bg-violet-100 text-violet-700', activeBg: 'bg-violet-50', activeText: 'text-violet-700' },
  green:  { bg: 'bg-green-50',  text: 'text-green-700',  icon: 'text-green-500',  border: 'border-green-100',  badge: 'bg-green-100 text-green-700', activeBg: 'bg-green-50',  activeText: 'text-green-700'  },
  rose:   { bg: 'bg-rose-50',   text: 'text-rose-700',   icon: 'text-rose-500',   border: 'border-rose-100',   badge: 'bg-rose-100 text-rose-700',   activeBg: 'bg-rose-50',   activeText: 'text-rose-700'   },
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-700',   icon: 'text-teal-500',   border: 'border-teal-100',   badge: 'bg-teal-100 text-teal-700',   activeBg: 'bg-teal-50',   activeText: 'text-teal-700'   },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-500', border: 'border-orange-100', badge: 'bg-orange-100 text-orange-700', activeBg: 'bg-orange-50', activeText: 'text-orange-700' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'text-yellow-500', border: 'border-yellow-100', badge: 'bg-yellow-100 text-yellow-700', activeBg: 'bg-yellow-50', activeText: 'text-yellow-700' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: 'text-indigo-500', border: 'border-indigo-100', badge: 'bg-indigo-100 text-indigo-700', activeBg: 'bg-indigo-50', activeText: 'text-indigo-700' },
  sky:    { bg: 'bg-sky-50',    text: 'text-sky-700',    icon: 'text-sky-500',    border: 'border-sky-100',    badge: 'bg-sky-100 text-sky-700',     activeBg: 'bg-sky-50',    activeText: 'text-sky-700'    },
  red:    { bg: 'bg-red-50',    text: 'text-red-700',    icon: 'text-red-500',    border: 'border-red-100',    badge: 'bg-red-100 text-red-700',     activeBg: 'bg-red-50',    activeText: 'text-red-700'    },
  cyan:   { bg: 'bg-cyan-50',   text: 'text-cyan-700',   icon: 'text-cyan-500',   border: 'border-cyan-100',   badge: 'bg-cyan-100 text-cyan-700',   activeBg: 'bg-cyan-50',   activeText: 'text-cyan-700'   },
  stone:  { bg: 'bg-stone-50',  text: 'text-stone-700',  icon: 'text-stone-500',  border: 'border-stone-100',  badge: 'bg-stone-100 text-stone-700', activeBg: 'bg-stone-50',  activeText: 'text-stone-700'  },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-500', border: 'border-purple-100', badge: 'bg-purple-100 text-purple-700', activeBg: 'bg-purple-50', activeText: 'text-purple-700' },
  slate:  { bg: 'bg-slate-50',  text: 'text-slate-700',  icon: 'text-slate-500',  border: 'border-slate-100',  badge: 'bg-slate-100 text-slate-700', activeBg: 'bg-slate-50',  activeText: 'text-slate-700'  },
}

const totalStores = SHOPPING_GROUPS.reduce((s, g) => s + g.stores.length, 0)

// Every store, flattened with its group's colour attached — used for search
export const ALL_STORES = SHOPPING_GROUPS.flatMap(g => g.stores.map(s => ({ ...s, groupLabel: g.label, groupColor: g.color })))

// ---------------------------------------------------------------------------
// Affiliate network badges
// ---------------------------------------------------------------------------

// Label + style for each affiliate network a store card can be tagged with
const AFFILIATE_BADGE = {
  amazon:   { label: 'Amazon Associates', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  cuelinks: { label: 'Cuelinks',          cls: 'bg-blue-100 text-blue-700 border-blue-200'       },
  earnkaro: { label: 'EarnKaro',          cls: 'bg-green-100 text-green-700 border-green-200'    },
}

// Maps static store names to their affiliate network.
// Detected at runtime — no need to touch individual store data entries.
const STATIC_AFFILIATE_MAP = {
  // Amazon Associates
  'Amazon India': 'amazon', 'Amazon Books': 'amazon',

  // Cuelinks — major Indian e-commerce merchants confirmed in their network
  'Flipkart': 'cuelinks', 'Meesho': 'cuelinks', 'Snapdeal': 'cuelinks',
  'JioMart': 'cuelinks', 'JioMart Groceries': 'cuelinks', 'Tata CLiQ': 'cuelinks',
  'Myntra': 'cuelinks', 'AJIO': 'cuelinks', 'Nykaa Fashion': 'cuelinks',
  'Bewakoof': 'cuelinks', 'The Souled Store': 'cuelinks', 'Snitch': 'cuelinks',
  'Max Fashion': 'cuelinks', 'Pantaloons': 'cuelinks', 'Fabindia': 'cuelinks',
  'Libas': 'cuelinks', 'BIBA': 'cuelinks', 'Limeroad': 'cuelinks',
  'Bata India': 'cuelinks', 'Metro Shoes': 'cuelinks', 'Campus Shoes': 'cuelinks',
  'Red Tape': 'cuelinks',
  'Croma': 'cuelinks', 'Vijay Sales': 'cuelinks',
  'boAt': 'cuelinks', 'Noise': 'cuelinks', 'Fire-Boltt': 'cuelinks',
  'BigBasket': 'cuelinks', 'Licious': 'cuelinks', 'FreshToHome': 'cuelinks',
  'Country Delight': 'cuelinks',
  'Nykaa': 'cuelinks', 'Purplle': 'cuelinks', 'Tira Beauty': 'cuelinks',
  'Mamaearth': 'cuelinks', 'SUGAR Cosmetics': 'cuelinks',
  'The Minimalist': 'cuelinks', 'Plum Goodness': 'cuelinks',
  'mCaffeine': 'cuelinks', 'WOW Skin Science': 'cuelinks',
  'PharmEasy': 'cuelinks', '1mg (Tata)': 'cuelinks', 'Netmeds': 'cuelinks',
  'Truemeds': 'cuelinks', 'HealthKart': 'cuelinks', 'MuscleBlaze': 'cuelinks',
  'Pepperfry': 'cuelinks', 'Urban Ladder': 'cuelinks', 'Wooden Street': 'cuelinks',
  'Wakefit': 'cuelinks', 'Sleepycat': 'cuelinks', 'Nestasia': 'cuelinks',
  'CaratLane': 'cuelinks', 'BlueStone': 'cuelinks', 'GIVA': 'cuelinks',
  'Melorra': 'cuelinks',
  'Flipkart Books': 'cuelinks', 'BooksWagon': 'cuelinks', 'Crossword': 'cuelinks',
  'FirstCry': 'cuelinks', 'Hopscotch': 'cuelinks', 'BabyHug': 'cuelinks',
  'Decathlon India': 'cuelinks', 'Nike India': 'cuelinks',
  'Adidas India': 'cuelinks', 'Puma India': 'cuelinks', 'Cult Sport': 'cuelinks',
  'Lenskart': 'cuelinks', 'Titan Eye+': 'cuelinks',
  'Titan Watches': 'cuelinks', 'Fastrack': 'cuelinks', 'Helios': 'cuelinks',
  'Cashify': 'cuelinks', 'Cars24': 'cuelinks',
  'Safari Industries': 'cuelinks', 'American Tourister': 'cuelinks',
  'VIP Bags': 'cuelinks', 'Wildcraft': 'cuelinks', 'Mokobara': 'cuelinks',
  'iHerb': 'cuelinks',
}

/**
 * Small pill showing which affiliate network a store's outbound link is
 * tracked through. Renders nothing if the network isn't recognised.
 * @param {{ network: string }} props - affiliate network key (must match an AFFILIATE_BADGE entry)
 */
function AffiliateBadge({ network }) {
  const b = AFFILIATE_BADGE[network]
  if (!b) return null
  return (
    <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded border font-medium leading-none ${b.cls}`}>
      {b.label}
    </span>
  )
}

/**
 * One static-directory store: an outbound link card (routed through
 * affiliateUrl() for Amazon tagging) with name, optional tag badge, an
 * affiliate-network badge when the store is in STATIC_AFFILIATE_MAP, and
 * description.
 * @param {{ store: object, color: string }} props - store entry from SHOPPING_GROUPS and its group's color key
 */
function StoreCard({ store, color }) {
  const c = COLOR_MAP[color]
  const network = STATIC_AFFILIATE_MAP[store.name]
  return (
    <a
      href={affiliateUrl(store.url)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start justify-between gap-2 p-3.5 bg-white border rounded-lg hover:shadow-md hover:border-primary/30 transition-all group"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{store.name}</p>
          {store.tag && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${c.badge}`}>{store.tag}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-snug">{store.desc}</p>
        {network && (
          <div className="mt-1.5">
            <AffiliateBadge network={network} />
          </div>
        )}
      </div>
      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
    </a>
  )
}

/**
 * One category section: a colour-coded header (icon, label, store count)
 * followed by a grid of StoreCard entries for that group's stores.
 * @param {{ group: object }} props - one entry from SHOPPING_GROUPS
 */
function StoreGroup({ group }) {
  const c = COLOR_MAP[group.color]
  const Icon = group.icon
  return (
    <div id={group.id}>
      <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg ${c.bg} ${c.border} border`}>
        <Icon className={`h-4 w-4 ${c.icon}`} />
        <h2 className={`text-sm font-bold ${c.text}`}>{group.label}</h2>
        <span className={`ml-auto text-xs font-medium ${c.text} opacity-70`}>{group.stores.length} stores</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {group.stores.map(s => (
          <StoreCard key={s.name} store={s} color={group.color} />
        ))}
      </div>
    </div>
  )
}

/**
 * A StepsDoor storefront-subscriber card (as opposed to a static directory
 * entry) — shows the store's logo/name/tagline and an affiliate badge if
 * applicable. Clicking routes through a click-tracking redirect.
 * @param {{ store: object }} props - a subscribed store record from storeService.list()
 */
function SubscribedStoreCard({ store }) {
  // Logs the click via storeService before opening the store's site, so click-through
  // analytics stay accurate even though we open the link ourselves. Falls back to the
  // raw website_url if the click-tracking call fails, so the click isn't lost.
  const handleClick = useCallback(async (e) => {
    e.preventDefault()
    try {
      const { data } = await storeService.click(store.id)
      window.open(data.redirect_url || store.website_url, '_blank', 'noopener,noreferrer')
    } catch {
      window.open(store.website_url, '_blank', 'noopener,noreferrer')
    }
  }, [store.id, store.website_url])

  return (
    <a
      href={store.website_url}
      onClick={handleClick}
      className="flex items-center gap-3 p-3 bg-white border border-border rounded-xl hover:shadow-sm hover:border-primary/30 transition-all group cursor-pointer"
    >
      {store.logo ? (
        <img src={store.logo} alt={store.name} className="h-10 w-10 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <ShoppingBag className="h-5 w-5 text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
          {store.name}
          <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />
        </p>
        {store.tagline && <p className="text-xs text-muted-foreground truncate">{store.tagline}</p>}
        {store.affiliate_network && (
          <div className="mt-1">
            <AffiliateBadge network={store.affiliate_network} />
          </div>
        )}
      </div>
      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
    </a>
  )
}

/**
 * Renders the shopping directory page: featured StepsDoor-subscribed stores
 * at the top (if any), then the static category directory with a sidebar
 * (desktop) / pill strip (mobile) filter and cross-cutting search.
 */
export default function Shopping() {
  const [activeCategory, setActiveCategory] = useState('all') // which static-directory category is shown ('all' or a SHOPPING_GROUPS id)
  const [subscribedStores, setSubscribedStores] = useState([]) // live StepsDoor storefront subscribers fetched below
  const [search, setSearch] = useState('') // search box value — spans both subscribed and static-directory stores

  // Derived: collect every non-empty offers_link URL from subscribed stores, paired
  // with the store that owns them so the card can show a store label.
  // Each element: { url: string, storeName: string, storeLogo: string|null, storeId: number }
  const offerEntries = subscribedStores.flatMap(store => {
    if (!store.offers_links) return []
    return store.offers_links
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean) // drop blank lines
      .map(url => ({ url, storeName: store.name, storeLogo: store.logo, storeId: store.id }))
  })

  // Fetch StepsDoor's actual shopping-store subscribers once on mount; silently
  // ignore failures so the static directory below still renders regardless.
  useEffect(() => {
    storeService.list().then(({ data }) => setSubscribedStores(data.results ?? data)).catch(() => {})
  }, [])

  const visibleGroups = activeCategory === 'all'
    ? SHOPPING_GROUPS
    : SHOPPING_GROUPS.filter(g => g.id === activeCategory)

  // Search spans every category, ignoring whichever one is currently selected
  const isSearching = search.trim().length > 0
  const q = search.toLowerCase()
  const searchedStores = ALL_STORES.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.desc.toLowerCase().includes(q) ||
    s.groupLabel.toLowerCase().includes(q)
  )
  const searchedSubscribed = subscribedStores.filter(s =>
    s.name.toLowerCase().includes(q) ||
    (s.tagline && s.tagline.toLowerCase().includes(q))
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Shopping & Stores</h1>
        <p className="text-muted-foreground text-sm">
          {totalStores} online stores across {SHOPPING_GROUPS.length} categories — all direct links to official Indian shopping sites.
        </p>
      </div>

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

      {/* Special Offers strip — shown when at least one subscribed store has offers_links set.
          Renders a horizontally-scrollable row of offer link cards below the search bar. */}
      {offerEntries.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="h-4 w-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-foreground">Special Offers</h2>
            <span className="text-xs text-muted-foreground">({offerEntries.length} deal{offerEntries.length !== 1 ? 's' : ''})</span>
          </div>
          {/* Horizontal scroll on small screens; wraps on desktop */}
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 sm:flex-wrap sm:overflow-visible">
            {offerEntries.map(({ url, storeName, storeLogo, storeId }, idx) => {
              // Extract a readable hostname label from the URL (e.g. "www.amazon.in" → "amazon.in")
              let hostLabel = url
              try {
                hostLabel = new URL(url).hostname.replace(/^www\./, '')
              } catch {
                // keep raw url as label if parsing fails (malformed URL)
              }
              return (
                <a
                  key={`${storeId}-${idx}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 hover:border-orange-300 hover:shadow-sm transition-all group min-w-0 max-w-[220px]"
                >
                  {/* Store logo thumbnail or fallback tag icon */}
                  {storeLogo ? (
                    <img src={storeLogo} alt={storeName} className="h-7 w-7 rounded-md object-cover shrink-0" />
                  ) : (
                    <div className="h-7 w-7 rounded-md bg-orange-200 flex items-center justify-center shrink-0">
                      <Tag className="h-3.5 w-3.5 text-orange-600" />
                    </div>
                  )}
                  <div className="min-w-0">
                    {/* Store name in bold above the URL host label */}
                    <p className="text-xs font-semibold text-orange-900 truncate leading-tight">{storeName}</p>
                    <p className="text-[10px] text-orange-600 truncate leading-tight">{hostLabel}</p>
                  </div>
                  <ExternalLink className="h-3 w-3 text-orange-400 group-hover:text-orange-600 shrink-0 transition-colors ml-auto" />
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* While searching, show a flat cross-section of subscribed + directory results instead of the normal browse layout */}
      {isSearching ? (
        <div>
          <p className="text-xs text-muted-foreground mb-4">
            {searchedSubscribed.length + searchedStores.length} result{(searchedSubscribed.length + searchedStores.length) !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
          </p>
          {searchedSubscribed.length === 0 && searchedStores.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">No stores match your search.</div>
          ) : (
            <div className="space-y-8">
              {searchedSubscribed.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-primary mb-3 flex items-center gap-1.5">
                    <BadgeCheck className="h-4 w-4" /> Featured Stores on StepsDoor
                  </h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {searchedSubscribed.map(store => (
                      <SubscribedStoreCard key={store.id} store={store} />
                    ))}
                  </div>
                </div>
              )}
              {searchedStores.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-foreground mb-3">Store Directory</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {searchedStores.map(s => (
                      <StoreCard key={s.name + s.groupLabel} store={s} color={s.groupColor} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
      <>

      {/* Subscribed stores (paid listings) — only rendered once the fetch above resolves with results */}
      {subscribedStores.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4 text-primary" />
              Featured Stores on StepsDoor
            </h2>
            <Link to="/register" className="text-xs text-primary hover:underline">List your store</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subscribedStores.map(store => (
              <SubscribedStoreCard key={store.id} store={store} />
            ))}
          </div>
          <div className="mt-4 border-t" />
        </div>
      )}

      {/* Mobile: horizontal category strip */}
      <div className="flex md:hidden gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
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
        {SHOPPING_GROUPS.map(g => {
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
                    ? 'bg-primary/8 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-gray-50 hover:text-foreground'
                }`}
              >
                <PackageSearch className="h-3.5 w-3.5 shrink-0" />
                All Categories
                <span className="ml-auto text-xs opacity-60">{totalStores}</span>
              </button>

              <div className="my-1 border-t" />

              {/* One nav item per category, each showing its icon, label, and store count */}
              {SHOPPING_GROUPS.map(g => {
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
            <StoreGroup key={g.id} group={g} />
          ))}
        </div>
      </div>
      </>
      )}

      {/* Footer */}
      <div className="border-t pt-6 space-y-3 mt-10">
        <p className="text-xs text-muted-foreground text-center">
          StepsDoor links to official store websites. Some links may be affiliate links — we may earn a small
          commission at no extra cost to you. Always verify prices and seller ratings before purchasing.
        </p>
      </div>
    </div>
  )
}
