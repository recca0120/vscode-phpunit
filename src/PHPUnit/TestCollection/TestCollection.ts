import { extname, join } from 'node:path';
import { Minimatch } from 'minimatch';
import { URI } from 'vscode-uri';
import type { PHPUnitXML, TestDefinition, TestParser, TestSuite } from '../index';
import type { ClassHierarchy } from '../TestParser/ClassHierarchy';

export interface File<T> {
    testsuite: string;
    uri: URI;
    tests: T[];
}

export interface TestCollectionCallbacks {
    onTestsParsed?: (uri: URI, tests: TestDefinition[]) => void;
    onFileDeleted?: (file: File<TestDefinition>) => void;
    onReset?: () => void;
}

export class TestCollection {
    private suites = new Map<string, Map<string, TestDefinition[]>>();
    private matcherCache = new Map<string, Map<string, Minimatch>>();
    private fileIndex = new Map<string, string>();
    private parseQueue: Promise<void> = Promise.resolve();
    private callbacks: TestCollectionCallbacks = {};

    constructor(
        private phpUnitXML: PHPUnitXML,
        private testParser: TestParser,
        private classHierarchy: ClassHierarchy,
        callbacks?: TestCollectionCallbacks,
    ) {
        this.callbacks = callbacks ?? {};
    }

    get size() {
        return this.suites.size;
    }

    getPhpUnitXML() {
        return this.phpUnitXML;
    }

    getRootUri() {
        return URI.file(this.phpUnitXML.root());
    }

    items() {
        return this.suites;
    }

    initSuites() {
        for (const suite of this.phpUnitXML.getTestSuites()) {
            if (!this.suites.has(suite.name)) {
                this.suites.set(suite.name, new Map<string, TestDefinition[]>());
            }
        }
    }

    clearMatcherCache() {
        this.matcherCache.clear();
    }

    async add(uri: URI) {
        return this.has(uri) ? this : this.change(uri);
    }

    async change(uri: URI) {
        return new Promise<this>((resolve, reject) => {
            this.parseQueue = this.parseQueue.then(
                () => this.doChange(uri).then(resolve, reject),
                () => this.doChange(uri).then(resolve, reject),
            );
        });
    }

    private async doChange(uri: URI) {
        const testsuite = this.parseTestsuite(uri);
        if (!testsuite) {
            return this;
        }

        this.initSuites();
        const testDefinitions = await this.parseTests(uri, testsuite);
        if (testDefinitions.length === 0) {
            this.delete(uri);
        } else {
            this.updateTestsForFile(uri, testsuite, testDefinitions);
        }

        await this.reparseChildClasses(uri);

        return this;
    }

    private async reparseChildClasses(uri: URI) {
        const dependents = this.getDependentClasses(uri.fsPath);

        for (const child of dependents) {
            await this.reparseFile(URI.file(child.uri));
        }
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

    private async reparseFile(uri: URI) {
        const testsuite = this.parseTestsuite(uri);
        if (!testsuite) {
            return;
        }

        const tests = await this.parseTests(uri, testsuite);
        if (tests.length > 0) {
            this.updateTestsForFile(uri, testsuite, tests);
        }
    }

    get(uri: URI) {
        return this.findFile(uri)?.tests;
    }

    has(uri: URI) {
        return !!this.findFile(uri);
    }

    delete(uri: URI) {
        const file = this.findFile(uri);

        return file ? this.deleteFile(file) : false;
    }

    reset() {
        this.callbacks.onReset?.();
        for (const file of this.gatherFiles()) {
            this.deleteFile(file);
        }
        this.suites.clear();
        this.matcherCache.clear();
        this.fileIndex.clear();
        this.classHierarchy.clear();

        return this;
    }

    findFile(uri: URI): File<TestDefinition> | undefined {
        const uriStr = uri.toString();
        const testsuite = this.fileIndex.get(uriStr);
        if (!testsuite) {
            return undefined;
        }

        const tests = this.items().get(testsuite)?.get(uriStr);
        if (!tests) {
            return undefined;
        }

        return { testsuite, uri, tests };
    }

    parseTests(uri: URI, testsuite: string): Promise<TestDefinition[]> {
        return this.doParse(uri, testsuite);
    }

    *gatherFiles() {
        for (const [testsuite, files] of this.items()) {
            for (const [uriStr, tests] of files) {
                yield { testsuite, uri: URI.parse(uriStr), tests };
            }
        }
    }

    private async doParse(uri: URI, testsuite: string) {
        const result = await this.testParser.parseFile(uri.fsPath, testsuite);
        if (!result) {
            return [];
        }

        for (const cls of result.classes) {
            this.classHierarchy.register(cls);
        }

        const enriched = this.classHierarchy.enrichTests(result.tests);
        this.callbacks.onTestsParsed?.(uri, enriched);

        return enriched;
    }

    private deleteFile(file: File<TestDefinition>) {
        this.callbacks.onFileDeleted?.(file);
        this.fileIndex.delete(file.uri.toString());
        return this.items().get(file.testsuite)?.delete(file.uri.toString());
    }

    private updateTestsForFile(uri: URI, testsuite: string, tests: TestDefinition[]) {
        this.items().get(testsuite)?.set(uri.toString(), tests);
        this.fileIndex.set(uri.toString(), testsuite);
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
