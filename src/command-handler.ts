import { CancellationTokenSource, commands, TestItem, TestRunProfile, TestRunRequest, window } from 'vscode';
import { TestFile } from './test-file';
import { Handler } from './handler';

export class CommandHandler {
    constructor(private testRunProfile: TestRunProfile, private testData: Map<string, TestFile>) {
    }

    runAll() {
        return commands.registerCommand('phpunit.run-all', () => {
            this.run(undefined);
        });
    }

    runFile() {
        return commands.registerCommand('phpunit.run-file', () => {
            const testFile = this.findTestFile();

            if (testFile) {
                this.run(testFile.testItems);
            }
        });
    }

    runTestAtCursor() {
        return commands.registerCommand('phpunit.run-test-at-cursor', () => {
            const testFile = this.findTestFile();

            if (testFile) {
                this.run([
                    testFile.findTestItemByPosition(window.activeTextEditor!.selection.active)!,
                ]);
            }
        });
    }

    rerun(handler: Handler) {
        return commands.registerCommand('phpunit.rerun', () => {
            const latestTestRunRequest = handler.getLatestTestRunRequest();

            return latestTestRunRequest
                ? this.runRequest(latestTestRunRequest)
                : this.run(undefined);
        });
    }

    private run(include: readonly TestItem[] | undefined) {
        this.runRequest(new TestRunRequest(include, undefined, this.testRunProfile));
    }

    private runRequest(request: TestRunRequest) {
        const cancellation = new CancellationTokenSource().token;

        this.testRunProfile.runHandler(request, cancellation);
    }

    private findTestFile(): TestFile | null {
        if (!window.activeTextEditor) {
            return null;
        }

        return this.testData.get(window.activeTextEditor.document.uri.toString())!;
    }
}
