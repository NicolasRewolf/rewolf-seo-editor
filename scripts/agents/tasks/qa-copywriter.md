# Tâche : Simulation copywriter A→Z + rapport pain points

## Sujet de test

{{#if desc}}
Mot-clé principal : **{{desc}}**
{{else}}
Mot-clé principal : **meilleur logiciel comptabilité PME**
{{/if}}

---

## Objectif

Tu joues le rôle d'un copywriter SEO senior qui utilise REWOLF SEO Editor pour rédiger
un article de A à Z. Tu dois exécuter chaque étape du workflow réel, noter tout ce qui
frotte, ce qui manque, ce qui est lent ou confus, et produire un rapport structuré.

**Tu n'as pas accès à l'UI**. Tu travailles directement via l'API Hono (port 8787)
et le code source. C'est intentionnel : tu testes la robustesse du moteur, pas l'interface.

## Règle non négociable : TOOL-ONLY REWOLF

Tu dois utiliser UNIQUEMENT les outils/endpoints REWOLF pour toutes les étapes produit :
- `/api/health`
- `/api/serp/search`
- `/api/reader`
- `/api/ai/stream`
- `/api/ai/object`

Interdits :
- `web_fetch`, `web_search`, ou toute récupération web hors `/api/reader`
- génération IA hors `/api/ai/stream` ou `/api/ai/object`
- fallback "capacité native" si une route échoue

Si un endpoint échoue ou si une clé API manque, tu t'arrêtes avec un **BLOCKER** explicite
au lieu d'improviser.

## Mode d'exécution : PEIGNE FIN + FAIL-FAST

Tu dois tester les fonctionnalités une par une, dans l'ordre, avec preuve de résultat.

Définition de "comportement étrange" (BLOCKER immédiat) :
- HTTP non-2xx sur un endpoint requis
- réponse vide ou non-JSON quand JSON attendu
- schéma de réponse incohérent (champ critique manquant)
- latence excessive (> 20s) sans stream utile
- résultat manifestement hors sujet par rapport à l'étape

Règle :
- Au premier comportement étrange, ARRÊTE-TOI immédiatement.
- Publie un bloc `BLOCKER` avec : endpoint, payload, extrait réponse, hypothèse cause.
- N'essaie jamais de contourner via un autre outil.

## Contrainte absolue (très important)

- N'initialise JAMAIS un nouveau projet.
- N'écris pas de scaffold React/Vite depuis zéro.
- Utilise UNIQUEMENT le repo officiel :
  `https://github.com/NicolasRewolf/rewolf-seo-editor.git`

## Bootstrap workspace (Managed Agents cloud)

```bash
set -e
REPO_URL="https://github.com/NicolasRewolf/rewolf-seo-editor.git"
WORKDIR="/home/user/rewolf-seo-editor"

if [ ! -d "$WORKDIR/.git" ]; then
  git clone "$REPO_URL" "$WORKDIR"
fi

cd "$WORKDIR"
pwd
ls

# Injecter les clés runtime dans le workspace cloud (si disponibles)
export ANTHROPIC_API_KEY="{{anthropic_api_key}}"
export OPENAI_API_KEY="{{openai_api_key}}"
export SERPER_API_KEY="{{serper_api_key}}"

cat > .env <<'EOF'
ANTHROPIC_API_KEY={{anthropic_api_key}}
OPENAI_API_KEY={{openai_api_key}}
SERPER_API_KEY={{serper_api_key}}
EOF

npm ci

# Préflight strict : clés obligatoires pour QA tool-only
if [ -z "$SERPER_API_KEY" ]; then
  echo "BLOCKER: SERPER_API_KEY manquante"
  exit 42
fi
if [ -z "$ANTHROPIC_API_KEY" ] && [ -z "$OPENAI_API_KEY" ]; then
  echo "BLOCKER: ANTHROPIC_API_KEY ou OPENAI_API_KEY manquante"
  exit 42
fi
```

Si ce bootstrap échoue, ARRÊTE-TOI et renvoie un blocage clair (ne pas scaffold).

---

## Étape 0 — Vérification de l'environnement

```bash
cd /home/user/rewolf-seo-editor

# Vérifier que le serveur tourne
curl -s http://127.0.0.1:8787/api/health | head -5 || echo "SERVEUR ÉTEINT"

# Si éteint, le démarrer en arrière-plan
npm run server &
sleep 3
curl -s http://127.0.0.1:8787/api/health
```

Note : quelles clés API sont disponibles (Anthropic, OpenAI, Serper) ?
Si `SERPER_API_KEY` est absente, ou si `ANTHROPIC_API_KEY` et `OPENAI_API_KEY` sont
toutes deux absentes, arrête-toi avec un BLOCKER.

---

## Étape 1 — Recherche SERP (Data)

```bash
curl -s -X POST http://127.0.0.1:8787/api/serp/search \
  -H "Content-Type: application/json" \
  -d '{"q": "{{desc}}", "gl": "fr", "hl": "fr", "num": 10}'
```

**Observer et noter :**
- Temps de réponse
- Qualité des résultats (pertinence, diversité)
- Données manquantes (volumes, CPC, featured snippets ?)
- Erreurs éventuelles

---

## Étape 1b — Corpus concurrent (SERP enrichi)

```bash
curl -s -X POST http://127.0.0.1:8787/api/serp/competitor-corpus \
  -H "Content-Type: application/json" \
  -d '{"q": "{{desc}}", "gl": "fr", "hl": "fr", "num": 10, "maxFetch": 3}'
```

**Observer :**
- `organicUrls` présent et non vide
- `pages` présent avec au moins 1 `ok: true`
- `wordCount` cohérent (> 200 si page longue)

---

## Étape 2 — Extraction d'une source concurrente (Reader)

Prendre la première URL des résultats SERP et l'extraire :

```bash
curl -s "http://127.0.0.1:8787/api/reader?url=<URL_DU_PREMIER_RÉSULTAT>&markdown=1"
```

**Observer :**
- Qualité du texte extrait (propre ? tronqué ?)
- Titres bien détectés ?
- Longueur du contenu

---

## Étape 2b — Persistance article (Articles API)

Tester le CRUD minimal de l'outil :

```bash
# 1) Liste
curl -s http://127.0.0.1:8787/api/articles

# 2) Sauvegarde d'un brouillon de test
curl -s -X PUT http://127.0.0.1:8787/api/articles/qa-managed-agent \
  -H "Content-Type: application/json" \
  -d '{
    "meta": {
      "metaTitle": "QA Managed Agent",
      "metaDescription": "Draft QA",
      "slug": "qa-managed-agent",
      "slugLocked": true
    },
    "brief": {
      "focusKeyword": "{{desc}}",
      "longTailKeywords": [],
      "searchIntent": "informational",
      "funnelStage": "awareness",
      "targetAudience": "Test",
      "destinationUrl": "",
      "brandVoice": "",
      "businessGoal": ""
    },
    "content": [],
    "seoScore": null
  }'

# 3) Lecture
curl -s http://127.0.0.1:8787/api/articles/qa-managed-agent
```

**Observer :**
- PUT retourne `{ ok: true }`
- GET retourne `meta.slug = qa-managed-agent`
- `updatedAt` présent

---

## Étape 3 — Génération du Brief

```bash
curl -s -X POST http://127.0.0.1:8787/api/ai/stream \
  -H "Content-Type: application/json" \
  -d '{
    "taskGroup": "quality",
    "messages": [
      {
        "role": "system",
        "content": "Tu es un stratège SEO. Génère un brief pour un article sur le mot-clé donné. Format : intention de recherche, audience cible, angle différenciant, 5 points clés à couvrir, 8 longues traînes associées."
      },
      {
        "role": "user",
        "content": "Mot-clé : {{desc}}"
      }
    ]
  }'
```

**Observer :**
- Qualité et pertinence du brief
- Temps de génération
- Le brief est-il actionnable pour un copywriter ?
- Ce qui manque dans le brief

---

## Étape 4 — Génération du Plan (Outline)

En utilisant le brief précédent, générer un plan d'article :

```bash
curl -s -X POST http://127.0.0.1:8787/api/ai/stream \
  -H "Content-Type: application/json" \
  -d '{
    "taskGroup": "quality",
    "messages": [
      {
        "role": "system",
        "content": "Tu es un architecte SEO. Génère un plan Markdown (H2/H3) pour un article de 2000 mots. Le mot-clé principal doit apparaître dans le H1 et 2 H2 minimum. 5 à 7 H2."
      },
      {
        "role": "user",
        "content": "Mot-clé : {{desc}}\n\nBrief : [résumé du brief généré à l'\''étape précédente]"
      }
    ]
  }'
```

**Observer :**
- Structure du plan (logique, SEO-friendly ?)
- H2/H3 bien dosés ?
- Longue traîne intégrée ?

---

## Étape 5 — Rédaction d'une section complète

Rédiger la première section H2 du plan :

```bash
curl -s -X POST http://127.0.0.1:8787/api/ai/stream \
  -H "Content-Type: application/json" \
  -d '{
    "taskGroup": "quality",
    "messages": [
      {
        "role": "system",
        "content": "Tu es un rédacteur SEO expert. Rédige la section indiquée. Paragraphes de 2-4 phrases, phrases < 25 mots, ton neutre mais expert, mot-clé principal 0.5-0.8% densité."
      },
      {
        "role": "user",
        "content": "Section : [premier H2 du plan]\nMot-clé : {{desc}}\nLongueur cible : 350 mots"
      }
    ]
  }'
```

**Observer :**
- Qualité rédactionnelle
- Densité du mot-clé (calculer manuellement)
- Lisibilité (phrases courtes ?)
- Présence de faits concrets vs contenu générique

---

## Étape 6 — Analyse SEO du contenu généré

Lire et exécuter directement l'analyseur SEO :

```bash
cd /home/user/rewolf-seo-editor
node -e "
import('./src/lib/seo/analyzer.js').then(({ analyzeSeo }) => {
  const result = analyzeSeo({
    html: '<h1>{{desc}}</h1><p>[Contenu généré étape 5]</p>',
    focusKeyword: '{{desc}}',
    metaTitle: '{{desc}} — Guide complet',
    metaDescription: 'Découvrez notre guide complet sur {{desc}}.',
    wordCount: 350
  });
  console.log(JSON.stringify(result, null, 2));
});
" 2>&1 || echo "Analyser non disponible directement — tester via UI"
```

Si non disponible directement, noter que le score SEO n'est pas testable sans l'UI.

---

## Étape 7 — Génération Meta (SEO Object)

```bash
curl -s -X POST http://127.0.0.1:8787/api/ai/object \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "meta-scored",
    "context": "Mot-clé : {{desc}}\nArticle sur [résumé du contenu]"
  }'
```

**Observer :**
- 3 variantes de title + description ?
- Scores cohérents ?
- Longueurs dans les limites (title ≤ 60 car, description ≤ 160 car) ?

---

## Étape 8 — Génération JSON-LD

```bash
curl -s -X POST http://127.0.0.1:8787/api/ai/object \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "jsonld-bundle",
    "context": "Mot-clé : {{desc}}\nArticle : [contenu résumé]"
  }'
```

**Observer :**
- BlogPosting correct ?
- FAQPage généré si contenu FAQ ?
- HowTo généré si contenu procédural ?

---

## Étape 9 — Mesures de performance

Pour chaque étape, noter :
- Temps de réponse API (en secondes)
- Nombre de tokens estimés
- Si timeout ou erreur

```bash
# Timer automatique
time curl -s -X POST http://127.0.0.1:8787/api/ai/stream \
  -H "Content-Type: application/json" \
  -d '{ "taskGroup": "fast", "messages": [{"role": "user", "content": "test ping"}] }' \
  > /dev/null
```

---

## Rapport final attendu

Produis un rapport structuré en français avec ces sections :

```markdown
# Rapport QA Copywriter — REWOLF SEO Editor
**Mot-clé testé :** {{desc}}
**Date :** [date]

## ✅ Ce qui fonctionne bien
- [liste des points positifs avec détails]

## ⚠️ Frictions et pain points
- [chaque problème avec : description, étape concernée, impact sur l'expérience]

## ❌ Bugs ou erreurs rencontrés
- [erreurs API, timeouts, outputs incorrects]

## 🚫 BLOCKER (si arrêt anticipé)
- Étape :
- Endpoint :
- Payload :
- Réponse brute (extrait) :
- Cause probable :
- Action corrective proposée :

## 🔧 Suggestions d'amélioration (priorité 1-3)
### Priorité 1 — Critique
- ...
### Priorité 2 — Important
- ...
### Priorité 3 — Nice-to-have
- ...

## ⏱️ Performance
| Étape | Temps | Note |
|-------|-------|------|
| SERP  | x.xs  | ...  |
| Brief | x.xs  | ...  |
| Plan  | x.xs  | ...  |
| Section | x.xs | ... |
| Meta  | x.xs  | ...  |

## 📊 Verdict global
Score sur 10 : X/10
Résumé en 3 phrases de l'expérience copywriter.
```

Ajoute cette section obligatoire à la fin :

```markdown
## Compliance TOOL-ONLY REWOLF
- Endpoints REWOLF utilisés (liste exhaustive) :
- Outils non-REWOLF utilisés : (doit être "aucun")
- Fallback natif hors outil : (doit être "non")
```

Ajoute aussi une checklist stricte :

```markdown
## Checklist couverture endpoints (PASS/FAIL)
- GET /api/health :
- POST /api/serp/search :
- POST /api/serp/competitor-corpus :
- GET /api/reader :
- POST /api/ai/stream :
- POST /api/ai/object :
- GET /api/articles :
- PUT /api/articles/:slug :
- GET /api/articles/:slug :
```
