'use client';

import { PlusIcon, SparklesIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  extractLongTailWithLlm,
  type LongTailSuggestion,
} from '@/lib/knowledge-base/kb-longtail-llm';
import { suggestLongTailFromKb } from '@/lib/knowledge-base/kb-longtail';
import type { AiProvider } from '@/lib/api/stream-ai';
import { cn } from '@/lib/utils';
import type {
  ArticleBrief,
  FunnelStage,
  SearchIntent,
} from '@/types/article';
import type { KnowledgeBase } from '@/types/knowledge-base';

const INTENTS: { id: SearchIntent; label: string }[] = [
  { id: 'informational', label: 'Informationnelle' },
  { id: 'transactional', label: 'Transactionnelle' },
  { id: 'navigational', label: 'Navigationnelle' },
  { id: 'commercial', label: 'Commerciale' },
];

const FUNNEL: { id: FunnelStage; label: string }[] = [
  { id: 'awareness', label: 'Notoriété' },
  { id: 'consideration', label: 'Considération' },
  { id: 'decision', label: 'Décision' },
];

type StepBriefProps = {
  brief: ArticleBrief;
  onBriefChange: (next: ArticleBrief) => void;
  knowledgeBase: KnowledgeBase;
};

export function StepBrief({
  brief,
  onBriefChange,
  knowledgeBase,
}: StepBriefProps) {
  const [longTailInput, setLongTailInput] = useState('');
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmDetails, setLlmDetails] = useState<LongTailSuggestion[]>([]);
  const [longTailLlmProvider, setLongTailLlmProvider] =
    useState<AiProvider>('openai');

  const patch = useCallback(
    (partial: Partial<ArticleBrief>) => {
      onBriefChange({ ...brief, ...partial });
    },
    [brief, onBriefChange]
  );

  const suggestLt = useCallback(() => {
    const suggested = suggestLongTailFromKb(
      knowledgeBase,
      brief.focusKeyword,
      15
    );
    const merged = [...new Set([...brief.longTailKeywords, ...suggested])];
    patch({ longTailKeywords: merged });
  }, [brief.focusKeyword, brief.longTailKeywords, knowledgeBase, patch]);

  const suggestLtLlm = useCallback(async () => {
    setLlmLoading(true);
    try {
      const suggestions = await extractLongTailWithLlm({
        kb: knowledgeBase,
        focusKeyword: brief.focusKeyword,
        provider: longTailLlmProvider,
      });
      setLlmDetails(suggestions);
      const merged = [
        ...new Set([
          ...brief.longTailKeywords,
          ...suggestions.map((s) => s.query),
        ]),
      ];
      patch({ longTailKeywords: merged });
      toast.success(`${suggestions.length} expressions extraites`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Extraction échouée');
    } finally {
      setLlmLoading(false);
    }
  }, [
    brief.focusKeyword,
    brief.longTailKeywords,
    knowledgeBase,
    longTailLlmProvider,
    patch,
  ]);

  const longTailLines = useMemo(
    () => brief.longTailKeywords.join('\n'),
    [brief.longTailKeywords]
  );

  const missing: string[] = [];
  if (!brief.focusKeyword.trim()) missing.push('mot-clé principal');
  if (!brief.searchIntent) missing.push('intention de recherche');

  function setLongTailFromText(raw: string) {
    const next = raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    patch({ longTailKeywords: next });
  }

  function addLongTailChip() {
    const t = longTailInput.trim();
    if (!t) return;
    if (brief.longTailKeywords.includes(t)) {
      setLongTailInput('');
      return;
    }
    patch({ longTailKeywords: [...brief.longTailKeywords, t] });
    setLongTailInput('');
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {missing.length > 0 && (
        <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-xs">
          Brief incomplet : {missing.join(', ')}. Ces champs sont requis pour générer le
          plan.
        </div>
      )}
      <div>
        <h2 className="text-foreground text-sm font-semibold">Brief éditorial</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Définissez l’intention, l’audience et la longue traîne avant de générer le
          plan. Le mot-clé est aussi modifiable à l’étape Data.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-foreground text-sm font-medium">
          Mot-clé principal{' '}
          <span className="text-destructive" aria-hidden>
            *
          </span>
        </label>
        <Input
          value={brief.focusKeyword}
          onChange={(e) => patch({ focusKeyword: e.target.value })}
          placeholder="ex. avocat droit du travail"
          className="text-sm"
        />
        <p className="text-muted-foreground text-xs">
          Également modifiable à l’étape Data.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-foreground mb-1 text-sm font-medium">
          Intention de recherche{' '}
          <span className="text-destructive" aria-hidden>
            *
          </span>
        </legend>
        <div className="flex flex-wrap gap-1">
          {INTENTS.map((x) => (
            <Button
              key={x.id}
              type="button"
              size="sm"
              variant={brief.searchIntent === x.id ? 'default' : 'outline'}
              className="h-8 text-xs"
              onClick={() =>
                patch({
                  searchIntent: brief.searchIntent === x.id ? null : x.id,
                })
              }
            >
              {x.label}
            </Button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-foreground mb-1 text-sm font-medium">
          Étape du funnel
        </legend>
        <div className="flex flex-wrap gap-1">
          {FUNNEL.map((x) => (
            <Button
              key={x.id}
              type="button"
              size="sm"
              variant={brief.funnelStage === x.id ? 'default' : 'outline'}
              className="h-8 text-xs"
              onClick={() =>
                patch({
                  funnelStage: brief.funnelStage === x.id ? null : x.id,
                })
              }
            >
              {x.label}
            </Button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label className="text-foreground text-sm font-medium">
          Audience cible
        </label>
        <Textarea
          value={brief.targetAudience}
          onChange={(e) => patch({ targetAudience: e.target.value })}
          placeholder="1–2 phrases : qui doit lire cette page ?"
          className="min-h-[72px] resize-y text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-foreground text-sm font-medium">
          URL ou domaine de destination
        </label>
        <Input
          value={brief.destinationUrl}
          onChange={(e) => patch({ destinationUrl: e.target.value })}
          placeholder="https://…"
          className="font-mono text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-foreground text-sm font-medium">
          Voix de marque
        </label>
        <Textarea
          value={brief.brandVoice}
          onChange={(e) => patch({ brandVoice: e.target.value })}
          placeholder="Ton, tutoiement/vouvoiement, niveau de technicité…"
          className="min-h-[64px] text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-foreground text-sm font-medium">
          Objectif business
        </label>
        <Textarea
          value={brief.businessGoal}
          onChange={(e) => patch({ businessGoal: e.target.value })}
          placeholder="Lead, prise de RDV, notoriété…"
          className="min-h-[64px] text-sm"
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-foreground text-sm font-medium">
            Longue traîne (expressions cibles)
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex rounded-md border p-0.5">
              <button
                type="button"
                onClick={() => setLongTailLlmProvider('anthropic')}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  longTailLlmProvider === 'anthropic'
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Anthropic
              </button>
              <button
                type="button"
                onClick={() => setLongTailLlmProvider('openai')}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  longTailLlmProvider === 'openai'
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                OpenAI
              </button>
            </div>
            <Button
              type="button"
              size="sm"
              variant="default"
              className="h-8 gap-1 text-xs"
              disabled={
                llmLoading ||
                !brief.focusKeyword.trim() ||
                knowledgeBase.sources.length === 0
              }
              onClick={() => void suggestLtLlm()}
            >
              <SparklesIcon className="size-3.5" />
              {llmLoading ? 'Analyse…' : 'Extraire via IA'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 gap-1 text-xs"
              onClick={suggestLt}
            >
              Suggérer (rapide, statistique)
            </Button>
          </div>
        </div>
        <Textarea
          value={longTailLines}
          onChange={(e) => setLongTailFromText(e.target.value)}
          placeholder="Une expression par ligne (ou séparées par des virgules)"
          className="min-h-[100px] font-mono text-xs"
        />
        <div className="flex flex-wrap gap-1">
          {brief.longTailKeywords.map((kw) => (
            <span
              key={kw}
              className="bg-muted text-foreground inline-flex items-center rounded px-2 py-0.5 text-xs"
            >
              {kw}
            </span>
          ))}
        </div>
        {llmDetails.length > 0 && (
          <div className="border-border max-h-[220px] overflow-auto rounded-md border">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="p-2 font-medium">Expression</th>
                  <th className="p-2 font-medium">Intention</th>
                  <th className="p-2 font-medium">Difficulté</th>
                </tr>
              </thead>
              <tbody>
                {llmDetails.map((row, i) => (
                  <tr key={`${row.query}-${i}`} className="border-b last:border-0">
                    <td className="p-2 align-top">{row.query}</td>
                    <td className="p-2 align-top">
                      <span
                        className={cn(
                          'inline-block rounded px-1.5 py-0.5 font-mono text-[10px] uppercase',
                          row.intent === 'informational' &&
                            'bg-sky-500/15 text-sky-900 dark:text-sky-100',
                          row.intent === 'transactional' &&
                            'bg-violet-500/15 text-violet-900 dark:text-violet-100',
                          row.intent === 'commercial' &&
                            'bg-amber-500/15 text-amber-900 dark:text-amber-100',
                          row.intent === 'navigational' &&
                            'bg-slate-500/15 text-slate-800 dark:text-slate-200'
                        )}
                      >
                        {row.intent}
                      </span>
                    </td>
                    <td className="p-2 align-top">
                      <span
                        className={cn(
                          'inline-block rounded px-1.5 py-0.5 font-mono text-[10px] uppercase',
                          row.difficulty === 'low' &&
                            'bg-emerald-500/15 text-emerald-900 dark:text-emerald-100',
                          row.difficulty === 'med' &&
                            'bg-amber-500/15 text-amber-900 dark:text-amber-100',
                          row.difficulty === 'high' &&
                            'bg-red-500/15 text-red-900 dark:text-red-100'
                        )}
                      >
                        {row.difficulty}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={longTailInput}
            onChange={(e) => setLongTailInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addLongTailChip();
              }
            }}
            placeholder="Ajouter une expression…"
            className="text-sm"
          />
          <Button type="button" size="sm" variant="outline" onClick={addLongTailChip}>
            <PlusIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
