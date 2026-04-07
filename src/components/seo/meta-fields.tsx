'use client';

import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  measureMetaDescriptionWidthPx,
  measureTitleWidthPx,
  SERP_LIMITS,
} from '@/lib/seo/canvas-measure';
import { slugify } from '@/lib/utils/slugify';
import type { ArticleMeta } from '@/types/article';

import { SerpPreview } from './serp-preview';

type MetaFieldsProps = {
  meta: ArticleMeta;
  onMetaChange: (next: ArticleMeta) => void;
  siteHost?: string;
};

function statusClass(ok: boolean, warn: boolean) {
  if (ok) return 'text-emerald-600 dark:text-emerald-400';
  if (warn) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export function MetaFields({
  meta,
  onMetaChange,
  siteHost,
}: MetaFieldsProps) {
  const titlePx = useMemo(
    () => measureTitleWidthPx(meta.metaTitle),
    [meta.metaTitle]
  );
  const descPx = useMemo(
    () => measureMetaDescriptionWidthPx(meta.metaDescription),
    [meta.metaDescription]
  );

  const titleLen = meta.metaTitle.length;
  const descLen = meta.metaDescription.length;

  const titlePxOk = titlePx <= SERP_LIMITS.titlePx;
  const titlePxWarn = titlePx > SERP_LIMITS.titlePx && titlePx <= SERP_LIMITS.titlePx + 40;

  const descRangeOk =
    descLen >= SERP_LIMITS.metaDescMin &&
    descLen <= SERP_LIMITS.metaDescMax &&
    descPx <= SERP_LIMITS.metaDescPx;
  const descWarn =
    !descRangeOk &&
    descLen >= 120 &&
    descLen <= 180 &&
    descPx <= SERP_LIMITS.metaDescPx + 60;

  function patch(partial: Partial<ArticleMeta>) {
    onMetaChange({ ...meta, ...partial });
  }

  function setMetaTitle(v: string) {
    const next: ArticleMeta = {
      ...meta,
      metaTitle: v,
    };
    if (!meta.slugLocked) {
      next.slug = slugify(v);
    }
    onMetaChange(next);
  }

  return (
    <section className="border-border bg-muted/20 border-b px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h2 className="text-foreground mb-1 text-sm font-semibold">
              Réglages SEO
            </h2>
            <p className="text-muted-foreground text-xs">
              Mot-clé principal, balises et URL — utilisés pour le score et
              l'aperçu ci-contre.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="focus-keyword"
              className="text-foreground text-sm font-medium"
            >
              Mot-clé principal
            </label>
            <Input
              id="focus-keyword"
              placeholder="ex. avocat droit du travail bordeaux"
              value={meta.focusKeyword}
              onChange={(e) => patch({ focusKeyword: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor="meta-title"
                className="text-foreground text-sm font-medium"
              >
                Title tag
              </label>
              <span
                className={`text-xs tabular-nums ${statusClass(titlePxOk, titlePxWarn)}`}
              >
                {titleLen} car. · {Math.round(titlePx)} px / {SERP_LIMITS.titlePx}{' '}
                px (Arial 20px)
              </span>
            </div>
            <Input
              id="meta-title"
              placeholder="Titre affiché dans Google (~50–60 caractères)"
              value={meta.metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Cible : moins de {SERP_LIMITS.titleCharsSoft} caractères et largeur
              sous {SERP_LIMITS.titlePx}px pour limiter la coupure.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <label
                htmlFor="meta-desc"
                className="text-foreground text-sm font-medium"
              >
                Meta description
              </label>
              <span
                className={`text-xs tabular-nums ${statusClass(descRangeOk, descWarn)}`}
              >
                {descLen} car. · {Math.round(descPx)} px / {SERP_LIMITS.metaDescPx}{' '}
                px (Arial 14px)
              </span>
            </div>
            <Textarea
              id="meta-desc"
              placeholder="Résumé accrocheur pour la SERP (idéal 140–160 caractères)"
              value={meta.metaDescription}
              onChange={(e) => patch({ metaDescription: e.target.value })}
              rows={3}
              className="min-h-[72px] resize-y"
            />
            <p className="text-muted-foreground text-xs">
              Idéal : {SERP_LIMITS.metaDescMin}–{SERP_LIMITS.metaDescMax}{' '}
              caractères ; largeur indicative sous {SERP_LIMITS.metaDescPx}px.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="slug"
                className="text-foreground text-sm font-medium"
              >
                URL (slug)
              </label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="text-muted-foreground h-7 text-xs"
                onClick={() =>
                  patch({
                    slug: slugify(meta.metaTitle),
                    slugLocked: false,
                  })
                }
              >
                Sync depuis le title
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground shrink-0 text-sm">/</span>
              <Input
                id="slug"
                placeholder="mon-article-optimise"
                value={meta.slug}
                onChange={(e) =>
                  patch({ slug: e.target.value, slugLocked: true })
                }
                className="font-mono text-sm"
              />
            </div>
            {meta.slugLocked && (
              <p className="text-muted-foreground text-xs">
                Slug figé : le title ne le met plus à jour automatiquement.
              </p>
            )}
          </div>
        </div>

        <div className="lg:border-border shrink-0 lg:sticky lg:top-4 lg:border-l lg:pl-10">
          <SerpPreview meta={meta} siteHost={siteHost} />
        </div>
      </div>
    </section>
  );
}
