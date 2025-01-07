import { TeamcityEvent, TestProcesses } from './types';
import { ValueParser } from './ValueParser';

export class TestProcessesParser extends ValueParser<TestProcesses> {
    constructor() {
        super('Processes', TeamcityEvent.testProcesses);
    }
}
