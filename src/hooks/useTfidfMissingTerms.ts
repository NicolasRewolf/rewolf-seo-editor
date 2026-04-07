import { useEffect, useRef, useState } from 'react';

const DEBOUNCE_MS = 800;

type MissingTerm = { term: string; tfidf: number };

type UseTfidfMissingTermsInput = {
  userPlainText: string;
  competitorPlainTexts: string[];
  topN?: number;
};

export function useTfidfMissingTerms({
  userPlainText,
  competitorPlainTexts,
  topN = 12,
}: UseTfidfMissingTermsInput) {
  const [terms, setTerms] = useState<MissingTerm[]>([]);
  const workerRef = useRef<Worker | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/tfidf.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current.onmessage = (e: MessageEvent<MissingTerm[]>) => {
      setTerms(e.data);
    };
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!workerRef.current || !userPlainText.trim() || competitorPlainTexts.length === 0) {
      setTimeout(() => setTerms([]), 0);
      return;
    }

    timerRef.current = setTimeout(() => {
      workerRef.current?.postMessage({
        userPlainText,
        competitorPlainTexts,
        topN,
      });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [userPlainText, competitorPlainTexts, topN]);

  return terms;
}
