'use client';

import { EyeIcon } from 'lucide-react';
import { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { buildArticleHtmlDocument } from '@/lib/html/export-article-html';
import { cn } from '@/lib/utils';
import type { ArticleMeta } from '@/types/article';

type HtmlPreviewDialogProps = {
  meta: ArticleMeta;
  getMarkdown: () => string;
  triggerClassName?: string;
};

export function HtmlPreviewDialog({
  meta,
  getMarkdown,
  triggerClassName,
}: HtmlPreviewDialogProps) {
  const [open, setOpen] = useState(false);

  const srcDoc = open
    ? buildArticleHtmlDocument(meta, getMarkdown(), { embedStyles: true })
    : '';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'border-border bg-background hover:bg-muted inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm',
            triggerClassName
          )}
        >
          <EyeIcon className="size-3.5" aria-hidden />
          Aperçu HTML
        </button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-border shrink-0 border-b px-4 py-3">
          <DialogTitle>Aperçu publication</DialogTitle>
          <DialogDescription>
            Rendu Markdown → HTML (GFM) avec styles de base. Même moteur que
            l'export, option styles activée.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted/30 min-h-0 flex-1 p-2">
          {srcDoc ? (
            <iframe
              title="Aperçu HTML"
              className="bg-background h-[min(70vh,640px)] w-full rounded-md border"
              sandbox=""
              srcDoc={srcDoc}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
