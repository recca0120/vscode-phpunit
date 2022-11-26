import { readFileSync } from 'fs';
import {
    CancellationToken,
    DocumentFilter,
    MarkdownString,
    TestController,
    TestItem,
    TestItemCollection,
    TestRunRequest,
    TestTag,
    TextDocument,
    WorkspaceFolder,
} from 'vscode';
import { glob } from 'glob';
import { URI } from 'vscode-uri';
import * as minimatch from 'minimatch';

enum TestRunProfileKind {
    Run = 1,
    Debug = 2,
    Coverage = 3,
}

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

    constructor(private parent?: any) {}

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
        _thisArg?: any
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
    .mockImplementation(
        (
            label: string,
            kind: TestRunProfileKind,
            runHandler: (
                request: TestRunRequest,
                token: CancellationToken
            ) => Thenable<void> | void,
            isDefault?: boolean,
            tag?: TestTag
        ) => ({ label, kind, isDefault, tag, runHandler })
    );

const createTestRun = jest
    .fn()
    .mockImplementation((_request: TestRunRequest, name?: string, persist?: boolean) => {
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
            }
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

const Position = jest.fn().mockImplementation((line: number, character: number) => {
    return { line, character };
});

const CancellationTokenSource = jest.fn().mockImplementation(() => {
    return {
        token: { isCancellationRequested: false, onCancellationRequested: jest.fn() },
        cancel: jest.fn(),
        dispose: new Disposable(),
    };
});

const workspace = {
    workspaceFolders: [],
    textDocuments: [],
    getWorkspaceFolder: (uri: URI) => {
        return workspace.workspaceFolders.find((folder: WorkspaceFolder) =>
            uri.toString().includes(folder.uri.toString())
        );
    },
    findFiles: jest.fn().mockImplementation((pattern) => {
        return Promise.resolve(
            glob
                .sync(pattern.pattern, {
                    absolute: true,
                    ignore: ['**/node_modules/**', '**/.git/**', '**/vendor/**'],
                    cwd: pattern.uri.fsPath,
                    cache: true as any,
                })
                .map((file) => URI.parse(file))
        );
    }),
    createFileSystemWatcher: jest.fn().mockImplementation(() => {
        return {
            onDidCreate: jest.fn(),
            onDidChange: jest.fn(),
            onDidDelete: jest.fn(),
            disposable: new Disposable(),
        };
    }),
    onDidOpenTextDocument: jest.fn().mockReturnValue(new Disposable()),
    onDidChangeTextDocument: jest.fn().mockReturnValue(new Disposable()),
    fs: {
        readFile: jest.fn().mockImplementation((uri: URI) => {
            return new Promise((resolve) => resolve(readFileSync(uri.fsPath)));
        }),
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
};

const RelativePattern = jest
    .fn()
    .mockImplementation((workspaceFolder: WorkspaceFolder, pattern: string) => {
        return {
            uri: workspaceFolder.uri,
            base: workspaceFolder.uri.fsPath,
            pattern,
        };
    });

export {
    languages,
    workspace,
    Disposable,
    Range,
    Position,
    Location,
    tests,
    TestRunProfileKind,
    TestMessage,
    CancellationTokenSource,
    RelativePattern,
    Uri,
};
