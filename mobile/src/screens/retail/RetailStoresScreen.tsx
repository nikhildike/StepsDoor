/**
 * RetailStoresScreen.tsx
 *
 * Root screen of the "Retail" bottom tab. Shows a static, hand-curated
 * directory of well-known Indian offline retail chains grouped by category,
 * with a search bar that filters across all groups. Subscribed StepsDoor
 * retail storefronts are fetched live (storeService.listRetail()) and shown
 * as "Featured Stores" at the top.
 *
 * If any subscribed retail store has `offers_links` set, a "Special Offers"
 * button appears below the header — tapping it opens a Modal bottom sheet
 * listing every offer link, mirroring the web RetailStores page behaviour.
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
// Static retail-store directory (mirrors RETAIL_GROUPS in frontend/src/pages/public/RetailStores.jsx)
// ---------------------------------------------------------------------------

interface StoreEntry {
  name: string;
  url: string;
  desc: string;
  tag?: string;
}

interface RetailGroup {
  id: string;
  label: string;
  stores: StoreEntry[];
}

const RETAIL_GROUPS: RetailGroup[] = [
  {
    id: 'supermarkets',
    label: 'Supermarkets & Grocery',
    stores: [
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
    stores: [
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
    stores: [
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
    stores: [
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
    stores: [
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
    stores: [
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
    stores: [
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
    stores: [
      { name: 'Decathlon',    url: 'https://www.decathlon.in',          desc: "World's largest sporting goods chain" },
      { name: 'Nike India',   url: 'https://www.nike.com/in',           desc: 'Nike performance & lifestyle stores' },
      { name: 'Adidas India', url: 'https://www.adidas.co.in',          desc: 'Adidas performance & originals stores' },
      { name: 'Puma',         url: 'https://in.puma.com',               desc: 'Puma sport & lifestyle stores' },
    ],
  },
  {
    id: 'home',
    label: 'Home & Furniture',
    stores: [
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
    stores: [
      { name: 'Crossword',        url: 'https://www.crossword.in',          desc: "India's largest book retail chain" },
      { name: 'Higginbothams',    url: 'https://www.higginbothams.com',      desc: "India's oldest bookstore chain (since 1844)" },
      { name: 'Oxford Bookstore', url: 'https://www.oxfordbookstore.com',   desc: 'Premium book & stationery stores' },
      { name: 'William Penn',     url: 'https://www.williampenn.in',        desc: 'Premium stationery & pen stores' },
    ],
  },
  {
    id: 'food',
    label: 'Food & QSR Chains',
    stores: [
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
    stores: [
      { name: 'Bosch Car Service',     url: 'https://www.boschcarservice.com',     desc: 'Authorised Bosch service & accessories' },
      { name: 'Castrol Service',       url: 'https://www.castrol.com/en_in',       desc: 'Castrol oil & service centres' },
      { name: 'Mahindra First Choice', url: 'https://www.mahindrafirstchoice.com', desc: 'Multi-brand used car & service stores' },
    ],
  },
];

// Flattened list used for search — each entry carries its group label so
// search results can display a category subtitle.
const ALL_RETAIL_STORES = RETAIL_GROUPS.flatMap(g =>
  g.stores.map(s => ({ ...s, groupLabel: g.label }))
);

// ---------------------------------------------------------------------------
// Subscribed store shape returned by storeService.listRetail()
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
  storeLogo?: string;
  storeId: number;
}

// ---------------------------------------------------------------------------
// SpecialOffersModal
// ---------------------------------------------------------------------------

/**
 * Bottom-sheet modal listing every Special Offer link from subscribed retail
 * stores. Closed by tapping the backdrop or the × button.
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
   * Opens an offer URL in the device's default browser. Errors are swallowed
   * silently so the UI doesn't crash on a bad URL.
   */
  const openUrl = useCallback(async (url: string) => {
    try {
      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    } catch { /* noop */ }
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
        {/* Stop propagation so tapping the sheet itself doesn't close it */}
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
              // Derive a readable host label (e.g. "www.apollo.in" → "apollo.in")
              let hostLabel = item.url;
              try {
                hostLabel = new URL(item.url).hostname.replace(/^www\./, '');
              } catch { /* keep raw url */ }
              return (
                <TouchableOpacity
                  style={styles.offerCard}
                  activeOpacity={0.75}
                  onPress={() => openUrl(item.url)}
                >
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
                    <Text style={styles.offerStoreName} numberOfLines={1}>{item.storeName}</Text>
                    <Text style={styles.offerHost} numberOfLines={1}>{hostLabel}</Text>
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
// StoreCard — one static-directory retail-chain row
// ---------------------------------------------------------------------------

/**
 * A tappable row for a single static-directory retail chain. Opens the
 * store's official website in the system browser on press.
 *
 * @param store - A store entry from RETAIL_GROUPS, optionally augmented with
 *   its group's `groupLabel` (shown in search results).
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
// RetailStoresScreen
// ---------------------------------------------------------------------------

/**
 * Renders the Retail Stores tab: a header with the "Special Offers" trigger
 * button (when any subscribed retail store has offer links), a search bar, and
 * a SectionList that shows either the full grouped directory or search results.
 * Subscribed StepsDoor retail stores are fetched once on mount and displayed as
 * "Featured Stores" above the directory groups.
 *
 * No route params consumed; `navigation` is unused (no nested drill-down).
 */
export function RetailStoresScreen() {
  const [subscribedStores, setSubscribedStores] = useState<SubscribedStore[]>([]);
  const [search, setSearch] = useState('');
  const [offersModalOpen, setOffersModalOpen] = useState(false); // controls Special Offers modal

  // Fetch live StepsDoor retail-store subscribers once on mount. Failures are
  // swallowed so the static directory still renders regardless.
  useEffect(() => {
    storeService
      .listRetail()
      .then(({ data }) => setSubscribedStores(data.results ?? data))
      .catch(() => {});
  }, []);

  // Parse every `offers_links` field (newline-separated URLs) from subscribed
  // retail stores into a flat OfferEntry array for the modal.
  const offerEntries: OfferEntry[] = subscribedStores.flatMap(store => {
    if (!store.offers_links) return [];
    return store.offers_links
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(url => ({
        url,
        storeName: store.name,
        storeLogo: store.logo,
        storeId: store.id,
      }));
  });

  const isSearching = search.trim().length > 0;
  const q = search.toLowerCase();

  const searchResults = ALL_RETAIL_STORES.filter(
    s =>
      s.name.toLowerCase().includes(q) ||
      s.desc.toLowerCase().includes(q) ||
      s.groupLabel.toLowerCase().includes(q)
  );

  // SectionList sections: each RETAIL_GROUPS entry becomes a section.
  // While searching, collapse everything into a single "Results" section.
  const sections = isSearching
    ? [{ id: 'results', label: `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${search}"`, stores: searchResults }]
    : RETAIL_GROUPS;

  /**
   * Opens a subscribed retail store via the click-tracking endpoint so
   * analytics are recorded, with a fallback to the raw URL on error.
   */
  const handleSubscribedStorePress = useCallback(
    async (store: SubscribedStore) => {
      try {
        const { data } = await storeService.click(store.id);
        const url = data.redirect_url || store.website_url;
        if (await Linking.canOpenURL(url)) await Linking.openURL(url);
      } catch {
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

        // ── Page header ───────────────────────────────────────────────────
        ListHeaderComponent={
          <View>
            {/* Title + subtitle */}
            <View style={styles.pageHeader}>
              <Text style={styles.pageTitle}>Retail Stores</Text>
              <Text style={styles.pageSubtitle}>
                {ALL_RETAIL_STORES.length} offline retail chains across {RETAIL_GROUPS.length} categories
                {' '}— find stores, check websites & locate branches near you.
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

            {/* Featured subscribed retail stores (only when not searching) */}
            {!isSearching && subscribedStores.length > 0 && (
              <View style={styles.featuredSection}>
                <Text style={styles.featuredHeading}>✓ Retail Stores on StepsDoor</Text>
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
                        <Text style={styles.featuredLogoFallbackIcon}>🏪</Text>
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

        // ── Section header: category label + chain count ──────────────────
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>{section.label}</Text>
            {!isSearching && (
              <Text style={styles.sectionCount}>{section.stores.length} chains</Text>
            )}
          </View>
        )}

        // ── Each store row ────────────────────────────────────────────────
        renderItem={({ item }) => (
          <StoreCard store={item} />
        )}

        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No stores match your search.</Text>
          </View>
        }
      />

      {/* Special Offers modal — mounted at root so it layers above everything */}
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
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  offersButtonIcon: { fontSize: 14 },
  offersButtonLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#C2410C',
  },
  offersButtonCount: {
    fontSize: FontSize.xs,
    color: '#EA580C',
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

  // ── Featured subscribed retail stores ─────────────────────────────────────
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
    justifyContent: 'flex-end',
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
  modalClose: { padding: Spacing[1] },
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
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
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
    backgroundColor: '#FDBA74',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerLogoFallbackIcon: { fontSize: 16 },
  offerTextWrap: { flex: 1, marginLeft: Spacing[3] },
  offerStoreName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#7C2D12',
  },
  offerHost: {
    fontSize: FontSize.xs,
    color: '#EA580C',
    marginTop: 1,
  },
  offerArrow: {
    fontSize: FontSize.base,
    color: '#FB923C',
    marginLeft: Spacing[2],
  },
});
