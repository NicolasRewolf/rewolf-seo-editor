# Tâche : Audit de maintenance

{{#if desc}}
**Focus spécifique :** {{desc}}
{{/if}}

## Ce que tu dois faire

Effectue un audit de maintenance complet du projet REWOLF SEO Editor. Vérifie les points suivants dans l'ordre :

### 1. Dépendances

```bash
cd /home/user/rewolf-seo-editor
npm outdated
```

- Liste les dépendances obsolètes (majeure, mineure, patch)
- Identifie les mises à jour **safe** (patches, mineurs compatibles)
- Signale les mises à jour **risquées** (majeurs, breaking changes potentiels)
- Applique uniquement les patches sans breaking changes

### 2. Qualité du code

```bash
npm run lint
```

- Corrige toutes les erreurs ESLint
- Signale les warnings récurrents

### 3. Tests

```bash
npm run test
```

- Identifie les fichiers source sans couverture de tests dans `src/lib/`
- Liste les fonctions exportées non testées
- Génère des tests manquants pour les modules critiques (`src/lib/seo/`)

### 4. Build

```bash
npm run build
```

- Vérifie les erreurs TypeScript
- Corrige les erreurs de compilation si nécessaire

### 5. Code mort

Recherche :
- Les imports inutilisés dans les fichiers TypeScript
- Les exports non utilisés dans les modules
- Les fichiers dans `src/` qui ne sont importés nulle part

### 6. Rapport

Produis un rapport concis :

```markdown
## Rapport de maintenance REWOLF SEO Editor

### Dépendances mises à jour
- ...

### Erreurs corrigées
- ...

### Tests ajoutés
- ...

### Points d'attention (actions manuelles requises)
- ...
```

### 7. Validation finale

```bash
npm run lint && npm run test && npm run build
```

Tout doit passer avant de terminer.
