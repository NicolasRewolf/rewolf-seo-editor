export const DEFAULT_ANTHROPIC = 'claude-sonnet-4-6';
export const DEFAULT_OPENAI = 'gpt-4.1-mini';

/** Routage Sonnet (rédaction) vs mini (tâches courtes / structuré). */
export type AiTaskGroup = 'fast' | 'quality';

type Keys = { anthropic: boolean; openai: boolean };

export function resolveStreamRouting(
  taskGroup: AiTaskGroup | undefined,
  providerPref: 'anthropic' | 'openai' | undefined,
  modelOverride: string | undefined,
  keys: Keys
): {
  provider: 'anthropic' | 'openai';
  modelId: string;
} | { error: string } {
  if (taskGroup === 'fast') {
    if (!keys.openai) {
      return { error: 'OPENAI_API_KEY manquante (tâche rapide)' };
    }
    return {
      provider: 'openai',
      modelId: modelOverride ?? DEFAULT_OPENAI,
    };
  }
  if (taskGroup === 'quality') {
    if (!keys.anthropic) {
      return { error: 'ANTHROPIC_API_KEY manquante (tâche rédaction)' };
    }
    return {
      provider: 'anthropic',
      modelId: modelOverride ?? DEFAULT_ANTHROPIC,
    };
  }
  if (!providerPref) {
    return { error: 'provider ou taskGroup requis' };
  }
  if (providerPref === 'anthropic') {
    if (!keys.anthropic) {
      return { error: 'ANTHROPIC_API_KEY manquante' };
    }
    return {
      provider: 'anthropic',
      modelId: modelOverride ?? DEFAULT_ANTHROPIC,
    };
  }
  if (!keys.openai) {
    return { error: 'OPENAI_API_KEY manquante' };
  }
  return {
    provider: 'openai',
    modelId: modelOverride ?? DEFAULT_OPENAI,
  };
}

/** Plate /command : préférence utilisateur + taskGroup optionnel dans le corps fusionné. */
export function resolveCommandRouting(
  taskGroup: AiTaskGroup | undefined,
  providerPref: string | undefined,
  modelOverride: string | undefined,
  keys: Keys
): {
  useAnthropic: boolean;
  modelId: string;
} | { error: string } {
  const prefersAnthropic = providerPref !== 'openai';

  if (taskGroup === 'fast') {
    if (!keys.openai) {
      return { error: 'OPENAI_API_KEY manquante (tâche rapide)' };
    }
    return { useAnthropic: false, modelId: modelOverride ?? DEFAULT_OPENAI };
  }
  if (taskGroup === 'quality') {
    if (!keys.anthropic) {
      return { error: 'ANTHROPIC_API_KEY manquante (tâche rédaction)' };
    }
    return { useAnthropic: true, modelId: modelOverride ?? DEFAULT_ANTHROPIC };
  }

  const useAnthropic = prefersAnthropic && keys.anthropic;
  const useOpenAI = !useAnthropic && keys.openai;

  if (useAnthropic) {
    return { useAnthropic: true, modelId: modelOverride ?? DEFAULT_ANTHROPIC };
  }
  if (useOpenAI) {
    return { useAnthropic: false, modelId: modelOverride ?? DEFAULT_OPENAI };
  }

  if (prefersAnthropic && !keys.anthropic) {
    return { error: 'ANTHROPIC_API_KEY manquante' };
  }
  return { error: 'OPENAI_API_KEY manquante' };
}

/** generateObject SEO (meta, JSON-LD) : toujours mini si la clé OpenAI existe. */
export function resolveObjectModelRouting(keys: Keys):
  | { kind: 'openai'; modelId: string }
  | { kind: 'anthropic'; modelId: string }
  | { error: string } {
  if (keys.openai) {
    return { kind: 'openai', modelId: DEFAULT_OPENAI };
  }
  if (keys.anthropic) {
    return { kind: 'anthropic', modelId: DEFAULT_ANTHROPIC };
  }
  return { error: 'Aucune clé IA (OPENAI ou ANTHROPIC)' };
}
