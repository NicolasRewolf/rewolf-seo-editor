'use client';

import { LinkIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchReaderContent } from '@/lib/api/reader-fetch';
import { countWords, makeSource } from '@/lib/knowledge-base/kb-helpers';
import type { KbSource } from '@/types/knowledge-base';

type AddUrlTabProps = {
  onAdd: (sources: KbSource[]) => void;
  onFetchedUrlWords?: (wordCount: number | undefined) => void;
};

export function AddUrlTab({ onAdd, onFetchedUrlWords }: AddUrlTabProps) {
  const [url, setUrl] = useState('');
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function extractUrl() {
    const u = url.trim();
    if (!u) {
      setError('Saisissez une URL https.');
      return;
    }
    setLoadingUrl(true);
    setError(null);
    void (async () => {
      try {
        const text = await fetchReaderContent(u);
        const wc = countWords(text);
        onFetchedUrlWords?.(wc > 0 ? wc : undefined);
        onAdd([
          makeSource({
            type: 'url',
            label: u.length > 48 ? `${u.slice(0, 45)}…` : u,
            content: text,
            url: u,
          }),
        ]);
        setUrl('');
        toast.success('Page ajoutée à la base');
      } catch (e) {
        onFetchedUrlWords?.(undefined);
        setError(e instanceof Error ? e.message : 'Erreur extraction');
      } finally {
        setLoadingUrl(false);
      }
    })();
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        Extraction du texte via le lecteur (proxy). L’URL doit être accessible.
      </p>
      <div className="flex min-w-0 gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="min-w-0 flex-1 font-mono text-xs"
          onKeyDown={(e) => {
            if (e.key === 'Enter') extractUrl();
          }}
          disabled={loadingUrl}
        />
        <Button
          type="button"
          size="sm"
          className="shrink-0 gap-1"
          disabled={loadingUrl}
          onClick={extractUrl}
        >
          <LinkIcon className="size-3.5" />
          Extraire
        </Button>
      </div>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
