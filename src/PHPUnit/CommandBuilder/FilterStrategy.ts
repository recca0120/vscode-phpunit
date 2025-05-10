import { Transformer } from '../Transformer';
import { TestDefinition, TestType } from '../types';

abstract class FilterStrategy {
    constructor(protected testDefinition: TestDefinition) {
    }

    abstract getFilter(): string

    protected parseFilter(filter: string) {
        return `--filter="${filter}(( with (data set )?.*)?)?$"`;
    }
}

class NamespaceFilterStrategy extends FilterStrategy {
    getFilter() {
        return this.parseFilter(`^(${this.testDefinition.namespace!.replace(/\\/g, '\\\\')}.*)`);
    }
}

class ClassFilterStrategy extends FilterStrategy {
    getFilter() {
        return this.testDefinition.file!;
    }
}

class DescribeFilterStrategy extends FilterStrategy {
    getFilter() {
        return [
            this.getDependsFilter(),
            this.testDefinition.file ? encodeURIComponent(this.testDefinition.file) : undefined,
        ].filter((value) => !!value).join(' ');
    }

    protected getDependsFilter() {
        const methodName = this.getMethodMethodName();
        const deps = this.testDefinition.annotations?.depends ?? [];
        const filter = [methodName, ...deps].filter((value) => !!value).join('|');

        return this.parseFilter(`^.*::(${filter})`);
    }

    protected getMethodMethodName() {
        return Transformer.generateSearchText(this.testDefinition.methodName!) + '.*';
    }
}

class MethodFilterStrategy extends DescribeFilterStrategy {
    getFilter() {
        return [
            this.getDependsFilter(),
            this.testDefinition.file ? encodeURIComponent(this.testDefinition.file) : undefined,
        ].filter((value) => !!value).join(' ');
    }

    protected getDependsFilter() {
        return this.hasChildren() ? '' : super.getDependsFilter();
    }

    protected hasChildren() {
        return this.testDefinition.children && this.testDefinition.children.length > 0;
    }

    protected getMethodMethodName() {
        return Transformer.generateSearchText(this.testDefinition.methodName!);
    }
}

export class FilterStrategyFactory {
    static getStrategy(testDefinition: TestDefinition) {
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
    }
}
