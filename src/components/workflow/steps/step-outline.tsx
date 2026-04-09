'use client';

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { OutlineGenerator } from '@/components/workflow/outline/outline-generator';
import { OutlinePreview } from '@/components/workflow/outline/outline-preview';
import { useAiAssistant } from '@/hooks/useAiAssistant';
import { SEO_OUTLINE_FROM_KB_PROMPT } from '../../../../shared/ai/prompts/workflow.prompt';
import { concatKbSources, formatCompetitorHeadings } from '@/lib/knowledge-base/kb-text';
import {
  collectCompetitorH2FromKb,
  scorePlan,
  type PlanScore,
} from '@/lib/seo/plan-scorer';
import { replaceEditorFromMarkdown } from '@/lib/plate/insert-markdown';
import type { PlateEditor } from 'platejs/react';
import type { ArticleBrief } from '@/types/article';
import type { KnowledgeBase } from '@/types/knowledge-base';

/** Réduit la taille du POST plan pour limiter 502 / timeouts proxy & API. */
const KB_SUMMARY_MAX = 6000;
const SCORE_WARN_THRESHOLD = 70;

type StepOutlineProps = {
  brief: ArticleBrief;
  knowledgeBase: KnowledgeBase;
  editor: PlateEditor;
  getMarkdown: () => string;
};

export function StepOutline({
  brief,
  knowledgeBase,
  editor,
  getMarkdown,
}: StepOutlineProps) {
  const {
    provider,
    setProvider,
    output,
    setOutput,
    loading,
    error,
    setError,
    run,
    stop,
  } = useAiAssistant();

  const kbSummary = useMemo(() => {
    const raw = concatKbSources(knowledgeBase, KB_SUMMARY_MAX);
    return raw || '(aucune source — ajoutez des sources à l’étape 1)';
  }, [knowledgeBase]);

  const competitorH2 = useMemo(
    () => collectCompetitorH2FromKb(knowledgeBase.sources),
    [knowledgeBase.sources]
  );

  const [planDraft, setPlanDraft] = useState('');

  const briefIncomplete =
    !brief.focusKeyword.trim() || !brief.searchIntent;

  const runOutline = useCallback(() => {
    if (!brief.focusKeyword.trim()) {
      toast.error(
        'Renseignez un mot-clé principal à l’étape Brief avant de générer le plan.'
      );
      return;
    }
    if (!brief.searchIntent) {
      toast.error(
        'Choisissez une intention de recherche à l’étape Brief avant de générer le plan.'
      );
      return;
    }
    setOutput('');
    setError(null);
    const userPrompt = [
      '--- BRIEF ---',
      `Mot-clé principal : ${brief.focusKeyword}`,
      `Longue traîne : ${brief.longTailKeywords.join(', ') || '(aucune)'}`,
      `Intention : ${brief.searchIntent ?? '(non définie)'}`,
      `Étape funnel : ${brief.funnelStage ?? '(non définie)'}`,
      `Audience : ${brief.targetAudience || '(non définie)'}`,
      `Destination : ${brief.destinationUrl || '(non définie)'}`,
      `Voix de marque : ${brief.brandVoice || '(non définie)'}`,
      `Objectif business : ${brief.businessGoal || '(non défini)'}`,
      '',
      '--- STRUCTURES CONCURRENTES ---',
      formatCompetitorHeadings(knowledgeBase),
      '',
      '--- BASE DE CONNAISSANCES ---',
      kbSummary,
      '',
      '--- CONSIGNE ---',
      'Génère le plan en Markdown selon les règles du système.',
    ].join('\n');

    void run(
      [
        { role: 'system', content: SEO_OUTLINE_FROM_KB_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      undefined,
      {
        onComplete: (text) => {
          setPlanDraft(text);
        },
      }
    );
  }, [brief, kbSummary, knowledgeBase, run, setError, setOutput]);

  const planTextForScore = useMemo(
    () => (planDraft.trim() || output.trim()),
    [planDraft, output]
  );

  const planScore: PlanScore | null = useMemo(() => {
    if (loading || !planTextForScore) return null;
    return scorePlan(planTextForScore, brief, competitorH2);
  }, [brief, competitorH2, loading, planTextForScore]);

  const insertPlan = useCallback(() => {
    const md = planDraft.trim() || output.trim();
    if (!md) {
      toast.error('Aucun plan à insérer');
      return;
    }
    if (planScore && planScore.overall < SCORE_WARN_THRESHOLD) {
      const ok = window.confirm(
        `Le score du plan est ${planScore.overall}/100 (seuil conseillé ${SCORE_WARN_THRESHOLD}). Insérer quand même dans l’éditeur ?`
      );
      if (!ok) return;
    }
    const current = getMarkdown().trim();
    if (current.length > 0) {
      const ok = window.confirm(
        'Remplacer tout le contenu de l’éditeur par le plan généré ?'
      );
      if (!ok) return;
    }
    try {
      replaceEditorFromMarkdown(editor, md);
      toast.success('Plan inséré dans l’éditeur');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Insertion impossible');
    }
  }, [editor, getMarkdown, output, planDraft, planScore]);

  const canInsert =
    !loading &&
    (planDraft.trim().length > 0 || output.trim().length > 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-3">
      {briefIncomplete && (
        <div className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 rounded-md border px-3 py-2 text-xs">
          Brief incomplet — complétez le mot-clé principal et l&apos;intention de
          recherche à l&apos;étape Brief.
        </div>
      )}
      <OutlineGenerator
        focusKeyword={brief.focusKeyword}
        knowledgeBase={knowledgeBase}
        provider={provider}
        onProviderChange={setProvider}
        loading={loading}
        onGenerate={runOutline}
        onStop={stop}
        error={error}
        generateDisabled={briefIncomplete}
      />
      <OutlinePreview
        output={output}
        loading={loading}
        draft={planDraft}
        onDraftChange={setPlanDraft}
        onRegenerate={runOutline}
        onInsert={insertPlan}
        canInsert={canInsert}
        planScore={planScore}
        scoreWarnThreshold={SCORE_WARN_THRESHOLD}
        regenerateDisabled={briefIncomplete}
      />
    </div>
  );
}
