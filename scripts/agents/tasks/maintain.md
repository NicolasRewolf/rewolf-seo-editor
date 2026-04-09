# Tâche : Audit de maintenance

{{#if desc}}
**Focus spécifique :** {{desc}}
{{/if}}

## Contrainte absolue (très important)

- N'initialise JAMAIS un nouveau projet.
- N'écris pas de scaffold React/Vite depuis zéro.
- Travaille UNIQUEMENT sur le repo existant à ce chemin :

```bash
cd {{root}}
pwd
ls
```

- Si le dossier n'existe pas ou n'est pas un repo Git, ARRÊTE-TOI et renvoie un blocage clair au lieu de scaffold.

## Ce que tu dois faire

Effectue un audit de maintenance complet du projet REWOLF SEO Editor. Vérifie les points suivants dans l'ordre :

### 1. Dépendances

```bash
cd {{root}}
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
