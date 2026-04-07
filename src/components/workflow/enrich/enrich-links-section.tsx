'use client';

import { InternalLinksImport } from '@/components/workflow/enrich/internal-links-import';
import { InternalLinksSuggest } from '@/components/workflow/enrich/internal-links-suggest';
import { useAiAssistant } from '@/hooks/useAiAssistant';
import { buildArticleContextBlock } from '@/lib/ai/article-context';
import { SEO_INTERNAL_LINKS_PROMPT } from '@/lib/ai/prompts/workflow';
import type { ArticleMeta } from '@/types/article';
import type { InternalLinksMap } from '@/types/internal-links';
import { useCallback } from 'react';

type EnrichLinksSectionProps = {
  meta: ArticleMeta;
  internalLinks: InternalLinksMap | null;
  onInternalLinksChange: (m: InternalLinksMap | null) => void;
  getMarkdown: () => string;
};

export function EnrichLinksSection({
  meta,
  internalLinks,
  onInternalLinksChange,
  getMarkdown,
}: EnrichLinksSectionProps) {
  const {
    output: linkSuggestOut,
    setOutput: setLinkSuggestOut,
    loading: linkLoading,
    run: runStream,
    stop: stopStream,
  } = useAiAssistant();

  const runLinkSuggest = useCallback(() => {
    if (!internalLinks?.links.length) return;
    setLinkSuggestOut('');
    const ctx = buildArticleContextBlock(meta, getMarkdown());
    const linksJson = JSON.stringify(internalLinks.links, null, 2);
    void runStream(
      [
        { role: 'system', content: SEO_INTERNAL_LINKS_PROMPT },
        {
          role: 'user',
          content: `Article (Markdown) :\n${ctx}\n\n--- Liens internes disponibles ---\n${linksJson}`,
        },
      ],
      'quality'
    );
  }, [getMarkdown, internalLinks, meta, runStream, setLinkSuggestOut]);

  return (
    <div className="space-y-4">
      <InternalLinksImport
        internalLinks={internalLinks}
        onChange={onInternalLinksChange}
      />
      <InternalLinksSuggest
        internalLinks={internalLinks}
        loading={linkLoading}
        output={linkSuggestOut}
        onGenerate={runLinkSuggest}
        onStop={stopStream}
      />
    </div>
  );
}
