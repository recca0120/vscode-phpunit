import { describe, expect, it } from 'vitest';
import { type TestDefinition, TestType } from '../types';
import { datasetExpander as DatasetExpander } from './DatasetExpander';

const parent: TestDefinition = {
    type: TestType.method,
    id: 'Assertions (Tests\\Assertions)::Addition provider',
    label: 'Addition provider',
    classFQN: 'Tests\\Assertions',
    namespace: 'Tests',
    className: 'Assertions',
    methodName: 'addition_provider',
    file: '/path/to/tests/AssertionsTest.php',
    start: { line: 10, character: 0 },
    end: { line: 20, character: 0 },
};

describe('DatasetExpander.fromTestOutput', () => {
    it('should return TestDefinition for dataset name', () => {
        const result = DatasetExpander.fromTestOutput(parent, 'addition_provider with data set #0');

        expect(result).toBeDefined();
        expect(result?.type).toBe(TestType.dataset);
        expect(result?.id).toBe(`${parent.id} with data set #0`);
        expect(result?.label).toBe('with data set #0');
        expect(result?.methodName).toBe(parent.methodName);
    });

    it('should return undefined for non-dataset name', () => {
        const result = DatasetExpander.fromTestOutput(parent, 'addition_provider');

        expect(result).toBeUndefined();
    });

    it('should handle named data set', () => {
        const result = DatasetExpander.fromTestOutput(
            parent,
            'addition_provider with data set "adding zeros"',
        );

        expect(result?.id).toBe(`${parent.id} with data set "adding zeros"`);
        expect(result?.label).toBe('with data set "adding zeros"');
    });

    it('should preserve teamcity id for pest named dataset', () => {
        const result = DatasetExpander.fromTestOutput(
            parent,
            'it adds numbers with data set "dataset "one plus one""',
        );

        expect(result).toBeDefined();
        expect(result?.id).toBe(`${parent.id} with data set "dataset "one plus one""`);
        expect(result?.label).toBe('with dataset "one plus one"');
    });

    it('should preserve teamcity id for pest scalar', () => {
        const result = DatasetExpander.fromTestOutput(
            parent,
            'it validates emails with data set "(\'alice@example.com\')"',
        );

        expect(result).toBeDefined();
        expect(result?.id).toBe(`${parent.id} with data set "('alice@example.com')"`);
        expect(result?.label).toBe(`with ('alice@example.com')`);
    });

    it('should preserve teamcity id for pest tuple', () => {
        const result = DatasetExpander.fromTestOutput(
            parent,
            'it multiplies numbers with data set "(2, 3, 6)"',
        );

        expect(result).toBeDefined();
        expect(result?.id).toBe(`${parent.id} with data set "(2, 3, 6)"`);
        expect(result?.label).toBe('with (2, 3, 6)');
    });

    it('should preserve teamcity id for pest cartesian', () => {
        const result = DatasetExpander.fromTestOutput(
            parent,
            `it business closed with data set "('Office') / ('Saturday')"`,
        );

        expect(result).toBeDefined();
        expect(result?.id).toBe(`${parent.id} with data set "('Office') / ('Saturday')"`);
        expect(result?.label).toBe(`with ('Office') / ('Saturday')`);
    });

    it('should handle truncated tuple with ellipsis from teamcity', () => {
        const result = DatasetExpander.fromTestOutput(
            parent,
            'it has many args with data set "(1, 2, 3, …)"',
        );

        expect(result).toBeDefined();
        expect(result?.id).toBe(`${parent.id} with data set "(1, 2, 3, …)"`);
        expect(result?.label).toBe('with (1, 2, 3, …)');
    });

    it('should handle deduplicated truncated tuple from teamcity', () => {
        const result1 = DatasetExpander.fromTestOutput(
            parent,
            'it same prefix with data set "(1, 2, 3, …) #1"',
        );
        const result2 = DatasetExpander.fromTestOutput(
            parent,
            'it same prefix with data set "(1, 2, 3, …) #2"',
        );

        expect(result1).toBeDefined();
        expect(result2).toBeDefined();
        expect(result1?.id).not.toBe(result2?.id);
        expect(result1?.id).toBe(`${parent.id} with data set "(1, 2, 3, …) #1"`);
        expect(result2?.id).toBe(`${parent.id} with data set "(1, 2, 3, …) #2"`);
    });

    it('teamcity truncated id matches statically analyzed id', () => {
        const [staticDef] = DatasetExpander.fromAnnotations(parent, ['data set "(1, 2, 3, …)"']);

        const teamcityDef = DatasetExpander.fromTestOutput(
            parent,
            `addition_provider with data set "(1, 2, 3, …)"`,
        );

        expect(staticDef.id).toBe(teamcityDef?.id);
    });
});

describe('DatasetExpander.fromAnnotations', () => {
    it('should create dataset definition with correct type', () => {
        const [result] = DatasetExpander.fromAnnotations(parent, ['data set #0']);

        expect(result.type).toBe(TestType.dataset);
    });

    it('should create id with "with" prefix', () => {
        const [result] = DatasetExpander.fromAnnotations(parent, ['data set #0']);

        expect(result.id).toBe(`${parent.id} with data set #0`);
    });

    it('should create label with "with" prefix', () => {
        const [result] = DatasetExpander.fromAnnotations(parent, ['data set #0']);

        expect(result.label).toBe('with data set #0');
    });

    it('should inherit parent classFQN, namespace, className, methodName', () => {
        const [result] = DatasetExpander.fromAnnotations(parent, ['data set #0']);

        expect(result.classFQN).toBe(parent.classFQN);
        expect(result.namespace).toBe(parent.namespace);
        expect(result.className).toBe(parent.className);
        expect(result.methodName).toBe(parent.methodName);
    });

    it('should inherit parent file and position', () => {
        const [result] = DatasetExpander.fromAnnotations(parent, ['data set #0']);

        expect(result.file).toBe(parent.file);
        expect(result.start).toEqual(parent.start);
        expect(result.end).toEqual(parent.end);
    });
});
