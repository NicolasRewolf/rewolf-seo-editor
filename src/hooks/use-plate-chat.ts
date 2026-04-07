'use client';

import { useChat as useBaseChat } from '@ai-sdk/react';
import { AIChatPlugin } from '@platejs/ai/react';
import { DefaultChatTransport } from 'ai';
import { useEditorRef } from 'platejs/react';
import * as React from 'react';

import { apiUrl } from '@/lib/api/base-url';

/* eslint-disable react-hooks/refs -- createStableChatProxy : lecture chat uniquement via Proxy.get */
const EMPTY_BODY: Record<string, unknown> = {};

/**
 * `useChat` renvoie un nouvel objet à chaque rendu. Le passer à `editor.setOption`
 * déclenchait une boucle infinie (setOption → re-render → nouveau `chat` → effect).
 * Ce proxy garde une référence stable tout en lisant toujours l'instance à jour.
 */
function createStableChatProxy(
  getChat: () => ReturnType<typeof useBaseChat>
): ReturnType<typeof useBaseChat> {
  return new Proxy({} as ReturnType<typeof useBaseChat>, {
    get(_, prop) {
      return Reflect.get(getChat(), prop);
    },
  });
}

/**
 * Connecte @ai-sdk/react au plugin Plate AI (options `chatOptions.api` / `body`).
 */
export function usePlateChat() {
  const editor = useEditorRef();
  const opts = editor.getOptions(AIChatPlugin) as {
    chatOptions?: { api?: string; body?: Record<string, unknown> };
  };
  const api = opts.chatOptions?.api ?? apiUrl('/api/ai/command');
  const body = opts.chatOptions?.body ?? EMPTY_BODY;

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api,
        body,
      }),
    [api, body]
  );

  const chat = useBaseChat({
    id: 'editor',
    transport,
  });

  const chatRef = React.useRef(chat);
  React.useEffect(() => {
    chatRef.current = chat;
  }, [chat]);

  const stableChatForPlugin = React.useMemo(
    () => createStableChatProxy(() => chatRef.current),
    []
  );

  React.useEffect(() => {
    editor.setOption(AIChatPlugin, 'chat', stableChatForPlugin as never);
  }, [editor, stableChatForPlugin]);

  return chat;
}
