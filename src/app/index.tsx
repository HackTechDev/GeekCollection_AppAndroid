import { router, Stack } from 'expo-router';
import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { LibraryItem } from '../api/client';
import { Badge, Chip } from '../components/Chip';
import { Cover } from '../components/Cover';
import { useLibrary } from '../context/LibraryContext';
import { colors, radius } from '../theme';
import { formatDateTime, itemImage, itemTitle, normalize, searchableText } from '../utils/format';

type SortKey = 'added' | 'title' | 'release_date';
type StatusFilter = 'all' | 'unseen' | 'seen' | 'loaned';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'added', label: 'Ajout récent' },
  { key: 'title', label: 'Titre A→Z' },
  { key: 'release_date', label: 'Date de sortie' },
];

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'unseen', label: 'Pas vus' },
  { key: 'seen', label: 'Vus' },
  { key: 'loaned', label: 'Prêtés' },
];

const ROW_HEIGHT = 112;
const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

function compare(a: LibraryItem, b: LibraryItem, sort: SortKey): number {
  switch (sort) {
    case 'title':
      return collator.compare(itemTitle(a), itemTitle(b)) || a.id - b.id;
    case 'release_date': {
      // Films sans date en fin de liste, comme l'API.
      const da = a.movie?.release_date ?? null;
      const db = b.movie?.release_date ?? null;
      if (da === db) return b.id - a.id;
      if (!da) return 1;
      if (!db) return -1;
      return db.localeCompare(da);
    }
    default: {
      const da = a.added_at ?? '';
      const db = b.added_at ?? '';
      return db.localeCompare(da) || b.id - a.id;
    }
  }
}

export default function LibraryScreen() {
  const { items, loading, refreshing, error, syncedAt, refresh } = useLibrary();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('added');
  const [format, setFormat] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>('all');
  const deferredSearch = useDeferredValue(search);

  // Texte de recherche calculé une seule fois par exemplaire.
  const indexed = useMemo(() => items.map((item) => ({ item, text: searchableText(item) })), [items]);

  // Formats présents dans la collection, avec leur libellé reçu de l'API.
  const formats = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const item of items) {
      if (!item.format) continue;
      const entry = map.get(item.format) ?? { label: item.format_label ?? item.format, count: 0 };
      entry.count++;
      map.set(item.format, entry);
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [items]);

  const visible = useMemo(() => {
    const words = normalize(deferredSearch).split(/\s+/).filter(Boolean);
    return indexed
      .filter(({ item, text }) => {
        if (format && item.format !== format) return false;
        if (status === 'seen' && !item.seen) return false;
        if (status === 'unseen' && item.seen) return false;
        if (status === 'loaned' && !item.loaned) return false;
        return words.every((word) => text.includes(word));
      })
      .map(({ item }) => item)
      .sort((a, b) => compare(a, b, sort));
  }, [indexed, deferredSearch, format, status, sort]);

  const filtered = deferredSearch.trim() !== '' || format !== null || status !== 'all';

  const renderItem = useCallback(({ item }: { item: LibraryItem }) => <LibraryRow item={item} />, []);

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/account')} hitSlop={12} accessibilityLabel="Mon compte">
              <Text style={styles.headerButton}>👤</Text>
            </Pressable>
          ),
        }}
      />

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Titre, titre original, réalisateur…"
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search !== '' && (
            <Pressable onPress={() => setSearch('')} hitSlop={10} accessibilityLabel="Effacer la recherche">
              <Text style={styles.clear}>✕</Text>
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {SORTS.map((s) => (
            <Chip key={s.key} label={s.label} selected={sort === s.key} onPress={() => setSort(s.key)} />
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip
            label="Tout"
            selected={format === null && status === 'all'}
            onPress={() => {
              setFormat(null);
              setStatus('all');
            }}
          />
          {formats.map(([code, { label }]) => (
            <Chip
              key={code}
              label={label}
              selected={format === code}
              onPress={() => setFormat(format === code ? null : code)}
            />
          ))}
          {STATUS_FILTERS.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              selected={status === f.key}
              onPress={() => setStatus(status === f.key ? 'all' : f.key)}
            />
          ))}
        </ScrollView>
      </View>

      {error && (
        <Pressable style={styles.banner} onPress={refresh}>
          <Text style={styles.bannerText}>
            {error}
            {syncedAt ? `\nCopie locale du ${formatDateTime(syncedAt)}.` : ''} Toucher pour réessayer.
          </Text>
        </Pressable>
      )}

      {loading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.muted}>Chargement de la bibliothèque…</Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={12}
          windowSize={11}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />
          }
          ListHeaderComponent={
            <Text style={styles.count}>
              {filtered
                ? `${visible.length} sur ${items.length} exemplaire${items.length > 1 ? 's' : ''}`
                : `${items.length} exemplaire${items.length > 1 ? 's' : ''}`}
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>{filtered ? '🔎' : '📀'}</Text>
              <Text style={styles.muted}>
                {filtered ? 'Aucun film ne correspond.' : 'Ta bibliothèque est vide.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const LibraryRow = memo(function LibraryRow({ item }: { item: LibraryItem }) {
  const movie = item.movie;
  const subtitle = [movie?.year, movie?.directors.slice(0, 2).join(', ')].filter(Boolean).join(' · ');
  const showOriginal = movie && movie.original_title && movie.original_title !== movie.title;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/item/[id]', params: { id: String(item.id) } })}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Cover uri={itemImage(item)} width={60} />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {itemTitle(item)}
        </Text>
        {showOriginal && (
          <Text style={styles.rowOriginal} numberOfLines={1}>
            {movie.original_title}
          </Text>
        )}
        {subtitle !== '' && (
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
        <View style={styles.badges}>
          {item.format_label && (
            <Badge label={item.format_label} color={colors.primaryDark} background={colors.primarySoft} />
          )}
          {item.packaging && item.packaging !== 'standard' && item.packaging_label && (
            <Badge label={item.packaging_label} color={colors.text} background={colors.border} />
          )}
          {item.seen && <Badge label="Vu" color="#fff" background={colors.seen} />}
          {item.loaned && <Badge label="Prêté" color={colors.loaned} background={colors.loanedSoft} />}
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerButton: { fontSize: 22, color: '#fff' },
  toolbar: {
    backgroundColor: colors.surface,
    paddingTop: 10,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  searchIcon: { fontSize: 15, marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 16, color: colors.text },
  clear: { fontSize: 16, color: colors.textMuted, paddingHorizontal: 4 },
  chips: { gap: 8, paddingHorizontal: 12, paddingVertical: 6 },
  banner: { backgroundColor: colors.loanedSoft, paddingHorizontal: 14, paddingVertical: 8 },
  bannerText: { color: '#92400e', fontSize: 13 },
  count: { fontSize: 13, color: colors.textMuted, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12, flexGrow: 1 },
  emptyIcon: { fontSize: 40 },
  muted: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.primarySoft },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  rowOriginal: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
  rowSubtitle: { fontSize: 13, color: colors.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4 },
});
