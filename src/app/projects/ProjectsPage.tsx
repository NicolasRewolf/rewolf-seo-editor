'use client';

import { FileTextIcon, Loader2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { listArticlesOnDisk } from '@/lib/api/articles-disk';
import { cn } from '@/lib/utils';

export function ProjectsPage() {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const s = await listArticlesOnDisk();
        setSlugs(s);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : 'Impossible de lire data/articles (API démarrée ?)'
        );
        setSlugs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="bg-background min-h-svh">
      <header className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            REWOLF · Projets
          </p>
          <h1 className="text-foreground text-lg font-semibold">
            Articles (data/articles)
          </h1>
        </div>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to="/">Retour éditeur</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {loading && (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2Icon className="size-4 animate-spin" />
            Chargement…
          </p>
        )}

        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && slugs.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Aucun article sur disque. Enregistrez depuis l'éditeur (bouton
            Enregistrer ./data).
          </p>
        )}

        {slugs.length > 0 && (
          <ul className="divide-border divide-y rounded-md border">
            {slugs.map((slug) => (
              <li
                key={slug}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <span className="flex items-center gap-2 text-sm">
                  <FileTextIcon className="text-muted-foreground size-4" />
                  {slug}
                </span>
                <Button type="button" variant="secondary" size="sm" asChild>
                  <Link
                    to={`/?slug=${encodeURIComponent(slug)}`}
                    className={cn('text-xs')}
                  >
                    Ouvrir
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
