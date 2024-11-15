import { CancellationTokenSource, commands, Position, TestItem, TestRunProfile, TestRunRequest, window } from 'vscode';
import { URI } from 'vscode-uri';
import { Handler } from './Handler';
import { TestCollection } from './TestCollection';

export class CommandHandler {
    constructor(private testCollection: TestCollection, private testRunProfile: TestRunProfile) {
    }

    runAll() {
        return commands.registerCommand('PHPUnit.run-all', () => {
            this.run(undefined);
        });
    }

    runFile() {
        return commands.registerCommand('PHPUnit.run-file', () => {
            if (window.activeTextEditor?.document.uri) {
                this.run(this.findTestItems(window.activeTextEditor.document.uri));
            }
        });
    }

    runTestAtCursor() {
        return commands.registerCommand('PHPUnit.run-test-at-cursor', () => {
            if (window.activeTextEditor?.document.uri) {
                this.run([this.findByPosition(
                    this.findTestItems(window.activeTextEditor.document.uri),
                    window.activeTextEditor!.selection.active!,
                )]);
            }
        });
    }

    rerun(handler: Handler) {
        return commands.registerCommand('PHPUnit.rerun', () => {
            const latestTestRunRequest = handler.getLatestTestRunRequest();

            return latestTestRunRequest ? this.runRequest(latestTestRunRequest) : this.run(undefined);
        });
    }

    private run(include: readonly TestItem[] | undefined) {
        this.runRequest(new TestRunRequest(include, undefined, this.testRunProfile));
    }

    private runRequest(request: TestRunRequest) {
        const cancellation = new CancellationTokenSource().token;

        this.testRunProfile.runHandler(request, cancellation);
    }

    private findByPosition(testItems: TestItem[], position: Position) {
        const byPosition = (testItem: TestItem, position: Position) => {
            if (testItem.canResolveChildren) {
                return false;
            }

            const range = testItem.range!;

            return position.line >= range.start.line && position.line <= range.end.line;
        };

        for (const testItem of testItems) {
            if (byPosition(testItem, position)) {
                return testItem;
            }
            for (const [_id, child] of testItem.children) {
                if (byPosition(child, position)) {
                    return child;
                }
            }
        }

        return testItems[0];
    }

    private findTestItems(uri: URI) {
        for (const [_group, files] of this.testCollection.entries()) {
            for (const [file, tests] of files.entries()) {
                if (uri.fsPath === file) {
                    return tests.map((testDefinition) => testDefinition.testItem);
                }
            }
        }

        return [];
    }
}