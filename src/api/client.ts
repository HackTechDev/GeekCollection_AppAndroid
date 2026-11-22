/**
 * Client de l'API Geek Collection v1 (lecture seule).
 * Documentation : /home/util01/GEEKCOLLECTION/geekcollection/API.md
 */

export const API_BASE_URL = 'https://geekcollection.metalhorreur.fr/api/v1';

export type Account = {
  email: string;
  public_name: string | null;
  display_language: string;
};

export type Movie = {
  id: number;
  title: string;
  original_title: string;
  release_date: string | null;
  year: number | null;
  work_type: string;
  work_type_label: string;
  directors: string[];
  countries: string[];
  poster_url: string | null;
};

export type Edition = {
  id: number;
  name: string | null;
  edition: string | null;
  cover_url: string | null;
};

export type LibraryItem = {
  id: number;
  movie: Movie | null;
  edition: Edition | null;
  format: string | null;
  format_label: string | null;
  packaging: string | null;
  packaging_label: string | null;
  condition: string | null;
  condition_label: string | null;
  location: string | null;
  review: string | null;
  seen: boolean;
  loaned: boolean;
  added_at: string | null;
};

export type LibraryPage = {
  items: LibraryItem[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

/** Erreur renvoyée par l'API (`{"error": {"code", "message"}}`) ou erreur réseau (`network_error`). */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly retryAfter: number | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * Le jeton n'est plus valable (révoqué, mot de passe changé…) : il faut revenir à l'écran de connexion.
   * `missing_token` n'en fait pas partie : l'application envoie toujours le jeton, donc ce code signale
   * un en-tête `Authorization` perdu en route (configuration du serveur), pas une session expirée.
   */
  get isAuthError(): boolean {
    return this.status === 401 && this.code === 'invalid_token';
  }

  get isNetworkError(): boolean {
    return this.code === 'network_error';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST';
  token?: string | null;
  body?: unknown;
  signal?: AbortSignal;
};

async function request<T>(path: string, { method = 'GET', token, body, signal }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw e;
    throw new ApiError('network_error', 'Impossible de joindre Geek Collection. Vérifie ta connexion.', 0);
  }

  if (response.status === 204) return undefined as T;

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    // corps vide ou non JSON
  }

  if (!response.ok) {
    const retryHeader = response.headers.get('Retry-After');
    const code: string = data?.error?.code ?? 'server_error';
    let message: string = data?.error?.message ?? `Erreur du serveur (${response.status}).`;
    if (code === 'missing_token' && token) {
      message = "Le serveur n'a pas reçu le jeton d'accès envoyé par l'application (en-tête Authorization perdu : configuration du serveur).";
    }
    console.warn(`API ${method} ${path} → ${response.status} ${code}`);
    throw new ApiError(code, message, response.status, retryHeader ? Number(retryHeader) : null);
  }
  return data as T;
}

export function login(email: string, password: string, deviceName: string) {
  return request<{ token: string; token_type: string; user: Account }>('/login', {
    method: 'POST',
    body: { email, password, device_name: deviceName.slice(0, 100) },
  });
}

export function fetchMe(token: string) {
  return request<{ user: Account }>('/me', { token });
}

export function logout(token: string) {
  return request<void>('/logout', { method: 'POST', token });
}

export type LibraryQuery = {
  search?: string;
  sort?: 'added' | 'title' | 'release_date';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
};

export function fetchLibraryPage(token: string, query: LibraryQuery = {}, signal?: AbortSignal) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.append(key, String(value));
  }
  return request<LibraryPage>(`/library?${params.toString()}`, { token, signal });
}

/** Charge toute la bibliothèque, page par page (100 exemplaires par page). */
export async function fetchWholeLibrary(token: string, signal?: AbortSignal): Promise<LibraryItem[]> {
  const items: LibraryItem[] = [];
  for (let page = 1; ; page++) {
    const data = await fetchLibraryPage(token, { sort: 'added', order: 'desc', limit: 100, page }, signal);
    items.push(...data.items);
    if (page >= data.pages) return items;
  }
}
