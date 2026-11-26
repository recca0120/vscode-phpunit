import { execSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    // tsup's bundled dts relies on the TypeScript compiler API, which TypeScript 7 no
    // longer ships; emit declarations with tsc in onSuccess instead.
    dts: false,
    sourcemap: true,
    clean: true,
    external: ['@vscode/tree-sitter-wasm'],
    onSuccess: async () => {
        const wasmDir = join('node_modules', '@vscode', 'tree-sitter-wasm', 'wasm');
        for (const file of ['tree-sitter.wasm', 'tree-sitter-php.wasm']) {
            copyFileSync(join(wasmDir, file), join('dist', file));
        }
        console.log('Copied wasm files to dist/');

        execSync('tsc -p tsconfig.build.json', { stdio: 'inherit' });
        console.log('Emitted type declarations to dist/');
    },
});
