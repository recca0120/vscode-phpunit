import { copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ['@vscode/tree-sitter-wasm'],
    onSuccess: async () => {
        const wasmDir = join('node_modules', '@vscode', 'tree-sitter-wasm', 'wasm');
        for (const file of ['tree-sitter.wasm', 'tree-sitter-php.wasm']) {
            copyFileSync(join(wasmDir, file), join('dist', file));
        }
        console.log('Copied wasm files to dist/');
    },
});
