import type { BlogPosting, WithContext } from 'schema-dts';

/** Objet renvoyé par POST /api/ai/object (mode jsonld-blog), typé pour l'éditeur. */
export type BlogPostingJsonLd = WithContext<BlogPosting>;
