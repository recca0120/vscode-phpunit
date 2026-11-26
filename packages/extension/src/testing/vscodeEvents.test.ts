import { describe, expect, it, vi } from 'vitest';
import { type TextDocument, Uri, type WorkspaceFolder, workspace } from 'vscode';
import {
    changeConfiguration,
    changeTextDocument,
    changeWorkspaceFolders,
    openTextDocument,
} from './vscodeEvents';

const document = { uri: Uri.file('/project/tests/ExampleTest.php') } as TextDocument;

const folder = (name: string, index: number): WorkspaceFolder => ({
    index,
    name,
    uri: Uri.file(`/${name}`),
});

describe('vscode events', () => {
    it('delivers an opened document to onDidOpenTextDocument listeners', async () => {
        const listener = vi.fn();
        workspace.onDidOpenTextDocument(listener);

        await openTextDocument(document);

        expect(listener).toHaveBeenCalledWith(document);
    });

    it('delivers a change event with the document to onDidChangeTextDocument listeners', async () => {
        const listener = vi.fn();
        workspace.onDidChangeTextDocument(listener);

        await changeTextDocument(document);

        expect(listener).toHaveBeenCalledWith({ document, contentChanges: [], reason: undefined });
    });

    it('affects a section when the section or a key below it changed', async () => {
        const affected: Record<string, boolean> = {};
        workspace.onDidChangeConfiguration((event) => {
            for (const section of ['phpunit', 'phpunit.args', 'php', 'editor']) {
                affected[section] = event.affectsConfiguration(section);
            }
        });

        await changeConfiguration(['phpunit.args']);

        expect(affected).toEqual({
            phpunit: true,
            'phpunit.args': true,
            php: false,
            editor: false,
        });
    });

    it('updates workspaceFolders before notifying onDidChangeWorkspaceFolders listeners', async () => {
        Object.defineProperty(workspace, 'workspaceFolders', {
            value: [folder('a', 0), folder('b', 1)],
        });
        let seen: string[] = [];
        workspace.onDidChangeWorkspaceFolders(() => {
            seen = (workspace.workspaceFolders ?? []).map(({ name, index }) => `${index}:${name}`);
        });

        await changeWorkspaceFolders({ added: [folder('c', 2)], removed: [folder('a', 0)] });

        expect(seen).toEqual(['0:b', '1:c']);
    });

    it('waits for async listeners', async () => {
        let finished = false;
        workspace.onDidOpenTextDocument(async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            finished = true;
        });

        await openTextDocument(document);

        expect(finished).toBe(true);
    });

    it('does not notify listeners registered before mocks were cleared', async () => {
        const stale = vi.fn();
        workspace.onDidOpenTextDocument(stale);
        vi.clearAllMocks();

        await openTextDocument(document);

        expect(stale).not.toHaveBeenCalled();
    });
});
