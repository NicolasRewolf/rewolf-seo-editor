# REWOLF SEO Editor

Éditeur d’**articles SEO** avec workflow **Data → Plan → Rédaction → Finaliser**, éditeur [Plate](https://platejs.org/), base de connaissances (sources SERP / URL / texte / fichiers), analyse SEO en worker et API locale (SERP, reader, LLM).

**Dépôt :** [github.com/NicolasRewolf/rewolf-seo-editor](https://github.com/NicolasRewolf/rewolf-seo-editor)

## Prérequis

- Node.js récent, `npm install`
- Fichier `.env` (voir `.env.example`) : clés Serper, Anthropic/OpenAI selon les fonctions utilisées

## Commandes

```bash
npm install
npm run dev:all
```

- Front : Vite (port par défaut du projet)
- API : `server/` (Hono), proxy SERP / reader / IA

Les réglages meta (titre, description, slug) sont prévus surtout à l’étape **Finaliser** ; le workspace **Data** sert à constituer le cluster de sources.

## Dossiers utiles

| Chemin | Rôle |
|--------|------|
| `src/app/editor/data/` | **Code** du workspace « étape Data » (UI cluster), versionné |
| `/data/` à la racine | **Exports** articles JSON via « Enregistrer ./data » — **ignoré par Git** (`/data/` dans `.gitignore`) |

## Projet séparé (dashboard analytique)

Le tableau de bord **GSC + DataForSEO** est un **autre dépôt** : [NicolasRewolf/dashboardseo](https://github.com/NicolasRewolf/dashboardseo). Voir [`docs/ECOSYSTEM.md`](docs/ECOSYSTEM.md).
