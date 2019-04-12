import { join } from 'path';
import { PHPUnitParser } from '../src/phpunit-parser';

describe('parse phpunit', () => {
    const parser = new PHPUnitParser();
    const file = join(
        __dirname,
        'fixtures/project-sub/tests/AssertionsTest.php'
    );

    const getTest = async (index: number) => {
        const tests = await parser.parse(file);
        const test = tests[index];

        return {
            class: test.class,
            depends: test.depends,
            file: test.uri.fsPath,
            method: test.method,
            namespace: test.namespace,
            range: test.range,
        };
    };

    it('passed', async () => {
        expect(await getTest(0)).toEqual({
            class: 'AssertionsTest',
            depends: [],
            file,
            method: 'test_passed',
            namespace: 'Recca0120\\VSCode\\Tests',
            range: {
                start: jasmine.objectContaining({
                    line: jasmine.anything(),
                    character: jasmine.anything(),
                }),
                end: jasmine.objectContaining({
                    line: jasmine.anything(),
                    character: jasmine.anything(),
                }),
            },
        });
    });

    it('failed', async () => {
        expect(await getTest(1)).toEqual({
            class: 'AssertionsTest',
            depends: [],
            file,
            method: 'test_failed',
            namespace: 'Recca0120\\VSCode\\Tests',
            range: {
                start: jasmine.objectContaining({
                    line: jasmine.anything(),
                    character: jasmine.anything(),
                }),
                end: jasmine.objectContaining({
                    line: jasmine.anything(),
                    character: jasmine.anything(),
                }),
            },
        });
    });

    it('test_isnt_same', async () => {
        expect(await getTest(2)).toEqual({
            class: 'AssertionsTest',
            depends: [],
            file,
            method: 'test_isnt_same',
            namespace: 'Recca0120\\VSCode\\Tests',
            range: {
                start: jasmine.objectContaining({
                    line: jasmine.anything(),
                    character: jasmine.anything(),
                }),
                end: jasmine.objectContaining({
                    line: jasmine.anything(),
                    character: jasmine.anything(),
                }),
            },
        });
    });

    it('test_risky', async () => {
        expect(await getTest(3)).toEqual({
            class: 'AssertionsTest',
            depends: [],
            file,
            method: 'test_risky',
            namespace: 'Recca0120\\VSCode\\Tests',
            range: {
                start: jasmine.objectContaining({
                    line: jasmine.anything(),
                    character: jasmine.anything(),
                }),
                end: jasmine.objectContaining({
                    line: jasmine.anything(),
                    character: jasmine.anything(),
                }),
            },
        });
    });

    it('annotation_test', async () => {
        expect(await getTest(4)).toEqual({
            class: 'AssertionsTest',
            depends: [],
            file,
            method: 'annotation_test',
            namespace: 'Recca0120\\VSCode\\Tests',
            range: {
                start: jasmine.objectContaining({
                    line: jasmine.anything(),
                    character: jasmine.anything(),
                }),
                end: jasmine.objectContaining({
                    line: jasmine.anything(),
                    character: jasmine.anything(),
                }),
            },
        });
    });

    it('test_skipped', async () => {
        expect(await getTest(5)).toEqual({
            class: 'AssertionsTest',
            depends: [],
            file,
            method: 'test_skipped',
            namespace: 'Recca0120\\VSCode\\Tests',
            range: {
                start: jasmine.objectContaining({
                    line: jasmine.anything(),
                    character: jasmine.anything(),
                }),
                end: jasmine.objectContaining({
                    line: jasmine.anything(),
                    character: jasmine.anything(),
                }),
            },
        });
    });

    it('test_incomplete', async () => {
        expect(await getTest(6)).toEqual({
            class: 'AssertionsTest',
            depends: [],
            file,
            method: 'test_incomplete',
            namespace: 'Recca0120\\VSCode\\Tests',
            range: {
                start: jasmine.objectContaining({
                    line: jasmine.anything(),
                    character: jasmine.anything(),
                }),
                end: jasmine.objectContaining({
                    line: jasmine.anything(),
                    character: jasmine.anything(),
                }),
            },
        });
    });

    it('addition_provider', async () => {
        expect(await getTest(7)).toEqual({
            class: 'AssertionsTest',
            depends: [],
            file,
            method: 'addition_provider',
            namespace: 'Recca0120\\VSCode\\Tests',
            range: {
                start: jasmine.objectContaining({
                    line: jasmine.anything(),
                    character: jasmine.anything(),
                }),
                end: jasmine.objectContaining({
                    line: jasmine.anything(),
                    character: jasmine.anything(),
                }),
            },
        });
    });
});
