'use client';

import { Loader2Icon, TableIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { fetchCompetitorCorpus } from '@/lib/api/serp-competitor';
import { fetchReaderContent } from '@/lib/api/reader-fetch';
import {
  countWords,
  missingTermsVsCompetitors,
  type CompetitorRow,
} from '@/lib/seo/tfidf-missing';
import type { KnowledgeBase } from '@/types/knowledge-base';

const MAX_URLS = 6;

function parseUrls(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_URLS);
}

type NlpMissingTermsProps = {
  userPlainText: string;
  knowledgeBase: KnowledgeBase;
};

export function NlpMissingTerms({
  userPlainText,
  knowledgeBase,
}: NlpMissingTermsProps) {
  const [urlsText, setUrlsText] = useState('');
  const [serpQuery, setSerpQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CompetitorRow[]>([]);
  const [missing, setMissing] = useState<{ term: string; tfidf: number }[]>([]);

  const serpCorpus = useMemo(() => {
    const serpSources = knowledgeBase.sources.filter((s) => s.type === 'serp');
    return serpSources.map((s) => s.content).filter((t) => t.trim().length > 0);
  }, [knowledgeBase.sources]);

  const avgWords = useMemo(() => {
    const ok = rows.filter((r) => r.ok);
    if (!ok.length) return null;
    const sum = ok.reduce((a, r) => a + r.wordCount, 0);
    return Math.round(sum / ok.length);
  }, [rows]);

  const runFromKb = useCallback(() => {
    if (!userPlainText.trim()) {
      setError('Le contenu article est vide : impossible de calculer les termes manquants.');
      return;
    }
    if (!serpCorpus.length) {
      setError('Aucune source SERP dans la base : utilisez l’analyse SERP ci-dessous.');
      return;
    }
    setError(null);
    setRows([]);
    setMissing(missingTermsVsCompetitors(userPlainText, serpCorpus, { topN: 18 }));
  }, [serpCorpus, userPlainText]);

  const run = useCallback(async () => {
    const urls = parseUrls(urlsText);
    if (urls.length === 0) {
      setError('Collez au moins une URL (http ou https).');
      return;
    }
    setLoading(true);
    setError(null);
    setRows([]);
    setMissing([]);

    const nextRows: CompetitorRow[] = [];
    const texts: string[] = [];

    for (const url of urls) {
      try {
        const md = await fetchReaderContent(url);
        const wc = countWords(md);
        nextRows.push({ url, wordCount: wc, ok: true });
        texts.push(md);
      } catch (e) {
        nextRows.push({
          url,
          wordCount: 0,
          ok: false,
          error: e instanceof Error ? e.message : 'Erreur',
        });
      }
    }

    setRows(nextRows);
    if (texts.length > 0 && userPlainText.trim()) {
      setMissing(
        missingTermsVsCompetitors(userPlainText, texts, { topN: 18 })
      );
    } else if (!userPlainText.trim()) {
      setError('Le contenu article est vide : impossible de calculer les termes manquants.');
    }
    setLoading(false);
  }, [urlsText, userPlainText]);

  const runFromSerp = useCallback(async () => {
    const q = serpQuery.trim();
    if (!q) {
      setError('Saisissez une requête Google (mot-clé).');
      return;
    }
    setLoading(true);
    setError(null);
    setRows([]);
    setMissing([]);

    try {
      const corpus = await fetchCompetitorCorpus(q, { maxFetch: MAX_URLS });
      setUrlsText(corpus.organicUrls.slice(0, MAX_URLS).join('\n'));

      const nextRows: CompetitorRow[] = corpus.pages.map((p) => ({
        url: p.url,
        wordCount: p.wordCount,
        ok: p.ok,
        error: p.error,
      }));
      const texts = corpus.pages
        .filter((p) => p.ok && p.text?.trim())
        .map((p) => p.text!);

      setRows(nextRows);
      if (texts.length > 0 && userPlainText.trim()) {
        setMissing(
          missingTermsVsCompetitors(userPlainText, texts, { topN: 18 })
        );
      } else if (!userPlainText.trim()) {
        setError(
          'Le contenu article est vide : impossible de calculer les termes manquants.'
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur SERP / corpus');
    } finally {
      setLoading(false);
    }
  }, [serpQuery, userPlainText]);

  return (
    <section aria-label="Termes manquants TF-IDF">
      <p className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
        <TableIcon className="size-3.5" aria-hidden />
        Termes manquants (TF-IDF)
      </p>
      {serpCorpus.length > 0 && (
        <div className="mb-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2 text-xs">
          <p className="text-foreground font-medium">
            {serpCorpus.length} source(s) SERP dans la base — analyse directe possible.
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-2"
            onClick={runFromKb}
          >
            Analyser depuis la base (SERP)
          </Button>
        </div>
      )}
      <p className="text-muted-foreground mb-2 text-xs">
        Sans sources SERP : requête Google ou URLs manuelles.
      </p>
      <Textarea
        className="border-border bg-background mb-2 min-h-[40px] resize-y text-xs"
        placeholder="Requête Google (ex. mot-clé principal)"
        value={serpQuery}
        onChange={(e) => setSerpQuery(e.target.value)}
        disabled={loading}
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="mb-2"
        disabled={loading}
        onClick={() => void runFromSerp()}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2Icon className="size-4 animate-spin" />
            SERP…
          </span>
        ) : (
          'Analyser depuis SERP (top URLs)'
        )}
      </Button>
      <Textarea
        className="border-border bg-background mb-2 min-h-[72px] resize-y text-xs"
        placeholder={`https://exemple.com/page-1\nhttps://exemple.com/page-2`}
        value={urlsText}
        onChange={(e) => setUrlsText(e.target.value)}
        disabled={loading}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mb-2"
        disabled={loading}
        onClick={() => void run()}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2Icon className="size-4 animate-spin" />
            Analyse…
          </span>
        ) : (
          'Analyser les URLs'
        )}
      </Button>

      {error && (
        <p className="text-destructive mb-2 text-sm" role="alert">
          {error}
        </p>
      )}

      {rows.length > 0 && (
        <div className="mb-2 overflow-x-auto text-xs">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b">
                <th className="py-1 pr-2 font-medium">URL</th>
                <th className="py-1 pr-2 font-medium">Mots</th>
                <th className="py-1 font-medium">État</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.url} className="border-b border-border/60">
                  <td className="max-w-[200px] truncate py-1 pr-2 align-top">
                    {r.url}
                  </td>
                  <td className="py-1 pr-2 align-top">
                    {r.ok ? r.wordCount : '—'}
                  </td>
                  <td className="py-1 align-top">
                    {r.ok ? 'OK' : r.error ?? 'Erreur'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {avgWords != null && (
            <p className="text-muted-foreground mt-2">
              Moyenne mots (pages OK) : ~{avgWords}
            </p>
          )}
        </div>
      )}

      {missing.length > 0 && (
        <div className="mt-2">
          <p className="text-foreground mb-1 text-sm font-medium">
            Termes manquants (aperçu TF-IDF)
          </p>
          <ul className="text-muted-foreground list-inside list-disc space-y-0.5 text-xs">
            {missing.map((m) => (
              <li key={m.term}>
                <span className="text-foreground">{m.term}</span>{' '}
                <span className="opacity-70">
                  (score {m.tfidf.toFixed(3)})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
