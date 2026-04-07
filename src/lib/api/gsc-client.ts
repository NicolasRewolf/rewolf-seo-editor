import { apiUrl } from '@/lib/api/base-url';

export type GscSearchAnalyticsBody = {
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions?: string[];
  rowLimit?: number;
  startRow?: number;
};

export async function fetchGscSites(): Promise<unknown> {
  const res = await fetch(apiUrl('/api/gsc/sites'));
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data === 'object' && data && 'error' in data
        ? String((data as { error: string }).error)
        : `HTTP ${res.status}`
    );
  }
  return data;
}

export async function fetchGscSearchAnalytics(
  body: GscSearchAnalyticsBody
): Promise<unknown> {
  const res = await fetch(apiUrl('/api/gsc/search-analytics'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data === 'object' && data && 'error' in data
        ? String((data as { error: string }).error)
        : `HTTP ${res.status}`
    );
  }
  return data;
}

export async function fetchGscOpportunities(params: {
  siteUrl: string;
  startDate: string;
  endDate: string;
}): Promise<{ rows: unknown[]; total: number }> {
  const res = await fetch(apiUrl('/api/gsc/search-analytics/opportunities'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as {
    rows?: unknown[];
    total?: number;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(
      data.error ?? `GSC opportunities: ${res.status}`
    );
  }
  return {
    rows: Array.isArray(data.rows) ? data.rows : [],
    total: typeof data.total === 'number' ? data.total : 0,
  };
}
