'use client';

import { KEYS } from 'platejs';
import { useEditorRef, useEditorSelector } from 'platejs/react';

import { setBlockType } from '@/components/editor/transforms';
import {
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
} from '@/components/ui/toolbar';
import { cn } from '@/lib/utils';

const STYLES = [
  { type: KEYS.p, label: 'Paragraphe', short: 'Texte' },
  { type: KEYS.h1, label: 'Titre 1', short: 'H1' },
  { type: KEYS.h2, label: 'Titre 2', short: 'H2' },
  { type: KEYS.h3, label: 'Titre 3', short: 'H3' },
] as const;

export function EditorHeadingToolbar() {
  const editor = useEditorRef();

  const activeType = useEditorSelector((ed) => {
    const block = ed.api.block();
    if (!block) return KEYS.p;
    const node = block[0];
    if (node[KEYS.listType]) return KEYS.p;
    const t = node.type as string;
    if (t === KEYS.p || t === KEYS.h1 || t === KEYS.h2 || t === KEYS.h3) {
      return t;
    }
    return KEYS.p;
  }, []);

  return (
    <Toolbar
      className="border-border bg-muted/30 shrink-0 flex-wrap gap-0.5 rounded-md border px-1.5 py-1"
      aria-label="Style de paragraphe"
    >
      {STYLES.map((s) => (
        <ToolbarButton
          key={s.type}
          size="sm"
          className={cn(
            activeType === s.type &&
              'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground'
          )}
          onClick={() => setBlockType(editor, s.type)}
          tooltip={`${s.label} — ${s.short}`}
          type="button"
        >
          <span className="font-medium">{s.short}</span>
        </ToolbarButton>
      ))}
      <ToolbarSeparator className="mx-1" />
      <span className="text-muted-foreground hidden px-1 text-xs sm:inline">
        ou tapez <kbd className="rounded border bg-background px-1">/</kbd> pour
        le menu
      </span>
    </Toolbar>
  );
}
