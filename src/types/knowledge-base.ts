export type KbSourceType = 'text' | 'url' | 'file' | 'serp';

export type KbSource = {
  id: string;
  type: KbSourceType;
  label: string;
  content: string;
  wordCount: number;
  addedAt: string;
  url?: string;
};

/** Base de connaissances attachée à un article. */
export type KnowledgeBase = {
  sources: KbSource[];
};
