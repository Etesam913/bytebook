import { readFileSync } from 'node:fs';

// Follow Vite's static imports so hashed shared chunks stay in the budget.
const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'));
function staticFiles(entry, files = new Set()) {
  const chunk = manifest[entry];
  if (!chunk) throw new Error(`Missing bundle manifest entry: ${entry}`);
  if (files.has(chunk.file)) return files;
  files.add(chunk.file);
  for (const dependency of chunk.imports ?? []) staticFiles(dependency, files);
  return files;
}

const startup = staticFiles('index.html');
const editor = staticFiles('src/components/editor/index.tsx');
const codeMirror = [
  ...staticFiles('src/components/code/codemirror-editor.tsx'),
].filter((file) => !editor.has(file));
if (codeMirror.length === 0) throw new Error('No lazy CodeMirror chunks found');

export default [
  {
    name: 'Startup JS',
    path: [...startup].map((file) => `dist/${file}`),
    gzip: true,
    limit: '469 KB',
  },
  {
    name: 'Lazy CodeMirror',
    path: codeMirror.map((file) => `dist/${file}`),
    gzip: true,
    limit: '144 KB',
  },
];
