# Cursor Prompt — Refonte du flux Research → Brief → Plan (cohérence SEO implacable)

> À coller dans Cursor (mode Agent / Composer). Ce prompt décrit une refonte ciblée du flux de génération de plan d'article du Rewolf SEO Editor pour le rendre stratégiquement défendable.

---

## 0. Contexte du repo

- App Vite + React + TypeScript, backend Hono dans `server/`.
- Workflow actuel : `research → outline → writing → finalize` (`src/types/workflow.ts`).
- Étape recherche : `src/app/editor/SeoEditor.tsx` rend `DataWorkspace` quand `currentStep === 'research'`.
- Génération du plan : `src/components/workflow/steps/step-outline.tsx` qui appelle `/api/ai/stream` avec les prompts de `src/lib/ai/prompts/workflow.ts`.
- Extraction de sources : `server/lib/jina.ts` (Jina Reader, `Accept: text/plain` aujourd'hui).
- Score SEO : `src/lib/seo/analyzer.ts` (utilisé seulement sur l'article final, pas sur le plan).
- Métadonnées article : `src/types/article.ts` (`ArticleMeta`), édition dans `src/components/seo/meta-fields.tsx`.
- KB : `src/lib/knowledge-base/kb-text.ts`, `kb-stats.ts`.

## 1. Problème à résoudre

Aujourd'hui le plan est généré à partir de **seulement** : un mot-clé (souvent vide à ce stade car saisi en Finalize) + 8000 caractères de texte brut concaténé. Aucune intention, aucune cible, aucune longue traîne, aucune analyse de la structure des concurrents. Le LLM doit tout deviner, et le plan n'est jamais scoré avant insertion.

## 2. Objectifs de la refonte

1. **Remonter le focus keyword en début de flux** (étape Research).
2. **Introduire une étape `brief`** entre `research` et `outline`, qui collecte intention, audience, destination, longue traîne et objectif business.
3. **Capturer la structure HTML** des sources (H1/H2/H3) via Jina en mode markdown.
4. **Injecter tout le brief + structures concurrentes** dans le prompt de génération de plan.
5. **Scorer le plan généré** avant insertion, avec possibilité de régénérer.

## 3. Étapes d'implémentation (faire dans cet ordre, un commit par étape)

### Étape 1 — Étendre le type workflow et les métadonnées

**Fichier** : `src/types/workflow.ts`

```ts
export type WorkflowStep = 'research' | 'brief' | 'outline' | 'writing' | 'finalize';
```

Mettre à jour `src/components/workflow/workflow-stepper.tsx` pour afficher la nouvelle étape "Brief" entre Research et Plan.

**Fichier** : `src/types/article.ts` — créer un nouveau type `ArticleBrief` :

```ts
export type SearchIntent = 'informational' | 'transactional' | 'navigational' | 'commercial';
export type FunnelStage = 'awareness' | 'consideration' | 'decision';

export type ArticleBrief = {
  focusKeyword: string;            // déplacé depuis ArticleMeta
  longTailKeywords: string[];      // édition libre, suggestions auto depuis KB
  searchIntent: SearchIntent | null;
  funnelStage: FunnelStage | null;
  targetAudience: string;          // texte libre court
  destinationUrl: string;          // domaine/site cible
  brandVoice: string;              // texte libre court
  businessGoal: string;            // texte libre court
};
```

Retirer `focusKeyword` de `ArticleMeta` et migrer toutes les références (`meta.focusKeyword` → `brief.focusKeyword`). Ajouter `brief: ArticleBrief` au state global de l'article (probablement dans `src/app/editor/SeoEditor.tsx` ou le store concerné — chercher où `ArticleMeta` est instancié).

### Étape 2 — Remonter le focus keyword dans Research

**Fichier** : `src/app/editor/data/DataWorkspace.tsx` (ou équivalent)

Ajouter en haut de l'étape Research un champ `Mot-clé principal` lié à `brief.focusKeyword`. Le champ existant dans `src/components/seo/meta-fields.tsx` doit être supprimé (ou transformé en lecture seule) puisque le keyword est maintenant défini en amont.

Mettre à jour `src/app/editor/data/add-tabs/AddSerpTab.tsx:34` qui lit déjà `meta.focusKeyword` → lire `brief.focusKeyword`.

### Étape 3 — Créer l'étape Brief

**Nouveau fichier** : `src/components/workflow/steps/step-brief.tsx`

Composant React qui rend un formulaire avec :
- **Intention de recherche** : radio (informational / transactional / navigational / commercial)
- **Étape funnel** : radio (awareness / consideration / decision)
- **Audience cible** : textarea courte (1-2 phrases)
- **URL/domaine de destination** : input
- **Voix de marque** : textarea courte
- **Objectif business** : textarea courte
- **Longue traîne** : tag input (chips éditables) avec un bouton "Suggérer depuis la KB" qui appelle une fonction `suggestLongTailFromKb(kb, focusKeyword)`.

**Nouveau fichier** : `src/lib/knowledge-base/kb-longtail.ts`

```ts
import type { KnowledgeBase } from '@/types/...';

export function suggestLongTailFromKb(
  kb: KnowledgeBase,
  focusKeyword: string,
  max = 15
): string[] {
  // Extraire les n-grams (2-4 mots) qui contiennent au moins un mot du focusKeyword
  // ou qui apparaissent dans plusieurs sources. Utiliser la même tokenisation
  // et liste de stopwords FR que kb-stats.ts.
  // Trier par fréquence inter-sources (présent dans 2+ sources prioritaire).
  // Retourner max résultats dédupliqués.
}
```

Brancher l'étape dans `SeoEditor.tsx` : quand `currentStep === 'brief'`, rendre `<StepBrief />`. Permettre la navigation Brief ↔ Research et Brief → Outline.

### Étape 4 — Capturer la structure HTML des sources

**Fichier** : `server/lib/jina.ts`

Passer en mode markdown pour récupérer la hiérarchie de titres :

```ts
const res = await fetch(jinaUrl, {
  headers: {
    Accept: 'text/markdown',
    'X-Return-Format': 'markdown',
  },
});
```

**Nouveau fichier** : `server/lib/extract-headings.ts`

```ts
export type ExtractedHeading = { level: 1 | 2 | 3; text: string };

export function extractHeadings(markdown: string): ExtractedHeading[] {
  // Parser les lignes commençant par #, ##, ### uniquement.
  // Ignorer les niveaux > 3.
}
```

**Fichier** : `src/types/...` (là où est défini `KbSource`)

Ajouter un champ optionnel :
```ts
type KbSource = {
  // ...existing
  headings?: ExtractedHeading[];
};
```

Mettre à jour le pipeline d'ingestion (chercher où `KbSource` est créé après l'appel à Jina, probablement `server/routes/...` ou `src/app/editor/data/add-tabs/`) pour stocker les headings extraits.

Afficher les headings extraits dans le `ClusterDashboard` ou un nouveau panneau "Structure des concurrents" dans Research, pour visualisation.

### Étape 5 — Refondre le prompt de génération du plan

**Fichier** : `src/lib/ai/prompts/workflow.ts`

Remplacer le `SEO_OUTLINE_PROMPT` actuel par une version qui prend en compte le brief complet :

```ts
export const SEO_OUTLINE_PROMPT = `Tu es un architecte de contenu SEO expert.

Tu reçois :
1. Un BRIEF stratégique (mot-clé principal, longue traîne, intention, audience, destination, objectif business).
2. Une BASE DE CONNAISSANCES (extraits texte des sources).
3. Les STRUCTURES DES CONCURRENTS (hiérarchies H1/H2/H3 réelles).

OBJECTIF : Proposer un plan d'article SEO en Markdown qui domine les concurrents
sur le mot-clé principal tout en couvrant la longue traîne fournie et en respectant
l'intention de recherche déclarée.

RÈGLES :
- Respecte STRICTEMENT l'intention de recherche déclarée dans le brief.
- Le mot-clé principal doit apparaître dans le H1 et au moins 2 H2.
- Chaque longue traîne du brief doit être couverte par au moins une section (H2 ou H3).
- Analyse les structures concurrentes : couvre les angles communs ET ajoute au moins
  un angle différenciant absent des concurrents.
- 4 à 8 H2 selon la profondeur. 2 à 4 H3 par H2 si pertinent.
- Premier H2 = "réponse directe" optimisée featured snippet.
- Adapte le ton au brandVoice fourni.
- Termine par "Points clés : ..." (2-3 éléments) sous chaque section.
- Base-toi sur les sources, pas sur tes connaissances générales.

FORMAT :
## [H2]
→ Points clés : ...
→ Longue traîne couverte : [keyword1, keyword2]

### [H3]
→ Points clés : ...
`;
```

**Fichier** : `src/components/workflow/steps/step-outline.tsx`

Remplacer la construction actuelle du `userPrompt` par :

```ts
const userPrompt = [
  '--- BRIEF ---',
  `Mot-clé principal : ${brief.focusKeyword}`,
  `Longue traîne : ${brief.longTailKeywords.join(', ') || '(aucune)'}`,
  `Intention : ${brief.searchIntent ?? '(non définie)'}`,
  `Étape funnel : ${brief.funnelStage ?? '(non définie)'}`,
  `Audience : ${brief.targetAudience || '(non définie)'}`,
  `Destination : ${brief.destinationUrl || '(non définie)'}`,
  `Voix de marque : ${brief.brandVoice || '(non définie)'}`,
  `Objectif business : ${brief.businessGoal || '(non défini)'}`,
  '',
  '--- STRUCTURES CONCURRENTES ---',
  formatCompetitorHeadings(kb),  // H1/H2/H3 par source
  '',
  '--- BASE DE CONNAISSANCES ---',
  kbSummary,
  '',
  '--- CONSIGNE ---',
  'Génère le plan en Markdown selon les règles du système.',
].join('\n');
```

Créer la fonction utilitaire `formatCompetitorHeadings(kb)` dans `src/lib/knowledge-base/kb-text.ts` qui produit une liste lisible des H2/H3 par source.

Si l'étape `brief` n'est pas validée (champs critiques vides : `focusKeyword`, `searchIntent`), bloquer la génération avec un message qui renvoie vers l'étape Brief.

### Étape 6 — Scorer le plan généré

**Nouveau fichier** : `src/lib/seo/plan-scorer.ts`

```ts
import type { ArticleBrief } from '@/types/article';

export type PlanScore = {
  overall: number; // 0-100
  checks: PlanCheck[];
};

export type PlanCheck = {
  id: string;
  label: string;
  passed: boolean;
  weight: number;
  details?: string;
};

export function scorePlan(planMarkdown: string, brief: ArticleBrief): PlanScore {
  // Checks à implémenter :
  // - focusKeyword présent dans le H1
  // - focusKeyword présent dans >= 2 H2
  // - Premier H2 ressemble à une réponse directe (heuristique : contient
  //   "qu'est-ce que", "définition", ou < 60 caractères)
  // - Nombre de H2 entre 4 et 8
  // - Chaque longTailKeyword apparaît dans au moins une section
  // - Présence de "Points clés" sous chaque section
  // - Au moins un H2 différenciant (non présent dans les structures concurrentes)
  //   → nécessite de passer aussi les headings concurrents en argument
}
```

**Fichier** : `src/components/workflow/steps/step-outline.tsx`

Après réception du plan streamé :
1. Calculer `scorePlan(plan, brief)`.
2. Afficher un panneau de score avec la liste des checks (✓ / ✗).
3. Bouton "Régénérer" disponible si score < 70.
4. Bouton "Insérer dans l'éditeur" toujours disponible mais avec warning si score bas.

### Étape 7 — Tests et migration

- Vérifier que les articles existants (ancien format `ArticleMeta` avec `focusKeyword`) sont migrés : ajouter une fonction `migrateLegacyArticle()` qui déplace `focusKeyword` de `meta` vers `brief` au chargement.
- Mettre à jour les exports/persistance localStorage si applicable.
- Lancer `npm run build` et `npm run lint` après chaque étape.

## 4. Contraintes

- **Ne pas casser** le flux existant pour les articles déjà créés (migration douce).
- **Pas de nouvelles dépendances** sauf si strictement nécessaire (préférer du parsing markdown maison pour les headings — c'est trivial).
- **Conserver le streaming** côté `/api/ai/stream`, ne pas le transformer en appel bloquant.
- **Tout en français** côté UI (l'app est francophone).
- **Pas de TODO commentés** : si un point n'est pas implémentable maintenant, demander avant de skipper.

## 5. Livrables attendus

1. Une PR (ou commits successifs) sur la branche `claude/db-to-plan-flow-p2a32`.
2. Un commit par étape (1 à 7).
3. Un court résumé en fin de travail listant : fichiers créés, fichiers modifiés, points d'attention pour le review.

## 6. Hors scope (ne PAS faire)

- Refactor du système d'authentification.
- Changement du provider LLM ou du routing de modèles.
- Refonte visuelle du `WorkflowStepper` au-delà de l'ajout de l'étape Brief.
- Ajout d'un système de templates de brief sauvegardés (à voir dans une v2).
- Recherche de mots-clés via API tierce (Semrush, Ahrefs…) — la longue traîne est saisie manuellement + suggestions depuis la KB uniquement.

---

**Commence par lire les fichiers cités en section 0 pour bien cartographier l'existant, puis exécute les étapes dans l'ordre.**
