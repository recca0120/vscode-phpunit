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

export class TestCommandRegistry {
    constructor(
        private getContextForUri: (uri: Uri) => FolderTestContext | undefined,
        private getAllContexts: () => FolderTestContext[],
        private testRunProfile: TestRunProfile,
    ) {}

    reload(): Disposable {
        return commands.registerCommand('phpunit.reload', async () => {
            await Promise.all(this.getAllContexts().map((c) => c.reloadAll()));
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
            await this.runWithEditor((ctx, uri) =>
                ctx.findTestsByPosition(uri, window.activeTextEditor!.selection.active),
            );
        });
    }

    rerun(): Disposable {
        return commands.registerCommand('phpunit.rerun', async () => {
            const ctx = this.findMostRecentTestRun();
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

        const ctx = this.getContextForUri(uri);
        if (!ctx) {
            return;
        }

        const tests = findTests(ctx, uri);
        if (tests.length > 0) {
            await this.run(tests);
        }
    }

    private findMostRecentTestRun(): FolderTestContext | undefined {
        let mostRecent: FolderTestContext | undefined;
        let mostRecentTime = -1;

        for (const ctx of this.getAllContexts()) {
            if (ctx.getPreviousRequest() && ctx.getLastRunAt() > mostRecentTime) {
                mostRecentTime = ctx.getLastRunAt();
                mostRecent = ctx;
            }
        }

        return mostRecent;
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
