'use client';

import { PlusIcon, SparklesIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { suggestLongTailFromKb } from '@/lib/knowledge-base/kb-longtail';
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

  const longTailLines = useMemo(
    () => brief.longTailKeywords.join('\n'),
    [brief.longTailKeywords]
  );

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
      <div>
        <h2 className="text-foreground text-sm font-semibold">Brief éditorial</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Définissez l’intention, l’audience et la longue traîne avant de générer le
          plan. Le mot-clé est aussi modifiable à l’étape Data.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-foreground text-sm font-medium">
          Mot-clé principal
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
          Intention de recherche
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
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 gap-1 text-xs"
            onClick={suggestLt}
          >
            <SparklesIcon className="size-3.5" />
            Suggérer depuis la KB
          </Button>
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
