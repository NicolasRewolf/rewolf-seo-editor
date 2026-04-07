/**
 * Replace U+2018/U+2019 with ASCII ' in string literals and JSX text only (not comments).
 * Uses decoded string values (node.text) + JSON.stringify for literals so French apostrophes
 * inside single-quoted strings do not break the source.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const CURLY = /[\u2018\u2019]/g;

/** @param {string} dir */
function collectTsFiles(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) collectTsFiles(p, out);
    else if (/\.(ts|tsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

/** @param {string} filePath */
function transformFile(filePath) {
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const kind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, kind);

  /** @type { { start: number, end: number, text: string }[] } */
  const reps = [];

  /** @param {ts.Node} node */
  function visit(node) {
    if (ts.isStringLiteral(node)) {
      const newVal = node.text.replace(CURLY, "'");
      if (newVal !== node.text) {
        reps.push({
          start: node.getStart(sf),
          end: node.getEnd(),
          text: JSON.stringify(newVal),
        });
      }
    } else if (ts.isNoSubstitutionTemplateLiteral(node)) {
      const newVal = node.text.replace(CURLY, "'");
      if (newVal !== node.text) {
        reps.push({
          start: node.getStart(sf),
          end: node.getEnd(),
          text: '`' + newVal.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`',
        });
      }
    } else if (ts.isJsxText(node)) {
      const raw = node.getText(sf);
      const next = raw.replace(CURLY, "'");
      if (next !== raw) reps.push({ start: node.getStart(sf), end: node.getEnd(), text: next });
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);

  if (reps.length === 0) return false;

  reps.sort((a, b) => b.start - a.start);
  let out = sourceText;
  for (const r of reps) {
    out = out.slice(0, r.start) + r.text + out.slice(r.end);
  }
  fs.writeFileSync(filePath, out, 'utf8');
  return true;
}

const dirs = [path.join(ROOT, 'src'), path.join(ROOT, 'server')];
const files = dirs.flatMap((d) => collectTsFiles(d));
let n = 0;
for (const f of files) {
  if (transformFile(f)) {
    console.log('fixed:', path.relative(ROOT, f));
    n++;
  }
}
console.log(`Done. ${n} file(s) updated.`);
