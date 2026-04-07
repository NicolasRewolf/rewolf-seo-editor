'use client';

import type { Dispatch, SetStateAction } from 'react';

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
import type { ArticleMeta } from '@/types/article';
import type { KnowledgeBase, KbSource } from '@/types/knowledge-base';

type AddSourceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta: ArticleMeta;
  onKnowledgeBaseChange: Dispatch<SetStateAction<KnowledgeBase>>;
  onCompetitorWords?: (wordCount: number | undefined) => void;
};

export function AddSourceDialog({
  open,
  onOpenChange,
  meta,
  onKnowledgeBaseChange,
  onCompetitorWords,
}: AddSourceDialogProps) {
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
        className="max-h-[min(90vh,720px)] max-w-2xl overflow-y-auto sm:max-w-2xl"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>Ajouter une source</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="serp" className="w-full gap-3">
          <TabsList className="flex w-full flex-wrap gap-1">
            <TabsTrigger value="serp" className="text-xs sm:text-sm">
              SERP
            </TabsTrigger>
            <TabsTrigger value="url" className="text-xs sm:text-sm">
              URL
            </TabsTrigger>
            <TabsTrigger value="paste" className="text-xs sm:text-sm">
              Coller
            </TabsTrigger>
            <TabsTrigger value="file" className="text-xs sm:text-sm">
              Fichier
            </TabsTrigger>
          </TabsList>
          <TabsContent value="serp" className="mt-3">
            <AddSerpTab
              meta={meta}
              onAdd={(srcs) => appendSources(srcs, false)}
              onCompetitorWords={onCompetitorWords}
            />
          </TabsContent>
          <TabsContent value="url" className="mt-3">
            <AddUrlTab
              onAdd={(srcs) => appendSources(srcs, true)}
              onFetchedUrlWords={onCompetitorWords}
            />
          </TabsContent>
          <TabsContent value="paste" className="mt-3">
            <AddPasteTab onAdd={(srcs) => appendSources(srcs, true)} />
          </TabsContent>
          <TabsContent value="file" className="mt-3">
            <AddFileTab onAdd={(srcs) => appendSources(srcs, true)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
