'use client';

import { FileJsonIcon } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import type { InternalLink, InternalLinksMap } from '@/types/internal-links';

type InternalLinksImportProps = {
  internalLinks: InternalLinksMap | null;
  onChange: (next: InternalLinksMap | null) => void;
};

function normalizeImported(raw: unknown): InternalLink[] {
  if (Array.isArray(raw)) {
    return raw as InternalLink[];
  }
  if (
    raw &&
    typeof raw === 'object' &&
    'links' in raw &&
    Array.isArray((raw as { links: unknown }).links)
  ) {
    return (raw as { links: InternalLink[] }).links;
  }
  return [];
}

export function InternalLinksImport({
  internalLinks,
  onChange,
}: InternalLinksImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function onFile(f: File) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const text = String(r.result ?? '');
        const parsed = JSON.parse(text) as unknown;
        const links = normalizeImported(parsed);
        if (!links.length) {
          toast.error('Aucun lien valide dans le fichier');
          return;
        }
        onChange({ links, importedAt: new Date().toISOString() });
        toast.success(`${links.length} lien(s) importé(s)`);
      } catch {
        toast.error('JSON invalide');
      }
    };
    r.readAsText(f, 'UTF-8');
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => inputRef.current?.click()}
      >
        <FileJsonIcon className="size-3.5" />
        Importer le fichier .json de liens internes
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
      {internalLinks && internalLinks.links.length > 0 && (
        <ul className="border-border bg-muted/30 max-h-[min(28vh,200px)] overflow-auto rounded-md border p-2 text-xs">
          {internalLinks.links.map((l, i) => (
            <li key={`${l.url}-${i}`} className="border-border/60 border-b py-1 last:border-b-0">
              <span className="text-foreground font-medium">{l.anchor}</span>
              {l.title && (
                <span className="text-muted-foreground"> — {l.title}</span>
              )}
              <p className="text-muted-foreground truncate font-mono">{l.url}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
