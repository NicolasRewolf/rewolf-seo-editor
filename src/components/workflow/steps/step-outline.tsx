'use client';

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { OutlineGenerator } from '@/components/workflow/outline/outline-generator';
import { OutlinePreview } from '@/components/workflow/outline/outline-preview';
import { useAiAssistant } from '@/hooks/useAiAssistant';
import { SEO_OUTLINE_FROM_KB_PROMPT } from '@/lib/ai/prompts/workflow';
import { concatKbSources } from '@/lib/knowledge-base/kb-text';
import { replaceEditorFromMarkdown } from '@/lib/plate/insert-markdown';
import type { PlateEditor } from 'platejs/react';
import type { ArticleMeta } from '@/types/article';
import type { KnowledgeBase } from '@/types/knowledge-base';

const KB_SUMMARY_MAX = 8000;

type StepOutlineProps = {
  meta: ArticleMeta;
  knowledgeBase: KnowledgeBase;
  editor: PlateEditor;
  getMarkdown: () => string;
};

export function StepOutline({
  meta,
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

  const [planDraft, setPlanDraft] = useState('');

  const runOutline = useCallback(() => {
    setOutput('');
    setError(null);
    const userPrompt = [
      `Mot-clé principal : ${meta.focusKeyword || '(non défini)'}`,
      `Intention : déduire du mot-clé et des sources.`,
      '',
      '--- Base de connaissances (extraits) ---',
      kbSummary,
      '',
      '--- Consigne ---',
      'Propose un plan d\'article (H2 et H3) sous forme de Markdown. Pour chaque section, indique 2-3 points clés à couvrir. Base-toi sur les sources fournies.',
    ].join('\n');

    void run(
      [
        { role: 'system', content: SEO_OUTLINE_FROM_KB_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      undefined,
      { onComplete: (text) => setPlanDraft(text) }
    );
  }, [kbSummary, meta.focusKeyword, run, setError, setOutput]);

  const insertPlan = useCallback(() => {
    const md = (planDraft.trim() || output.trim());
    if (!md) {
      toast.error('Aucun plan à insérer');
      return;
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
  }, [editor, getMarkdown, output, planDraft]);

  const canInsert =
    !loading &&
    (planDraft.trim().length > 0 || output.trim().length > 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-3">
      <OutlineGenerator
        meta={meta}
        knowledgeBase={knowledgeBase}
        provider={provider}
        onProviderChange={setProvider}
        loading={loading}
        onGenerate={runOutline}
        onStop={stop}
        error={error}
      />
      <OutlinePreview
        output={output}
        loading={loading}
        draft={planDraft}
        onDraftChange={setPlanDraft}
        onRegenerate={runOutline}
        onInsert={insertPlan}
        canInsert={canInsert}
      />
    </div>
  );
}
