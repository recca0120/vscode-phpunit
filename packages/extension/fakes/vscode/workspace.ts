import { readFile } from 'node:fs/promises';
import { isAbsolute, relative } from 'node:path';
import { glob } from 'glob';
import { minimatch } from 'minimatch';
import { vi } from 'vitest';
import type { WorkspaceFolder } from 'vscode';
import { URI } from 'vscode-uri';
import { Disposable, FakeEventEmitter } from './types';

export class Configuration {
    private items = new Map<string, unknown>();

    constructor(
        items: Map<string, unknown> | { [p: string]: string } | undefined = undefined,
        private section = '',
    ) {
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
        const changed = this.section ? `${this.section}.${key}` : key;
        const event = {
            affectsConfiguration: (section: string) =>
                changed === section || changed.startsWith(`${section}.`),
        };
        for (const [listener] of workspace.onDidChangeConfiguration.mock.calls) {
            if (typeof listener === 'function') {
                listener(event);
            }
        }
    }
}

export const configurations = new Map<string, Configuration>();

const splitPattern = (pattern: string) => {
    return pattern
        .replace(/^{|}$/g, '')
        .split(',')
        .map((v) => v.trim());
};

const workspace = {
    createdWatchers: [] as FakeFileSystemWatcher[],
    workspaceFolders: [],
    textDocuments: [],
    getConfiguration: vi.fn().mockImplementation((section: string, scope?: URI) => {
        const key = scope ? `${section}::${scope.toString()}` : section;
        if (!configurations.has(key)) {
            configurations.set(key, new Configuration(undefined, section));
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
    createFileSystemWatcher: vi.fn().mockImplementation((pattern) => {
        const watcher = new FakeFileSystemWatcher();
        watcher.pattern = pattern;
        workspace.createdWatchers.push(watcher);
        return watcher;
    }),
    fireFileEvent(event: 'create' | 'change' | 'delete', uri: URI) {
        for (const watcher of workspace.createdWatchers) {
            if (!watcher.disposed && watcher.matches(uri)) {
                watcher.fire(event, uri);
            }
        }
    },
    onDidChangeConfiguration: vi.fn().mockImplementation(() => {
        return new Disposable();
    }),
    onDidChangeWorkspaceFolders: vi.fn().mockReturnValue(new Disposable()),
    saveAll: vi.fn().mockResolvedValue(true),
    onDidOpenTextDocument: vi.fn().mockImplementation(() => new Disposable()),
    onDidChangeTextDocument: vi.fn().mockImplementation(() => new Disposable()),
    fs: {
        readFile: (uri: URI) => readFile(uri.fsPath),
    },
};

class FakeFileSystemWatcher {
    private createEmitter = new FakeEventEmitter<URI>();
    private changeEmitter = new FakeEventEmitter<URI>();
    private deleteEmitter = new FakeEventEmitter<URI>();

    readonly ignoreCreateEvents = false;
    readonly ignoreChangeEvents = false;
    readonly ignoreDeleteEvents = false;

    readonly onDidCreate = this.createEmitter.event;
    readonly onDidChange = this.changeEmitter.event;
    readonly onDidDelete = this.deleteEmitter.event;

    disposed = false;
    pattern: unknown;

    matches(uri: URI) {
        const { base, pattern } = this.pattern as { base: string; pattern: string };
        const path = relative(base, uri.fsPath).replace(/\\/g, '/');
        if (path.startsWith('..') || isAbsolute(path)) {
            return false;
        }

        return splitPattern(pattern).some((glob) => minimatch(path, glob, { dot: true }));
    }

    fire(event: 'create' | 'change' | 'delete', uri: URI) {
        ({ create: this.createEmitter, change: this.changeEmitter, delete: this.deleteEmitter })[
            event
        ].fire(uri);
    }

    dispose() {
        this.disposed = true;
        this.createEmitter.dispose();
        this.changeEmitter.dispose();
        this.deleteEmitter.dispose();
    }
}

export { FakeFileSystemWatcher, workspace };
