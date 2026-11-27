import type { LineParser } from './LineParser';
import type { TeamcityEvent } from './types';

export class LabeledValueParser<T> implements LineParser<T> {
    private pattern: RegExp;

    constructor(
        private name: string,
        private event: TeamcityEvent,
    ) {
        this.pattern = new RegExp(`^${this.name}:\\s+(?<${this.name}>.+)`, 'i');
    }

    is(text: string): boolean {
        return !!text.match(this.pattern);
    }

    parse(text: string) {
        const matched = text.match(this.pattern)?.groups ?? {};

        return {
            event: this.event,
            [this.name.toLowerCase()]: matched[this.name],
            text,
        } as T;
    }
}
