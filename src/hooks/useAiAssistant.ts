import { useCallback, useEffect, useRef, useState } from 'react';

import { toast } from 'sonner';

import {
  streamAiChatWithFallback,
  type AiMessage,
  type AiProvider,
  type AiTaskGroup,
} from '@/lib/api/stream-ai';

const STORAGE_KEY = 'rewolf-ai-provider';

function readStoredProvider(): AiProvider {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'openai' || v === 'anthropic') return v;
  } catch {
    /* ignore */
  }
  return 'openai';
}

export function useAiAssistant() {
  const [provider, setProviderState] = useState<AiProvider>(readStoredProvider);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, provider);
    } catch {
      /* ignore */
    }
  }, [provider]);

  const setProvider = useCallback((p: AiProvider) => {
    setProviderState(p);
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const run = useCallback(
    async (
      messages: AiMessage[],
      taskGroup?: AiTaskGroup,
      opts?: { onComplete?: (fullText: string) => void }
    ) => {
      stop();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      setError(null);
      setOutput('');
      let accumulated = '';
      const applyDelta = (d: string) => {
        accumulated += d;
        setOutput((prev) => prev + d);
      };
      try {
        const usedFallback = await streamAiChatWithFallback({
          provider,
          taskGroup,
          messages,
          signal: ac.signal,
          onDelta: applyDelta,
          onFallback: () => {
            setOutput('');
            accumulated = '';
            setError(null);
            setProviderState('openai');
          },
        });
        if (usedFallback) {
          toast.info(
            'Anthropic indisponible (flux vide, souvent crédits ou clé). Réponse générée avec OpenAI.'
          );
        }
        opts?.onComplete?.(accumulated);
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [provider, stop]
  );

  useEffect(() => () => stop(), [stop]);

  return {
    provider,
    setProvider,
    output,
    setOutput,
    loading,
    error,
    setError,
    run,
    stop,
  };
}
