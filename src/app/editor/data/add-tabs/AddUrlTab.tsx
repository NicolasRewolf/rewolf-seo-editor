'use client';

import { LinkIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchReaderContent } from '@/lib/api/reader-fetch';
import { extractHeadingsFromMarkdown } from '@/lib/knowledge-base/extract-headings';
import {
  countWords,
  makeSource,
  normalizeSourceUrl,
  roughPlainFromMarkdown,
} from '@/lib/knowledge-base/kb-helpers';
import type { KbSource } from '@/types/knowledge-base';

type AddUrlTabProps = {
  existingSourceUrls: ReadonlySet<string>;
  onAdd: (sources: KbSource[]) => void;
  onFetchedUrlWords?: (wordCount: number | undefined) => void;
};

export function AddUrlTab({
  existingSourceUrls,
  onAdd,
  onFetchedUrlWords,
}: AddUrlTabProps) {
  const [url, setUrl] = useState('');
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = url.trim();
  const normalizedInput = useMemo(
    () => (trimmed ? normalizeSourceUrl(trimmed) : ''),
    [trimmed]
  );
  const alreadyInBase =
    normalizedInput !== '' && existingSourceUrls.has(normalizedInput);

  function extractUrl() {
    const u = url.trim();
    if (!u) {
      setError('Saisissez une URL https.');
      return;
    }
    if (existingSourceUrls.has(normalizeSourceUrl(u))) {
      toast.message('Cette page est déjà dans la base');
      return;
    }
    setLoadingUrl(true);
    setError(null);
    void (async () => {
      try {
        const md = await fetchReaderContent(u, { markdown: true });
        const plain = roughPlainFromMarkdown(md);
        const headings = extractHeadingsFromMarkdown(md);
        const wc = countWords(plain);
        onFetchedUrlWords?.(wc > 0 ? wc : undefined);
        onAdd([
          makeSource({
            type: 'url',
            label: u.length > 48 ? `${u.slice(0, 45)}…` : u,
            content: plain,
            url: u,
            headings: headings.length ? headings : undefined,
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
    <div className="min-w-0 space-y-3">
      <p className="text-muted-foreground text-xs break-words">
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
          disabled={loadingUrl || alreadyInBase}
          onClick={extractUrl}
        >
          <LinkIcon className="size-3.5" />
          {alreadyInBase ? 'Déjà en base' : 'Extraire'}
        </Button>
      </div>
      {alreadyInBase && trimmed && (
        <p className="text-muted-foreground text-xs" role="status">
          Cette URL est déjà dans vos sources.
        </p>
      )}
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
