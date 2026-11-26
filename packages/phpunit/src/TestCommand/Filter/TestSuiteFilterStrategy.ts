import { FilterStrategy } from './FilterStrategy';

export class TestSuiteFilterStrategy extends FilterStrategy {
    filter() {
        return `--testsuite=${this.testDefinition.testsuite}`;
    }
}
