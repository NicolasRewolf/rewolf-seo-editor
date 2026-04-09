# Tâche : Implémenter une nouvelle feature

## Description de la feature

{{desc}}

{{#if file}}
**Fichier(s) concerné(s) :** `{{file}}`
{{/if}}

## Ce que tu dois faire

### 1. Comprendre le contexte

Avant de coder, lis les fichiers pertinents :
- `src/app/editor/SeoEditor.tsx` — point d'entrée de l'éditeur
- `src/lib/seo/analyzer.ts` — si la feature touche au SEO
- Les fichiers dans `src/components/workflow/` — si la feature touche au workflow
- `server/routes/` — si la feature nécessite un endpoint serveur

### 2. Planifier l'implémentation

Identifie :
- Les fichiers à modifier (préférer modifier l'existant à créer du nouveau)
- Les types TypeScript à créer ou étendre (`src/types/`)
- Si un Web Worker est nécessaire pour l'analyse
- Si des tests Vitest sont nécessaires (oui pour toute logique pure)

### 3. Implémenter

Respecter ces principes :
- Pas de nouveau fichier sans nécessité absolue
- Pas de state global (zustand/redux) — props depuis SeoEditor.tsx
- Streaming obligatoire via `streamText()` si l'output IA va dans l'éditeur
- UI en français (labels, messages, tooltips)
- Debounce 500 ms pour les analyses live

### 4. Tests

Si la feature contient de la logique pure (calcul, transformation, parsing) :
- Créer un fichier `.test.ts` à côté du module
- Couvrir les cas nominaux + edge cases + spécificités françaises

### 5. Validation

```bash
npm run lint    # 0 erreur
npm run test    # tous les tests passent
npm run build   # compilation sans erreur
```

### 6. Commit

Format : `feat(<scope>): <description courte en français>`
