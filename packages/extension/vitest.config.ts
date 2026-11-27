import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@vscode-phpunit/phpunit/testing': resolve(__dirname, '../phpunit/tests/utils.ts'),
            '@vscode-phpunit/phpunit': resolve(__dirname, '../phpunit/src/index.ts'),
            vscode: resolve(__dirname, 'fakes/vscode/index.ts'),
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
        setupFiles: ['reflect-metadata', 'fakes/vscode/setup.ts', 'fakes/childProcess.ts'],
        exclude: ['node_modules', 'out', 'tests/', '.vscode-test'],
        projects: [
            {
                extends: true,
                test: {
                    name: 'unit',
                    include: ['**/__tests__/**/*.test.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
                    exclude: ['src/acceptance/**'],
                },
            },
            {
                extends: true,
                test: {
                    name: 'acceptance',
                    include: ['src/acceptance/**/*.test.ts'],
                    testTimeout: 30_000,
                },
            },
        ],
    },
});
