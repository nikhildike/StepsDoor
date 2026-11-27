/**
 * SavedTendersScreen.tsx
 *
 * The tenders the user bookmarked (GET /api/tenders/saved/), newest first, as
 * TenderCards: tap to open the tender, the bookmark to remove it. Tenders whose
 * bidding has ended stay listed, marked "Closed". Reached from the BurgerMenu's
 * "Saved Tenders" item (root-stack screen `SavedTenders`).
 *
 * Reloads whenever the screen comes into focus (tenders may have been saved on
 * other tabs) and keeps the app-wide saved-tenders store in sync. The tender
 * counterpart of SavedJobsScreen; mirrors the web `pages/seeker/SavedTenders.jsx`.
 */
import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { tenderService, SavedTender } from '@/services/tenderService';
import { useSavedTendersStore } from '@/store/savedTendersStore';
import { useAuth } from '@/hooks/useAuth';
import { TenderCard } from '@/components/tenders/TenderCard';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { MembersOnly } from '@/components/common/MembersOnly';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize } from '@/theme/typography';
import { Spacing } from '@/theme/spacing';

/**
 * SavedTendersScreen
 *
 * `navigation` is the root stack's, used to open TenderDetail on the Tenders tab.
 */
export function SavedTendersScreen({ navigation }: { navigation: any }) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  const { isAuthenticated } = useAuth();
  const setFromList = useSavedTendersStore((s) => s.setFromList);
  const toggle = useSavedTendersStore((s) => s.toggle);
  const pending = useSavedTendersStore((s) => s.pending);
  const [items, setItems] = useState<SavedTender[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /** Fetch the saved list and sync the app-wide store with it. */
  const load = useCallback(() => tenderService.saved()
    .then(({ data }) => {
      const list: SavedTender[] = data.results ?? data;
      setItems(list);
      setFromList(list);
    })
    .catch(() => {})
    .finally(() => setLoading(false)), [setFromList]);

  // Reload each time the screen is shown.
  useFocusEffect(useCallback(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]));

  /** Remove a bookmark through the store (so cards elsewhere update), then from this list. */
  const remove = async (s: SavedTender) => {
    try {
      await toggle(s.tender);
      setItems((prev) => prev.filter((x) => x.id !== s.id));
    } catch {
      // keep it listed; the user can try again
    }
  };

  if (!isAuthenticated) return <MembersOnly what="your saved tenders" />;
  if (loading) return <Spinner />;

  return (
    <ScreenWrapper>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load().finally(() => setRefreshing(false)); }} />
        }
        ListHeaderComponent={
          items.length ? <Text style={styles.count}>{items.length} saved tender{items.length === 1 ? '' : 's'}</Text> : null
        }
        renderItem={({ item }) => (
          <TenderCard
            tender={item.details}
            closed={!item.is_open}
            onPress={() => navigation.navigate('App', { screen: 'Tenders', params: { screen: 'TenderDetail', params: { tenderId: item.tender } } })}
            save={{ saved: true, pending: !!pending[item.tender], onToggle: () => remove(item) }}
          />
        )}
        ListEmptyComponent={
          <EmptyState title="No saved tenders" description="Tap the bookmark on any tender to keep it here while you prepare your bid." />
        }
      />
    </ScreenWrapper>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  list: { padding: Spacing[4] },
  count: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing[3] },
});
