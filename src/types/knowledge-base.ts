export type KbSourceType = 'text' | 'url' | 'file' | 'serp';

/** Titre extrait du Markdown Reader (H1–H3). */
export type ExtractedHeading = { level: 1 | 2 | 3; text: string };

export type KbSource = {
  id: string;
  type: KbSourceType;
  label: string;
  content: string;
  wordCount: number;
  addedAt: string;
  url?: string;
  /** Hiérarchie issue du Markdown Jina lors de l’import URL/SERP. */
  headings?: ExtractedHeading[];
};

/** Base de connaissances attachée à un article. */
export type KnowledgeBase = {
  sources: KbSource[];
};
