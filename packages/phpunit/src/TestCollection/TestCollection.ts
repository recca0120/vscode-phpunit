import { extname, join } from 'node:path';
import { Minimatch } from 'minimatch';
import { URI } from 'vscode-uri';
import type { PHPUnitXML, TestDefinition, TestParser, TestSuite } from '../index';
import { ClassHierarchy } from '../TestParser/ClassHierarchy';

export interface File<T> {
    testsuite: string;
    uri: URI;
    tests: T[];
}

export interface ChangeResult {
    parsed: { uri: URI; tests: TestDefinition[] }[];
    deleted: File<TestDefinition>[];
}

export class TestCollection {
    private suites = new Map<string, Map<string, TestDefinition[]>>();
    private matcherCache = new Map<string, Map<string, Minimatch>>();
    private fileIndex = new Map<string, string>();
    private definitionIndex = new Map<string, TestDefinition>();
    private parseQueue: Promise<void> = Promise.resolve();

    private classHierarchy = new ClassHierarchy();

    constructor(
        private phpUnitXML: PHPUnitXML,
        private testParser: TestParser,
    ) {}

    get size() {
        return this.suites.size;
    }

    private getRootUri() {
        return URI.file(this.phpUnitXML.root());
    }

    private initSuites() {
        for (const suite of this.phpUnitXML.getTestSuites()) {
            if (!this.suites.has(suite.name)) {
                this.suites.set(suite.name, new Map<string, TestDefinition[]>());
            }
        }
    }

    async change(uri: URI) {
        return new Promise<ChangeResult>((resolve, reject) => {
            this.parseQueue = this.parseQueue
                .catch(() => {})
                .then(() => this.doChange(uri).then(resolve, reject));
        });
    }

    get(uri: URI) {
        return this.findFile(uri)?.tests;
    }

    has(uri: URI) {
        return !!this.findFile(uri);
    }

    getDefinition(id: string): TestDefinition | undefined {
        return this.definitionIndex.get(id);
    }

    hasDefinition(id: string): boolean {
        return this.getDefinition(id) !== undefined;
    }

    setDefinition(id: string, def: TestDefinition): void {
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

    delete(uri: URI): File<TestDefinition> | undefined {
        const file = this.findFile(uri);
        if (!file) {
            return undefined;
        }

        this.removeTests(file.testsuite, file.uri);
        return file;
    }

    reset(): void {
        this.suites.clear();
        this.matcherCache.clear();
        this.fileIndex.clear();
        this.definitionIndex.clear();
        this.classHierarchy.clear();
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

    *gatherFiles() {
        for (const [testsuite, files] of this.suites) {
            for (const [uriStr, tests] of files) {
                yield { testsuite, uri: URI.parse(uriStr), tests };
            }
        }
    }

    private async doChange(uri: URI): Promise<ChangeResult> {
        const parsed: ChangeResult['parsed'] = [];
        const deleted: ChangeResult['deleted'] = [];

        const testsuite = this.parseTestsuite(uri);
        if (!testsuite) {
            return { parsed, deleted };
        }

        this.initSuites();
        const tests = await this.parseTests(uri, testsuite);
        if (tests.length === 0) {
            const file = this.delete(uri);
            if (file) {
                deleted.push(file);
            }
        } else {
            this.setTests(testsuite, uri, tests);
            parsed.push({ uri, tests });
        }

        for (const child of this.getDependentClasses(uri.fsPath)) {
            const entry = await this.reparseFile(URI.file(child.uri));
            if (entry) {
                parsed.push(entry);
            }
        }

        return { parsed, deleted };
    }

    private getDependentClasses(fsPath: string) {
        return this.classHierarchy
            .getClassesByUri(fsPath)
            .flatMap((classInfo) => [
                ...this.classHierarchy.getChildClasses(classInfo.classFQN),
                ...this.classHierarchy.getTraitUsers(classInfo.classFQN),
            ])
            .filter((child) => child.uri !== fsPath);
    }

    private async reparseFile(
        uri: URI,
    ): Promise<{ uri: URI; tests: TestDefinition[] } | undefined> {
        const testsuite = this.parseTestsuite(uri);
        if (!testsuite) {
            return undefined;
        }

        const tests = await this.parseTests(uri, testsuite);
        if (tests.length === 0) {
            return undefined;
        }

        this.setTests(testsuite, uri, tests);
        return { uri, tests };
    }

    private async parseTests(uri: URI, testsuite: string) {
        const parseResult = await this.testParser.parseFile(uri.fsPath, testsuite);
        if (!parseResult) {
            return [];
        }

        for (const cls of parseResult.classes) {
            this.classHierarchy.register(cls);
        }

        return this.classHierarchy.enrichTests(parseResult.tests);
    }

    private removeTests(testsuite: string, uri: URI) {
        const uriStr = uri.toString();
        const oldTests = this.suites.get(testsuite)?.get(uriStr);
        if (oldTests) {
            this.removeFromIndex(oldTests);
        }
        this.fileIndex.delete(uriStr);
        this.suites.get(testsuite)?.delete(uriStr);
    }

    private setTests(testsuite: string, uri: URI, tests: TestDefinition[]) {
        this.removeTests(testsuite, uri);
        const uriStr = uri.toString();
        this.addToIndex(tests);
        this.suites.get(testsuite)?.set(uriStr, tests);
        this.fileIndex.set(uriStr, testsuite);
    }

    private addToIndex(tests: TestDefinition[]) {
        for (const test of tests) {
            this.definitionIndex.set(test.id, test);
            if (test.children) {
                this.addToIndex(test.children);
            }
        }
    }

    private removeFromIndex(tests: TestDefinition[]) {
        for (const test of tests) {
            this.definitionIndex.delete(test.id);
            if (test.children) {
                this.removeFromIndex(test.children);
            }
        }
    }

    private parseTestsuite(uri: URI) {
        const testSuites = this.phpUnitXML.getTestSuites();
        const testsuite = testSuites.find((item) => {
            return ['directory', 'file'].includes(item.tag) && this.match(item, uri);
        });

        if (!testsuite) {
            return;
        }

        const exclude = testSuites.find((item) => {
            return item.name === testsuite.name && item.tag === 'exclude' && this.match(item, uri);
        });

        if (exclude) {
            return;
        }

        return testsuite.name;
    }

    private match(testSuite: TestSuite, uri: URI) {
        const workspace = this.getRootUri();
        const isFile =
            testSuite.tag === 'file' || (testSuite.tag === 'exclude' && extname(testSuite.value));

        if (isFile) {
            return join(workspace.fsPath, testSuite.value) === uri.fsPath;
        }

        const suffix = testSuite.suffix ?? '.php';

        let suffixMap = this.matcherCache.get(testSuite.value);
        if (!suffixMap) {
            suffixMap = new Map();
            this.matcherCache.set(testSuite.value, suffixMap);
        }

        let minimatch = suffixMap.get(suffix);
        if (!minimatch) {
            minimatch = new Minimatch(
                URI.file(join(workspace.fsPath, testSuite.value, `/**/*${suffix}`)).toString(true),
                { matchBase: true, nocase: true },
            );
            suffixMap.set(suffix, minimatch);
        }

        return minimatch.match(uri.toString(true));
    }
}
