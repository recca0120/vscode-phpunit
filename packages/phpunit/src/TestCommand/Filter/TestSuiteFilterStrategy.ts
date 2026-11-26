import { FilterStrategy } from './FilterStrategy';

export class TestSuiteFilterStrategy extends FilterStrategy {
    getFilter() {
        return `--testsuite=${this.testDefinition.testsuite}`;
    }
}
