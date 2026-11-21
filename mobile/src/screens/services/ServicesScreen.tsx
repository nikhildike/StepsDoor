/**
 * ServicesScreen.tsx
 *
 * Root screen of the "Services" bottom tab — a directory of local service
 * providers (lawyers, plumbers, mechanics, electricians, etc.), each shown
 * with its category, address/location, and tap-to-call/WhatsApp contact
 * buttons. Takes the tab bar slot the standalone "Retail" tab used to
 * occupy (retail store browsing was merged into the Shopping tab — see
 * `ShoppingScreen`'s "Retail Chains" segment). Unlike the static Shopping/
 * Retail directories, this data is real and database-backed
 * (`backend/apps/services`), curated via Django admin — there is no
 * self-service registration flow yet.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { serviceProviderService } from '@/services/serviceProviderService';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

// Category value -> display label, mirrors backend
// `apps.services.models.SERVICE_CATEGORIES`. Kept as a local constant
// (like `JOB_TYPE_LABELS` elsewhere in the app) rather than a separate API
// call, since this list changes rarely.
const SERVICE_CATEGORIES: { value: string; label: string }[] = [
  { value: 'lawyer', label: 'Lawyer' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'mechanic', label: 'Mechanic' },
  { value: 'carpenter', label: 'Carpenter' },
  { value: 'painter', label: 'Painter' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'appliance_repair', label: 'Appliance Repair' },
  { value: 'ac_repair', label: 'AC & Refrigeration Repair' },
  { value: 'computer_repair', label: 'Computer & Mobile Repair' },
  { value: 'salon_beauty', label: 'Salon & Beauty' },
  { value: 'tutor', label: 'Tutor / Coaching' },
  { value: 'caterer', label: 'Caterer' },
  { value: 'photographer', label: 'Photographer' },
  { value: 'cleaning', label: 'Home Cleaning' },
  { value: 'tailor', label: 'Tailor' },
  { value: 'packers_movers', label: 'Packers & Movers' },
  { value: 'event_planner', label: 'Event Planner' },
  { value: 'other', label: 'Other' },
];

// Small fixed palette cycled by category index — same approach as
// `data/companyDirectory.ts`'s `getSectorColors`, since RN badges need
// concrete hex values rather than CSS class names.
const CATEGORY_PALETTE: { bg: string; text: string }[] = [
  { bg: '#eff6ff', text: '#1d4ed8' },
  { bg: '#f0fdf4', text: '#15803d' },
  { bg: '#fefce8', text: '#a16207' },
  { bg: '#fdf2f8', text: '#be185d' },
  { bg: '#f5f3ff', text: '#6d28d9' },
  { bg: '#ecfeff', text: '#0e7490' },
  { bg: '#fff7ed', text: '#c2410c' },
];

/**
 * Looks up the badge colors for a service category value.
 * @param category - The `category` code on a `ServiceProviderResult`.
 * @returns A `{ bg, text }` hex pair, stable across renders for the same category.
 */
function getCategoryColors(category: string): { bg: string; text: string } {
  const index = SERVICE_CATEGORIES.findIndex((c) => c.value === category);
  return CATEGORY_PALETTE[(index >= 0 ? index : 0) % CATEGORY_PALETTE.length];
}

// Shape of a provider returned by `serviceProviderService.list()` — matches `ServiceProviderSerializer`.
interface ServiceProviderResult {
  id: number;
  name: string;
  category: string;
  category_display: string;
  description?: string;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  photo?: string | null;
}

/**
 * One service provider card: name, category badge, address, and
 * tap-to-call/WhatsApp buttons (WhatsApp only shown when the provider set
 * a number).
 *
 * @param provider - The provider to render (see `ServiceProviderResult` above).
 */
function ServiceProviderCard({ provider }: { provider: ServiceProviderResult }) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  const categoryColors = getCategoryColors(provider.category);

  const call = () => Linking.openURL(`tel:${provider.phone}`);
  const whatsapp = () => Linking.openURL(`https://wa.me/${provider.whatsapp!.replace(/[^\d]/g, '')}`);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.name} numberOfLines={1}>{provider.name}</Text>
        <View style={[styles.badge, { backgroundColor: categoryColors.bg }]}>
          <Text style={[styles.badgeText, { color: categoryColors.text }]} numberOfLines={1}>
            {provider.category_display}
          </Text>
        </View>
      </View>

      {provider.description ? (
        <Text style={styles.description} numberOfLines={2}>{provider.description}</Text>
      ) : null}

      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.address} numberOfLines={2}>
          {provider.address}
          {provider.city ? `, ${provider.city}` : ''}
          {provider.state ? `, ${provider.state}` : ''}
          {provider.pincode ? ` - ${provider.pincode}` : ''}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.callButton} activeOpacity={0.8} onPress={call}>
          <Ionicons name="call-outline" size={14} color={Colors.white} />
          <Text style={styles.callButtonText}>Call</Text>
        </TouchableOpacity>
        {provider.whatsapp ? (
          <TouchableOpacity style={styles.whatsappButton} activeOpacity={0.8} onPress={whatsapp}>
            <Ionicons name="logo-whatsapp" size={14} color="#15803d" />
            <Text style={styles.whatsappButtonText}>WhatsApp</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Renders the Services tab: a search bar, a single "Category" button that
 * opens a modal picker (mirroring `CompanyDirectorySection`'s sector
 * picker), and the resulting list of local service providers. Reads no
 * route params; `navigation` is unused (no detail drill-down — a card's
 * call/WhatsApp buttons are the only actions). Use case: default landing
 * view of the Services tab, letting a job seeker find a nearby lawyer,
 * plumber, mechanic, etc.
 */
export function ServicesScreen() {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  const [providers, setProviders] = useState<ServiceProviderResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // Fetches providers from GET /services/?search=...&category=... whenever
  // the search term or category filter changes (including the initial load).
  useEffect(() => {
    setLoading(true);
    serviceProviderService
      .list({ search, category: category === 'all' ? undefined : category })
      .then(({ data }) => setProviders(data.results ?? data))
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  }, [search, category]);

  const activeCategoryLabel = category === 'all'
    ? 'All Categories'
    : SERVICE_CATEGORIES.find((c) => c.value === category)?.label ?? 'All Categories';

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.title}>Local Services</Text>
        <Text style={styles.subtitle}>Find lawyers, plumbers, mechanics & more near you</Text>
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search services, providers, or areas..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.categoryButton} onPress={() => setCategoryModalOpen(true)} activeOpacity={0.75}>
          <Ionicons name="filter-outline" size={15} color={Colors.primary} />
          <Text style={styles.categoryButtonText} numberOfLines={1}>{activeCategoryLabel}</Text>
          <Ionicons name="chevron-down" size={15} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <Spinner />
      ) : (
        <FlatList
          data={providers}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <ServiceProviderCard provider={item} />}
          ListEmptyComponent={
            <EmptyState
              title="No service providers found"
              description="Try a different search term or category."
            />
          }
        />
      )}

      {/* Category picker — a bottom-sheet-style modal listing "All
          Categories" plus every entry in SERVICE_CATEGORIES; tapping one
          applies the filter above and closes the modal. */}
      <Modal
        visible={categoryModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setCategoryModalOpen(false)}
        >
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.modalTitle}>Filter by Category</Text>
            <ScrollView style={styles.modalList}>
              <CategoryOption
                label="All Categories"
                isActive={category === 'all'}
                onPress={() => { setCategory('all'); setCategoryModalOpen(false); }}
              />
              {SERVICE_CATEGORIES.map((c) => (
                <CategoryOption
                  key={c.value}
                  label={c.label}
                  isActive={category === c.value}
                  onPress={() => { setCategory(c.value); setCategoryModalOpen(false); }}
                />
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScreenWrapper>
  );
}

/**
 * One selectable row inside the category-picker modal — the category's
 * label, with a checkmark when it's the active filter.
 */
function CategoryOption({ label, isActive, onPress }: { label: string; isActive: boolean; onPress: () => void }) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  return (
    <TouchableOpacity style={styles.modalOption} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.modalOptionText, isActive && styles.modalOptionTextActive]}>{label}</Text>
      {isActive && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
    </TouchableOpacity>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  header: { padding: Spacing[5], backgroundColor: Colors.primary },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.white },
  subtitle: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  searchBar: {
    padding: Spacing[4],
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing[2],
  },
  searchInput: {
    height: 44,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing[4],
    fontSize: FontSize.base,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    maxWidth: '100%',
  },
  categoryButtonText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text, flexShrink: 1 },

  list: { padding: Spacing[4] },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    marginBottom: Spacing[3],
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  name: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text, flexShrink: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.sm },
  badgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  description: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing[2] },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: Spacing[3] },
  address: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 16 },
  actionsRow: { flexDirection: 'row', gap: Spacing[2], marginTop: Spacing[3] },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  callButtonText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  whatsappButtonText: { color: '#15803d', fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  // Category picker modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing[4],
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[8],
    maxHeight: '70%',
  },
  modalTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing[3] },
  modalList: { maxHeight: '100%' },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalOptionText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  modalOptionTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
});
