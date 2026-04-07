# Cursor Prompt — REWOLF SEO Blog Editor

## Contexte projet

Je veux construire un **éditeur de texte SEO** personnel pour rédiger des articles de blog optimisés pour le référencement. C'est un outil interne pour mon agence REWOLF (branding, Bordeaux). Il sera utilisé principalement pour produire du contenu SEO pour des clients (ex : site d'avocat, ~400 URLs, contenus juridiques longs).

**L'outil tourne en local sur mon Mac.** Pas de déploiement cloud, pas d'auth, pas de multi-utilisateur. Un seul utilisateur, moi.

---

## Stack technique (non négociable)

- **Vite** comme bundler
- **React 19** avec TypeScript strict
- **Tailwind CSS v4**
- **shadcn/ui** pour tous les composants UI
- **Plate** (platejs.org) comme éditeur rich text — il est natif shadcn/ui
- **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic` + `@ai-sdk/openai`) pour tous les appels LLM
- **Node.js backend** minimal (Express ou Hono) pour les appels API côté serveur (clés API)

---

## Architecture fichiers

```
rewolf-seo-editor/
├── src/
│   ├── app/                    # Pages principales
│   │   ├── editor/             # Page éditeur (route principale)
│   │   └── projects/           # Liste des projets/articles
│   ├── components/
│   │   ├── editor/             # Composants Plate (toolbar, menus, plugins)
│   │   ├── seo/                # Panel SEO (score, checklist, suggestions)
│   │   ├── ai/                 # AI sidebar (génération, réécriture)
│   │   └── ui/                 # Composants shadcn/ui
│   ├── lib/
│   │   ├── ai/                 # Config Vercel AI SDK, prompts système
│   │   │   ├── providers.ts    # Config Claude Sonnet 4.5 + GPT-4.1-mini
│   │   │   ├── prompts/        # System prompts SEO par tâche
│   │   │   └── actions.ts      # Server actions (generateOutline, rewrite, etc.)
│   │   ├── seo/                # Moteur d'analyse SEO
│   │   │   ├── analyzer.ts     # Orchestrateur principal
│   │   │   ├── keyword.ts      # Densité, placement, variantes
│   │   │   ├── readability.ts  # Flesch, Gunning Fog, longueur phrases
│   │   │   ├── structure.ts    # Hiérarchie H1-H6, longueur paragraphes
│   │   │   ├── meta.ts         # Title tag, meta description, URL slug
│   │   │   ├── schema.ts       # Génération JSON-LD (BlogPosting, FAQ, HowTo)
│   │   │   └── scorer.ts       # Score global pondéré (0-100)
│   │   ├── storage/            # Persistence locale (fichiers JSON ou SQLite)
│   │   └── utils/
│   ├── hooks/                  # useDebounce, useSeoScore, useAiStream
│   ├── types/                  # Types globaux (Article, SeoScore, etc.)
│   └── workers/
│       └── seo.worker.ts       # Web Worker pour analyse SEO non-bloquante
├── server/
│   ├── index.ts                # Serveur Express/Hono minimal
│   ├── routes/
│   │   ├── ai.ts               # Proxy LLM (streaming)
│   │   ├── serp.ts             # Proxy Serper.dev
│   │   ├── gsc.ts              # Proxy Google Search Console
│   │   └── reader.ts           # Proxy Jina Reader (extraction contenu concurrent)
│   └── middleware/
├── data/                       # Stockage local articles (JSON)
├── .env                        # API keys (ANTHROPIC_API_KEY, OPENAI_API_KEY, SERPER_API_KEY)
└── package.json
```

---

## Dépendances à installer

```bash
# Core
npm install react@19 react-dom@19 typescript vite @vitejs/plugin-react-swc

# Editor
npx shadcn@latest add @plate/editor-basic @plate/editor-ai

# AI SDK
npm install ai @ai-sdk/anthropic @ai-sdk/openai zod

# SEO Analysis
npm install yoastseo text-readability-ts wink-nlp wink-eng-lite-web-model natural

# Schema / Structured Data
npm install schema-dts react-schemaorg

# Backend
npm install hono @hono/node-server googleapis

# Utils
npm install lodash-es nanoid date-fns
```

---

## Fonctionnalités — par ordre de priorité

### Phase 1 : Éditeur + Analyse SEO temps réel

**1.1 — Éditeur Plate**
- Configurer Plate avec les plugins : headings (H1-H6), bold/italic/underline, listes (ol/ul), blockquote, code, liens, images, tableaux, séparateur horizontal
- Toolbar flottante (floating toolbar) avec les actions de formatage
- Slash command menu (`/`) pour insérer headings, listes, images, tableaux
- Drag-and-drop pour réordonner les blocs
- Sérialisation Markdown (import/export) et HTML (export pour publication)
- Compteur de mots en temps réel dans la barre de statut
- Sauvegarde automatique en local (debounce 2s, fichier JSON dans `./data/`)

**1.2 — Panel SEO (sidebar droite, toujours visible)**

Le panel SEO affiche un **score global de 0 à 100** mis à jour en temps réel (debounce 500ms, calcul dans un Web Worker). Le score est la moyenne pondérée de 6 dimensions :

| Dimension | Poids | Critères |
|---|---|---|
| On-page SEO | 25% | Keyword dans title, H1, premier paragraphe, URL slug, densité 0.5-0.8%, keyword dans au moins 1 H2 |
| Lisibilité | 20% | Flesch-Kincaid grade 7-9, phrases < 25 mots (80%+), paragraphes 2-4 phrases, mots de transition > 30% |
| Structure | 20% | Un seul H1, pas de niveaux sautés, heading tous les 200-300 mots, 2-6 liens internes, 2-5 liens externes |
| Contenu | 15% | Longueur vs moyenne concurrents, couverture des sous-thèmes clés, réponse directe en 40-60 mots |
| E-E-A-T | 10% | Bio auteur présente, citations/sources, marqueurs d'expérience personnelle, données originales |
| Meta & Schema | 10% | Title < 60 chars (< 580px), meta desc 140-160 chars, alt text images, JSON-LD BlogPosting valide |

Chaque critère affiche un indicateur visuel : ✅ vert, ⚠️ orange, ❌ rouge. Afficher le détail textuel de chaque critère sous forme de checklist repliable par dimension.

**1.3 — Champs meta (au-dessus de l'éditeur)**
- Input **mot-clé principal** (focus keyphrase) — tout le scoring SEO est calculé par rapport à ce mot-clé
- Input **title tag** avec compteur de caractères + preview pixel-width (seuil 580px, utiliser Canvas API pour mesurer avec la font Arial 20px comme Google)
- Textarea **meta description** avec compteur (140-160 chars idéal, max 920px)
- Input **URL slug** (auto-généré depuis le title, éditable)
- Preview SERP en temps réel (simuler un résultat Google avec title bleu, URL verte, description grise)

### Phase 2 : Intégration IA

**2.1 — Routing des modèles**
- Utiliser le Vercel AI SDK avec deux providers configurés :
  - `claude-sonnet-4-5-20250514` pour : rédaction long-form, réécriture SEO, amélioration de paragraphes
  - `gpt-4.1-mini` pour : génération d'outlines, variantes de meta title/description, suggestions de mots-clés, génération JSON-LD, scoring rapide
- Toutes les réponses en **streaming** (`streamText()`) sauf la génération d'objets structurés (`generateObject()` avec schéma Zod)

**2.2 — Actions IA disponibles dans l'éditeur**
- **Générer un outline** : à partir du mot-clé + intention de recherche, générer une structure H2/H3 avec points clés par section. Le prompt doit analyser l'intention (informationnelle, transactionnelle, navigationnelle) et adapter la structure.
- **Rédiger une section** : sélectionner un H2, cliquer "Rédiger", l'IA génère le contenu de cette section en streaming directement dans l'éditeur. Le contenu est inséré après le heading sélectionné.
- **Réécrire pour le SEO** : sélectionner du texte, l'IA le reformule pour intégrer naturellement le mot-clé cible sans keyword stuffing, en améliorant la lisibilité.
- **Générer des variantes meta** : produire 3 variantes de title tag et 3 de meta description, chacune scorée sur pertinence keyword + longueur + CTA.
- **Générer le JSON-LD** : à partir des champs meta + contenu, générer automatiquement le schema BlogPosting (+ FAQPage si l'article contient des questions, + HowTo si étapes détectées). Utiliser `schema-dts` pour le typage.

**2.3 — AI Menu dans l'éditeur (plugin Plate AI)**
- Utiliser `@platejs/ai` pour le menu contextuel IA
- Actions au clic droit ou via raccourci sur sélection : Réécrire, Simplifier, Développer, Traduire EN→FR / FR→EN
- Workflow accept/reject/retry natif de Plate AI

### Phase 3 : Analyse concurrentielle

**3.1 — Analyse SERP**
- Input : mot-clé cible
- Le backend appelle Serper.dev (`POST https://google.serper.dev/search`) pour récupérer les 10 premiers résultats organiques + People Also Ask
- Pour chaque URL du top 10, extraire le contenu via Jina Reader (`GET https://r.jina.ai/{url}`)
- Analyser localement avec `wink-nlp` : structure headings, longueur, densité keyword, entités nommées
- Afficher un tableau comparatif : URL | Mots | Headings | Keyword density | Score lisibilité
- Calculer la **moyenne des concurrents** pour chaque métrique et l'utiliser comme benchmark dans le scoring

**3.2 — Suggestions de mots-clés sémantiques**
- Extraire les termes TF-IDF des pages concurrentes avec `natural` (TfIdf)
- Afficher les termes fréquents chez les concurrents mais absents de l'article en cours → "Termes manquants"
- Permettre d'insérer ces termes en un clic (l'IA génère une phrase naturelle les intégrant)

---

## System prompts SEO à intégrer

### Prompt système pour la rédaction (Claude Sonnet 4.5)

```
Tu es un rédacteur SEO expert travaillant pour une agence de branding française. Tu rédiges en français.

RÈGLES DE RÉDACTION :
- Écris pour des humains d'abord, les moteurs de recherche ensuite
- Utilise un ton professionnel mais accessible, jamais robotique
- Intègre le mot-clé principal naturellement (densité cible : 0.5-0.8%)
- Varie les formulations : utilise des synonymes, des variantes longue traîne
- Chaque paragraphe fait 2-4 phrases maximum
- Chaque phrase fait moins de 25 mots (80% du temps minimum)
- Utilise des mots de transition (cependant, en effet, par conséquent, ainsi, de plus...)
- Commence chaque section par une phrase d'accroche, termine par une transition
- N'utilise JAMAIS les formulations : "dans le monde de", "il est important de noter", "en conclusion", "n'hésitez pas à"
- Ne génère JAMAIS de contenu générique ou de remplissage
- Privilégie les données concrètes, les exemples, les cas pratiques

E-E-A-T :
- Intègre des marqueurs d'expertise : "en pratique", "d'après notre expérience", "les tribunaux considèrent que"
- Cite des sources quand c'est pertinent (lois, jurisprudence, études)
- Suggère où l'auteur devrait ajouter sa propre expérience avec [AJOUTER EXPÉRIENCE PERSONNELLE]

STRUCTURE :
- Un seul H1 (le titre de l'article)
- H2 pour les sections principales, H3 pour les sous-sections
- Ne saute jamais de niveau (pas de H1 → H3)
- Un heading tous les 200-300 mots
- Le mot-clé doit apparaître dans le H1 et au moins un H2
- Inclure une réponse directe de 40-60 mots dans les 100 premiers mots (pour featured snippet)

FORMAT DE SORTIE :
- Markdown uniquement
- Pas de commentaires meta, pas de notes entre parenthèses
- Pas de "Voici votre article" ou d'introduction meta
- Commence directement par le contenu
```

### Prompt système pour les meta tags (GPT-4.1-mini)

```
Tu génères des meta tags SEO optimisés en français.

TITLE TAG :
- 50-60 caractères maximum (< 580 pixels en Arial 20px)
- Le mot-clé principal doit apparaître dans les 40 premiers caractères
- Inclure un élément différenciant (année, chiffre, adjectif fort)
- Éviter les mots vides en début de title
- Formats efficaces : "[Keyword] : [Bénéfice]", "[Chiffre] [Keyword] pour [Résultat]", "[Keyword] — Guide [Année]"

META DESCRIPTION :
- 140-160 caractères
- Inclure le mot-clé principal une fois, naturellement
- Terminer par un call-to-action implicite
- Créer de la curiosité ou promettre une valeur concrète
- Ne pas répéter le title tag

Génère exactement 3 variantes de chaque, classées de la plus conservatrice à la plus créative.
Retourne un objet JSON : { titles: string[], descriptions: string[] }
```

---

## Détails d'implémentation critiques

### Web Worker pour l'analyse SEO
L'analyse SEO doit tourner dans un **Web Worker** (`src/workers/seo.worker.ts`) pour ne pas bloquer l'UI. Le worker reçoit le contenu HTML de l'éditeur + le mot-clé cible, exécute `yoastseo` + les analyses custom, et renvoie le score + la checklist détaillée. Debounce à 500ms côté composant React avant d'envoyer au worker.

### Streaming IA dans Plate
Utiliser `streamText()` du Vercel AI SDK côté serveur, et le hook `useChat()` ou un custom hook côté client. Le texte streamé doit être inséré dans l'éditeur Plate en temps réel via l'API `editor.insertText()` ou le plugin `@platejs/ai` qui gère nativement le streaming avec un indicateur de chargement et les boutons Accept/Discard/Retry.

### Stockage local
Chaque article est un fichier JSON dans `./data/articles/` :
```json
{
  "id": "nanoid",
  "title": "Mon article",
  "slug": "mon-article",
  "focusKeyword": "mot-clé principal",
  "metaTitle": "...",
  "metaDescription": "...",
  "content": {}, // Plate JSON (format Slate)
  "seoScore": 78,
  "createdAt": "2026-04-06T...",
  "updatedAt": "2026-04-06T...",
  "competitorData": {} // Cache analyse SERP
}
```

### Variables d'environnement (.env)
```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
SERPER_API_KEY=...
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
```

---

## Ce qu'il ne faut PAS faire

- **Pas de base de données** — des fichiers JSON suffisent pour un usage solo
- **Pas d'authentification** — c'est local
- **Pas de déploiement cloud** — tout tourne sur localhost
- **Pas de tests unitaires dans la Phase 1** — construire d'abord, tester après
- **Pas de Server Components / SSR** — c'est une SPA Vite classique
- **Pas de LangChain** — le Vercel AI SDK couvre tout avec moins de complexité
- **Pas de collab temps réel / CRDT** — un seul utilisateur
- **Pas de dark mode toggle** — choisir un thème et le garder

---

## Ordre de construction

1. **Setup Vite + React 19 + Tailwind v4 + shadcn/ui** — scaffold de base
2. **Intégrer Plate** avec plugins de base (headings, formatage, slash commands)
3. **Champs meta** au-dessus de l'éditeur (keyword, title, description, slug, preview SERP)
4. **Moteur SEO dans Web Worker** — `yoastseo` + analyse custom → score 0-100
5. **Panel SEO sidebar** — affichage du score + checklist par dimension
6. **Backend Hono** — routes proxy pour les APIs (AI, Serper, Jina)
7. **Actions IA** — outline, rédaction section, réécriture, meta variants
8. **Plate AI menu** — réécriture contextuelle dans l'éditeur
9. **Analyse concurrentielle** — SERP + extraction + comparaison
10. **Génération JSON-LD** — schema BlogPosting/FAQ/HowTo automatique

Commence par l'étape 1. Attends ma validation avant de passer à l'étape suivante.
