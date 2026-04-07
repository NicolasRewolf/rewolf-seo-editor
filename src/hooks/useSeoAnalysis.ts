import { useEffect, useRef, useState } from 'react';

import type { SeoAnalysisPayload, SeoAnalysisResult } from '@/types/seo';

const DEBOUNCE_MS = 500;

export function useSeoAnalysis(payload: SeoAnalysisPayload | null) {
  const [result, setResult] = useState<SeoAnalysisResult | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/seo.worker.ts', import.meta.url),
      { type: 'module' }
    );
    const w = workerRef.current;
    w.onmessage = (e: MessageEvent<SeoAnalysisResult>) => {
      setResult(e.data);
    };
    return () => {
      w.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!workerRef.current || !payload) {
      return;
    }
    timerRef.current = setTimeout(() => {
      workerRef.current?.postMessage(payload);
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [payload]);

  return result;
}
