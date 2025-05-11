import { glob } from 'glob';
import { minimatch } from 'minimatch';
import { readFile } from 'node:fs/promises';
import {
    CancellationToken, DocumentFilter, MarkdownString, TestController, TestCoverageCount, TestItem, TestItemCollection,
    TestRunRequest as BaseTestRunRequest, TestTag, TextDocument, WorkspaceFolder,
} from 'vscode';
import { URI } from 'vscode-uri';

enum TestRunProfileKind {
    Run = 1,
    Debug = 2,
    Coverage = 3,
}

const TestRunRequest = jest.fn().mockImplementation((include: any) => {
    return {
        include,
    };
});

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
        items.forEach((item) => this.add(item));
    }

    forEach(
        callback: (item: TestItem, collection: TestItemCollection) => unknown,
        _thisArg?: any,
    ): void {
        for (const [, item] of this.items) {
            callback(item, Object.assign(this) as TestItemCollection);
        }
    }

    [Symbol.iterator](): Iterator<[id: string, testItem: TestItem]> {
        return this.items.entries();
    }
}

const createTestItem = jest
    .fn()
    .mockImplementation((id: string, label: string, uri?: URI): TestItem => {
        const testItem = { id, label, uri } as any;
        testItem.children = new FakeTestItemCollection(testItem);

        return testItem;
    });

const createRunProfile = jest
    .fn()
    .mockImplementation((
        label: string,
        kind: TestRunProfileKind,
        runHandler: (
            request: BaseTestRunRequest,
            token: CancellationToken,
        ) => Thenable<void> | void,
        isDefault?: boolean,
        tag?: TestTag,
    ) => ({ label, kind, isDefault, tag, runHandler }));

const createTestRun = jest
    .fn()
    .mockImplementation((_request: BaseTestRunRequest, name?: string, persist?: boolean) => {
        return {
            name: name,
            // token: CancellationToken;
            isPersisted: !!persist,
            enqueued: jest.fn(),
            started: jest.fn(),
            skipped: jest.fn(),
            failed: jest.fn(),
            errored: jest.fn(),
            passed: jest.fn(),
            appendOutput: jest.fn(),
            end: jest.fn(),
            addCoverage: jest.fn(),
        };
    });

const createTestController = jest
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

const TestMessage = {
    diff: jest
        .fn()
        .mockImplementation(
            (message: string | MarkdownString, expected: string, actual: string) => {
                return { message, expected, actual };
            },
        ),
};

class Disposable {
    dispose = (): any => jest.fn();
}

const Location = jest.fn().mockImplementation((uri: URI, rangeOrPosition: any) => {
    return { uri, range: rangeOrPosition };
});

const Range = jest.fn().mockImplementation((start: any, end: any) => {
    return { start, end };
});

class Position {
    constructor(public line: number, public character: number) {}

    translate(lineDelta?: number, characterDelta?: number) {
        return new Position(this.line + (lineDelta ?? 0), characterDelta ?? this.character);
    }
}

const DocumentLink = jest.fn().mockImplementation((range: Range, target?: URI) => {
    return { range, target };
});

const CancellationTokenSource = jest.fn().mockImplementation(() => {
    return {
        token: { isCancellationRequested: false, onCancellationRequested: jest.fn() },
        cancel: jest.fn(),
        dispose: new Disposable(),
    };
});

export class Configuration {
    private items = new Map<string, unknown>();

    constructor(items: Map<string, unknown> | { [p: string]: string } | undefined = undefined) {
        if (items instanceof Map) {
            this.items = items;
        } else if (!!items) {
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

    async update(key: string, value: any) {
        this.items.set(key, value);
        workspace.onDidChangeConfiguration();
    }
}

const configurations = new Map<string, Configuration>();

const workspace = {
    workspaceFolders: [],
    textDocuments: [],
    getConfiguration: jest.fn().mockImplementation((section: string) => {
        if (configurations.has(section)) {
            return configurations.get(section);
        }

        const configuration = new Configuration();
        configurations.set(section, configuration);
        return configuration;
    }),
    getWorkspaceFolder: (uri: URI) => {
        return workspace.workspaceFolders.find((folder: WorkspaceFolder) =>
            uri.toString().includes(folder.uri.toString()),
        );
    },
    findFiles: jest.fn().mockImplementation(async (pattern, exclude: any | undefined) => {
        const splitPattern = (pattern: string) => {
            return pattern.replace(/^{|}$/g, '').split(',').map((v) => v.trim());
        };
        return (await glob(splitPattern(pattern.pattern), {
            absolute: true,
            ignore: exclude ? splitPattern(exclude.pattern) : undefined,
            cwd: pattern.uri.fsPath,
        })).map((file) => URI.file(file.replace(/^\w:/, (matched) => matched.toLowerCase())));
    }),
    createFileSystemWatcher: jest.fn().mockImplementation(() => {
        return {
            onDidCreate: jest.fn(),
            onDidChange: jest.fn(),
            onDidDelete: jest.fn(),
            disposable: new Disposable(),
        };
    }),
    onDidChangeConfiguration: jest.fn().mockImplementation(() => {
        return new Disposable();
    }),
    onDidOpenTextDocument: jest.fn().mockReturnValue(new Disposable()),
    onDidChangeTextDocument: jest.fn().mockReturnValue(new Disposable()),
    fs: {
        readFile: jest.fn().mockImplementation((uri: URI) => readFile(uri.fsPath)),
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
    registerDocumentLinkProvider: jest.fn(),
};

const RelativePattern = jest
    .fn()
    .mockImplementation((workspaceFolder: WorkspaceFolder | URI | string, pattern: string) => {
        if (typeof workspaceFolder === 'string') {
            workspaceFolder = URI.file(workspaceFolder);
        }

        const uri = 'uri' in workspaceFolder ? workspaceFolder.uri : workspaceFolder;

        return { uri, base: uri.fsPath, pattern };
    });

const window = {
    createOutputChannel: jest.fn().mockImplementation(() => {
        return {
            append: jest.fn(),
            appendLine: jest.fn(),
            clear: jest.fn(),
            show: jest.fn(),
        };
    }),
};

const commands = (function () {
    const commands = new Map<string, (...rest: any[]) => void>();
    return {
        registerCommand: jest.fn().mockImplementation((command: string, callback: (...rest: any[]) => void) => {
            commands.set(command, callback);
            return new Disposable();
        }),
        executeCommand: async (command: string, ...rest: any[]) => {
            return commands.get(command)!(...rest);
        },
    };
})();

const EventEmitter = jest.fn().mockImplementation(() => {
    return {
        fire: jest.fn(),
        event: jest.fn(),
    };
});

const TestMessageStackFrame = jest.fn();

const extensions = {
    getExtension: jest.fn().mockImplementation(() => {
        return true;
    }),
};

class FileCoverage {
    constructor(public uri: URI, public statementCoverage: TestCoverageCount) {}
}

class TestCoverageCount {
    constructor(public covered: number, public total: number) {}
}

class StatementCoverage {
    constructor(public executed: number | boolean, public location: any) {}
}

const debug = {
    activeDebugSession: { type: 'php' },
    startDebugging: jest.fn(),
    stopDebugging: jest.fn(),
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
};
