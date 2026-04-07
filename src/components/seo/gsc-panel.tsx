'use client';

import { Loader2Icon, LineChartIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  fetchGscOpportunities,
  fetchGscSearchAnalytics,
  fetchGscSites,
} from '@/lib/api/gsc-client';
import { cn } from '@/lib/utils';

type GscRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type GscPanelProps = {
  className?: string;
};

function defaultEndDate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function defaultStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 28);
  return d.toISOString().slice(0, 10);
}

export function GscPanel({ className }: GscPanelProps) {
  const [siteUrl, setSiteUrl] = useState('sc-domain:example.com');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [dimension, setDimension] = useState<'query' | 'page' | 'query+page'>(
    'query'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<GscRow[]>([]);
  const [dataset, setDataset] = useState<'standard' | 'opportunities'>(
    'standard'
  );
  const [sitesHint, setSitesHint] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchGscSites();
        const siteEntry =
          data &&
          typeof data === 'object' &&
          'siteEntry' in data &&
          Array.isArray((data as { siteEntry: unknown }).siteEntry)
            ? (data as { siteEntry: { siteUrl?: string }[] }).siteEntry
            : [];
        if (siteEntry.length > 0 && siteEntry[0]?.siteUrl) {
          setSiteUrl(siteEntry[0].siteUrl);
          setSitesHint(
            `${siteEntry.length} propriété(s) — première sélectionnée.`
          );
        }
      } catch {
        /* credentials non configurés en local : OK */
      }
    })();
  }, []);

  const dimensions = useMemo(() => {
    if (dimension === 'query+page') return ['query', 'page'];
    return [dimension];
  }, [dimension]);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRows([]);
    setDataset('standard');
    try {
      const data = await fetchGscSearchAnalytics({
        siteUrl: siteUrl.trim(),
        startDate,
        endDate,
        dimensions,
        rowLimit: 50,
      });
      const r =
        data &&
        typeof data === 'object' &&
        'rows' in data &&
        Array.isArray((data as { rows: unknown }).rows)
          ? (data as { rows: GscRow[] }).rows
          : [];
      setRows(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur GSC');
    } finally {
      setLoading(false);
    }
  }, [siteUrl, startDate, endDate, dimensions]);

  const runOpportunities = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRows([]);
    setDataset('opportunities');
    try {
      const { rows: r } = await fetchGscOpportunities({
        siteUrl: siteUrl.trim(),
        startDate,
        endDate,
      });
      setRows(r as GscRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur GSC');
    } finally {
      setLoading(false);
    }
  }, [siteUrl, startDate, endDate]);

  return (
    <section
      className={cn(
        'bg-card flex min-h-0 min-w-0 flex-col border-t',
        className
      )}
      aria-label="Google Search Console"
    >
      <div className="border-border shrink-0 border-b px-4 py-3">
        <p className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
          <LineChartIcon className="size-3.5" aria-hidden />
          Search Console
        </p>
        <p className="text-muted-foreground mt-2 border-border max-w-prose border-l-2 pl-2 text-xs leading-relaxed">
          Analyse des performances du site — n’alimente pas la base de
          connaissances utilisée pour la rédaction (Import et SERP ci-dessus).
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          API{' '}
          <code className="text-foreground/90">/api/gsc/sites</code> et{' '}
          <code className="text-foreground/90">/api/gsc/search-analytics</code>
          ,{' '}
          <code className="text-foreground/90">
            /api/gsc/search-analytics/opportunities
          </code>
          ·{' '}
          {sitesHint ??
            'Configurez GOOGLE_APPLICATION_CREDENTIALS pour lister les sites.'}
        </p>
        <div className="mt-2 flex flex-col gap-2">
          <Input
            className="h-8 text-xs"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="sc-domain:… ou https://www.…"
            disabled={loading}
          />
          <div className="flex flex-wrap gap-2">
            <Input
              type="date"
              className="h-8 w-[140px] text-xs"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loading}
            />
            <Input
              type="date"
              className="h-8 w-[140px] text-xs"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={loading}
            />
            <select
              className="border-border bg-background h-8 rounded-md border px-2 text-xs"
              value={dimension}
              onChange={(e) =>
                setDimension(e.target.value as typeof dimension)
              }
              disabled={loading}
            >
              <option value="query">Requête</option>
              <option value="page">Page</option>
              <option value="query+page">Requête + page</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8 w-fit text-xs"
              disabled={loading}
              onClick={() => void run()}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2Icon className="size-3.5 animate-spin" />
                  Chargement…
                </span>
              ) : (
                'Charger les données'
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 w-fit text-xs"
              disabled={loading}
              onClick={() => void runOpportunities()}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2Icon className="size-3.5 animate-spin" />
                  Chargement…
                </span>
              ) : (
                'Opportunités'
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {error && (
          <p className="text-destructive mb-2 text-xs" role="alert">
            {error}
          </p>
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            {dataset === 'opportunities' && (
              <p className="bg-muted/70 text-foreground mb-2 rounded-md border border-border px-2 py-1.5 text-xs font-medium">
                Opportunités SEO — positions 5–20, triées par impressions
                (max. 50)
              </p>
            )}
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b">
                  <th className="py-1 pr-2 font-medium">Dimension</th>
                  <th className="py-1 pr-2 font-medium">Clics</th>
                  <th className="py-1 pr-2 font-medium">Impr.</th>
                  <th className="py-1 pr-2 font-medium">CTR</th>
                  <th className="py-1 pr-2 font-medium">Pos.</th>
                  {dataset === 'opportunities' && (
                    <th className="py-1 font-medium">Potentiel</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const imp = r.impressions;
                  const ctr = r.ctr;
                  const potentiel =
                    imp != null && ctr != null
                      ? imp * (0.3 - ctr)
                      : null;
                  return (
                    <tr key={i} className="border-b border-border/60">
                      <td className="max-w-[220px] py-1 pr-2 align-top break-all">
                        {(r.keys ?? []).join(' · ') || '—'}
                      </td>
                      <td className="py-1 pr-2 align-top">{r.clicks ?? '—'}</td>
                      <td className="py-1 pr-2 align-top">
                        {r.impressions ?? '—'}
                      </td>
                      <td className="py-1 pr-2 align-top">
                        {r.ctr != null ? `${(r.ctr * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-1 pr-2 align-top">
                        {r.position != null ? r.position.toFixed(1) : '—'}
                      </td>
                      {dataset === 'opportunities' && (
                        <td className="py-1 align-top tabular-nums">
                          {potentiel != null
                            ? potentiel.toFixed(1)
                            : '—'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
