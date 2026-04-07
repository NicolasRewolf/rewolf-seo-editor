'use client';

import type * as React from 'react';

import { AIChatPlugin } from '@platejs/ai/react';
import { BlockSelectionPlugin } from '@platejs/selection/react';
import { getPluginTypes, isHotkey, KEYS } from 'platejs';

import { BlockSelection } from '@/components/ui/block-selection';

export const BlockSelectionKit = [
  BlockSelectionPlugin.configure(({ editor }) => ({
    options: {
      enableContextMenu: true,
      isSelectable: (element) =>
        !getPluginTypes(editor, [KEYS.codeLine]).includes(element.type),
      onKeyDownSelecting: (ed, e) => {
        if (isHotkey('mod+j')(e)) {
          ed.getApi(AIChatPlugin).aiChat.show();
        }
      },
    },
    render: {
      belowRootNodes: (props) => {
        if (
          !(
            props.attributes &&
            typeof props.attributes === 'object' &&
            'className' in props.attributes &&
            String(
              (props.attributes as { className?: string }).className
            ).includes('slate-selectable')
          )
        )
          return null;

        return <BlockSelection {...(props as React.ComponentProps<typeof BlockSelection>)} />;
      },
    },
  })),
];
