# Écosystème REWOLF — dépôts et rôles

Ce fichier évite de mélanger les projets : **chaque dépôt GitHub = un dossier = un usage**.

| Dépôt GitHub | Dossier conseillé (exemple) | Rôle |
|--------------|-----------------------------|------|
| [NicolasRewolf/rewolf-seo-editor](https://github.com/NicolasRewolf/rewolf-seo-editor) | `~/rewolf-seo-editor` | **Éditeur d’articles SEO** : workflow Data → Plan → Rédaction → Finaliser, Plate, base de connaissances, API locale (SERP, reader, LLM). |
| [NicolasRewolf/dashboardseo](https://github.com/NicolasRewolf/dashboardseo) | `~/Desktop/dashboardseo` ou `~/Projects/dashboardseo` | **Dashboard analytique** : Google Search Console + DataForSEO, graphiques BI (« Search Console 2.0 »). Pas d’édition d’article. |

## Confusions fréquentes (à ne pas refaire)

- **`rewolf-starter`** : nom d’un template générique ; le dépôt **dashboardseo** a longtemps gardé ce nom dans `package.json` par erreur — le package npm s’appelle désormais **`dashboardseo`**.
- **Dossiers nommés `data/`** :
  - **`/data/` à la racine du repo éditeur** (exports JSON d’articles) : **non versionné** (`.gitignore` : `/data/`).
  - **`src/app/editor/data/`** dans l’éditeur : **code source** du workspace « étape Data » — **versionné** (ce n’est pas le même dossier que les exports).

## Git vs « dépôt de dossiers »

GitHub ne crée pas de dossiers tout seul : tu vois sur GitHub **exactement ce qui est commité** dans le dépôt. Si un dossier n’apparaît pas, il est souvent dans `.gitignore` ou pas encore commité.
