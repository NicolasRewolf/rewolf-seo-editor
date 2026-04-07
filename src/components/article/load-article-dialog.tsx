'use client';

import { FolderOpenIcon, Loader2Icon } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  getArticleFromDisk,
  listArticlesOnDisk,
  type DiskArticlePayload,
} from '@/lib/api/articles-disk';
import { cn } from '@/lib/utils';

type LoadArticleDialogProps = {
  onLoad: (article: DiskArticlePayload) => void;
  triggerClassName?: string;
};

export function LoadArticleDialog({
  onLoad,
  triggerClassName,
}: LoadArticleDialogProps) {
  const [open, setOpen] = useState(false);
  const [slugs, setSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  const refreshList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listArticlesOnDisk();
      setSlugs(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setSlugs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) void refreshList();
  };

  const loadSlug = async (slug: string) => {
    setLoadingSlug(slug);
    setError(null);
    try {
      const article = await getArticleFromDisk(slug);
      onLoad(article);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoadingSlug(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'border-border bg-background hover:bg-muted inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm',
            triggerClassName
          )}
        >
          <FolderOpenIcon className="size-3.5" aria-hidden />
          Charger ./data
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Articles</DialogTitle>
          <DialogDescription>
            Fichiers JSON dans <code className="text-foreground/90">data/articles/</code>{' '}
            (API locale).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void refreshList()}
            >
              {loading ? (
                <Loader2Icon className="size-4 animate-spin" aria-hidden />
              ) : null}
              Actualiser
            </Button>
          </div>
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
          {slugs.length === 0 && !loading && !error && (
            <p className="text-muted-foreground text-sm">
              Aucun article enregistré. Utilisez « Enregistrer ./data ».
            </p>
          )}
          <ul className="max-h-[min(50vh,320px)] space-y-1 overflow-y-auto">
            {slugs.map((slug) => (
              <li key={slug}>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-auto w-full justify-start py-2 font-mono text-xs"
                  disabled={loadingSlug !== null}
                  onClick={() => void loadSlug(slug)}
                >
                  {loadingSlug === slug ? (
                    <Loader2Icon className="size-4 shrink-0 animate-spin" />
                  ) : null}
                  {slug}.json
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
