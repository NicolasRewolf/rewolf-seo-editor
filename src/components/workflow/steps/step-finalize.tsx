'use client';

import { ExportActions } from '@/components/workflow/review/export-actions';
import { EnrichLinksSection } from '@/components/workflow/enrich/enrich-links-section';
import { EnrichMetaJsonldSection } from '@/components/workflow/enrich/enrich-meta-jsonld-section';
import { EnrichNlpSection } from '@/components/workflow/enrich/enrich-nlp-section';
import { FinalizeSeoTab } from '@/components/workflow/finalize/finalize-seo-tab';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import type { ArticleBrief, ArticleMeta } from '@/types/article';
import type { InternalLinksMap } from '@/types/internal-links';
import type { KnowledgeBase } from '@/types/knowledge-base';
import type { SeoAnalysisResult } from '@/types/seo';
import type { Value } from 'platejs';
import { useState } from 'react';

type StepFinalizeProps = {
  meta: ArticleMeta;
  brief: ArticleBrief;
  knowledgeBase: KnowledgeBase;
  internalLinks: InternalLinksMap | null;
  onInternalLinksChange: (m: InternalLinksMap | null) => void;
  seoAnalysis: SeoAnalysisResult | null;
  getMarkdown: () => string;
  userPlainText: string;
  onMetaChange: (m: ArticleMeta) => void;
  editorContent: Value;
  onSaveToDisk?: () => void;
};

export function StepFinalize({
  meta,
  brief,
  knowledgeBase,
  internalLinks,
  onInternalLinksChange,
  seoAnalysis,
  getMarkdown,
  userPlainText,
  onMetaChange,
  editorContent,
  onSaveToDisk,
}: StepFinalizeProps) {
  const [jsonLdBundle, setJsonLdBundle] = useState<object | null>(null);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col px-2 py-2">
      <Tabs
        defaultValue="seo"
        orientation="horizontal"
        className="flex min-h-0 flex-1 flex-col gap-2"
      >
        <TabsList
          variant="line"
          className="bg-muted/30 h-auto w-full min-w-0 shrink-0 flex-wrap justify-start gap-0.5 overflow-x-auto p-1"
        >
          <TabsTrigger value="seo" className="shrink-0 text-xs">
            Contrôle SEO
          </TabsTrigger>
          <TabsTrigger value="links" className="shrink-0 text-xs">
            Liens
          </TabsTrigger>
          <TabsTrigger value="meta" className="shrink-0 text-xs">
            Meta & JSON-LD
          </TabsTrigger>
          <TabsTrigger value="export" className="shrink-0 text-xs">
            Export
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="seo"
          className="min-h-0 flex-1 overflow-y-auto px-1 py-1 data-[state=inactive]:hidden"
        >
          <FinalizeSeoTab meta={meta} seoAnalysis={seoAnalysis} />
        </TabsContent>

        <TabsContent
          value="links"
          className="min-h-0 flex-1 overflow-y-auto px-1 py-1 data-[state=inactive]:hidden"
        >
          <div className="flex flex-col gap-6">
            <section>
              <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                Liens internes
              </p>
              <EnrichLinksSection
                meta={meta}
                brief={brief}
                internalLinks={internalLinks}
                onInternalLinksChange={onInternalLinksChange}
                getMarkdown={getMarkdown}
              />
            </section>
            <section>
              <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                Termes manquants
              </p>
              <EnrichNlpSection
                userPlainText={userPlainText}
                knowledgeBase={knowledgeBase}
              />
            </section>
          </div>
        </TabsContent>

        <TabsContent
          value="meta"
          className="min-h-0 flex-1 overflow-y-auto px-1 py-1 data-[state=inactive]:hidden"
        >
          <EnrichMetaJsonldSection
            meta={meta}
            brief={brief}
            getMarkdown={getMarkdown}
            onMetaChange={onMetaChange}
            onJsonLdChange={setJsonLdBundle}
          />
        </TabsContent>

        <TabsContent
          value="export"
          className="min-h-0 flex-1 overflow-y-auto px-1 py-1 data-[state=inactive]:hidden"
        >
          <ExportActions
            meta={meta}
            brief={brief}
            getMarkdown={getMarkdown}
            editorContent={editorContent}
            onSaveToDisk={onSaveToDisk}
            jsonLdBundle={jsonLdBundle}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
