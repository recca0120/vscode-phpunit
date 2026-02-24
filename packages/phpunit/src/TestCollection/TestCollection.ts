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

    delete(uri: URI): File<TestDefinition> | undefined {
        const file = this.findFile(uri);
        if (!file) {
            return undefined;
        }

        this.deleteFile(file);
        return file;
    }

    reset(): void {
        this.suites.clear();
        this.matcherCache.clear();
        this.fileIndex.clear();
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
            this.updateTestsForFile(uri, testsuite, tests);
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

        this.updateTestsForFile(uri, testsuite, tests);
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

    private deleteFile(file: File<TestDefinition>) {
        this.fileIndex.delete(file.uri.toString());
        this.suites.get(file.testsuite)?.delete(file.uri.toString());
    }

    private updateTestsForFile(uri: URI, testsuite: string, tests: TestDefinition[]) {
        this.suites.get(testsuite)?.set(uri.toString(), tests);
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
