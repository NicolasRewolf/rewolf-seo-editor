/** Mesure alignée sur la SERP Google (title ~ Arial 20px). */
const TITLE_FONT = '20px Arial';
/** Snippet ~ Arial 14px (approximation affichage résultat). */
const SNIPPET_FONT = '14px Arial';

let canvas: HTMLCanvasElement | null = null;

function getContext(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!canvas) canvas = document.createElement('canvas');
  return canvas.getContext('2d');
}

export function measureTitleWidthPx(text: string): number {
  const ctx = getContext();
  if (!ctx) return 0;
  ctx.font = TITLE_FONT;
  return ctx.measureText(text).width;
}

export function measureMetaDescriptionWidthPx(text: string): number {
  const ctx = getContext();
  if (!ctx) return 0;
  ctx.font = SNIPPET_FONT;
  return ctx.measureText(text).width;
}

export const SERP_LIMITS = {
  titlePx: 580,
  metaDescPx: 920,
  titleCharsSoft: 60,
  metaDescMin: 140,
  metaDescMax: 160,
} as const;
