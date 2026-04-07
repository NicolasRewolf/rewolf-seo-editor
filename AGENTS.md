# AGENTS.md

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
