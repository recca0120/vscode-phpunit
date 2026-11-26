import { FilterStrategy } from './FilterStrategy';

export class ClassFilterStrategy extends FilterStrategy {
    getFilter() {
        return this.joinFilters(
            this.getGroupFilter(),
            this.quoteIfSpaces(this.testDefinition.file),
        );
    }
}
