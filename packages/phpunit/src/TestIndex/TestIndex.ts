import { URI } from 'vscode-uri';
import { ComposerAutoload } from '../Configuration/ComposerAutoload';
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

    async change(uri: URI) {
        return new Promise<IndexChange>((resolve, reject) => {
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

    async deleteClasses(uri: URI): Promise<IndexChange> {
        return new Promise<IndexChange>((resolve, reject) => {
            this.parseQueue = this.parseQueue
                .catch(() => {})
                .then(() => this.doDeleteClasses(uri).then(resolve, reject));
        });
    }

    delete(uri: URI): IndexedFile<TestDefinition> | undefined {
        const file = this.store.findFile(uri);
        this.deleteFiles(uri);
        return file;
    }

    deleteFiles(uri: URI): IndexedFile<TestDefinition>[] {
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
        this.classes.clear();
        this.autoload.reset();
    }

    findFile(uri: URI): IndexedFile<TestDefinition> | undefined {
        return this.store.findFile(uri);
    }

    *gatherFiles() {
        yield* this.store.gatherFiles();
    }

    private async doDeleteClasses(uri: URI): Promise<IndexChange> {
        const previous = this.classes.unregister(uri.fsPath);

        return this.reparseDependents(uri, previous);
    }

    private async doChange(uri: URI): Promise<IndexChange> {
        const parsed: IndexChange['parsed'] = [];
        const deleted: IndexChange['deleted'] = [];

        const testsuite = this.testSuiteMatcher.testsuiteOf(uri);
        if (!testsuite) {
            return this.isSupportFile(uri) ? this.indexSupportFile(uri) : { parsed, deleted };
        }

        const previous = this.classes.unregister(uri.fsPath);

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

        const dependents = await this.reparseDependents(uri, previous);

        return {
            parsed: [...parsed, ...dependents.parsed],
            deleted: [...deleted, ...dependents.deleted],
        };
    }

    private isSupportFile(uri: URI): boolean {
        return (
            this.testSuiteMatcher.isInTestsuiteDirectory(uri) ||
            this.classes.getClassesByUri(uri.fsPath).length > 0
        );
    }

    private async indexSupportFile(uri: URI): Promise<IndexChange> {
        const previous = this.classes.unregister(uri.fsPath);
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
            if (this.classes.getClassesByUri(file).length > 0 || !(await checkFileExists(file))) {
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
        const dependents = new Map<string, ClassInfo>();
        const pending = [...previous, ...this.classes.getClassesByUri(fsPath)];
        for (let classInfo = pending.shift(); classInfo; classInfo = pending.shift()) {
            for (const dependent of [
                ...this.classes.getChildClasses(classInfo.classFQN),
                ...this.classes.getTraitUsers(classInfo.classFQN),
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

    private async reparseFile(uri: URI, result: IndexChange): Promise<void> {
        const own = this.ownTests.get(uri.toString());
        const testsuite = own?.testsuite ?? this.testSuiteMatcher.testsuiteOf(uri);
        if (!testsuite) {
            return;
        }

        const tests = own
            ? this.inheritance.enrichTests(own.tests)
            : await this.parseTests(uri, testsuite);
        if (tests.length > 0) {
            this.store.set(testsuite, uri, tests);
            result.parsed.push({ uri, tests });
            return;
        }

        const file = this.store.findFile(uri);
        if (file) {
            this.store.remove(file.testsuite, file.uri);
            result.deleted.push(file);
        }
    }

    private removeFile(file: IndexedFile<TestDefinition>): void {
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

        return this.inheritance.enrichTests(parseResult.tests);
    }
}
