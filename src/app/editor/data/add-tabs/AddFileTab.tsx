'use client';

import { FileUpIcon } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { makeSource } from '@/lib/knowledge-base/kb-helpers';
import type { KbSource } from '@/types/knowledge-base';

type AddFileTabProps = {
  onAdd: (sources: KbSource[]) => void;
};

export function AddFileTab({ onAdd }: AddFileTabProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
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
        onAdd(next);
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
    [onAdd]
  );

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        Fichiers .txt, .md ou .json — vous pouvez en déposer plusieurs.
      </p>
      <div
        className={cn(
          'rounded-lg border border-dashed p-4 transition-colors',
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
        <div className="flex flex-col items-center gap-2 text-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUpIcon className="size-3.5" />
            Choisir des fichiers
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
          <p className="text-muted-foreground text-xs">ou glissez-déposez ici</p>
        </div>
      </div>
    </div>
  );
}
