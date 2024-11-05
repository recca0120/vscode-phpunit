import { TestExtraResultEvent, TestProcesses, ValueParser } from './types';

export class TestProcessesParser extends ValueParser<TestProcesses> {
    constructor() {
        super('Processes', TestExtraResultEvent.testProcesses);
    }
}
