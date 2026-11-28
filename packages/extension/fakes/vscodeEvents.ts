import type { Mock } from 'vitest';
import {
    type ConfigurationChangeEvent,
    type TextDocument,
    type TextDocumentChangeEvent,
    type TextDocumentContentChangeEvent,
    Uri,
    type WorkspaceFolder,
    type WorkspaceFoldersChangeEvent,
    workspace,
} from 'vscode';
import { createTextDocument } from './textDocument';

type Listener<E> = (event: E) => unknown;

const listenersOf = <E>(event: unknown): Listener<E>[] =>
    (event as Mock).mock.calls
        .map(([listener]) => listener)
        .filter((listener): listener is Listener<E> => typeof listener === 'function');

const fire = async <E>(event: unknown, payload: E) => {
    await Promise.all(listenersOf<E>(event).map((listener) => listener(payload)));
};

export const configurationListener = () =>
    listenersOf<ConfigurationChangeEvent>(workspace.onDidChangeConfiguration)[0];

export const workspaceFoldersListener = () =>
    listenersOf<WorkspaceFoldersChangeEvent>(workspace.onDidChangeWorkspaceFolders)[0];

export const openTextDocument = (document: TextDocument) =>
    fire<TextDocument>(workspace.onDidOpenTextDocument, document);

export const changeTextDocument = (document: TextDocument) =>
    fire<TextDocumentChangeEvent>(workspace.onDidChangeTextDocument, {
        document,
        contentChanges: [],
        reason: undefined,
    });

export const changeConfiguration = (changedKeys: string[]) =>
    fire<ConfigurationChangeEvent>(workspace.onDidChangeConfiguration, {
        affectsConfiguration: (section: string) =>
            changedKeys.some((key) => key === section || key.startsWith(`${section}.`)),
    });

export const changeWorkspaceFolders = ({
    added = [],
    removed = [],
}: {
    added?: WorkspaceFolder[];
    removed?: WorkspaceFolder[];
}) => {
    const removedUris = new Set(removed.map((folder) => folder.uri.toString()));
    const folders = [...(workspace.workspaceFolders ?? []), ...added]
        .filter((folder) => !removedUris.has(folder.uri.toString()))
        .map((folder, index) => ({ ...folder, index }));
    Object.defineProperty(workspace, 'workspaceFolders', { value: folders });

    return fire<WorkspaceFoldersChangeEvent>(workspace.onDidChangeWorkspaceFolders, {
        added,
        removed,
    });
};

export const editTextDocument = (file: string, text: string) => {
    const document = { ...createTextDocument(text, Uri.file(file)), isDirty: true };
    const others = workspace.textDocuments.filter(
        (opened) => opened.uri.toString() !== document.uri.toString(),
    );
    Object.defineProperty(workspace, 'textDocuments', { value: [...others, document] });

    return fire<TextDocumentChangeEvent>(workspace.onDidChangeTextDocument, {
        document,
        contentChanges: [{ text } as TextDocumentContentChangeEvent],
        reason: undefined,
    });
};
