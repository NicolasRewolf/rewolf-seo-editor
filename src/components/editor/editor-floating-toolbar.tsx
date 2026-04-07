'use client';

import {
  BoldIcon,
  ItalicIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from 'lucide-react';

import { FloatingToolbar } from '@/components/ui/floating-toolbar';
import { LinkToolbarButton } from '@/components/ui/link-toolbar-button';
import { MarkToolbarButton } from '@/components/ui/mark-toolbar-button';
import { ToolbarSeparator } from '@/components/ui/toolbar';

export function EditorFloatingToolbar() {
  return (
    <FloatingToolbar>
      <MarkToolbarButton nodeType="bold" tooltip="Gras (⌘+B)">
        <BoldIcon />
      </MarkToolbarButton>
      <MarkToolbarButton nodeType="italic" tooltip="Italique (⌘+I)">
        <ItalicIcon />
      </MarkToolbarButton>
      <MarkToolbarButton nodeType="underline" tooltip="Souligné (⌘+U)">
        <UnderlineIcon />
      </MarkToolbarButton>
      <MarkToolbarButton
        nodeType="strikethrough"
        tooltip="Barré (⌘+⇧+X)"
      >
        <StrikethroughIcon />
      </MarkToolbarButton>
      <ToolbarSeparator />
      <LinkToolbarButton />
    </FloatingToolbar>
  );
}
