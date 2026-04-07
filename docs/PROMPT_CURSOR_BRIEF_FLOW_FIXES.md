# Cursor Prompt — Corrections post-review du flux Brief/Plan

> Seconde passe de corrections après implémentation de `PROMPT_CURSOR_BRIEF_FLOW_REFACTOR.md`. Objectif : corriger un bug UX structurel, rendre le scoring et la suggestion longue traîne fiables, et finaliser le polish.

---

## 0. Contexte

La refonte Research → Brief → Plan est en place (commit `05b6eca`). Le review a identifié 9 points à corriger, classés par priorité. Traite-les dans l'ordre ci-dessous, **un commit par section**.

Fichiers clés déjà en place à relire avant de commencer :
- `src/app/editor/SeoEditor.tsx` (state + câblage)
- `src/app/editor/data/DataWorkspace.tsx`
- `src/components/workflow/steps/step-brief.tsx`
- `src/components/workflow/steps/step-outline.tsx`
- `src/lib/seo/plan-scorer.ts`
- `src/lib/knowledge-base/kb-longtail.ts`
- `src/lib/knowledge-base/kb-text.ts` (stopwords)
- `src/lib/knowledge-base/extract-headings.ts`
- `src/components/workflow/workflow-stepper.tsx`

---

## PRIORITÉ 1 — Bugs bloquants

### 1.1 Rendre le focus keyword éditable à l'étape Data

**Problème** : `DataWorkspace` ne fait que lire `brief.focusKeyword`. L'utilisateur doit donc aller en étape Brief (2) pour le saisir, puis revenir en Data (1) pour bénéficier du pré-remplissage de la requête SERP. Flux cassé — l'étape Data est la première du workflow.

**À faire** :

1. **`src/app/editor/data/DataWorkspace.tsx`** — ajouter une prop `onBriefChange: (patch: Partial<ArticleBrief>) => void` et rendre un champ `Input` en tête de la zone, collé au-dessus des panels :

   ```tsx
   <div className="border-border bg-muted/20 border-b px-4 py-3">
     <label className="text-foreground mb-1.5 block text-sm font-medium">
       Mot-clé principal
     </label>
     <Input
       value={brief.focusKeyword}
       onChange={(e) => onBriefChange({ focusKeyword: e.target.value })}
       placeholder="ex. avocat droit du travail"
       className="max-w-md text-sm"
     />
     <p className="text-muted-foreground mt-1 text-xs">
       Utilisé pour pré-remplir la requête SERP et scorer le plan.
     </p>
   </div>
   ```

2. **`src/app/editor/SeoEditor.tsx`** — passer `onBriefChange={(patch) => persistBrief({ ...brief, ...patch })}` au `DataWorkspace` (réutiliser la fonction `persistBrief` existante).

3. **`src/components/workflow/steps/step-brief.tsx`** — modifier le label du champ focus keyword : `Mot-clé principal` (retirer `(rappel)`) et ajouter un petit hint `Également modifiable à l'étape Data.`

**Commit** : `fix(data): mot-clé principal éditable directement à l'étape Data`

---

## PRIORITÉ 2 — Heuristiques peu fiables

### 2.1 Scoring longue traîne tokenisé (plus de faux négatifs)

**Problème** : `plan-scorer.ts:92-98` cherche la substring exacte de chaque longue traîne dans le plan. `avocat droit du travail paris` vs `droit du travail à Paris` → échec garanti.

**À faire dans `src/lib/seo/plan-scorer.ts`** :

1. Ajouter un utilitaire de tokenisation partagée :

   ```ts
   import { KB_FRENCH_STOPWORDS } from '@/lib/knowledge-base/kb-text';

   function tokenizeForMatch(s: string): string[] {
     return norm(s)
       .split(/[^a-z0-9]+/)
       .filter((t) => t.length >= 3 && !KB_FRENCH_STOPWORDS.has(t));
   }

   /** Ratio de tokens de `needle` présents dans `haystack` (0..1). */
   function tokenCoverage(haystack: string, needle: string): number {
     const ht = new Set(tokenizeForMatch(haystack));
     const nt = tokenizeForMatch(needle);
     if (nt.length === 0) return 1;
     const hits = nt.filter((t) => ht.has(t)).length;
     return hits / nt.length;
   }
   ```

2. Remplacer le check `longtail` par un scoring partiel **pondéré par proportion** :

   ```ts
   const longTailCoverageThreshold = 0.7; // 70 % des tokens par expression
   const covered =
     longTails.length === 0
       ? 1
       : longTails.filter(
           (lt) => tokenCoverage(planMarkdown, lt) >= longTailCoverageThreshold
         ).length / longTails.length;

   checks.push({
     id: 'longtail',
     label: `Longue traîne couverte (${Math.round(covered * 100)}%)`,
     passed: covered >= 0.8, // au moins 80 % des expressions couvertes
     weight: 16,
     details:
       longTails.length === 0
         ? 'Aucune longue traîne définie'
         : `${Math.round(covered * longTails.length)}/${longTails.length} expressions`,
   });
   ```

3. Le `weight` reste à 16 mais le check devient plus juste.

**Commit** : `fix(scorer): couverture longue traîne basée sur tokens au lieu de substring`

### 2.2 Étendre la liste de stopwords FR

**Problème** : `KB_FRENCH_STOPWORDS` ne contient que 11 mots. `suggestLongTailFromKb` laisse passer des n-grams pollués (`le droit`, `de travail`, `et les`…).

**À faire dans `src/lib/knowledge-base/kb-text.ts`** :

Remplacer le `KB_FRENCH_STOPWORDS` existant par une liste étendue (~100 entrées couvrant articles, pronoms, prépositions, conjonctions, auxiliaires courants, contractions) :

```ts
export const KB_FRENCH_STOPWORDS = new Set([
  // articles
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'd', "l",
  'au', 'aux',
  // pronoms
  'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
  'me', 'te', 'se', 'moi', 'toi', 'soi', 'lui', 'leur', 'leurs',
  'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
  'notre', 'nos', 'votre', 'vos',
  'ce', 'cet', 'cette', 'ces', 'celui', 'celle', 'ceux', 'celles',
  'qui', 'que', 'quoi', 'dont', 'où', 'quel', 'quelle', 'quels', 'quelles',
  // prépositions & conjonctions
  'à', 'en', 'dans', 'sur', 'sous', 'par', 'pour', 'avec', 'sans',
  'vers', 'chez', 'entre', 'contre', 'depuis', 'pendant', 'avant', 'après',
  'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car',
  'si', 'comme', 'quand', 'lorsque', 'puisque', 'parce',
  // auxiliaires & verbes très fréquents
  'est', 'sont', 'était', 'étaient', 'sera', 'seront', 'été', 'être',
  'ai', 'as', 'a', 'avons', 'avez', 'ont', 'avais', 'avait', 'avaient',
  'eu', 'avoir',
  'fait', 'faire', 'faut', 'peut', 'peuvent', 'doit', 'doivent',
  // adverbes courants
  'pas', 'ne', 'plus', 'moins', 'très', 'trop', 'bien', 'aussi',
  'encore', 'déjà', 'toujours', 'jamais', 'souvent', 'parfois',
  'ici', 'là', 'alors', 'ainsi', 'puis', 'ensuite', 'enfin',
  'tout', 'tous', 'toute', 'toutes', 'même', 'autre', 'autres',
  // mots interrogatifs restants
  'comment', 'pourquoi', 'combien',
  // élisions fréquentes
  'c', 'n', 'qu', 's', 'j', 'm', 't',
]);
```

Vérifie ensuite que :
- `kb-longtail.ts` utilise toujours `KB_FRENCH_STOPWORDS` pour filtrer les n-grams (à chaque position, pas seulement la première/dernière).
- `kb-text.ts:kbExcerptForHeading` continue de fonctionner (la condition `length > 3` est déjà appliquée).

**Commit** : `fix(kb): élargir la liste de stopwords FR pour filtrer les n-grams`

### 2.3 Durcir le check "featured snippet"

**Problème** : `plan-scorer.ts:82-87` valide tout H2 de moins de 72 caractères → ne discrimine rien.

**À faire dans `src/lib/seo/plan-scorer.ts`** :

```ts
const SNIPPET_STARTERS = /^(qu['']est|définition|comment|pourquoi|en quoi|combien|qu['']est-ce que|quels|quelles|quand)/i;

checks.push({
  id: 'first-h2-snippet',
  label: 'Premier H2 orienté réponse directe (snippet)',
  passed:
    h2.length > 0 &&
    SNIPPET_STARTERS.test(h2[0]) &&
    h2[0].length <= 80,
  weight: 8,
  details: h2[0]
    ? `Premier H2 : "${h2[0].slice(0, 60)}${h2[0].length > 60 ? '…' : ''}"`
    : 'Aucun H2 détecté',
});
```

Plus de fallback `length <= 72` seul : il faut maintenant un **marqueur interrogatif explicite** ET une longueur raisonnable.

**Commit** : `fix(scorer): exiger un marqueur interrogatif sur le premier H2`

---

## PRIORITÉ 3 — UX du brief

### 3.1 Marquer les champs obligatoires et bloquer la navigation

**Problème** : `focusKeyword` et `searchIntent` sont requis pour générer le plan, mais l'UI du brief ne le signale pas et le stepper laisse passer directement en Plan.

**À faire** :

1. **`src/components/workflow/steps/step-brief.tsx`** — Ajouter un indicateur `*` rouge sur les labels `Mot-clé principal` et `Intention de recherche`. Ajouter en haut de la step un banner conditionnel :

   ```tsx
   const missing: string[] = [];
   if (!brief.focusKeyword.trim()) missing.push('mot-clé principal');
   if (!brief.searchIntent) missing.push('intention de recherche');

   {missing.length > 0 && (
     <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-xs">
       Brief incomplet : {missing.join(', ')}. Ces champs sont requis pour générer le plan.
     </div>
   )}
   ```

2. **`src/components/workflow/steps/step-outline.tsx`** — Avant le bouton `Générer`, si le brief est incomplet, afficher un banner au lieu (ou en plus) du toast :

   ```tsx
   const briefIncomplete =
     !brief.focusKeyword.trim() || !brief.searchIntent;

   {briefIncomplete && (
     <div className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 rounded-md border px-3 py-2 text-xs">
       Brief incomplet — complétez le mot-clé principal et l'intention de recherche à l'étape Brief.
     </div>
   )}
   ```

3. **Optionnel mais recommandé** — Dans `src/components/workflow/workflow-stepper.tsx`, désactiver visuellement (opacity + curseur) l'étape `outline` et suivantes si `brief.focusKeyword` ou `brief.searchIntent` manquent. Ne pas bloquer le clic (garder la liberté), juste le signaler visuellement via un point rouge/warning sur l'étape. Passer `brief` en prop au stepper depuis `SeoEditor.tsx`.

**Commit** : `feat(brief): indicateurs de champs obligatoires et banner d'incomplétude`

---

## PRIORITÉ 4 — Finitions

### 4.1 `extractHeadingsFromMarkdown` ignore les blocs de code

**À faire dans `src/lib/knowledge-base/extract-headings.ts`** :

```ts
import type { ExtractedHeading } from '@/types/knowledge-base';

export function extractHeadingsFromMarkdown(markdown: string): ExtractedHeading[] {
  const out: ExtractedHeading[] = [];
  let inCodeBlock = false;
  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (/^```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    const m = /^(#{1,3})\s+(.+)$/.exec(line);
    if (!m) continue;
    const level = m[1].length as 1 | 2 | 3;
    const text = m[2].trim();
    if (text) out.push({ level, text });
  }
  return out;
}
```

**Commit** : `fix(kb): ignorer les blocs de code lors de l'extraction des titres`

### 4.2 Limiter `formatCompetitorHeadings`

**Problème** : pas de borne sur le nombre de sources/headings injectés dans le prompt. Risque de contexte dépassé.

**À faire dans `src/lib/knowledge-base/kb-text.ts`** :

```ts
const MAX_COMPETITOR_SOURCES = 8;
const MAX_HEADINGS_PER_SOURCE = 15;

export function formatCompetitorHeadings(kb: KnowledgeBase): string {
  const blocks: string[] = [];
  const sources = kb.sources
    .filter((s) => s.headings && s.headings.length > 0)
    .slice(0, MAX_COMPETITOR_SOURCES);
  for (const s of sources) {
    const hh = (s.headings ?? []).slice(0, MAX_HEADINGS_PER_SOURCE);
    const lines = hh.map((h) => `${'#'.repeat(h.level)} ${h.text}`);
    blocks.push(`### ${s.label}\n${lines.join('\n')}`);
  }
  return blocks.length
    ? blocks.join('\n\n')
    : '(aucune structure de titres extraite — importez des URLs/SERP en Markdown)';
}
```

**Commit** : `fix(prompt): borner le nombre de structures concurrentes injectées`

### 4.3 Tests unitaires de la logique critique

**À créer** — aucune dépendance de test n'étant actuellement installée, vérifie d'abord `package.json` : si Vitest est déjà présent (souvent bundle avec Vite), utilise-le. Sinon installe `vitest` et ajoute le script `"test": "vitest run"`.

Puis créer trois fichiers minimaux :

**`src/lib/knowledge-base/extract-headings.test.ts`** :
- extrait correctement H1/H2/H3
- ignore H4+
- ignore les `#` à l'intérieur de blocs de code ` ``` `
- retourne `[]` sur markdown vide

**`src/lib/knowledge-base/kb-longtail.test.ts`** :
- retourne un tableau vide sur KB vide
- filtre les n-grams contenant des stopwords
- priorise les phrases présentes dans plusieurs sources (spread)
- limite à `max`

**`src/lib/seo/plan-scorer.test.ts`** :
- score = 0 sur plan vide
- check `kw-h2` passe avec 2 H2 contenant le keyword
- check `longtail` passe avec 80 % des expressions partiellement tokenisées couvertes
- check `first-h2-snippet` échoue sur `## Introduction` mais passe sur `## Qu'est-ce que X ?`
- check `differentiator` passe si au moins un H2 du plan diffère des H2 concurrents

3 à 5 cas par fichier suffisent — on cherche la non-régression, pas l'exhaustivité.

**Commit** : `test: unit tests pour scorer, longtail et extract-headings`

---

## 5. Vérifications finales

Avant de pousser :

1. `npm run build` — pas de nouvelle erreur TypeScript
2. `npm run lint` si dispo
3. `npm run test` (si Vitest ajouté)
4. Tester manuellement le flux complet : Data (saisir mot-clé + ajouter 2-3 sources SERP) → Brief (remplir intent + longue traîne) → Plan (générer, vérifier le score affiché) → insertion
5. Tester la régression : charger un ancien article du localStorage sans `brief` → doit être migré sans crash

## 6. Hors scope (ne PAS faire)

- Refonte visuelle du stepper ou des steps
- Ajout de nouveaux champs au brief
- Changement de provider LLM ou de routing
- Nouvelles dépendances autres que Vitest pour les tests
- Système de gating strict qui empêcherait totalement de naviguer en arrière

---

## 7. Livrables

- 8 commits atomiques, un par section numérotée (1.1 → 4.3)
- Même branche que la passe précédente (celle définie par les consignes de session)
- Court résumé en fin de travail listant : commits poussés, fichiers modifiés, points d'attention pour le review

**Commence par relire les fichiers listés en section 0 avant d'attaquer la section 1.1.**
