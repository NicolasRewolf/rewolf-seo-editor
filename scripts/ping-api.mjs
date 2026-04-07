#!/usr/bin/env node
/**
 * Vérifie que l’API locale répond (évite une sortie vide si rien n’écoute sur le port).
 * Utilise PORT depuis l’environnement, puis `.env` à la racine du projet, sinon 8787.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'dotenv';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
for (const name of ['.env', '.env.local']) {
  const p = resolve(projectRoot, name);
  if (!existsSync(p)) continue;
  let raw = readFileSync(p, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  Object.assign(process.env, parse(raw));
}

const port = Number(process.env.PORT) || 8787;
const url = `http://127.0.0.1:${port}/api/health`;

const ac = new AbortController();
const timer = setTimeout(() => ac.abort(), 8000);
try {
  const res = await fetch(url, { signal: ac.signal });
  const text = await res.text();
  if (!text) {
    console.error(`Réponse vide (${res.status}) depuis ${url}`);
    process.exit(1);
  }
  console.log(text);
  if (!res.ok) process.exit(1);
} catch {
  console.error(`Impossible de joindre ${url}`);
  console.error(
    "Cause typique : l’API n’est pas démarrée. Dans un terminal du projet, lancez :"
  );
  console.error("  npm run server");
  console.error("ou front + API :");
  console.error("  npm run dev:all");
  console.error(
    `Si vous utilisez un autre port, exportez PORT=... ou vérifiez votre fichier .env.`
  );
  process.exit(1);
} finally {
  clearTimeout(timer);
}
