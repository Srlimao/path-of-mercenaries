import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const ROOT_DIR = process.cwd();
const SCAN_DIRS = ['apps', 'packages'];
const ALLOWED_EXTS = new Set(['.ts', '.tsx', '.css']);
const IGNORE_DIRS = new Set(['node_modules', 'dist', '.wrangler', 'coverage']);
const MAX_LINES = 300;

/** Recursively collects matching source files within apps/ and packages/. */
function collectSourceFiles(dirPath, collected = []) {
  let entries;
  try {
    entries = readdirSync(dirPath);
  } catch {
    return collected;
  }

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry)) continue;
    const fullPath = join(dirPath, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      collectSourceFiles(fullPath, collected);
    } else if (ALLOWED_EXTS.has(extname(entry))) {
      collected.push(fullPath);
    }
  }
  return collected;
}

const files = SCAN_DIRS.flatMap((dir) => collectSourceFiles(join(ROOT_DIR, dir)));
const violations = [];
let maxSeen = { file: '(none)', lines: 0 };

for (const filePath of files) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content === '' ? 0 : content.split(/\r?\n/).length;
  const rel = relative(ROOT_DIR, filePath).replaceAll('\\', '/');
  if (lines > maxSeen.lines) {
    maxSeen = { file: rel, lines };
  }
  if (lines > MAX_LINES) {
    violations.push({ file: rel, lines });
  }
}

console.log(`Checked ${files.length} source files (max allowed: ${MAX_LINES} LOC).`);
console.log(`Largest file: ${maxSeen.file} (${maxSeen.lines} lines).`);

if (violations.length > 0) {
  console.error('\nLOC LIMIT EXCEEDED:');
  for (const v of violations) {
    console.error(`  - ${v.file}: ${v.lines} lines (limit ${MAX_LINES})`);
  }
  process.exit(1);
}

console.log('All source files pass the <300 LOC architectural rule.');
