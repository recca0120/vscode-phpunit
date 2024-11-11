import { TestExtraResultEvent, TestRuntime, ValueParser } from './types';

export class TestRuntimeParser extends ValueParser<TestRuntime> {
    constructor() {
        super('Runtime', TestExtraResultEvent.testRuntime);
    }
}
