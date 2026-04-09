import { fetchJinaContent } from '../../lib/jina';

export async function readUrlWithJina(url: string, markdown: boolean) {
  return fetchJinaContent(url, markdown ? 'markdown' : 'plain');
}
