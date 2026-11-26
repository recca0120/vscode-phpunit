import { existsSync, readFileSync } from 'node:fs';
import Module from 'node:module';
import { dirname, join } from 'node:path';

// biome-ignore lint/suspicious/noExplicitAny: dynamic UMD module with no type declarations
let _treeSitter: any;
// biome-ignore lint/suspicious/noExplicitAny: dynamic UMD module with no type declarations
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

    // biome-ignore lint/suspicious/noExplicitAny: accessing private Node.js Module internals
    const mod = new Module(modulePath, module) as any;
    mod.filename = modulePath;
    // biome-ignore lint/suspicious/noExplicitAny: accessing private Node.js Module internals
    mod.paths = (Module as any)._nodeModulePaths(dirname(modulePath));
    mod._compile(patched, modulePath);

    _treeSitter = mod.exports;
    return _treeSitter;
}

let initialized = false;
// biome-ignore lint/suspicious/noExplicitAny: tree-sitter Language type not exported
let phpLanguage: any;

export function resolveWasmDir(): string {
    if (existsSync(join(__dirname, 'tree-sitter.wasm'))) {
        return __dirname;
    }

    return dirname(require.resolve('@vscode/tree-sitter-wasm'));
}

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

// biome-ignore lint/suspicious/noExplicitAny: tree-sitter Tree type not exported
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
