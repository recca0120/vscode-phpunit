import type { TestRun } from 'vscode';
import type { OutputWriter } from './OutputWriter';

export class TestRunWriter implements OutputWriter {
    constructor(private testRun: TestRun) {}

    append(text: string): void {
        this.testRun.appendOutput(text);
    }
}
