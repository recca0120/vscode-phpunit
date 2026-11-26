import { describe, expect, it, vi } from 'vitest';
import { debug, RelativePattern, Uri, window, workspace } from 'vscode';

describe('each test starts with a clean fake vscode', () => {
    const folder = { index: 0, name: 'project', uri: Uri.file('/project') };

    it('leaves state behind', async () => {
        await workspace.getConfiguration('phpunit', folder.uri).update('args', ['-v']);
        Object.defineProperty(workspace, 'workspaceFolders', { value: [folder] });
        Object.defineProperty(workspace, 'textDocuments', { value: [{ uri: folder.uri }] });
        workspace.createFileSystemWatcher(new RelativePattern('/project', '**/*.php'));
        window.showErrorMessage = (() =>
            Promise.resolve('replaced')) as typeof window.showErrorMessage;
        vi.mocked(window.showQuickPick).mockResolvedValue({ label: 'integration' });
        Object.defineProperty(window, 'activeTextEditor', {
            value: { document: { uri: folder.uri } },
            configurable: true,
        });
        Object.defineProperty(debug, 'activeDebugSession', {
            value: undefined,
            configurable: true,
        });

        expect(workspace.workspaceFolders).toHaveLength(1);
    });

    it('starts clean', async () => {
        expect(workspace.getConfiguration('phpunit', folder.uri).get('args')).toBeUndefined();
        expect(workspace.workspaceFolders).toEqual([]);
        expect(workspace.textDocuments).toEqual([]);
        expect((workspace as unknown as { createdWatchers: unknown[] }).createdWatchers).toEqual(
            [],
        );
        expect(window.activeTextEditor).toBeUndefined();
        expect(debug.activeDebugSession).toEqual({ type: 'php' });
        expect(await window.showQuickPick(['a'])).toBeUndefined();
        expect(await window.showErrorMessage('message')).toBeUndefined();
    });
});
