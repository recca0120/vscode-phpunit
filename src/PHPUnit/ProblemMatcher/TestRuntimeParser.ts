import { TestResultEvent, TestRuntime } from './types';
import { ValueParser } from './ValueParser';

export class TestRuntimeParser extends ValueParser<TestRuntime> {
    constructor() {
        super('Runtime', TestResultEvent.testRuntime);
    }
}
