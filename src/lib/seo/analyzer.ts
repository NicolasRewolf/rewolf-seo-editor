import type { SeoAnalysisPayload, SeoAnalysisResult } from '@/types/seo';

import { analyzeContent } from '@/lib/seo/content';
import { analyzeEeat } from '@/lib/seo/eeat';
import { analyzeOnPage } from '@/lib/seo/keyword';
import { analyzeMetaSchema } from '@/lib/seo/meta-dimension';
import { analyzeReadability } from '@/lib/seo/readability';
import { analyzeStructure } from '@/lib/seo/structure';

export function runSeoAnalysis(payload: SeoAnalysisPayload): SeoAnalysisResult {
  const dimensions = [
    analyzeOnPage(payload),
    analyzeReadability(payload),
    analyzeStructure(payload),
    analyzeContent(payload),
    analyzeEeat(payload),
    analyzeMetaSchema(payload),
  ];

  const overallScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0)
  );

  return {
    overallScore,
    dimensions,
    analyzedAt: new Date().toISOString(),
  };
}
