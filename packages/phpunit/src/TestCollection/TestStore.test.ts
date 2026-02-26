import { describe, expect, it } from 'vitest';
import { URI } from 'vscode-uri';
import type { TestDefinition } from '../types';
import { TestType } from '../types';
import { TestStore } from './TestStore';

const makeTests = (ids: string[], file?: string): TestDefinition[] =>
    ids.map((id) => ({ id, label: id, type: TestType.method, file }));

describe('TestStore', () => {
    it('set and findFile', () => {
        const store = new TestStore();
        const uri = URI.file('/project/tests/FooTest.php');
        const tests = makeTests(['t1', 't2'], uri.fsPath);

        store.set('default', uri, tests);

        const file = store.findFile(uri);
        expect(file).toBeDefined();
        expect(file?.testsuite).toBe('default');
        expect(file?.tests).toBe(tests);
    });

    it('findFile returns undefined for unknown uri', () => {
        const store = new TestStore();
        expect(store.findFile(URI.file('/unknown.php'))).toBeUndefined();
    });

    it('remove clears file and indexes', () => {
        const store = new TestStore();
        const uri = URI.file('/project/tests/FooTest.php');
        const tests = makeTests(['t1', 't2'], uri.fsPath);

        store.set('default', uri, tests);
        store.remove('default', uri);

        expect(store.findFile(uri)).toBeUndefined();
        expect(store.getDefinition('t1')).toBeUndefined();
        expect(store.getDefinition('t2')).toBeUndefined();
    });

    it('set replaces previous tests and cleans old definitions', () => {
        const store = new TestStore();
        const uri = URI.file('/project/tests/FooTest.php');

        store.set('default', uri, makeTests(['old1', 'old2'], uri.fsPath));
        store.set('default', uri, makeTests(['new1'], uri.fsPath));

        expect(store.getDefinition('old1')).toBeUndefined();
        expect(store.getDefinition('old2')).toBeUndefined();
        expect(store.getDefinition('new1')).toBeDefined();
        expect(store.findFile(uri)?.tests).toHaveLength(1);
    });

    it('getDefinition and hasDefinition', () => {
        const store = new TestStore();
        const uri = URI.file('/project/tests/FooTest.php');
        const tests = makeTests(['t1'], uri.fsPath);

        store.set('default', uri, tests);

        expect(store.getDefinition('t1')).toBe(tests[0]);
        expect(store.hasDefinition('t1')).toBe(true);
        expect(store.getDefinition('nope')).toBeUndefined();
        expect(store.hasDefinition('nope')).toBe(false);
    });

    it('indexes children recursively', () => {
        const store = new TestStore();
        const uri = URI.file('/project/tests/FooTest.php');
        const child: TestDefinition = {
            id: 'child1',
            label: 'child',
            type: TestType.method,
            file: uri.fsPath,
        };
        const parent: TestDefinition = {
            id: 'parent1',
            label: 'parent',
            type: TestType.method,
            file: uri.fsPath,
            children: [child],
        };

        store.set('default', uri, [parent]);

        expect(store.getDefinition('parent1')).toBe(parent);
        expect(store.getDefinition('child1')).toBe(child);
    });

    it('remove clears children from index', () => {
        const store = new TestStore();
        const uri = URI.file('/project/tests/FooTest.php');
        const child: TestDefinition = {
            id: 'child1',
            label: 'child',
            type: TestType.method,
            file: uri.fsPath,
        };
        const parent: TestDefinition = {
            id: 'parent1',
            label: 'parent',
            type: TestType.method,
            file: uri.fsPath,
            children: [child],
        };

        store.set('default', uri, [parent]);
        store.remove('default', uri);

        expect(store.getDefinition('parent1')).toBeUndefined();
        expect(store.getDefinition('child1')).toBeUndefined();
    });

    it('addDefinition appends to existing file tests', () => {
        const store = new TestStore();
        const uri = URI.file('/project/tests/FooTest.php');

        store.set('default', uri, makeTests(['t1'], uri.fsPath));

        const newDef: TestDefinition = {
            id: 'ds1',
            label: 'dataset',
            type: TestType.dataset,
            file: uri.fsPath,
        };
        store.addDefinition('ds1', newDef);

        expect(store.getDefinition('ds1')).toBe(newDef);
        expect(store.findFile(uri)?.tests).toContain(newDef);
    });

    it('addDefinition ignores definition without file', () => {
        const store = new TestStore();
        const uri = URI.file('/project/tests/FooTest.php');

        store.set('default', uri, makeTests(['t1'], uri.fsPath));

        const noFile: TestDefinition = { id: 'x', label: 'x', type: TestType.method };
        store.addDefinition('x', noFile);

        expect(store.getDefinition('x')).toBeUndefined();
    });

    it('addDefinition ignores definition when file not tracked', () => {
        const store = new TestStore();

        const def: TestDefinition = {
            id: 'x',
            label: 'x',
            type: TestType.method,
            file: '/not/tracked.php',
        };
        store.addDefinition('x', def);

        expect(store.getDefinition('x')).toBeUndefined();
    });

    it('gatherFiles yields all files', () => {
        const store = new TestStore();
        const uri1 = URI.file('/project/tests/ATest.php');
        const uri2 = URI.file('/project/tests/BTest.php');

        store.set('unit', uri1, makeTests(['a1'], uri1.fsPath));
        store.set('feature', uri2, makeTests(['b1'], uri2.fsPath));

        const files = [...store.gatherFiles()];
        expect(files).toHaveLength(2);
        expect(files.map((f) => f.testsuite).sort()).toEqual(['feature', 'unit']);
    });

    it('size returns number of suites', () => {
        const store = new TestStore();
        expect(store.size).toBe(0);

        const uri = URI.file('/project/tests/ATest.php');
        store.set('default', uri, makeTests(['a1'], uri.fsPath));
        expect(store.size).toBe(1);
    });

    it('clear resets everything', () => {
        const store = new TestStore();
        const uri = URI.file('/project/tests/FooTest.php');

        store.set('default', uri, makeTests(['t1'], uri.fsPath));
        store.clear();

        expect(store.size).toBe(0);
        expect(store.findFile(uri)).toBeUndefined();
        expect(store.getDefinition('t1')).toBeUndefined();
    });

    it('initSuites creates empty suite entries', () => {
        const store = new TestStore();
        store.initSuites(['unit', 'feature']);

        expect(store.size).toBe(2);
    });

    it('initSuites does not overwrite existing suites', () => {
        const store = new TestStore();
        const uri = URI.file('/project/tests/FooTest.php');
        store.set('unit', uri, makeTests(['t1'], uri.fsPath));

        store.initSuites(['unit', 'feature']);

        expect(store.size).toBe(2);
        expect(store.findFile(uri)).toBeDefined();
    });
});
