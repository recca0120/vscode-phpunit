import { Minimatch } from 'minimatch';
import { extname, join } from 'node:path';
import { URI } from 'vscode-uri';
import { PHPUnitXML, TestDefinition, TestParser, TestSuite } from '../index';
import { TestDefinitionBuilder } from './TestDefinitionBuilder';

export interface File<T> {
    testsuite: string;
    uri: URI;
    tests: T[];
}

abstract class Base<K, V> implements Iterable<[K, V]> {
    protected _items: Map<K, V> = new Map();

    get size() {
        return this._items.size;
    }

    items() {
        return this._items;
    }

    set(key: K, value: V) {
        return this._items.set(key, value);
    }

    get(key: K) {
        return this._items.get(key);
    }

    has(key: K) {
        return this._items.has(key);
    }

    delete(key: K) {
        return this._items.delete(key);
    }

    keys() {
        return Array.from(this._items.entries()).map(([key]) => key);
    }

    forEach(callback: (tests: V, key: K, map: Map<K, V>) => void, thisArg?: any) {
        this._items.forEach(callback, thisArg);
    }

    toJSON() {
        return this._items;
    }

    * [Symbol.iterator](): Generator<[K, V], void, unknown> {
        for (const item of this._items.entries()) {
            yield item;
        }
    }
}

export class TestDefinitions<V> extends Base<URI, V> {
    protected _items = new Map<URI, V>();
}

export class Files<V> extends Base<string, TestDefinitions<V>> {
    protected _items = new Map<string, TestDefinitions<V>>();
}

export class Workspace<V> extends Base<string, Files<V>> {
    protected _items = new Map<string, Files<V>>();
}

export class TestCollection {
    private readonly _workspaces: Workspace<TestDefinition[]>;

    constructor(private phpUnitXML: PHPUnitXML) {
        this._workspaces = new Workspace<TestDefinition[]>;
    }

    get size() {
        return this._workspaces.size;
    }

    getWorkspace() {
        return URI.file(this.phpUnitXML.root());
    }

    items() {
        const workspace = this.getWorkspace();
        if (!this._workspaces.has(workspace.fsPath)) {
            const files = new Files<TestDefinition[]>;
            this.phpUnitXML.getTestSuites().forEach((suite) => files.set(suite.name, new TestDefinitions<TestDefinition[]>()));
            this._workspaces.set(workspace.fsPath, files);
        }

        return this._workspaces.get(workspace.fsPath)!;
    }

    async add(uri: URI) {
        return this.has(uri) ? this : this.change(uri);
    }

    async change(uri: URI) {
        const testsuite = this.parseTestsuite(uri);
        if (!testsuite) {
            return this;
        }

        const files = this.items();
        const testDefinitions = await this.parseTests(uri, testsuite);
        if (testDefinitions.length === 0) {
            this.delete(uri);
        }
        files.get(testsuite)!.set(uri, testDefinitions);

        return this;
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
        for (const file of this.gatherFiles()) {
            this.deleteFile(file);
        }
        this._workspaces.delete(this.getWorkspace().fsPath);

        return this;
    }

    findFile(uri: URI): File<TestDefinition> | undefined {
        for (const file of this.gatherFiles()) {
            if (uri.toString() === file.uri.toString()) {
                return file;
            }
        }

        return undefined;
    }

    protected async parseTests(uri: URI, testsuite: string) {
        const { testParser, testDefinitionBuilder } = this.createTestParser();
        await testParser.parseFile(uri.fsPath, testsuite);

        return testDefinitionBuilder.get();
    }

    protected createTestParser() {
        const testParser = new TestParser(this.phpUnitXML);
        const testDefinitionBuilder = new TestDefinitionBuilder(testParser);

        return { testParser, testDefinitionBuilder };
    }

    protected deleteFile(file: File<TestDefinition>) {
        return this.items().get(file.testsuite)?.delete(file.uri);
    }

    private* gatherFiles() {
        for (const [testsuite, files] of this.items()) {
            for (const [uri, tests] of files) {
                yield { testsuite, uri, tests };
            }
        }
    }

    private parseTestsuite(uri: URI) {
        const testSuites = this.phpUnitXML.getTestSuites();
        const testsuite = testSuites.find(item => {
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
        const workspace = this.getWorkspace();
        const isFile = testSuite.tag === 'file' || (testSuite.tag === 'exclude' && extname(testSuite.value));

        if (isFile) {
            return join(workspace.fsPath, testSuite.value) === uri.fsPath;
        }

        const suffix = testSuite.suffix ?? '.php';

        const minimatch = new Minimatch(
            URI.file(join(workspace.fsPath, testSuite.value, `/**/*${suffix}`)).toString(true),
            { matchBase: true, nocase: true },
        );

        return minimatch.match(uri.toString(true));
    }
}

