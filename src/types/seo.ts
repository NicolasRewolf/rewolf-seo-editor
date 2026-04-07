export type CriterionStatus = 'ok' | 'warn' | 'bad'

export type SeoCriterion = {
  id: string;
  label: string;
  status: CriterionStatus;
  detail: string;
}

export type SeoDimensionId =
  | 'onPage'
  | 'readability'
  | 'structure'
  | 'content'
  | 'eeat'
  | 'metaSchema'

export type SeoDimensionResult = {
  id: SeoDimensionId;
  label: string;
  weight: number;
  score: number;
  criteria: SeoCriterion[];
}

export type SeoAnalysisResult = {
  overallScore: number;
  dimensions: SeoDimensionResult[];
  analyzedAt: string;
}

/** Données sérialisables envoyées au worker */
export type SeoAnalysisPayload = {
  plainText: string;
  focusKeyword: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  titlePx: number;
  metaDescPx: number;
  headings: { level: number; text: string }[];
  headingsWithWordOffsets: { level: number; text: string; wordOffset: number }[];
  firstParagraph: string;
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
  imagesTotal: number;
  imagesMissingAlt: number;
  /** Moyenne mots concurrents (phase 3) — optionnel */
  competitorAvgWords?: number;
}
