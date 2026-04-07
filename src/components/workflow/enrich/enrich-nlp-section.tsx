'use client';

import { NlpMissingTerms } from '@/components/workflow/enrich/nlp-missing-terms';
import type { KnowledgeBase } from '@/types/knowledge-base';

type EnrichNlpSectionProps = {
  userPlainText: string;
  knowledgeBase: KnowledgeBase;
};

export function EnrichNlpSection({
  userPlainText,
  knowledgeBase,
}: EnrichNlpSectionProps) {
  return (
    <NlpMissingTerms
      userPlainText={userPlainText}
      knowledgeBase={knowledgeBase}
    />
  );
}
