import { TestIdentifier } from '../../TestIdentifier/TestIdentifier';
import { datasetExpander } from '../../TestParser/DatasetExpander';
import { DescribeFilterStrategy } from './DescribeFilterStrategy';

export class DatasetFilterStrategy extends DescribeFilterStrategy {
    protected parseFilter(filter: string) {
        return `--filter='/${filter}$/'`;
    }

    protected methodNamePattern() {
        const methodName = (this.testDefinition.methodName ?? '').trim();
        const { dataset } = datasetExpander.parse(this.testDefinition.id ?? '');

        const escapedMethod = TestIdentifier.generateSearchText(methodName).replace(/'/g, "\\'");
        return `${escapedMethod}${dataset.replace(/[.*+?^${}()|[\]\\/']/g, '\\$&')}`;
    }
}
