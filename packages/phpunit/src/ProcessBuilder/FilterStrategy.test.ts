import { describe, expect, it } from 'vitest';
import { type TestDefinition, TestType } from '../types';
import { FilterStrategyFactory } from './FilterStrategy';

describe('FilterStrategyFactory', () => {
    it('workspace type returns empty filter (run all tests)', () => {
        const testDef: TestDefinition = {
            type: TestType.workspace,
            id: 'folder:file:///path/to/workspace',
            label: 'my-workspace',
        };

        const filter = FilterStrategyFactory.create(testDef).getFilter();

        expect(filter).toBe('');
    });

    it('namespace with namespace field uses --filter', () => {
        const testDef: TestDefinition = {
            type: TestType.namespace,
            id: 'ns:Recca0120\\VSCode',
            label: 'Recca0120\\VSCode',
            namespace: 'Recca0120\\VSCode',
        };

        const filter = FilterStrategyFactory.create(testDef).getFilter();

        expect(filter).toContain('--filter=');
        expect(filter).toContain('Recca0120\\\\VSCode');
    });

    it('testsuite type uses --testsuite', () => {
        const testDef: TestDefinition = {
            type: TestType.testsuite,
            id: 'testsuite:Unit',
            label: 'Unit',
            testsuite: 'Unit',
        };

        const filter = FilterStrategyFactory.create(testDef).getFilter();

        expect(filter).toBe('--testsuite=Unit');
    });

    it('class type uses file path', () => {
        const testDef: TestDefinition = {
            type: TestType.class,
            id: 'Recca0120\\VSCode\\Tests\\ExampleTest',
            label: 'ExampleTest',
            classFQN: 'Recca0120\\VSCode\\Tests\\ExampleTest',
            file: '/path/to/ExampleTest.php',
        };

        const filter = FilterStrategyFactory.create(testDef).getFilter();

        expect(filter).toContain('/path/to/ExampleTest.php');
        expect(filter).not.toContain('--filter=');
    });

    it('method type uses --filter with method name', () => {
        const testDef: TestDefinition = {
            type: TestType.method,
            id: 'Recca0120\\VSCode\\Tests\\ExampleTest::test_passed',
            label: 'test_passed',
            classFQN: 'Recca0120\\VSCode\\Tests\\ExampleTest',
            methodName: 'test_passed',
            file: '/path/to/ExampleTest.php',
        };

        const filter = FilterStrategyFactory.create(testDef).getFilter();

        expect(filter).toContain('--filter=');
        expect(filter).toContain('test_passed');
    });

    it('dataset type with named key uses --filter with data set label', () => {
        const testDef: TestDefinition = {
            type: TestType.dataset,
            id: 'Tests\\DataProviderAttributeTest::testAttributeProvider with data set "two plus three"',
            label: 'with data set "two plus three"',
            classFQN: 'Tests\\DataProviderAttributeTest',
            methodName: 'testAttributeProvider',
            file: '/path/to/DataProviderAttributeTest.php',
        };

        const filter = FilterStrategyFactory.create(testDef).getFilter();

        expect(filter).toBe(
            `--filter='^.*::(testAttributeProvider with data set "two plus three")$' %2Fpath%2Fto%2FDataProviderAttributeTest.php`,
        );
    });

    it('dataset type with numeric index uses --filter with data set index', () => {
        const testDef: TestDefinition = {
            type: TestType.dataset,
            id: 'Tests\\DataProviderAttributeTest::testAttributeProvider with data set #0',
            label: 'with data set #0',
            classFQN: 'Tests\\DataProviderAttributeTest',
            methodName: 'testAttributeProvider',
            file: '/path/to/DataProviderAttributeTest.php',
        };

        const filter = FilterStrategyFactory.create(testDef).getFilter();

        expect(filter).toBe(
            `--filter='^.*::(testAttributeProvider with data set #0)$' %2Fpath%2Fto%2FDataProviderAttributeTest.php`,
        );
    });
});
