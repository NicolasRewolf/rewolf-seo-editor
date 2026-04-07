const JINA_BASE = 'https://r.jina.ai';

export async function fetchJinaPlainText(
  targetUrl: string
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

  try {
    const res = await fetch(jinaUrl, {
      headers: { Accept: 'text/plain' },
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
