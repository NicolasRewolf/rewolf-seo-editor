# Tâche : Benchmark — Reproduire un article performant

## Article de référence

**URL :** {{desc}}
**Mot-clé principal :** à extraire de l'article

---

## Objectif

Tu dois :
1. Analyser l'article existant (le "gold standard" qui performe en SEO)
2. Générer un article concurrent sur le même sujet depuis zéro
3. Comparer les deux avec un scorecard détaillé

## Règle non négociable : TOOL-ONLY REWOLF

Tu dois utiliser UNIQUEMENT les endpoints REWOLF :
- `/api/health`
- `/api/reader`
- `/api/serp/search`
- `/api/ai/stream`

Interdits :
- `web_fetch`, `web_search`, fallback natif, ou génération hors `/api/ai/stream`

Si une clé manque, si un endpoint échoue, ou si le schéma de réponse est invalide :
➡️ STOP immédiat avec un BLOCKER explicite.

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

# Préflight strict : clés obligatoires pour benchmark tool-only
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

## Étape 1 — Récupérer et analyser l'article de référence

```bash
curl -s -X POST http://127.0.0.1:8787/api/reader \
  -H "Content-Type: application/json" \
  -d '{"url": "{{desc}}"}'
```

À partir du contenu extrait, note :
- **Titre H1**
- **Mot-clé principal** (le plus répété)
- **Nombre de mots** (approximatif)
- **Structure** (liste tous les H2 et H3)
- **Densité mot-clé** (occurrences / total mots × 100)
- **Nombre de liens internes** (si visibles)
- **Présence FAQ** (questions/réponses ?)
- **Marqueurs E-E-A-T** (citations légales, jurisprudence, "en pratique"...)
- **Ton** (expert ? accessible ? rassurant ?)
- **Longueur des paragraphes** (courts < 4 phrases ? longs ?)
- **Appels à l'action** (CTA vers cabinet, consultation...)

---

## Étape 2 — Recherche SERP sur le même mot-clé

```bash
curl -s -X POST http://127.0.0.1:8787/api/serp/search \
  -H "Content-Type: application/json" \
  -d '{"query": "[MOT-CLÉ EXTRAIT]", "gl": "fr", "hl": "fr", "num": 5}'
```

Note : l'article de référence apparaît-il dans les résultats ? À quelle position ?

---

## Étape 3 — Générer un article concurrent depuis zéro

### 3a. Générer le plan

```bash
curl -s -X POST http://127.0.0.1:8787/api/ai/stream \
  -H "Content-Type: application/json" \
  -d '{
    "taskGroup": "quality",
    "messages": [
      {
        "role": "system",
        "content": "Tu es un architecte SEO expert. Génère un plan Markdown (H1, H2, H3) pour un article juridique qui vise à surclasser les concurrents sur le mot-clé donné. Cible un avocat pénaliste comme auteur. 6-8 H2, 2-3 H3 par H2. Le H1 doit contenir le mot-clé exact. Premier H2 = réponse directe optimisée featured snippet."
      },
      {
        "role": "user",
        "content": "Mot-clé : [MOT-CLÉ EXTRAIT]\nContexte : article juridique grand public, ton accessible mais expert, cible des justiciables ou proches de gardés à vue"
      }
    ]
  }'
```

### 3b. Rédiger l'introduction + 2 premières sections

```bash
curl -s -X POST http://127.0.0.1:8787/api/ai/stream \
  -H "Content-Type: application/json" \
  -d '{
    "taskGroup": "quality",
    "messages": [
      {
        "role": "system",
        "content": "Tu es un rédacteur SEO expert travaillant pour un cabinet d'\''avocat pénaliste français. Tu rédiges en français, ton professionnel mais accessible. Phrases < 25 mots. Paragraphes 2-4 phrases. Intègre des références légales précises (CPP, articles de loi). Commence par une réponse directe de 50 mots max (featured snippet). Utilise des marqueurs E-E-A-T : citations légales, jurisprudence, exemples pratiques."
      },
      {
        "role": "user",
        "content": "Rédige l'\''introduction + les 2 premières sections H2 du plan suivant :\n[PLAN GÉNÉRÉ EN 3a]\n\nMot-clé principal : [MOT-CLÉ EXTRAIT]\nLongueur cible totale : 1800-2200 mots"
      }
    ]
  }'
```

---

## Étape 4 — Scorecard comparatif

Produis un tableau de comparaison :

| Critère | Article référence | Article généré | Gagnant |
|---------|-------------------|----------------|---------|
| Longueur (mots) | ? | ? | ? |
| Nombre de H2 | ? | ? | ? |
| Nombre de H3 | ? | ? | ? |
| Densité mot-clé | ?% | ?% | ? |
| Références légales (CPP, etc.) | ? | ? | ? |
| Marqueurs E-E-A-T | ? | ? | ? |
| FAQ présente | oui/non | oui/non | ? |
| Réponse directe (featured snippet) | oui/non | oui/non | ? |
| CTA cabinet | oui/non | oui/non | ? |
| Lisibilité (ton) | ? | ? | ? |

---

## Rapport final

Réponds à ces questions :

**1. Ce que l'article original fait mieux que l'IA :**
(contenu unique, expérience personnelle, données propriétaires, tournures naturelles...)

**2. Ce que l'IA fait mieux ou différemment :**
(structure, couverture des variantes, optimisation featured snippet...)

**3. L'écart de qualité sur une échelle 1-10 :**
- Article original : ?/10
- Article généré : ?/10
- Écart : ? points

**4. Ce qu'il faudrait ajouter au prompt ou au workflow pour combler l'écart :**
(maximum 5 suggestions concrètes et actionnables)

**5. Verdict : est-ce que l'IA peut rivaliser avec cet article sur Google ?**
(oui / non / partiellement — avec justification)
