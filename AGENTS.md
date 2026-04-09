---
description: 
alwaysApply: true
---

# AGENTS.md

## Claude Managed Agents — Outils de développement

Le projet intègre **Claude Managed Agents** comme outil de développement (construction, tests, maintenance).

### Prérequis

- `ANTHROPIC_API_KEY` dans `.env`
- Node.js 22+ (pour `fetch` natif)

### Scripts disponibles


| Commande                                                      | Usage                                             |
| ------------------------------------------------------------- | ------------------------------------------------- |
| `npm run agent:test -- --file <chemin>`                       | Génère des tests Vitest pour un fichier           |
| `npm run agent:test:fix -- --desc "$(npm test 2>&1)"`         | Corrige les tests en échec                        |
| `npm run agent:feature -- --desc "description de la feature"` | Implémente une feature                            |
| `npm run agent:maintain`                                      | Audit dépendances + qualité code                  |
| `npm run agent:qa -- --desc "mot-clé"`                        | Simule un copywriter A→Z et remonte les frictions |
| `npm run agent:benchmark -- --desc "<url ou sujet>"`          | Benchmark contenu concurrent vs génération        |


### Exemples

```bash
# Générer des tests pour src/lib/seo/eeat.ts
npm run agent:test -- --file src/lib/seo/eeat.ts

# Corriger des tests cassés
npm run agent:test:fix -- --desc "$(npm test 2>&1)"

# Implémenter une nouvelle feature
npm run agent:feature -- --desc "Ajouter le score Gunning Fog à l'analyse de lisibilité"

# Audit de maintenance complet
npm run agent:maintain

# QA copywriter
npm run agent:qa -- --desc "meilleur logiciel comptabilité PME"

# Benchmark de contenu
npm run agent:benchmark -- --desc "https://example.com/article"
```

### Architecture des scripts

```
scripts/agents/
├── run-agent.mjs          # CLI principal (fetch vers API Managed Agents)
├── system-prompt.md       # Contexte projet injecté à chaque session
└── tasks/
    ├── test-generate.md   # Prompt : génération de tests
    ├── test-fix.md        # Prompt : correction de tests
    ├── feature.md         # Prompt : implémentation de feature
    ├── maintain.md         # Prompt : audit de maintenance
    ├── qa-copywriter.md    # Prompt : simulation copywriter
    └── benchmark.md        # Prompt : benchmark article
```

### Migration Managed Agents (doc officielle)

Le flux est aligné sur la doc Anthropic :

1. `POST /v1/environments`
2. `POST /v1/agents` (avec `tools: [{ type: "agent_toolset_20260401" }]`)
3. `POST /v1/sessions` (avec `agent` + `environment_id`)
4. `POST /v1/sessions/:id/events` (format `events: [{ type: "user.message", ... }]`)
5. `GET /v1/sessions/:id/events/stream`

Notes :

- Le script CLI archive l'agent créé en fin d'exécution (sauf `--keep-agent`).
- La route serveur `/api/agent/session` réutilise un agent/environment en mémoire.
- Pour forcer la réutilisation entre redémarrages serveur, vous pouvez définir :
  - `ANTHROPIC_MANAGED_AGENT_ID`
  - `ANTHROPIC_MANAGED_ENVIRONMENT_ID`

### API serveur (Axe 3 — tâches longues depuis l'UI)

Endpoint disponible sur le serveur Hono :

```bash
# Créer une session agent pour une tâche longue
curl -X POST http://localhost:8787/api/agent/session \
  -H "Content-Type: application/json" \
  -d '{"task": "Rédige une introduction SEO pour l'\''article sur...", "context": {"keyword": "...", "title": "..."}}'

# Réponse : { "sessionId": "sess_xxx", "status": "running" }

# Streamer les résultats (EventSource côté frontend)
curl http://localhost:8787/api/agent/session/sess_xxx/stream

# Vérifier le statut
curl http://localhost:8787/api/agent/session/sess_xxx
```

### GitHub Actions CI/CD

Deux workflows dans `.github/workflows/` :


| Workflow             | Déclencheur        | Action                                 |
| -------------------- | ------------------ | -------------------------------------- |
| `ci.yml`             | Push / PR          | Lint + Test + Build                    |
| `agent-test-fix.yml` | CI échoue / manuel | Lance un agent pour corriger les tests |


Pour `agent-test-fix.yml`, configurer le secret `ANTHROPIC_API_KEY` dans les settings GitHub Actions du repo.

---

## Cursor Cloud specific instructions

### Overview

REWOLF SEO Editor — a French-language SEO article writing tool with workflow **Data → Brief → Plan → Rédaction → Finaliser**. Single repo, two processes (Vite frontend + Hono API backend), no database (file-based persistence in `data/articles/*.json`).

### Running the app

- **Combined start:** `npm run dev:all` (runs both Vite on port 5173 and Hono API on port 8787 via `concurrently`)
- **Frontend only:** `npm run dev` (port 5173)
- **Backend only:** `npm run server` (port 8787, uses `tsx watch`)
- **Health check:** `curl -s http://127.0.0.1:8787/api/health`

### Standard commands

See `package.json` `scripts` section. Key commands:


| Task  | Command                                  |
| ----- | ---------------------------------------- |
| Lint  | `npm run lint`                           |
| Test  | `npm test` (Vitest)                      |
| Build | `npm run build` (`tsc -b && vite build`) |
| Dev   | `npm run dev:all`                        |


### Environment

- `.env` file required at root (copy from `.env.example`). Keys: `SERPER_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`.
- The app starts without API keys, but AI/SERP features return errors. The editor itself works without them.
- After modifying `.env`, restart `npm run server` (the Hono server does not auto-reload on `.env` changes).

### Caveats

- No Docker, no database, no external services required to run.
- The Vite dev server sometimes shows an optimizer warning on first load — this is normal and resolves after the initial bundling completes.
- Articles are saved as JSON to `data/` directory at project root (git-ignored).



----------------


# REWOLF SEO Editor - Engineering Standards

Tu es un expert Fullstack Senior travaillant sur le monorepo REWOLF. Tu dois respecter strictement l'architecture en place.

## 1. Architecture Globale (Monorepo)
- **Source de Vérité :** Toute logique métier, type, schéma Zod ou prompt IA doit résider dans `@shared/core`. 
- **Interdiction :** Ne jamais dupliquer un type ou une constante entre le `server` et le `front`. Utilise l'import `@shared/core`.

## 2. Backend (Hono) - Pattern Layered Architecture
Chaque module dans `server/modules/` doit suivre cette structure :
- **Route :** Uniquement les définitions d'endpoints.
- **Controller :** Extraction des params, appel au Service, réponse via `c.json`.
- **Service :** Logique métier pure, orchestration, appels IA.
- **Repository :** Accès aux données (FS ou APIs externes).
- **Validation :** Utilise systématiquement `shared/contracts` pour valider les payloads.
- **Erreurs :** Utilise `throw new AppError(message, code, status)` au lieu de retours d'erreurs manuels.

## 3. Frontend (React/Vite) - Pattern Hook/View
- **Composants :** Doivent être "purs" et légers. Maximum 150 lignes.
- **Logique :** Toute logique complexe (IA, Stream, État complexe) doit être extraite dans un custom hook dédié (ex: `use-writing-step.ts`).
- **UI :** Utilise les composants atomiques dans `src/components/ui/`.

## 4. IA & Prompts
- Aucun prompt ne doit être écrit "en dur" dans le code serveur ou client.
- Modifie ou ajoute les prompts exclusivement dans `shared/ai/prompts/`.
- Utilise `shared/ai/model-routing.ts` pour toute décision de sélection de modèle.

## 5. Qualité & Tests
- **Tests :** Avant de proposer une modification de logique dans `@shared/core`, vérifie ou mets à jour les tests unitaires dans `shared/utils/*.test.ts`.
- **Typage :** Strictement aucun `any`. Utilise `z.infer<typeof schema>` pour les types dérivés de Zod.

## 6. Workflow de réponse
1. Analyse si la demande impacte le contrat (@shared/core).
2. Propose d'abord les modifications de contrat, puis le backend, puis le frontend.
3. Vérifie toujours la validité via `npm run lint` et `npx tsc -b`.
4. **IMPORTANT :** Termine TOUJOURS tes messages par la commande exacte pour tester la modification demandée.
