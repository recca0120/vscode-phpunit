import { readFile } from 'node:fs/promises';
import { glob } from 'glob';
import { minimatch } from 'minimatch';
import { vi } from 'vitest';
import type {
    TestRunRequest as BaseTestRunRequest,
    CancellationToken,
    DocumentFilter,
    MarkdownString,
    TestController,
    TestCoverageCount,
    TestItem,
    TestItemCollection,
    TestTag,
    TextDocument,
    WorkspaceFolder,
} from 'vscode';
import { URI } from 'vscode-uri';

enum TestRunProfileKind {
    Run = 1,
    Debug = 2,
    Coverage = 3,
}

class FakeTestRunRequest {
    constructor(
        public include?: any,
        public exclude?: any,
        public profile?: any,
        public continuous: boolean = false,
    ) {}
}
const TestRunRequest = FakeTestRunRequest;

const isWin = process.platform === 'win32';

const Uri = new Proxy(URI, {
    get: (target: any, p) => {
        if (p !== 'file' || isWin) {
            return target[p];
        }

        return (...args: any[]) => {
            const result = target[p].apply(target, args);
            const str = result.toString().replace(/%5C/g, '/');
            const fsPath = result.fsPath;
            const path = result.path.replace(/\\/g, '/');

            return Object.assign({}, result, {
                path,
                fsPath,
                toString: () => str,
            });
        };
    },
});

class FakeTestTag {
    readonly id: string;
    constructor(id: string) {
        this.id = id;
    }
}

class FakeTestItemCollection implements Iterable<[id: string, testItem: TestItem]> {
    private items = new Map<string, TestItem>();
    private readonly parent: any;

    constructor(parent: any = undefined) {
        this.parent = parent === undefined ? undefined : parent;
    }

    get size() {
        return this.items.size;
    }

    add(item: TestItem) {
        if (this.parent) {
            item = Object.defineProperty(item, 'parent', { value: this.parent });
        }
        this.items.set(item.id, item);
    }

    get(itemId: string) {
        return this.items.get(itemId);
    }

    delete(itemId: string) {
        return this.items.delete(itemId);
    }

    replace(items: readonly TestItem[]) {
        this.items.clear();
        for (const item of items) {
            this.add(item);
        }
    }

    forEach(
        callback: (item: TestItem, collection: TestItemCollection) => unknown,
        _thisArg?: any,
    ): void {
        const sorted = [...this.items.values()].sort((a, b) =>
            (a.sortText || a.label).localeCompare(b.sortText || b.label),
        );
        for (const item of sorted) {
            callback(item, Object.assign(this) as TestItemCollection);
        }
    }

    [Symbol.iterator](): Iterator<[id: string, testItem: TestItem]> {
        const sorted = [...this.items.entries()].sort(([, a], [, b]) =>
            (a.sortText || a.label).localeCompare(b.sortText || b.label),
        );
        return sorted[Symbol.iterator]();
    }
}

const createTestItem = vi
    .fn()
    .mockImplementation((id: string, label: string, uri?: URI): TestItem => {
        const testItem = { id, label, uri } as any;
        testItem.children = new FakeTestItemCollection(testItem);

        return testItem;
    });

const createRunProfile = vi
    .fn()
    .mockImplementation(
        (
            label: string,
            kind: TestRunProfileKind,
            runHandler: (
                request: BaseTestRunRequest,
                token: CancellationToken,
            ) => Thenable<void> | void,
            isDefault?: boolean,
            tag?: TestTag,
        ) => ({ label, kind, isDefault, tag, runHandler }),
    );

const createTestRun = vi
    .fn()
    .mockImplementation((_request: BaseTestRunRequest, name?: string, persist?: boolean) => {
        return {
            name: name,
            // token: CancellationToken;
            isPersisted: !!persist,
            enqueued: vi.fn(),
            started: vi.fn(),
            skipped: vi.fn(),
            failed: vi.fn(),
            errored: vi.fn(),
            passed: vi.fn(),
            appendOutput: vi.fn(),
            end: vi.fn(),
            addCoverage: vi.fn(),
        };
    });

const createTestController = vi
    .fn()
    .mockImplementation((id: string, label: string): TestController => {
        const testController = {
            id,
            label,
            createRunProfile,
            createTestItem,
            createTestRun,
        } as any;
        testController.items = new FakeTestItemCollection();

        return testController;
    });

const tests = { createTestController };

class FakeTestMessage {
    constructor(public message: string | MarkdownString) {}

    static diff(message: string | MarkdownString, expected: string, actual: string) {
        const msg = new FakeTestMessage(message);
        (msg as any).expected = expected;
        (msg as any).actual = actual;
        return msg;
    }
}
const TestMessage = FakeTestMessage;

class Disposable {
    dispose() {}
}

class FakeLocation {
    constructor(
        public uri: URI,
        public range: any,
    ) {}
}
const Location = FakeLocation;

class FakeRange {
    constructor(
        public start: any,
        public end: any,
    ) {}
}
const Range = FakeRange;

class Position {
    constructor(
        public line: number,
        public character: number,
    ) {}

    translate(lineDelta?: number, characterDelta?: number) {
        return new Position(this.line + (lineDelta ?? 0), characterDelta ?? this.character);
    }
}

class FakeDocumentLink {
    constructor(
        public range: any,
        public target?: URI,
    ) {}
}
const DocumentLink = FakeDocumentLink;

class FakeCancellationTokenSource {
    private listeners: Array<() => void> = [];

    token = {
        isCancellationRequested: false,
        onCancellationRequested: (listener: () => void) => {
            this.listeners.push(listener);
            return new Disposable();
        },
    };

    cancel() {
        this.token.isCancellationRequested = true;
        for (const fn of this.listeners) {
            fn();
        }
    }

    dispose() {}
}
const CancellationTokenSource = FakeCancellationTokenSource;

export class Configuration {
    private items = new Map<string, unknown>();

    constructor(items: Map<string, unknown> | { [p: string]: string } | undefined = undefined) {
        if (items instanceof Map) {
            this.items = items;
        } else if (items) {
            for (const x in items) {
                this.items.set(x, items[x]);
            }
        }
    }

    get(key: string, defaultValue?: unknown): unknown | undefined {
        return this.has(key) ? this.items.get(key) : defaultValue;
    }

    has(key: string) {
        return this.items.has(key);
    }

    inspect(key: string) {
        const value = this.items.has(key) ? this.items.get(key) : undefined;
        return {
            key,
            defaultValue: undefined,
            globalValue: undefined,
            workspaceValue: undefined,
            workspaceFolderValue: value,
        };
    }

    async update(key: string, value: any) {
        this.items.set(key, value);
        workspace.onDidChangeConfiguration();
    }
}

const configurations = new Map<string, Configuration>();

const workspace = {
    workspaceFolders: [],
    textDocuments: [],
    getConfiguration: vi.fn().mockImplementation((section: string, scope?: URI) => {
        const key = scope ? `${section}::${scope.toString()}` : section;
        if (!configurations.has(key)) {
            configurations.set(key, new Configuration());
        }
        return configurations.get(key);
    }),
    getWorkspaceFolder: (uri: URI) => {
        return workspace.workspaceFolders.find((folder: WorkspaceFolder) =>
            uri.toString().includes(folder.uri.toString()),
        );
    },
    findFiles: Object.assign(
        vi.fn().mockImplementation(async (pattern, exclude: any | undefined) => {
            workspace.findFiles._concurrentCount++;
            workspace.findFiles._maxConcurrent = Math.max(
                workspace.findFiles._maxConcurrent,
                workspace.findFiles._concurrentCount,
            );
            try {
                const splitPattern = (pattern: string) => {
                    return pattern
                        .replace(/^{|}$/g, '')
                        .split(',')
                        .map((v) => v.trim());
                };
                return (
                    await glob(splitPattern(pattern.pattern), {
                        absolute: true,
                        ignore: exclude ? splitPattern(exclude.pattern) : undefined,
                        cwd: pattern.uri.fsPath,
                    })
                ).map((file) => URI.file(file.replace(/^\w:/, (matched) => matched.toLowerCase())));
            } finally {
                workspace.findFiles._concurrentCount--;
            }
        }),
        { _concurrentCount: 0, _maxConcurrent: 0 },
    ),
    createFileSystemWatcher: vi.fn().mockImplementation(() => {
        return {
            onDidCreate: vi.fn(),
            onDidChange: vi.fn(),
            onDidDelete: vi.fn(),
            dispose: vi.fn(),
            disposable: new Disposable(),
        };
    }),
    onDidChangeConfiguration: vi.fn().mockImplementation(() => {
        return new Disposable();
    }),
    onDidChangeWorkspaceFolders: vi.fn().mockReturnValue(new Disposable()),
    onDidOpenTextDocument: (_listener: any) => new Disposable(),
    onDidChangeTextDocument: (_listener: any) => new Disposable(),
    fs: {
        readFile: (uri: URI) => readFile(uri.fsPath),
    },
};

const languages = {
    match: (documentFilter: DocumentFilter, document: TextDocument) => {
        const pattern =
            typeof documentFilter.pattern === 'string'
                ? documentFilter.pattern
                : documentFilter.pattern!.pattern;

        return minimatch(document.uri.fsPath, pattern) ? 10 : 0;
    },
    registerDocumentLinkProvider: (_selector: any, _provider: any) => new Disposable(),
};

class FakeRelativePattern {
    uri: URI;
    base: string;
    pattern: string;
    constructor(workspaceFolder: WorkspaceFolder | URI | string, pattern: string) {
        if (typeof workspaceFolder === 'string') {
            workspaceFolder = URI.file(workspaceFolder);
        }
        const uri = 'uri' in workspaceFolder ? workspaceFolder.uri : workspaceFolder;
        this.uri = uri;
        this.base = uri.fsPath;
        this.pattern = pattern;
    }
}
const RelativePattern = FakeRelativePattern;

const window = {
    createOutputChannel: vi.fn().mockImplementation(() => {
        return {
            append: vi.fn(),
            appendLine: vi.fn(),
            clear: vi.fn(),
            show: vi.fn(),
        };
    }),
    showErrorMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    showQuickPick: vi.fn(),
};

const commands = (() => {
    const commands = new Map<string, (...rest: any[]) => void>();
    return {
        registerCommand: vi
            .fn()
            .mockImplementation((command: string, callback: (...rest: any[]) => void) => {
                commands.set(command, callback);
                return new Disposable();
            }),
        executeCommand: async (command: string, ...rest: any[]) => {
            return commands.get(command)!(...rest);
        },
    };
})();

class FakeEventEmitter<T = void> {
    private listeners: Array<(e: T) => void> = [];

    event = (listener: (e: T) => void) => {
        this.listeners.push(listener);
        return new Disposable();
    };

    fire(data: T) {
        for (const fn of this.listeners) {
            fn(data);
        }
    }

    dispose() {
        this.listeners = [];
    }
}
const EventEmitter = FakeEventEmitter;

class FakeTestMessageStackFrame {}
const TestMessageStackFrame = FakeTestMessageStackFrame;

const extensions = {
    getExtension: () => true,
};

class FileCoverage {
    constructor(
        public uri: URI,
        public statementCoverage: TestCoverageCount,
    ) {}
}

class TestCoverageCount {
    constructor(
        public covered: number,
        public total: number,
    ) {}
}

class StatementCoverage {
    constructor(
        public executed: number | boolean,
        public location: any,
    ) {}
}

const debug = {
    activeDebugSession: { type: 'php' },
    startDebugging: vi.fn(),
    stopDebugging: vi.fn(),
};

export {
    languages,
    workspace,
    Disposable,
    Range,
    Position,
    Location,
    tests,
    TestRunProfileKind,
    TestRunRequest,
    TestMessage,
    CancellationTokenSource,
    RelativePattern,
    Uri,
    window,
    commands,
    EventEmitter,
    TestMessageStackFrame,
    extensions,
    FileCoverage,
    TestCoverageCount,
    StatementCoverage,
    DocumentLink,
    debug,
    FakeTestTag as TestTag,
};
