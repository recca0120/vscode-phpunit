import {IParser, TestExtraResultEvent, TimeAndMemory} from './types';

export class TimeAndMemoryParser implements IParser<TimeAndMemory> {
    private readonly pattern = new RegExp(
        'Time:\\s(?<time>[\\d+:.]+(\\s\\w+)?),\\sMemory:\\s(?<memory>[\\d.]+\\s\\w+)'
    );

    public is(text: string) {
        return !!text.match(this.pattern);
    }

    public parse(text: string): TimeAndMemory {
        const {time, memory} = text.match(this.pattern)!.groups!;
        const kind = TestExtraResultEvent.timeAndMemory;

        return {time, memory, kind, text};
    }
}