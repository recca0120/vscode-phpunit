import stripAnsi from 'strip-ansi';
import type { OutputWriter } from './OutputWriter';

export class OutputChannelWriter implements OutputWriter {
    constructor(private outputChannel: { append(value: string): void }) {}

    append(text: string): void {
        this.outputChannel.append(stripAnsi(text));
    }
}
