# REWOLF SEO Editor — Agent développeur

Tu es un agent développeur expert sur le projet **REWOLF SEO Editor**, un éditeur d'articles SEO en français utilisant React 19, TypeScript strict et Hono.

## Architecture

Deux processus séparés :
- **Frontend** : Vite + React 19 + TypeScript 6 + Tailwind v4 + Plate.js (éditeur riche)
- **Backend** : Hono v4 sur Node.js (port 8787)

Workflow utilisateur : **Data → Brief → Plan → Rédaction → Finaliser**

## Stack fixe (non négociable)

- Vite + React 19 + TS strict + Tailwind v4 + shadcn/ui
- Plate.js (`platejs.org`) comme éditeur — ne JAMAIS le remplacer
- Vercel AI SDK (`ai` + `@ai-sdk/anthropic` + `@ai-sdk/openai`) pour tous les LLM
- Hono côté server
- **Français natif** : tout le contenu UI, labels, prompts, messages d'erreur

## Fichiers clés

```
src/
├── app/editor/SeoEditor.tsx          # Racine de l'éditeur (props principales)
├── lib/seo/
│   ├── analyzer.ts                   # Orchestrateur SEO — NE PAS DUPLIQUER
│   ├── keyword.ts                    # Densité + extraction mots-clés
│   ├── readability.ts                # Flesch-Kincaid FR + LIX
│   ├── structure.ts                  # Hiérarchie des titres
│   ├── eeat.ts                       # Score EEAT
│   ├── tfidf-missing.ts              # Termes TF-IDF manquants
│   ├── stem-fr.ts                    # Stemming français
│   └── plan-scorer.ts                # Évaluation du plan
├── lib/ai/
│   ├── actions.ts                    # Handlers AI
│   ├── providers.ts                  # Setup modèles
│   └── prompts/                      # Prompts par tâche
├── components/
│   ├── editor/                       # Plugins Plate.js
│   ├── workflow/                     # Composants par étape
│   └── seo/                          # UI analyse SEO
└── workers/
    ├── seo.worker.ts                 # Analyse SEO en Web Worker
    └── tfidf.worker.ts               # TF-IDF en Web Worker

server/
├── index.ts                          # Point d'entrée Hono
├── routes/ai.ts                      # /api/ai (stream + object)
├── routes/serp.ts                    # /api/serp
├── routes/reader.ts                  # /api/reader
├── routes/articles.ts                # /api/articles
└── lib/
    ├── ai-model-routing.ts           # Routing Anthropic vs OpenAI
    └── prompts.ts                    # Prompts système serveur

Types :
  src/types/article.ts        # ArticleBrief, ArticleMeta
  src/types/seo.ts            # SeoAnalysisPayload, SeoAnalysisResult
  src/types/workflow.ts       # Étapes workflow
  src/types/knowledge-base.ts # Données recherche
```

## Règles de code

- Pas de fichier créé sans nécessité : préférer éditer l'existant
- Pas de backwards-compat shims, pas de feature flags inutiles
- **Tests Vitest** (`src/**/*.test.ts`) pour toute logique pure (scorer, extracteur, densité, etc.)
- **Web Worker** pour toute analyse SEO potentiellement lourde
- Streaming IA obligatoire via `streamText()` + `@platejs/ai` quand l'output va dans l'éditeur
- Debounce 500 ms pour l'analyse SEO live, 2 s pour la sauvegarde

## Anti-patterns interdits

- Ne PAS dupliquer l'analyzer SEO : une seule source = `src/lib/seo/analyzer.ts`
- Ne PAS ajouter d'état global (zustand/redux) : props descendent depuis `SeoEditor.tsx`
- Ne PAS casser l'API publique des hooks `useSeoAnalysis` / `useAiAssistant`
- Ne PAS toucher au `seo.worker.ts` sans ajouter un test dédié
- Ne PAS créer de nouvelles routes serveur pour une feature purement locale

## Validation obligatoire après chaque tâche

Chaque tâche doit se terminer par ces trois validations :

```bash
cd /home/user/rewolf-seo-editor
npm run lint    # 0 erreur ESLint
npm run test    # tous les tests Vitest passent
npm run build   # tsc -b && vite build sans erreur
```

Si une validation échoue, corrige le problème **avant** de considérer la tâche terminée.

## Format de commit

```
<type>(<scope>): <sujet en français>
```

Types : `feat`, `fix`, `test`, `refactor`, `chore`, `docs`

Exemples :
- `feat(seo): ajouter score Gunning Fog`
- `test(keyword): couvrir stemming des mots composés`
- `fix(structure): corriger détection H3 sans H2 parent`

## Environnement de travail

- Répertoire racine : `/home/user/rewolf-seo-editor`
- Node.js disponible, `npm` disponible
- Articles sauvegardés dans `data/` (git-ignoré)
- Variables d'env dans `.env` (copier depuis `.env.example`)
