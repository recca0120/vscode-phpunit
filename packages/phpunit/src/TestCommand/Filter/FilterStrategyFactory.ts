import { type TestDefinition, TestType } from '../../types';
import { ClassFilterStrategy } from './ClassFilterStrategy';
import { DatasetFilterStrategy } from './DatasetFilterStrategy';
import { DescribeFilterStrategy } from './DescribeFilterStrategy';
import { MethodFilterStrategy } from './MethodFilterStrategy';
import { NamespaceFilterStrategy } from './NamespaceFilterStrategy';
import { TestSuiteFilterStrategy } from './TestSuiteFilterStrategy';
import { WorkspaceFilterStrategy } from './WorkspaceFilterStrategy';

export const FilterStrategyFactory = {
    create(testDefinition: TestDefinition) {
        if (testDefinition.type === TestType.workspace) {
            return new WorkspaceFilterStrategy(testDefinition);
        }

        if (testDefinition.type === TestType.testsuite) {
            return new TestSuiteFilterStrategy(testDefinition);
        }

        if (testDefinition.type === TestType.namespace) {
            return new NamespaceFilterStrategy(testDefinition);
        }

        if (testDefinition.type === TestType.class) {
            return new ClassFilterStrategy(testDefinition);
        }

        if (testDefinition.type === TestType.describe) {
            return new DescribeFilterStrategy(testDefinition);
        }

        if (testDefinition.type === TestType.dataset) {
            return new DatasetFilterStrategy(testDefinition);
        }

        return new MethodFilterStrategy(testDefinition);
    },
};
