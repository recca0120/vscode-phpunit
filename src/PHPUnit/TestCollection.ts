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

export abstract class BaseTestCollection<T> {
    private readonly _workspaces: Workspace<T[]>;

    constructor(private phpUnitXML: PHPUnitXML, protected testParser: TestParser) {
        this._workspaces = new Workspace<T[]>;
    }

    items() {
        const workspace = this.getWorkspace();
        if (!this._workspaces.has(workspace)) {
            this._workspaces.set(workspace, new Files);
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
        const tests = await this.convertTests(await this.parseTests(uri));
        if (tests.length === 0) {
            return this;
        }

        if (!files.has(group)) {
            files.set(group, new TestDefinitions<T[]>());
        }
        files.get(group)!.set(uri.fsPath, tests);

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
        for (const [group, files] of this.items().entries()) {
            for (const [file, tests] of files.entries()) {
                this.deleteFile({ group, file, tests });
            }
        }
        this._workspaces.delete(this.getWorkspace());

        return this;
    }

    entries() {
        return this.items().entries();
    }

    protected abstract convertTests(testDefinitions: TestDefinition[]): Promise<T[]>

    protected findFile(uri: URI): File<T> | undefined {
        for (const [group, files] of this.items().entries()) {
            for (const [file, tests] of files.entries()) {
                if (uri.fsPath === file) {
                    return { group, file, tests };
                }
            }
        }

        return undefined;
    }

    protected deleteFile(file: File<T>) {
        return this.items().get(file.group)?.delete(file.file);
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

    private getWorkspace() {
        return URI.file(this.phpUnitXML.root()).fsPath;
    }
}

export class TestCollection extends BaseTestCollection<TestDefinition> {
    protected async convertTests(testDefinitions: TestDefinition[]) {
        return testDefinitions;
    }
}
