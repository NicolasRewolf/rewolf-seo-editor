'use client';

import { CopyIcon, Loader2Icon, SquareIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useWritingStep } from '@/hooks/use-writing-step';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PlateEditor } from 'platejs/react';
import type { Value } from 'platejs';
import type { ArticleBrief, ArticleMeta } from '@/types/article';
import type { KnowledgeBase } from '@/types/knowledge-base';

type StepWritingProps = {
  meta: ArticleMeta;
  brief: ArticleBrief;
  knowledgeBase: KnowledgeBase;
  editor: PlateEditor;
  docValue: Value;
  getMarkdown: () => string;
  getSelectionText: () => string;
  headings: { level: number; text: string }[];
  seoPanel?: ReactNode;
  onAiSnapshot?: (kind: 'ai-insert' | 'ai-rewrite', label?: string) => void;
};

export function StepWriting({
  meta,
  brief,
  knowledgeBase,
  editor,
  docValue,
  getMarkdown,
  getSelectionText,
  headings,
  seoPanel,
  onAiSnapshot,
}: StepWritingProps) {
  const {
    sections,
    provider,
    setProvider,
    output,
    loading,
    error,
    busy,
    promptRef,
    sectionOut,
    sectionLoading,
    activeSectionIdx,
    sectionChecked,
    setSectionChecked,
    directInsertMode,
    setDirectInsertMode,
    headlineVariants,
    selectedHeadlineVariant,
    setSelectedHeadlineVariant,
    altModalOpen,
    setAltModalOpen,
    altPrompt,
    setAltPrompt,
    altResult,
    runSectionForIndex,
    stopSection,
    copySection,
    insertAfterH2,
    runRewriteSelection,
    runSimplifySelection,
    runExpandSelection,
    runTranslateSelection,
    runFaqShortcut,
    runIntroShortcut,
    runHeadlineVariantsShortcut,
    runAltShortcut,
    runCustomPrompt,
    stop,
    copyOutput,
    insertShortcutOutputAtStart,
    insertShortcutOutputAtEnd,
    replaceSelectionWithVariant,
  } = useWritingStep({
    meta,
    brief,
    knowledgeBase,
    editor,
    docValue,
    getMarkdown,
    getSelectionText,
    headings,
    onAiSnapshot,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-3">
      <div>
        <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
          Sections (H2)
        </p>
        {sections.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            Ajoutez des titres H2 dans l’éditeur pour lister les sections.
          </p>
        ) : (
          <ul className="space-y-3">
            {sections.map((sec, idx) => (
              <li
                key={`${sec.h2}-${idx}`}
                className="border-border bg-muted/20 rounded-md border p-2 text-xs"
              >
                <div className="flex gap-2">
                  <Checkbox
                    checked={sectionChecked[idx] ?? false}
                    onCheckedChange={(v) =>
                      setSectionChecked((prev) => ({
                        ...prev,
                        [idx]: v === true,
                      }))
                    }
                    className="mt-0.5"
                    aria-label={`Section traitée : ${sec.h2}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground font-medium">{sec.h2}</p>
                    {sec.h3.length > 0 && (
                      <ul className="text-muted-foreground mt-1 list-inside list-disc">
                        {sec.h3.map((h) => (
                          <li key={h}>{h}</li>
                        ))}
                      </ul>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="mt-2"
                      disabled={sectionLoading}
                      onClick={() => void runSectionForIndex(idx)}
                    >
                      Rédiger cette section
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {seoPanel}

      {!directInsertMode &&
        (activeSectionIdx !== null || sectionLoading || sectionOut.length > 0) && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {sectionLoading && (
              <Button type="button" variant="outline" size="sm" onClick={stopSection}>
                <SquareIcon className="size-3.5" />
                Arrêter
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!sectionOut.trim()}
              onClick={() => void copySection()}
            >
              <CopyIcon className="size-3.5" />
              Copier
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!sectionOut.trim() || activeSectionIdx === null}
              onClick={() => insertAfterH2(activeSectionIdx!)}
            >
              Insérer après le H2
            </Button>
          </div>
          <pre className="border-border bg-muted/40 max-h-[min(36vh,280px)] overflow-auto rounded-md border p-3 whitespace-pre-wrap font-sans text-xs leading-relaxed">
            {sectionLoading && !sectionOut ? 'Génération…' : sectionOut}
          </pre>
        </div>
      )}

      <div className="border-border border-t pt-3">
        <p className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
          Assistant IA
        </p>
        <div className="mb-2 flex flex-wrap gap-2">
          <div className="flex rounded-md border p-0.5">
            <button
              type="button"
              onClick={() => setProvider('anthropic')}
              className={`rounded px-2 py-1 text-xs font-medium ${
                provider === 'anthropic'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Anthropic
            </button>
            <button
              type="button"
              onClick={() => setProvider('openai')}
              className={`rounded px-2 py-1 text-xs font-medium ${
                provider === 'openai'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              OpenAI
            </button>
          </div>
          <label className="border-border bg-muted/40 text-foreground inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
            <Checkbox
              checked={directInsertMode}
              onCheckedChange={(checked) => setDirectInsertMode(checked === true)}
              aria-label="Mode insertion directe"
            />
            Mode insertion directe
          </label>
        </div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 text-xs"
            disabled={busy}
            onClick={runRewriteSelection}
          >
            Réécrire sélection
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 text-xs"
            disabled={busy}
            onClick={runSimplifySelection}
          >
            Simplifier
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 text-xs"
            disabled={busy}
            onClick={runExpandSelection}
          >
            Développer
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 text-xs"
            disabled={busy}
            onClick={runTranslateSelection}
          >
            Traduire
          </Button>
        </div>
        <div className="mb-2 rounded-md border border-border bg-muted/20 p-2">
          <p className="text-foreground mb-2 text-xs font-medium">
            Raccourcis rédaction
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 text-xs"
              disabled={busy}
              onClick={runFaqShortcut}
            >
              Générer FAQ
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 text-xs"
              disabled={busy}
              onClick={runIntroShortcut}
            >
              Générer Intro
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 text-xs"
              disabled={busy}
              onClick={runHeadlineVariantsShortcut}
            >
              Variantes H1/H2
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 text-xs"
              disabled={busy}
              onClick={() => setAltModalOpen(true)}
            >
              ALT text
            </Button>
          </div>
        </div>
        {headlineVariants.length > 0 && (
          <div className="mb-2 rounded-md border border-border bg-muted/20 p-2">
            <p className="mb-1 text-xs font-medium text-foreground">
              Variantes de titre
            </p>
            <div className="space-y-1">
              {headlineVariants.map((variant) => (
                <label key={variant} className="flex items-start gap-2 text-xs">
                  <input
                    type="radio"
                    name="headline-variant"
                    checked={selectedHeadlineVariant === variant}
                    onChange={() => setSelectedHeadlineVariant(variant)}
                  />
                  <span>{variant}</span>
                </label>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={replaceSelectionWithVariant}
            >
              Remplacer dans l'éditeur
            </Button>
          </div>
        )}
        <Textarea
          ref={promptRef}
          placeholder="Consigne libre (contexte article + base de connaissances inclus)…"
          className="border-border bg-background mb-2 min-h-[72px] resize-y text-sm"
          disabled={busy}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={runCustomPrompt}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2Icon className="size-4 animate-spin" aria-hidden />
                Génération…
              </span>
            ) : (
              'Envoyer'
            )}
          </Button>
          {loading && (
            <Button type="button" variant="outline" size="sm" onClick={stop}>
              <SquareIcon className="size-3.5" />
              Arrêter
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!output}
            onClick={() => void copyOutput()}
          >
            <CopyIcon className="size-3.5" />
            Copier
          </Button>
        </div>
        {error && (
          <p className="text-destructive mt-2 text-sm" role="alert">
            {error}
          </p>
        )}
        {output && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={insertShortcutOutputAtStart}
              >
                Insérer au début
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={insertShortcutOutputAtEnd}
              >
                Insérer à la fin
              </Button>
            </div>
            <pre className="border-border bg-muted/40 max-h-[min(40vh,320px)] overflow-auto rounded-md border p-3 whitespace-pre-wrap font-sans text-xs leading-relaxed">
              {output}
            </pre>
          </div>
        )}
      </div>
      <Dialog open={altModalOpen} onOpenChange={setAltModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Générer un ALT text</DialogTitle>
            <DialogDescription>
              Décrivez l’image et générez un ALT (max 125 caractères).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={altPrompt}
            onChange={(e) => setAltPrompt(e.target.value)}
            placeholder="Ex: Photo d'un avocat en consultation avec son client dans un cabinet moderne"
            className="min-h-[88px] text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={runAltShortcut} disabled={busy}>
              Générer
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!altResult}
              onClick={() => void navigator.clipboard.writeText(altResult)}
            >
              Copier
            </Button>
          </div>
          {altResult && (
            <p className="rounded-md border border-border bg-muted/30 p-2 text-xs">
              {altResult}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
