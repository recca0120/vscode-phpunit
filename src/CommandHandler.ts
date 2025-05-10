import * as vscode from 'vscode';
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
            } else {
                window.showInformationMessage('No tests found in the current file.');
            }
        });
    }

    runTestAtCursor() {
        return commands.registerCommand('phpunit.run-test-at-cursor', async () => {
            const editor = window.activeTextEditor;
            if (!editor) {
                return;
            }

            const uri = editor.document.uri;
            const position = editor.selection.active;

            const tests = this.testCollection.findTestsByPosition(uri, position!);
            if (tests.length > 0) {
                await this.run(tests);
            } else {
                window.showInformationMessage('No test found at the cursor position.');
            }
        });
    }

    // This method will be updated later to remove direct Handler dependency
    rerun(handler: Handler) {
        return commands.registerCommand('phpunit.rerun', () => {
            return this.run(
                this.testCollection.findTestsByRequest(handler.previousRequest),
            );
        });
    }

    private getActiveEditorUriAndPosition(): { uri: vscode.Uri; position: vscode.Position } | undefined {
        const editor = window.activeTextEditor;
        if (!editor) {
            return undefined;
        }
        return { uri: editor.document.uri, position: editor.selection.active };
    }

    private async run(include: readonly TestItem[] | undefined) {
        const cancellation = new CancellationTokenSource().token;

        await this.testRunProfile.runHandler(new TestRunRequest(include, undefined, this.testRunProfile), cancellation);
    }
}
