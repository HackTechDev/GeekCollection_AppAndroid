import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '../../components/Chip';
import { Cover } from '../../components/Cover';
import { useLibrary } from '../../context/LibraryContext';
import { colors, radius } from '../../theme';
import { countryFlag, formatDate, formatDateTime, itemTitle } from '../../utils/format';

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getItem } = useLibrary();
  const item = getItem(Number(id));

  if (!item) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Introuvable' }} />
        <Text style={styles.muted}>Cet exemplaire n'est plus dans la bibliothèque.</Text>
      </View>
    );
  }

  const movie = item.movie;
  const edition = item.edition;
  const title = itemTitle(item);
  const editionLabel = [edition?.name !== title ? edition?.name : null, edition?.edition].filter(Boolean).join(' – ');
  const countries = movie?.countries.map((c) => `${countryFlag(c)} ${c}`).join('  ');
  const hasTwoImages = edition?.cover_url && movie?.poster_url && edition.cover_url !== movie.poster_url;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title }} />

      <View style={styles.hero}>
        <Cover uri={edition?.cover_url ?? movie?.poster_url ?? null} width={hasTwoImages ? 150 : 180} />
        {hasTwoImages && <Cover uri={movie.poster_url} width={150} />}
      </View>

      <Text style={styles.title}>{title}</Text>
      {movie && movie.original_title !== movie.title && <Text style={styles.original}>{movie.original_title}</Text>}

      <View style={styles.badges}>
        {movie?.work_type_label && movie.work_type !== 'movie' && (
          <Badge label={movie.work_type_label} color={colors.text} background={colors.border} />
        )}
        {item.format_label && <Badge label={item.format_label} color={colors.primaryDark} background={colors.primarySoft} />}
        {item.packaging_label && <Badge label={item.packaging_label} color={colors.text} background={colors.border} />}
        <Badge
          label={item.seen ? 'Vu' : 'Pas vu'}
          color={item.seen ? '#fff' : colors.textMuted}
          background={item.seen ? colors.seen : colors.border}
        />
        {item.loaned && <Badge label="Prêté" color={colors.loaned} background={colors.loanedSoft} />}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Le film</Text>
        <Field label="Sortie" value={formatDate(movie?.release_date ?? null) ?? movie?.year?.toString()} />
        <Field
          label={movie && movie.directors.length > 1 ? 'Réalisateurs' : 'Réalisateur'}
          value={movie?.directors.join(', ')}
        />
        <Field label="Pays" value={countries} />
        <Field label="Type" value={movie?.work_type_label} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mon exemplaire</Text>
        <Field label="Édition" value={editionLabel || edition?.name} />
        <Field label="Format" value={item.format_label} />
        <Field label="Boîtier" value={item.packaging_label} />
        <Field label="État" value={item.condition_label} />
        <Field label="Emplacement" value={item.location} />
        <Field label="Prêt" value={item.loaned ? 'Prêté, pas encore rendu' : null} />
        <Field label="Ajouté le" value={formatDateTime(item.added_at)} />
      </View>

      {item.review && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mon avis</Text>
          <Text style={styles.review}>{item.review}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  muted: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  hero: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
  original: { fontSize: 16, color: colors.textMuted, fontStyle: 'italic', textAlign: 'center', marginTop: -6 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, gap: 10 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  field: { flexDirection: 'row', gap: 12 },
  fieldLabel: { width: 105, fontSize: 14, color: colors.textMuted },
  fieldValue: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
  review: { fontSize: 15, color: colors.text, lineHeight: 22 },
});
