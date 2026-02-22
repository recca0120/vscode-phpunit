import { existsSync, readFileSync } from 'node:fs';
import Module from 'node:module';
import { dirname, join } from 'node:path';

// @vscode/tree-sitter-wasm ships a UMD bundle whose CJS branch calls `factory(exports)`,
// but the factory ignores the argument and returns the namespace object instead.
// A plain `require()` therefore yields an empty object.
// We work around this by using Module._compile with a patched source that captures
// the factory's return value.
let _treeSitter: any;
function getTreeSitter(): any {
    if (_treeSitter) {
        return _treeSitter;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('@vscode/tree-sitter-wasm');
    if (m && typeof m.Parser === 'function') {
        _treeSitter = m;
        return _treeSitter;
    }

    const modulePath = require.resolve('@vscode/tree-sitter-wasm');
    const source = readFileSync(modulePath, 'utf-8');
    const patched = source.replace('factory(exports)', 'Object.assign(exports, factory(exports))');

    // Use Node's module system to compile and run the patched source.
    // This ensures dynamic import() works correctly.
    const mod = new Module(modulePath, module) as any;
    mod.filename = modulePath;
    mod.paths = (Module as any)._nodeModulePaths(dirname(modulePath));
    mod._compile(patched, modulePath);

    _treeSitter = mod.exports;
    return _treeSitter;
}

let initialized = false;
let phpLanguage: any;

export function resolveWasmDir(): string {
    // Bundled runtime: __dirname is dist/ which contains the wasm files
    if (existsSync(join(__dirname, 'tree-sitter.wasm'))) {
        return __dirname;
    }

    // Development / test: resolve from the installed package.
    // require.resolve points to wasm/tree-sitter.js, so dirname gives us the wasm/ dir directly.
    return dirname(require.resolve('@vscode/tree-sitter-wasm'));
}

/**
 * Initialize tree-sitter WASM.
 * Automatically locates wasm files from either dist/ (bundled) or node_modules/.
 */
export async function initTreeSitter(): Promise<void> {
    if (initialized) {
        return;
    }

    const TreeSitter = getTreeSitter();
    const dir = resolveWasmDir();
    await TreeSitter.Parser.init({
        locateFile: (scriptName: string) => join(dir, scriptName),
    });

    phpLanguage = await TreeSitter.Language.load(join(dir, 'tree-sitter-php.wasm'));
    initialized = true;
}

export function parsePhp(code: string): any {
    const TreeSitter = getTreeSitter();
    const parser = new TreeSitter.Parser();
    parser.setLanguage(phpLanguage);
    const tree = parser.parse(code);
    parser.delete();
    return tree;
}

export function isTreeSitterReady(): boolean {
    return initialized;
}
