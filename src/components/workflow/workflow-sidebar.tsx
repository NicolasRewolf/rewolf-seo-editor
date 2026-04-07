'use client';

import type { Dispatch, SetStateAction } from 'react';

import { StepFinalize } from '@/components/workflow/steps/step-finalize';
import { StepOutline } from '@/components/workflow/steps/step-outline';
import { StepResearch } from '@/components/workflow/steps/step-research';
import { StepWriting } from '@/components/workflow/steps/step-writing';
import type { ArticleMeta } from '@/types/article';
import type { InternalLinksMap } from '@/types/internal-links';
import type { KnowledgeBase } from '@/types/knowledge-base';
import type { SeoAnalysisResult } from '@/types/seo';
import type { WorkflowStep } from '@/types/workflow';
import type { PlateEditor } from 'platejs/react';
import type { Value } from 'platejs';

export type WorkflowSidebarProps = {
  step: WorkflowStep;
  meta: ArticleMeta;
  knowledgeBase: KnowledgeBase;
  onKnowledgeBaseChange: Dispatch<SetStateAction<KnowledgeBase>>;
  internalLinks: InternalLinksMap | null;
  onInternalLinksChange: (m: InternalLinksMap | null) => void;
  seoAnalysis: SeoAnalysisResult | null;
  editor: PlateEditor;
  docValue: Value;
  getMarkdown: () => string;
  getSelectionText: () => string;
  onMetaChange: (m: ArticleMeta) => void;
  onCompetitorWords?: (wordCount: number | undefined) => void;
  headings: { level: number; text: string }[];
  userPlainText: string;
  onSaveToDisk?: () => void;
};

export function WorkflowSidebar(props: WorkflowSidebarProps) {
  const {
    step,
    meta,
    knowledgeBase,
    onKnowledgeBaseChange,
    internalLinks,
    onInternalLinksChange,
    seoAnalysis,
    editor,
    docValue,
    getMarkdown,
    getSelectionText,
    onMetaChange,
    onCompetitorWords,
    headings,
    userPlainText,
    onSaveToDisk,
  } = props;

  switch (step) {
    case 'research':
      return (
        <StepResearch
          meta={meta}
          knowledgeBase={knowledgeBase}
          onKnowledgeBaseChange={onKnowledgeBaseChange}
          onCompetitorWords={onCompetitorWords}
        />
      );
    case 'outline':
      return (
        <StepOutline
          meta={meta}
          knowledgeBase={knowledgeBase}
          editor={editor}
          getMarkdown={getMarkdown}
        />
      );
    case 'writing':
      return (
        <StepWriting
          meta={meta}
          knowledgeBase={knowledgeBase}
          editor={editor}
          docValue={docValue}
          getMarkdown={getMarkdown}
          getSelectionText={getSelectionText}
          headings={headings}
        />
      );
    case 'finalize':
      return (
        <StepFinalize
          meta={meta}
          knowledgeBase={knowledgeBase}
          internalLinks={internalLinks}
          onInternalLinksChange={onInternalLinksChange}
          seoAnalysis={seoAnalysis}
          getMarkdown={getMarkdown}
          userPlainText={userPlainText}
          onMetaChange={onMetaChange}
          editorContent={docValue}
          onSaveToDisk={onSaveToDisk}
        />
      );
    default:
      return null;
  }
}
