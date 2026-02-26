import { extname, join } from 'node:path';
import { Minimatch } from 'minimatch';
import { URI } from 'vscode-uri';
import type { PHPUnitXML, TestDefinition, TestParser, TestSuite } from '../index';
import type { TestStarted } from '../TestOutput';
import { resolveDatasetDefinition } from '../TestParser';
import { ClassHierarchy } from '../TestParser/ClassHierarchy';
import { parseDataset } from '../utils';
import { TestStore } from './TestStore';

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
    private store = new TestStore();
    private matcherCache = new Map<string, Map<string, Minimatch>>();
    private parseQueue: Promise<void> = Promise.resolve();

    private classHierarchy = new ClassHierarchy();

    constructor(
        protected phpUnitXML: PHPUnitXML,
        private testParser: TestParser,
    ) {}

    get size() {
        return this.store.size;
    }

    private getRootUri() {
        return URI.file(this.phpUnitXML.root());
    }

    async change(uri: URI) {
        return new Promise<ChangeResult>((resolve, reject) => {
            this.parseQueue = this.parseQueue
                .catch(() => {})
                .then(() => this.doChange(uri).then(resolve, reject));
        });
    }

    get(uri: URI) {
        return this.store.findFile(uri)?.tests;
    }

    has(uri: URI) {
        return !!this.store.findFile(uri);
    }

    resolveDataset(
        result: TestStarted,
    ): { parentId: string; childDef: TestDefinition } | undefined {
        if (!result.id) {
            return undefined;
        }

        const { parentId } = parseDataset(result.id);
        const parentDef = this.store.getDefinition(parentId);
        if (!parentDef) {
            return undefined;
        }

        const childDef = resolveDatasetDefinition(result.name, parentDef);
        if (!childDef || this.store.hasDefinition(childDef.id)) {
            return undefined;
        }

        this.store.addDefinition(childDef.id, childDef);
        return { parentId, childDef };
    }

    async add(uri: URI) {
        if (this.has(uri)) {
            return;
        }
        await this.change(uri);
    }

    delete(uri: URI): File<TestDefinition> | undefined {
        const file = this.store.findFile(uri);
        if (file) {
            this.store.remove(file.testsuite, file.uri);
            return file;
        }

        const folderPrefix = uri.toString();
        const filesToDelete: URI[] = [];
        for (const tracked of this.gatherFiles()) {
            if (tracked.uri.toString().startsWith(folderPrefix)) {
                filesToDelete.push(tracked.uri);
            }
        }
        for (const fileUri of filesToDelete) {
            this.delete(fileUri);
        }

        return undefined;
    }

    reset(): void {
        this.store.clear();
        this.matcherCache.clear();
        this.classHierarchy.clear();
    }

    findFile(uri: URI): File<TestDefinition> | undefined {
        return this.store.findFile(uri);
    }

    *gatherFiles() {
        yield* this.store.gatherFiles();
    }

    private async doChange(uri: URI): Promise<ChangeResult> {
        const parsed: ChangeResult['parsed'] = [];
        const deleted: ChangeResult['deleted'] = [];

        const testsuite = this.parseTestsuite(uri);
        if (!testsuite) {
            return { parsed, deleted };
        }

        this.store.initSuites(this.phpUnitXML.getTestSuites().map((s) => s.name));
        const tests = await this.parseTests(uri, testsuite);
        if (tests.length === 0) {
            const file = this.delete(uri);
            if (file) {
                deleted.push(file);
            }
        } else {
            this.store.set(testsuite, uri, tests);
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

        this.store.set(testsuite, uri, tests);
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
