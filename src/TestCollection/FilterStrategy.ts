import { TestDefinition, TestType, Transformer } from '../PHPUnit';

abstract class FilterStrategy {
    constructor(protected testDefinition: TestDefinition) {
    }

    abstract getFilter(): string

}

class NamespaceFilterStrategy extends FilterStrategy {
    getFilter() {
        return `--filter '^(${this.testDefinition.namespace!.replace(/\\/g, '\\\\')}.*)( with (data set )?.*)?$'`;
    }
}

class ClassFilterStrategy extends FilterStrategy {
    getFilter() {
        return this.testDefinition.file!;
    }
}

class MethodFilterStrategy extends FilterStrategy {
    getFilter() {
        return [
            this.getDependsFilter(),
            this.testDefinition.file ? encodeURIComponent(this.testDefinition.file) : undefined,
        ].filter((value) => !!value).join(' ');
    }

    private getDependsFilter() {
        if (this.hasChildren()) {
            return '';
        }

        const methodName = this.getMethodMethodName();
        const deps = this.testDefinition.annotations?.depends ?? [];
        const filter = [methodName, ...deps].filter((value) => !!value).join('|');

        return `--filter '^.*::(${filter})( with (data set )?.*)?$'`;
    }

    private hasChildren() {
        return this.testDefinition.children && this.testDefinition.children.length > 0;
    }

    protected getMethodMethodName() {
        return Transformer.generateSearchText(this.testDefinition.methodName!);
    }
}

class DescribeFilterStrategy extends FilterStrategy {
    getFilter() {
        return [
            this.getDependsFilter(),
            this.testDefinition.file ? encodeURIComponent(this.testDefinition.file) : undefined,
        ].filter((value) => !!value).join(' ');
    }

    private getDependsFilter() {
        const methodName = this.getMethodMethodName();
        const deps = this.testDefinition.annotations?.depends ?? [];
        const filter = [methodName, ...deps].filter((value) => !!value).join('|');

        return `--filter '^.*::(${filter})( with (data set )?.*)?$'`;
    }

    protected getMethodMethodName() {
        return Transformer.generateSearchText(this.testDefinition.methodName!) + '.*';
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
