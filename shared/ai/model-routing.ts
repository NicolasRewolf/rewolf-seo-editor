import type { AiProvider, AiTaskGroup } from '../contracts';

export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-6';
export const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';

export type AiRoutingKeys = {
  anthropic: boolean;
  openai: boolean;
};

export type StreamRoutingResult =
  | { provider: AiProvider; modelId: string }
  | { error: string };

export type CommandRoutingResult =
  | { useAnthropic: boolean; modelId: string }
  | { error: string };

export type ObjectRoutingResult =
  | { kind: 'openai'; modelId: string }
  | { kind: 'anthropic'; modelId: string }
  | { error: string };

/**
 * `fast` -> OpenAI mini, `quality` -> Anthropic Sonnet.
 * Sans taskGroup, on respecte le provider explicite.
 */
export function resolveStreamRouting(
  taskGroup: AiTaskGroup | undefined,
  providerPref: AiProvider | undefined,
  modelOverride: string | undefined,
  keys: AiRoutingKeys
): StreamRoutingResult {
  if (taskGroup === 'fast') {
    if (!keys.openai) return { error: 'OPENAI_API_KEY manquante (tâche rapide)' };
    return {
      provider: 'openai',
      modelId: modelOverride ?? DEFAULT_OPENAI_MODEL,
    };
  }

  if (taskGroup === 'quality') {
    if (!keys.anthropic) {
      return { error: 'ANTHROPIC_API_KEY manquante (tâche rédaction)' };
    }
    return {
      provider: 'anthropic',
      modelId: modelOverride ?? DEFAULT_ANTHROPIC_MODEL,
    };
  }

  if (!providerPref) return { error: 'provider ou taskGroup requis' };

  if (providerPref === 'anthropic') {
    if (!keys.anthropic) return { error: 'ANTHROPIC_API_KEY manquante' };
    return {
      provider: 'anthropic',
      modelId: modelOverride ?? DEFAULT_ANTHROPIC_MODEL,
    };
  }

  if (!keys.openai) return { error: 'OPENAI_API_KEY manquante' };
  return {
    provider: 'openai',
    modelId: modelOverride ?? DEFAULT_OPENAI_MODEL,
  };
}

/**
 * Routage endpoint /command: préférence utilisateur + taskGroup optionnel.
 */
export function resolveCommandRouting(
  taskGroup: AiTaskGroup | undefined,
  providerPref: AiProvider | undefined,
  modelOverride: string | undefined,
  keys: AiRoutingKeys
): CommandRoutingResult {
  const prefersAnthropic = providerPref !== 'openai';

  if (taskGroup === 'fast') {
    if (!keys.openai) return { error: 'OPENAI_API_KEY manquante (tâche rapide)' };
    return { useAnthropic: false, modelId: modelOverride ?? DEFAULT_OPENAI_MODEL };
  }

  if (taskGroup === 'quality') {
    if (!keys.anthropic) {
      return { error: 'ANTHROPIC_API_KEY manquante (tâche rédaction)' };
    }
    return { useAnthropic: true, modelId: modelOverride ?? DEFAULT_ANTHROPIC_MODEL };
  }

  const useAnthropic = prefersAnthropic && keys.anthropic;
  const useOpenAI = !useAnthropic && keys.openai;

  if (useAnthropic) {
    return { useAnthropic: true, modelId: modelOverride ?? DEFAULT_ANTHROPIC_MODEL };
  }
  if (useOpenAI) {
    return { useAnthropic: false, modelId: modelOverride ?? DEFAULT_OPENAI_MODEL };
  }

  if (prefersAnthropic && !keys.anthropic) return { error: 'ANTHROPIC_API_KEY manquante' };
  return { error: 'OPENAI_API_KEY manquante' };
}

/**
 * Routage endpoint /object: OpenAI en priorité, fallback Anthropic.
 */
export function resolveObjectModelRouting(keys: AiRoutingKeys): ObjectRoutingResult {
  if (keys.openai) return { kind: 'openai', modelId: DEFAULT_OPENAI_MODEL };
  if (keys.anthropic) return { kind: 'anthropic', modelId: DEFAULT_ANTHROPIC_MODEL };
  return { error: 'Aucune clé IA (OPENAI ou ANTHROPIC)' };
}
