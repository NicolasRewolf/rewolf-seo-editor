import { SERP_LIMITS } from '@/lib/seo/canvas-measure';
import type { SeoAnalysisPayload, SeoCriterion, SeoDimensionResult } from '@/types/seo';

export function analyzeMetaSchema(p: SeoAnalysisPayload): SeoDimensionResult {
  const criteria: SeoCriterion[] = [];

  const titleLen = p.metaTitle.length;
  const titleLenOk = titleLen > 0 && titleLen <= 60;
  const titlePxOk = p.titlePx <= SERP_LIMITS.titlePx;
  criteria.push({
    id: 'title-meta',
    label: 'Title < 60 car. et < 580 px',
    status:
      !p.metaTitle.trim()
        ? 'bad'
        : titleLenOk && titlePxOk
          ? 'ok'
          : titleLenOk || titlePxOk
            ? 'warn'
            : 'bad',
    detail: `${titleLen} car. · ${Math.round(p.titlePx)} px`,
  });

  const ml = p.metaDescription.length;
  const metaOk =
    ml >= SERP_LIMITS.metaDescMin &&
    ml <= SERP_LIMITS.metaDescMax &&
    p.metaDescPx <= SERP_LIMITS.metaDescPx;
  criteria.push({
    id: 'meta-desc',
    label: 'Meta description 140–160 car. (≤ 920 px)',
    status: !ml
      ? 'bad'
      : metaOk
        ? 'ok'
        : ml >= 130 && ml <= 170
          ? 'warn'
          : 'bad',
    detail: `${ml} car. · ${Math.round(p.metaDescPx)} px`,
  });

  const imgs = p.imagesTotal;
  const missing = p.imagesMissingAlt;
  criteria.push({
    id: 'img-alt',
    label: 'Images avec texte alternatif',
    status:
      imgs === 0
        ? 'warn'
        : missing === 0
          ? 'ok'
          : 'bad',
    detail:
      imgs === 0
        ? 'Aucune image dans le corps.'
        : `${missing} image(s) sans alt sur ${imgs}.`,
  });

  const canBlogPosting =
    !!p.metaTitle.trim() &&
    !!p.metaDescription.trim() &&
    !!p.slug.trim();
  criteria.push({
    id: 'jsonld',
    label: 'JSON-LD BlogPosting (champs requis)',
    status: canBlogPosting ? 'ok' : 'warn',
    detail: canBlogPosting
      ? 'Title, description et slug présents — prêts pour génération JSON-LD.'
      : 'Complétez title, meta description et slug pour un schema valide.',
  });

  const score =
    criteria.reduce((acc, c) => {
      const v = c.status === 'ok' ? 100 : c.status === 'warn' ? 55 : 25;
      return acc + v;
    }, 0) / criteria.length;

  return {
    id: 'metaSchema',
    label: 'Meta & Schema',
    weight: 0.1,
    score: Math.round(score),
    criteria,
  };
}
