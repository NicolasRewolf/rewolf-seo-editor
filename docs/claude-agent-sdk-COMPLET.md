# Claude Agent SDK — Référence complète pour Cursor

> Toutes les pages officielles consolidées en un seul fichier  
> Source : https://platform.claude.com/docs/en/agent-sdk/  
> Dernière mise à jour : avril 2026  
> ⚠️ Anciennement "Claude Code SDK" — renommé en Claude Agent SDK v0.1.0

---

## TABLE DES MATIÈRES

1. [Vue d'ensemble & positionnement](#1-vue-densemble--positionnement)
2. [Installation & auth](#2-installation--auth)
3. [Exemple minimal](#3-exemple-minimal)
4. [La boucle agentique en détail](#4-la-boucle-agentique-en-détail)
5. [Types de messages](#5-types-de-messages)
6. [Options (ClaudeAgentOptions)](#6-options-claudeagentoptions)
7. [Outils built-in](#7-outils-built-in)
8. [Permissions — évaluation et modes](#8-permissions--évaluation-et-modes)
9. [Sessions — continue, resume, fork](#9-sessions--continue-resume-fork)
10. [MCP Servers](#10-mcp-servers)
11. [Outils custom (in-process MCP)](#11-outils-custom-in-process-mcp)
12. [Hooks](#12-hooks)
13. [Subagents](#13-subagents)
14. [Structured Outputs](#14-structured-outputs)
15. [Gestion du contexte & compaction](#15-gestion-du-contexte--compaction)
16. [Cost tracking](#16-cost-tracking)
17. [Hosting & déploiement](#17-hosting--déploiement)
18. [Features Claude Code (filesystem)](#18-features-claude-code-filesystem)
19. [Migration depuis claude-code-sdk](#19-migration-depuis-claude-code-sdk)
20. [Claude Managed Agents (API cloud beta)](#20-claude-managed-agents-api-cloud-beta)
21. [Liens de référence](#21-liens-de-référence)

---

## 1. Vue d'ensemble & positionnement

Le **Claude Agent SDK** est la librairie Anthropic pour construire des agents autonomes en Python et TypeScript. Il expose la même boucle agentique et les mêmes outils que Claude Code, de façon programmable.

**Ce que fait l'agent** : lire des fichiers, exécuter des commandes shell, chercher sur le web, modifier du code, appeler des MCP servers — sans que tu implémentes la boucle d'outils toi-même.

### Comparaison des options

| | Messages API | Agent SDK |
|---|---|---|
| Quoi | Accès direct au modèle | Boucle agentique + outils intégrés |
| Pour | Contrôle fin, custom agent loops | Tâches longues et autonomes |
| Infrastructure | Tu gères tout | SDK gère l'orchestration |

### Packages

| | TypeScript | Python |
|---|---|---|
| Nouveau (actuel) | `@anthropic-ai/claude-agent-sdk` | `claude-agent-sdk` |
| Ancien (déprécié) | `@anthropic-ai/claude-code` | `claude-code-sdk` |

---

## 2. Installation & auth

### Python

```bash
pip install claude-agent-sdk
# ou avec uv :
uv add claude-agent-sdk
```

### TypeScript / Node.js (18+ requis)

```bash
npm install @anthropic-ai/claude-agent-sdk
```

### Clé API

```bash
export ANTHROPIC_API_KEY=your-api-key
# ou .env :
ANTHROPIC_API_KEY=your-api-key
```

### Auth alternatives (3rd-party)

```bash
# Amazon Bedrock
CLAUDE_CODE_USE_BEDROCK=1
# + credentials AWS

# Google Vertex AI
CLAUDE_CODE_USE_VERTEX=1
# + credentials GCP

# Microsoft Azure
CLAUDE_CODE_USE_FOUNDRY=1
# + credentials Azure
```

⚠️ Anthropic ne permet pas aux devs tiers d'utiliser le login claude.ai ou ses rate limits pour leurs propres produits. Utiliser l'auth API key.

---

## 3. Exemple minimal

### Python

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, AssistantMessage, ResultMessage

async def main():
    async for message in query(
        prompt="Find and fix the bug in auth.py",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Edit", "Bash"],
            permission_mode="acceptEdits",
        ),
    ):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if hasattr(block, "text"):
                    print(block.text)       # raisonnement de Claude
                elif hasattr(block, "name"):
                    print(f"Tool: {block.name}")  # tool call
        elif isinstance(message, ResultMessage):
            print(f"Done: {message.subtype}")
            if message.total_cost_usd is not None:
                print(f"Cost: ${message.total_cost_usd:.4f}")

asyncio.run(main())
```

### TypeScript

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Find and fix the bug in auth.py",
  options: {
    allowedTools: ["Read", "Edit", "Bash"],
    permissionMode: "acceptEdits",
  },
})) {
  if (message.type === "result") {
    console.log(message.subtype, message.result);
    console.log(`Cost: $${message.total_cost_usd}`);
  }
}
```

### ClaudeSDKClient (multi-turn Python)

```python
import asyncio
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions, AssistantMessage, ResultMessage, TextBlock

async def main():
    options = ClaudeAgentOptions(allowed_tools=["Read", "Edit", "Glob"])
    
    async with ClaudeSDKClient(options=options) as client:
        # 1er tour
        await client.query("Analyze the auth module")
        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(block.text)
        
        # 2e tour — même session automatiquement
        await client.query("Now refactor it to use JWT")
        async for message in client.receive_response():
            if isinstance(message, ResultMessage):
                print(message.result)

asyncio.run(main())
```

---

## 4. La boucle agentique en détail

### Cycle complet

1. **Receive prompt** → SDK yield `SystemMessage(subtype="init")` avec métadonnées de session
2. **Evaluate & respond** → Claude choisit outils ou répond en texte → SDK yield `AssistantMessage`
3. **Execute tools** → SDK exécute les outils → `UserMessage` avec résultats → retour en 2
4. **Repeat** — chaque cycle = 1 "turn". Continue tant que Claude fait des tool calls
5. **Return result** → `AssistantMessage` final (sans tool calls) + `ResultMessage` avec texte, usage, coût, session_id

### Exemple de session multi-turns

Pour le prompt "Fix the failing tests in auth.ts" :
- **Turn 1** : Claude call `Bash(npm test)` → 3 failures
- **Turn 2** : Claude call `Read(auth.ts)` + `Read(auth.test.ts)`
- **Turn 3** : Claude call `Edit(auth.ts)` puis `Bash(npm test)` → all pass
- **Turn final** : Claude répond en texte seulement → `ResultMessage`

### Limites de la boucle

```python
options = ClaudeAgentOptions(
    max_turns=30,           # limite le nombre de turns (tool-use seulement)
    max_budget_usd=1.0,     # limite par coût
    effort="high",          # niveau de raisonnement : "low" | "medium" | "high" | "max"
)
```

| Option | Défaut | Impact |
|---|---|---|
| `max_turns` / `maxTurns` | Aucun | Stop après N turns tool-use |
| `max_budget_usd` / `maxBudgetUsd` | Aucun | Stop quand budget atteint |

---

## 5. Types de messages

| Type | Quand | Contenu |
|---|---|---|
| `SystemMessage` | Début de session + après compaction | `subtype="init"` (métadonnées) ou `"compact_boundary"` |
| `AssistantMessage` | Après chaque réponse Claude | Blocs texte + tool calls |
| `UserMessage` | Après chaque exécution d'outil | Résultats des outils |
| `StreamEvent` | Si streaming activé | Événements API bruts (deltas) |
| `ResultMessage` | Dernier message, toujours | Résultat final, usage, coût, session_id |

### ResultMessage — subtypes

| Subtype | Que s'est-il passé | `result` dispo ? |
|---|---|---|
| `success` | Tâche terminée normalement | ✅ oui |
| `error_max_turns` | Limite de turns atteinte | ❌ |
| `error_max_budget_usd` | Budget dépassé | ❌ |
| `error_during_execution` | Erreur API ou interruption | ❌ |
| `error_max_structured_output_retries` | Échec validation structured output | ❌ |

```python
if isinstance(message, ResultMessage):
    if message.subtype == "success":
        print(message.result)
    elif message.subtype == "error_max_turns":
        print(f"Reprendre session {message.session_id} avec plus de turns")
    if message.total_cost_usd is not None:
        print(f"${message.total_cost_usd:.4f}")
```

Le champ `stop_reason` (str | None) indique pourquoi le modèle s'est arrêté : `"end_turn"`, `"max_tokens"`, `"refusal"`.

### Récupérer les messages en Python (isinstance)

```python
from claude_agent_sdk import (
    SystemMessage, AssistantMessage, UserMessage, ResultMessage,
    TextBlock, ToolUseBlock
)

async for message in query(...):
    if isinstance(message, AssistantMessage):
        for block in message.content:
            if isinstance(block, TextBlock):
                print(block.text)
            elif isinstance(block, ToolUseBlock):
                print(f"Tool: {block.name}({block.input})")
    elif isinstance(message, ResultMessage):
        ...
```

### En TypeScript (champ .type)

```typescript
for await (const message of query(...)) {
  if (message.type === "assistant") {
    // message.message.content — attention: wrappé dans .message !
    for (const block of message.message.content) {
      if (block.type === "text") console.log(block.text);
    }
  }
  if (message.type === "result") {
    console.log(message.subtype, message.result);
  }
}
```

---

## 6. Options (ClaudeAgentOptions)

### Toutes les options

| Option Python | Option TS | Type | Description |
|---|---|---|---|
| `allowed_tools` | `allowedTools` | `list[str]` | Outils auto-approuvés sans prompt |
| `disallowed_tools` | `disallowedTools` | `list[str]` | Outils toujours bloqués |
| `permission_mode` | `permissionMode` | `str` | Mode de permissions (§8) |
| `system_prompt` | `systemPrompt` | `str \| dict` | System prompt custom. `{"type":"preset","preset":"claude_code"}` pour le prompt Claude Code |
| `max_turns` | `maxTurns` | `int` | Limite de turns |
| `max_budget_usd` | `maxBudgetUsd` | `float` | Budget max en USD |
| `effort` | `effort` | `str` | Niveau de raisonnement : `"low"` `"medium"` `"high"` `"max"` |
| `model` | `model` | `str` | Modèle (ex: `"claude-sonnet-4-6"`) |
| `mcp_servers` | `mcpServers` | `dict` | Serveurs MCP |
| `agents` | `agents` | `dict` | Définitions de subagents |
| `hooks` | `hooks` | `dict` | Callbacks hooks |
| `setting_sources` | `settingSources` | `list[str]` | Sources config filesystem : `["user","project","local"]` |
| `output_format` | `outputFormat` | `dict` | Structured output schema |
| `resume` | `resume` | `str` | Session ID à reprendre |
| `continue_conversation` | `continue` | `bool` | Reprendre la dernière session du CWD |
| `fork_session` | `fork` | `bool` | Forker la session (+ `resume`) |
| `persist_session` | `persistSession` | `bool` | TS only — false = session en mémoire seulement |

### Effort levels

| Level | Comportement | Bon pour |
|---|---|---|
| `"low"` | Raisonnement minimal, rapide | Lookups, listing |
| `"medium"` | Équilibré | Éditions routinières |
| `"high"` | Analyse approfondie (défaut TS) | Refactoring, debug |
| `"max"` | Profondeur maximale | Multi-étapes complexes |

> Python : si `effort` non défini → comportement par défaut du modèle. TS : défaut `"high"`.
> `effort` est distinct d'Extended Thinking — les deux sont indépendants.

---

## 7. Outils built-in

### Liste complète

| Outil | Catégorie | Description |
|---|---|---|
| `Read` | File ops | Lire un fichier |
| `Edit` | File ops | Modifier un fichier (édition in-place) |
| `Write` | File ops | Créer/écraser un fichier |
| `Glob` | Search | Recherche de fichiers par pattern |
| `Grep` | Search | Recherche regex dans le contenu |
| `Bash` | Execution | Commandes shell, scripts, git |
| `WebSearch` | Web | Recherche web |
| `WebFetch` | Web | Récupérer et parser une URL |
| `ToolSearch` | Discovery | Charger des outils à la demande (évite de tout précharger) |
| `Task` / `Agent` | Orchestration | Spawner des subagents |
| `Skill` | Orchestration | Invoquer des skills |
| `AskUserQuestion` | Orchestration | Poser une question à l'utilisateur |
| `TodoWrite` | Orchestration | Tracker des tâches |

> Note : `Task` a été renommé `Agent` depuis Claude Code v2.1.63. Dans les tool_use blocks, les deux noms peuvent apparaître selon la version.

### Combinaisons typiques

| Outils | Usage |
|---|---|
| `Read`, `Glob`, `Grep` | Analyse lecture seule |
| `Read`, `Edit`, `Glob` | Analyser + modifier code |
| `Read`, `Edit`, `Bash`, `Glob`, `Grep` | Automatisation complète |
| `Read`, `Edit`, `Bash`, `Glob`, `Grep`, `WebSearch` | + capacité web |

### Exécution parallèle des outils

Les outils **read-only** (`Read`, `Glob`, `Grep`, MCP marqués read-only) peuvent s'exécuter en parallèle. Les outils **modifiant l'état** (`Edit`, `Write`, `Bash`) s'exécutent en séquentiel pour éviter les conflits.

Les outils custom sont séquentiels par défaut. Pour activer le parallélisme, marquer `readOnlyHint=True` (Python) ou `readOnly: true` (TS) dans les annotations.

---

## 8. Permissions — évaluation et modes

### Ordre d'évaluation (priorité décroissante)

1. **Hooks** → peuvent allow / deny / passer au suivant
2. **Deny rules** (`disallowed_tools` + `settings.json`) → bloquer même en `bypassPermissions`
3. **Permission mode** → `bypassPermissions` approuve tout ici ; `acceptEdits` approuve file ops
4. **Allow rules** (`allowed_tools` + `settings.json`) → auto-approuver
5. **`canUseTool` callback** → prompt utilisateur. Skippé en mode `dontAsk` → deny.

### Modes disponibles

| Mode | Comportement | Cas d'usage |
|---|---|---|
| `default` | Outils non couverts → callback `canUseTool` ; sans callback → deny | Flows interactifs custom |
| `dontAsk` | Non pré-approuvé → deny (jamais de prompt) | Agents headless verrouillés |
| `acceptEdits` | Auto-approuve éditions fichiers + ops filesystem (`mkdir`, `rm`, `mv`, `cp`, `touch`) | Dev de confiance, prototypage |
| `plan` | Outils read-only passent ; outils modifiant l'état → bloqués. Claude produit un plan. | Code review, pre-approval |
| `bypassPermissions` | Tout approuvé sans prompt. ⚠️ Impossible en root Unix. Réservé CI/containers isolés | CI sandboxé |
| `auto` | TS uniquement. Classifieur approuve/refuse chaque call | Agents autonomes avec guardrails |

### Notes importantes sur les permissions

```python
# allowed_tools n'est PAS une contrainte pour bypassPermissions
# → Même avec allowed_tools=["Read"], bypassPermissions approuve Bash, Write, etc.
# → Pour bloquer dans bypassPermissions, utiliser disallowed_tools

# Exemple verrouillé (dontAsk + allowed_tools)
options = ClaudeAgentOptions(
    allowed_tools=["Read", "Glob", "Grep"],
    permission_mode="dontAsk",
    # Bash est non listé → deny automatique
)
```

### Règles de permission via settings.json

Avec `setting_sources=["project"]`, les règles de `.claude/settings.json` s'appliquent :
```json
{
  "permissions": {
    "allow": ["Bash(npm:*)", "Read"],
    "deny": ["Bash(rm:-rf*)"]
  }
}
```

Syntaxe de scoping : `"Bash(npm:*)"` = uniquement les commandes npm.

---

## 9. Sessions — continue, resume, fork

### Quand utiliser quoi

| Situation | Approche |
|---|---|
| Tâche one-shot | Rien de spécial. Un `query()` suffit |
| Multi-turn dans un seul process | `ClaudeSDKClient` (Python) ou `continue: true` (TS) |
| Reprendre après redémarrage process (last session) | `continue_conversation=True` (Python) / `continue: true` (TS) |
| Reprendre une session spécifique | Capturer l'ID → passer à `resume` |
| Essayer une alternative sans perdre l'original | `fork_session=True` + `resume=session_id` |
| Stateless (TS only) | `persistSession: false` |

### Capturer le session_id

```python
async for message in query(prompt="...", options=...):
    if isinstance(message, ResultMessage):
        session_id = message.session_id  # toujours présent, même sur erreur
```

### Resume par ID

```python
# Session précédente a analysé le code
async for message in query(
    prompt="Implement the refactoring you suggested",
    options=ClaudeAgentOptions(
        resume=session_id,
        allowed_tools=["Read", "Edit", "Write"],
    ),
):
    ...
```

Sessions stockées sur disque : `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl`  
`encoded-cwd` = path absolu avec tout caractère non-alphanumérique remplacé par `-`.  
Si la session ne se retrouve pas → vérifier que le `cwd` correspond.

### Fork

```python
forked_id = None
async for message in query(
    prompt="Instead of JWT, implement OAuth2",
    options=ClaudeAgentOptions(
        resume=session_id,
        fork_session=True,
    ),
):
    if isinstance(message, ResultMessage):
        forked_id = message.session_id  # nouvel ID, original intact
```

> ⚠️ Fork branché sur l'historique de conversation, PAS sur le filesystem. Les fichiers édités par le fork sont réels. Pour brancher les fichiers aussi → file checkpointing.

### TypeScript : continue: true

```typescript
// Tour 2 — reprend la dernière session du CWD
for await (const message of query({
  prompt: "Now refactor it to use JWT",
  options: { continue: true, allowedTools: ["Read", "Edit", "Write"] }
})) { ... }
```

### Fonctions utilitaires (sessions sur disque)

```python
# Python
from claude_agent_sdk import list_sessions, get_session_messages, get_session_info, rename_session, tag_session

sessions = await list_sessions()
messages = await get_session_messages(session_id)
info = await get_session_info(session_id)
await rename_session(session_id, "My analysis session")
await tag_session(session_id, ["production", "auth-module"])
```

### Resume cross-host

Les sessions sont locales à la machine. Pour reprendre sur un autre host :
1. Copier `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl` sur le nouveau host (même `cwd`)
2. Ou capturer les outputs nécessaires et les passer dans un nouveau prompt

---

## 10. MCP Servers

### Configuration en code

```python
# Python — stdio (process local)
options = ClaudeAgentOptions(
    mcp_servers={
        "filesystem": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"],
        }
    },
    allowed_tools=["mcp__filesystem__*"],
)
```

```typescript
// TypeScript — HTTP/SSE (serveur distant)
const options = {
  mcpServers: {
    "claude-code-docs": {
      type: "http",
      url: "https://code.claude.com/docs/mcp"
    }
  },
  allowedTools: ["mcp__claude-code-docs__*"]
};
```

### Configuration via .mcp.json (avec settingSources)

```json
// .mcp.json à la racine du projet
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/me/projects"]
    }
  }
}
```

Charger avec `setting_sources=["project"]`.

### Conventions de nommage

Les outils MCP suivent le pattern : `mcp__<server-name>__<tool-name>`

Exemples :
- Server `"github"` + outil `list_issues` → `mcp__github__list_issues`
- Server `"playwright"` → `mcp__playwright__browser_click`

### Permissions pour MCP

```python
allowed_tools=["mcp__github__*"]          # tous les outils du serveur github
allowed_tools=["mcp__db__query"]          # uniquement l'outil query
allowed_tools=["mcp__slack__send_message"] # un seul outil
```

> ⚠️ `acceptEdits` n'auto-approuve PAS les outils MCP. `bypassPermissions` les approuve mais désactive toute sécurité. Préférer les wildcards dans `allowedTools`.

### Transports disponibles

| Transport | Config | Cas d'usage |
|---|---|---|
| `stdio` | `command`, `args`, `env` | Serveur local (npx, python…) |
| `sse` | `url`, `headers` | Serveur distant avec streaming |
| `http` | `url`, `headers` | Serveur distant sans streaming |
| SDK MCP server | `create_sdk_mcp_server` | Outil custom in-process |

### Auth MCP

```python
# Via variables d'environnement
mcp_servers={
    "github": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "env": {"GITHUB_TOKEN": os.environ["GITHUB_TOKEN"]},
    }
}

# Via HTTP headers (OAuth, API keys)
mcp_servers={
    "api": {
        "type": "http",
        "url": "https://api.example.com/mcp",
        "headers": {"Authorization": f"Bearer {access_token}"},
    }
}
```

### MCP Tool Search (pour grands ensembles d'outils)

Activé par défaut. Évite de charger toutes les définitions d'outils en contexte à chaque tour.
Voir `https://platform.claude.com/docs/en/agent-sdk/tool-search`.

### Vérifier la connexion au démarrage

```python
async for message in query(...):
    if isinstance(message, SystemMessage) and message.data.get("subtype") == "init":
        for server in message.data.get("mcp_servers", []):
            if server["status"] != "connected":
                print(f"Serveur MCP '{server['name']}' a échoué à connecter")
```

---

## 11. Outils custom (in-process MCP)

### Créer un outil

```python
from typing import Any
import httpx
from claude_agent_sdk import tool, create_sdk_mcp_server, ToolAnnotations

@tool(
    "get_temperature",
    "Get the current temperature at a location",
    {"latitude": float, "longitude": float},
    annotations=ToolAnnotations(readOnlyHint=True),  # permet parallélisation
)
async def get_temperature(args: dict[str, Any]) -> dict[str, Any]:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": args["latitude"],
                "longitude": args["longitude"],
                "current": "temperature_2m",
            },
        )
        data = response.json()
    return {
        "content": [{"type": "text", "text": f"Temperature: {data['current']['temperature_2m']}°C"}]
    }

weather_server = create_sdk_mcp_server(
    name="weather",
    version="1.0.0",
    tools=[get_temperature],
)
```

### Utiliser l'outil custom dans query

```python
options = ClaudeAgentOptions(
    mcp_servers={"weather": weather_server},
    allowed_tools=["mcp__weather__get_temperature"],
)
async for message in query(prompt="What's the temperature in Paris?", options=options):
    if isinstance(message, ResultMessage) and message.subtype == "success":
        print(message.result)
```

### Schema avancé (enums, JSON Schema complet)

```python
@tool(
    "convert_units",
    "Convert a value from one unit to another",
    {
        "type": "object",
        "properties": {
            "unit_type": {
                "type": "string",
                "enum": ["length", "temperature", "weight"],
            },
            "from_unit": {"type": "string"},
            "to_unit": {"type": "string"},
            "value": {"type": "number"},
        },
        "required": ["unit_type", "from_unit", "to_unit", "value"],
    },
)
async def convert_units(args):
    ...
```

### Gestion d'erreurs

```python
async def my_tool(args):
    try:
        result = await do_something(args)
        return {"content": [{"type": "text", "text": result}]}
    except Exception as e:
        # Retourner l'erreur proprement (ne pas raise)
        return {
            "content": [{"type": "text", "text": f"Error: {str(e)}"}],
            "is_error": True,
        }
```

| Comportement | Résultat |
|---|---|
| Exception non catchée | Loop continue. Claude voit le message d'exception stringifié |
| Retourner `"is_error": True` | Loop continue. Claude voit ton message formaté et peut s'adapter |

### Retourner des images et ressources

```python
# Image (base64 inline)
return {
    "content": [{
        "type": "image",
        "data": base64.b64encode(image_bytes).decode("ascii"),  # pas de prefix data:image
        "mimeType": "image/png",
    }]
}

# Resource (contenu identifié par URI)
return {
    "content": [{
        "type": "resource",
        "resource": {
            "uri": "file:///tmp/report.md",
            "mimeType": "text/markdown",
            "text": "# Report\n...",
        }
    }]
}
```

### Annotations

| Field | Défaut | Impact |
|---|---|---|
| `readOnlyHint` | `false` | true → exécution parallèle possible |
| `destructiveHint` | `true` | Informatif seulement |
| `idempotentHint` | `false` | Informatif seulement |
| `openWorldHint` | `true` | Informatif seulement |

---

## 12. Hooks

Les hooks sont des callbacks qui s'exécutent à des points spécifiques de la boucle. Ils tournent dans ton process applicatif, pas dans le contexte de l'agent (ne consomment pas de tokens).

### Hooks disponibles

| Hook Event | Python | TS | Quand | Usage typique |
|---|---|---|---|---|
| `PreToolUse` | ✅ | ✅ | Avant exécution d'un outil | Bloquer des commandes dangereuses |
| `PostToolUse` | ✅ | ✅ | Après exécution | Log d'audit, effets de bord |
| `PostToolUseFailure` | ✅ | ✅ | Après échec outil | Gérer erreurs |
| `UserPromptSubmit` | ✅ | ✅ | Soumission prompt | Injecter contexte dans le prompt |
| `Stop` | ✅ | ✅ | Fin d'exécution | Sauvegarder état, nettoyer |
| `SubagentStart` | ✅ | ✅ | Spawn subagent | Tracker tâches parallèles |
| `SubagentStop` | ✅ | ✅ | Fin subagent | Agréger résultats |
| `PreCompact` | ✅ | ✅ | Avant compaction | Archiver transcript complet |
| `PermissionRequest` | ✅ | ✅ | Dialog permission | Gestion custom des permissions |
| `Notification` | ✅ | ✅ | Messages de statut | Slack/PagerDuty notifications |
| `SessionStart` | ❌ | ✅ | Init session | Initialiser logging |
| `SessionEnd` | ❌ | ✅ | Fin session | Nettoyer ressources |
| `Setup` | ❌ | ✅ | Setup session | Tâches d'initialisation |
| `TeammateIdle` | ❌ | ✅ | Teammate idle | Réassigner travail |
| `TaskCompleted` | ❌ | ✅ | Tâche background terminée | Agréger résultats parallèles |
| `ConfigChange` | ❌ | ✅ | Config file changée | Reload settings |
| `WorktreeCreate` | ❌ | ✅ | Git worktree créé | Tracker workspaces |
| `WorktreeRemove` | ❌ | ✅ | Git worktree supprimé | Nettoyer workspace |

> `SessionStart` / `SessionEnd` en Python → uniquement via shell command hooks dans `.claude/settings.json` (charger avec `setting_sources=["project"]`).

### Configurer des hooks

```python
from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient, HookMatcher

async def protect_env_files(input_data, tool_use_id, context):
    file_path = input_data["tool_input"].get("file_path", "")
    if file_path.endswith(".env"):
        return {
            "hookSpecificOutput": {
                "hookEventName": input_data["hook_event_name"],
                "permissionDecision": "deny",
                "permissionDecisionReason": "Cannot modify .env files",
            }
        }
    return {}  # allow

options = ClaudeAgentOptions(
    hooks={
        "PreToolUse": [
            HookMatcher(matcher="Write|Edit", hooks=[protect_env_files])
        ]
    }
)
```

### Matchers

Le `matcher` est une regex matchée sur le nom de l'outil.

```python
# Outils spécifiques
HookMatcher(matcher="Bash", hooks=[my_callback])

# Outils fichiers
HookMatcher(matcher="Write|Edit|Delete", hooks=[file_security])

# Tous les outils MCP
HookMatcher(matcher="^mcp__", hooks=[mcp_audit])

# Tous les outils (pas de matcher)
HookMatcher(hooks=[global_logger])
```

> ⚠️ Les matchers ne filtrent que par nom d'outil, pas par arguments. Pour filtrer par chemin de fichier, vérifier `input_data["tool_input"]["file_path"]` dans le callback.

### Outputs des hooks

**Top-level fields** (contrôlent la conversation) :
- `systemMessage` : injecte un message visible par le modèle
- `continue` (`continue_` en Python) : `False` → arrêter l'agent

**`hookSpecificOutput`** (contrôle l'opération en cours) :
- Pour `PreToolUse` : `permissionDecision` (`"allow"` | `"deny"` | `"ask"`), `permissionDecisionReason`, `updatedInput`
- Pour `PostToolUse` : `additionalContext`

```python
# Modifier l'input avant exécution
async def redirect_to_sandbox(input_data, tool_use_id, context):
    if input_data["tool_name"] == "Write":
        original_path = input_data["tool_input"].get("file_path", "")
        return {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "allow",
                "updatedInput": {
                    **input_data["tool_input"],
                    "file_path": f"/sandbox{original_path}",
                },
            }
        }
    return {}
```

### Output asynchrone (fire & forget)

```python
async def async_logger(input_data, tool_use_id, context):
    asyncio.create_task(send_to_logging_service(input_data))
    return {"async_": True, "asyncTimeout": 30000}  # Python : async_ (évite mot réservé)
```

### Chaîner plusieurs hooks

```python
options = ClaudeAgentOptions(
    hooks={
        "PreToolUse": [
            HookMatcher(hooks=[rate_limiter]),
            HookMatcher(hooks=[authorization_check]),
            HookMatcher(hooks=[input_sanitizer]),
            HookMatcher(hooks=[audit_logger]),
        ]
    }
)
```

> Priorité de décision : **deny > ask > allow**. Si un hook retourne deny, l'opération est bloquée quelle que soit la décision des autres hooks.

### Exemple — Notification Slack

```python
async def slack_notification(input_data, tool_use_id, context):
    try:
        await asyncio.to_thread(send_to_slack, input_data.get("message", ""))
    except Exception as e:
        print(f"Slack failed: {e}")
    return {}

options = ClaudeAgentOptions(
    hooks={"Notification": [HookMatcher(hooks=[slack_notification])]}
)
```

Types de notifications : `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog`.

---

## 13. Subagents

Les subagents sont des instances d'agent séparées pour gérer des sous-tâches focalisées.

### Avantages

- **Isolation de contexte** : les tool calls intermédiaires restent dans le subagent ; seul son message final remonte au parent
- **Parallélisation** : plusieurs subagents tournent simultanément
- **Instructions spécialisées** : chaque subagent a son propre system prompt
- **Restriction d'outils** : limiter les outils d'un subagent pour réduire les risques

### Créer des subagents (approche programmatique)

```python
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

options = ClaudeAgentOptions(
    allowed_tools=["Read", "Grep", "Glob", "Agent"],  # Agent requis pour spawner subagents
    agents={
        "code-reviewer": AgentDefinition(
            description="Expert code review. Use for quality, security, and maintainability reviews.",
            prompt="""You are a code review specialist.
When reviewing: identify security issues, check performance, suggest improvements.""",
            tools=["Read", "Grep", "Glob"],   # read-only
            model="sonnet",                    # override modèle
        ),
        "test-runner": AgentDefinition(
            description="Runs and analyzes test suites.",
            prompt="You are a test execution specialist.",
            tools=["Bash", "Read", "Grep"],
        ),
    },
)
```

### AgentDefinition — champs

| Field | Type | Requis | Description |
|---|---|---|---|
| `description` | str | ✅ | Quand utiliser ce subagent (Claude décide selon ce champ) |
| `prompt` | str | ✅ | System prompt du subagent |
| `tools` | list[str] | ❌ | Outils disponibles (hérite tout si omis) |
| `model` | str | ❌ | `'sonnet'` `'opus'` `'haiku'` `'inherit'` |
| `skills` | list[str] | ❌ | Skills disponibles |
| `mcp_servers` | list | ❌ | MCP servers pour ce subagent |
| `memory` | str | ❌ | Python only : `'user'` `'project'` `'local'` |

> ⚠️ Les subagents ne peuvent pas spawner leurs propres subagents. Ne pas inclure `Agent` dans `tools` d'un subagent.

### Ce que le subagent hérite

| Reçoit | Ne reçoit pas |
|---|---|
| Son propre system prompt + prompt de l'Agent tool | Historique de conversation du parent |
| CLAUDE.md (via settingSources) | Skills (sauf si listés dans `skills`) |
| Définitions d'outils (hérités ou subset `tools`) | System prompt du parent |

### Invocation automatique vs explicite

- **Auto** : Claude décide selon le `description` du subagent
- **Explicite** : mentionner le nom dans le prompt : `"Use the code-reviewer agent to check auth.py"`

### Détecter l'invocation d'un subagent

```python
async for message in query(...):
    if hasattr(message, "content") and message.content:
        for block in message.content:
            if getattr(block, "type", None) == "tool_use" and block.name in ("Task", "Agent"):
                print(f"Subagent spawned: {block.input.get('subagent_type')}")
    if hasattr(message, "parent_tool_use_id") and message.parent_tool_use_id:
        print("  (inside subagent)")
```

### Reprendre un subagent

```typescript
// TypeScript — extraire l'agentId du résultat, puis reprendre la session
let agentId, sessionId;
for await (const message of query({ prompt: "Use Explorer agent...", options })) {
  if ("session_id" in message) sessionId = message.session_id;
  const content = JSON.stringify("message" in message ? message.message?.content : "");
  const match = content.match(/agentId:\s*([a-f0-9-]+)/);
  if (match) agentId = match[1];
}
// Reprendre
for await (const message of query({
  prompt: `Resume agent ${agentId} and continue...`,
  options: { resume: sessionId, allowedTools: [..., "Agent"] }
})) { ... }
```

---

## 14. Structured Outputs

Forcer Claude à retourner un JSON validé selon un schéma défini.

### Quick start

```python
from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage

options = ClaudeAgentOptions(
    output_format={
        "type": "json_schema",
        "schema": {
            "type": "object",
            "properties": {
                "company_name": {"type": "string"},
                "founded_year": {"type": "number"},
            },
            "required": ["company_name"]
        }
    }
)

async for message in query(prompt="Research Anthropic", options=options):
    if isinstance(message, ResultMessage) and message.structured_output:
        print(message.structured_output)
        # {"company_name": "Anthropic", "founded_year": 2021, ...}
```

### Avec Pydantic (Python)

```python
from pydantic import BaseModel

class BugReport(BaseModel):
    file: str
    line: int
    description: str
    severity: str

schema = BugReport.model_json_schema()
options = ClaudeAgentOptions(
    output_format={"type": "json_schema", "schema": schema}
)

async for message in query(..., options=options):
    if isinstance(message, ResultMessage) and message.structured_output:
        report = BugReport.model_validate(message.structured_output)
        print(f"{report.file}:{report.line} — {report.description}")
```

### Avec Zod (TypeScript)

```typescript
import { z } from "zod";
const FeaturePlan = z.object({
  feature_name: z.string(),
  steps: z.array(z.object({
    description: z.string(),
    complexity: z.enum(["low", "medium", "high"])
  })),
});
const schema = z.toJSONSchema(FeaturePlan);

for await (const message of query({ prompt: "Plan dark mode...", options: { outputFormat: { type: "json_schema", schema } } })) {
  if (message.type === "result" && message.structured_output) {
    const plan = FeaturePlan.safeParse(message.structured_output);
    if (plan.success) console.log(plan.data);
  }
}
```

### Gestion d'erreurs structured output

| Subtype | Cause |
|---|---|
| `success` | Output généré et validé |
| `error_max_structured_output_retries` | Validation échouée après tous les retries |

**Conseils** : schémas simples, champs optionnels si données pas toujours dispo, prompts clairs.

---

## 15. Gestion du contexte & compaction

### Ce qui consomme du contexte

| Source | Quand | Impact |
|---|---|---|
| System prompt | Chaque requête | Fixe, petit |
| CLAUDE.md files | Début de session (si settingSources activé) | Plein contenu (prompt-caché après 1ère req) |
| Définitions d'outils | Chaque requête | Chaque outil = son schéma JSON |
| Historique conversation | Accumule au fil des turns | Croît avec chaque turn (prompts + réponses + inputs/outputs tools) |
| Descriptions de Skills | Début session | Courtes ; full content seulement si invoqué |

### Compaction automatique

Quand le contexte approche la limite, le SDK compacte automatiquement : résume l'historique ancien, garde les échanges récents. Émet `SystemMessage(subtype="compact_boundary")`.

```python
# Instructions de summarisation dans CLAUDE.md
# Section "## When compacting" — le compacteur respecte ces instructions

# Déclencher manuellement
async for message in query(prompt="/compact", options=...):
    ...

# Hook PreCompact — archiver avant compaction
async def archive_before_compact(input_data, tool_use_id, context):
    trigger = input_data.get("trigger")  # "manual" ou "auto"
    await save_transcript_to_db(input_data["session_id"])
    return {}

options = ClaudeAgentOptions(
    hooks={"PreCompact": [HookMatcher(hooks=[archive_before_compact])]}
)
```

### Stratégies pour limiter la consommation de contexte

- **Utiliser des subagents** pour les sous-tâches (démarrent avec contexte frais)
- **Être sélectif avec les outils** (chaque définition coûte des tokens)
- **MCP Tool Search** pour charger les outils à la demande
- **Effort faible pour tâches simples** (`effort="low"`)
- **Règles persistantes dans CLAUDE.md** plutôt que dans le prompt initial (réinjecté à chaque requête)

---

## 16. Cost tracking

### Récupérer le coût total

```python
async for message in query(prompt="...", options=...):
    if isinstance(message, ResultMessage):
        if message.total_cost_usd is not None:
            print(f"Coût: ${message.total_cost_usd:.4f}")
        # Toujours présent, même sur erreur
```

### Déduplication pour per-step usage

Quand Claude utilise plusieurs outils en parallèle dans un turn, plusieurs `AssistantMessage` partagent le même `id` avec des données identiques. Dédupliquer par ID pour éviter le double comptage :

```python
seen_ids = set()
total_input = 0
total_output = 0

async for message in query(...):
    if isinstance(message, AssistantMessage):
        msg_id = message.message_id
        if msg_id and msg_id not in seen_ids:
            seen_ids.add(msg_id)
            total_input += message.usage.get("input_tokens", 0)
            total_output += message.usage.get("output_tokens", 0)
```

### Breakdown par modèle (TypeScript)

```typescript
for await (const message of query(...)) {
  if (message.type === "result") {
    for (const [model, usage] of Object.entries(message.modelUsage)) {
      console.log(`${model}: $${usage.costUSD.toFixed(4)}`);
      console.log(`  Input: ${usage.inputTokens}, Output: ${usage.outputTokens}`);
      console.log(`  Cache read: ${usage.cacheReadInputTokens}`);
    }
  }
}
```

### Tokens de cache

```python
# Dans le dict usage du ResultMessage
cache_read = message.usage.get("cache_read_input_tokens", 0)
cache_creation = message.usage.get("cache_creation_input_tokens", 0)
# cache_read → tarif réduit
# cache_creation → tarif plus élevé que standard
```

### Accumuler sur plusieurs query() calls

```python
total_spend = 0.0
for prompt in prompts:
    async for message in query(prompt=prompt, options=...):
        if isinstance(message, ResultMessage):
            if message.total_cost_usd is not None:
                total_spend += message.total_cost_usd
print(f"Total: ${total_spend:.4f}")
```

---

## 17. Hosting & déploiement

### Requirements système

- **Python** : 3.10+ (Python SDK) ou **Node.js** : 18+ (TS SDK)
- Le SDK spawne Claude Code CLI en interne — inclus dans les deux packages, pas d'install séparée
- Ressources recommandées : 1 GiB RAM, 5 GiB disque, 1 CPU (ajuster selon la tâche)
- Outbound HTTPS vers `api.anthropic.com`

### Container Docker

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install claude-agent-sdk
CMD ["python", "agent.py"]
```

### GitHub Actions

```yaml
- name: Run agent
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: python agent.py
```

### Providers sandbox spécialisés

- Modal Sandbox : https://modal.com/docs/guide/sandbox
- Cloudflare Sandboxes : https://github.com/cloudflare/sandbox-sdk
- E2B : https://e2b.dev/
- Fly Machines : https://fly.io/docs/machines/
- Vercel Sandbox : https://vercel.com/docs/functions/sandbox
- Daytona : https://www.daytona.io/

### Patterns de déploiement

| Pattern | Description | Cas d'usage |
|---|---|---|
| **Ephemeral** | Nouveau container par tâche, détruit après | Bug fix, traitement de documents, traduction |
| **Long-running** | Containers persistants, plusieurs process Claude | Email agent, site builder, chatbots haute fréquence |
| **Hybrid** | Containers éphémères hydratés depuis DB/session | Gestionnaire de projet, recherche longue, support client |
| **Single container** | Plusieurs process Claude dans un container | Simulations, collaboration inter-agents |

### FAQ hosting

- **Communication** : exposer des ports HTTP/WebSocket dans le container
- **Coût container** : ~$0.05/heure minimum (dominant = tokens API)
- **Timeout** : pas de timeout natif — utiliser `max_turns` pour éviter les boucles infinies
- **Monitoring** : même infrastructure log que ton backend habituel

---

## 18. Features Claude Code (filesystem)

Activer avec `setting_sources=["project"]` (ou `["user", "project", "local"]`) :

| Feature | Emplacement | Description |
|---|---|---|
| **CLAUDE.md** | `CLAUDE.md` ou `.claude/CLAUDE.md` | Instructions permanentes, réinjecté à chaque requête |
| **Skills** | `.claude/skills/*/SKILL.md` | Capacités réutilisables en Markdown |
| **Slash commands** | `.claude/commands/*.md` | Commandes custom pour tâches courantes |
| **Settings** | `.claude/settings.json` | Règles allow/deny/ask, hooks shell |
| **Agents** | `.claude/agents/` | Définitions de subagents en Markdown |

### System prompt

```python
# Utiliser le system prompt par défaut de Claude Agent SDK (depuis v0.1.0)
options = ClaudeAgentOptions()  # prompt minimal

# Utiliser le preset Claude Code
options = ClaudeAgentOptions(
    system_prompt={"type": "preset", "preset": "claude_code"}
)

# Custom
options = ClaudeAgentOptions(
    system_prompt="You are a senior Python developer. Follow PEP 8."
)
```

### Charger les settings

```python
# Tout charger (behavior identique à Claude Code CLI)
options = ClaudeAgentOptions(
    setting_sources=["user", "project", "local"]
)

# Uniquement settings projet (CI/CD predictable)
options = ClaudeAgentOptions(
    setting_sources=["project"]
)

# Rien (défaut depuis v0.1.0) — comportement isolé
options = ClaudeAgentOptions()
```

---

## 19. Migration depuis claude-code-sdk

### Changements principaux (v0.1.0)

| Aspect | Avant | Après |
|---|---|---|
| Package TS | `@anthropic-ai/claude-code` | `@anthropic-ai/claude-agent-sdk` |
| Package Python | `claude-code-sdk` | `claude-agent-sdk` |
| Import Python | `from claude_code_sdk import ...` | `from claude_agent_sdk import ...` |
| Type Python | `ClaudeCodeOptions` | `ClaudeAgentOptions` |
| System prompt défaut | System prompt Claude Code | Prompt minimal |
| Settings chargés | Tout automatiquement | Rien — explicit via `setting_sources` |

### Étapes migration TypeScript

```bash
npm uninstall @anthropic-ai/claude-code
npm install @anthropic-ai/claude-agent-sdk
```

```typescript
// Avant
import { query } from "@anthropic-ai/claude-code";
// Après
import { query } from "@anthropic-ai/claude-agent-sdk";
```

### Étapes migration Python

```bash
pip uninstall claude-code-sdk
pip install claude-agent-sdk
```

```python
# Avant
from claude_code_sdk import query, ClaudeCodeOptions
options = ClaudeCodeOptions(model="claude-opus-4-6")

# Après
from claude_agent_sdk import query, ClaudeAgentOptions
options = ClaudeAgentOptions(model="claude-opus-4-6")
```

### Restaurer le comportement pré-migration

```python
# Restaurer system prompt Claude Code
options = ClaudeAgentOptions(
    system_prompt={"type": "preset", "preset": "claude_code"},
    setting_sources=["user", "project", "local"],  # charger tous les settings comme avant
)
```

---

## 20. Claude Managed Agents (API cloud beta)

**Distincte de l'Agent SDK** — infrastructure Anthropic managée, containers cloud, sessions persistées côté serveur.

Header requis sur toutes les requêtes : `managed-agents-2026-04-01`

### Concepts clés

| Concept | Description |
|---|---|
| **Agent** | Modèle + system prompt + outils + MCP servers + skills — créer une fois, référencer par ID |
| **Environment** | Template container cloud (packages pre-installés, règles réseau, fichiers montés) |
| **Session** | Instance agent en cours, exécutant une tâche, générant des outputs |
| **Events** | Messages échangés entre app et agent (SSE) |

### Workflow

1. **Créer un agent** — définir modèle, system prompt, outils, MCP servers, skills
2. **Créer un environment** — container cloud avec packages, accès réseau, fichiers
3. **Démarrer une session** — référence agent + environment
4. **Envoyer des events** — prompts utilisateur, Claude exécute et stream via SSE
5. **Piloter ou interrompre** — envoyer des events supplémentaires pour guider ou stopper

### Quand Managed Agents vs Agent SDK local ?

| | Agent SDK (local) | Managed Agents (cloud) |
|---|---|---|
| Infrastructure | Tu fournis | Anthropic gère |
| Tâches très longues (heures) | ⚠️ dépend de ton runtime | ✅ natif |
| Accès filesystem local | ✅ | ❌ (container cloud) |
| Contrôle fin | ✅ | Moins de customisation |
| Sessions stateful | Via `session_id` | Natif, persisté côté serveur |
| Outils built-in | Bash, Read, Edit, Glob, Grep, Web | Bash, file ops, Web, MCP |

### Rate limits Managed Agents

| Opération | Limite |
|---|---|
| Create endpoints (agents, sessions, environments…) | 60 req/min |
| Read endpoints (retrieve, list, stream…) | 600 req/min |

### Accès beta

Fonctionnalités en research preview nécessitant accès séparé : outcomes, multiagent, memory.  
Demander l'accès : https://claude.com/form/claude-managed-agents

---

## 21. Liens de référence

### Documentation officielle — Agent SDK

| Page | URL |
|---|---|
| Overview | https://platform.claude.com/docs/en/agent-sdk/overview |
| Quickstart | https://platform.claude.com/docs/en/agent-sdk/quickstart |
| Agent loop | https://platform.claude.com/docs/en/agent-sdk/agent-loop |
| Claude Code features | https://platform.claude.com/docs/en/agent-sdk/claude-code-features |
| Sessions | https://platform.claude.com/docs/en/agent-sdk/sessions |
| Streaming input | https://platform.claude.com/docs/en/agent-sdk/streaming-vs-single-mode |
| Streaming output | https://platform.claude.com/docs/en/agent-sdk/streaming-output |
| MCP | https://platform.claude.com/docs/en/agent-sdk/mcp |
| Custom tools | https://platform.claude.com/docs/en/agent-sdk/custom-tools |
| Tool search | https://platform.claude.com/docs/en/agent-sdk/tool-search |
| Permissions | https://platform.claude.com/docs/en/agent-sdk/permissions |
| User input | https://platform.claude.com/docs/en/agent-sdk/user-input |
| Hooks | https://platform.claude.com/docs/en/agent-sdk/hooks |
| File checkpointing | https://platform.claude.com/docs/en/agent-sdk/file-checkpointing |
| Structured outputs | https://platform.claude.com/docs/en/agent-sdk/structured-outputs |
| Hosting | https://platform.claude.com/docs/en/agent-sdk/hosting |
| Secure deployment | https://platform.claude.com/docs/en/agent-sdk/secure-deployment |
| Modifying system prompts | https://platform.claude.com/docs/en/agent-sdk/modifying-system-prompts |
| Subagents | https://platform.claude.com/docs/en/agent-sdk/subagents |
| Slash commands | https://platform.claude.com/docs/en/agent-sdk/slash-commands |
| Skills | https://platform.claude.com/docs/en/agent-sdk/skills |
| Cost tracking | https://platform.claude.com/docs/en/agent-sdk/cost-tracking |
| Todo lists | https://platform.claude.com/docs/en/agent-sdk/todo-tracking |
| Plugins | https://platform.claude.com/docs/en/agent-sdk/plugins |
| Migration guide | https://platform.claude.com/docs/en/agent-sdk/migration-guide |
| TypeScript reference | https://platform.claude.com/docs/en/agent-sdk/typescript |
| TypeScript V2 preview | https://platform.claude.com/docs/en/agent-sdk/typescript-v2-preview |
| Python reference | https://platform.claude.com/docs/en/agent-sdk/python |

### Managed Agents (cloud beta)

| Page | URL |
|---|---|
| Overview | https://platform.claude.com/docs/en/managed-agents/overview |
| API reference beta | https://platform.claude.com/docs/en/api/beta/sessions |

### Ressources complémentaires

| Ressource | URL |
|---|---|
| Exemples GitHub | https://github.com/anthropics/claude-agent-sdk-demos |
| TS SDK changelog | https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md |
| Python SDK changelog | https://github.com/anthropics/claude-agent-sdk-python/blob/main/CHANGELOG.md |
| Claude Code docs (CLI) | https://code.claude.com/docs |
| MCP spec | https://modelcontextprotocol.io |
| MCP servers directory | https://github.com/modelcontextprotocol/servers |
