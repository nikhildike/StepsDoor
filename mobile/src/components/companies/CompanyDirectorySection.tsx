/**
 * components/companies/CompanyDirectorySection.tsx
 *
 * "India Company Career Directory" section — direct outbound links to
 * major Indian/MNC companies' own careers portals (StepsDoor doesn't host
 * these listings, it's a curated jump-off directory). Mirrors the bottom
 * section of `frontend/src/pages/public/Companies.jsx`.
 *
 * Two modes:
 *  - `full`: search box + a single "sector" button that opens a modal
 *    picker (all 29 sectors would be too many chips to lay out inline) +
 *    the whole filtered directory, shown unfiltered by default. Rendered
 *    below the StepsDoor subscriber companies list in
 *    `HomeScreen`'s Companies segment (`Jobs` tab), matching where the
 *    equivalent section lives on the web Companies page.
 *  - `compact`: a small fixed excerpt (first `compactCount` entries, no
 *    filters/search) with a one-line hint. Rendered below the open
 *    positions list on `CompanyCareersScreen` so a job seeker who isn't
 *    interested in that one company can still discover others.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COMPANY_DIRECTORY, SECTORS_ORDERED } from '@/data/companyDirectory';
import { CareerLinkCard } from './CareerLinkCard';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

interface Props {
  // 'full' = filterable/searchable whole directory; 'compact' = a short,
  // static excerpt with no controls. Defaults to 'full'.
  mode?: 'full' | 'compact';
  // Number of entries to show in compact mode. Ignored in full mode.
  compactCount?: number;
}

/**
 * Renders the static career directory, in either its full (filterable) or
 * compact (excerpt) form — see the file-level doc comment above for where
 * each mode is used.
 */
export function CompanyDirectorySection({ mode = 'full', compactCount = 6 }: Props) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  // Directory-only search box text (full mode only).
  const [search, setSearch] = useState('');
  // Active sector filter; 'all' shows every sector, so the full directory
  // is what's displayed by default when the Companies tab opens.
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  // Whether the sector-picker modal (opened via the single "Sectors"
  // button, replacing a 29-chip row) is visible. Full mode only.
  const [sectorModalOpen, setSectorModalOpen] = useState(false);

  // Entries matching the active sector + search box, recomputed only when
  // either changes. In compact mode this is unused (a fixed slice is shown instead).
  const filtered = useMemo(() => {
    if (mode !== 'full') return [];
    const q = search.trim().toLowerCase();
    return COMPANY_DIRECTORY.filter((c) => {
      const matchesSector = sectorFilter === 'all' || c.sector === sectorFilter;
      const matchesSearch = !q ||
        c.name.toLowerCase().includes(q) ||
        c.desc.toLowerCase().includes(q) ||
        c.sector.toLowerCase().includes(q);
      return matchesSector && matchesSearch;
    });
  }, [mode, search, sectorFilter]);

  if (mode === 'compact') {
    const excerpt = COMPANY_DIRECTORY.slice(0, compactCount);
    return (
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Ionicons name="business-outline" size={18} color={Colors.primary} />
          <Text style={styles.heading}>Explore More Companies</Text>
        </View>
        <Text style={styles.subheading}>
          Not the right fit? Browse careers pages of other major Indian companies.
        </Text>
        {excerpt.map((entry) => (
          <CareerLinkCard key={`${entry.name}-${entry.sector}`} entry={entry} />
        ))}
        <Text style={styles.disclaimer}>
          Career links go directly to official company portals. StepsDoor is not affiliated
          with any listed company.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Ionicons name="business-outline" size={20} color={Colors.primary} />
        <Text style={styles.heading}>India Company Career Directory</Text>
      </View>
      <Text style={styles.subheading}>
        Direct links to careers pages of {COMPANY_DIRECTORY.length}+ major Indian & MNC companies.
      </Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search companies or sectors..."
        placeholderTextColor={Colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      {/* Single button opens the sector-picker modal below, instead of a
          29-chip row that would otherwise dominate the screen. */}
      <TouchableOpacity style={styles.sectorButton} onPress={() => setSectorModalOpen(true)} activeOpacity={0.75}>
        <Ionicons name="filter-outline" size={15} color={Colors.primary} />
        <Text style={styles.sectorButtonText} numberOfLines={1}>
          {sectorFilter === 'all' ? 'All Sectors' : sectorFilter}
        </Text>
        <Ionicons name="chevron-down" size={15} color={Colors.textMuted} />
      </TouchableOpacity>

      <Text style={styles.countLabel}>
        {filtered.length} of {COMPANY_DIRECTORY.length} companies
      </Text>

      {filtered.length === 0 ? (
        <Text style={styles.emptyText}>No companies match your search.</Text>
      ) : (
        filtered.map((entry) => (
          <CareerLinkCard key={`${entry.name}-${entry.sector}`} entry={entry} />
        ))
      )}

      <Text style={styles.disclaimer}>
        Career links go directly to official company portals. StepsDoor is not affiliated with
        any listed company. Always verify job openings on the official careers page before applying.
      </Text>

      {/* Sector picker — a bottom-sheet-style modal listing "All Sectors"
          plus every entry in SECTORS_ORDERED; tapping one applies the
          filter above and closes the modal. */}
      <Modal
        visible={sectorModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSectorModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSectorModalOpen(false)}
        >
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.modalTitle}>Filter by Sector</Text>
            <ScrollView style={styles.modalList}>
              <SectorOption
                label="All Sectors"
                isActive={sectorFilter === 'all'}
                onPress={() => { setSectorFilter('all'); setSectorModalOpen(false); }}
              />
              {SECTORS_ORDERED.map((s) => (
                <SectorOption
                  key={s}
                  label={s}
                  isActive={sectorFilter === s}
                  onPress={() => { setSectorFilter(s); setSectorModalOpen(false); }}
                />
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

/**
 * One selectable row inside the sector-picker modal — the sector's label,
 * with a checkmark when it's the active filter.
 */
function SectorOption({ label, isActive, onPress }: { label: string; isActive: boolean; onPress: () => void }) {
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
  section: { marginTop: Spacing[6], paddingTop: Spacing[5], borderTopWidth: 1, borderTopColor: Colors.border },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  heading: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  subheading: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: Spacing[3] },
  searchInput: {
    height: 40,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing[3],
    fontSize: FontSize.sm,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing[3],
  },
  // Single button that opens the sector-picker modal, replacing what used
  // to be a 29-chip wrapped row.
  sectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginBottom: Spacing[3],
    maxWidth: '100%',
  },
  sectorButtonText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text, flexShrink: 1 },
  countLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing[3] },
  emptyText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing[6] },
  disclaimer: { fontSize: 11, color: Colors.textMuted, marginTop: Spacing[3], lineHeight: 16 },

  // Sector picker modal
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
