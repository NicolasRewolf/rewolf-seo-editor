'use client';

import { Loader2Icon, SparklesIcon } from 'lucide-react';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { concatKbSources } from '@/lib/knowledge-base/kb-text';
import type { KnowledgeBase } from '@/types/knowledge-base';

type OutlineGeneratorProps = {
  focusKeyword: string;
  knowledgeBase: KnowledgeBase;
  provider: 'anthropic' | 'openai';
  onProviderChange: (p: 'anthropic' | 'openai') => void;
  loading: boolean;
  onGenerate: () => void;
  onStop: () => void;
  error: string | null;
};

export function OutlineGenerator({
  focusKeyword,
  knowledgeBase,
  provider,
  onProviderChange,
  loading,
  onGenerate,
  onStop,
  error,
}: OutlineGeneratorProps) {
  const kbStats = useMemo(() => {
    const n = knowledgeBase.sources.length;
    const words = knowledgeBase.sources.reduce((a, s) => a + s.wordCount, 0);
    return { n, words };
  }, [knowledgeBase]);

  const kbPreview = useMemo(() => {
    const raw = concatKbSources(knowledgeBase, 400);
    return raw ? `${raw.slice(0, 400)}${raw.length > 400 ? '…' : ''}` : '';
  }, [knowledgeBase]);

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        {kbStats.n} source{kbStats.n > 1 ? 's' : ''} · {kbStats.words} mots dans la
        base
      </p>
      {kbPreview && (
        <p className="text-muted-foreground line-clamp-4 text-xs leading-relaxed">
          {kbPreview}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <div className="flex rounded-md border p-0.5">
          <button
            type="button"
            onClick={() => onProviderChange('anthropic')}
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
            onClick={() => onProviderChange('openai')}
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
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="gap-2"
          disabled={loading}
          onClick={onGenerate}
        >
          {loading ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <SparklesIcon className="size-4" />
          )}
          Générer le plan
        </Button>
        {loading && (
          <Button type="button" variant="outline" size="sm" onClick={onStop}>
            Arrêter
          </Button>
        )}
      </div>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        Mot-clé :{' '}
        <span className="text-foreground font-medium">
          {focusKeyword || '(non défini)'}
        </span>
      </p>
    </div>
  );
}
