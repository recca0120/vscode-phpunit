import type { OutputWriter } from '@vscode-phpunit/phpunit';
import type { TestRun } from 'vscode';

export class TestRunWriter implements OutputWriter {
    constructor(private testRun: TestRun) {}

    append(text: string): void {
        this.testRun.appendOutput(text);
    }
}
