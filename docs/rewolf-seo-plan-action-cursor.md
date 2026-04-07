# REWOLF SEO Editor — Plan d'action Cursor

10 tâches priorisées pour transformer l'outil en vrai poste de rédaction SEO quotidien.
Principes : tâches atomiques, fichiers explicites, tests à chaque étape, commits indépendants, pas de refactor implicite.

---

## 0. Règles globales — à créer dans `.cursorrules` (racine du projet)

```
# REWOLF SEO Editor — Règles agent

## Stack fixe (non négociable)
- Vite + React 19 + TS strict + Tailwind v4 + shadcn/ui
- Plate (platejs.org) comme éditeur — ne JAMAIS le remplacer
- Vercel AI SDK (`ai` + `@ai-sdk/anthropic` + `@ai-sdk/openai`) pour tous les LLM
- Hono côté server
- Français natif : contenu, libellés, prompts

## Règles de code
- Pas de fichier créé sans nécessité : préférer éditer l'existant
- Pas de backwards-compat shims, pas de feature flags inutiles
- Tests Vitest pour toute logique pure (scorer, extracteur, densité, FK…)
- Web Worker pour toute analyse SEO potentiellement lourde
- Streaming IA obligatoire via `streamText()` + `@platejs/ai` quand l'output va dans l'éditeur
- Debounce 500 ms pour l'analyse SEO live, 2 s pour la sauvegarde
- Respecter la typologie existante : ArticleBrief / ArticleMeta / KnowledgeBase / SeoAnalysisPayload / SeoAnalysisResult

## Anti-patterns interdits
- Ne PAS dupliquer l'analyzer SEO : une seule source = src/lib/seo/analyzer.ts
- Ne PAS ajouter d'état global (zustand/redux) : props descendent depuis SeoEditor.tsx
- Ne PAS casser l'API publique des hooks useSeoAnalysis / useAiAssistant
- Ne PAS toucher au worker seo.worker.ts sans ajouter un test dédié
- Ne PAS créer de nouvelles routes serveur pour une feature purement locale

## Validation obligatoire en fin de chaque tâche
1. `npm run lint` OK
2. `npm run test` OK
3. `npm run build` OK
4. Un commit unique `<type>(<scope>): <sujet>`
```

**Première commande à passer à Cursor** :
> Lis `@.cursorrules`, `@cahierdescharges/Cahier\ des\ charges.md`, `@README.md`, `@SEO_ENGINE_DECISION.md`. Confirme que tu as compris l'architecture avant de commencer la Tâche 1.

---

## Tâche 1 — Panel SEO visible dès l'étape Writing

**Pourquoi** : un copywriter écrit en regardant son score monter. Aujourd'hui le panel n'existe qu'à Finaliser.

**Prompt Cursor** :
> Dans `@src/components/workflow/workflow-sidebar.tsx`, le `case 'writing'` affiche uniquement `StepWriting`. Affiche en plus un nouveau composant `WritingSeoPanel` (créer `@src/components/workflow/steps/writing-seo-panel.tsx`).
>
> `WritingSeoPanel` doit :
> 1. Rendre `@src/components/seo/seo-panel.tsx` avec `seoAnalysis` reçu en props (descendre depuis `SeoEditor.tsx` où `useSeoAnalysis` est déjà appelé).
> 2. Container scrollable, placé sous le bloc « Sections (H2) ».
> 3. En haut : sous-composant `LiveScorePill` (score global + barre 0–100, palette existante : rouge <50, ambre <75, vert ≥75).
>
> **Acceptance** : panel live pendant la frappe (debounce 500 ms déjà géré) ; `LiveScorePill` change de couleur ; lint/test/build OK.
>
> **Files** : `workflow-sidebar.tsx`, `SeoEditor.tsx`, nouveau `writing-seo-panel.tsx`.

---

## Tâche 2 — Highlight focus keyword + longue traîne dans l'éditeur

**Pourquoi** : `src/lib/seo/highlight.ts` existe mais n'est branché nulle part.

**Prompt Cursor** :
> Crée un plugin Plate `KeywordHighlightKit` dans `@src/components/editor/plugins/keyword-highlight-kit.tsx` qui :
> 1. Reçoit `{ term, kind: 'focus' | 'longtail' }[]` via options
> 2. Utilise `decorate` de Plate pour surligner chaque occurrence (reprendre `norm()` de `@src/lib/seo/keyword.ts` pour l'insensibilité casse/accents)
> 3. Deux classes : `kw-focus` (fond jaune), `kw-longtail` (fond bleu clair), définies dans `@src/index.css`
>
> Branche dans `@src/components/editor/editor-kit.tsx` avec `brief.focusKeyword` + `brief.longTailKeywords` via paramètre factory (pas de contexte React).
>
> **Acceptance** : focus keyword en jaune live, longtails en bleu, désactivation si terme vide, test `keyword-highlight-kit.test.ts` (3 cas : exact, accent, casse).
>
> **Files** : nouveau `keyword-highlight-kit.tsx`, `editor-kit.tsx`, `index.css`, nouveau test.

---

## Tâche 3 — Stemming FR + lemmatisation basique pour la densité

**Pourquoi** : "avocat" ≠ "avocats" aujourd'hui. Critique pour contenu juridique.

**Prompt Cursor** :
> Crée `@src/lib/seo/stem-fr.ts` avec `stemFr(token: string): string` appliquant des règles sur les suffixes FR fréquents (`-s`, `-es`, `-x`, `-aux`, `-ent`, `-ait`, `-aient`, `-er`, `-ir`, `-é`, `-ée`, `-és`, `-ées`, `-tion`, `-ments`). Objectif : 95% des variations courantes sans dictionnaire externe. Vérifie d'abord si `natural` ou `wink-nlp` est déjà dans `node_modules` ; sinon reste autonome (pas de nouvelle dep).
>
> Ajoute `stem-fr.test.ts` (≥30 cas : pluriels, féminins, conjugaisons, invariants).
>
> Puis dans `@src/lib/seo/keyword.ts` :
> - Nouvelle fonction `countPhraseInTextStemmed(text, phrase)` (tokenize → stem → match séquence)
> - `countPhraseInText` reste intact (matching strict conservé pour title/H1)
> - `kw-density` utilise la version stemmée
>
> **Acceptance** : test « avocat / avocats / avocate » avec keyword « avocat » → densité > 0 ; les 7 critères on-page passent leurs tests existants.
>
> **Files** : nouveau `stem-fr.ts` + test, `keyword.ts`, `keyword.test.ts` si existant.

---

## Tâche 4 — Lisibilité FR : LIX en complément de Flesch-Kincaid

**Pourquoi** : FK est calibré anglais, le projet vise le FR.

**Prompt Cursor** :
> Dans `@src/lib/seo/readability.ts`, ajoute `lixScoreFr(text): { score, grade }` implémentant LIX : `(mots/phrases) + (mots_longs × 100 / mots)` où `mots_longs` = mots > 6 caractères.
>
> Remplace le critère `readability-grade` par un hybride qui calcule FK ET LIX et prend le plus pessimiste. Affiche les deux dans le détail.
>
> Cible LIX : 30–45 = ok ; 45–55 = warn ; <30 ou >55 = bad.
>
> Test `readability.test.ts` avec 4 textes : enfantin, standard, technique, juridique.
>
> **Acceptance** : panel affiche « FK : X · LIX : Y (cible 30–45) » ; pas de régression.
>
> **Files** : `readability.ts`, nouveau test.

---

## Tâche 5 — Streaming IA inline dans Plate (Writing)

**Pourquoi** : aujourd'hui génération dans un `<pre>` puis copie manuelle. Le plus gros casse-flow.

⚠️ **Tâche la plus risquée** — à faire en session dédiée.

**Prompt Cursor** :
> `@platejs/ai` est déjà installé (`@src/components/editor/plugins/ai-kit.tsx`). `@src/components/workflow/steps/step-writing.tsx` stream dans un `<pre>`. Je veux que « Rédiger cette section » utilise le plugin Plate AI pour streamer **directement dans l'éditeur**, après le H2 ciblé, avec les boutons natifs Accept/Discard/Retry.
>
> Contraintes :
> 1. Ne supprime pas le mode `<pre>` : ajoute un toggle `Mode insertion directe` (activé par défaut)
> 2. Prompt et contexte (KB + sections précédentes + brief) identiques — ne modifie pas `SEO_SECTION_FROM_KB_PROMPT` ni `buildArticleContextWithKb`
> 3. Les 4 actions sur sélection (Réécrire / Simplifier / Développer / Traduire) utilisent `editor.getApi(AIPlugin)` et remplacent la sélection après Accept
> 4. Si le plugin nécessite `/api/ai/command`, utilise celle qui existe dans `@server/routes/ai.ts`
>
> Étudie `@node_modules/@platejs/ai/README.md` avant de coder. Plus petite intégration qui marche.
>
> **Acceptance** : « Rédiger section » positionne le curseur après le H2, streaming token par token, boutons Accept/Discard/Retry ; « Réécrire sélection » remplace en streaming ; mode `<pre>` accessible via toggle ; `npm run build` OK.
>
> **Fallback si deux tentatives échouent** : améliorer le mode `<pre>` avec bouton « Insérer et surligner » + scroll auto. Ne pas casser l'éditeur.
>
> **Files** : `step-writing.tsx`, `ai-kit.tsx`, éventuellement `useAiAssistant.ts`.

---

## Tâche 6 — Actions IA manquantes : FAQ / Intro / Variantes H1-H2 / ALT text

**Pourquoi** : raccourcis quotidiens d'un copywriter, inexistants aujourd'hui.

**Prompt Cursor** :
> Dans `@src/lib/ai/prompts/writing.ts`, ajoute 4 prompts système (FR, style identique aux existants) :
> 1. `SEO_FAQ_PROMPT` : 5–8 questions-réponses optimisées PAA, tirées du contenu + KB. Output Markdown `**Q:** / **R:**`.
> 2. `SEO_INTRO_PROMPT` : 2 variantes d'intro 40–60 mots contenant le focus keyword, respectant l'intention. Format `### Variante 1 ... ### Variante 2 ...`.
> 3. `SEO_HEADLINE_VARIANTS_PROMPT` : 5 variantes d'un H1/H2 donné (bénéfice, chiffre, question, guide, année).
> 4. `SEO_ALT_TEXT_PROMPT` : alt text ≤ 125 chars depuis descriptif + contexte article.
>
> Expose dans un nouveau bloc « Raccourcis rédaction » dans `@src/components/workflow/steps/step-writing.tsx`. Chaque bouton appelle `streamAiChatWithFallback` avec le bon prompt.
>
> - FAQ / Intro : output dans le `<pre>` + bouton « Insérer au début / à la fin »
> - Variantes H1/H2 : popover radio + « Remplacer dans l'éditeur »
> - ALT text : modale input + output copiable
>
> **Acceptance** : 4 boutons qui génèrent en streaming ; aucune régression ; test snapshot léger qui vérifie présence des mots-clés attendus (`focusKeyword`, `intention`, etc.) dans chaque prompt.
>
> **Files** : `writing.ts`, `step-writing.tsx`, nouveau test prompts.

---

## Tâche 7 — Termes manquants TF-IDF exposés en Writing

**Pourquoi** : `tfidf-missing.ts` est déjà codé, utilisé seulement en Finaliser.

**Prompt Cursor** :
> Crée `@src/components/workflow/steps/missing-terms-widget.tsx` qui :
> 1. Reçoit `knowledgeBase` + `plainText` courant
> 2. Appelle `tfidfMissing` depuis `@src/lib/seo/tfidf-missing.ts`
> 3. Affiche les 12 premiers termes absents sous forme de chips cliquables
> 4. Clic chip → copie presse-papier + toast
> 5. Barre de progression « Couverture : X / 12 termes clés »
>
> Intègre dans `WritingSeoPanel` (Tâche 1) sous `LiveScorePill`. Recalcul debounce 800 ms. Calcul dans un Web Worker dédié `@src/workers/tfidf.worker.ts` (ne pas réutiliser `seo.worker.ts`).
>
> **Acceptance** : termes concurrents absents visibles en Writing ; disparaissent quand intégrés ; pas de jank (worker confirmé).
>
> **Files** : nouveau `missing-terms-widget.tsx`, nouveau `tfidf.worker.ts`, `writing-seo-panel.tsx`.

---

## Tâche 8 — Vrais intervalles de titres (fixer le stub `headings-interval`)

**Pourquoi** : `structure.ts` retourne toujours ok si wordCount ≥ 150, le commentaire interne l'admet.

**Prompt Cursor** :
> Dans `@src/lib/seo/extract-structure.ts`, expose un nouveau champ `headingsWithWordOffsets: Array<{ level, text, wordOffset }>` dans le payload (nb de mots cumulé depuis le début).
>
> Dans `@src/lib/seo/structure.ts`, remplace le stub `headings-interval` :
> - Calcule les intervalles entre headings consécutifs
> - Cible : chaque intervalle ∈ [150, 350]
> - ok = 100% dans cible ; warn = ≥70% ; bad = <70%
> - Détail actionnable : « Section "X" trop longue (420 mots) — ajoutez un sous-titre »
>
> Test `structure.test.ts` : idéal, gros bloc sans heading, trop de headings.
>
> **Acceptance** : messages nommant la section fautive ; affichés dans l'expansion du critère `SeoPanel`.
>
> **Files** : `extract-structure.ts`, `structure.ts`, test.

---

## Tâche 9 — Export HTML complet : OG + Twitter + canonical + JSON-LD

**Pourquoi** : export actuel = HTML nu, inutilisable pour publication directe.

**Prompt Cursor** :
> Dans `@src/lib/html/export-article-html.ts`, étends `buildArticleHtmlDocument(meta, md, options)` avec un nouveau paramètre `seoMetadata: { focusKeyword, jsonLd?, ogImage?, canonicalUrl? }`. Injecte dans `<head>` :
> - `<meta name="description">`
> - `<link rel="canonical">` si `canonicalUrl`
> - Open Graph : `og:title`, `og:description`, `og:type=article`, `og:url`, `og:image`
> - Twitter Card : `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`
> - `<script type="application/ld+json">` avec JSON-LD reçu
>
> Adapte `@src/components/workflow/review/export-actions.tsx` : avant export HTML, récupère le dernier JSON-LD généré (state dans `StepFinalize` — à ajouter si besoin) et le passe.
>
> Ne casse pas Markdown/JSON existants.
>
> **Acceptance** : HTML exporté contient les 8 balises clés quand JSON-LD présent ; fichier s'ouvre sans erreur ; test `export-article-html.test.ts`.
>
> **Files** : `export-article-html.ts`, `export-actions.tsx`, nouveau test.

---

## Tâche 10 — Historique versions + diff IA

**Pourquoi** : copywriter doit pouvoir annuler une regénération ou comparer deux versions.

**Prompt Cursor** :
> Crée `@src/lib/storage/history-store.ts` stockant en **IndexedDB** (pas localStorage) :
> ```ts
> type Snapshot = {
>   id: string;
>   kind: 'manual' | 'ai-insert' | 'ai-rewrite';
>   content: Value;
>   meta: ArticleMeta;
>   brief: ArticleBrief;
>   createdAt: string;
>   label?: string;
> }
> ```
> API : `pushSnapshot`, `listSnapshots(slug)`, `getSnapshot(id)`, `deleteSnapshot(id)`, `clearOld(slug, keep=20)`.
>
> Dans `@src/app/editor/SeoEditor.tsx` : push `manual` toutes les 5 min si contenu changé, et `ai-insert`/`ai-rewrite` à chaque insertion IA (Tâche 5).
>
> Bouton « Historique » dans le header de `SeoEditor.tsx` → `@src/components/article/history-dialog.tsx` listant les 20 derniers : date, kind, label, « Restaurer » (avec confirmation).
>
> **Acceptance** : je peux régénérer, comparer, restaurer ; limite 20 snapshots/article (purge auto) ; pas de régression sauvegarde.
>
> **Files** : nouveau `history-store.ts`, `SeoEditor.tsx`, nouveau `history-dialog.tsx`.

---

## Ordre d'exécution et milestones

```
T1 ──┐
     ├── T7 (dépend de T1)
T2 ──┤
T3 ──┤
     ├── ✅ Milestone A : le rédacteur a un feedback live
T4 ──┘

T5 ──┐  (risquée — faire avant T6 sinon T6 devient jetable)
     │
T6 ──┤
     ├── ✅ Milestone B : IA inline + raccourcis + termes manquants
T7 ──┘

T8 ── standalone, rapide
T9 ── standalone
T10 ─ en dernier, dépend mentalement de T5
     ├── ✅ Milestone C : structure + export + historique
```

**Trois points de validation humaine** (A, B, C) avant de passer à la série suivante.

---

## Template de prompt pour lancer chaque tâche

À copier-coller dans Cursor, en remplaçant `<N>` et la section spec :

```
Ton objectif : exécuter la Tâche <N> du plan d'action REWOLF.

Contexte obligatoire à lire avant de coder :
- @.cursorrules
- @cahierdescharges/Cahier\ des\ charges.md (sections concernées uniquement)
- Les fichiers listés dans "Files" ci-dessous

Spec :
<copier le prompt complet de la tâche N>

Contraintes :
1. Ne touche QUE les fichiers listés. Si tu as besoin d'en modifier un autre, arrête-toi et explique pourquoi.
2. Ajoute les tests demandés avant de considérer la tâche terminée.
3. Termine par : `npm run lint && npm run test && npm run build`. Copie la sortie.
4. Propose UN seul commit `<type>(<scope>): <sujet>`.
5. AUCUN refactor non demandé.

Si une étape te bloque, pose UNE question concise plutôt que d'improviser.
```

---

## Budget de complexité

| Tâche | Complexité | Risque |
|---|---|---|
| T1 | Petite | Faible |
| T2 | Petite | Faible |
| T3 | Moyenne | Moyen (refacto densité) |
| T4 | Petite | Faible |
| T5 | **Grosse** | **Élevé** (streaming Plate AI) |
| T6 | Petite | Faible |
| T7 | Petite | Faible |
| T8 | Petite | Faible |
| T9 | Petite | Faible |
| T10 | Moyenne | Moyen (IndexedDB + dialog) |

**Règle** : si T5 déborde au-delà de 2 tentatives échouées, bascule sur le fallback (amélioration du mode `<pre>`). Mieux vaut ça qu'un éditeur cassé.
