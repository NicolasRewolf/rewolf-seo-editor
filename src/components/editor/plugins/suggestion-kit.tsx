'use client';

import { SuggestionPlugin } from '@platejs/suggestion/react';

/** Requis pour le mode « edit » de @platejs/ai (diff / suggestions). */
export const SuggestionKit = [
  SuggestionPlugin.configure({
    options: {
      currentUserId: 'ai',
      isSuggesting: false,
    },
  }),
];
