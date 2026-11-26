import { TestIdentifier } from '../../TestIdentifier/TestIdentifier';
import { DescribeFilterStrategy } from './DescribeFilterStrategy';

export class MethodFilterStrategy extends DescribeFilterStrategy {
    protected dependsFilter() {
        return this.hasChildren() ? '' : super.dependsFilter();
    }

    protected hasChildren() {
        return this.testDefinition.children && this.testDefinition.children.length > 0;
    }

    protected methodNamePattern() {
        const methodName = (this.testDefinition.methodName ?? '').trim();
        return TestIdentifier.generateSearchText(methodName);
    }
}
