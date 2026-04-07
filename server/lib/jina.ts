const JINA_BASE = 'https://r.jina.ai';

export type JinaFetchMode = 'plain' | 'markdown';

export async function fetchJinaContent(
  targetUrl: string,
  mode: JinaFetchMode = 'plain'
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  let target: URL;
  try {
    target = new URL(targetUrl);
  } catch {
    return { ok: false, error: 'URL invalide' };
  }

  if (!/^https?:$/i.test(target.protocol)) {
    return { ok: false, error: 'Seuls http(s) sont autorisés' };
  }

  const jinaUrl = `${JINA_BASE}/${target.toString()}`;
  const accept =
    mode === 'markdown'
      ? 'text/markdown'
      : 'text/plain';

  try {
    const res = await fetch(jinaUrl, {
      headers: {
        Accept: accept,
        ...(mode === 'markdown' ? { 'X-Return-Format': 'markdown' } : {}),
      },
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: `Jina ${res.status}: ${text.slice(0, 200)}`,
      };
    }
    return { ok: true, text };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Erreur réseau Jina',
    };
  }
}

/** @deprecated Utiliser fetchJinaContent(url, 'plain') */
export async function fetchJinaPlainText(
  targetUrl: string
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  return fetchJinaContent(targetUrl, 'plain');
}
