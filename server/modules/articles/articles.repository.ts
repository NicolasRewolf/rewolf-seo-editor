import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

function dataDir(): string {
  return join(process.cwd(), 'data', 'articles');
}

function pathForSlug(slug: string): string {
  return join(dataDir(), `${slug}.json`);
}

export async function ensureArticlesDir(): Promise<void> {
  await mkdir(dataDir(), { recursive: true });
}

export async function listArticleFileNames(): Promise<string[]> {
  return readdir(dataDir());
}

export async function readArticleRaw(slug: string): Promise<string> {
  return readFile(pathForSlug(slug), 'utf8');
}

export async function tryReadExistingArticleRecord(
  slug: string
): Promise<Record<string, unknown> | null> {
  try {
    return JSON.parse(await readArticleRaw(slug)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function writeArticleRaw(
  slug: string,
  payload: Record<string, unknown>
): Promise<void> {
  await writeFile(pathForSlug(slug), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
