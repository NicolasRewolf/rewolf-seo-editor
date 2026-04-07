/**
 * Doit être importé en tout premier depuis `index.ts` pour que `process.env`
 * soit peuplé avant tout autre module du serveur.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'dotenv';

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

/** Retire espaces / guillemets typiques des .env (ex. KEY="xxx" ou KEY='xxx'). */
function normalizeEnvValue(v: string): string {
  let x = v.trim();
  if (x.length >= 2) {
    const q = x[0];
    if ((q === '"' || q === "'") && x[x.length - 1] === q) {
      x = x.slice(1, -1);
    }
  }
  return x;
}

function normalizeEnvKey(raw: string): string {
  let key = raw.replace(/\r$/, '').trim();
  if (key.toLowerCase().startsWith('export ')) {
    key = key.slice(7).trim();
  }
  return key;
}

function mergeParsed(
  parsed: Record<string, string>,
  overrideExisting: boolean
): void {
  for (const [rawKey, rawVal] of Object.entries(parsed)) {
    const key = normalizeEnvKey(rawKey);
    if (!key || key.startsWith('#')) continue;
    const val = normalizeEnvValue(String(rawVal ?? ''));
    if (overrideExisting || process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

/** Noms alternatifs souvent trouvés dans des .env tiers / docs. */
const ENV_ALIASES: Record<string, readonly string[]> = {
  OPENAI_API_KEY: ['OPENAI_KEY', 'OPENAI_TOKEN'],
  ANTHROPIC_API_KEY: ['ANTHROPIC_KEY', 'CLAUDE_API_KEY', 'ANTHROPIC_API_SECRET'],
  SERPER_API_KEY: ['SERPER_KEY', 'GOOGLE_SERP_API_KEY'],
};

function envNonEmpty(name: string): boolean {
  const v = process.env[name];
  return typeof v === 'string' && v.trim().length > 0;
}

function applyCanonicalAliases(): void {
  for (const [canonical, alternates] of Object.entries(ENV_ALIASES)) {
    if (envNonEmpty(canonical)) continue;
    for (const alt of alternates) {
      if (envNonEmpty(alt)) {
        process.env[canonical] = process.env[alt]!.trim();
        break;
      }
    }
  }
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

for (const name of ['.env', '.env.local'] as const) {
  const p = resolve(projectRoot, name);
  if (!existsSync(p)) continue;
  let raw = readFileSync(p, 'utf8');
  raw = stripBom(raw);
  try {
    mergeParsed(parse(raw), name === '.env.local');
  } catch (e) {
    console.warn(`[rewolf-api] Lecture ${name} impossible:`, e);
  }
}

applyCanonicalAliases();

if (!existsSync(resolve(projectRoot, '.env')) && !existsSync(resolve(projectRoot, '.env.local'))) {
  console.warn(
    `[rewolf-api] Aucun .env ou .env.local dans ${projectRoot} — clés API absentes.`
  );
}

if (!envNonEmpty('SERPER_API_KEY')) {
  console.warn('[rewolf-api] SERPER_API_KEY absente ou vide — SERP / Serper indisponible.');
}
if (!envNonEmpty('ANTHROPIC_API_KEY') && !envNonEmpty('OPENAI_API_KEY')) {
  console.info(
    '[rewolf-api] Clés IA non définies (ANTHROPIC_API_KEY ou OPENAI_API_KEY). Assistant / rédaction IA désactivés ; SERP et lecteur inchangés.'
  );
}

export const ENV_PROJECT_ROOT = projectRoot;
