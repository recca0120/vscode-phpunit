import { Uri, workspace } from 'vscode';

type FileEvent = 'create' | 'change' | 'delete';

type FakeFileSystemWatcher = { disposed: boolean; matches(uri: Uri): boolean };

const fakeWorkspace = workspace as unknown as {
    createdWatchers: FakeFileSystemWatcher[];
    fireFileEvent(event: FileEvent, uri: Uri): void;
    findFiles: { _concurrentCount: number; _maxConcurrent: number };
};

export const fileSystemWatchers = () => [...fakeWorkspace.createdWatchers];

export const isWatched = (file: string) =>
    fakeWorkspace.createdWatchers.some(
        (watcher) => !watcher.disposed && watcher.matches(Uri.file(file)),
    );

export const fireFileEvent = (event: FileEvent, file: string) =>
    fakeWorkspace.fireFileEvent(event, Uri.file(file));

export const resetFindFilesConcurrency = () => {
    fakeWorkspace.findFiles._concurrentCount = 0;
    fakeWorkspace.findFiles._maxConcurrent = 0;
};

export const maxConcurrentFindFiles = () => fakeWorkspace.findFiles._maxConcurrent;
