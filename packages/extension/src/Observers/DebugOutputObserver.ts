import type {
    IConfiguration,
    ProcessBuilder,
    TestFailed,
    TestFinished,
    TestIgnored,
    TestRunnerObserver,
    TestStarted,
} from '@vscode-phpunit/phpunit';
import stripAnsi from 'strip-ansi';
import type { OutputChannel, TestItem } from 'vscode';

export class DebugOutputObserver implements TestRunnerObserver {
    private hasClearedCurrentRequest = false;

    constructor(
        private writer: OutputChannel,
        private configuration: IConfiguration,
        private testItemById: Map<string, TestItem>,
    ) {}

    run(builder: ProcessBuilder): void {
        this.clearOutputOnRun();
        this.writer.appendLine(stripAnsi(builder.toString()));

        if (this.testItemById.size > 0) {
            this.writer.appendLine('[Queue]');
            for (const id of this.testItemById.keys()) {
                this.writer.appendLine(`  ${id}`);
            }
        }
    }

    error(error: string): void {
        this.writer.appendLine(stripAnsi(error));
    }

    testStarted(result: TestStarted): void {
        this.logResult('testStarted', result);
    }

    testFinished(result: TestFinished): void {
        this.logResult('testFinished', result);
    }

    testFailed(result: TestFailed): void {
        this.logResult('testFailed', result);
    }

    testIgnored(result: TestIgnored): void {
        this.logResult('testIgnored', result);
    }

    private logResult(
        event: string,
        result: { id: string; name: string; locationHint: string; file?: string },
    ) {
        const found = this.testItemById.has(result.id);
        const status = found ? '✓' : '✗';
        this.writer.appendLine(`[${event}] ${result.name}`);
        this.writer.appendLine(`  id           : ${result.id}`);
        this.writer.appendLine(`  locationHint : ${result.locationHint}`);
        if (result.file) {
            this.writer.appendLine(`  file         : ${result.file}`);
        }
        this.writer.appendLine(`  find()       : ${status} ${found ? 'found' : 'not found'}`);
    }

    private clearOutputOnRun() {
        if (this.hasClearedCurrentRequest) {
            return;
        }

        if (this.configuration.get('clearDebugOutputOnRun') === true) {
            this.writer.clear();
        }

        this.hasClearedCurrentRequest = true;
    }
}
