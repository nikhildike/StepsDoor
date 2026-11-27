/**
 * components/companies/HiringCompaniesRow.tsx
 *
 * Compact, horizontally scrolling "Hiring on StepsDoor" row of companies with an
 * active StepsDoor subscription and live jobs (GET /api/companies/). Tapping a
 * card opens that company's StepsDoor careers page (via `onOpen`).
 *
 * Rendered as the header of the Jobs segment's job list in the Jobs tab
 * (`screens/jobs/HomeScreen.tsx`), so jobs and hiring companies form one block
 * with one search box — the same layout as the web Jobs page
 * (`frontend/src/components/companies/HiringCompanies.jsx`). It has no search
 * box of its own: the Jobs search text narrows the companies. Renders nothing
 * while loading or when no company matches, so the segment shows a single
 * empty state (the jobs one).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { companyService } from '@/services/companyService';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

// One subscriber company as returned by the companies list endpoint.
export interface HiringCompany {
  id: number;
  name: string;
  slug: string; // identifies its StepsDoor careers page
  logo?: string | null;
  description?: string;
  active_job_count: number;
}

/**
 * Props for `HiringCompaniesRow`.
 * - `search`: the Jobs search text; companies whose name or description contains it are shown.
 * - `onOpen`: called with a company's slug when its card is tapped (the screen navigates).
 */
interface Props {
  search?: string;
  onOpen: (slug: string) => void;
}

/**
 * HiringCompaniesRow
 *
 * Label with the company count and a horizontal list of company cards (logo,
 * name, open-position count). Props: see `Props` above.
 */
export function HiringCompaniesRow({ search = '', onOpen }: Props) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  const [companies, setCompanies] = useState<HiringCompany[]>([]); // subscriber companies with live jobs

  // Fetch the subscriber companies once on mount.
  useEffect(() => {
    companyService.list()
      .then(({ data }) => setCompanies(data.results ?? data))
      .catch(() => setCompanies([]));
  }, []);

  const q = search.trim().toLowerCase();
  const shown = q
    ? companies.filter(c => c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q))
    : companies;
  if (shown.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.label}>
        Hiring on StepsDoor <Text style={styles.labelCount}>({shown.length} compan{shown.length !== 1 ? 'ies' : 'y'})</Text>
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {shown.map(company => (
          <TouchableOpacity key={company.id} style={styles.card} activeOpacity={0.75} onPress={() => onOpen(company.slug)}
            accessibilityRole="button" accessibilityLabel={`${company.name}, ${company.active_job_count} open positions`}>
            {company.logo ? (
              <Image source={{ uri: company.logo }} style={styles.logo} resizeMode="cover" />
            ) : (
              <View style={styles.logoFallback}>
                <Ionicons name="business-outline" size={18} color={Colors.textSecondary} />
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{company.name}</Text>
              <Text style={styles.jobs}>
                {company.active_job_count} open position{company.active_job_count !== 1 ? 's' : ''}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  section: { marginBottom: Spacing[4] },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary, marginBottom: Spacing[2] },
  labelCount: { fontWeight: FontWeight.normal },
  row: { gap: Spacing[2] },
  card: {
    width: 200,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing[3],
  },
  logo: { width: 36, height: 36, borderRadius: BorderRadius.sm },
  logoFallback: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, marginLeft: Spacing[2] },
  name: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  jobs: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.primary, marginTop: 2 },
});
