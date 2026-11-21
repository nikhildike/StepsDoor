/**
 * components/common/FilterPickerButton.tsx
 *
 * A single button that opens a bottom-sheet modal listing selectable
 * options (an "All ..." entry plus every item in `options`) — the same
 * picker pattern used by `CompanyDirectorySection`'s sector filter and
 * `ServicesScreen`'s category filter, factored out here since the Tenders
 * screen and the Govt Jobs segment each need two of these (State and
 * Category), which would otherwise be four near-identical copies.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

// One selectable option — `count` is optional and, when present, shown
// alongside the label (e.g. a state's number of active listings).
export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface Props {
  // Ionicons glyph shown on the button (e.g. 'location-outline', 'pricetag-outline').
  icon: string;
  // Modal header text, e.g. "Filter by State".
  modalTitle: string;
  // Label for the "show everything" option, e.g. "All States".
  allLabel: string;
  // Selectable options, excluding the "All" entry (added internally).
  options: FilterOption[];
  // Currently selected value; '' (or any value not in `options`) means "all".
  selectedValue: string;
  // Called with the picked option's `value` (or '' for the "All" entry).
  onSelect: (value: string) => void;
}

/**
 * Renders the trigger button (shows the active selection's label) plus its
 * bottom-sheet modal picker. Fully self-contained — owns its own open/close
 * state; the caller only tracks which value is selected.
 */
export function FilterPickerButton({ icon, modalTitle, allLabel, options, selectedValue, onSelect }: Props) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  const [modalOpen, setModalOpen] = useState(false);

  const activeLabel = selectedValue
    ? options.find((o) => o.value === selectedValue)?.label ?? allLabel
    : allLabel;

  return (
    <>
      <TouchableOpacity style={styles.button} onPress={() => setModalOpen(true)} activeOpacity={0.75}>
        <Ionicons name={icon as any} size={15} color={Colors.primary} />
        <Text style={styles.buttonText} numberOfLines={1}>{activeLabel}</Text>
        <Ionicons name="chevron-down" size={15} color={Colors.textMuted} />
      </TouchableOpacity>

      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setModalOpen(false)}>
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <ScrollView style={styles.modalList}>
              <Option
                label={allLabel}
                isActive={!selectedValue}
                onPress={() => { onSelect(''); setModalOpen(false); }}
              />
              {options.map((o) => (
                <Option
                  key={o.value}
                  label={o.count != null ? `${o.label} (${o.count})` : o.label}
                  isActive={selectedValue === o.value}
                  onPress={() => { onSelect(o.value); setModalOpen(false); }}
                />
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

/** One selectable row inside the picker modal — label plus a checkmark when active. */
function Option({ label, isActive, onPress }: { label: string; isActive: boolean; onPress: () => void }) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  return (
    <TouchableOpacity style={styles.modalOption} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.modalOptionText, isActive && styles.modalOptionTextActive]} numberOfLines={1}>
        {label}
      </Text>
      {isActive && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
    </TouchableOpacity>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  button: {
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
  buttonText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text, flexShrink: 1 },

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
    gap: Spacing[2],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalOptionText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary },
  modalOptionTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
});
