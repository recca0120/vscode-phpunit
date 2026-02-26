import stripAnsi from 'strip-ansi';
import type { OutputWriter } from './OutputWriter';

export class OutputChannelWriter implements OutputWriter {
    constructor(
        private outputChannel: {
            append(value: string): void;
            clear(): void;
            show(preserveFocus?: boolean): void;
        },
    ) {}

    append(text: string): void {
        this.outputChannel.append(stripAnsi(text));
    }

    clear(): void {
        this.outputChannel.clear();
    }

    show(preserveFocus: boolean): void {
        this.outputChannel.show(preserveFocus);
    }
}
