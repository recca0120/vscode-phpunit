import { dirname, extname, join, relative } from 'node:path';
import { URI } from 'vscode-uri';
import { PHPUnitXML, TestDefinition, TestParser, TestSuite } from './index';

interface File<T> {
    group: string;
    file: string;
    tests: T[];
}

abstract class Base<T> {
    protected _items: Map<string, T> = new Map();

    get size() {
        return this._items.size;
    }

    set(key: string, value: T) {
        return this._items.set(key, value);
    }

    get(key: string) {
        return this._items.get(key);
    }

    has(key: string) {
        return this._items.has(key);
    }

    delete(key: string) {
        return this._items.delete(key);
    }

    keys() {
        return Array.from(this._items.entries()).map(([key]) => key);
    }

    forEach(callback: (tests: T, key: string, map: Map<string, T>) => void, thisArg?: any) {
        this._items.forEach(callback, thisArg);
    }

    entries() {
        return this._items.entries();
    }

    toJSON() {
        return this._items;
    }
}

export class TestDefinitions<T> extends Base<T> {
    constructor() {
        super();
        this._items = new Map<string, T>();
    }
}

export class Files<T> extends Base<TestDefinitions<T>> {
    constructor() {
        super();
        this._items = new Map<string, TestDefinitions<T>>();
    }
}

export class Workspace<T> extends Base<Files<T>> {
    constructor() {
        super();
        this._items = new Map<string, Files<T>>();
    }
}

export abstract class BaseTestCollection<T extends { id: string, children: T[] }> {
    private readonly _workspaces: Workspace<T[]>;

    constructor(private phpUnitXML: PHPUnitXML, protected testParser: TestParser) {
        this._workspaces = new Workspace<T[]>;
    }

    get size() {
        return this._workspaces.size;
    }

    public getWorkspace() {
        return URI.file(this.phpUnitXML.root()).fsPath;
    }

    items() {
        const workspace = this.getWorkspace();
        if (!this._workspaces.has(workspace)) {
            const files = new Files<T[]>;
            this.phpUnitXML.getTestSuites().forEach((suite) => {
                files.set(suite.name, new TestDefinitions<T[]>());
            });
            this._workspaces.set(workspace, files);
        }

        return this._workspaces.get(workspace)!;
    }

    async add(uri: URI) {
        if (this.has(uri)) {
            return this;
        }

        const group = this.getGroup(uri);
        if (!group) {
            return this;
        }

        const files = this.items();
        const tests = await this.parseTests(uri);
        if (tests.length > 0) {
            files.get(group)!.set(uri.fsPath, await this.convertTests(tests, group, files.keys()));
        }

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
        for (const { group, file, tests } of this.gatherFiles()) {
            this.deleteFile({ group, file, tests });
        }
        this._workspaces.delete(this.getWorkspace());

        return this;
    }

    findTest(testId: string) {
        for (const testDefinitions of this.gatherTestDefinitions()) {
            if (testId === testDefinitions.id) {
                return testDefinitions;
            }
            for (const child of testDefinitions.children) {
                if (testId === child.id) {
                    return child;
                }
            }
        }

        return;
    }

    * gatherTestDefinitions(): Generator<T> {
        for (const { tests } of this.gatherFiles()) {
            for (const test of tests) {
                yield test;
            }
        }
    }

    findFile(uri: URI): File<T> | undefined {
        for (const { group, file, tests } of this.gatherFiles()) {
            if (uri.fsPath === file) {
                return { group, file, tests };
            }
        }

        return undefined;
    }

    protected abstract convertTests(testDefinitions: TestDefinition[], group: string, groups: string[]): Promise<T[]>

    protected deleteFile(file: File<T>) {
        return this.items().get(file.group)?.delete(file.file);
    }

    private* gatherFiles() {
        for (const [group, files] of this.items().entries()) {
            for (const [file, tests] of files.entries()) {
                yield { group, file, tests };
            }
        }
    }

    private async parseTests(uri: URI): Promise<TestDefinition[]> {
        return await this.testParser.parseFile(uri.fsPath) ?? [];
    }

    private getGroup(uri: URI) {
        const testSuites = this.phpUnitXML.getTestSuites().filter((item) => this.match(item, uri));

        const group = testSuites.find(item => {
            return ['directory', 'file'].includes(item.tag) && this.match(item, uri);
        });
        if (!group) {
            return;
        }

        const exclude = testSuites.find((item) => {
            return item.name === group.name && item.tag === 'exclude' && this.match(item, uri);
        });
        if (exclude) {
            return;
        }

        return group.name;
    }

    private match(testSuite: TestSuite, uri: URI) {
        const workspace = this.getWorkspace();
        const isFile = testSuite.tag === 'file' || (testSuite.tag === 'exclude' && extname(testSuite.value));

        return isFile
            ? join(workspace, testSuite.value) === uri.fsPath
            : !relative(join(workspace, testSuite.value), dirname(uri.fsPath)).startsWith('.');
    }
}

export class TestCollection extends BaseTestCollection<TestDefinition> {
    protected async convertTests(testDefinitions: TestDefinition[]) {
        return testDefinitions;
    }
}
