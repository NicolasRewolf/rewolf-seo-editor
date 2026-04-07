/**
 * Base URL pour les appels API.
 *
 * - **Production** : laisser `VITE_API_URL` vide → URLs relatives `/api` (même origine).
 * - **Dev** : par défaut on pointe **directement** vers l’API (`http://127.0.0.1:8787`) pour
 *   éviter les **502** du proxy Vite (souvent : API arrêtée, ou streaming mal relayé).
 * - Surcharge : `VITE_API_URL` (ex. autre hôte/port) ou `VITE_USE_VITE_PROXY=1` pour repasser
 *   par le proxy `/api` de Vite.
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  if (raw != null && String(raw).trim() !== '') {
    return String(raw).replace(/\/$/, '');
  }

  const useViteProxy =
    import.meta.env.VITE_USE_VITE_PROXY === '1' ||
    import.meta.env.VITE_USE_VITE_PROXY === 'true';

  if (import.meta.env.DEV && !useViteProxy) {
    const port = import.meta.env.VITE_API_PORT || '8787';
    return `http://127.0.0.1:${port}`;
  }

  return '';
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}
