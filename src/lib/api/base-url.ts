/**
 * Base URL pour les appels API.
 * - En dev avec `npm run dev` : laisser vide → requêtes relatives `/api` (proxy Vite → 8787).
 * - Sinon : `VITE_API_URL` ex. http://127.0.0.1:8787
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  if (!raw) return '';
  return raw.replace(/\/$/, '');
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}
