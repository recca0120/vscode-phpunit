import type { IConfiguration, ProcessBuilder, TestRunnerObserver } from '@vscode-phpunit/phpunit';
import stripAnsi from 'strip-ansi';
import type { OutputChannel } from 'vscode';

export class RawOutputObserver implements TestRunnerObserver {
    private hasClearedCurrentRequest = false;

    constructor(
        private outputChannel: OutputChannel,
        private configuration: IConfiguration,
    ) {}

    run(builder: ProcessBuilder): void {
        this.clearOutputOnRun();
        this.outputChannel.appendLine(builder.toString());
    }

    error(error: string): void {
        this.outputChannel.appendLine(stripAnsi(error));
    }

    line(line: string): void {
        this.outputChannel.appendLine(stripAnsi(line));
    }

    private clearOutputOnRun() {
        if (this.hasClearedCurrentRequest) {
            return;
        }

        if (this.configuration.get('clearOutputOnRun') === true) {
            this.outputChannel.clear();
        }

        this.hasClearedCurrentRequest = true;
    }
}
