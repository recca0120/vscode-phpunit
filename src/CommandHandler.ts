import { CancellationTokenSource, commands, TestItem, TestRunProfile, TestRunRequest, window } from 'vscode';
import { Handler } from './Handler';
import { TestCollection } from './TestCollection';

export class CommandHandler {
    constructor(private testCollection: TestCollection, private testRunProfile: TestRunProfile) {}

    reload(callback: () => void) {
        return commands.registerCommand('phpunit.reload', async () => {
            callback();
        });
    }

    runAll() {
        return commands.registerCommand('phpunit.run-all', async () => {
            await this.run(undefined);
        });
    }

    runFile() {
        return commands.registerCommand('phpunit.run-file', async () => {
            const uri = window.activeTextEditor?.document.uri;
            if (!uri) {
                return;
            }

            const tests = this.testCollection.findTestsByFile(uri);
            if (tests.length > 0) {
                await this.run(tests);
            }
        });
    }

    runTestAtCursor() {
        return commands.registerCommand('phpunit.run-test-at-cursor', async () => {
            const uri = window.activeTextEditor?.document.uri;
            if (!uri) {
                return;
            }

            const tests = this.testCollection.findTestsByPosition(uri, window.activeTextEditor!.selection.active!);
            if (tests.length > 0) {
                await this.run(tests);
            }
        });
    }

    rerun(handler: Handler) {
        return commands.registerCommand('phpunit.rerun', () => {
            return this.run(
                this.testCollection.findTestsByRequest(handler.getPreviousRequest()),
            );
        });
    }

    private async run(include: readonly TestItem[] | undefined) {
        const cancellation = new CancellationTokenSource().token;

        await this.testRunProfile.runHandler(new TestRunRequest(include, undefined, this.testRunProfile), cancellation);
    }
}