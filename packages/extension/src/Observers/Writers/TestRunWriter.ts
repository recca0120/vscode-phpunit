import type { OutputLocation, OutputWriter } from '@vscode-phpunit/phpunit';
import type { TestItem, TestRun } from 'vscode';
import { Location, Position, Uri } from 'vscode';

export class TestRunWriter implements OutputWriter {
    constructor(
        private testRun: TestRun,
        private testItemById: Map<string, TestItem>,
    ) {}

    append(text: string, location?: OutputLocation, testId?: string): void {
        this.testRun.appendOutput(
            this.toCRLF(text),
            this.toLocation(location),
            this.toTestItem(testId),
        );
    }

    appendLine(text: string, location?: OutputLocation, testId?: string): void {
        this.testRun.appendOutput(
            this.toCRLF(`${text}\n`),
            this.toLocation(location),
            this.toTestItem(testId),
        );
    }

    private toCRLF(text: string): string {
        return text.replace(/\r?\n/g, '\r\n');
    }

    private toLocation(location?: OutputLocation): Location | undefined {
        return location
            ? new Location(Uri.file(location.file), new Position(location.line - 1, 0))
            : undefined;
    }

    private toTestItem(testId?: string): TestItem | undefined {
        return testId ? this.testItemById.get(testId) : undefined;
    }
}
