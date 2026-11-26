import { FilterStrategy } from './FilterStrategy';

export class ClassFilterStrategy extends FilterStrategy {
    filter() {
        return this.joinFilters(this.groupFilter(), this.quoteIfSpaces(this.testDefinition.file));
    }
}
