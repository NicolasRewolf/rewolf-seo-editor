# Cursor Prompt — Refonte UX : pipeline rédactionnel en 5 étapes

## Contexte

L'éditeur SEO REWOLF fonctionne actuellement en mode "dashboard" : tous les panneaux (SEO score, SERP lookup, Reader, NLP, AI assistant) sont empilés dans une sidebar droite, visibles en permanence. C'est inutilisable en pratique.

Le vrai workflow rédactionnel est **séquentiel** (pipeline) :

1. Constituer une base de connaissances (recherche, import de sources)
2. Générer un plan H2/H3 à partir de ces données
3. Rédiger section par section en puisant dans la base
4. Enrichir (liens internes, termes manquants, meta, JSON-LD)
5. Vérifier le score SEO et exporter

**Objectif** : transformer la page `SeoEditor.tsx` pour que la sidebar droite affiche **une seule étape à la fois**, avec un stepper de navigation entre les étapes. L'éditeur central (Plate) reste toujours visible à gauche. Les MetaFields restent au-dessus de l'éditeur.

---

## Ce qui ne change PAS (ne pas casser)

### Backend (server/)

Tous les fichiers serveur restent identiques. Ne pas toucher :

- `server/index.ts`
- `server/routes/ai.ts` (endpoints `/api/ai/stream`, `/api/ai/object`, `/api/ai/command`)
- `server/routes/serp.ts`
- `server/routes/reader.ts`
- `server/routes/articles.ts`
- `server/routes/gsc.ts`
- `server/lib/prompts.ts`
- `server/lib/ai-model-routing.ts`
- `server/lib/jina.ts`

### Libs réutilisées telles quelles

- `src/lib/api/stream-ai.ts` — streamAiChat()
- `src/lib/api/ai-object.ts` — aiGenerateObject()
- `src/lib/api/serp-search.ts` — searchSerp()
- `src/lib/api/serp-competitor.ts` — fetchCompetitorCorpus()
- `src/lib/api/reader-fetch.ts` — fetchReaderContent()
- `src/lib/api/articles-disk.ts`
- `src/lib/api/base-url.ts`
- `src/lib/seo/tfidf-missing.ts` — missingTermsVsCompetitors()
- `src/lib/seo/analyzer.ts` + tous les modules SEO (keyword, readability, structure, content, eeat, meta-dimension, canvas-measure, extract-structure)
- `src/lib/storage/local-article.ts`
- `src/lib/html/export-article-html.ts`
- `src/hooks/useSeoAnalysis.ts`
- `src/hooks/useAiAssistant.ts`
- `src/workers/seo.worker.ts`
- `src/types/seo.ts`, `src/types/article.ts`, `src/types/jsonld-blog.ts`

### Composants UI réutilisés

- Tous les composants `src/components/ui/`* (shadcn)
- Tous les composants `src/components/editor/*` (Plate plugins, toolbar, editor-kit)
- `src/components/seo/serp-preview.tsx` — preview SERP
- `src/components/seo/meta-fields.tsx` — champs meta au-dessus de l'éditeur
- `src/components/article/html-preview-dialog.tsx`
- `src/components/article/load-article-dialog.tsx`

---

## Nouvelles structures de données

### 1. Type KnowledgeBase

Créer `src/types/knowledge-base.ts` :

```ts
export type KbSourceType = 'text' | 'url' | 'file' | 'serp';

export type KbSource = {
  id: string;           // crypto.randomUUID()
  type: KbSourceType;
  label: string;        // nom affiché (nom de fichier, URL tronquée, "Notes NotebookLM"…)
  content: string;      // texte brut extrait
  wordCount: number;
  addedAt: string;      // ISO 8601
  url?: string;         // si type url ou serp
};

/** Base de connaissances attachée à un article. */
export type KnowledgeBase = {
  sources: KbSource[];
};
```

### 2. Type InternalLinksMap

Créer `src/types/internal-links.ts` :

```ts
export type InternalLink = {
  url: string;
  anchor: string;       // texte d'ancre suggéré
  slug?: string;        // slug de l'article cible
  title?: string;       // titre de la page cible
};

export type InternalLinksMap = {
  links: InternalLink[];
  importedAt: string;   // ISO 8601
};
```

### 3. Type WorkflowStep

Créer `src/types/workflow.ts` :

```ts
export type WorkflowStep = 'research' | 'outline' | 'writing' | 'enrich' | 'review';

export type StepConfig = {
  id: WorkflowStep;
  label: string;
  shortLabel: string;
  description: string;
};

export const WORKFLOW_STEPS: StepConfig[] = [
  {
    id: 'research',
    label: '1. Recherche & Sources',
    shortLabel: 'Recherche',
    description: 'Constituer la base de connaissances',
  },
  {
    id: 'outline',
    label: '2. Plan',
    shortLabel: 'Plan',
    description: 'Générer et valider la structure H2/H3',
  },
  {
    id: 'writing',
    label: '3. Rédaction',
    shortLabel: 'Rédaction',
    description: 'Rédiger section par section avec l\'IA',
  },
  {
    id: 'enrich',
    label: '4. Enrichissement',
    shortLabel: 'Enrichir',
    description: 'Liens internes, termes manquants, meta, JSON-LD',
  },
  {
    id: 'review',
    label: '5. Vérification',
    shortLabel: 'Vérif.',
    description: 'Score SEO final et export',
  },
];
```

### 4. Étendre ArticleMeta

Dans `src/types/article.ts`, ajouter un champ optionnel à `StoredArticleEnvelope` :

```ts
export type StoredArticleEnvelope = {
  // ... champs existants ...
  knowledgeBase?: KnowledgeBase;  // NOUVEAU
  internalLinks?: InternalLinksMap; // NOUVEAU
};
```

Le localStorage (StoredArticle dans `src/lib/storage/local-article.ts`) doit aussi stocker `knowledgeBase` et `internalLinks` en optionnel.

---

## Nouveaux composants — Sidebar pipeline

### Structure de fichiers à créer

```
src/components/workflow/
├── workflow-stepper.tsx          # Navigation horizontale entre les 5 étapes
├── workflow-sidebar.tsx          # Container qui affiche le bon panel selon l'étape
├── steps/
│   ├── step-research.tsx         # Étape 1
│   ├── step-outline.tsx          # Étape 2
│   ├── step-writing.tsx          # Étape 3
│   ├── step-enrich.tsx           # Étape 4
│   └── step-review.tsx           # Étape 5
├── research/
│   ├── source-import-zone.tsx    # Zone de drop/paste/upload pour ajouter des sources
│   ├── source-list.tsx           # Liste des sources ajoutées avec preview et suppression
│   └── serp-research.tsx         # Wrapper autour de SerpLookup + Reader pour injecter dans la KB
├── outline/
│   ├── outline-generator.tsx     # Bouton IA pour générer un plan à partir de la KB
│   └── outline-preview.tsx       # Preview du plan avec édition inline avant insertion
├── enrich/
│   ├── internal-links-import.tsx # Import du fichier .json de liens internes
│   ├── internal-links-suggest.tsx # L'IA scanne le texte et propose des insertions
│   └── nlp-missing-terms.tsx     # Réutilise la logique de Phase3SerpNlpPanel
└── review/
    └── export-actions.tsx        # Boutons export regroupés (actuellement dans le header)
```

---

## Comportement de chaque étape

### Étape 1 — Recherche (`step-research.tsx`)

**Layout** : la sidebar affiche deux sections empilées dans un scroll.

**Section A — Import de sources**

Composant `source-import-zone.tsx` :

- Zone de texte extensible pour **coller du contenu brut** (typiquement un export NotebookLM, des notes, du copier-coller web). Bouton "Ajouter" qui crée un `KbSource` de type `text`.
- Bouton **"Importer fichier(s)"** : accepte `.txt`, `.md`, `.json`. Lecture côté client avec `FileReader`. Chaque fichier crée un `KbSource` de type `file`.
- Input URL + bouton **"Extraire"** : appelle `fetchReaderContent()` (déjà codé dans `src/lib/api/reader-fetch.ts`), crée un `KbSource` de type `url`.

Composant `source-list.tsx` :

- Affiche chaque source : label, type (badge), word count, date d'ajout.
- Bouton supprimer (icône X).
- Bouton "Voir" pour expand/collapse le contenu brut (tronqué à 500 chars par défaut).
- En bas : total des sources + total word count de la KB.

**Section B — Recherche SERP**

Composant `serp-research.tsx` :

- Reprend la logique de `SerpLookup` (composant existant `src/components/seo/serp-lookup.tsx`) : input requête + résultats organiques.
- **Différence** : au lieu d'un bouton "Reader" qui envoie vers un autre panneau, chaque résultat SERP a un bouton **"Ajouter à la base"** qui :
  1. Appelle `fetchReaderContent(url)` (déjà codé)
  2. Crée un `KbSource` de type `serp` avec l'URL et le texte extrait
  3. L'ajoute au state `knowledgeBase.sources`
- Bouton **"Ajouter le top 5"** qui fait l'extraction en batch (parallèle via `Promise.allSettled`).

**State** : `knowledgeBase: KnowledgeBase` est un state remonté dans `SeoEditor.tsx` et passé en props aux étapes qui en ont besoin.

### Étape 2 — Plan (`step-outline.tsx`)

**Layout** : une section unique dans la sidebar.

Composant `outline-generator.tsx` :

- Affiche un résumé de la KB (nombre de sources, mots totaux).
- Bouton **"Générer le plan"** qui appelle `streamAiChat()` (hook `useAiAssistant`) avec un prompt spécifique :
  - System prompt : utilise `SEO_WRITING_PROMPT` du serveur (via `/api/ai/stream` avec `taskGroup: 'quality'`)
  - User prompt : contient le mot-clé principal (`meta.focusKeyword`), l'intention de recherche, et **un résumé/extrait de la KB** (tronqué à ~8000 chars, concaténation des sources les plus pertinentes).
  - Instruction explicite : "Propose un plan d'article (H2 et H3) sous forme de liste Markdown numérotée. Pour chaque section, indique 2-3 points clés à couvrir. Base-toi sur les sources fournies."
- Le résultat s'affiche en streaming dans `outline-preview.tsx`.

Composant `outline-preview.tsx` :

- Affiche le plan généré en Markdown renderé (ou en `<pre>` avec highlighting).
- Bouton **"Régénérer"** pour relancer.
- Bouton **"Insérer dans l'éditeur"** qui convertit le plan Markdown en nodes Plate (headings H2/H3 + paragraphes de points clés) via `editor.getApi(MarkdownPlugin).markdown.deserialize()` puis `editor.tf.setValue()`.
- Important : l'insertion **remplace** le contenu actuel de l'éditeur (avec confirmation si le contenu n'est pas vide).

### Étape 3 — Rédaction (`step-writing.tsx`)

**Layout** : sidebar avec la liste des sections détectées + assistant IA contextuel.

**Détection des sections** : lire les headings H2 depuis `docValue` (déjà extrait dans `buildSeoPayload` → `headings`). Afficher la liste des H2 en cours comme une checklist.

**Pour chaque H2** :

- Afficher le titre H2.
- Bouton **"Rédiger cette section"** qui appelle `streamAiChat()` avec :
  - Le mot-clé principal
  - Le titre H2 cible
  - Les titres H3 sous ce H2 (s'ils existent)
  - Un extrait de la KB pertinent (les sources qui mentionnent des termes proches du H2)
  - Le contenu des sections déjà rédigées (pour la cohérence)
  - Instruction : "Rédige le contenu de cette section en puisant dans les sources fournies. Markdown. 2-4 paragraphes par sous-section."
- Le résultat s'affiche dans un `<pre>` dans la sidebar.
- Bouton **"Copier"** pour que l'utilisateur colle manuellement dans l'éditeur.
- Bouton **"Insérer après le H2"** qui insère le contenu Markdown sous le heading correspondant dans l'éditeur.

**Zone libre** : en bas de la sidebar, garder le Textarea + Envoyer de l'assistant IA actuel (consigne libre avec contexte KB injecté automatiquement). Garder aussi les boutons "Réécrire sélection", "Simplifier", "Développer", "Traduire" (logique identique à `ai-assistant-panel.tsx`).

**Contexte IA enrichi** : dans TOUTES les requêtes IA de cette étape, le contexte doit inclure un bloc `--- Base de connaissances (extraits) ---` avec les premiers ~6000 caractères de la KB (concaténation des `source.content` tronqués). Le contexte existant (meta + markdown de l'article) reste aussi inclus.

### Étape 4 — Enrichissement (`step-enrich.tsx`)

**Layout** : 4 sections empilées dans un scroll.

**Section A — Liens internes** (`internal-links-import.tsx` + `internal-links-suggest.tsx`)

Import :

- Bouton **"Importer le fichier .json de liens internes"**. Accepte un fichier `.json` au format `InternalLink[]` ou `{ links: InternalLink[] }`.
- Après import, affiche la liste des liens disponibles (URL + anchor + titre).
- Stocke dans le state `internalLinks: InternalLinksMap`.

Suggestions :

- Bouton **"Suggérer des liens"** qui appelle `streamAiChat()` avec :
  - Le contenu Markdown de l'article
  - La liste complète des liens internes disponibles (JSON)
  - Instruction : "Analyse le texte et propose des liens internes à insérer. Pour chaque suggestion, indique : le passage du texte concerné, le texte d'ancre recommandé, et l'URL cible. Format : liste Markdown. Maximum 8 suggestions. Ne suggère que des liens naturels et pertinents."
- Résultat affiché en streaming. L'utilisateur copie manuellement les suggestions pertinentes dans l'éditeur (pas d'insertion automatique — trop risqué pour la structure Plate).

**Section B — Termes manquants** (`nlp-missing-terms.tsx`)

Reprend la logique de `Phase3SerpNlpPanel` mais simplifiée :

- Si la KB contient des sources de type `serp`, utiliser directement leur `content` comme corpus concurrent pour `missingTermsVsCompetitors()`.
- Sinon, afficher l'input requête Google + bouton "Analyser depuis SERP" (logique `runFromSerp` existante).
- Affiche la liste des termes manquants.

**Section C — Meta tags scorées**

- Bouton **"Générer 3 variantes meta"** → appelle `aiGenerateObject('meta-scored', ctx)` (déjà codé).
- Affiche les résultats structurés (titre + description + score + justification).
- Bouton "Appliquer" à côté de chaque variante pour remplir les champs `metaTitle`/`metaDescription` dans `MetaFields`.

**Section D — JSON-LD**

- Bouton **"Générer JSON-LD Bundle"** → appelle `aiGenerateObject('jsonld-bundle', ctx)` (déjà codé).
- Affiche le JSON formaté.
- Bouton **"Copier"**.

### Étape 5 — Vérification (`step-review.tsx`)

**Layout** : score SEO + export.

**Section A — Score SEO**

- Reprend `SeoPanel` tel quel (`src/components/seo/seo-panel.tsx`). Score global 0-100 avec les 6 dimensions dépliables.

**Section B — Preview SERP**

- Reprend `SerpPreview` (déjà dans `MetaFields`, mais l'afficher aussi ici pour validation finale).

**Section C — Export**

- Regroupe les boutons d'export actuellement dans le header de `SeoEditor.tsx` :
  - Exporter Markdown
  - Exporter HTML
  - HTML Preview (dialog)
  - Exporter JSON
  - Enregistrer ./data
- Logique identique, juste déplacée ici.

---

## Composant WorkflowStepper (`workflow-stepper.tsx`)

Barre horizontale au-dessus de la sidebar (ou en haut de la sidebar). Affiche les 5 étapes comme des pastilles/tabs cliquables :

```
[ 1. Recherche ] → [ 2. Plan ] → [ 3. Rédaction ] → [ 4. Enrichir ] → [ 5. Vérif. ]
```

- L'étape active est mise en surbrillance (couleur primaire).
- Toutes les étapes sont cliquables à tout moment (pas de blocage — l'utilisateur est libre de naviguer).
- Utiliser des composants shadcn existants : des `Button` variant `ghost`/`default` dans un `div flex gap-1`.
- Le state `currentStep: WorkflowStep` est remonté dans `SeoEditor.tsx`.

---

## Modification de SeoEditor.tsx

Le composant principal `src/app/editor/SeoEditor.tsx` doit être modifié :

### State à ajouter

```ts
const [currentStep, setCurrentStep] = useState<WorkflowStep>('research');
const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>({ sources: [] });
const [internalLinks, setInternalLinks] = useState<InternalLinksMap | null>(null);
```

### Layout modifié

La colonne droite (actuellement `<div className="border-border flex min-h-0 ...">` avec SeoPanel, SerpLookup, ReaderUrlPanel, Phase3SerpNlpPanel, GscPanel, AiAssistantPanel empilés) est remplacée par :

```tsx
<div className="border-border flex min-h-0 min-w-0 flex-col border-t lg:h-full lg:w-[min(100%,440px)] lg:shrink-0 lg:border-t-0 lg:border-l">
  <WorkflowStepper current={currentStep} onChange={setCurrentStep} />
  <WorkflowSidebar
    step={currentStep}
    meta={meta}
    knowledgeBase={knowledgeBase}
    onKnowledgeBaseChange={setKnowledgeBase}
    internalLinks={internalLinks}
    onInternalLinksChange={setInternalLinks}
    seoAnalysis={seoAnalysis}
    editor={editor}
    docValue={docValue}
    getMarkdown={() => editor.getApi(MarkdownPlugin).markdown.serialize()}
    getSelectionText={() => { /* logique existante */ }}
    onMetaChange={persistMeta}
  />
</div>
```

### Header simplifié

Le header ne contient plus les boutons d'export (déplacés dans Step 5). Il garde :

- Le titre REWOLF / Éditeur
- Le lien "Articles" (vers /projects)
- Le bouton "Enregistrer ./data" (pour la sauvegarde rapide à tout moment)
- Le `LoadArticleDialog`

---

## WorkflowSidebar (`workflow-sidebar.tsx`)

Simple switch qui rend le bon composant selon `step` :

```tsx
export function WorkflowSidebar({ step, ...props }: WorkflowSidebarProps) {
  switch (step) {
    case 'research':
      return <StepResearch {...props} />;
    case 'outline':
      return <StepOutline {...props} />;
    case 'writing':
      return <StepWriting {...props} />;
    case 'enrich':
      return <StepEnrich {...props} />;
    case 'review':
      return <StepReview {...props} />;
  }
}
```

---

## Prompts IA spécifiques à ajouter

Ajouter dans `server/lib/prompts.ts` :

```ts
export const SEO_OUTLINE_FROM_KB_PROMPT = `Tu es un architecte de contenu SEO expert. Tu reçois un mot-clé principal et une base de connaissances (extraits de sources variées).

OBJECTIF : Proposer un plan d'article SEO complet (titres H2 et sous-titres H3) en Markdown.

RÈGLES :
- Analyse l'intention de recherche (informationnelle, transactionnelle, navigationnelle) et adapte la structure
- Chaque H2 couvre un angle distinct du sujet
- 4 à 8 H2 selon la profondeur du sujet
- 2 à 4 H3 par H2 si nécessaire (pas obligatoire pour chaque H2)
- Pour chaque section (H2 ou H3), ajoute une ligne "→ Points clés :" avec 2-3 éléments à couvrir
- Le mot-clé principal doit apparaître dans le H1 et au moins 2 H2
- Prévois un H2 de type "réponse directe" en début d'article (featured snippet)
- Base-toi sur les sources fournies, pas sur tes connaissances générales
- Ordre logique : réponse directe → contexte → détails → aspects pratiques → FAQ éventuelle

FORMAT :
## [Titre H2]
→ Points clés : [point 1], [point 2], [point 3]

### [Titre H3]
→ Points clés : [point 1], [point 2]`;

export const SEO_SECTION_FROM_KB_PROMPT = `Tu es un rédacteur SEO expert. Tu reçois un titre de section (H2), des sous-sections éventuelles (H3), un mot-clé principal, et des extraits de sources (base de connaissances).

OBJECTIF : Rédiger le contenu de cette section en puisant dans les sources fournies.

RÈGLES :
- Extrais les informations pertinentes des sources — ne génère pas de contenu générique
- Si une source contient un fait, une stat, un exemple précis : utilise-le
- Intègre le mot-clé naturellement (0.5-0.8% densité dans la section)
- Paragraphes de 2-4 phrases, phrases < 25 mots
- Mots de transition français
- Marqueurs E-E-A-T quand pertinent
- Si les sources ne couvrent pas un sous-point, indique [COMPLÉTER AVEC DONNÉES PROPRES]
- Markdown uniquement, commence directement par le contenu (pas de méta-commentaire)`;

export const SEO_INTERNAL_LINKS_PROMPT = `Tu es un expert en maillage interne SEO. Tu reçois le contenu Markdown d'un article et une liste de liens internes disponibles (URL + ancre + titre).

OBJECTIF : Suggérer des insertions de liens internes naturelles et pertinentes.

RÈGLES :
- Maximum 8 suggestions
- Chaque lien doit être contextuellement pertinent (pas de forçage)
- Privilégie les ancres dans le corps du texte (pas dans les titres)
- Varie les positions dans l'article (pas tous au même endroit)
- L'ancre peut être adaptée par rapport à celle fournie, tant qu'elle reste naturelle
- Ne suggère pas un lien si l'URL est déjà présente dans l'article

FORMAT par suggestion :
**Passage** : "[phrase ou groupe de mots du texte où insérer le lien]"
**Ancre** : "[texte cliquable]"
**URL** : [url]
**Raison** : [pourquoi ce lien est pertinent ici]`;
```

Ajouter les routes correspondantes si nécessaire (elles peuvent utiliser `/api/ai/stream` existant avec le prompt dans le corps `messages`, pas besoin de nouvelles routes serveur).

---

## Fichiers à supprimer ou déprécier

Ces composants ne sont plus utilisés directement dans SeoEditor (leur logique est absorbée par les steps) :

- `src/components/seo/serp-lookup.tsx` → logique reprise dans `serp-research.tsx` (step 1). Peut être supprimé ou gardé comme import si tu extrais la logique commune.
- `src/components/seo/reader-url-panel.tsx` → logique intégrée dans `serp-research.tsx` (step 1). Peut être supprimé.
- `src/components/seo/phase3-serp-nlp-panel.tsx` → logique reprise dans `nlp-missing-terms.tsx` (step 4). Peut être supprimé.
- `src/components/seo/gsc-panel.tsx` → à intégrer dans step 1 ou step 5 si pertinent, sinon supprimer.
- `src/components/ai/ai-assistant-panel.tsx` → logique reprise dans `step-writing.tsx` (step 3) et `step-enrich.tsx` (step 4). Peut être supprimé.

Ne supprime ces fichiers qu'APRÈS avoir vérifié que toute leur logique utile est bien recodée dans les nouveaux composants.

---

## Ordre de construction

1. Créer les types (`knowledge-base.ts`, `internal-links.ts`, `workflow.ts`). Étendre `article.ts`.
2. Créer `WorkflowStepper` + `WorkflowSidebar` (container + navigation).
3. Créer `StepResearch` avec `source-import-zone.tsx`, `source-list.tsx`, `serp-research.tsx`.
4. Créer `StepOutline` avec `outline-generator.tsx`, `outline-preview.tsx`.
5. Créer `StepWriting` avec la liste de sections et l'assistant contextuel.
6. Créer `StepEnrich` avec `internal-links-import.tsx`, `internal-links-suggest.tsx`, `nlp-missing-terms.tsx`, meta scorées, JSON-LD.
7. Créer `StepReview` avec `SeoPanel` + export.
8. Modifier `SeoEditor.tsx` : nouveau state, nouveau layout sidebar, header simplifié.
9. Ajouter les prompts dans `server/lib/prompts.ts`.
10. Nettoyer les composants dépréciés.

Attends ma validation avant de passer d'une étape à la suivante.

---

## Contraintes techniques

- **Stack** : React 19, TypeScript strict, Tailwind CSS v4, shadcn/ui. Pas de nouvelles dépendances npm sauf si absolument nécessaire.
- **Composants UI** : utilise exclusivement shadcn/ui (`Button`, `Input`, `Textarea`, `Separator`, etc.) déjà installés dans le projet.
- **Pas de Context React global** : passer les props de SeoEditor aux composants enfants. Si le prop drilling devient trop profond (> 3 niveaux), un context local `WorkflowContext` est acceptable.
- **Persistence KB** : stocker la knowledgeBase dans localStorage avec l'article (même clé `rewolf-seo-editor:article-v1`). La KB est liée à l'article en cours.
- **Pas d'upload serveur** : les fichiers importés sont lus côté client avec `FileReader` et stockés en mémoire + localStorage. Pas de nouvelle route backend pour ça.
- **Streaming IA** : toutes les générations de texte utilisent `streamAiChat()` (hook `useAiAssistant`) via `/api/ai/stream`. Les objets structurés utilisent `aiGenerateObject()` via `/api/ai/object`. Ne pas créer de nouvelles routes.
- **Largeur sidebar** : passer de `lg:w-[min(100%,392px)]` à `lg:w-[min(100%,440px)]` pour laisser plus de place aux formulaires.

