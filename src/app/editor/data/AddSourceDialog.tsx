'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useMemo } from 'react';

import { AddFileTab } from '@/app/editor/data/add-tabs/AddFileTab';
import { AddPasteTab } from '@/app/editor/data/add-tabs/AddPasteTab';
import { AddSerpTab } from '@/app/editor/data/add-tabs/AddSerpTab';
import { AddUrlTab } from '@/app/editor/data/add-tabs/AddUrlTab';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { normalizedSourceUrlsFromSources } from '@/lib/knowledge-base/kb-helpers';
import type { ArticleMeta } from '@/types/article';
import type { KnowledgeBase, KbSource } from '@/types/knowledge-base';

type AddSourceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta: ArticleMeta;
  knowledgeBase: KnowledgeBase;
  onKnowledgeBaseChange: Dispatch<SetStateAction<KnowledgeBase>>;
  onCompetitorWords?: (wordCount: number | undefined) => void;
};

export function AddSourceDialog({
  open,
  onOpenChange,
  meta,
  knowledgeBase,
  onKnowledgeBaseChange,
  onCompetitorWords,
}: AddSourceDialogProps) {
  const existingSourceUrls = useMemo(
    () => normalizedSourceUrlsFromSources(knowledgeBase.sources),
    [knowledgeBase.sources]
  );

  function appendSources(sources: KbSource[], closeAfter: boolean) {
    if (!sources.length) return;
    onKnowledgeBaseChange((prev) => ({
      sources: [...prev.sources, ...sources],
    }));
    if (closeAfter) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(90vh,720px)] w-full max-w-[min(40rem,calc(100vw-1.5rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(42rem,calc(100vw-2rem))]"
        showCloseButton
      >
        <div className="border-border shrink-0 border-b px-4 pt-4 pb-3 pr-12 sm:px-5 sm:pt-5">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base sm:text-lg">Ajouter une source</DialogTitle>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
          <Tabs defaultValue="serp" className="flex w-full min-w-0 flex-col gap-0">
            <TabsList className="bg-muted/80 mb-3 grid h-auto min-h-0 w-full min-w-0 grid-cols-2 gap-1 rounded-lg p-1 sm:grid-cols-4">
              <TabsTrigger
                value="serp"
                className="min-h-8 min-w-0 shrink whitespace-normal text-xs sm:text-sm"
              >
                SERP
              </TabsTrigger>
              <TabsTrigger
                value="url"
                className="min-h-8 min-w-0 shrink whitespace-normal text-xs sm:text-sm"
              >
                URL
              </TabsTrigger>
              <TabsTrigger
                value="paste"
                className="min-h-8 min-w-0 shrink whitespace-normal text-xs sm:text-sm"
              >
                Coller
              </TabsTrigger>
              <TabsTrigger
                value="file"
                className="min-h-8 min-w-0 shrink whitespace-normal text-xs sm:text-sm"
              >
                Fichier
              </TabsTrigger>
            </TabsList>
            <TabsContent value="serp" className="mt-0 min-w-0">
              <AddSerpTab
                meta={meta}
                existingSourceUrls={existingSourceUrls}
                onAdd={(srcs) => appendSources(srcs, false)}
                onCompetitorWords={onCompetitorWords}
              />
            </TabsContent>
            <TabsContent value="url" className="mt-0 min-w-0">
              <AddUrlTab
                existingSourceUrls={existingSourceUrls}
                onAdd={(srcs) => appendSources(srcs, true)}
                onFetchedUrlWords={onCompetitorWords}
              />
            </TabsContent>
            <TabsContent value="paste" className="mt-0 min-w-0">
              <AddPasteTab onAdd={(srcs) => appendSources(srcs, true)} />
            </TabsContent>
            <TabsContent value="file" className="mt-0 min-w-0">
              <AddFileTab onAdd={(srcs) => appendSources(srcs, true)} />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
