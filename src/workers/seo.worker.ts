import { runSeoAnalysis } from '@/lib/seo/analyzer';
import type { SeoAnalysisPayload } from '@/types/seo';

self.onmessage = (e: MessageEvent<SeoAnalysisPayload>) => {
  const result = runSeoAnalysis(e.data);
  self.postMessage(result);
};
