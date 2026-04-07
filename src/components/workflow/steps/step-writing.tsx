'use client';

import { CopyIcon, Loader2Icon, SquareIcon } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useAiAssistant } from '@/hooks/useAiAssistant';
import { streamAiChatWithFallback } from '@/lib/api/stream-ai';
import { buildArticleContextWithKb } from '@/lib/ai/article-context';
import { SEO_SECTION_FROM_KB_PROMPT } from '@/lib/ai/prompts/workflow';
import { kbExcerptForHeading } from '@/lib/knowledge-base/kb-text';
import {
  insertMarkdownAfterH2ByIndex,
  plainTextForSectionAroundH2,
} from '@/lib/plate/insert-markdown';
import { groupH2WithH3 } from '@/lib/seo/group-headings';
import type { PlateEditor } from 'platejs/react';
import type { Descendant, Value } from 'platejs';
import type { ArticleMeta } from '@/types/article';
import type { KnowledgeBase } from '@/types/knowledge-base';

type StepWritingProps = {
  meta: ArticleMeta;
  knowledgeBase: KnowledgeBase;
  editor: PlateEditor;
  docValue: Value;
  getMarkdown: () => string;
  getSelectionText: () => string;
  headings: { level: number; text: string }[];
};

export function StepWriting({
  meta,
  knowledgeBase,
  editor,
  docValue,
  getMarkdown,
  getSelectionText,
  headings,
}: StepWritingProps) {
  const sections = useMemo(() => groupH2WithH3(headings), [headings]);

  const {
    provider,
    setProvider,
    output,
    loading,
    error,
    setError,
    run,
    stop,
  } = useAiAssistant();

  const promptRef = useRef<HTMLTextAreaElement>(null);
  const busy = loading;

  const [sectionOut, setSectionOut] = useState('');
  const [sectionLoading, setSectionLoading] = useState(false);
  const [activeSectionIdx, setActiveSectionIdx] = useState<number | null>(null);
  const sectionAbortRef = useRef<AbortController | null>(null);
  const [sectionChecked, setSectionChecked] = useState<Record<number, boolean>>(
    {}
  );

  const contextMessages = useCallback(() => {
    const ctx = buildArticleContextWithKb(meta, getMarkdown(), knowledgeBase);
    return [
      {
        role: 'system' as const,
        content:
          "Tu es un assistant SEO expert pour l'éditeur REWOLF. Réponds en français, de façon concise et actionnable. Tu reçois le contexte article (méta + markdown + base de connaissances).",
      },
      {
        role: 'user' as const,
        content: `Contexte article :\n${ctx}`,
      },
    ];
  }, [meta, getMarkdown, knowledgeBase]);

  const runCustomPrompt = useCallback(() => {
    const extra = promptRef.current?.value?.trim();
    if (!extra) {
      setError('Saisissez une consigne.');
      return;
    }
    setError(null);
    void run(
      [...contextMessages(), { role: 'user', content: extra }],
      'quality'
    );
  }, [contextMessages, run, setError]);

  const runRewriteSelection = useCallback(() => {
    const sel = getSelectionText().trim();
    if (!sel) {
      setError("Sélectionnez du texte dans l'éditeur pour la réécriture.");
      return;
    }
    setError(null);
    void run(
      [
        ...contextMessages(),
        {
          role: 'user',
          content: `Réécris le passage suivant pour le SEO (clarté, intention de recherche, mot-clé naturel). Garde le ton informatif.\n\n---\n${sel}\n---`,
        },
      ],
      'quality'
    );
  }, [contextMessages, getSelectionText, run, setError]);

  const runSimplifySelection = useCallback(() => {
    const sel = getSelectionText().trim();
    if (!sel) {
      setError("Sélectionnez du texte dans l'éditeur pour la simplification.");
      return;
    }
    setError(null);
    void run(
      [
        ...contextMessages(),
        {
          role: 'user',
          content: `Simplifie le passage suivant : phrases plus courtes (< 25 mots), vocabulaire accessible, supprime le jargon inutile. Conserve le sens et le mot-clé principal.\n\n---\n${sel}\n---`,
        },
      ],
      'quality'
    );
  }, [contextMessages, getSelectionText, run, setError]);

  const runExpandSelection = useCallback(() => {
    const sel = getSelectionText().trim();
    if (!sel) {
      setError("Sélectionnez du texte dans l'éditeur pour le développement.");
      return;
    }
    setError(null);
    void run(
      [
        ...contextMessages(),
        {
          role: 'user',
          content: `Développe le passage suivant : ajoute des détails, des exemples concrets, des données chiffrées. Garde le mot-clé naturellement intégré. 2 à 4 paragraphes de sortie.\n\n---\n${sel}\n---`,
        },
      ],
      'quality'
    );
  }, [contextMessages, getSelectionText, run, setError]);

  const runTranslateSelection = useCallback(() => {
    const sel = getSelectionText().trim();
    if (!sel) {
      setError("Sélectionnez du texte dans l'éditeur pour la traduction.");
      return;
    }
    setError(null);
    const isFrench =
      /[àâéèêëïîôùûüÿçœæ]/i.test(sel) ||
      /\b(le|la|les|de|du|des|un|une|et|est|que|qui|pour|dans|avec|sur|par)\b/i.test(
        sel
      );
    const targetLang = isFrench ? 'anglais' : 'français';
    void run(
      [
        ...contextMessages(),
        {
          role: 'user',
          content: `Traduis le passage suivant en ${targetLang}. Conserve le ton professionnel et la structure. Adapte les expressions idiomatiques.\n\n---\n${sel}\n---`,
        },
      ],
      'quality'
    );
  }, [contextMessages, getSelectionText, run, setError]);

  const runSectionForIndex = useCallback(
    async (idx: number) => {
      const sec = sections[idx];
      if (!sec) return;
      sectionAbortRef.current?.abort();
      const ac = new AbortController();
      sectionAbortRef.current = ac;
      setSectionLoading(true);
      setActiveSectionIdx(idx);
      setSectionOut('');
      const kbEx = kbExcerptForHeading(knowledgeBase, sec.h2, 12_000);
      const prevBits: string[] = [];
      for (let i = 0; i < idx; i++) {
        const t = plainTextForSectionAroundH2(
          docValue as Descendant[],
          i
        );
        if (t) prevBits.push(`### Section « ${sections[i].h2} »\n${t}`);
      }
      const userBlock = [
        `Mot-clé principal : ${meta.focusKeyword || '(non défini)'}`,
        `Titre H2 cible : ${sec.h2}`,
        sec.h3.length
          ? `Sous-titres H3 : ${sec.h3.join(' ; ')}`
          : '(pas de H3 listés sous ce H2)',
        '',
        '--- Extraits base de connaissances (pertinents) ---',
        kbEx || '(vide)',
        '',
        '--- Sections déjà rédigées (aperçu) ---',
        prevBits.length ? prevBits.join('\n\n') : '(aucune)',
        '',
        '--- Consigne ---',
        'Rédige le contenu de cette section en puisant dans les sources fournies. Markdown. 2-4 paragraphes par sous-section si H3. Ne répète pas le titre H2 en ligne seule si déjà présent dans l’article.',
      ].join('\n');

      try {
        const usedFallback = await streamAiChatWithFallback({
          provider,
          taskGroup: 'quality',
          messages: [
            { role: 'system', content: SEO_SECTION_FROM_KB_PROMPT },
            { role: 'user', content: userBlock },
          ],
          signal: ac.signal,
          onDelta: (d) => setSectionOut((prev) => prev + d),
          onFallback: () => {
            setSectionOut('');
            setProvider('openai');
          },
        });
        if (usedFallback) {
          toast.info(
            'Anthropic indisponible (flux vide). Section générée avec OpenAI.'
          );
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        toast.error(e instanceof Error ? e.message : 'Erreur génération section');
      } finally {
        setSectionLoading(false);
        sectionAbortRef.current = null;
      }
    },
    [docValue, knowledgeBase, meta.focusKeyword, provider, sections, setProvider]
  );

  function stopSection() {
    sectionAbortRef.current?.abort();
  }

  async function copySection() {
    if (!sectionOut.trim()) return;
    try {
      await navigator.clipboard.writeText(sectionOut);
      toast.success('Copié');
    } catch {
      /* ignore */
    }
  }

  function insertAfterH2(idx: number) {
    const md = sectionOut.trim();
    if (!md) {
      toast.error('Rien à insérer');
      return;
    }
    const ok = insertMarkdownAfterH2ByIndex(editor, idx, md);
    if (ok) toast.success('Contenu inséré après le H2');
    else toast.error('H2 introuvable dans l’éditeur');
  }

  async function copyOutput() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      /* ignore */
    }
  }

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

      {(activeSectionIdx !== null || sectionLoading || sectionOut.length > 0) && (
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
          <pre className="border-border bg-muted/40 mt-3 max-h-[min(40vh,320px)] overflow-auto rounded-md border p-3 whitespace-pre-wrap font-sans text-xs leading-relaxed">
            {output}
          </pre>
        )}
      </div>
    </div>
  );
}
