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

    it('should add missing dataset child', () => {
        const definitions = new Map<string, TestDefinition>();
        definitions.set(parentDef.id, parentDef);

        const resolver = new DatasetChildResolver(definitions);
        const result = makeTestStarted(
            'tests/Unit/ExampleTest.php::it adds numbers with data set "one plus one"',
            'it adds numbers with data set "one plus one"',
        );

        resolver.testStarted(result);

        expect(definitions.has(result.id)).toBe(true);
        expect(definitions.get(result.id)?.type).toBe(TestType.dataset);
        expect(definitions.get(result.id)?.label).toBe('with data set "one plus one"');
    });

    it('should not add when already exists', () => {
        const childId = 'tests/Unit/ExampleTest.php::it adds numbers with data set "one plus one"';
        const existingChild: TestDefinition = {
            ...parentDef,
            type: TestType.dataset,
            id: childId,
            label: 'with data set "one plus one"',
        };

        const definitions = new Map<string, TestDefinition>();
        definitions.set(parentDef.id, parentDef);
        definitions.set(childId, existingChild);

        const resolver = new DatasetChildResolver(definitions);
        const sizeBefore = definitions.size;

        resolver.testStarted(
            makeTestStarted(childId, 'it adds numbers with data set "one plus one"'),
        );

        expect(definitions.size).toBe(sizeBefore);
    });

    it('should not add when parent not found', () => {
        const definitions = new Map<string, TestDefinition>();

        const resolver = new DatasetChildResolver(definitions);
        resolver.testStarted(
            makeTestStarted(
                'tests/Unit/ExampleTest.php::it adds numbers with data set "one plus one"',
                'it adds numbers with data set "one plus one"',
            ),
        );

        expect(definitions.size).toBe(0);
    });

    it('should add child when id is parent but name contains dataset', () => {
        const definitions = new Map<string, TestDefinition>();
        definitions.set(parentDef.id, parentDef);

        const resolver = new DatasetChildResolver(definitions);
        resolver.testStarted(
            makeTestStarted(parentDef.id, 'it adds numbers with data set "one plus one"'),
        );

        const childId = `${parentDef.id} with data set "one plus one"`;
        expect(definitions.has(childId)).toBe(true);
        expect(definitions.get(childId)?.type).toBe(TestType.dataset);
    });

    it('should not add for non-dataset test', () => {
        const definitions = new Map<string, TestDefinition>();
        definitions.set(parentDef.id, parentDef);

        const resolver = new DatasetChildResolver(definitions);
        resolver.testStarted(makeTestStarted(parentDef.id, 'it adds numbers'));

        expect(definitions.size).toBe(1);
    });

    it('should skip when id is empty', () => {
        const definitions = new Map<string, TestDefinition>();
        const resolver = new DatasetChildResolver(definitions);

        resolver.testStarted(makeTestStarted('', 'something'));

        expect(definitions.size).toBe(0);
    });
});
