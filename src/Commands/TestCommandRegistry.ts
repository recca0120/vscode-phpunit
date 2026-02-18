import type { Container } from 'inversify';
import {
    CancellationTokenSource,
    commands,
    type Disposable,
    type TestItem,
    type TestRunProfile,
    TestRunRequest as TestRunRequestImpl,
    type Uri,
    window,
    workspace,
} from 'vscode';
import { TestCollection } from '../TestCollection/TestCollection';
import { TestRunHandler } from '../TestExecution/TestRunHandler';
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
            let groups = this.findAllGroups();

            if (groups.length === 0) {
                await this.folderManager.reloadAll();
                groups = this.findAllGroups();
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

            const tests = this.findTestsByGroup(selected);
            if (tests.length > 0) {
                await this.run(tests);
            }
        });
    }

    rerun(): Disposable {
        return commands.registerCommand('phpunit.rerun', async () => {
            const ctx = this.findMostRecentRun();
            if (!ctx) {
                return;
            }

            await this.run(ctx.findTestsByRequest(ctx.getPreviousRequest()));
        });
    }

    private findAllGroups(): string[] {
        return [
            ...new Set(
                this.folderManager.getAll().flatMap((c) => c.get(TestCollection).findGroups()),
            ),
        ].sort();
    }

    private findTestsByGroup(group: string): TestItem[] {
        return this.folderManager
            .getAll()
            .flatMap((c) => c.get(TestCollection).findTestsByGroup(group));
    }

    private findMostRecentRun(): FolderTestContext | undefined {
        let mostRecent: FolderTestContext | undefined;
        let mostRecentTime = -1;

        for (const child of this.folderManager.getAll()) {
            const runHandler = child.get(TestRunHandler);
            if (runHandler.getPreviousRequest() && runHandler.getLastRunAt() > mostRecentTime) {
                mostRecentTime = runHandler.getLastRunAt();
                mostRecent = this.toContext(child);
            }
        }

        return mostRecent;
    }

    private getContextForUri(uri: Uri): FolderTestContext | undefined {
        const folder = workspace.getWorkspaceFolder(uri);
        if (!folder) {
            return undefined;
        }

        const container = this.folderManager.getByKey(folder.uri.toString());
        return container ? this.toContext(container) : undefined;
    }

    private toContext(container: Container): FolderTestContext {
        return {
            findTestsByFile: (uri) => container.get(TestCollection).findTestsByFile(uri),
            findTestsByPosition: (uri, pos) =>
                container.get(TestCollection).findTestsByPosition(uri, pos),
            findTestsByRequest: (req) => container.get(TestCollection).findTestsByRequest(req),
            getPreviousRequest: () => container.get(TestRunHandler).getPreviousRequest(),
            getLastRunAt: () => container.get(TestRunHandler).getLastRunAt(),
        };
    }

    private async runWithEditor(
        findTests: (ctx: FolderTestContext, uri: Uri) => TestItem[],
    ): Promise<void> {
        const uri = window.activeTextEditor?.document.uri;
        if (!uri) {
            return;
        }

        const ctx = this.getContextForUri(uri);
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
