import { TestIdentifier } from '../TestIdentifier/TestIdentifier';
import { type TestDefinition, TestType } from '../types';
import { parseDataset } from '../utils';

abstract class FilterStrategy {
    constructor(protected testDefinition: TestDefinition) {}

    abstract getFilter(): string;

    protected getGroupFilter(): string | undefined {
        const groups = (this.testDefinition.annotations?.group as string[]) ?? [];
        return groups.length > 0 ? `--group=${groups.join(',')}` : undefined;
    }

    protected parseFilter(filter: string) {
        return `--filter="/${filter}(( with (data set )?.*)?)?$/"`;
    }

    protected joinFilters(...filters: (string | undefined)[]): string {
        return filters.filter((v) => !!v).join(' ');
    }

    protected quoteIfSpaces(value: string | undefined) {
        if (value?.includes(' ') && !/^["']/.test(value)) {
            return `"${value}"`;
        }
        return value;
    }
}

class TestSuiteFilterStrategy extends FilterStrategy {
    getFilter() {
        return `--testsuite=${this.testDefinition.testsuite}`;
    }
}

class NamespaceFilterStrategy extends FilterStrategy {
    getFilter() {
        return this.parseFilter(`^(${this.testDefinition.namespace?.replace(/\\/g, '\\\\')}.*)`);
    }
}

class ClassFilterStrategy extends FilterStrategy {
    getFilter() {
        return this.joinFilters(
            this.getGroupFilter(),
            this.quoteIfSpaces(this.testDefinition.file),
        );
    }
}

class DescribeFilterStrategy extends FilterStrategy {
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

class MethodFilterStrategy extends DescribeFilterStrategy {
    protected getDependsFilter() {
        return this.hasChildren() ? '' : super.getDependsFilter();
    }

    protected hasChildren() {
        return this.testDefinition.children && this.testDefinition.children.length > 0;
    }

    protected getMethodNamePattern() {
        const methodName = (this.testDefinition.methodName ?? '').trim();
        return TestIdentifier.generateSearchText(methodName);
    }
}

class DatasetFilterStrategy extends DescribeFilterStrategy {
    protected parseFilter(filter: string) {
        return `--filter='/${filter}$/'`;
    }

    protected getMethodNamePattern() {
        const methodName = (this.testDefinition.methodName ?? '').trim();
        const { dataset } = parseDataset(this.testDefinition.id ?? '');

        const escapedMethod = TestIdentifier.generateSearchText(methodName).replace(/'/g, "\\'");
        return `${escapedMethod}${dataset.replace(/[.*+?^${}()|[\]\\/']/g, '\\$&')}`;
    }
}

class WorkspaceFilterStrategy extends FilterStrategy {
    getFilter() {
        return '';
    }
}

export const FilterStrategyFactory = {
    create(testDefinition: TestDefinition) {
        if (testDefinition.type === TestType.workspace) {
            return new WorkspaceFilterStrategy(testDefinition);
        }

        if (testDefinition.type === TestType.testsuite) {
            return new TestSuiteFilterStrategy(testDefinition);
        }

        if (testDefinition.type === TestType.namespace) {
            return new NamespaceFilterStrategy(testDefinition);
        }

        if (testDefinition.type === TestType.class) {
            return new ClassFilterStrategy(testDefinition);
        }

        if (testDefinition.type === TestType.describe) {
            return new DescribeFilterStrategy(testDefinition);
        }

        if (testDefinition.type === TestType.dataset) {
            return new DatasetFilterStrategy(testDefinition);
        }

        return new MethodFilterStrategy(testDefinition);
    },
};
