import { TestIdentifier } from '../../TestIdentifier/TestIdentifier';
import { DescribeFilterStrategy } from './DescribeFilterStrategy';

export class MethodFilterStrategy extends DescribeFilterStrategy {
    protected getDependsFilter() {
        return this.hasChildren() ? '' : super.getDependsFilter();
    }

    protected hasChildren() {
        return this.testDefinition.children && this.testDefinition.children.length > 0;
    }

    protected getMethodNamePattern() {
        const methodName = (this.testDefinition.methodName ?? '').trim();
        return TestIdentifier.generateSearchText(methodName);
    }
}
