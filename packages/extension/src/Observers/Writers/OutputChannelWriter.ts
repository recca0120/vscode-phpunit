import type { OutputWriter } from '@vscode-phpunit/phpunit';
import stripAnsi from 'strip-ansi';

export class OutputChannelWriter implements OutputWriter {
    constructor(
        private outputChannel: { append(value: string): void; appendLine(value: string): void },
    ) {}

    append(text: string): void {
        this.outputChannel.append(stripAnsi(text));
    }

    appendLine(text: string): void {
        this.outputChannel.appendLine(stripAnsi(text));
    }
}
