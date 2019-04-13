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
            method: test.method,
            namespace: test.namespace,
            range: test.range,
            uri: test.uri,
        };
    };

    const expectTest = async (index: number, actual: any) => {
        expect(await getTest(index)).toEqual(
            Object.assign(
                {
                    class: 'AssertionsTest',
                    depends: [],
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
                    uri: jasmine.objectContaining({
                        fsPath: file,
                    }),
                },
                actual
            )
        );
    };

    it('passed', async () => {
        await expectTest(0, {
            method: 'test_passed',
        });
    });

    it('failed', async () => {
        await expectTest(1, {
            method: 'test_failed',
            depends: ['test_passed'],
        });
    });

    it('test_isnt_same', async () => {
        await expectTest(2, {
            method: 'test_isnt_same',
        });
    });

    it('test_risky', async () => {
        await expectTest(3, {
            method: 'test_risky',
        });
    });

    it('annotation_test', async () => {
        await expectTest(4, {
            method: 'annotation_test',
        });
    });

    it('test_skipped', async () => {
        await expectTest(5, {
            method: 'test_skipped',
        });
    });

    it('test_incomplete', async () => {
        await expectTest(6, {
            method: 'test_incomplete',
        });
    });

    it('addition_provider', async () => {
        await expectTest(7, {
            method: 'addition_provider',
        });
    });
});
