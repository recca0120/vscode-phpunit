import { readFileSync } from 'node:fs';
import { glob } from 'glob';
import { Uri, type WorkspaceFolder, window, workspace } from 'vscode';
import { createTextDocument } from './textDocument';

export type FolderSetup = {
    root: string;
    name?: string;
    settings?: Record<string, unknown>;
};

const openTestDocuments = (root: string) =>
    glob
        .sync('**/*Test.php', {
            cwd: root,
            absolute: true,
            ignore: ['**/node_modules/**', '**/.git/**', '**/vendor/**'],
        })
        .map((file) => createTextDocument(readFileSync(file).toString(), Uri.file(file)));

export const openWorkspace = async (...folders: FolderSetup[]): Promise<WorkspaceFolder[]> => {
    const workspaceFolders = folders.map(({ root, name = 'phpunit' }, index) => ({
        index,
        name,
        uri: Uri.file(root),
    }));
    Object.defineProperty(workspace, 'workspaceFolders', { value: workspaceFolders });
    Object.defineProperty(workspace, 'textDocuments', {
        value: folders.flatMap(({ root }) => openTestDocuments(root)),
    });

    for (const [index, { settings = {} }] of folders.entries()) {
        const configuration = workspace.getConfiguration('phpunit', workspaceFolders[index].uri);
        for (const [key, value] of Object.entries(settings)) {
            await configuration.update(key, value);
        }
    }

    return workspaceFolders;
};

export const setActiveTextEditor = (
    file: string,
    selection?: { line: number; character: number },
) => {
    Object.defineProperty(window, 'activeTextEditor', {
        value: {
            document: { uri: Uri.file(file) },
            ...(selection && { selection: { active: selection } }),
        },
        enumerable: true,
        configurable: true,
    });
};
