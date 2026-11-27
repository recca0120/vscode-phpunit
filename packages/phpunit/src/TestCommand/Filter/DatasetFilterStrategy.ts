import { datasetNaming } from '../../Dataset/DatasetNaming';
import { TestIdentifier } from '../../TestIdentifier/TestIdentifier';
import { DescribeFilterStrategy } from './DescribeFilterStrategy';

export class DatasetFilterStrategy extends DescribeFilterStrategy {
    protected filterArgument(filter: string) {
        return `--filter='/${filter}$/'`;
    }

    protected methodNamePattern() {
        const methodName = (this.testDefinition.methodName ?? '').trim();
        const { dataset } = datasetNaming.parse(this.testDefinition.id ?? '');

        const escapedMethod = TestIdentifier.generateSearchText(methodName).replace(/'/g, "\\'");
        return `${escapedMethod}${dataset.replace(/[.*+?^${}()|[\]\\/']/g, '\\$&')}`;
    }
}
