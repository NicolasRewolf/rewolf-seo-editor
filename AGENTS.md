# AGENTS.md

## Claude Managed Agents — Outils de développement

Le projet intègre **Claude Managed Agents** comme outil de développement (construction, tests, maintenance).

### Prérequis

- `ANTHROPIC_API_KEY` dans `.env`
- Node.js 22+ (pour `fetch` natif)

### Scripts disponibles

| Commande | Usage |
|----------|-------|
| `npm run agent:test -- --file <chemin>` | Génère des tests Vitest pour un fichier |
| `npm run agent:test:fix -- --desc "$(npm test 2>&1)"` | Corrige les tests en échec |
| `npm run agent:feature -- --desc "description de la feature"` | Implémente une feature |
| `npm run agent:maintain` | Audit dépendances + qualité code |

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
    └── maintain.md        # Prompt : audit de maintenance
```

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

| Workflow | Déclencheur | Action |
|----------|-------------|--------|
| `ci.yml` | Push / PR | Lint + Test + Build |
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

| Task | Command |
|------|---------|
| Lint | `npm run lint` |
| Test | `npm test` (Vitest) |
| Build | `npm run build` (`tsc -b && vite build`) |
| Dev | `npm run dev:all` |

### Environment

- `.env` file required at root (copy from `.env.example`). Keys: `SERPER_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`.
- The app starts without API keys, but AI/SERP features return errors. The editor itself works without them.
- After modifying `.env`, restart `npm run server` (the Hono server does not auto-reload on `.env` changes).

### Caveats

- No Docker, no database, no external services required to run.
- The Vite dev server sometimes shows an optimizer warning on first load — this is normal and resolves after the initial bundling completes.
- Articles are saved as JSON to `data/` directory at project root (git-ignored).
