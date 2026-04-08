# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

REWOLF SEO Editor is a French-language SEO writing application with workflow:
**Data → Brief → Plan → Redaction → Finaliser**.

- Monorepo style app in a single package
- Frontend: Vite + React (`src/`)
- Backend API: Hono (`server/`)
- Persistence: JSON files in `data/articles/*.json` (git-ignored)
- No database and no Docker required

### Quick start (Cloud)

1. Install dependencies: `npm install`
2. Copy env file once: `cp .env.example .env` (fill keys only if needed)
3. Start full stack: `npm run dev:all`
4. Optional API health check: `curl -s http://127.0.0.1:8787/api/health`

Ports:
- Frontend: `5173`
- API: `8787`

### Environment notes

- Required file: `.env` at repo root
- Expected keys: `SERPER_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
- App can run without keys, but AI/SERP routes return errors
- If `.env` is changed, restart backend (`npm run server`)

### Standard commands

| Task | Command |
|------|---------|
| Dev (full stack) | `npm run dev:all` |
| Dev (frontend) | `npm run dev` |
| Dev (backend) | `npm run server` |
| API ping | `npm run api:ping` |
| Lint | `npm run lint` |
| Test | `npm test` |
| Build | `npm run build` |

### Relevant code locations

- App shell: `src/App.tsx`, `src/main.tsx`
- Editor app code: `src/app/`
- Reusable UI: `src/components/`
- API entry: `server/index.ts`
- API routes: `server/routes/`
- Shared server helpers: `server/lib/`
- Utility scripts: `scripts/`

### Agent workflow expectations

When changing code:

1. Reproduce or identify affected behavior first.
2. Implement the smallest focused change.
3. Run targeted checks:
   - Frontend/UI changes: run app and manually verify the affected flow.
   - Server changes: verify endpoint behavior (at least health check + touched route).
   - Shared logic: run related `vitest` tests if present.
4. Run `npm run lint` when edits touch TypeScript/JavaScript source.
5. Prefer narrow, high-signal tests over full-suite runs unless required.

When editing docs only:

- No full app run required; verify markdown readability and command accuracy.

### Known caveats

- Vite optimizer warning can appear on first load; usually resolves automatically.
- `data/` content is runtime output and should stay uncommitted.
- Backend reload is file-based; `.env` changes are not hot-reloaded.
