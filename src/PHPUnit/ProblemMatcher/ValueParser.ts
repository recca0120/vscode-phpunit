import { TeamcityEvent } from './types';

export interface IParser<T> {
    is: (text: string) => boolean;
    parse: (text: string) => T;
}

export abstract class ValueParser<T> implements IParser<T> {
    private pattern = new RegExp(`^${this.name}:\\s+(?<${this.name}>.+)`, 'i');

    protected constructor(private name: string, private event: TeamcityEvent) {}

    is(text: string): boolean {
        return !!text.match(this.pattern);
    }

    parse(text: string) {
        const matched = text.match(this.pattern)!.groups!;

        return {
            event: this.event,
            [this.name.toLowerCase()]: matched[this.name],
            text,
        } as T;
    }
}