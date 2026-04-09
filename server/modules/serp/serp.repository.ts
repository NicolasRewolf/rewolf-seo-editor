import { fetchJinaPlainText } from '../../lib/jina';

export async function searchSerper(params: {
  apiKey: string;
  q: string;
  num: number;
  gl: string;
  hl: string;
}): Promise<
  | { ok: true; text: string }
  | { ok: false; status: number; detail: string }
> {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': params.apiKey,
    },
    body: JSON.stringify({
      q: params.q,
      num: params.num,
      gl: params.gl,
      hl: params.hl,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, detail: text.slice(0, 500) };
  }
  return { ok: true, text };
}

export async function fetchCompetitorText(url: string) {
  return fetchJinaPlainText(url);
}
