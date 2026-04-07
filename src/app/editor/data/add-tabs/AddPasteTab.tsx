'use client';

import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { makeSource } from '@/lib/knowledge-base/kb-helpers';
import type { KbSource } from '@/types/knowledge-base';

type AddPasteTabProps = {
  onAdd: (sources: KbSource[]) => void;
};

export function AddPasteTab({ onAdd }: AddPasteTabProps) {
  const [paste, setPaste] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const raw = paste.trim();
    if (!raw) {
      setError('Collez du texte avant d’ajouter.');
      return;
    }
    setError(null);
    onAdd([
      makeSource({
        type: 'text',
        label: 'Texte collé',
        content: raw,
      }),
    ]);
    setPaste('');
    toast.success('Texte ajouté à la base');
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        Collez du texte brut (export, notes, etc.). Il sera ajouté comme source « Texte ».
      </p>
      <Textarea
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
        placeholder="Collez votre texte…"
        className="bg-background min-h-[120px] resize-y text-sm"
      />
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <Button type="button" size="sm" className="gap-1" onClick={submit}>
        <PlusIcon className="size-3.5" />
        Ajouter à la base
      </Button>
    </div>
  );
}
