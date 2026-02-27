import { URI } from 'vscode-uri';
import type { TestDefinition } from '../types';
import type { File } from './TestCollection';

export class TestStore {
    private suites = new Map<string, Map<string, TestDefinition[]>>();
    private fileIndex = new Map<string, string>();
    private definitionIndex = new Map<string, TestDefinition>();

    get size() {
        return this.suites.size;
    }

    initSuites(names: string[]): void {
        for (const name of names) {
            if (!this.suites.has(name)) {
                this.suites.set(name, new Map<string, TestDefinition[]>());
            }
        }
    }

    set(testsuite: string, uri: URI, tests: TestDefinition[]): void {
        const uriStr = uri.toString();
        const oldSuite = this.fileIndex.get(uriStr);
        this.remove(oldSuite ?? testsuite, uri);

        let suiteFiles = this.suites.get(testsuite);
        if (!suiteFiles) {
            suiteFiles = new Map<string, TestDefinition[]>();
            this.suites.set(testsuite, suiteFiles);
        }

        this.addToIndex(tests);
        suiteFiles.set(uriStr, tests);
        this.fileIndex.set(uriStr, testsuite);
    }

    remove(testsuite: string, uri: URI): void {
        const uriStr = uri.toString();
        const oldTests = this.suites.get(testsuite)?.get(uriStr);
        if (oldTests) {
            this.removeFromIndex(oldTests);
        }
        this.fileIndex.delete(uriStr);
        this.suites.get(testsuite)?.delete(uriStr);
    }

    findFile(uri: URI): File<TestDefinition> | undefined {
        const uriStr = uri.toString();
        const testsuite = this.fileIndex.get(uriStr);
        if (!testsuite) {
            return undefined;
        }

        const tests = this.suites.get(testsuite)?.get(uriStr);
        if (!tests) {
            return undefined;
        }

        return { testsuite, uri, tests };
    }

    getDefinition(id: string): TestDefinition | undefined {
        return this.definitionIndex.get(id);
    }

    hasDefinition(id: string): boolean {
        return this.definitionIndex.has(id);
    }

    addDefinition(id: string, def: TestDefinition): void {
        if (!def.file) {
            return;
        }

        const uri = URI.file(def.file);
        const file = this.findFile(uri);
        if (!file) {
            return;
        }

        file.tests.push(def);
        this.definitionIndex.set(id, def);
    }

    *gatherFiles() {
        for (const [testsuite, files] of this.suites) {
            for (const [uriStr, tests] of files) {
                yield { testsuite, uri: URI.parse(uriStr), tests };
            }
        }
    }

    clear(): void {
        this.suites.clear();
        this.fileIndex.clear();
        this.definitionIndex.clear();
    }

    private addToIndex(tests: TestDefinition[]): void {
        for (const test of tests) {
            this.definitionIndex.set(test.id, test);
            if (test.children) {
                this.addToIndex(test.children);
            }
        }
    }

    private removeFromIndex(tests: TestDefinition[]): void {
        for (const test of tests) {
            this.definitionIndex.delete(test.id);
            if (test.children) {
                this.removeFromIndex(test.children);
            }
        }
    }
}
