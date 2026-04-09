const ANTHROPIC_API_BASE = 'https://api.anthropic.com';
const BETA_HEADER = 'managed-agents-2026-04-01';

export function getAnthropicHeaders(apiKey: string): Record<string, string> {
  return {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': BETA_HEADER,
    'content-type': 'application/json',
  };
}

export async function anthropicPost<T>(
  apiKey: string,
  path: string,
  body: unknown
): Promise<{ ok: true; data: T } | { ok: false; status: number; text: string }> {
  const res = await fetch(`${ANTHROPIC_API_BASE}${path}`, {
    method: 'POST',
    headers: getAnthropicHeaders(apiKey),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    return { ok: false, status: res.status, text: await res.text() };
  }
  return { ok: true, data: (await res.json()) as T };
}

export async function fetchSessionStream(apiKey: string, sessionId: string) {
  return fetch(`${ANTHROPIC_API_BASE}/v1/sessions/${sessionId}/events/stream`, {
    method: 'GET',
    headers: {
      ...getAnthropicHeaders(apiKey),
      accept: 'text/event-stream',
    },
  });
}

export async function fetchSessionStatus(apiKey: string, sessionId: string) {
  return fetch(`${ANTHROPIC_API_BASE}/v1/sessions/${sessionId}`, {
    headers: getAnthropicHeaders(apiKey),
  });
}
