import { FilterStrategy } from './FilterStrategy';

export class NamespaceFilterStrategy extends FilterStrategy {
    filter() {
        return this.parseFilter(`^(${this.testDefinition.namespace?.replace(/\\/g, '\\\\')}.*)`);
    }
}
