import { FilterStrategy } from './FilterStrategy';

export class NamespaceFilterStrategy extends FilterStrategy {
    getFilter() {
        return this.parseFilter(`^(${this.testDefinition.namespace?.replace(/\\/g, '\\\\')}.*)`);
    }
}
