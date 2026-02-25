import { describe, expect, it } from 'vitest';
import { TeamcityEvent, type TestStarted } from '../TestOutput';
import type { TestDefinition } from '../types';
import { TestType } from '../types';
import { DatasetChildResolver } from './DatasetChildResolver';

function makeTestStarted(id: string, name: string): TestStarted {
    return {
        event: TeamcityEvent.testStarted,
        name,
        id,
        file: 'tests/Unit/ExampleTest.php',
        locationHint: '',
        flowId: 1,
    };
}

describe('DatasetChildResolver', () => {
    const parentDef: TestDefinition = {
        type: TestType.method,
        id: 'tests/Unit/ExampleTest.php::it adds numbers',
        label: 'it adds numbers',
        classFQN: 'P\\Tests\\Unit\\ExampleTest',
        methodName: 'it adds numbers',
        file: 'tests/Unit/ExampleTest.php',
        start: { line: 10, character: 0 },
        end: { line: 20, character: 0 },
    };

    it('should add missing dataset child (PHPUnit)', () => {
        const definitions = new Map<string, TestDefinition>();
        definitions.set(parentDef.id, parentDef);

        const resolver = new DatasetChildResolver(definitions);
        const child = resolver.testStarted(
            makeTestStarted(
                'tests/Unit/ExampleTest.php::it adds numbers with data set #0',
                'it adds numbers with data set #0',
            ),
        );

        expect(child).toBeDefined();
        expect(child?.type).toBe(TestType.dataset);
        expect(child?.id).toBe('tests/Unit/ExampleTest.php::it adds numbers with data set #0');
        expect(child?.label).toBe('with data set #0');
    });

    it('should add missing dataset child (Pest named)', () => {
        const definitions = new Map<string, TestDefinition>();
        definitions.set(parentDef.id, parentDef);

        const resolver = new DatasetChildResolver(definitions);
        const child = resolver.testStarted(
            makeTestStarted(
                'tests/Unit/ExampleTest.php::it adds numbers with data set "dataset "one plus one""',
                'it adds numbers with data set "dataset "one plus one""',
            ),
        );

        expect(child).toBeDefined();
        expect(child?.type).toBe(TestType.dataset);
        expect(child?.id).toBe(
            'tests/Unit/ExampleTest.php::it adds numbers with data set "dataset "one plus one""',
        );
        expect(child?.label).toBe('with dataset "one plus one"');
    });

    it('should add missing dataset child (Pest scalar)', () => {
        const definitions = new Map<string, TestDefinition>();
        definitions.set(parentDef.id, parentDef);

        const resolver = new DatasetChildResolver(definitions);
        const child = resolver.testStarted(
            makeTestStarted(
                `tests/Unit/ExampleTest.php::it adds numbers with data set "('alice@example.com')"`,
                `it adds numbers with data set "('alice@example.com')"`,
            ),
        );

        expect(child).toBeDefined();
        expect(child?.type).toBe(TestType.dataset);
        expect(child?.id).toBe(
            `tests/Unit/ExampleTest.php::it adds numbers with data set "('alice@example.com')"`,
        );
        expect(child?.label).toBe(`with ('alice@example.com')`);
    });

    it('should add missing dataset child (Pest tuple)', () => {
        const definitions = new Map<string, TestDefinition>();
        definitions.set(parentDef.id, parentDef);

        const resolver = new DatasetChildResolver(definitions);
        const child = resolver.testStarted(
            makeTestStarted(
                'tests/Unit/ExampleTest.php::it adds numbers with data set "(2, 3, 6)"',
                'it adds numbers with data set "(2, 3, 6)"',
            ),
        );

        expect(child).toBeDefined();
        expect(child?.type).toBe(TestType.dataset);
        expect(child?.id).toBe(
            'tests/Unit/ExampleTest.php::it adds numbers with data set "(2, 3, 6)"',
        );
        expect(child?.label).toBe('with (2, 3, 6)');
    });

    it('should add missing dataset child (Pest cartesian)', () => {
        const definitions = new Map<string, TestDefinition>();
        definitions.set(parentDef.id, parentDef);

        const resolver = new DatasetChildResolver(definitions);
        const child = resolver.testStarted(
            makeTestStarted(
                `tests/Unit/ExampleTest.php::it adds numbers with data set "('Office') / ('Saturday')"`,
                `it adds numbers with data set "('Office') / ('Saturday')"`,
            ),
        );

        expect(child).toBeDefined();
        expect(child?.type).toBe(TestType.dataset);
        expect(child?.id).toBe(
            `tests/Unit/ExampleTest.php::it adds numbers with data set "('Office') / ('Saturday')"`,
        );
        expect(child?.label).toBe(`with ('Office') / ('Saturday')`);
    });

    it('should not add when already exists', () => {
        const teamcityId = `${parentDef.id} with data set "dataset "one plus one""`;
        const existingChild: TestDefinition = {
            ...parentDef,
            type: TestType.dataset,
            id: teamcityId,
            label: 'with dataset "one plus one"',
        };

        const definitions = new Map<string, TestDefinition>();
        definitions.set(parentDef.id, parentDef);
        definitions.set(teamcityId, existingChild);

        const resolver = new DatasetChildResolver(definitions);
        const child = resolver.testStarted(
            makeTestStarted(teamcityId, 'it adds numbers with data set "dataset "one plus one""'),
        );

        expect(child).toBeUndefined();
        expect(definitions.size).toBe(2);
    });

    it('should not add when parent not found', () => {
        const definitions = new Map<string, TestDefinition>();

        const resolver = new DatasetChildResolver(definitions);
        const child = resolver.testStarted(
            makeTestStarted(
                'tests/Unit/ExampleTest.php::it adds numbers with data set "dataset "one plus one""',
                'it adds numbers with data set "dataset "one plus one""',
            ),
        );

        expect(child).toBeUndefined();
        expect(definitions.size).toBe(0);
    });

    it('should add child when id is parent but name contains dataset', () => {
        const definitions = new Map<string, TestDefinition>();
        definitions.set(parentDef.id, parentDef);

        const resolver = new DatasetChildResolver(definitions);
        const child = resolver.testStarted(
            makeTestStarted(parentDef.id, 'it adds numbers with data set "dataset "one plus one""'),
        );

        expect(child).toBeDefined();
        expect(child?.type).toBe(TestType.dataset);
        expect(child?.id).toBe(`${parentDef.id} with data set "dataset "one plus one""`);

        expect(child?.label).toBe('with dataset "one plus one"');
    });

    it('should not add for non-dataset test', () => {
        const definitions = new Map<string, TestDefinition>();
        definitions.set(parentDef.id, parentDef);

        const resolver = new DatasetChildResolver(definitions);
        const child = resolver.testStarted(makeTestStarted(parentDef.id, 'it adds numbers'));

        expect(child).toBeUndefined();
        expect(definitions.size).toBe(1);
    });

    it('should skip when id is empty', () => {
        const definitions = new Map<string, TestDefinition>();
        const resolver = new DatasetChildResolver(definitions);

        const child = resolver.testStarted(makeTestStarted('', 'something'));

        expect(child).toBeUndefined();
        expect(definitions.size).toBe(0);
    });
});
