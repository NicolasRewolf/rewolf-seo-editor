import { readUrlWithJina } from './reader.repository';

export async function readUrl(params: { url: string; markdown: boolean }) {
  const result = await readUrlWithJina(params.url, params.markdown);
  if (!result.ok) {
    const isClient = result.error.startsWith('Jina ');
    const status: 400 | 502 = isClient ? 502 : 400;
    return {
      ok: false as const,
      status,
      error: result.error,
    };
  }

  return {
    ok: true as const,
    text: result.text,
    contentType: params.markdown
      ? 'text/markdown; charset=utf-8'
      : 'text/plain; charset=utf-8',
  };
}
