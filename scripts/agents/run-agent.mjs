#!/usr/bin/env node
/**
 * run-agent.mjs — Lance une session Claude Managed Agents pour le développement
 * de REWOLF SEO Editor.
 *
 * Usage :
 *   node scripts/agents/run-agent.mjs --task <type> [--desc "description"] [--file <path>]
 *
 * Types de tâches :
 *   test-generate   Génère des tests Vitest pour un fichier donné
 *   test-fix        Corrige les tests en échec (passer l'output de npm test via --desc)
 *   feature         Implémente une nouvelle feature
 *   maintain        Audit de dépendances et qualité code
 *   qa-copywriter   Simule un copywriter A→Z et produit un rapport pain points
 *   benchmark       Compare un article existant avec une génération IA
 *
 * Exemples :
 *   npm run agent:test -- --file src/lib/seo/eeat.ts
 *   npm run agent:test:fix -- --desc "$(npm test 2>&1)"
 *   npm run agent:feature -- --desc "Ajouter un score de lisibilité Gunning Fog"
 *   npm run agent:maintain
 *   npm run agent:qa -- --desc "meilleur logiciel comptabilité PME"
 *   npm run agent:benchmark -- --desc "https://example.com/article"
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
const keepAgent = hasFlag('--keep-agent');

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

const AGENT_PROFILES = {
  'test-generate': {
    id: 'test-maintainer',
    name: 'rewolf-test-maintainer',
    description: 'Generates and fixes test suites for REWOLF SEO Editor.',
  },
  'test-fix': {
    id: 'test-maintainer',
    name: 'rewolf-test-maintainer',
    description: 'Generates and fixes test suites for REWOLF SEO Editor.',
  },
  feature: {
    id: 'feature-implementer',
    name: 'rewolf-feature-implementer',
    description: 'Implements scoped product features in the REWOLF codebase.',
  },
  maintain: {
    id: 'release-maintainer',
    name: 'rewolf-release-maintainer',
    description: 'Performs maintenance audits and release readiness checks.',
  },
  'qa-copywriter': {
    id: 'seo-qa-copywriter',
    name: 'rewolf-seo-qa-copywriter',
    description: 'Runs end-to-end SEO copywriter QA flows and reports pain points.',
  },
  benchmark: {
    id: 'seo-benchmark-analyst',
    name: 'rewolf-seo-benchmark-analyst',
    description: 'Compares generated content against benchmark competitor articles.',
  },
};
const agentProfile = AGENT_PROFILES[task];

const RUNTIME_ENV_KEYS = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'SERPER_API_KEY',
];

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

function renderTemplate(template, vars) {
  const withConditionals = template.replace(
    /\{\{#if\s+([a-zA-Z0-9_]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g,
    (_match, key, truthy, falsy = '') => {
      const v = vars[key];
      return String(v ?? '').trim() ? truthy : falsy;
    }
  );
  return withConditionals.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, key) =>
    String(vars[key] ?? '')
  );
}

function parseDotEnv(content) {
  const out = {};
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    value = value.replace(/^['"]|['"]$/g, '');
    out[key] = value;
  }
  return out;
}

function hydrateEnvFromDotEnv() {
  try {
    const envContent = readFileSync(resolve(ROOT, '.env'), 'utf8');
    const parsed = parseDotEnv(envContent);
    for (const key of RUNTIME_ENV_KEYS) {
      if (!process.env[key] && parsed[key]) {
        process.env[key] = parsed[key];
      }
    }
  } catch {
    // .env absent, pas grave
  }
}

// ---------------------------------------------------------------------------
// API Key
// ---------------------------------------------------------------------------
hydrateEnvFromDotEnv();

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[agent] Erreur : ANTHROPIC_API_KEY introuvable. Définissez-la dans .env ou en variable d\'environnement.');
  process.exit(1);
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';
const SERPER_API_KEY = process.env.SERPER_API_KEY ?? '';
const API_BASE = 'https://api.anthropic.com';
const MODEL = 'claude-sonnet-4-6';

const taskPrompt = renderTemplate(taskTemplate, {
  desc,
  file,
  root: ROOT,
  anthropic_api_key: ANTHROPIC_API_KEY ?? '',
  openai_api_key: OPENAI_API_KEY,
  serper_api_key: SERPER_API_KEY,
}).trim();

const baseHeaders = {
  'x-api-key': ANTHROPIC_API_KEY,
  'anthropic-version': '2023-06-01',
  'anthropic-beta': 'managed-agents-2026-04-01',
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

async function apiDelete(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: baseHeaders,
  });
  // 204 No Content = success, don't try to parse body
  if (!res.ok && res.status !== 204) {
    const text = await res.text().catch(() => '');
    console.warn(`[agent] Nettoyage ${path} → ${res.status}: ${text}`);
  }
}

async function apiArchive(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: baseHeaders,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.warn(`[agent] Archive ${path} → ${res.status}: ${text}`);
  }
}

// ---------------------------------------------------------------------------
// Consommer le flux SSE Managed Agents
// Les events reçus sont des objets complets (pas des deltas comme Messages API)
// ---------------------------------------------------------------------------
async function consumeStream(streamRes) {
  const decoder = new TextDecoder();
  let buffer = '';

  process.stdout.write('\n');

  outer: for await (const chunk of streamRes.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      // Ignorer les commentaires heartbeat (: ping) et les lignes vides
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (!data || data === '[DONE]') continue;

      let event;
      try {
        event = JSON.parse(data);
      } catch {
        continue; // ignorer les lignes non-JSON
      }

      // Texte de l'agent
      if (event.type === 'agent.message') {
        for (const block of (event.content ?? [])) {
          if (block.type === 'text') {
            process.stdout.write(block.text);
          }
        }
      }

      // Session idle — vérifier la raison d'arrêt
      if (event.type === 'session.status_idle') {
        const stopType = event.stop_reason?.type;
        if (stopType !== 'requires_action') {
          // end_turn ou retries_exhausted : c'est terminé
          break outer;
        }
        // requires_action : l'agent attend un tool result — on continue d'écouter
      }

      // Session terminée définitivement
      if (event.type === 'session.status_terminated') {
        break outer;
      }

      // Erreur de session
      if (event.type === 'session.error') {
        throw new Error(`Session error: ${JSON.stringify(event.error ?? event)}`);
      }
    }
  }

  process.stdout.write('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log(`[agent] Tâche : ${task}${file ? ` | fichier : ${file}` : ''}`);
console.log(`[agent] Modèle : ${MODEL}`);
console.log('[agent] Démarrage…');

let environmentId = null;
let agentId = null;

try {
  // 1. Créer un environnement cloud (requis par l'API Managed Agents)
  console.log('[agent] Création de l\'environnement…');
  const envName = `rewolf-${task}-${Date.now()}`;
  const env = await apiPost('/v1/environments', {
    name: envName,
    config: {
      type: 'cloud',
      networking: { type: 'unrestricted' },
    },
  });
  environmentId = env.id;
  console.log(`[agent] Environnement : ${environmentId}`);

  // 2. Créer l'agent (modèle + prompt système)
  //    model/system vivent sur l'agent, PAS sur la session
  console.log('[agent] Création de l\'agent…');
  const agent = await apiPost('/v1/agents', {
    name: agentProfile.name,
    description: agentProfile.description,
    model: MODEL,
    system: systemPrompt,
    tools: [{ type: 'agent_toolset_20260401' }],
    metadata: {
      project: 'rewolf-seo-editor',
      profile: agentProfile.id,
      task,
      source: 'scripts/agents/run-agent.mjs',
    },
  });
  agentId = agent.id;
  console.log(`[agent] Agent : ${agentId}`);

  // 3. Créer la session liée à l'agent + l'environnement
  console.log('[agent] Création de la session…');
  const session = await apiPost('/v1/sessions', {
    agent: agentId,            // string ID = version la plus récente
    environment_id: environmentId,
  });
  const sessionId = session.id;
  console.log(`[agent] Session : ${sessionId}`);

  // 4. Ouvrir le flux SSE AVANT d'envoyer le message (stream-first pattern)
  //    Le serveur bufférise les events dès la connexion ouverte.
  console.log('[agent] Connexion au flux SSE…');
  const streamRes = await fetch(`${API_BASE}/v1/sessions/${sessionId}/events/stream`, {
    method: 'GET',
    headers: { ...baseHeaders, accept: 'text/event-stream' },
  });
  if (!streamRes.ok) {
    const text = await streamRes.text();
    throw new Error(`Stream ${streamRes.status}: ${text}`);
  }

  // 5. Envoyer le message utilisateur
  //    Format : events[] avec type "user.message" et content array
  console.log('[agent] Envoi de la tâche…');
  await apiPost(`/v1/sessions/${sessionId}/events`, {
    events: [
      {
        type: 'user.message',
        content: [{ type: 'text', text: taskPrompt }],
      },
    ],
  });

  console.log('[agent] Exécution en cours…');

  // 6. Consommer le flux jusqu'à idle/terminated
  await consumeStream(streamRes);

  console.log('\n[agent] Terminé.');
} catch (err) {
  console.error(`\n[agent] Erreur : ${err.message}`);
  process.exit(1);
} finally {
  if (agentId && !keepAgent) {
    await apiArchive(`/v1/agents/${agentId}/archive`);
  }
  // Nettoyage : supprimer l'environnement pour rester sous la limite de 5
  if (environmentId) {
    await apiDelete(`/v1/environments/${environmentId}`);
  }
}
