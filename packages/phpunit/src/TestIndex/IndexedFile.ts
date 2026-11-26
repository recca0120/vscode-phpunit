import type { URI } from 'vscode-uri';

export interface IndexedFile<T> {
    testsuite: string;
    uri: URI;
    tests: T[];
}
