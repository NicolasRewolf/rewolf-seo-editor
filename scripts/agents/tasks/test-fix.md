# Tâche : Corriger les tests en échec

## Contexte

Des tests Vitest échouent. Tu dois les analyser et les corriger.

## Output des tests (à analyser)

```
{{desc}}
```

## Ce que tu dois faire

1. **Analyse l'output** des tests ci-dessus pour identifier :
   - Quels tests échouent
   - Dans quels fichiers
   - Quelle est l'erreur (assertion, exception, timeout, etc.)

2. **Lis les fichiers concernés** :
   - Le fichier de test (`.test.ts`)
   - Le fichier source correspondant

3. **Détermine la cause** :
   - Est-ce le test qui est incorrect (mauvaise assertion, données incorrectes) ?
   - Est-ce le code source qui est bugué ?
   - Est-ce un problème d'import ou de configuration ?

4. **Corrige** :
   - Priorité : corriger le code source si c'est un vrai bug
   - Si c'est le test qui est mal écrit, corrige le test
   - Ne jamais supprimer un test pour qu'il "passe"

5. **Rerun les tests** pour confirmer que tout passe :
   ```bash
   npm run test
   ```

6. **Lance aussi lint et build** :
   ```bash
   npm run lint
   npm run build
   ```

## Contraintes

- Ne pas modifier l'API publique des modules sans raison majeure
- Ne pas désactiver de tests avec `it.skip` sauf si clairement documenté
- Conserver le comportement français (accents, ponctuation, etc.)
