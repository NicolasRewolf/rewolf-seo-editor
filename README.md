# REWOLF SEO Editor

Éditeur d’**articles SEO** avec workflow **Data → Plan → Rédaction → Finaliser**, éditeur [Plate](https://platejs.org/), base de connaissances (sources SERP / URL / texte / fichiers), analyse SEO en worker et API locale (SERP, reader, LLM).

**Dépôt :** [github.com/NicolasRewolf/rewolf-seo-editor](https://github.com/NicolasRewolf/rewolf-seo-editor)

## Prérequis

- Node.js récent, `npm install`
- Fichier `.env` (voir `.env.example`) : clés Serper, Anthropic/OpenAI selon les fonctions utilisées

## Commandes

```bash
npm install
npm run dev
```

- Dev complet (front + API) : `npm run dev` (alias `npm run dev:all`)
- Front seul : `npm run dev:web`
- API seule : `npm run dev:api`
- Build complet : `npm run build`
- Lint : `npm run lint`
- Tests : `npm run test`

Les réglages meta (titre, description, slug) sont prévus surtout à l’étape **Finaliser** ; le workspace **Data** sert à constituer le cluster de sources.

## Architecture

Le dépôt est organisé en **monorepo npm workspaces** avec un package partagé :

- `src/` : frontend React + Vite (éditeur, workflow, UI)
- `server/` : API Hono
- `shared/` (`@shared/core`) : contrats Zod/Typescript, prompts IA, routage modèles, utilitaires isomorphes

### Backend Pattern

Le backend suit un pattern modulaire par domaine :

- `*.route.ts` : exposition HTTP et wiring Hono
- `*.controller.ts` : parsing requête/réponse, adaptation transport
- `*.service.ts` : orchestration métier
- `*.repository.ts` : accès IO/API externes
- `*.mapper.ts` (si nécessaire) : conversion stockage ↔ contrats

Chaque module (`articles`, `ai`, `serp`, `reader`, `agent`) applique cette séparation pour améliorer testabilité et maintenance.

## Dossiers utiles

| Chemin | Rôle |
|--------|------|
| `src/app/editor/data/` | **Code** du workspace « étape Data » (UI cluster), versionné |
| `/data/` à la racine | **Exports** articles JSON via « Enregistrer ./data » — **ignoré par Git** (`/data/` dans `.gitignore`) |
| `shared/` | Package `@shared/core` partagé front/back |
| `server/modules/` | Modules backend en architecture route/controller/service/repository |

## Validation rapide

```bash
npm run build
npm run test
```

## Projet séparé (dashboard analytique)

Le tableau de bord **GSC + DataForSEO** est un **autre dépôt** : [NicolasRewolf/dashboardseo](https://github.com/NicolasRewolf/dashboardseo). Voir [`docs/ECOSYSTEM.md`](docs/ECOSYSTEM.md).
