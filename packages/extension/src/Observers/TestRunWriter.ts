import type { TestRun } from 'vscode';
import type { OutputWriter } from './OutputWriter';

export class TestRunWriter implements OutputWriter {
    constructor(private testRun: TestRun) {}

    append(text: string): void {
        this.testRun.appendOutput(text);
    }

    clear(): void {
        // no-op: TestRun doesn't support clearing
    }

    show(_preserveFocus: boolean): void {
        // no-op: TestRun doesn't support show
    }
}
