import { TestIdentifier } from '../../TestIdentifier/TestIdentifier';
import { FilterStrategy } from './FilterStrategy';

export class DescribeFilterStrategy extends FilterStrategy {
    filter() {
        return this.joinFilters(
            this.dependsFilter(),
            this.testDefinition.file ? encodeURIComponent(this.testDefinition.file) : undefined,
        );
    }

    protected dependsFilter() {
        const methodName = this.methodNamePattern();
        const deps = this.testDefinition.annotations?.depends ?? [];
        const filter = [methodName, ...deps].filter((value) => !!value).join('|');

        return this.parseFilter(`^.*::(${filter})`);
    }

    protected methodNamePattern() {
        const methodName = (this.testDefinition.methodName ?? '').trim();
        return `${TestIdentifier.generateSearchText(methodName)}.*`;
    }
}
