import { TestConfiguration, TeamcityEvent } from './types';
import { ValueParser } from './ValueParser';

export class TestConfigurationParser extends ValueParser<TestConfiguration> {
    constructor() {
        super('Configuration', TeamcityEvent.testConfiguration);
    }
}
