'use client';

import { FileUpIcon, LinkIcon, PlusIcon } from 'lucide-react';
import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { countWords, nowIso } from '@shared/core';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { fetchReaderContent } from '@/lib/api/reader-fetch';
import type { KbSource, KnowledgeBase } from '@/types/knowledge-base';
import { toast } from 'sonner';

function makeSource(
  partial: Omit<KbSource, 'id' | 'wordCount' | 'addedAt'>
): KbSource {
  const content = partial.content;
  return {
    id: crypto.randomUUID(),
    ...partial,
    wordCount: countWords(content),
    addedAt: nowIso(),
  };
}

type SourceImportZoneProps = {
  onChange: Dispatch<SetStateAction<KnowledgeBase>>;
  onFetchedUrlWords?: (wordCount: number | undefined) => void;
};

export function SourceImportZone({
  onChange,
  onFetchedUrlWords,
}: SourceImportZoneProps) {
  const [paste, setPaste] = useState('');
  const [url, setUrl] = useState('');
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addSources = useCallback(
    (newOnes: KbSource[]) => {
      onChange((prev) => ({ sources: [...prev.sources, ...newOnes] }));
    },
    [onChange]
  );

  function addPastedText() {
    const raw = paste.trim();
    if (!raw) {
      setError('Collez du texte avant d’ajouter.');
      return;
    }
    setError(null);
    addSources([
      makeSource({
        type: 'text',
        label: 'Texte collé',
        content: raw,
      }),
    ]);
    setPaste('');
    toast.success('Texte ajouté à la base');
  }

  const onFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      setError(null);
      void (async () => {
        const fileArr = Array.from(files);
        const next: KbSource[] = [];
        let skippedExt = 0;
        for (const file of fileArr) {
          const lower = file.name.toLowerCase();
          if (!/\.(txt|md|json)$/.test(lower)) {
            skippedExt++;
            continue;
          }
          try {
            const text = await new Promise<string>((resolve, reject) => {
              const r = new FileReader();
              r.onload = () => resolve(String(r.result ?? ''));
              r.onerror = () => reject(new Error('Lecture fichier'));
              r.readAsText(file, 'UTF-8');
            });
            next.push(
              makeSource({
                type: 'file',
                label: file.name,
                content: text,
              })
            );
          } catch {
            toast.error(`Lecture impossible : ${file.name}`);
          }
        }
        if (next.length === 0) {
          if (fileArr.length > 0) {
            toast.error(
              'Aucun fichier au format .txt, .md ou .json — formats acceptés uniquement.'
            );
          }
          return;
        }
        addSources(next);
        toast.success(
          next.length === 1
            ? '1 fichier ajouté à la base'
            : `${next.length} fichiers ajoutés à la base`
        );
        if (skippedExt > 0) {
          toast.message(
            `${skippedExt} fichier(s) ignoré(s) — seuls .txt, .md et .json sont importés.`
          );
        }
      })();
    },
    [addSources]
  );

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
        addSources([
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
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Import
      </p>
      <div
        className={cn(
          'rounded-lg border border-dashed p-2 transition-colors',
          dragOver && 'border-primary bg-primary/5'
        )}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOver(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          void onFiles(e.dataTransfer.files);
        }}
      >
        <p className="text-muted-foreground mb-2 text-xs">
          Collez, ou déposez des fichiers .txt / .md / .json
        </p>
        <Textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder="Collez du texte brut (export NotebookLM, notes, web…)"
          className="bg-background min-h-[88px] resize-y text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" className="gap-1" onClick={addPastedText}>
          <PlusIcon className="size-3.5" />
          Ajouter
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={() => fileInputRef.current?.click()}
        >
          <FileUpIcon className="size-3.5" />
          Importer fichier(s)
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.json,text/plain,text/markdown,application/json"
          multiple
          className="hidden"
          onChange={(e) => {
            void onFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <div className="flex min-w-0 gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="min-w-0 flex-1 font-mono text-xs"
          onKeyDown={(e) => {
            if (e.key === 'Enter') extractUrl();
          }}
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
