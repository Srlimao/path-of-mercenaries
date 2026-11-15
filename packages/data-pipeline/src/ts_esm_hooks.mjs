import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

/**
 * Resolve TypeScript NodeNext `.js` relative specifiers to `.ts` when running directly under Node.
 */
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err && err.code === 'ERR_MODULE_NOT_FOUND' && specifier.endsWith('.js')) {
      return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
    }
    throw err;
  }
}

/**
 * Transpile TypeScript (including enums) and expose JSON modules cleanly under Node ESM.
 */
export async function load(url, context, nextLoad) {
  if (url.endsWith('.ts')) {
    const rawTs = await readFile(fileURLToPath(url), 'utf8');
    const { outputText } = ts.transpileModule(rawTs, {
      fileName: fileURLToPath(url),
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    });
    return {
      format: 'module',
      shortCircuit: true,
      source: outputText,
    };
  }
  if (url.endsWith('.json') && context.importAttributes?.type !== 'json') {
    const rawJson = await readFile(fileURLToPath(url), 'utf8');
    return {
      format: 'module',
      shortCircuit: true,
      source: `export default ${rawJson};`,
    };
  }
  return nextLoad(url, context);
}
