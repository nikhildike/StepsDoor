/**
 * ShoppingScreen.tsx
 *
 * Root screen of the "Shopping" bottom tab. Shows a static, hand-curated
 * directory of Indian online stores grouped by category, with a search bar
 * that filters across all groups. Subscribed StepsDoor storefronts are fetched
 * live (storeService.list()) and shown as "Featured Stores" at the top.
 *
 * If any subscribed store has `offers_links` set, a "Special Offers" button
 * appears below the header — tapping it opens a Modal overlay listing every
 * offer link, mirroring the web Shopping page behaviour.
 */
import React, { useCallback, useEffect, useState } from 'react';
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
import { Colors } from '@/theme/colors';
import { BorderRadius, Spacing } from '@/theme/spacing';
import { FontSize, FontWeight } from '@/theme/typography';

// ---------------------------------------------------------------------------
// Static store directory (mirrors SHOPPING_GROUPS in frontend/src/pages/public/Shopping.jsx)
// ---------------------------------------------------------------------------

interface StoreEntry {
  name: string;
  url: string;
  desc: string;
  tag?: string;
}

interface StoreGroup {
  id: string;
  label: string;
  stores: StoreEntry[];
}

const SHOPPING_GROUPS: StoreGroup[] = [
  {
    id: 'general',
    label: 'General Marketplaces',
    stores: [
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
    stores: [
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
    stores: [
      { name: 'Bata India',    url: 'https://www.bata.in',             desc: "India's leading footwear brand" },
      { name: 'Metro Shoes',   url: 'https://www.metroshoes.com',       desc: 'Premium multi-brand footwear retail' },
      { name: 'Campus Shoes',  url: 'https://www.campusshoes.com',      desc: 'Sports & casual activewear footwear' },
      { name: 'Red Tape',      url: 'https://www.redtape.com',          desc: 'Lifestyle, formal & casual footwear' },
    ],
  },
  {
    id: 'electronics',
    label: 'Electronics & Mobiles',
    stores: [
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
    stores: [
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
    stores: [
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
    stores: [
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
    stores: [
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
    stores: [
      { name: 'Tanishq',         url: 'https://www.tanishq.co.in',              desc: 'Tata premium jewellery brand' },
      { name: 'CaratLane',       url: 'https://www.caratlane.com',              desc: 'Tanishq online fine jewellery' },
      { name: 'BlueStone',       url: 'https://www.bluestone.com',              desc: 'Online jewellery brand' },
      { name: 'GIVA',            url: 'https://www.giva.co',                    desc: 'Silver jewellery & accessories D2C' },
    ],
  },
  {
    id: 'sports',
    label: 'Sports & Fitness',
    stores: [
      { name: 'Decathlon India', url: 'https://www.decathlon.in',  desc: 'All-sports equipment & apparel' },
      { name: 'Nike India',      url: 'https://www.nike.com/in',   desc: 'Nike official India store' },
      { name: 'Adidas India',    url: 'https://www.adidas.co.in',  desc: 'Adidas official India store' },
      { name: 'Cult Sport',      url: 'https://www.cultsport.com', desc: 'Cult.fit sports & fitness gear brand' },
    ],
  },
  {
    id: 'books',
    label: 'Books & Stationery',
    stores: [
      { name: 'Amazon Books',   url: 'https://www.amazon.in/books',   desc: 'Books on Amazon India — all genres' },
      { name: 'Crossword',      url: 'https://www.crossword.in',       desc: "India's leading bookstore chain" },
      { name: 'Flipkart Books', url: 'https://www.flipkart.com/books', desc: 'Books on Flipkart' },
    ],
  },
  {
    id: 'eyewear',
    label: 'Eyewear & Watches',
    stores: [
      { name: 'Lenskart',      url: 'https://www.lenskart.com',         desc: 'Eyewear, glasses & contact lenses' },
      { name: 'Titan Watches', url: 'https://www.titan.co.in',          desc: 'Titan Company watches & accessories' },
      { name: 'Fastrack',      url: 'https://www.fastrack.in',          desc: 'Youth watches & fashion accessories' },
    ],
  },
  {
    id: 'bags',
    label: 'Bags & Luggage',
    stores: [
      { name: 'Safari Industries',  url: 'https://www.safari.in',           desc: 'Safari trolleys & travel bags' },
      { name: 'VIP Bags',           url: 'https://www.vipbags.com',          desc: 'VIP luggage & travel accessories' },
      { name: 'American Tourister', url: 'https://www.americantourister.in', desc: 'American Tourister India official' },
      { name: 'Mokobara',           url: 'https://www.mokobara.com',         desc: 'Premium modern travel bags & luggage' },
    ],
  },
];

// Flattened list used for search — each entry carries its section label so
// search results can still display a category subtitle.
const ALL_STORES = SHOPPING_GROUPS.flatMap(g =>
  g.stores.map(s => ({ ...s, groupLabel: g.label }))
);

// ---------------------------------------------------------------------------
// Subscribed store shape returned by storeService.list()
// ---------------------------------------------------------------------------

interface SubscribedStore {
  id: number;
  name: string;
  tagline?: string;
  logo?: string;
  website_url: string;
  offers_links?: string; // newline-separated list of offer URLs
}

// ---------------------------------------------------------------------------
// OfferEntry — a single offer link with the store it came from
// ---------------------------------------------------------------------------

interface OfferEntry {
  url: string;
  storeName: string;
  storeLogo?: string;
  storeId: number;
}

// ---------------------------------------------------------------------------
// SpecialOffersModal
// ---------------------------------------------------------------------------

/**
 * Full-screen modal listing every Special Offer link from subscribed stores.
 * Closed by tapping the backdrop or the × button.
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
                    <Text style={styles.offerHost} numberOfLines={1}>
                      {hostLabel}
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
 * A tappable row for a single static-directory store entry. Opens the store
 * URL in the system browser on press.
 *
 * @param store - A store entry from SHOPPING_GROUPS, possibly augmented with
 *   its section's `groupLabel` (used in search results).
 */
function StoreCard({ store }: { store: StoreEntry & { groupLabel?: string } }) {
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

/**
 * Renders the Shopping tab: a header with the "Special Offers" trigger button
 * (when any subscribed store has offer links), a search bar, and a SectionList
 * that shows either the full grouped directory or search results. Subscribed
 * StepsDoor stores are fetched once on mount and displayed as "Featured Stores"
 * above the directory groups.
 *
 * No route params consumed; `navigation` is unused (no nested drill-down).
 */
export function ShoppingScreen() {
  const [subscribedStores, setSubscribedStores] = useState<SubscribedStore[]>([]);
  const [search, setSearch] = useState('');
  const [offersModalOpen, setOffersModalOpen] = useState(false); // controls the Special Offers modal

  // Fetch live StepsDoor storefront subscribers once on mount. Failures are
  // swallowed so the static directory still renders regardless.
  useEffect(() => {
    storeService
      .list()
      .then(({ data }) => setSubscribedStores(data.results ?? data))
      .catch(() => {});
  }, []);

  // Parse every `offers_links` field (newline-separated URLs) from subscribed
  // stores into a flat array of OfferEntry objects for the modal.
  const offerEntries: OfferEntry[] = subscribedStores.flatMap(store => {
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
      }));
  });

  const isSearching = search.trim().length > 0;
  const q = search.toLowerCase();

  // Search results — spans all categories, ignoring the active group filter
  const searchResults = ALL_STORES.filter(
    s =>
      s.name.toLowerCase().includes(q) ||
      s.desc.toLowerCase().includes(q) ||
      s.groupLabel.toLowerCase().includes(q)
  );

  // SectionList sections: each SHOPPING_GROUPS entry becomes a section.
  // When searching, collapse everything into a single "Results" section.
  const sections = isSearching
    ? [{ id: 'results', label: `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${search}"`, stores: searchResults }]
    : SHOPPING_GROUPS;

  /**
   * Opens a subscribed store's site via the click-tracking endpoint so
   * analytics are recorded. Falls back to the raw URL on error.
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
              <Text style={styles.pageTitle}>Shopping & Stores</Text>
              <Text style={styles.pageSubtitle}>
                {ALL_STORES.length} online stores across {SHOPPING_GROUPS.length} categories
                {' '}— direct links to official Indian shopping sites.
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
                placeholder="Search stores or categories..."
                placeholderTextColor={Colors.textMuted}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>

            {/* Featured subscribed stores (only when not searching and data is present) */}
            {!isSearching && subscribedStores.length > 0 && (
              <View style={styles.featuredSection}>
                <Text style={styles.featuredHeading}>✓ Featured Stores on StepsDoor</Text>
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
                        <Text style={styles.featuredLogoFallbackIcon}>🛍️</Text>
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
              <Text style={styles.sectionCount}>{section.stores.length} stores</Text>
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

const styles = StyleSheet.create({
  listContent: { paddingBottom: Spacing[10] },

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
