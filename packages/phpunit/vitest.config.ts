import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: false,
        environment: 'node',
        clearMocks: true,
        coverage: {
            provider: 'v8',
            reportsDirectory: 'coverage',
        },
        include: ['**/?(*.)+(spec|test).[tj]s?(x)'],
        exclude: ['node_modules', 'dist', 'tests/fixtures'],
    },
});
