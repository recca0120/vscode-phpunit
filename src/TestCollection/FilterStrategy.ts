import { TestDefinition, TestType, Transformer } from '../PHPUnit';

abstract class FilterStrategy {
    constructor(protected testDefinition: TestDefinition) {
    }

    abstract getFilter(): string

}

class NamespaceFilterStrategy extends FilterStrategy {
    getFilter() {
        return `--filter '^(${this.testDefinition.namespace!.replace(/\\/g, '\\\\')}.*)( with data set .*)?$'`;
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
        const deps = [
            Transformer.generateSearchText(this.testDefinition.methodName!),
            ...(this.testDefinition.annotations?.depends ?? []),
        ].filter((value) => !!value).join('|');

        return !!this.testDefinition.children && this.testDefinition.children.length > 0 ? '' : `--filter '^.*::(${deps})( with data set .*)?$'`;
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

        return new MethodFilterStrategy(testDefinition);
    }
}
