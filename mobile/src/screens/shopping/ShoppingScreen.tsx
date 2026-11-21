/**
 * ShoppingScreen.tsx
 *
 * Root screen of the "Shopping" bottom tab. Merges what used to be two
 * separate tabs — Shopping (online stores) and Retail (offline retail
 * chains) — behind a persistent "Online Stores" / "Retail Chains"
 * segmented row at the top, the same pattern `HomeScreen` uses for its
 * Jobs/Govt Jobs/Companies segments: switching segments only changes
 * local state, never navigates away, so the row stays constant. Each
 * segment shows a static, hand-curated directory grouped by category
 * (`SHOPPING_GROUPS` / `RETAIL_GROUPS`), with a search bar that filters
 * across all groups in the active segment. Subscribed StepsDoor
 * storefronts of the matching `store_type` are fetched live
 * (`storeService.list()` / `storeService.listRetail()`) and shown as
 * "Featured Stores" at the top of that segment.
 *
 * If any subscribed store (in the active segment) has `offers_links` set,
 * a "Special Offers" button appears below the header — tapping it opens a
 * Modal overlay listing every offer link, mirroring the web Shopping/
 * Retail pages' behaviour.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { storeService } from '@/services/storeService';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { BorderRadius, Spacing } from '@/theme/spacing';
import { FontSize, FontWeight } from '@/theme/typography';

// ---------------------------------------------------------------------------
// Static store directories (mirrors SHOPPING_GROUPS/RETAIL_GROUPS in
// frontend/src/pages/public/Shopping.jsx and RetailStores.jsx)
// ---------------------------------------------------------------------------

// Exported so `HomeTabScreen` can search these same static directories as
// part of its cross-section ("Jobs / Tenders / Shopping") search results,
// without duplicating the lists.
export interface StoreEntry {
  name: string;
  url: string;
  desc: string;
  tag?: string;
}

interface StoreGroup {
  id: string;
  label: string;
  // Named `data` (not `stores`) because `SectionList` reads each section's
  // items from this exact key internally (e.g. `section.data.length`) —
  // any other name leaves it `undefined` and crashes on render.
  data: StoreEntry[];
}

export const SHOPPING_GROUPS: StoreGroup[] = [
  {
    id: 'general',
    label: 'General Marketplaces',
    data: [
      { name: 'Amazon India',   url: 'https://www.amazon.in',       desc: "India's largest e-commerce marketplace" },
      { name: 'Flipkart',       url: 'https://www.flipkart.com',     desc: "India's leading online marketplace" },
      { name: 'Meesho',         url: 'https://www.meesho.com',       desc: 'Social commerce & reselling platform' },
      { name: 'Snapdeal',       url: 'https://www.snapdeal.com',     desc: 'Value-focused e-commerce marketplace' },
      { name: 'JioMart',        url: 'https://www.jiomart.com',      desc: 'Reliance retail platform' },
      { name: 'Tata CLiQ',      url: 'https://www.tatacliq.com',     desc: "Tata's premium phygital marketplace" },
      { name: 'IndiaMart',      url: 'https://www.indiamart.com',    desc: 'B2B marketplace for business buyers', tag: 'B2B' },
    ],
  },
  {
    id: 'fashion',
    label: 'Fashion & Apparel',
    data: [
      { name: 'Myntra',          url: 'https://www.myntra.com',        desc: "India's largest fashion platform" },
      { name: 'AJIO',            url: 'https://www.ajio.com',          desc: 'Reliance fashion & lifestyle' },
      { name: 'Nykaa Fashion',   url: 'https://www.nykaafashion.com',  desc: 'Fashion by Nykaa' },
      { name: 'Bewakoof',        url: 'https://www.bewakoof.com',      desc: 'Youth casual fashion D2C' },
      { name: 'The Souled Store',url: 'https://www.thesouledstore.com',desc: 'Pop culture merchandise & apparel' },
      { name: 'Zara India',      url: 'https://www.zara.com/in',       desc: 'International fast fashion' },
      { name: 'H&M India',       url: 'https://www2.hm.com/en_in',     desc: 'Global fashion & homeware brand' },
      { name: 'Fabindia',        url: 'https://www.fabindia.com',      desc: 'Indian handcrafted products & fabrics' },
      { name: 'BIBA',            url: 'https://www.biba.in',           desc: 'Indian ethnic wear brand' },
    ],
  },
  {
    id: 'footwear',
    label: 'Footwear',
    data: [
      { name: 'Bata India',    url: 'https://www.bata.in',             desc: "India's leading footwear brand" },
      { name: 'Metro Shoes',   url: 'https://www.metroshoes.com',       desc: 'Premium multi-brand footwear retail' },
      { name: 'Campus Shoes',  url: 'https://www.campusshoes.com',      desc: 'Sports & casual activewear footwear' },
      { name: 'Red Tape',      url: 'https://www.redtape.com',          desc: 'Lifestyle, formal & casual footwear' },
    ],
  },
  {
    id: 'electronics',
    label: 'Electronics & Mobiles',
    data: [
      { name: 'Croma',             url: 'https://www.croma.com',            desc: 'Tata electronics retail chain' },
      { name: 'Reliance Digital',  url: 'https://www.reliancedigital.in',   desc: 'Reliance electronics stores' },
      { name: 'Samsung India',     url: 'https://www.samsung.com/in/shop',  desc: 'Samsung official India shop' },
      { name: 'Apple India',       url: 'https://www.apple.com/in/store',   desc: 'Apple India online store' },
      { name: 'boAt',              url: 'https://www.boat-lifestyle.com',   desc: 'Audio & wearables brand' },
      { name: 'Noise',             url: 'https://www.gonoise.com',          desc: 'Smartwatch & TWS earbuds brand' },
    ],
  },
  {
    id: 'grocery',
    label: 'Grocery & Quick Commerce',
    data: [
      { name: 'BigBasket',        url: 'https://www.bigbasket.com',        desc: 'Online grocery superstore (Tata)' },
      { name: 'Blinkit',          url: 'https://blinkit.com',              desc: '10-minute grocery delivery (Zomato)' },
      { name: 'Zepto',            url: 'https://www.zeptonow.com',         desc: 'Quick grocery delivery startup' },
      { name: 'Swiggy Instamart', url: 'https://www.swiggy.com/instamart', desc: "Swiggy's grocery & essentials delivery" },
      { name: 'Licious',          url: 'https://www.licious.in',           desc: 'Fresh meat & seafood delivery' },
    ],
  },
  {
    id: 'beauty',
    label: 'Beauty & Personal Care',
    data: [
      { name: 'Nykaa',           url: 'https://www.nykaa.com',          desc: "India's largest beauty & wellness platform" },
      { name: 'Purplle',         url: 'https://www.purplle.com',         desc: 'Beauty & wellness marketplace' },
      { name: 'Mamaearth',       url: 'https://mamaearth.in',            desc: 'Natural personal care D2C brand' },
      { name: 'SUGAR Cosmetics', url: 'https://www.sugarcosmetics.com',  desc: 'Cruelty-free Indian cosmetics brand' },
      { name: 'The Minimalist',  url: 'https://www.minimalist.co',       desc: 'Science-backed affordable skincare' },
    ],
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy & Health',
    data: [
      { name: 'PharmEasy',       url: 'https://pharmeasy.in',            desc: 'Online pharmacy & lab tests' },
      { name: '1mg (Tata)',       url: 'https://www.1mg.com',             desc: 'Medicines, lab tests & health info' },
      { name: 'Netmeds',         url: 'https://www.netmeds.com',          desc: 'Reliance online pharmacy' },
      { name: 'Apollo Pharmacy', url: 'https://www.apollopharmacy.in',    desc: 'Apollo Hospitals pharmacy chain' },
      { name: 'HealthKart',      url: 'https://www.healthkart.com',       desc: 'Supplements & sports nutrition' },
    ],
  },
  {
    id: 'home',
    label: 'Home, Furniture & Decor',
    data: [
      { name: 'Pepperfry',     url: 'https://www.pepperfry.com',     desc: 'Furniture & home decor marketplace' },
      { name: 'Urban Ladder',  url: 'https://www.urbanladder.com',   desc: 'Premium furniture & decor (Reliance)' },
      { name: 'IKEA India',    url: 'https://www.ikea.com/in/en',    desc: 'Global flat-pack furniture & home' },
      { name: 'Wakefit',       url: 'https://www.wakefit.co',        desc: 'Sleep & home solutions brand' },
      { name: 'Nestasia',      url: 'https://www.nestasia.in',       desc: 'Home decor, gifting & lifestyle' },
    ],
  },
  {
    id: 'jewellery',
    label: 'Jewellery',
    data: [
      { name: 'Tanishq',         url: 'https://www.tanishq.co.in',              desc: 'Tata premium jewellery brand' },
      { name: 'CaratLane',       url: 'https://www.caratlane.com',              desc: 'Tanishq online fine jewellery' },
      { name: 'BlueStone',       url: 'https://www.bluestone.com',              desc: 'Online jewellery brand' },
      { name: 'GIVA',            url: 'https://www.giva.co',                    desc: 'Silver jewellery & accessories D2C' },
    ],
  },
  {
    id: 'sports',
    label: 'Sports & Fitness',
    data: [
      { name: 'Decathlon India', url: 'https://www.decathlon.in',  desc: 'All-sports equipment & apparel' },
      { name: 'Nike India',      url: 'https://www.nike.com/in',   desc: 'Nike official India store' },
      { name: 'Adidas India',    url: 'https://www.adidas.co.in',  desc: 'Adidas official India store' },
      { name: 'Cult Sport',      url: 'https://www.cultsport.com', desc: 'Cult.fit sports & fitness gear brand' },
    ],
  },
  {
    id: 'books',
    label: 'Books & Stationery',
    data: [
      { name: 'Amazon Books',   url: 'https://www.amazon.in/books',   desc: 'Books on Amazon India — all genres' },
      { name: 'Crossword',      url: 'https://www.crossword.in',       desc: "India's leading bookstore chain" },
      { name: 'Flipkart Books', url: 'https://www.flipkart.com/books', desc: 'Books on Flipkart' },
    ],
  },
  {
    id: 'eyewear',
    label: 'Eyewear & Watches',
    data: [
      { name: 'Lenskart',      url: 'https://www.lenskart.com',         desc: 'Eyewear, glasses & contact lenses' },
      { name: 'Titan Watches', url: 'https://www.titan.co.in',          desc: 'Titan Company watches & accessories' },
      { name: 'Fastrack',      url: 'https://www.fastrack.in',          desc: 'Youth watches & fashion accessories' },
    ],
  },
  {
    id: 'bags',
    label: 'Bags & Luggage',
    data: [
      { name: 'Safari Industries',  url: 'https://www.safari.in',           desc: 'Safari trolleys & travel bags' },
      { name: 'VIP Bags',           url: 'https://www.vipbags.com',          desc: 'VIP luggage & travel accessories' },
      { name: 'American Tourister', url: 'https://www.americantourister.in', desc: 'American Tourister India official' },
      { name: 'Mokobara',           url: 'https://www.mokobara.com',         desc: 'Premium modern travel bags & luggage' },
    ],
  },
];

export const RETAIL_GROUPS: StoreGroup[] = [
  {
    id: 'supermarkets',
    label: 'Supermarkets & Grocery',
    data: [
      { name: 'DMart',             url: 'https://www.dmart.in',            desc: 'Avenue Supermarts — value grocery chain',  tag: 'PAN India' },
      { name: 'Reliance Fresh',    url: 'https://www.reliancefresh.com',   desc: 'Reliance Retail neighbourhood grocery',    tag: 'PAN India' },
      { name: 'Big Bazaar',        url: 'https://www.bigbazaar.com',       desc: 'Future Group hypermarket chain',           tag: 'PAN India' },
      { name: "Spencer's Retail",  url: 'https://www.spencers.in',         desc: 'Supermarket & hypermarket chain',          tag: 'PAN India' },
      { name: 'More Retail',       url: 'https://www.more.in',             desc: 'Aditya Birla grocery supermarket',         tag: 'PAN India' },
      { name: "Nature's Basket",   url: 'https://www.naturesbasket.co.in', desc: 'Godrej premium gourmet grocery stores' },
      { name: 'Spar Hypermarket',  url: 'https://www.sparindia.com',       desc: 'International hypermarket chain in India' },
      { name: 'Metro Cash & Carry',url: 'https://www.metro.co.in',         desc: 'B2B wholesale cash & carry stores',        tag: 'B2B' },
    ],
  },
  {
    id: 'department',
    label: 'Department & Apparel',
    data: [
      { name: 'Shoppers Stop',    url: 'https://www.shoppersstop.com',    desc: 'Premium department store chain' },
      { name: 'Lifestyle Stores', url: 'https://www.lifestylestores.com', desc: 'Landmark Group lifestyle department stores' },
      { name: 'Westside',         url: 'https://www.westside.com',        desc: 'Trent fashion retail chain' },
      { name: 'Pantaloons',       url: 'https://www.pantaloons.com',      desc: 'ABFRL fashion department stores' },
      { name: 'Zudio',            url: 'https://www.zudio.com',           desc: 'Trent affordable fashion chain' },
      { name: 'Max Fashion',      url: 'https://www.maxfashion.in',       desc: 'Value family fashion stores' },
      { name: 'Fabindia',         url: 'https://www.fabindia.com',        desc: 'Indian handcraft & ethnic clothing' },
    ],
  },
  {
    id: 'electronics',
    label: 'Electronics & Appliances',
    data: [
      { name: 'Croma',             url: 'https://www.croma.com',          desc: 'Tata electronics retail chain' },
      { name: 'Reliance Digital',  url: 'https://www.reliancedigital.in', desc: 'Reliance consumer electronics stores' },
      { name: 'Vijay Sales',       url: 'https://www.vijaysales.com',     desc: 'Consumer electronics chain (West India)' },
      { name: 'Poorvika Mobiles',  url: 'https://www.poorvika.com',       desc: 'Mobile & electronics chain (South India)' },
      { name: 'Sangeetha Mobiles', url: 'https://www.sangeethastores.com',desc: 'Mobile stores (South India)' },
    ],
  },
  {
    id: 'jewellery',
    label: 'Jewellery',
    data: [
      { name: 'Tanishq',                  url: 'https://www.tanishq.co.in',                  desc: 'Tata premium jewellery retail chain' },
      { name: 'Kalyan Jewellers',         url: 'https://www.kalyanjewellers.net',            desc: 'Pan-India jewellery chain' },
      { name: 'Malabar Gold & Diamonds',  url: 'https://www.malabargoldanddiamonds.com',     desc: "One of India's largest jewellery groups" },
      { name: 'PC Jeweller',              url: 'https://www.pcjeweller.com',                 desc: 'PAN India jewellery retail chain' },
      { name: 'Joyalukkas',              url: 'https://www.joyalukkas.com',                 desc: 'South India heritage jewellery chain' },
      { name: 'GIVA',                     url: 'https://www.giva.co',                        desc: 'Silver jewellery & accessories D2C' },
    ],
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy & Health',
    data: [
      { name: 'Apollo Pharmacy',   url: 'https://www.apollopharmacy.in',  desc: "India's largest pharmacy chain" },
      { name: 'MedPlus',           url: 'https://www.medplusmart.com',     desc: 'Leading pharmacy chain (South India)' },
      { name: 'Wellness Forever',  url: 'https://www.wellnessforever.com', desc: 'Maharashtra pharmacy & wellness chain' },
      { name: 'Netmeds Store',     url: 'https://www.netmeds.com',         desc: 'Reliance offline pharmacy chain' },
      { name: '1mg Health Stores', url: 'https://www.1mg.com',             desc: 'Tata 1mg pharmacy & diagnostics' },
    ],
  },
  {
    id: 'beauty',
    label: 'Beauty & Personal Care',
    data: [
      { name: 'Nykaa Stores',      url: 'https://www.nykaa.com/store-locator',        desc: 'Nykaa offline beauty retail stores' },
      { name: 'Forest Essentials',  url: 'https://www.forestessentialsindia.com',     desc: 'Luxury Ayurvedic beauty brand stores' },
      { name: 'The Body Shop',      url: 'https://www.thebodyshop.in',                desc: 'International ethical beauty chain' },
      { name: 'MAC Cosmetics',      url: 'https://www.maccosmetics.in',               desc: 'Professional makeup & cosmetics stores' },
      { name: 'SUGAR Cosmetics',    url: 'https://www.sugarcosmetics.com',            desc: "India's homegrown colour cosmetics chain" },
      { name: 'Lakme Salon',        url: 'https://www.lakmesalon.in',                 desc: 'Premium beauty salon chain (HUL)' },
    ],
  },
  {
    id: 'footwear',
    label: 'Footwear',
    data: [
      { name: 'Bata India',      url: 'https://www.bata.in',         desc: "India's largest footwear retail chain" },
      { name: 'Liberty Shoes',   url: 'https://www.libertyshoes.com', desc: 'India heritage footwear brand' },
      { name: 'Metro Shoes',     url: 'https://www.metroshoes.net',   desc: 'Premium footwear chain (West India)' },
      { name: "Khadim's",        url: 'https://www.khadims.com',      desc: 'Value footwear chain (East India)' },
      { name: 'Woodland',        url: 'https://www.woodland.co.in',   desc: 'Outdoor & casual footwear brand stores' },
      { name: 'Mochi',           url: 'https://www.mochishoes.com',   desc: 'Trend-focused footwear & accessories' },
    ],
  },
  {
    id: 'sports',
    label: 'Sports & Fitness',
    data: [
      { name: 'Decathlon',    url: 'https://www.decathlon.in',          desc: "World's largest sporting goods chain" },
      { name: 'Nike India',   url: 'https://www.nike.com/in',           desc: 'Nike performance & lifestyle stores' },
      { name: 'Adidas India', url: 'https://www.adidas.co.in',          desc: 'Adidas performance & originals stores' },
      { name: 'Puma',         url: 'https://in.puma.com',               desc: 'Puma sport & lifestyle stores' },
    ],
  },
  {
    id: 'home',
    label: 'Home & Furniture',
    data: [
      { name: 'IKEA India',         url: 'https://www.ikea.com/in',           desc: 'Swedish furniture & home furnishings' },
      { name: 'Pepperfry Studio',   url: 'https://www.pepperfry.com/studios', desc: 'Online furniture brand offline studios' },
      { name: 'Urban Ladder Store', url: 'https://www.urbanladder.com/stores',desc: 'Reliance premium furniture studios' },
      { name: 'Godrej Interio',     url: 'https://www.godrejinterio.com',     desc: 'Godrej furniture & interior solutions' },
      { name: 'Nilkamal',           url: 'https://www.nilkamal.com',           desc: "India's leading furniture brand" },
    ],
  },
  {
    id: 'books',
    label: 'Books & Stationery',
    data: [
      { name: 'Crossword',        url: 'https://www.crossword.in',          desc: "India's largest book retail chain" },
      { name: 'Higginbothams',    url: 'https://www.higginbothams.com',      desc: "India's oldest bookstore chain (since 1844)" },
      { name: 'Oxford Bookstore', url: 'https://www.oxfordbookstore.com',   desc: 'Premium book & stationery stores' },
      { name: 'William Penn',     url: 'https://www.williampenn.in',        desc: 'Premium stationery & pen stores' },
    ],
  },
  {
    id: 'food',
    label: 'Food & QSR Chains',
    data: [
      { name: "Haldiram's",    url: 'https://www.haldirams.com',     desc: "India's iconic snacks & sweets chain" },
      { name: 'Bikanervala',   url: 'https://www.bikanervala.com',   desc: 'Sweets, snacks & restaurant chain' },
      { name: 'MTR Foods',     url: 'https://www.mtrfoods.com',      desc: 'South India food products & restaurants' },
      { name: 'Amul Parlour',  url: 'https://www.amul.com',          desc: 'Amul dairy & ice cream outlets' },
      { name: 'Café Coffee Day',url: 'https://www.cafecoffeeday.com',desc: "India's original coffee café chain" },
      { name: 'Barista Coffee', url: 'https://www.barista.co.in',    desc: 'Premium coffee café chain' },
    ],
  },
  {
    id: 'auto',
    label: 'Auto & Accessories',
    data: [
      { name: 'Bosch Car Service',     url: 'https://www.boschcarservice.com',     desc: 'Authorised Bosch service & accessories' },
      { name: 'Castrol Service',       url: 'https://www.castrol.com/en_in',       desc: 'Castrol oil & service centres' },
      { name: 'Mahindra First Choice', url: 'https://www.mahindrafirstchoice.com', desc: 'Multi-brand used car & service stores' },
    ],
  },
];

// Flattened lists used for search — each entry carries its section label so
// search results can still display a category subtitle. Exported for reuse
// by `HomeTabScreen`'s cross-section search (see `StoreEntry` above).
export const ALL_STORES = SHOPPING_GROUPS.flatMap(g =>
  g.data.map(s => ({ ...s, groupLabel: g.label }))
);
export const ALL_RETAIL_STORES = RETAIL_GROUPS.flatMap(g =>
  g.data.map(s => ({ ...s, groupLabel: g.label }))
);

// ---------------------------------------------------------------------------
// Subscribed store shape returned by storeService.list() / listRetail()
// ---------------------------------------------------------------------------

interface SubscribedStore {
  id: number;
  name: string;
  tagline?: string;
  logo?: string;
  website_url: string;
  store_locator_url?: string;
  offers_links?: string; // newline-separated list of offer URLs
}

// ---------------------------------------------------------------------------
// OfferEntry — a single offer link with the store it came from
// ---------------------------------------------------------------------------

interface OfferEntry {
  url: string;
  storeName: string;
  storeLogo?: string | null;
  storeId: number | string;
  description?: string;
}

// ---------------------------------------------------------------------------
// SpecialOffersModal
// ---------------------------------------------------------------------------

/**
 * Full-screen modal listing every Special Offer link from the active
 * segment's subscribed stores. Closed by tapping the backdrop or the ×
 * button.
 *
 * @param entries - Parsed offer entries from subscribed stores' `offers_links`.
 * @param onClose - Callback to dismiss the modal.
 */
function SpecialOffersModal({
  entries,
  onClose,
}: {
  entries: OfferEntry[];
  onClose: () => void;
}) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  /**
   * Opens an offer URL in the device's default browser. If the URL can't be
   * opened (invalid scheme, etc.) the error is silently swallowed so the UI
   * doesn't crash.
   */
  const openUrl = useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
    } catch {
      // Silently ignore — nothing useful the user can do here
    }
  }, []);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose} // Android back button
    >
      {/* Semi-transparent backdrop — tap to close */}
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        {/* Stop tap propagation so tapping inside the sheet doesn't close it */}
        <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>

          {/* Modal header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTagIcon}>🏷️</Text>
            <Text style={styles.modalTitle}>Special Offers</Text>
            <Text style={styles.modalCount}>
              {entries.length} deal{entries.length !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose} hitSlop={8}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable offer list */}
          <FlatList
            data={entries}
            keyExtractor={(item, idx) => `${item.storeId}-${idx}`}
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => {
              // Derive a readable host label (e.g. "www.amazon.in" → "amazon.in")
              let hostLabel = item.url;
              try {
                hostLabel = new URL(item.url).hostname.replace(/^www\./, '');
              } catch {
                // keep raw URL as label if it can't be parsed
              }
              return (
                <TouchableOpacity
                  style={styles.offerCard}
                  activeOpacity={0.75}
                  onPress={() => openUrl(item.url)}
                >
                  {/* Store logo or fallback tag emoji */}
                  {item.storeLogo ? (
                    <Image
                      source={{ uri: item.storeLogo }}
                      style={styles.offerLogo}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.offerLogoFallback}>
                      <Text style={styles.offerLogoFallbackIcon}>🏷️</Text>
                    </View>
                  )}
                  <View style={styles.offerTextWrap}>
                    <Text style={styles.offerStoreName} numberOfLines={1}>
                      {item.storeName}
                    </Text>
                    {/* Show description if set, otherwise fall back to the hostname */}
                    <Text style={styles.offerHost} numberOfLines={1}>
                      {item.description || hostLabel}
                    </Text>
                  </View>
                  <Text style={styles.offerArrow}>↗</Text>
                </TouchableOpacity>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// StoreCard — one static-directory store row
// ---------------------------------------------------------------------------

/**
 * A tappable row for a single static-directory store entry (from either
 * `SHOPPING_GROUPS` or `RETAIL_GROUPS` depending on the active segment).
 * Opens the store's URL in the system browser on press.
 *
 * @param store - A store entry, possibly augmented with its section's
 *   `groupLabel` (used in search results).
 */
function StoreCard({ store }: { store: StoreEntry & { groupLabel?: string } }) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  const openUrl = useCallback(async () => {
    try {
      if (await Linking.canOpenURL(store.url)) await Linking.openURL(store.url);
    } catch { /* noop */ }
  }, [store.url]);

  return (
    <TouchableOpacity style={styles.storeCard} activeOpacity={0.7} onPress={openUrl}>
      <View style={styles.storeCardBody}>
        <View style={styles.storeCardTop}>
          <Text style={styles.storeCardName}>{store.name}</Text>
          {store.tag && (
            <View style={styles.storeTag}>
              <Text style={styles.storeTagText}>{store.tag}</Text>
            </View>
          )}
          {store.groupLabel && (
            <Text style={styles.storeCardCategory}>{store.groupLabel}</Text>
          )}
        </View>
        <Text style={styles.storeCardDesc} numberOfLines={2}>{store.desc}</Text>
      </View>
      <Text style={styles.storeCardArrow}>↗</Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// ShoppingScreen
// ---------------------------------------------------------------------------

// Minimal shape of an admin-curated FeaturedLink returned by the API.
interface FeaturedLink {
  id: number;
  url: string;
  label: string;
  logo: string | null;
  description: string; // optional subtitle shown on the offer card; blank string when unset
  link_type: 'offer' | 'shopping';
  page: 'shopping' | 'retail' | 'both';
}

type Segment = 'online' | 'retail';

/**
 * Renders the Shopping tab: a persistent "Online Stores" / "Retail Chains"
 * segmented row, a header with the "Special Offers" trigger button (when
 * the active segment's subscribed stores have offer links), a search bar,
 * and a SectionList that shows either the full grouped directory or search
 * results for whichever segment is active. Subscribed StepsDoor stores of
 * both `store_type`s are fetched once on mount (so toggling segments never
 * needs a refetch) and displayed as "Featured Stores" above the directory
 * groups for the active segment.
 *
 * No route params consumed; `navigation` is unused (no nested drill-down).
 */
export function ShoppingScreen() {
  const [segment, setSegment] = useState<Segment>('online');
  const [subscribedOnline, setSubscribedOnline] = useState<SubscribedStore[]>([]);
  const [subscribedRetail, setSubscribedRetail] = useState<SubscribedStore[]>([]);
  const [featuredLinksShopping, setFeaturedLinksShopping] = useState<FeaturedLink[]>([]);
  const [featuredLinksRetail, setFeaturedLinksRetail] = useState<FeaturedLink[]>([]);
  const [search, setSearch] = useState('');
  const [offersModalOpen, setOffersModalOpen] = useState(false); // controls the Special Offers modal
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);

  // Fetch live StepsDoor storefront subscribers (both online and retail)
  // and both segments' admin-curated featured links once on mount, so
  // switching the segmented row never triggers a refetch. Failures are
  // swallowed so the static directories still render.
  useEffect(() => {
    storeService.list().then(({ data }) => setSubscribedOnline(data.results ?? data)).catch(() => {});
    storeService.listRetail().then(({ data }) => setSubscribedRetail(data.results ?? data)).catch(() => {});
    storeService.listFeaturedLinks({ target_page: 'shopping' }).then(({ data }) => setFeaturedLinksShopping(data.results ?? data)).catch(() => {});
    storeService.listFeaturedLinks({ target_page: 'retail' }).then(({ data }) => setFeaturedLinksRetail(data.results ?? data)).catch(() => {});
  }, []);

  const isOnline = segment === 'online';
  // Active segment's static directory, flattened list, and subscribed stores.
  const groups = isOnline ? SHOPPING_GROUPS : RETAIL_GROUPS;
  const allStores = isOnline ? ALL_STORES : ALL_RETAIL_STORES;
  const subscribedStores = isOnline ? subscribedOnline : subscribedRetail;
  const featuredLinks = isOnline ? featuredLinksShopping : featuredLinksRetail;

  // Parse every `offers_links` field from the active segment's subscribed
  // stores, then append any standalone admin-curated FeaturedLink offer
  // entries for that same segment.
  const offerEntries: OfferEntry[] = useMemo(() => [
    ...subscribedStores.flatMap(store => {
      if (!store.offers_links) return [];
      return store.offers_links
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean) // drop blank lines
        .map(url => ({
          url,
          storeName: store.name,
          storeLogo: store.logo,
          storeId: store.id,
          description: '',
        }));
    }),
    // Standalone FeaturedLink offer entries (not tied to any Store)
    ...featuredLinks
      .filter(fl => fl.link_type === 'offer')
      .map(fl => ({ url: fl.url, storeName: fl.label, storeLogo: fl.logo, storeId: fl.id, description: fl.description || '' })),
  ], [subscribedStores, featuredLinks]);

  const isSearching = search.trim().length > 0;
  const q = search.toLowerCase();

  // Search results — spans all categories in the active segment, ignoring
  // the active group filter (there is none here; this list has no
  // per-group filter UI, just the full directory or search results).
  const searchResults = allStores.filter(
    s =>
      s.name.toLowerCase().includes(q) ||
      s.desc.toLowerCase().includes(q) ||
      s.groupLabel.toLowerCase().includes(q)
  );

  // SectionList sections: each active-segment group becomes a section.
  // When searching, collapse everything into a single "Results" section.
  const sections = isSearching
    ? [{ id: 'results', label: `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${search}"`, data: searchResults }]
    : groups;

  /**
   * Opens a subscribed store's site via the click-tracking endpoint so
   * analytics are recorded. Falls back to the raw URL on error. Works for
   * either segment — the backend `Store` model is unified across
   * `store_type`s and the click endpoint doesn't care which one it is.
   */
  const handleSubscribedStorePress = useCallback(
    async (store: SubscribedStore) => {
      try {
        const { data } = await storeService.click(store.id);
        const url = data.redirect_url || store.website_url;
        if (await Linking.canOpenURL(url)) await Linking.openURL(url);
      } catch {
        // Fallback: open the raw URL if the click-tracking call fails
        try {
          if (await Linking.canOpenURL(store.website_url))
            await Linking.openURL(store.website_url);
        } catch { /* noop */ }
      }
    },
    []
  );

  return (
    <ScreenWrapper>
      {/* Segmented row — always rendered, regardless of which segment is
          active, so switching between Online/Retail never feels like
          leaving this screen (same pattern as HomeScreen's Jobs/Govt
          Jobs/Companies segments). Resets the search box on switch so a
          query typed for one segment doesn't silently filter the other. */}
      <View style={styles.segmentedRow}>
        <TouchableOpacity
          style={[styles.segment, isOnline && styles.segmentActive]}
          onPress={() => { setSegment('online'); setSearch(''); }}
          activeOpacity={0.75}
        >
          <Text style={styles.segmentIcon}>🛍️</Text>
          <Text style={[styles.segmentLabel, isOnline && styles.segmentLabelActive]}>Online Stores</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, !isOnline && styles.segmentActive]}
          onPress={() => { setSegment('retail'); setSearch(''); }}
          activeOpacity={0.75}
        >
          <Text style={styles.segmentIcon}>🏪</Text>
          <Text style={[styles.segmentLabel, !isOnline && styles.segmentLabelActive]}>Retail Chains</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => item.name + index}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}

        // ── Page header (rendered once above all sections) ───────────────
        ListHeaderComponent={
          <View>
            {/* Title + subtitle */}
            <View style={styles.pageHeader}>
              <Text style={styles.pageTitle}>{isOnline ? 'Shopping & Stores' : 'Retail Stores'}</Text>
              <Text style={styles.pageSubtitle}>
                {allStores.length} {isOnline ? 'online stores' : 'offline retail chains'} across {groups.length} categories
                {' '}— {isOnline ? 'direct links to official Indian shopping sites.' : 'find stores, check websites & locate branches near you.'}
              </Text>

              {/* Special Offers button — only shown when offer links exist */}
              {offerEntries.length > 0 && (
                <TouchableOpacity
                  style={styles.offersButton}
                  activeOpacity={0.8}
                  onPress={() => setOffersModalOpen(true)}
                >
                  <Text style={styles.offersButtonIcon}>🏷️</Text>
                  <Text style={styles.offersButtonLabel}>Special Offers</Text>
                  <Text style={styles.offersButtonCount}>
                    {offerEntries.length} deal{offerEntries.length !== 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Search bar */}
            <View style={styles.searchBar}>
              <TextInput
                style={styles.searchInput}
                placeholder={isOnline ? 'Search stores or categories...' : 'Search retail chains or categories...'}
                placeholderTextColor={Colors.textMuted}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>

            {/* Featured subscribed stores for the active segment (only when not searching and data is present) */}
            {!isSearching && subscribedStores.length > 0 && (
              <View style={styles.featuredSection}>
                <Text style={styles.featuredHeading}>
                  ✓ {isOnline ? 'Featured Stores' : 'Retail Stores'} on StepsDoor
                </Text>
                {subscribedStores.map(store => (
                  <TouchableOpacity
                    key={store.id}
                    style={styles.featuredCard}
                    activeOpacity={0.75}
                    onPress={() => handleSubscribedStorePress(store)}
                  >
                    {store.logo ? (
                      <Image
                        source={{ uri: store.logo }}
                        style={styles.featuredLogo}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.featuredLogoFallback}>
                        <Text style={styles.featuredLogoFallbackIcon}>{isOnline ? '🛍️' : '🏪'}</Text>
                      </View>
                    )}
                    <View style={styles.featuredInfo}>
                      <Text style={styles.featuredName} numberOfLines={1}>{store.name}</Text>
                      {store.tagline ? (
                        <Text style={styles.featuredTagline} numberOfLines={1}>{store.tagline}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.featuredArrow}>↗</Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.divider} />
              </View>
            )}
          </View>
        }

        // ── Section header: category label + store count ─────────────────
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>{section.label}</Text>
            {!isSearching && (
              <Text style={styles.sectionCount}>{section.data.length} stores</Text>
            )}
          </View>
        )}

        // ── Each store row ───────────────────────────────────────────────
        renderItem={({ item }) => (
          <StoreCard store={item} />
        )}

        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No stores match your search.</Text>
          </View>
        }
      />

      {/* Special Offers modal — mounted at the root so it layers above everything */}
      {offersModalOpen && (
        <SpecialOffersModal
          entries={offerEntries}
          onClose={() => setOffersModalOpen(false)}
        />
      )}
    </ScreenWrapper>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  listContent: { paddingBottom: Spacing[10] },

  // ── Segmented row (Online Stores / Retail Chains) ─────────────────────────
  segmentedRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  segmentIcon: { fontSize: 14 },
  segmentLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.primary },
  segmentLabelActive: { color: Colors.white },

  // ── Page header ──────────────────────────────────────────────────────────
  pageHeader: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[5],
    paddingBottom: Spacing[3],
    backgroundColor: Colors.primary,
  },
  pageTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  pageSubtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    lineHeight: 18,
  },

  // ── Special Offers trigger button ─────────────────────────────────────────
  offersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing[3],
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7ED', // orange-50 equivalent
    borderWidth: 1,
    borderColor: '#FED7AA',     // orange-200
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  offersButtonIcon: { fontSize: 14 },
  offersButtonLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#C2410C', // orange-700
  },
  offersButtonCount: {
    fontSize: FontSize.xs,
    color: '#EA580C', // orange-500
    marginLeft: 2,
  },

  // ── Search bar ────────────────────────────────────────────────────────────
  searchBar: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInput: {
    height: 40,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing[3],
    fontSize: FontSize.sm,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // ── Featured subscribed stores ────────────────────────────────────────────
  featuredSection: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
  },
  featuredHeading: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginBottom: Spacing[2],
  },
  featuredCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[3],
    marginBottom: Spacing[2],
  },
  featuredLogo: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
  },
  featuredLogoFallback: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredLogoFallbackIcon: { fontSize: 20 },
  featuredInfo: { flex: 1, marginLeft: Spacing[3] },
  featuredName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  featuredTagline: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  featuredArrow: {
    fontSize: FontSize.base,
    color: Colors.textMuted,
    marginLeft: Spacing[2],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: Spacing[4],
    marginBottom: Spacing[2],
  },

  // ── Section header ────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[2],
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    flex: 1,
  },
  sectionCount: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },

  // ── Static store row ──────────────────────────────────────────────────────
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[2],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[3],
  },
  storeCardBody: { flex: 1 },
  storeCardTop: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 2 },
  storeCardName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  storeTag: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  storeTagText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  storeCardCategory: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  storeCardDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  storeCardArrow: {
    fontSize: FontSize.base,
    color: Colors.textMuted,
    marginLeft: Spacing[2],
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyWrap: {
    paddingVertical: Spacing[10],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSize.base,
    color: Colors.textMuted,
  },

  // ── Special Offers modal ──────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end', // sheet slides up from the bottom
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '75%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing[2],
  },
  modalTagIcon: { fontSize: 16 },
  modalTitle: {
    flex: 1,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  modalCount: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginRight: Spacing[2],
  },
  modalClose: {
    padding: Spacing[1],
  },
  modalCloseText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  modalList: {
    padding: Spacing[4],
    gap: Spacing[2],
  },

  // ── Offer card (inside modal) ─────────────────────────────────────────────
  offerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED', // orange-50
    borderWidth: 1,
    borderColor: '#FED7AA',     // orange-200
    borderRadius: BorderRadius.lg,
    padding: Spacing[3],
    marginBottom: Spacing[2],
  },
  offerLogo: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
  },
  offerLogoFallback: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: '#FDBA74', // orange-300
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerLogoFallbackIcon: { fontSize: 16 },
  offerTextWrap: { flex: 1, marginLeft: Spacing[3] },
  offerStoreName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#7C2D12', // orange-900
  },
  offerHost: {
    fontSize: FontSize.xs,
    color: '#EA580C', // orange-600
    marginTop: 1,
  },
  offerArrow: {
    fontSize: FontSize.base,
    color: '#FB923C', // orange-400
    marginLeft: Spacing[2],
  },
});
