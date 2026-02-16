import { Transformer } from '../Transformer';
import { type TestDefinition, TestType } from '../types';

abstract class FilterStrategy {
    constructor(protected testDefinition: TestDefinition) {}

    abstract getFilter(): string;

    protected getGroupFilter(): string | undefined {
        const groups = (this.testDefinition.annotations?.group as string[]) ?? [];
        return groups.length > 0 ? `--group=${groups.join(',')}` : undefined;
    }

    protected parseFilter(filter: string) {
        return `--filter="${filter}(( with (data set )?.*)?)?$"`;
    }

    protected quoteIfSpaces(value: string | undefined) {
        if (value?.includes(' ') && !/^["']/.test(value)) {
            return `"${value}"`;
        }
        return value;
    }
}

class NamespaceFilterStrategy extends FilterStrategy {
    getFilter() {
        return this.parseFilter(`^(${this.testDefinition.namespace?.replace(/\\/g, '\\\\')}.*)`);
    }
}

class ClassFilterStrategy extends FilterStrategy {
    getFilter() {
        return [this.getGroupFilter(), this.quoteIfSpaces(this.testDefinition.file)]
            .filter((value) => !!value)
            .join(' ');
    }
}

class DescribeFilterStrategy extends FilterStrategy {
    getFilter() {
        return [
            this.getDependsFilter(),
            this.testDefinition.file ? encodeURIComponent(this.testDefinition.file) : undefined,
        ]
            .filter((value) => !!value)
            .join(' ');
    }

    protected getDependsFilter() {
        const methodName = this.getMethodNamePattern();
        const deps = this.testDefinition.annotations?.depends ?? [];
        const filter = [methodName, ...deps].filter((value) => !!value).join('|');

        return this.parseFilter(`^.*::(${filter})`);
    }

    protected getMethodNamePattern() {
        const methodName = this.testDefinition.methodName ?? '';
        return `${Transformer.generateSearchText(methodName)}.*`;
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
        const methodName = this.testDefinition.methodName ?? '';
        return Transformer.generateSearchText(methodName);
    }
}

export const FilterStrategyFactory = {
    create(testDefinition: TestDefinition) {
        if (testDefinition.type === TestType.namespace) {
            return new NamespaceFilterStrategy(testDefinition);
        }

        if (testDefinition.type === TestType.class) {
            return new ClassFilterStrategy(testDefinition);
        }

        if (testDefinition.type === TestType.describe) {
            return new DescribeFilterStrategy(testDefinition);
        }

        return new MethodFilterStrategy(testDefinition);
    },
};
