#!/usr/bin/env node
/**
 * run-agent.mjs — Lance une session Claude Managed Agents pour le développement
 * de REWOLF SEO Editor.
 *
 * Usage :
 *   node scripts/agents/run-agent.mjs --task <type> [--desc "description"] [--file <path>]
 *
 * Types de tâches :
 *   test-generate  Génère des tests Vitest pour un fichier donné
 *   test-fix       Corrige les tests en échec (passer l'output de npm test via --desc)
 *   feature        Implémente une nouvelle feature
 *   maintain       Audit de dépendances et qualité code
 *
 * Exemples :
 *   npm run agent:test -- --file src/lib/seo/eeat.ts
 *   npm run agent:test:fix -- --desc "$(npm test 2>&1)"
 *   npm run agent:feature -- --desc "Ajouter un score de lisibilité Gunning Fog"
 *   npm run agent:maintain
 *
 * Prérequis :
 *   ANTHROPIC_API_KEY défini dans .env ou en variable d'environnement.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

// ---------------------------------------------------------------------------
// Parse args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

const task = getArg('--task');
const desc = getArg('--desc') ?? '';
const file = getArg('--file') ?? '';

if (hasFlag('--help') || hasFlag('-h')) {
  console.log(`
Usage: node scripts/agents/run-agent.mjs --task <type> [--desc "..."] [--file src/...]

Types: test-generate | test-fix | feature | maintain | qa-copywriter | benchmark

Options:
  --task    Type de tâche (obligatoire)
  --desc    Description libre ou output de commande passée en entrée
  --file    Chemin relatif vers un fichier source (pour test-generate)
  --help    Affiche cette aide
`);
  process.exit(0);
}

if (!task) {
  console.error('[agent] Erreur : --task requis. Utilisez --help pour l\'aide.');
  process.exit(1);
}

const validTasks = ['test-generate', 'test-fix', 'feature', 'maintain', 'qa-copywriter', 'benchmark'];
if (!validTasks.includes(task)) {
  console.error(`[agent] Tâche inconnue : "${task}". Valeurs valides : ${validTasks.join(', ')}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Charger les prompts
// ---------------------------------------------------------------------------
let systemPrompt, taskTemplate;
try {
  systemPrompt = readFileSync(resolve(__dirname, 'system-prompt.md'), 'utf8');
  taskTemplate = readFileSync(resolve(__dirname, `tasks/${task}.md`), 'utf8');
} catch (err) {
  console.error(`[agent] Fichier prompt introuvable : ${err.message}`);
  process.exit(1);
}

const taskPrompt = taskTemplate
  .replace(/\{\{desc\}\}/g, desc)
  .replace(/\{\{file\}\}/g, file)
  .replace(/\{\{root\}\}/g, ROOT)
  .trim();

// ---------------------------------------------------------------------------
// API Key
// ---------------------------------------------------------------------------
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  // Tentative de chargement depuis .env
  try {
    const envContent = readFileSync(resolve(ROOT, '.env'), 'utf8');
    const match = envContent.match(/^ANTHROPIC_API_KEY\s*=\s*(.+)$/m);
    if (match) {
      process.env.ANTHROPIC_API_KEY = match[1].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    // .env absent, pas grave
  }
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[agent] Erreur : ANTHROPIC_API_KEY introuvable. Définissez-la dans .env ou en variable d\'environnement.');
  process.exit(1);
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const API_BASE = 'https://api.anthropic.com';
const BETA_HEADER = 'managed-agents-2026-04-01';
const MODEL = 'claude-sonnet-4-6';

const baseHeaders = {
  'x-api-key': ANTHROPIC_API_KEY,
  'anthropic-version': '2023-06-01',
  'anthropic-beta': BETA_HEADER,
  'content-type': 'application/json',
};

// ---------------------------------------------------------------------------
// Helpers API
// ---------------------------------------------------------------------------
async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: { ...baseHeaders, accept: 'text/event-stream' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} → ${res.status}: ${text}`);
  }
  return res;
}

// ---------------------------------------------------------------------------
// Lire le flux SSE et afficher les deltas texte
// ---------------------------------------------------------------------------
async function streamSession(sessionId) {
  const res = await apiGet(`/v1/sessions/${sessionId}/events/stream`);
  const decoder = new TextDecoder();
  let buffer = '';

  process.stdout.write('\n');

  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return;

      try {
        const event = JSON.parse(data);
        // Texte généré par le modèle
        if (
          event.type === 'content_block_delta' &&
          event.delta?.type === 'text_delta'
        ) {
          process.stdout.write(event.delta.text);
        }
        // Fin de session
        if (event.type === 'session_completed' || event.type === 'message_stop') {
          process.stdout.write('\n');
          return;
        }
        // Erreur
        if (event.type === 'error') {
          throw new Error(JSON.stringify(event.error ?? event));
        }
      } catch (err) {
        if (err.message !== 'Unexpected end of JSON input') {
          console.error('\n[agent] Parse SSE :', err.message);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log(`[agent] Tâche : ${task}${file ? ` | fichier : ${file}` : ''}`);
console.log(`[agent] Modèle : ${MODEL}`);
console.log('[agent] Création de la session…');

try {
  // 1. Créer la session (agent inline — pas besoin de pré-créer un agent)
  const session = await apiPost('/v1/sessions', {
    model: MODEL,
    system: systemPrompt,
  });

  const sessionId = session.id;
  console.log(`[agent] Session : ${sessionId}`);
  console.log('[agent] Envoi de la tâche…');

  // 2. Envoyer l'événement utilisateur
  await apiPost(`/v1/sessions/${sessionId}/events`, {
    type: 'user',
    content: taskPrompt,
  });

  console.log('[agent] Exécution en cours…');

  // 3. Streamer les résultats
  await streamSession(sessionId);

  console.log('\n[agent] Terminé.');
} catch (err) {
  console.error(`\n[agent] Erreur : ${err.message}`);
  process.exit(1);
}
