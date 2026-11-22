import type { LibraryItem } from '../api/client';

/** Minuscules sans accents, comme la recherche de l'API (« Été 85 » = « ete 85 »). */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Texte cherché pour un exemplaire : titre, titre original, réalisateurs, édition. */
export function searchableText(item: LibraryItem): string {
  const parts = [
    item.movie?.title,
    item.movie?.original_title,
    ...(item.movie?.directors ?? []),
    item.edition?.name,
    item.edition?.edition,
  ];
  return normalize(parts.filter(Boolean).join(' '));
}

/** Code pays ISO 3166 (« FR ») → drapeau emoji. */
export function countryFlag(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return code;
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

export function formatDateTime(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}

export function itemTitle(item: LibraryItem): string {
  return item.movie?.title ?? item.edition?.name ?? 'Titre inconnu';
}

/** Image à afficher : la jaquette de l'édition, sinon l'affiche du film. */
export function itemImage(item: LibraryItem): string | null {
  return item.edition?.cover_url ?? item.movie?.poster_url ?? null;
}
