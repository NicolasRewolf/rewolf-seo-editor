'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MarkdownPlugin } from '@platejs/markdown';
import { normalizeStaticValue } from 'platejs';
import type { Descendant, Value } from 'platejs';
import { Plate, usePlateEditor } from 'platejs/react';
import { debounce } from 'lodash';
import { Editor as SlateEditor, Range, type BaseEditor } from 'slate';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { LoadArticleDialog } from '@/components/article/load-article-dialog';
import { HistoryDialog } from '@/components/article/history-dialog';
import { createEditorKit } from '@/components/editor/editor-kit';
import { EditorFloatingToolbar } from '@/components/editor/editor-floating-toolbar';
import { EditorHeadingToolbar } from '@/components/editor/editor-heading-toolbar';
import {
  KeywordHighlightPlugin,
  buildKeywordHighlightTerms,
} from '@/components/editor/plugins/keyword-highlight-kit';
import { MetaFields } from '@/components/seo/meta-fields';
import { DataWorkspace } from '@/app/editor/data/DataWorkspace';
import { WorkflowSidebar } from '@/components/workflow/workflow-sidebar';
import { WorkflowStepper } from '@/components/workflow/workflow-stepper';
import { StepBrief } from '@/components/workflow/steps/step-brief';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { useSeoAnalysis } from '@/hooks/useSeoAnalysis';
import {
  getArticleFromDisk,
  saveArticleToDisk,
  type DiskArticlePayload,
} from '@/lib/api/articles-disk';
import { buildSeoPayload, plainTextFromValue } from '@/lib/seo/extract-structure';
import { countWords } from '@/lib/knowledge-base/kb-helpers';
import {
  loadStoredArticle,
  saveStoredArticle,
  type StoredArticle,
} from '@/lib/storage/local-article';
import {
  clearOld as clearOldHistory,
  pushSnapshot,
  type Snapshot,
} from '@/lib/storage/history-store';
import {
  defaultArticleBrief,
  splitLegacyMeta,
  type ArticleBrief,
  type ArticleMeta,
  type LegacyArticleMeta,
} from '@/types/article';
import type { InternalLinksMap } from '@/types/internal-links';
import type { KnowledgeBase } from '@/types/knowledge-base';
import type { WorkflowStep } from '@/types/workflow';

const defaultValue: Value = normalizeStaticValue([
  {
    children: [{ text: 'Commencez à rédiger votre article SEO…' }],
    type: 'p',
  },
]);

const defaultMeta = (): ArticleMeta => ({
  metaTitle: '',
  metaDescription: '',
  slug: '',
  slugLocked: false,
});

const emptyKb = (): KnowledgeBase => ({ sources: [] });

function mergeDiskArticle(article: DiskArticlePayload): {
  meta: ArticleMeta;
  brief: ArticleBrief;
} {
  const merged = {
    ...defaultMeta(),
    ...article.meta,
  } as LegacyArticleMeta;
  const { meta, briefPatch } = splitLegacyMeta(merged);
  const brief: ArticleBrief = {
    ...defaultArticleBrief(),
    ...(article.brief ?? {}),
    ...briefPatch,
  };
  return { meta, brief };
}

export function SeoEditor() {
  const [searchParams, setSearchParams] = useSearchParams();
  const stored = useMemo(() => loadStoredArticle(), []);

  const initial = useMemo<StoredArticle>(() => {
    if (stored) {
      return {
        meta: stored.meta,
        brief: stored.brief,
        content: stored.content,
        knowledgeBase: stored.knowledgeBase ?? emptyKb(),
        internalLinks: stored.internalLinks ?? null,
      };
    }
    return {
      meta: defaultMeta(),
      brief: defaultArticleBrief(),
      content: defaultValue,
      knowledgeBase: emptyKb(),
      internalLinks: null,
    };
  }, [stored]);

  const [meta, setMeta] = useState<ArticleMeta>(initial.meta);
  const metaRef = useRef(meta);
  const [brief, setBrief] = useState<ArticleBrief>(initial.brief);
  const briefRef = useRef(brief);
  const [docValue, setDocValue] = useState<Value>(initial.content);
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('research');
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>(
    initial.knowledgeBase ?? emptyKb()
  );
  const [internalLinks, setInternalLinks] = useState<InternalLinksMap | null>(
    initial.internalLinks ?? null
  );

  const kbRef = useRef(knowledgeBase);
  const ilRef = useRef(internalLinks);
  useEffect(() => {
    kbRef.current = knowledgeBase;
  }, [knowledgeBase]);
  useEffect(() => {
    ilRef.current = internalLinks;
  }, [internalLinks]);

  useEffect(() => {
    metaRef.current = meta;
  }, [meta]);
  useEffect(() => {
    briefRef.current = brief;
  }, [brief]);

  const editor = usePlateEditor({
    plugins: createEditorKit(),
    value: initial.content,
  });

  useEffect(() => {
    editor.setOption(
      KeywordHighlightPlugin,
      'terms',
      buildKeywordHighlightTerms(brief.focusKeyword, brief.longTailKeywords)
    );
  }, [brief.focusKeyword, brief.longTailKeywords, editor]);

  const [competitorWordCount, setCompetitorWordCount] = useState<
    number | undefined
  >(undefined);

  const onCompetitorBenchmark = useCallback((w: number | undefined) => {
    setCompetitorWordCount(w);
  }, []);

  const handleSaveToDisk = useCallback(() => {
    void (async () => {
      try {
        await saveArticleToDisk({
          meta,
          brief,
          content: editor.children as Value,
          exportedAt: new Date().toISOString(),
        });
        toast.success(
          meta.slug
            ? `Enregistre : data/articles/${meta.slug}.json`
            : 'Enregistre'
        );
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : 'Erreur enregistrement'
        );
      }
    })();
  }, [editor, meta, brief]);

  const seoPayload = useMemo(
    () =>
      buildSeoPayload(
        docValue as Descendant[],
        meta,
        brief.focusKeyword,
        undefined,
        competitorWordCount
      ),
    [docValue, meta, brief.focusKeyword, competitorWordCount]
  );
  const seoAnalysis = useSeoAnalysis(seoPayload);

  const [wordCount, setWordCount] = useState(() =>
    countWords(plainTextFromValue(initial.content as Descendant[]))
  );
  const lastManualSnapshotRef = useRef<string | null>(null);

  const debouncedSave = useMemo(
    () =>
      debounce((article: StoredArticle) => {
        saveStoredArticle(article);
      }, 2000),
    []
  );

  useEffect(() => () => {
    debouncedSave.flush();
    debouncedSave.cancel();
  }, [debouncedSave]);

  function persistArticle(content: Value) {
    debouncedSave({
      meta: metaRef.current,
      brief: briefRef.current,
      content,
      knowledgeBase: kbRef.current,
      internalLinks: ilRef.current,
    });
  }

  const pushHistorySnapshot = useCallback(
    async (kind: 'manual' | 'ai-insert' | 'ai-rewrite', label?: string) => {
      try {
        await pushSnapshot({
          slug: metaRef.current.slug,
          kind,
          content: editor.children as Value,
          meta: metaRef.current,
          brief: briefRef.current,
          label,
        });
        await clearOldHistory(metaRef.current.slug, 20);
      } catch {
        /* ignore history errors */
      }
    },
    [editor]
  );

  const restoreSnapshot = useCallback(
    (snapshot: Snapshot) => {
      const normalized = normalizeStaticValue(snapshot.content as Value);
      editor.tf.setValue(normalized);
      setDocValue(normalized);
      setMeta(snapshot.meta);
      metaRef.current = snapshot.meta;
      setBrief(snapshot.brief);
      briefRef.current = snapshot.brief;
      setWordCount(countWords(plainTextFromValue(normalized as Descendant[])));
      debouncedSave({
        meta: snapshot.meta,
        brief: snapshot.brief,
        content: normalized,
        knowledgeBase: kbRef.current,
        internalLinks: ilRef.current,
      });
    },
    [debouncedSave, editor]
  );

  function persistMeta(next: ArticleMeta) {
    metaRef.current = next;
    setMeta(next);
    debouncedSave({
      meta: next,
      brief: briefRef.current,
      content: editor.children as Value,
      knowledgeBase: kbRef.current,
      internalLinks: ilRef.current,
    });
  }

  function persistBrief(next: ArticleBrief) {
    briefRef.current = next;
    setBrief(next);
    debouncedSave({
      meta: metaRef.current,
      brief: next,
      content: editor.children as Value,
      knowledgeBase: kbRef.current,
      internalLinks: ilRef.current,
    });
  }

  useEffect(() => {
    debouncedSave({
      meta: metaRef.current,
      brief: briefRef.current,
      content: editor.children as Value,
      knowledgeBase,
      internalLinks,
    });
  }, [knowledgeBase, internalLinks, debouncedSave, editor]);

  const applyLoadedArticle = useCallback(
    (article: DiskArticlePayload) => {
      const normalized = normalizeStaticValue(article.content as Value);
      editor.tf.setValue(normalized);
      const { meta: nextMeta, brief: nextBrief } = mergeDiskArticle(article);
      metaRef.current = nextMeta;
      setMeta(nextMeta);
      briefRef.current = nextBrief;
      setBrief(nextBrief);
      setDocValue(normalized);
      setWordCount(countWords(plainTextFromValue(normalized as Descendant[])));
      setCompetitorWordCount(undefined);
      setKnowledgeBase(emptyKb());
      setInternalLinks(null);
      debouncedSave.cancel();
      saveStoredArticle({
        meta: nextMeta,
        brief: nextBrief,
        content: normalized,
        knowledgeBase: emptyKb(),
        internalLinks: null,
      });
      toast.success(
        nextMeta.slug
          ? `Article charge : ${nextMeta.slug}`
          : 'Article charge'
      );
    },
    [editor, debouncedSave]
  );

  useEffect(() => {
    const slug = searchParams.get('slug');
    if (!slug) return;
    let cancelled = false;
    void (async () => {
      try {
        const article = await getArticleFromDisk(slug);
        if (cancelled) return;
        applyLoadedArticle(article);
        setSearchParams({}, { replace: true });
      } catch (e) {
        if (!cancelled) {
          toast.error(
            e instanceof Error ? e.message : 'Chargement article impossible'
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams, applyLoadedArticle]);

  useEffect(() => {
    const interval = setInterval(() => {
      const fingerprint = JSON.stringify({
        meta: metaRef.current,
        brief: briefRef.current,
        content: editor.children,
      });
      if (fingerprint === lastManualSnapshotRef.current) return;
      lastManualSnapshotRef.current = fingerprint;
      void pushHistorySnapshot('manual', 'Autosnapshot 5 min');
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [editor, pushHistorySnapshot]);

  const editorAndSidebar = (
    <>
      {currentStep === 'finalize' && (
        <MetaFields
          meta={meta}
          focusKeywordReadonly={brief.focusKeyword}
          onMetaChange={persistMeta}
        />
      )}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <Plate
            editor={editor}
            onValueChange={({ value }) => {
              setDocValue(value);
              setWordCount(countWords(plainTextFromValue(value as Descendant[])));
              persistArticle(value);
            }}
          >
            <div className="border-border flex flex-wrap items-center gap-2 border-b px-3 py-2">
              <EditorHeadingToolbar />
            </div>
            <EditorContainer
              variant="select"
              className="min-h-[min(70vh,560px)] flex-1 rounded-none border-0"
            >
              <Editor
                variant="default"
                placeholder="Choisissez Texte / H1 / H2 / H3 au-dessus, ou tapez / pour le menu…"
                className="min-h-[min(70vh,560px)]"
              />
            </EditorContainer>
            <EditorFloatingToolbar />
          </Plate>

          <footer className="border-border bg-muted/30 text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2 text-xs">
            <span>
              {wordCount} mot{wordCount > 1 ? 's' : ''}
            </span>
            <span>
              Local (2 s) + API PUT data/articles/ si vous utilisez Enregistrer
            </span>
          </footer>
        </div>

        <div className="border-border flex min-h-0 min-w-0 flex-col border-t lg:h-full lg:w-[min(100%,440px)] lg:shrink-0 lg:border-t-0 lg:border-l">
          <WorkflowStepper
            current={currentStep}
            onChange={setCurrentStep}
            brief={brief}
          />
          <WorkflowSidebar
            step={currentStep}
            meta={meta}
            brief={brief}
            knowledgeBase={knowledgeBase}
            onKnowledgeBaseChange={setKnowledgeBase}
            internalLinks={internalLinks}
            onInternalLinksChange={setInternalLinks}
            seoAnalysis={seoAnalysis}
            editor={editor}
            docValue={docValue}
            getMarkdown={() => editor.getApi(MarkdownPlugin).markdown.serialize()}
            getSelectionText={() => {
              const { selection } = editor;
              if (!selection || Range.isCollapsed(selection)) return '';
              return SlateEditor.string(
                editor as unknown as BaseEditor,
                selection
              );
            }}
            onMetaChange={persistMeta}
            onCompetitorWords={onCompetitorBenchmark}
            headings={seoPayload.headings}
            userPlainText={seoPayload.plainText}
            onSaveToDisk={handleSaveToDisk}
            onAiSnapshot={(kind, label) => {
              void pushHistorySnapshot(kind, label);
            }}
          />
        </div>
      </div>
    </>
  );

  return (
    <div className="bg-background flex min-h-svh flex-col">
      <header className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            REWOLF · Éditeur
          </p>
          <h1 className="text-foreground text-lg font-semibold">
            Article SEO
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/projects"
            className="border-border bg-background hover:bg-muted inline-flex h-8 items-center rounded-md border px-3 text-sm"
          >
            Articles
          </Link>
          <button
            type="button"
            className="border-border bg-background hover:bg-muted inline-flex h-8 items-center rounded-md border px-3 text-sm"
            onClick={handleSaveToDisk}
          >
            Enregistrer ./data
          </button>
          <HistoryDialog slug={meta.slug} onRestore={restoreSnapshot} />
          <LoadArticleDialog onLoad={applyLoadedArticle} />
        </div>
      </header>

      {currentStep === 'research' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <WorkflowStepper
            current={currentStep}
            onChange={setCurrentStep}
            brief={brief}
          />
          <DataWorkspace
            brief={brief}
            onBriefChange={(patch) =>
              persistBrief({ ...briefRef.current, ...patch })
            }
            knowledgeBase={knowledgeBase}
            onKnowledgeBaseChange={setKnowledgeBase}
            competitorWordCount={competitorWordCount}
            onCompetitorBenchmark={onCompetitorBenchmark}
          />
        </div>
      ) : currentStep === 'brief' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <WorkflowStepper
            current={currentStep}
            onChange={setCurrentStep}
            brief={brief}
          />
          <StepBrief
            brief={brief}
            onBriefChange={persistBrief}
            knowledgeBase={knowledgeBase}
          />
        </div>
      ) : (
        <>{editorAndSidebar}</>
      )}
    </div>
  );
}
