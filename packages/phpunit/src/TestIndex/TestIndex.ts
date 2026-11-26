import { URI } from 'vscode-uri';
import { ComposerAutoload } from '../Configuration/ComposerAutoload';
import { TestSuiteMatcher } from '../Configuration/TestSuiteMatcher';
import type { PHPUnitXML, TestDefinition, TestParser } from '../index';
import type { TestStarted } from '../TestOutput';
import { ClassHierarchy, type ClassInfo } from '../TestParser/ClassHierarchy';
import { datasetExpander } from '../TestParser/DatasetExpander';
import { PHPUNIT_TESTCASE_FQN } from '../types';
import { checkFileExists } from '../utils';
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

export class TestIndex {
    private store = new TestStore();
    private parseQueue: Promise<void> = Promise.resolve();

    private classHierarchy = new ClassHierarchy();
    private ownTests = new Map<string, { testsuite: string; tests: TestDefinition[] }>();
    private testSuiteMatcher: TestSuiteMatcher;

    constructor(
        protected phpUnitXML: PHPUnitXML,
        private testParser: TestParser,
        private autoload = new ComposerAutoload(() => phpUnitXML.root()),
    ) {
        this.testSuiteMatcher = new TestSuiteMatcher(phpUnitXML);
    }

    get size() {
        return this.store.size;
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

        const { parentId } = datasetExpander.parse(result.id);
        const parentDef = this.store.getDefinition(parentId);
        if (!parentDef) {
            return undefined;
        }

        const childDef = datasetExpander.fromTestOutput(parentDef, result.name);
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
        this.deleteFiles(uri);
        return file;
    }

    deleteFiles(uri: URI): File<TestDefinition>[] {
        const file = this.store.findFile(uri);
        if (file) {
            this.removeFile(file);
            return [file];
        }

        const folderPrefix = uri.toString();
        const files = [...this.gatherFiles()].filter((tracked) =>
            tracked.uri.toString().startsWith(folderPrefix),
        );
        for (const tracked of files) {
            this.removeFile(tracked);
        }

        return files;
    }

    reset(): void {
        this.store.clear();
        this.ownTests.clear();
        this.testSuiteMatcher.reset();
        this.classHierarchy.clear();
        this.autoload.reset();
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

        const testsuite = this.testSuiteMatcher.testsuiteOf(uri);
        if (!testsuite) {
            return this.isSupportFile(uri) ? this.indexSupportFile(uri) : { parsed, deleted };
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

        parsed.push(...(await this.reparseDependents(uri)));

        return { parsed, deleted };
    }

    private isSupportFile(uri: URI): boolean {
        return (
            this.testSuiteMatcher.isInTestsuiteDirectory(uri) ||
            this.classHierarchy.getClassesByUri(uri.fsPath).length > 0
        );
    }

    private async indexSupportFile(uri: URI): Promise<ChangeResult> {
        const parseResult = await this.testParser.parseFile(uri.fsPath);
        await this.registerClasses(parseResult?.classes ?? [], parseResult?.includes);

        return { parsed: await this.reparseDependents(uri), deleted: [] };
    }

    private async registerClasses(classes: ClassInfo[], includes: string[] = []): Promise<void> {
        for (const cls of classes) {
            this.classHierarchy.register(cls);
        }
        for (const cls of classes) {
            await this.indexAncestors(cls);
        }
        if (classes.some((cls) => this.hasUnresolvedAncestors(cls))) {
            await this.indexIncludedFiles(includes);
        }
    }

    private hasUnresolvedAncestors(cls: ClassInfo): boolean {
        return [cls.parentFQN, ...cls.traitFQNs].some(
            (fqn) => !!fqn && fqn !== PHPUNIT_TESTCASE_FQN && !this.classHierarchy.get(fqn),
        );
    }

    private async indexIncludedFiles(includes: string[]): Promise<void> {
        for (const file of includes) {
            if (
                this.classHierarchy.getClassesByUri(file).length > 0 ||
                !(await checkFileExists(file))
            ) {
                continue;
            }
            const parseResult = await this.testParser.parseFile(file);
            await this.registerClasses(parseResult?.classes ?? [], parseResult?.includes);
        }
    }

    private async indexAncestors(cls: ClassInfo): Promise<void> {
        for (const fqn of [cls.parentFQN, ...cls.traitFQNs]) {
            if (!fqn || fqn === PHPUNIT_TESTCASE_FQN || this.classHierarchy.get(fqn)) {
                continue;
            }

            const file = await this.findExistingFile(await this.autoload.locate(fqn));
            if (!file) {
                continue;
            }

            const parseResult = await this.testParser.parseFile(file);
            await this.registerClasses(parseResult?.classes ?? [], parseResult?.includes);
        }
    }

    private async findExistingFile(candidates: string[]): Promise<string | undefined> {
        for (const candidate of candidates) {
            if (await checkFileExists(candidate)) {
                return candidate;
            }
        }
        return undefined;
    }

    private async reparseDependents(uri: URI): Promise<ChangeResult['parsed']> {
        const parsed: ChangeResult['parsed'] = [];
        const files = new Set(this.getDependentClasses(uri.fsPath).map((child) => child.uri));
        for (const file of files) {
            const entry = await this.reparseFile(URI.file(file));
            if (entry) {
                parsed.push(entry);
            }
        }

        return parsed;
    }

    private getDependentClasses(fsPath: string) {
        const dependents = new Map<string, ClassInfo>();
        const pending = this.classHierarchy.getClassesByUri(fsPath);
        for (let classInfo = pending.shift(); classInfo; classInfo = pending.shift()) {
            for (const dependent of [
                ...this.classHierarchy.getChildClasses(classInfo.classFQN),
                ...this.classHierarchy.getTraitUsers(classInfo.classFQN),
            ]) {
                if (dependents.has(dependent.classFQN)) {
                    continue;
                }
                dependents.set(dependent.classFQN, dependent);
                pending.push(dependent);
            }
        }

        return [...dependents.values()].filter((dependent) => dependent.uri !== fsPath);
    }

    private async reparseFile(
        uri: URI,
    ): Promise<{ uri: URI; tests: TestDefinition[] } | undefined> {
        const own = this.ownTests.get(uri.toString());
        const testsuite = own?.testsuite ?? this.testSuiteMatcher.testsuiteOf(uri);
        if (!testsuite) {
            return undefined;
        }

        const tests = own
            ? this.classHierarchy.enrichTests(own.tests)
            : await this.parseTests(uri, testsuite);
        if (tests.length === 0) {
            return undefined;
        }

        this.store.set(testsuite, uri, tests);
        return { uri, tests };
    }

    private removeFile(file: File<TestDefinition>): void {
        this.store.remove(file.testsuite, file.uri);
        this.ownTests.delete(file.uri.toString());
    }

    private async parseTests(uri: URI, testsuite: string) {
        const parseResult = await this.testParser.parseFile(uri.fsPath, testsuite);
        if (!parseResult) {
            return [];
        }

        this.ownTests.set(uri.toString(), { testsuite, tests: parseResult.tests });
        await this.registerClasses(parseResult.classes, parseResult.includes);

        return this.classHierarchy.enrichTests(parseResult.tests);
    }
}
