import { URI } from 'vscode-uri';
import { ComposerAutoload } from '../Composer/ComposerAutoload';
import type { PHPUnitXML, TestDefinition, TestParser } from '../index';
import type { TestStarted } from '../TestOutput';
import type { ClassInfo } from '../TestParser/ClassInfo';
import { datasetExpander } from '../TestParser/DatasetExpander';
import { PHPUNIT_TESTCASE_FQN } from '../types';
import { checkFileExists } from '../utils';
import { ClassRegistry } from './ClassRegistry';
import type { IndexChange } from './IndexChange';
import type { IndexedFile } from './IndexedFile';
import { IndexStore } from './IndexStore';
import { InheritanceResolver } from './InheritanceResolver';
import { TestSuiteMatcher } from './TestSuiteMatcher';

export class TestIndex {
    private store = new IndexStore();
    private parseQueue: Promise<void> = Promise.resolve();

    private classes = new ClassRegistry();
    private inheritance = new InheritanceResolver(this.classes);
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

    async update(uri: URI) {
        return this.enqueue(() => this.doChange(uri));
    }

    async remove(uri: URI): Promise<IndexChange> {
        const deleted = this.removeFiles(uri);
        const change = await this.enqueue(() => this.doDeleteClasses(uri));

        return { parsed: change.parsed, deleted: [...deleted, ...change.deleted] };
    }

    has(uri: URI) {
        return !!this.store.find(uri);
    }

    addDatasetChild(
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
        await this.update(uri);
    }

    clear(): void {
        this.store.clear();
        this.ownTests.clear();
        this.testSuiteMatcher.reset();
        this.classes.clear();
        this.autoload.reset();
    }

    find(uri: URI): IndexedFile<TestDefinition> | undefined {
        return this.store.find(uri);
    }

    *files() {
        yield* this.store.files();
    }

    private enqueue(task: () => Promise<IndexChange>): Promise<IndexChange> {
        return new Promise<IndexChange>((resolve, reject) => {
            this.parseQueue = this.parseQueue
                .catch(() => {})
                .then(() => task().then(resolve, reject));
        });
    }

    private removeFiles(uri: URI): IndexedFile<TestDefinition>[] {
        const file = this.store.find(uri);
        if (file) {
            this.removeFile(file);
            return [file];
        }

        const folderPrefix = uri.toString();
        const files = [...this.files()].filter((tracked) =>
            tracked.uri.toString().startsWith(folderPrefix),
        );
        for (const tracked of files) {
            this.removeFile(tracked);
        }

        return files;
    }

    private async doDeleteClasses(uri: URI): Promise<IndexChange> {
        const previous = this.classes.unregisterFile(uri.fsPath);

        return this.reparseDependents(uri, previous);
    }

    private async doChange(uri: URI): Promise<IndexChange> {
        const parsed: IndexChange['parsed'] = [];
        const deleted: IndexChange['deleted'] = [];

        const testsuite = this.testSuiteMatcher.testsuiteOf(uri);
        if (!testsuite) {
            return this.isSupportFile(uri) ? this.indexSupportFile(uri) : { parsed, deleted };
        }

        const previous = this.classes.unregisterFile(uri.fsPath);

        this.store.defineTestsuites(this.phpUnitXML.getTestSuites().map((s) => s.name));
        const tests = await this.parseTests(uri, testsuite);
        if (tests.length === 0) {
            const file = this.store.find(uri);
            this.removeFiles(uri);
            if (file) {
                deleted.push(file);
            }
        } else {
            this.store.set(testsuite, uri, tests);
            parsed.push({ uri, tests });
        }

        const dependents = await this.reparseDependents(uri, previous);

        return {
            parsed: [...parsed, ...dependents.parsed],
            deleted: [...deleted, ...dependents.deleted],
        };
    }

    private isSupportFile(uri: URI): boolean {
        return (
            this.testSuiteMatcher.isInTestsuiteDirectory(uri) ||
            this.classes.declaredIn(uri.fsPath).length > 0
        );
    }

    private async indexSupportFile(uri: URI): Promise<IndexChange> {
        const previous = this.classes.unregisterFile(uri.fsPath);
        const parseResult = await this.testParser.parseFile(uri.fsPath);
        await this.registerClasses(parseResult?.classes ?? [], parseResult?.includes);

        return this.reparseDependents(uri, previous);
    }

    private async registerClasses(classes: ClassInfo[], includes: string[] = []): Promise<void> {
        for (const cls of classes) {
            this.classes.register(cls);
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
            (fqn) => !!fqn && fqn !== PHPUNIT_TESTCASE_FQN && !this.classes.get(fqn),
        );
    }

    private async indexIncludedFiles(includes: string[]): Promise<void> {
        for (const file of includes) {
            if (this.classes.declaredIn(file).length > 0 || !(await checkFileExists(file))) {
                continue;
            }
            const parseResult = await this.testParser.parseFile(file);
            await this.registerClasses(parseResult?.classes ?? [], parseResult?.includes);
        }
    }

    private async indexAncestors(cls: ClassInfo): Promise<void> {
        for (const fqn of [cls.parentFQN, ...cls.traitFQNs]) {
            if (!fqn || fqn === PHPUNIT_TESTCASE_FQN || this.classes.get(fqn)) {
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

    private async reparseDependents(uri: URI, previous: ClassInfo[] = []): Promise<IndexChange> {
        const result: IndexChange = { parsed: [], deleted: [] };
        const files = new Set(
            this.getDependentClasses(uri.fsPath, previous).map((child) => child.uri),
        );
        for (const file of files) {
            await this.reparseFile(URI.file(file), result);
        }

        return result;
    }

    private getDependentClasses(fsPath: string, previous: ClassInfo[]) {
        return this.classes
            .dependentsOf([...previous, ...this.classes.declaredIn(fsPath)])
            .filter((dependent) => dependent.uri !== fsPath);
    }

    private async reparseFile(uri: URI, result: IndexChange): Promise<void> {
        const own = this.ownTests.get(uri.toString());
        const testsuite = own?.testsuite ?? this.testSuiteMatcher.testsuiteOf(uri);
        if (!testsuite) {
            return;
        }

        const tests = own
            ? this.inheritance.resolve(own.tests)
            : await this.parseTests(uri, testsuite);
        if (tests.length > 0) {
            this.store.set(testsuite, uri, tests);
            result.parsed.push({ uri, tests });
            return;
        }

        const file = this.store.find(uri);
        if (file) {
            this.store.remove(file.uri);
            result.deleted.push(file);
        }
    }

    private removeFile(file: IndexedFile<TestDefinition>): void {
        this.store.remove(file.uri);
        this.ownTests.delete(file.uri.toString());
    }

    private async parseTests(uri: URI, testsuite: string) {
        const parseResult = await this.testParser.parseFile(uri.fsPath, testsuite);
        if (!parseResult) {
            return [];
        }

        this.ownTests.set(uri.toString(), { testsuite, tests: parseResult.tests });
        await this.registerClasses(parseResult.classes, parseResult.includes);

        return this.inheritance.resolve(parseResult.tests);
    }
}
