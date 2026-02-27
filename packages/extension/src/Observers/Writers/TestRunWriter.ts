import type { OutputLocation, OutputWriter } from '@vscode-phpunit/phpunit';
import type { TestItem, TestRun } from 'vscode';
import { Location, Position, Uri } from 'vscode';

export class TestRunWriter implements OutputWriter {
    constructor(
        private testRun: TestRun,
        private testItemById: Map<string, TestItem>,
    ) {}

    append(text: string, location?: OutputLocation, testId?: string): void {
        const [loc, item] = this.resolve(location, testId);
        this.testRun.appendOutput(this.toCRLF(text), loc, item);
    }

    appendLine(text: string, location?: OutputLocation, testId?: string): void {
        const [loc, item] = this.resolve(location, testId);
        this.testRun.appendOutput(this.toCRLF(`${text}\n`), loc, item);
    }

    private toCRLF(text: string): string {
        return text.replace(/\r?\n/g, '\r\n');
    }

    private resolve(
        location?: OutputLocation,
        testId?: string,
    ): [Location | undefined, TestItem | undefined] {
        const loc = location
            ? new Location(Uri.file(location.file), new Position(location.line - 1, 0))
            : undefined;
        const item = testId ? this.testItemById.get(testId) : undefined;

        return [loc, item];
    }
}
