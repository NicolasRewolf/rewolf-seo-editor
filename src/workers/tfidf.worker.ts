import { missingTermsVsCompetitors } from '@/lib/seo/tfidf-missing';

type TfidfWorkerPayload = {
  userPlainText: string;
  competitorPlainTexts: string[];
  topN?: number;
};

self.onmessage = (
  e: MessageEvent<TfidfWorkerPayload>
) => {
  const { userPlainText, competitorPlainTexts, topN } = e.data;
  const result = missingTermsVsCompetitors(userPlainText, competitorPlainTexts, {
    topN: topN ?? 12,
  });
  self.postMessage(result);
};
