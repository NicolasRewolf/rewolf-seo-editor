'use client';

import { CheckIcon, Loader2Icon, PlusIcon, SearchIcon } from 'lucide-react';
import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { fetchReaderContent } from '@/lib/api/reader-fetch';
import { searchSerp, type SerpOrganicItem } from '@/lib/api/serp-search';
import {
  countWords,
  makeSerpSource,
  normalizeSourceUrl,
  normalizedSourceUrlsFromSources,
} from '@/lib/knowledge-base/kb-helpers';
import type { ArticleMeta } from '@/types/article';
import type { KbSource, KnowledgeBase } from '@/types/knowledge-base';

type SerpResearchProps = {
  meta: ArticleMeta;
  knowledgeBase: KnowledgeBase;
  onChange: Dispatch<SetStateAction<KnowledgeBase>>;
  onCompetitorWords?: (wordCount: number | undefined) => void;
};

export function SerpResearch({
  meta,
  knowledgeBase,
  onChange,
  onCompetitorWords,
}: SerpResearchProps) {
  const [q, setQ] = useState(meta.focusKeyword);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organic, setOrganic] = useState<SerpOrganicItem[]>([]);
  const [addingUrl, setAddingUrl] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  const existingSourceUrls = useMemo(
    () => normalizedSourceUrlsFromSources(knowledgeBase.sources),
    [knowledgeBase.sources]
  );

  const top5NewCount = useMemo(() => {
    const top = organic.slice(0, 5).filter((o) => o.link);
    return top.filter(
      (o) => !existingSourceUrls.has(normalizeSourceUrl(o.link!))
    ).length;
  }, [organic, existingSourceUrls]);

  const addSource = useCallback(
    (src: KbSource) => {
      onChange((prev) => ({ sources: [...prev.sources, src] }));
    },
    [onChange]
  );

  const run = useCallback(async () => {
    const query = q.trim();
    if (!query) {
      setError('Saisissez une requête ou un mot-clé.');
      return;
    }
    setLoading(true);
    setError(null);
    setOrganic([]);
    try {
      const data = await searchSerp(query, { num: 8 });
      setOrganic(data.organic ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur SERP');
    } finally {
      setLoading(false);
    }
  }, [q]);

  function addOne(item: SerpOrganicItem) {
    const url = item.link ?? '';
    if (!url) return;
    if (existingSourceUrls.has(normalizeSourceUrl(url))) {
      toast.message('Cette page est déjà dans la base');
      return;
    }
    setAddingUrl(url);
    setError(null);
    void (async () => {
      try {
        const text = await fetchReaderContent(url);
        const wc = countWords(text);
        onCompetitorWords?.(wc > 0 ? wc : undefined);
        addSource(
          makeSerpSource(
            url,
            item.title ?? url,
            text
          )
        );
        toast.success('Source ajoutée à la base');
      } catch (e) {
        onCompetitorWords?.(undefined);
        setError(e instanceof Error ? e.message : 'Erreur extraction');
      } finally {
        setAddingUrl(null);
      }
    })();
  }

  function addTop5() {
    const top = organic
      .slice(0, 5)
      .filter((o) => o.link)
      .filter((o) => !existingSourceUrls.has(normalizeSourceUrl(o.link!)));
    if (!top.length) {
      toast.message('Les résultats du top 5 sont déjà dans la base');
      return;
    }
    setBatchLoading(true);
    setError(null);
    void (async () => {
      const results = await Promise.allSettled(
        top.map(async (item) => {
          const url = item.link!;
          const text = await fetchReaderContent(url);
          return makeSerpSource(url, item.title ?? url, text);
        })
      );
      const ok = results
        .filter((r): r is PromiseFulfilledResult<KbSource> => r.status === 'fulfilled')
        .map((r) => r.value);
      const words = ok.map((s) => s.wordCount).filter((n) => n > 0);
      if (words.length) {
        onCompetitorWords?.(Math.round(words.reduce((a, b) => a + b, 0) / words.length));
      }
      if (ok.length) {
        onChange((prev) => ({ sources: [...prev.sources, ...ok] }));
        toast.success(`${ok.length} source(s) ajoutée(s)`);
      }
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed) {
        setError(`${failed} extraction(s) en échec`);
      }
      setBatchLoading(false);
    })();
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Recherche SERP
      </p>
      <p className="text-muted-foreground text-xs">
        Ajoutez le texte des pages concurrentes à votre base (extraction via Reader).
      </p>
      <div className="flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Requête Google…"
          className="h-8 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') void run();
          }}
        />
        <Button
          type="button"
          size="sm"
          className="h-8 shrink-0 gap-1.5 px-2"
          disabled={loading}
          onClick={() => void run()}
        >
          {loading ? (
            <Loader2Icon className="size-4 animate-spin" aria-hidden />
          ) : (
            <SearchIcon className="size-4" aria-hidden />
          )}
          Voir
        </Button>
      </div>
      {organic.length > 0 && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="w-full"
          disabled={batchLoading || loading || top5NewCount === 0}
          onClick={addTop5}
          title={
            top5NewCount === 0
              ? 'Aucune URL nouvelle dans le top 5'
              : `Ajouter ${top5NewCount} source(s) pas encore en base`
          }
        >
          {batchLoading ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : top5NewCount === 0 ? (
            'Top 5 déjà dans la base'
          ) : (
            `Ajouter le top 5 (${top5NewCount} nouvelle${top5NewCount > 1 ? 's' : ''})`
          )}
        </Button>
      )}

      <div className="max-h-[min(36vh,280px)] overflow-y-auto">
        {error && (
          <p className="text-destructive mb-2 text-sm" role="alert">
            {error}
          </p>
        )}
        {organic.length === 0 && !loading && (
          <p className="text-muted-foreground px-1 py-2 text-xs">
            Lancez une recherche pour afficher les résultats organiques.
          </p>
        )}
        {organic.length > 0 && (
          <ol className="list-none space-y-0">
            {organic.map((item, i) => {
              const url = item.link ?? '';
              const title = item.title ?? '(sans titre)';
              const alreadyInBase = Boolean(
                url && existingSourceUrls.has(normalizeSourceUrl(url))
              );
              return (
                <li key={`${url}-${i}`} className="border-border flex flex-col gap-1 border-b py-2 last:border-b-0">
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-foreground line-clamp-2 text-sm font-medium underline-offset-2 hover:underline"
                    >
                      {title}
                    </a>
                  ) : (
                    <p className="text-foreground text-sm font-medium">{title}</p>
                  )}
                  {url && (
                    <p className="text-muted-foreground truncate text-xs">{url}</p>
                  )}
                  {item.snippet && (
                    <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                      {item.snippet}
                    </p>
                  )}
                  {url ? (
                    <Button
                      type="button"
                      variant={alreadyInBase ? 'secondary' : 'outline'}
                      size="sm"
                      className={cn(
                        'mt-1 h-7 w-fit gap-1 text-xs',
                        alreadyInBase &&
                          'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                      )}
                      disabled={
                        alreadyInBase || addingUrl === url || batchLoading
                      }
                      onClick={() => addOne(item)}
                      aria-label={
                        alreadyInBase
                          ? 'Déjà ajouté à la base'
                          : 'Ajouter à la base'
                      }
                    >
                      {addingUrl === url ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                      ) : alreadyInBase ? (
                        <CheckIcon className="size-3.5" aria-hidden />
                      ) : (
                        <PlusIcon className="size-3.5" aria-hidden />
                      )}
                      {alreadyInBase ? 'Ajouté' : 'Ajouter à la base'}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
