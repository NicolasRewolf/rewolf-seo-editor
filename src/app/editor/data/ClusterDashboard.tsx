'use client';

import { ChevronRightIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import type { ClusterStats } from '@/lib/knowledge-base/kb-stats';
import type { KbSourceType } from '@/types/knowledge-base';

function formatInt(n: number): string {
  return n.toLocaleString('fr-FR');
}

const TYPE_ORDER: KbSourceType[] = ['serp', 'url', 'text', 'file'];
const TYPE_LABEL: Record<KbSourceType, string> = {
  serp: 'SERP',
  url: 'URL',
  text: 'Texte',
  file: 'Fichier',
};
const BAR_COL: Record<KbSourceType, string> = {
  serp: 'bg-blue-500',
  url: 'bg-green-500',
  text: 'bg-amber-500',
  file: 'bg-violet-500',
};

type ClusterDashboardProps = {
  stats: ClusterStats;
  competitorWordCount?: number;
  onSelectRecent: (id: string) => void;
};

export function ClusterDashboard({
  stats,
  competitorWordCount,
  onSelectRecent,
}: ClusterDashboardProps) {
  const n = stats.totalSources || 1;
  const avg = Math.round(stats.totalWords / n);
  const diversity = TYPE_ORDER.filter((t) => stats.byType[t].count > 0).length;

  const totalForBar = TYPE_ORDER.reduce((s, t) => s + stats.byType[t].count, 0) || 1;

  let benchmark: ReactNode;
  if (competitorWordCount != null && competitorWordCount > 0) {
    const ratio = stats.totalWords / competitorWordCount;
    benchmark = (
      <p className="text-foreground text-sm">
        Cluster : <strong>{formatInt(stats.totalWords)}</strong> mots · Cible concurrent
        moyenne : <strong>{formatInt(competitorWordCount)}</strong> mots → ratio{' '}
        <strong>{ratio.toFixed(2)}×</strong>
      </p>
    );
  } else {
    benchmark = (
      <p className="text-muted-foreground text-sm">
        Lance une recherche SERP pour calibrer le benchmark (mots concurrents).
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-1 py-1">
      <div>
        <p className="text-muted-foreground mb-3 text-[10px] font-medium uppercase tracking-wider">
          Vue d’ensemble du cluster
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Sources" value={String(stats.totalSources)} />
          <StatCard label="Mots cumulés" value={formatInt(stats.totalWords)} />
          <StatCard label="Mots moy. / source" value={formatInt(avg)} />
          <StatCard label="Diversité types" value={`${diversity} / 4`} />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Benchmark concurrent</p>
        {benchmark}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Répartition par type</p>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
          {TYPE_ORDER.map((t) => {
            const c = stats.byType[t].count;
            const pct = (c / totalForBar) * 100;
            if (c === 0) return null;
            return (
              <div
                key={t}
                className={cn(BAR_COL[t], 'h-full min-w-px transition-all')}
                style={{ width: `${pct}%` }}
                title={`${TYPE_LABEL[t]}: ${c}`}
              />
            );
          })}
        </div>
        <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {TYPE_ORDER.map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <span className={cn('size-2 rounded-full', BAR_COL[t])} />
              {TYPE_LABEL[t]} : {stats.byType[t].count}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Top termes (aperçu)</p>
        {stats.topTerms.length === 0 ? (
          <p className="text-muted-foreground text-xs">Ajoutez des sources pour extraire des termes.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {stats.topTerms.map(({ term, freq }) => (
              <span
                key={term}
                className="bg-muted text-foreground rounded px-2 py-1 font-mono text-xs"
              >
                {term} · {freq}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Dernières sources</p>
        {stats.recent.length === 0 ? (
          <p className="text-muted-foreground text-xs">Aucune source encore.</p>
        ) : (
          <ul className="space-y-1">
            {stats.recent.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onSelectRecent(s.id)}
                  className="text-foreground hover:bg-muted/60 flex w-full items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 text-left text-sm transition-colors"
                >
                  <span className="line-clamp-1">{s.label}</span>
                  <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border bg-card/40 rounded-lg border px-3 py-2">
      <p className="text-muted-foreground mb-0.5 text-[10px] uppercase tracking-wide">{label}</p>
      <p className="text-foreground font-mono text-lg">{value}</p>
    </div>
  );
}
