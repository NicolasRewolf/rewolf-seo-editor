# Moteur SEO (worker) : yoastseo vs analyse actuelle

## Décision

**Conserver l’analyse maison** dans `src/workers/seo.worker.ts` et `src/lib/seo/analyzer.ts`, avec **text-readability-ts** pour la lisibilité, plutôt que d’intégrer **yoastseo** dans le Web Worker.

## Raisons

- **Cible linguistique** : yoastseo est historiquement orienté EN ; le produit vise le français (critères, libellés, benchmarks).
- **Worker / bundle** : embarquer yoast + dépendances alourdit le worker et complique le tree-shaking ; l’analyse actuelle est volontairement modulaire.
- **Contrôle métier** : les six dimensions et critères REWOLF (longueur vs benchmark Reader, intro, etc.) sont déjà alignés sur le produit.
- **Écart documenté** : le prompt initial mentionnait yoastseo comme référence ; l’implémentation suit la même idée (checklist SEO) avec des règles custom.

## Piste future

Si une convergence stricte avec yoast est requise, envisager un **mode optionnel** en poste de traitement (Node ou worker dédié) pour une sous-partie des règles, sans bloquer l’éditeur principal.
