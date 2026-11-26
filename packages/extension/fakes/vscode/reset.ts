import { debug } from './debug';
import { window } from './window';
import { configurations, workspace } from './workspace';

const dialogs = {
    showErrorMessage: window.showErrorMessage,
    showWarningMessage: window.showWarningMessage,
    showInformationMessage: window.showInformationMessage,
    showQuickPick: window.showQuickPick,
};

const define = (target: object, key: string, value: unknown) =>
    Object.defineProperty(target, key, { value, writable: true, configurable: true });

export const resetFakeVscode = () => {
    configurations.clear();
    define(workspace, 'workspaceFolders', []);
    define(workspace, 'textDocuments', []);
    workspace.createdWatchers.length = 0;
    workspace.findFiles._concurrentCount = 0;
    workspace.findFiles._maxConcurrent = 0;

    for (const [name, dialog] of Object.entries(dialogs)) {
        dialog.mockReset();
        define(window, name, dialog);
    }
    define(window, 'activeTextEditor', undefined);

    define(debug, 'activeDebugSession', { type: 'php' });
};
