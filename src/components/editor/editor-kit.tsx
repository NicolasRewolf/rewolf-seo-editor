'use client';

import { AIKit } from '@/components/editor/plugins/ai-kit';
import { BasicNodesKit } from '@/components/editor/plugins/basic-nodes-kit';
import { BlockSelectionKit } from '@/components/editor/plugins/block-selection-kit';
import { CodeBlockKit } from '@/components/editor/plugins/code-block-kit';
import { CursorOverlayKit } from '@/components/editor/plugins/cursor-overlay-kit';
import { DndKit } from '@/components/editor/plugins/dnd-kit';
import { LinkKit } from '@/components/editor/plugins/link-kit';
import { ListKit } from '@/components/editor/plugins/list-kit';
import { MarkdownKit } from '@/components/editor/plugins/markdown-kit';
import { MediaKit } from '@/components/editor/plugins/media-kit';
import { SlashKit } from '@/components/editor/plugins/slash-kit';
import { SuggestionKit } from '@/components/editor/plugins/suggestion-kit';
import { TableKit } from '@/components/editor/plugins/table-kit';

/** Ordre des plugins : markdown → blocs / marks → code → listes → lien → table → média → sélection blocs / curseur / IA → DnD → slash */
export const EditorKit = [
  ...MarkdownKit,
  ...BasicNodesKit,
  ...CodeBlockKit,
  ...ListKit,
  ...LinkKit,
  ...TableKit,
  ...MediaKit,
  ...SuggestionKit,
  ...BlockSelectionKit,
  ...CursorOverlayKit,
  ...AIKit,
  ...DndKit,
  ...SlashKit,
];
