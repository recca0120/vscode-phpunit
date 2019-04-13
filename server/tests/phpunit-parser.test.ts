import { join } from 'path';
import { PHPUnitParser } from '../src/phpunit-parser';

describe('parse phpunit', () => {
    const parser = new PHPUnitParser();
    const file = join(
        __dirname,
        'fixtures/project-sub/tests/AssertionsTest.php'
    );
    let index = 0;

    const getTest = async (key: number) => {
        const tests = await parser.parse(file);
        const test = tests[key];

        return {
            class: test.class,
            depends: test.depends,
            kind: test.kind,
            method: test.method,
            namespace: test.namespace,
            range: test.range,
            uri: test.uri,
        };
    };

    const expectTest = async (key: number, actual: any) => {
        expect(await getTest(key)).toEqual(
            Object.assign(
                {
                    class: 'AssertionsTest',
                    depends: [],
                    kind: 'method',
                    method: '',
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

    it('class', async () => {
        await expectTest(index++, {
            kind: 'class',
        });
    });

    it('passed', async () => {
        await expectTest(index++, {
            method: 'test_passed',
        });
    });

    it('failed', async () => {
        await expectTest(index++, {
            method: 'test_failed',
            depends: ['test_passed'],
        });
    });

    it('test_isnt_same', async () => {
        await expectTest(index++, {
            method: 'test_isnt_same',
        });
    });

    it('test_risky', async () => {
        await expectTest(index++, {
            method: 'test_risky',
        });
    });

    it('annotation_test', async () => {
        await expectTest(index++, {
            method: 'annotation_test',
        });
    });

    it('test_skipped', async () => {
        await expectTest(index++, {
            method: 'test_skipped',
        });
    });

    it('test_incomplete', async () => {
        await expectTest(index++, {
            method: 'test_incomplete',
        });
    });

    it('addition_provider', async () => {
        await expectTest(index++, {
            method: 'addition_provider',
        });
    });
});
