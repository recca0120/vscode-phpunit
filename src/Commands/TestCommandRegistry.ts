import {
    CancellationTokenSource,
    commands,
    type Disposable,
    type TestItem,
    type TestRunProfile,
    TestRunRequest as TestRunRequestImpl,
    type Uri,
    window,
} from 'vscode';
import type { FolderTestContext } from '../types';
import type { WorkspaceFolderManager } from '../WorkspaceFolderManager';

export class TestCommandRegistry {
    constructor(
        private folderManager: WorkspaceFolderManager,
        private testRunProfile: TestRunProfile,
    ) {}

    reload(): Disposable {
        return commands.registerCommand('phpunit.reload', async () => {
            await this.folderManager.reloadAll();
        });
    }

    runAll(): Disposable {
        return commands.registerCommand('phpunit.run-all', async () => {
            await this.run(undefined);
        });
    }

    runFile(): Disposable {
        return commands.registerCommand('phpunit.run-file', async () => {
            await this.runWithEditor((ctx, uri) => ctx.findTestsByFile(uri));
        });
    }

    runTestAtCursor(): Disposable {
        return commands.registerCommand('phpunit.run-test-at-cursor', async () => {
            await this.runWithEditor((ctx, uri) => {
                const editor = window.activeTextEditor;
                return editor ? ctx.findTestsByPosition(uri, editor.selection.active) : [];
            });
        });
    }

    runByGroup(): Disposable {
        return commands.registerCommand('phpunit.run-by-group', async () => {
            let groups = this.folderManager.findAllGroups();

            if (groups.length === 0) {
                await this.folderManager.reloadAll();
                groups = this.folderManager.findAllGroups();
            }

            if (groups.length === 0) {
                window.showInformationMessage(
                    'No PHPUnit groups found. Add @group annotations or #[Group] attributes to your tests.',
                );
                return;
            }

            const selected = await window.showQuickPick(groups, {
                placeHolder: 'Select a PHPUnit group to run',
                title: 'Run Tests by Group',
            });
            if (!selected) {
                return;
            }

            const tests = this.folderManager.findTestsByGroup(selected);
            if (tests.length > 0) {
                await this.run(tests);
            }
        });
    }

    rerun(): Disposable {
        return commands.registerCommand('phpunit.rerun', async () => {
            const ctx = this.folderManager.findMostRecentRun();
            if (!ctx) {
                return;
            }

            await this.run(ctx.findTestsByRequest(ctx.getPreviousRequest()));
        });
    }

    private async runWithEditor(
        findTests: (ctx: FolderTestContext, uri: Uri) => TestItem[],
    ): Promise<void> {
        const uri = window.activeTextEditor?.document.uri;
        if (!uri) {
            return;
        }

        const ctx = this.folderManager.getContextForUri(uri);
        if (!ctx) {
            return;
        }

        const tests = findTests(ctx, uri);
        if (tests.length === 0) {
            return;
        }

        await this.run(tests);
    }

    private async run(include: readonly TestItem[] | undefined) {
        const cts = new CancellationTokenSource();
        try {
            await this.testRunProfile.runHandler(
                new TestRunRequestImpl(include, undefined, this.testRunProfile),
                cts.token,
            );
        } finally {
            cts.dispose();
        }
    }
}
