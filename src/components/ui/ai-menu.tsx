'use client';

import {
  AIChatPlugin,
  AIPlugin,
  useEditorChat,
  useLastAssistantMessage,
} from '@platejs/ai/react';
import { BlockSelectionPlugin, useIsSelecting } from '@platejs/selection/react';
import { Check, Loader2, PenLine, Wand, X } from 'lucide-react';
import { isHotkey, KEYS, type NodeEntry } from 'platejs';
import { useEditorPlugin, usePluginOption } from 'platejs/react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export function AIMenu() {
  const { api, editor } = useEditorPlugin(AIChatPlugin);
  const mode = usePluginOption(AIChatPlugin, 'mode');
  const toolName = usePluginOption(AIChatPlugin, 'toolName');
  const streaming = usePluginOption(AIChatPlugin, 'streaming');
  const isSelecting = useIsSelecting();
  const open = usePluginOption(AIChatPlugin, 'open');
  const [input, setInput] = React.useState('');
  const [anchorElement, setAnchorElement] = React.useState<HTMLElement | null>(
    null
  );

  const chat = usePluginOption(AIChatPlugin, 'chat');
  const { messages, status } = chat;
  const isLoading = status === 'streaming' || status === 'submitted';

  const content = useLastAssistantMessage()?.parts.find(
    (part) => part.type === 'text'
  )?.text;

  React.useEffect(() => {
    if (!streaming) return;
    const timeoutId = window.setTimeout(() => {
      const anchorEntry = api.aiChat.node({ anchor: true });
      if (!anchorEntry) return;
      const anchorDom = editor.api.toDOMNode(anchorEntry[0]);
      if (anchorDom) setAnchorElement(anchorDom);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [streaming, api.aiChat, editor]);

  const setOpen = (next: boolean) => {
    if (next) api.aiChat.show();
    else api.aiChat.hide();
  };

  const show = (el: HTMLElement) => {
    setAnchorElement(el);
    setOpen(true);
  };

  useEditorChat({
    onOpenBlockSelection: (blocks: NodeEntry[]) => {
      const last = blocks.at(-1);
      if (!last) return;
      const dom = editor.api.toDOMNode(last[0]);
      if (dom) show(dom);
    },
    onOpenChange: (o) => {
      if (!o) {
        setAnchorElement(null);
        setInput('');
      }
    },
    onOpenCursor: () => {
      const block = editor.api.block({ highest: true });
      if (!block) return;
      if (!editor.api.isAt({ end: true }) && !editor.api.isEmpty(block[0])) {
        editor
          .getApi(BlockSelectionPlugin)
          .blockSelection.set(block[0].id as string);
      }
      const dom = editor.api.toDOMNode(block[0]);
      if (dom) show(dom);
    },
    onOpenSelection: () => {
      const blocks = editor.api.blocks();
      const last = blocks.at(-1);
      if (!last) return;
      const dom = editor.api.toDOMNode(last[0]);
      if (dom) show(dom);
    },
  });

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        api.aiChat.stop();
        chat.stop?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, api.aiChat, chat]);

  React.useEffect(() => {
    if (toolName === 'edit' && mode === 'chat' && !isLoading) {
      let anchorNode = editor.api.node({
        at: [],
        reverse: true,
        match: (n) => !!n[KEYS.suggestion],
      });
      if (!anchorNode) {
        anchorNode = editor
          .getApi(BlockSelectionPlugin)
          .blockSelection.getNodes({ selectionFallback: true, sort: true })
          .at(-1);
      }
      if (!anchorNode) return;
      const block = editor.api.block({ at: anchorNode[1] });
      if (!block) return;
      const dom = editor.api.toDOMNode(block[0]);
      if (dom) setAnchorElement(dom);
    }
  }, [isLoading, toolName, mode, editor]);

  const visible = open && !!anchorElement;

  const [anchorRect, setAnchorRect] = React.useState<DOMRect | null>(null);
  React.useEffect(() => {
    if (!anchorElement || !visible) {
      setAnchorRect(null);
      return;
    }
    const update = () => setAnchorRect(anchorElement.getBoundingClientRect());
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [anchorElement, visible]);

  if (isLoading && mode === 'insert') return null;
  if (toolName === 'comment') return null;
  if (toolName === 'edit' && mode === 'chat' && isLoading) return null;

  return (
    <Popover
      open={visible}
      onOpenChange={(o) => {
        if (!o) {
          api.aiChat.hide();
          setAnchorElement(null);
        }
      }}
    >
      {anchorRect && (
        <PopoverAnchor asChild>
          <div
            className="pointer-events-none fixed z-40"
            style={{
              left: anchorRect.left,
              top: anchorRect.bottom,
              width: Math.max(anchorRect.width, 120),
              height: 1,
            }}
          />
        </PopoverAnchor>
      )}
      <PopoverContent
        className="w-[min(100vw-2rem,380px)] p-3"
        side="bottom"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs font-medium">
            IA éditeur {isSelecting ? '(sélection)' : '(bloc)'} · ⌘J
          </p>

          {mode === 'chat' && isSelecting && content && toolName === 'generate' && (
            <p className="text-foreground max-h-24 overflow-y-auto rounded border border-border/60 bg-muted/40 p-2 text-xs whitespace-pre-wrap">
              {content}
            </p>
          )}

          {isLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              {messages.length > 1 ? 'Édition…' : 'Réflexion…'}
            </div>
          ) : (
            <Textarea
              className="min-h-[72px] resize-y text-sm"
              placeholder="Consigne libre (Entrée envoie, Maj+Entrée nouvelle ligne)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (isHotkey('backspace')(e) && input.length === 0) {
                  e.preventDefault();
                  api.aiChat.hide();
                }
                if (isHotkey('enter')(e) && !e.shiftKey) {
                  e.preventDefault();
                  void api.aiChat.submit(input);
                  setInput('');
                }
              }}
            />
          )}

          {!isLoading && (
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="gap-1"
                onClick={() => {
                  void api.aiChat.submit(input, {
                    prompt:
                      "Améliore la rédaction pour la clarté et le flux, sans changer le sens ni ajouter d'informations nouvelles.",
                    toolName: 'edit',
                  });
                  setInput('');
                }}
              >
                <PenLine className="size-3.5" />
                Améliorer
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="gap-1"
                onClick={() => {
                  void api.aiChat.submit(input, {
                    mode: 'insert',
                    prompt: {
                      default: 'Rédige une courte section sous forme de paragraphes Markdown.',
                      selecting: 'Continue après la sélection en une ou deux phrases.',
                    },
                    toolName: 'generate',
                  });
                  setInput('');
                }}
              >
                <Wand className="size-3.5" />
                Générer
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="gap-1"
                onClick={() => {
                  void api.aiChat.submit(input, {
                    prompt:
                      'Simplifie ce texte : phrases plus courtes (< 25 mots), vocabulaire accessible, supprime le jargon inutile. Conserve le sens et le mot-clé principal.',
                    toolName: 'edit',
                  });
                  setInput('');
                }}
              >
                Simplifier
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="gap-1"
                onClick={() => {
                  void api.aiChat.submit(input, {
                    mode: 'insert',
                    prompt: {
                      default:
                        'Développe ce passage : ajoute des détails, des exemples concrets, des données chiffrées. Garde le mot-clé naturellement intégré.',
                      selecting:
                        'Développe la sélection avec des détails supplémentaires, exemples concrets et données chiffrées.',
                    },
                    toolName: 'generate',
                  });
                  setInput('');
                }}
              >
                Développer
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="gap-1"
                onClick={() => {
                  void api.aiChat.submit(input, {
                    prompt:
                      'Réécris ce texte pour le SEO : intègre naturellement le mot-clé principal (densité 0.5-0.8%), améliore la clarté, ajoute des mots de transition. Pas de keyword stuffing.',
                    toolName: 'edit',
                  });
                  setInput('');
                }}
              >
                Réécrire SEO
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="gap-1"
                onClick={() => {
                  void api.aiChat.submit(input, {
                    prompt:
                      "Traduis ce texte. Si c'est du français, traduis en anglais. Si c'est de l'anglais, traduis en français. Conserve le ton professionnel et adapte les expressions idiomatiques.",
                    toolName: 'edit',
                  });
                  setInput('');
                }}
              >
                Traduire
              </Button>
            </div>
          )}

          {!isLoading && messages.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-2">
              <Button
                type="button"
                size="sm"
                variant="default"
                className="gap-1"
                onClick={() => {
                  editor.getTransforms(AIChatPlugin).aiChat.accept();
                }}
              >
                <Check className="size-3.5" />
                Accepter
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => {
                  editor.getTransforms(AIPlugin).ai.undo();
                  api.aiChat.hide();
                }}
              >
                <X className="size-3.5" />
                Rejeter
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AILoadingBar() {
  const toolName = usePluginOption(AIChatPlugin, 'toolName');
  const chat = usePluginOption(AIChatPlugin, 'chat');
  const mode = usePluginOption(AIChatPlugin, 'mode');
  const { api } = useEditorPlugin(AIChatPlugin);
  const { status } = chat;
  const isLoading = status === 'streaming' || status === 'submitted';

  if (
    isLoading &&
    (mode === 'insert' ||
      toolName === 'comment' ||
      (toolName === 'edit' && mode === 'chat'))
  ) {
    return (
      <div
        className={cn(
          'bg-background/95 supports-backdrop-filter:bg-background/80',
          'pointer-events-auto absolute right-3 bottom-3 z-20 flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs shadow-sm backdrop-blur'
        )}
      >
        <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
        <span>{status === 'submitted' ? 'Réflexion…' : 'Écriture…'}</span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={() => {
            api.aiChat.stop();
            chat.stop?.();
          }}
        >
          Stop
        </Button>
      </div>
    );
  }

  return null;
}
