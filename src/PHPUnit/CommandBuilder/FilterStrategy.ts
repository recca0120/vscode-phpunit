import { Transformer } from '../Transformer';
import { TestDefinition, TestType } from '../types';

abstract class FilterStrategy {
    constructor(protected testDefinition: TestDefinition) {
    }

    // Abstract method to get the parts of the filter string
    protected abstract getFilterParts(): (string | undefined)[];

    // Common implementation to combine filter parts and apply the --filter format
    getFilter(): string {
        const filterParts = this.getFilterParts().filter((value) => !!value);
        if (filterParts.length === 0) {
            return ''; // Return empty string if no filter parts
        }
        // Join parts with space and apply the --filter format
        return this.parseFilter(filterParts.join(' '));
    }

    protected parseFilter(filter: string) {
        return `--filter="${filter}(( with (data set )?.*)?)?$"`;
    }
}

class NamespaceFilterStrategy extends FilterStrategy {
    protected getFilterParts(): (string | undefined)[] {
        return [`^(${this.testDefinition.namespace!.replace(/\\/g, '\\\\').replace(/\$/g, '\\$')}.*)`];
    }
}

class ClassFilterStrategy extends FilterStrategy {
    protected getFilterParts(): (string | undefined)[] {
        // For class strategy, the filter is just the file path
        return [this.testDefinition.file];
    }

    // Override getFilter to not use the --filter="pattern" format for file paths
    getFilter(): string {
        return this.testDefinition.file!;
    }
}

abstract class BaseMethodLikeFilterStrategy extends FilterStrategy {
    protected getDependsFilter(): string | undefined {
        const methodName = this.getMethodMethodName();
        const deps = this.testDefinition.annotations?.depends ?? [];
        const filter = [methodName, ...deps].filter((value) => !!value).join('|');

        return filter ? `^.*::(${filter})` : undefined;
    }

    protected abstract getMethodMethodName(): string;
}


class DescribeFilterStrategy extends BaseMethodLikeFilterStrategy {
    protected getFilterParts(): (string | undefined)[] {
        return [
            this.getDependsFilter(),
            this.testDefinition.file ? encodeURIComponent(this.testDefinition.file) : undefined,
        ];
    }

    protected getMethodMethodName(): string {
        return Transformer.generateSearchText(this.testDefinition.methodName!) + '.*';
    }
}

class MethodFilterStrategy extends BaseMethodLikeFilterStrategy {
    protected getFilterParts(): (string | undefined)[] {
        return [
            this.getDependsFilter(),
            this.testDefinition.file ? encodeURIComponent(this.testDefinition.file) : undefined,
        ];
    }

    protected getDependsFilter(): string | undefined {
        // Only include depends filter for methods if they don't have children (i.e., not a describe block)
        return this.hasChildren() ? undefined : super.getDependsFilter();
    }

    protected hasChildren(): boolean {
        return !!(this.testDefinition.children && this.testDefinition.children.length > 0);
    }

    protected getMethodMethodName(): string {
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
