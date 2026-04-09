# Cartographie actuelle du monorepo REWOLF

Objectif: visualiser la structure en place pour valider l'architecture monorepo (`@shared/core` + backend Hono + frontend React).

> Exclusions appliquées: `node_modules`, `.git`, `dist`, `build`, et contenu de `data/`.

## Vue d'ensemble (zones clés)

```text
rewolf-seo-editor/
├── shared/                    # Package transversal @shared/core (source de verite contrats/types/utils/prompts)
├── server/                    # Backend Hono (routes API, services metier, repositories)
│   └── modules/               # Modules metier organises en pattern route/controller/service/repository
├── src/                       # Frontend React/Vite
│   ├── components/            # UI et composants par domaine (workflow, editor, ui atomique)
│   └── hooks/                 # Hooks custom pour logique metier frontend
├── scripts/                   # Outils CLI/agents de dev
└── docs/                      # Documentation projet
```

## 1) `@shared/core` - detail de `shared/`

```text
shared/                                    # Noyau partage front/back
├── ai/                                    # Routage modele IA + catalogue de prompts
│   ├── prompts/                           # Prompts centralises (pas de prompt hardcode ailleurs)
│   │   ├── index.ts
│   │   ├── jsonld.prompt.ts
│   │   ├── meta.prompt.ts
│   │   ├── workflow.prompt.ts
│   │   └── writing.prompt.ts
│   ├── index.ts
│   └── model-routing.ts
├── contracts/                             # Contrats Zod/API partages entre front et server
│   ├── ai.contract.ts
│   ├── article.contract.ts
│   ├── index.ts
│   └── workflow.contract.ts
├── types/                                 # Types transverses
│   └── index.ts
├── utils/                                 # Fonctions utilitaires communes + tests unitaires
│   ├── date.ts
│   ├── index.ts
│   ├── seo.test.ts
│   ├── seo.ts
│   ├── slug.test.ts
│   ├── slug.ts
│   └── text.ts
├── index.ts                               # Barrel principal du package shared
└── package.json                           # Packaging/exports de @shared/core
```

## 2) Backend - detail de `server/modules/`

```text
server/modules/                            # Decoupage metier backend
├── agent/                                 # Orchestration des sessions/taches agent
│   ├── agent.route.ts                     # Definition des endpoints HTTP
│   ├── agent.controller.ts                # Adaptation requete/reponse
│   ├── agent.service.ts                   # Logique metier et orchestration
│   └── agent.repository.ts                # Acces IO/externe
├── ai/                                    # Operations IA serveur
│   ├── ai.route.ts
│   ├── ai.controller.ts
│   ├── ai.service.ts
│   └── ai.repository.ts
├── articles/                              # Gestion cycle de vie article
│   ├── articles.route.ts
│   ├── articles.controller.ts
│   ├── articles.service.ts
│   ├── articles.repository.ts
│   └── articles.mapper.ts                 # Mapping/normalisation DTO <-> modele
├── reader/                                # Ingestion/lecture de sources
│   ├── reader.route.ts
│   ├── reader.controller.ts
│   ├── reader.service.ts
│   └── reader.repository.ts
└── serp/                                  # Recherche SERP et enrichment SEO
    ├── serp.route.ts
    ├── serp.controller.ts
    ├── serp.service.ts
    └── serp.repository.ts
```

## 3) Frontend - detail `src/components/` et `src/hooks/`

```text
src/components/                            # Composants React par domaine fonctionnel
├── ai/                                    # Reserved/placeholder pour composants IA
│   └── .gitkeep
├── article/                               # Dialogs et actions autour du document article
│   ├── history-dialog.tsx
│   ├── html-preview-dialog.tsx
│   └── load-article-dialog.tsx
├── common/                                # Composants transverses UI (ex: gestion erreurs)
│   └── error-boundary.tsx
├── editor/                                # Assemblage editeur riche + plugins
│   ├── plugins/                           # Kits/plugins Plate (marks, blocks, media, table, IA, etc.)
│   │   ├── ai-kit.tsx
│   │   ├── basic-blocks-base-kit.tsx
│   │   ├── basic-blocks-kit.tsx
│   │   ├── basic-marks-base-kit.tsx
│   │   ├── basic-marks-kit.tsx
│   │   ├── basic-nodes-kit.tsx
│   │   ├── block-selection-kit.tsx
│   │   ├── code-block-base-kit.tsx
│   │   ├── code-block-kit.tsx
│   │   ├── cursor-overlay-kit.tsx
│   │   ├── dnd-kit.tsx
│   │   ├── indent-base-kit.tsx
│   │   ├── indent-kit.tsx
│   │   ├── keyword-highlight-kit.test.ts
│   │   ├── keyword-highlight-kit.tsx
│   │   ├── keyword-highlight-leaves.tsx
│   │   ├── link-base-kit.tsx
│   │   ├── link-kit.tsx
│   │   ├── list-base-kit.tsx
│   │   ├── list-kit.tsx
│   │   ├── markdown-kit.tsx
│   │   ├── media-base-kit.tsx
│   │   ├── media-kit.tsx
│   │   ├── slash-kit.tsx
│   │   ├── suggestion-kit.tsx
│   │   ├── table-base-kit.tsx
│   │   └── table-kit.tsx
│   ├── .gitkeep
│   ├── editor-floating-toolbar.tsx
│   ├── editor-heading-toolbar.tsx
│   ├── editor-kit.tsx
│   └── transforms.ts
├── seo/                                   # Composants metier SEO (meta, apercus SERP, panel)
│   ├── meta-fields.tsx
│   ├── seo-panel.tsx
│   └── serp-preview.tsx
├── ui/                                    # Bibliotheque UI atomique + noeuds d'editeur
│   ├── block-draggable/                   # Sous-module de drag & drop de blocs
│   │   ├── BlockDragHandle.tsx
│   │   └── useBlockDraggable.ts
│   ├── color-picker/                      # Sous-module dedie au selecteur de couleurs
│   │   ├── ColorPickerStatic.tsx
│   │   ├── constants.ts
│   │   └── useColorPicker.ts
│   ├── table-node/                        # Sous-module dedie aux tables (cellules, toolbar, hook)
│   │   ├── TableNodeCell.tsx
│   │   ├── TableNodeElement.tsx
│   │   ├── TableNodeFloatingToolbar.tsx
│   │   ├── TableNodeHeader.tsx
│   │   └── useTableNode.tsx
│   ├── ai-menu.tsx
│   ├── ai-node.tsx
│   ├── alert-dialog.tsx
│   ├── block-draggable.tsx
│   ├── block-list-static.tsx
│   ├── block-list.tsx
│   ├── block-selection.tsx
│   ├── blockquote-node-static.tsx
│   ├── blockquote-node.tsx
│   ├── button.tsx
│   ├── caption.tsx
│   ├── checkbox.tsx
│   ├── code-block-node-static.tsx
│   ├── code-block-node.tsx
│   ├── code-node-static.tsx
│   ├── code-node.tsx
│   ├── command.tsx
│   ├── cursor-overlay.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── editor-static.tsx
│   ├── editor.tsx
│   ├── floating-toolbar.tsx
│   ├── font-color-toolbar-button.tsx
│   ├── heading-node-static.tsx
│   ├── heading-node.tsx
│   ├── highlight-node-static.tsx
│   ├── highlight-node.tsx
│   ├── hr-node-static.tsx
│   ├── hr-node.tsx
│   ├── indent-toolbar-button.tsx
│   ├── inline-combobox.tsx
│   ├── input-group.tsx
│   ├── input.tsx
│   ├── kbd-node-static.tsx
│   ├── kbd-node.tsx
│   ├── link-node-static.tsx
│   ├── link-node.tsx
│   ├── link-toolbar-button.tsx
│   ├── link-toolbar.tsx
│   ├── list-toolbar-button.tsx
│   ├── mark-toolbar-button.tsx
│   ├── media-audio-node-static.tsx
│   ├── media-audio-node.tsx
│   ├── media-embed-node.tsx
│   ├── media-file-node-static.tsx
│   ├── media-file-node.tsx
│   ├── media-image-node-static.tsx
│   ├── media-image-node.tsx
│   ├── media-placeholder-node.tsx
│   ├── media-preview-dialog.tsx
│   ├── media-toolbar-button.tsx
│   ├── media-toolbar.tsx
│   ├── media-upload-toast.tsx
│   ├── media-video-node-static.tsx
│   ├── media-video-node.tsx
│   ├── paragraph-node-static.tsx
│   ├── paragraph-node.tsx
│   ├── popover.tsx
│   ├── resize-handle.tsx
│   ├── separator.tsx
│   ├── slash-node.tsx
│   ├── table-icons.tsx
│   ├── table-node-static.tsx
│   ├── table-node.tsx
│   ├── table-toolbar-button.tsx
│   ├── tabs.tsx
│   ├── textarea.tsx
│   ├── toolbar.tsx
│   └── tooltip.tsx
└── workflow/                              # UI du workflow Data -> Brief -> Plan -> Redaction -> Finaliser
    ├── enrich/
    │   ├── enrich-links-section.tsx
    │   ├── enrich-meta-jsonld-section.tsx
    │   ├── enrich-nlp-section.tsx
    │   ├── internal-links-import.tsx
    │   ├── internal-links-suggest.tsx
    │   └── nlp-missing-terms.tsx
    ├── finalize/
    │   └── finalize-seo-tab.tsx
    ├── outline/
    │   ├── outline-generator.tsx
    │   └── outline-preview.tsx
    ├── research/
    │   ├── serp-research.tsx
    │   ├── source-import-zone.tsx
    │   └── source-list.tsx
    ├── review/
    │   └── export-actions.tsx
    ├── steps/
    │   ├── missing-terms-widget.tsx
    │   ├── step-brief.tsx
    │   ├── step-finalize.tsx
    │   ├── step-outline.tsx
    │   ├── step-research.tsx
    │   ├── step-writing.tsx
    │   └── writing-seo-panel.tsx
    ├── workflow-sidebar.tsx
    └── workflow-stepper.tsx
```

```text
src/hooks/                                 # Hooks custom (logique metier frontend)
├── .gitkeep
├── use-plate-chat.ts                      # Logique conversation/assistant dans l'editeur
├── use-upload-file.ts                     # Upload fichiers media
├── use-writing-step.ts                    # Etat/comportement de l'etape Redaction
├── useAiAssistant.ts                      # Interactions IA cote frontend
├── useSeoAnalysis.ts                      # Analyse SEO cote UI
└── useTfidfMissingTerms.ts                # Detection des termes manquants (TF-IDF)
```

## Lecture architecture (validation rapide)

- `shared/` est bien la couche de contrat et logique transversale.
- `server/modules/*` suit globalement le pattern cible `route -> controller -> service -> repository`.
- `src/components/ui/` commence un decoupage par sous-domaines complexes (`table-node`, `color-picker`, `block-draggable`) en plus des composants atomiques.
- `src/hooks/` centralise une partie de la logique metier frontend hors composants de vue.
