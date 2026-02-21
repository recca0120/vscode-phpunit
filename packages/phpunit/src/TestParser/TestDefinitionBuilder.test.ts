import { describe, expect, it } from 'vitest';
import { type TestDefinition, TestType } from '../types';
import { createDatasetDefinition, resolveDatasetDefinition } from './TestDefinitionBuilder';

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

describe('resolveDatasetDefinition', () => {
    it('should return TestDefinition for dataset name', () => {
        const result = resolveDatasetDefinition('addition_provider with data set #0', parent);

        expect(result).toBeDefined();
        expect(result?.type).toBe(TestType.dataset);
        expect(result?.id).toBe(`${parent.id} with data set #0`);
        expect(result?.label).toBe('with data set #0');
        expect(result?.methodName).toBe(parent.methodName);
    });

    it('should return undefined for non-dataset name', () => {
        const result = resolveDatasetDefinition('addition_provider', parent);

        expect(result).toBeUndefined();
    });

    it('should handle named data set', () => {
        const result = resolveDatasetDefinition(
            'addition_provider with data set "adding zeros"',
            parent,
        );

        expect(result?.id).toBe(`${parent.id} with data set "adding zeros"`);
    });

    it('should handle pest-style dataset label', () => {
        const result = resolveDatasetDefinition(
            'it has emails with data set "(|\'enunomaduro@gmail.com|\')"',
            parent,
        );

        expect(result).toBeDefined();
        expect(result?.id).toBe(`${parent.id} with data set "(|'enunomaduro@gmail.com|')"`);
    });
});

describe('createDatasetDefinition', () => {
    it('should create dataset definition with correct type', () => {
        const result = createDatasetDefinition(parent, '#0');

        expect(result.type).toBe(TestType.dataset);
    });

    it('should create id with "with data set" prefix', () => {
        const result = createDatasetDefinition(parent, '#0');

        expect(result.id).toBe(`${parent.id} with data set #0`);
    });

    it('should create label with "with data set" prefix', () => {
        const result = createDatasetDefinition(parent, '#0');

        expect(result.label).toBe('with data set #0');
    });

    it('should inherit parent classFQN, namespace, className, methodName', () => {
        const result = createDatasetDefinition(parent, '#0');

        expect(result.classFQN).toBe(parent.classFQN);
        expect(result.namespace).toBe(parent.namespace);
        expect(result.className).toBe(parent.className);
        expect(result.methodName).toBe(parent.methodName);
    });

    it('should inherit parent file and position', () => {
        const result = createDatasetDefinition(parent, '#0');

        expect(result.file).toBe(parent.file);
        expect(result.start).toEqual(parent.start);
        expect(result.end).toEqual(parent.end);
    });

    it('should handle named data set label', () => {
        const result = createDatasetDefinition(parent, '"adding zeros"');

        expect(result.id).toBe(`${parent.id} with data set "adding zeros"`);
        expect(result.label).toBe('with data set "adding zeros"');
    });
});
