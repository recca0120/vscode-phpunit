import { describe, expect, it } from 'vitest';
import { TeamcityEvent, type TestStarted } from '../TestOutput';
import type { TestDefinition } from '../types';
import { TestType } from '../types';
import { DatasetResolver, type DefinitionStore } from './DatasetChildResolver';

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

function makeStore(entries: TestDefinition[] = []): DefinitionStore & { size: number } {
    const map = new Map<string, TestDefinition>();
    for (const def of entries) {
        map.set(def.id, def);
    }
    return {
        getDefinition: (id: string) => map.get(id),
        hasDefinition: (id: string) => map.has(id),
        setDefinition: (id: string, def: TestDefinition) => {
            map.set(id, def);
        },
        get size() {
            return map.size;
        },
    };
}

describe('DatasetResolver', () => {
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
        const store = makeStore([parentDef]);

        const resolver = new DatasetResolver(store);
        const child = resolver.resolve(
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
        const store = makeStore([parentDef]);

        const resolver = new DatasetResolver(store);
        const child = resolver.resolve(
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
        const store = makeStore([parentDef]);

        const resolver = new DatasetResolver(store);
        const child = resolver.resolve(
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
        const store = makeStore([parentDef]);

        const resolver = new DatasetResolver(store);
        const child = resolver.resolve(
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
        const store = makeStore([parentDef]);

        const resolver = new DatasetResolver(store);
        const child = resolver.resolve(
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

        const store = makeStore([parentDef, existingChild]);

        const resolver = new DatasetResolver(store);
        const child = resolver.resolve(
            makeTestStarted(teamcityId, 'it adds numbers with data set "dataset "one plus one""'),
        );

        expect(child).toBeUndefined();
        expect(store.size).toBe(2);
    });

    it('should not add when parent not found', () => {
        const store = makeStore();

        const resolver = new DatasetResolver(store);
        const child = resolver.resolve(
            makeTestStarted(
                'tests/Unit/ExampleTest.php::it adds numbers with data set "dataset "one plus one""',
                'it adds numbers with data set "dataset "one plus one""',
            ),
        );

        expect(child).toBeUndefined();
        expect(store.size).toBe(0);
    });

    it('should add child when id is parent but name contains dataset', () => {
        const store = makeStore([parentDef]);

        const resolver = new DatasetResolver(store);
        const child = resolver.resolve(
            makeTestStarted(parentDef.id, 'it adds numbers with data set "dataset "one plus one""'),
        );

        expect(child).toBeDefined();
        expect(child?.type).toBe(TestType.dataset);
        expect(child?.id).toBe(`${parentDef.id} with data set "dataset "one plus one""`);

        expect(child?.label).toBe('with dataset "one plus one"');
    });

    it('should not add for non-dataset test', () => {
        const store = makeStore([parentDef]);

        const resolver = new DatasetResolver(store);
        const child = resolver.resolve(makeTestStarted(parentDef.id, 'it adds numbers'));

        expect(child).toBeUndefined();
        expect(store.size).toBe(1);
    });

    it('should skip when id is empty', () => {
        const store = makeStore();
        const resolver = new DatasetResolver(store);

        const child = resolver.resolve(makeTestStarted('', 'something'));

        expect(child).toBeUndefined();
        expect(store.size).toBe(0);
    });
});
