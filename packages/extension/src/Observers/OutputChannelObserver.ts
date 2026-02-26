import {
    type IConfiguration,
    type ProcessBuilder,
    type TestRunnerObserver,
} from '@vscode-phpunit/phpunit';
import type { OutputChannel } from 'vscode';

export class OutputChannelObserver implements TestRunnerObserver {
    private hasClearedCurrentRequest = false;

    constructor(
        private outputChannel: OutputChannel,
        private configuration: IConfiguration,
    ) {}

    run(_builder: ProcessBuilder): void {
        this.clearOutputOnRun();
    }

    error(_error: string): void {
        this.outputChannel.clear();
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
