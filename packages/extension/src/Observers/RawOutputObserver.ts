import type { IConfiguration, ProcessBuilder, TestRunnerObserver } from '@vscode-phpunit/phpunit';
import type { OutputChannel } from 'vscode';

export class RawOutputObserver implements TestRunnerObserver {
    private hasClearedCurrentRequest = false;

    constructor(
        private writer: OutputChannel,
        private configuration: IConfiguration,
    ) {}

    run(builder: ProcessBuilder): void {
        this.clearOutputOnRun();
        this.writer.appendLine(builder.toString());
    }

    error(error: string): void {
        this.writer.appendLine(error);
    }

    line(line: string): void {
        this.writer.appendLine(line);
    }

    private clearOutputOnRun() {
        if (this.hasClearedCurrentRequest) {
            return;
        }

        if (this.configuration.get('clearOutputOnRun') === true) {
            this.writer.clear();
        }

        this.hasClearedCurrentRequest = true;
    }
}
