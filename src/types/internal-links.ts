export type InternalLink = {
  url: string;
  anchor: string;
  slug?: string;
  title?: string;
};

export type InternalLinksMap = {
  links: InternalLink[];
  importedAt: string;
};
