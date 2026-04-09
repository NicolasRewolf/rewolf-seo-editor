# Tâche : Générer des tests Vitest

## Contexte

Tu dois générer des tests Vitest exhaustifs pour le fichier suivant :

**Fichier cible :** `{{file}}`

{{#if desc}}
**Instructions supplémentaires :**
{{desc}}
{{/if}}

## Ce que tu dois faire

1. **Lis le fichier source** à `{{root}}/{{file}}`
2. **Identifie toutes les fonctions exportées** et leurs cas d'usage
3. **Génère des tests** couvrant :
   - Cas nominaux (happy path)
   - Cas limites (strings vides, null/undefined, valeurs extrêmes)
   - Comportements spécifiques au français (accents, mots composés, apostrophes)
   - Edge cases métier SEO si applicable
4. **Sauvegarde le fichier de test** à côté du fichier source avec l'extension `.test.ts`
   - Ex : `src/lib/seo/eeat.ts` → `src/lib/seo/eeat.test.ts`
5. **Lance `npm run test`** pour vérifier que tous les tests passent
6. Si des tests échouent, corrige-les (sans modifier le fichier source sauf si c'est un bug évident)

## Contraintes

- Utiliser Vitest (`import { describe, it, expect } from 'vitest'`)
- Pas de mocks inutiles : tester la vraie logique
- Nommer les tests en français (description explicite)
- Viser une couverture > 80 % des branches

## Exemple de structure attendue

```typescript
import { describe, it, expect } from 'vitest';
import { maFonction } from './mon-fichier';

describe('maFonction', () => {
  it('retourne la valeur attendue pour une entrée standard', () => {
    expect(maFonction('entrée')).toBe('résultat attendu');
  });

  it('gère les accents et caractères spéciaux français', () => {
    expect(maFonction('éàü')).toBe('...');
  });

  it('retourne une valeur par défaut pour une entrée vide', () => {
    expect(maFonction('')).toBe(...);
  });
});
```

## Validation finale

```bash
npm run lint
npm run test
```

Les deux doivent passer sans erreur.
