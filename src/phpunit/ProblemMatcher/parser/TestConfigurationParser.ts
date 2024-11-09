import { TestConfiguration, TestExtraResultEvent, ValueParser } from './types';

export class TestConfigurationParser extends ValueParser<TestConfiguration> {
    constructor() {
        super('Configuration', TestExtraResultEvent.testConfiguration);
    }
}
