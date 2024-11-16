import { CancellationTokenSource, commands, Position, TestItem, TestRunProfile, TestRunRequest, window } from 'vscode';
import { Handler } from './Handler';
import { TestCollection } from './TestCollection';

export class CommandHandler {
    constructor(private testCollection: TestCollection, private testRunProfile: TestRunProfile) {}

    runAll() {
        return commands.registerCommand('phpunit.run-all', () => {
            this.run(undefined);
        });
    }

    runFile() {
        return commands.registerCommand('phpunit.run-file', () => {
            const uri = window.activeTextEditor?.document.uri;
            if (!uri) {
                return;
            }

            this.run(this.testCollection.findFile(uri)?.tests.map((test) => test.testItem));
        });
    }

    runTestAtCursor() {
        return commands.registerCommand('phpunit.run-test-at-cursor', () => {
            const uri = window.activeTextEditor?.document.uri;
            if (!uri) {
                return;
            }

            this.run([this.findByPosition(
                this.testCollection.findFile(uri)?.tests.map((test) => test.testItem)!,
                window.activeTextEditor!.selection.active!,
            )]);
        });
    }

    rerun(handler: Handler) {
        return commands.registerCommand('phpunit.rerun', () => {
            const latestTestRunRequest = handler.getLatestTestRunRequest();

            return latestTestRunRequest ? this.run(latestTestRunRequest.include) : this.run(undefined);
        });
    }

    private run(include: readonly TestItem[] | undefined) {
        const cancellation = new CancellationTokenSource().token;

        this.testRunProfile.runHandler(new TestRunRequest(include, undefined, this.testRunProfile), cancellation);
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
}