import { TeamcityEvent, TestDuration } from './types';
import { IParser } from './ValueParser';

export class TestDurationParser implements IParser<TestDuration> {
    private readonly pattern = new RegExp(
        '(Time|Duration):\\s+(?<time>[\\d+:.]+(\\s?\\w+)?)(,\\sMemory:\\s(?<memory>[\\d.]+\\s\\w+))?',
    );

    public is(text: string) {
        return !!text.match(this.pattern);
    }

    public parse(text: string): TestDuration {
        const { time, memory } = text.match(this.pattern)!.groups!;
        const event = TeamcityEvent.testDuration;

        return { time, memory, event, text };
    }
}
