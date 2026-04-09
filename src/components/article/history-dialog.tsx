'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { formatDateTimeFr } from '@shared/core';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  clearOld,
  listSnapshots,
  type Snapshot,
} from '@/lib/storage/history-store';

type HistoryDialogProps = {
  slug: string;
  onRestore: (snapshot: Snapshot) => void;
};

export function HistoryDialog({ slug, onRestore }: HistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const rows = await listSnapshots(slug);
        if (!cancelled) setSnapshots(rows.slice(0, 20));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, slug]);

  async function purge() {
    await clearOld(slug, 20);
    const rows = await listSnapshots(slug);
    setSnapshots(rows.slice(0, 20));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="border-border bg-background hover:bg-muted inline-flex h-8 items-center rounded-md border px-3 text-sm"
        >
          Historique
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Historique des versions</DialogTitle>
          <DialogDescription>
            20 derniers snapshots (manual / ai-insert / ai-rewrite).
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {loading && (
            <p className="text-muted-foreground text-sm">Chargement…</p>
          )}
          {!loading && snapshots.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Aucun snapshot disponible.
            </p>
          )}
          {snapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className="border-border bg-muted/20 rounded-md border p-2 text-xs"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-foreground font-medium">
                  {formatDateTimeFr(snapshot.createdAt)} · {snapshot.kind}
                </span>
                <button
                  type="button"
                  className="border-border bg-background hover:bg-muted rounded border px-2 py-1"
                  onClick={() => {
                    if (!confirm('Restaurer ce snapshot ?')) return;
                    onRestore(snapshot);
                    toast.success('Snapshot restauré');
                    setOpen(false);
                  }}
                >
                  Restaurer
                </button>
              </div>
              {snapshot.label && (
                <p className="text-muted-foreground">{snapshot.label}</p>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            className="border-border bg-background hover:bg-muted inline-flex h-8 items-center rounded-md border px-3 text-sm"
            onClick={() => void purge()}
          >
            Purger 20+
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
