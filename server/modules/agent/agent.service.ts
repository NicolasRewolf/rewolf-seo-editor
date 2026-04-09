import {
  anthropicPost,
  fetchSessionStatus,
  fetchSessionStream,
} from './agent.repository';

const MODEL = 'claude-sonnet-4-6';
const AGENT_TOOLSET_TYPE = 'agent_toolset_20260401';
const DEFAULT_AGENT_NAME = 'rewolf-seo-agent';

/** Prompt systeme injecte pour les sessions creees depuis l'editeur. */
export const AGENT_SYSTEM_PROMPT = `Tu es un assistant SEO expert pour REWOLF SEO Editor.
Tu aides a rediger, optimiser et enrichir des articles SEO en francais.
Respecte toujours les consignes de l'utilisateur et produis du contenu optimise
pour les moteurs de recherche francais.`;

let cachedAgentId: string | null =
  process.env.ANTHROPIC_MANAGED_AGENT_ID?.trim() || null;
let cachedEnvironmentId: string | null =
  process.env.ANTHROPIC_MANAGED_ENVIRONMENT_ID?.trim() || null;

async function ensureEnvironmentId(apiKey: string): Promise<string> {
  if (cachedEnvironmentId) return cachedEnvironmentId;
  const envName = `rewolf-seo-editor-api-${Date.now()}`;
  const created = await anthropicPost<{ id: string }>(apiKey, '/v1/environments', {
    name: envName,
    config: { type: 'cloud', networking: { type: 'unrestricted' } },
  });
  if (!created.ok) {
    throw new Error(
      `Erreur creation environment ${created.status}: ${created.text}`
    );
  }
  cachedEnvironmentId = created.data.id;
  return cachedEnvironmentId;
}

async function createAgentId(apiKey: string, systemPrompt: string, suffix: string) {
  const created = await anthropicPost<{ id: string }>(apiKey, '/v1/agents', {
    name: `${DEFAULT_AGENT_NAME}-${suffix}`,
    description: 'Managed Agent SEO pour REWOLF SEO Editor',
    model: MODEL,
    system: systemPrompt,
    tools: [{ type: AGENT_TOOLSET_TYPE }],
    metadata: {
      project: 'rewolf-seo-editor',
      source: 'server/routes/agent.ts',
      role: 'seo-assistant',
    },
  });
  if (!created.ok) {
    throw new Error(`Erreur creation agent ${created.status}: ${created.text}`);
  }
  return created.data.id;
}

async function ensureReusableAgentId(apiKey: string): Promise<string> {
  if (cachedAgentId) return cachedAgentId;
  cachedAgentId = await createAgentId(apiKey, AGENT_SYSTEM_PROMPT, 'default');
  return cachedAgentId;
}

function buildUserContent(params: {
  task: string;
  context?: {
    keyword?: string;
    title?: string;
    outline?: string;
    targetLength?: number;
  };
}) {
  let userContent = params.task;
  if (!params.context) return userContent;

  const ctx = params.context;
  const parts: string[] = [];
  if (ctx.keyword) parts.push(`Mot-cle principal : ${ctx.keyword}`);
  if (ctx.title) parts.push(`Titre : ${ctx.title}`);
  if (ctx.outline) parts.push(`Plan :\n${ctx.outline}`);
  if (ctx.targetLength) parts.push(`Longueur cible : ~${ctx.targetLength} mots`);
  if (parts.length > 0) {
    userContent = `${parts.join('\n')}\n\nTache : ${params.task}`;
  }
  return userContent;
}

export async function createManagedAgentSession(params: {
  apiKey: string;
  task: string;
  context?: {
    keyword?: string;
    title?: string;
    outline?: string;
    targetLength?: number;
  };
  systemOverride?: string;
}) {
  const isCustomAgent = typeof params.systemOverride === 'string';
  const systemPrompt = params.systemOverride ?? AGENT_SYSTEM_PROMPT;
  const userContent = buildUserContent({
    task: params.task,
    context: params.context,
  });

  const environmentId = await ensureEnvironmentId(params.apiKey);
  const agentId = isCustomAgent
    ? await createAgentId(params.apiKey, systemPrompt, 'custom')
    : await ensureReusableAgentId(params.apiKey);

  const createRes = await anthropicPost<{ id: string }>(params.apiKey, '/v1/sessions', {
    agent: agentId,
    environment_id: environmentId,
  });
  if (!createRes.ok) {
    return {
      ok: false as const,
      status: 502 as const,
      log: ['[agent] Erreur creation session :', createRes.status, createRes.text] as const,
      error: `Erreur API Anthropic : ${createRes.status}`,
    };
  }

  const sessionId = createRes.data.id;
  const eventRes = await anthropicPost(
    params.apiKey,
    `/v1/sessions/${sessionId}/events`,
    {
      events: [
        {
          type: 'user.message',
          content: [{ type: 'text', text: userContent }],
        },
      ],
    }
  );
  if (!eventRes.ok) {
    return {
      ok: false as const,
      status: 502 as const,
      log: ['[agent] Erreur envoi evenement :', eventRes.status, eventRes.text] as const,
      error: `Erreur envoi tache : ${eventRes.status}`,
    };
  }

  return {
    ok: true as const,
    payload: {
      sessionId,
      status: 'running' as const,
      agentId,
      environmentId,
      reusedAgent: !isCustomAgent,
    },
  };
}

export async function getSessionStream(params: { apiKey: string; sessionId: string }) {
  return fetchSessionStream(params.apiKey, params.sessionId);
}

export async function getSessionStatus(params: { apiKey: string; sessionId: string }) {
  return fetchSessionStatus(params.apiKey, params.sessionId);
}
