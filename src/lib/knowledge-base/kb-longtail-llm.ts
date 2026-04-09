import { generateAiText } from '@/lib/api/generate-ai';
import { concatKbSources } from '@/lib/knowledge-base/kb-text';
import type { KnowledgeBase } from '@/types/knowledge-base';

const LONGTAIL_EXTRACTION_PROMPT = `Tu es un consultant SEO.

OBJECTIF:
- Proposer des expressions longue traine pertinentes autour du mot-cle principal.
- Retourner STRICTEMENT un JSON avec la forme: {"keywords":[...]}.

CONTRAINTE DE SORTIE:
- Aucune explication hors JSON.
- 10 a 25 expressions maximum.
- Chaque entree:
  - query: string
  - intent: informational | transactional | commercial | navigational
  - difficulty: low | med | high
  - angle: string (raison de la pertinence)
`;

export type LongTailSuggestion = {
  query: string;
  intent: 'informational' | 'transactional' | 'commercial' | 'navigational';
  difficulty: 'low' | 'med' | 'high';
  angle: string;
};

export async function extractLongTailWithLlm(args: {
  kb: KnowledgeBase;
  focusKeyword: string;
  provider: 'anthropic' | 'openai';
}): Promise<LongTailSuggestion[]> {
  const retrieval = concatKbSources(args.kb, 4000);
  const userBlock = [
    `Mot-clé principal : ${args.focusKeyword}`,
    '',
    '--- Extraits sources (BM25) ---',
    retrieval,
    '',
    'Retourne UNIQUEMENT le JSON.',
  ].join('\n');

  const { text } = await generateAiText({
    provider: args.provider,
    // `quality` force le routage serveur vers Anthropic. Pour permettre OpenAI,
    // on ne met `quality` que quand Anthropic est sélectionné.
    taskGroup: args.provider === 'anthropic' ? 'quality' : 'fast',
    messages: [
      { role: 'system', content: LONGTAIL_EXTRACTION_PROMPT },
      { role: 'user', content: userBlock },
    ],
  });

  const cleaned = text.trim().replace(/^```json\s*|\s*```$/g, '');
  const parsed = JSON.parse(cleaned) as { keywords: LongTailSuggestion[] };
  if (!parsed || !Array.isArray(parsed.keywords)) {
    throw new Error('Réponse LLM inattendue');
  }
  return parsed.keywords
    .filter((k) => k.query && k.intent && k.difficulty)
    .slice(0, 25);
}
