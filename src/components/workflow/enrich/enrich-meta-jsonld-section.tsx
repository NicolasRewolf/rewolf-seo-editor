'use client';

import { Loader2Icon } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { aiGenerateObject } from '@/lib/api/ai-object';
import type { AiProvider } from '@/lib/api/stream-ai';
import { buildArticleContextBlock } from '@/lib/ai/article-context';
import type { ArticleBrief, ArticleMeta } from '@/types/article';

type MetaScored = {
  titleVariants: Array<{
    text: string;
    length: number;
    score: number;
    reason: string;
  }>;
  descriptionVariants: Array<{
    text: string;
    length: number;
    score: number;
    reason: string;
  }>;
};

type EnrichMetaJsonldSectionProps = {
  meta: ArticleMeta;
  brief: ArticleBrief;
  getMarkdown: () => string;
  onMetaChange: (m: ArticleMeta) => void;
};

export function EnrichMetaJsonldSection({
  meta,
  brief,
  getMarkdown,
  onMetaChange,
}: EnrichMetaJsonldSectionProps) {
  const [provider, setProvider] = useState<AiProvider>('anthropic');
  const [metaObj, setMetaObj] = useState<MetaScored | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [jsonld, setJsonld] = useState<object | null>(null);
  const [jsonldLoading, setJsonldLoading] = useState(false);

  const runMetaScored = useCallback(async () => {
    setMetaObj(null);
    setMetaLoading(true);
    try {
      const ctx = buildArticleContextBlock(meta, brief, getMarkdown());
      const obj = (await aiGenerateObject(
        'meta-scored',
        ctx,
        provider
      )) as MetaScored;
      setMetaObj(obj);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur meta');
    } finally {
      setMetaLoading(false);
    }
  }, [brief, getMarkdown, meta, provider]);

  const runJsonLdBundle = useCallback(async () => {
    setJsonld(null);
    setJsonldLoading(true);
    try {
      const ctx = buildArticleContextBlock(meta, brief, getMarkdown());
      const obj = await aiGenerateObject('jsonld-bundle', ctx, provider);
      setJsonld(obj != null && typeof obj === 'object' ? obj : null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur JSON-LD');
    } finally {
      setJsonldLoading(false);
    }
  }, [brief, getMarkdown, meta, provider]);

  async function copyJsonLd() {
    if (!jsonld) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(jsonld, null, 2));
      toast.success('JSON-LD copié');
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
          Meta tags scorées
        </p>
        <div className="mb-2 flex flex-wrap gap-2">
          <div className="flex rounded-md border p-0.5">
            <button
              type="button"
              onClick={() => setProvider('anthropic')}
              className={`rounded px-2 py-1 text-xs font-medium ${
                provider === 'anthropic'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Anthropic
            </button>
            <button
              type="button"
              onClick={() => setProvider('openai')}
              className={`rounded px-2 py-1 text-xs font-medium ${
                provider === 'openai'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              OpenAI
            </button>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={metaLoading}
          onClick={() => void runMetaScored()}
        >
          {metaLoading ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            'Générer 3 variantes meta'
          )}
        </Button>
        {metaObj && (
          <div className="mt-3 space-y-4 text-xs">
            <div>
              <p className="text-foreground mb-1 font-medium">Titres</p>
              {metaObj.titleVariants.map((v, i) => (
                <div
                  key={i}
                  className="border-border bg-muted/20 mb-2 rounded-md border p-2"
                >
                  <p>{v.text}</p>
                  <p className="text-muted-foreground mt-1">
                    Score {v.score} — {v.reason}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    onClick={() =>
                      onMetaChange({ ...meta, metaTitle: v.text })
                    }
                  >
                    Appliquer
                  </Button>
                </div>
              ))}
            </div>
            <div>
              <p className="text-foreground mb-1 font-medium">Descriptions</p>
              {metaObj.descriptionVariants.map((v, i) => (
                <div
                  key={i}
                  className="border-border bg-muted/20 mb-2 rounded-md border p-2"
                >
                  <p>{v.text}</p>
                  <p className="text-muted-foreground mt-1">
                    Score {v.score} — {v.reason}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    onClick={() =>
                      onMetaChange({ ...meta, metaDescription: v.text })
                    }
                  >
                    Appliquer
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section>
        <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
          JSON-LD
        </p>
        <Button
          type="button"
          size="sm"
          disabled={jsonldLoading}
          onClick={() => void runJsonLdBundle()}
        >
          {jsonldLoading ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            'Générer JSON-LD Bundle'
          )}
        </Button>
        {jsonld && (
          <div className="mt-2 flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void copyJsonLd()}
            >
              Copier
            </Button>
            <pre className="border-border bg-muted/40 max-h-[min(40vh,320px)] overflow-auto rounded-md border p-2 font-mono text-[10px] leading-relaxed">
              {JSON.stringify(jsonld, null, 2)}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
}
