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
npm ci
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

---

## Étape 1 — Recherche SERP (Data)

```bash
curl -s -X POST http://127.0.0.1:8787/api/serp/search \
  -H "Content-Type: application/json" \
  -d '{"query": "{{desc}}", "gl": "fr", "hl": "fr", "num": 10}'
```

**Observer et noter :**
- Temps de réponse
- Qualité des résultats (pertinence, diversité)
- Données manquantes (volumes, CPC, featured snippets ?)
- Erreurs éventuelles

---

## Étape 2 — Extraction d'une source concurrente (Reader)

Prendre la première URL des résultats SERP et l'extraire :

```bash
curl -s -X POST http://127.0.0.1:8787/api/reader \
  -H "Content-Type: application/json" \
  -d '{"url": "<URL_DU_PREMIER_RÉSULTAT>"}'
```

**Observer :**
- Qualité du texte extrait (propre ? tronqué ?)
- Titres bien détectés ?
- Longueur du contenu

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
