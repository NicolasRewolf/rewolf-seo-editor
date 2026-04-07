import { MarkdownPlugin } from '@platejs/markdown';
import { KEYS } from 'platejs';
import type { Descendant, Value } from 'platejs';
import { Element, Path, Text } from 'slate';
import type { PlateEditor } from 'platejs/react';

function isHeadingBlock(n: Element): boolean {
  const t = (n as { type?: string }).type;
  return t === KEYS.h1 || t === KEYS.h2 || t === KEYS.h3 || t === KEYS.h4;
}

/** Chemins des blocs H2 top-level dans l'ordre du document. */
export function collectH2Paths(editor: PlateEditor): Path[] {
  const out: Path[] = [];
  for (let i = 0; i < editor.children.length; i++) {
    const node = editor.children[i];
    if (Element.isElement(node) && (node as { type?: string }).type === KEYS.h2) {
      out.push([i]);
    }
  }
  return out;
}

export function insertMarkdownAfterH2ByIndex(
  editor: PlateEditor,
  h2Index: number,
  markdown: string
): boolean {
  const paths = collectH2Paths(editor);
  const path = paths[h2Index];
  if (!path) return false;
  const api = editor.getApi(MarkdownPlugin);
  const deserialized = api.markdown.deserialize(markdown) as Value;
  const nodes = (Array.isArray(deserialized) ? deserialized : [deserialized]) as Descendant[];
  editor.tf.insertNodes(nodes, { at: Path.next(path) });
  return true;
}

export function insertMarkdownAtDocumentStart(
  editor: PlateEditor,
  markdown: string
): boolean {
  const api = editor.getApi(MarkdownPlugin);
  const deserialized = api.markdown.deserialize(markdown) as Value;
  const nodes = (Array.isArray(deserialized) ? deserialized : [deserialized]) as Descendant[];
  editor.tf.insertNodes(nodes, { at: [0] });
  return true;
}

export function insertMarkdownAtDocumentEnd(
  editor: PlateEditor,
  markdown: string
): boolean {
  const api = editor.getApi(MarkdownPlugin);
  const deserialized = api.markdown.deserialize(markdown) as Value;
  const nodes = (Array.isArray(deserialized) ? deserialized : [deserialized]) as Descendant[];
  editor.tf.insertNodes(nodes, { at: [editor.children.length] });
  return true;
}

/** Remplace tout le document par le markdown désérialisé. */
export function replaceEditorFromMarkdown(
  editor: PlateEditor,
  markdown: string
): void {
  const api = editor.getApi(MarkdownPlugin);
  const next = api.markdown.deserialize(markdown) as Value;
  editor.tf.setValue(next);
}

/** Texte brut sous un H2 jusqu'au prochain H1/H2 (pour cohérence rédaction). */
export function plainTextForSectionAroundH2(
  value: Descendant[],
  h2Index: number
): string {
  const h2Paths: number[][] = [];
  for (let i = 0; i < value.length; i++) {
    const block = value[i];
    if (!Element.isElement(block)) continue;
    if ((block as { type?: string }).type === KEYS.h2) {
      h2Paths.push([i]);
    }
  }
  const start = h2Paths[h2Index];
  if (!start) return '';
  const nextH2 = h2Paths[h2Index + 1];
  const endIdx = nextH2 ? nextH2[0] : value.length;
  const parts: string[] = [];
  for (let i = start[0] + 1; i < endIdx; i++) {
    const block = value[i];
    if (!Element.isElement(block)) continue;
    const t = (block as { type?: string }).type;
    if (t === KEYS.h1 || t === KEYS.h2) break;
    parts.push(collectPlain(block as Descendant));
  }
  return parts.join('\n').trim();
}

function collectPlain(node: Descendant): string {
  if (Text.isText(node)) return node.text;
  if (Element.isElement(node)) {
    if (isHeadingBlock(node)) {
      return '';
    }
    return node.children.map((c) => collectPlain(c as Descendant)).join('');
  }
  return '';
}
