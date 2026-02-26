import type { OutputWriter } from '@vscode-phpunit/phpunit';
import stripAnsi from 'strip-ansi';

export class OutputChannelWriter implements OutputWriter {
    constructor(private outputChannel: { append(value: string): void }) {}

    append(text: string): void {
        this.outputChannel.append(stripAnsi(text));
    }
}
