/**
 * components/alerts/KeywordInput.tsx
 *
 * The job alert form's "Role / keyword" field with suggestions while typing:
 * phrases from open job titles (GET /api/alerts/suggestions/?q=…), each with how
 * many open jobs mention it, listed under the field as tappable rows. Tapping
 * one fills the field and hides the list until the user types again. Free text
 * is always allowed.
 *
 * Used by AlertsScreen's job alert form; the screen's ScrollView sets
 * `keyboardShouldPersistTaps="handled"` so a suggestion can be tapped with the
 * keyboard open. Mirrors the web `frontend/src/components/alerts/KeywordAutocomplete.jsx`.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { seekerService } from '@/services/seekerService';
import { Input } from '@/components/common/Input';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

const DEBOUNCE_MS = 250; // wait for a pause in typing before asking the server
const MIN_CHARS = 2;     // the API suggests nothing for shorter text
const MAX_SHOWN = 6;     // keep the list short on a phone

/**
 * Props for `KeywordInput`.
 * - `value` / `onChangeText`: the field's text (controlled by the screen).
 * - `label`, `placeholder`: passed to the underlying Input.
 */
interface Props {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  placeholder?: string;
}

/** KeywordInput — see `Props`. */
export function KeywordInput({ value, onChangeText, label, placeholder }: Props) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  const [suggestions, setSuggestions] = useState<{ keyword: string; count: number }[]>([]);
  const typedRef = useRef(false); // only suggest after the user types (not after picking one)
  const latestRef = useRef('');   // the text the newest request was for

  // Fetch after a pause in typing; ignore responses for older text.
  useEffect(() => {
    const q = value.trim();
    if (!typedRef.current || q.length < MIN_CHARS) {
      setSuggestions([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      latestRef.current = q;
      seekerService.keywordSuggestions(q)
        .then(({ data }) => {
          if (latestRef.current !== q) return;
          // Nothing to suggest if the only option is exactly what's typed.
          const onlyEcho = data.length === 1 && data[0].keyword.toLowerCase() === q.toLowerCase();
          setSuggestions(onlyEcho ? [] : data.slice(0, MAX_SHOWN));
        })
        .catch(() => setSuggestions([]));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);

  /** Fill the field with a suggestion and hide the list. */
  const pick = (keyword: string) => {
    typedRef.current = false;
    setSuggestions([]);
    onChangeText(keyword);
  };

  return (
    <View>
      <Input
        label={label}
        placeholder={placeholder}
        value={value}
        autoCorrect={false}
        onChangeText={(text) => { typedRef.current = true; onChangeText(text); }}
      />
      {suggestions.length > 0 && (
        <View style={styles.list} accessibilityRole="list">
          {suggestions.map((s, i) => (
            <TouchableOpacity key={s.keyword} style={[styles.row, i > 0 && styles.rowBorder]} onPress={() => pick(s.keyword)}
              accessibilityRole="button" accessibilityLabel={`Use ${s.keyword}, ${s.count} jobs`}>
              <Text style={styles.keyword} numberOfLines={1}>{s.keyword}</Text>
              <Text style={styles.count}>{s.count.toLocaleString('en-IN')} job{s.count === 1 ? '' : 's'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  list: {
    marginTop: Spacing[1],
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing[2], paddingHorizontal: Spacing[3], paddingVertical: Spacing[2] },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  keyword: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text },
  count: { fontSize: FontSize.xs, color: Colors.textSecondary },
});
