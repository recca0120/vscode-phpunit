import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            vscode: resolve(__dirname, '__mocks__/vscode.ts'),
        },
    },
    test: {
        globals: false,
        environment: 'node',
        clearMocks: true,
        coverage: {
            provider: 'v8',
            reportsDirectory: 'coverage',
        },
        setupFiles: ['reflect-metadata'],
        include: ['**/__tests__/**/*.test.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
        exclude: ['node_modules', 'out', 'src/test/', 'tests/fixtures', '.vscode-test'],
    },
});
