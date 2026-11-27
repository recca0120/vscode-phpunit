import { FilterStrategy } from './FilterStrategy';

export class NamespaceFilterStrategy extends FilterStrategy {
    filter() {
        return this.filterArgument(`^(${this.testDefinition.namespace?.replace(/\\/g, '\\\\')}.*)`);
    }
}
