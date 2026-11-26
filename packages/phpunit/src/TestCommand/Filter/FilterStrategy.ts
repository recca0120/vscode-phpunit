import type { TestDefinition } from '../../types';

export abstract class FilterStrategy {
    constructor(protected testDefinition: TestDefinition) {}

    abstract getFilter(): string;

    protected getGroupFilter(): string | undefined {
        const groups = (this.testDefinition.annotations?.group as string[]) ?? [];
        return groups.length > 0 ? groups.map((group) => `--group=${group}`).join(' ') : undefined;
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
