import { TestIdentifier } from '../../TestIdentifier/TestIdentifier';
import { FilterStrategy } from './FilterStrategy';

export class DescribeFilterStrategy extends FilterStrategy {
    getFilter() {
        return this.joinFilters(
            this.getDependsFilter(),
            this.testDefinition.file ? encodeURIComponent(this.testDefinition.file) : undefined,
        );
    }

    protected getDependsFilter() {
        const methodName = this.getMethodNamePattern();
        const deps = this.testDefinition.annotations?.depends ?? [];
        const filter = [methodName, ...deps].filter((value) => !!value).join('|');

        return this.parseFilter(`^.*::(${filter})`);
    }

    protected getMethodNamePattern() {
        const methodName = (this.testDefinition.methodName ?? '').trim();
        return `${TestIdentifier.generateSearchText(methodName)}.*`;
    }
}
