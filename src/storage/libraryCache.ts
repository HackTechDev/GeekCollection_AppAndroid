import { File, Paths } from 'expo-file-system';

import type { Account, LibraryItem } from '../api/client';

// Copie locale de la bibliothèque, pour la lecture hors ligne et la recherche instantanée.
// Un fichier JSON plutôt qu'AsyncStorage : une grosse collection dépasserait la taille d'une entrée.

export type CachedLibrary = {
  email: string;
  syncedAt: string;
  items: LibraryItem[];
};

const cacheFile = () => new File(Paths.document, 'library.json');

export async function readLibraryCache(account: Account | null): Promise<CachedLibrary | null> {
  try {
    const file = cacheFile();
    if (!file.exists) return null;
    const data = JSON.parse(await file.text()) as CachedLibrary;
    // Ne jamais montrer la copie d'un autre compte.
    if (account && data.email !== account.email) return null;
    return data;
  } catch {
    return null;
  }
}

export async function writeLibraryCache(data: CachedLibrary): Promise<void> {
  try {
    const file = cacheFile();
    if (!file.exists) file.create();
    await file.write(JSON.stringify(data));
  } catch (e) {
    console.warn('Copie locale non enregistrée', e);
  }
}

export function clearLibraryCache(): void {
  try {
    const file = cacheFile();
    if (file.exists) file.delete();
  } catch {
    // rien à faire
  }
}
