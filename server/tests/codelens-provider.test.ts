import { CodeLensProvider } from '../src/codelens-provider';
import { TestSuite } from '../src/phpunit/test-suite';

describe('CodeLensProvider Test', () => {
    it('it should return codelens', async () => {
        const testSuite: TestSuite = new TestSuite();
        const codelensProvider: CodeLensProvider = new CodeLensProvider(testSuite);

        spyOn(testSuite, 'parse').and.returnValue([
            {
                kind: 'class',
                namespace: 'Tests',
                name: 'AssertionsTest',
                range: { end: { character: 1, line: 10 }, start: { character: 0, line: 4 } },
                uri: 'PHPUnitTest.php',
            },
            {
                kind: 'method',
                namespace: 'Tests\\AssertionsTest',
                name: 'test_method',
                range: { end: { character: 5, line: 9 }, start: { character: 11, line: 6 } },
                uri: 'PHPUnitTest.php',
            },
        ]);

        expect(codelensProvider.formText('text', 'PHPUnitTest.php')).toEqual([
            {
                command: {
                    arguments: [{ uri: 'PHPUnitTest.php', args: [] }],
                    command: 'phpunit.test',
                    title: 'Run Test',
                },
                data: { textDocument: { uri: 'PHPUnitTest.php' } },
                range: { end: { character: 1, line: 10 }, start: { character: 0, line: 4 } },
            },
            {
                command: {
                    arguments: [
                        { uri: 'PHPUnitTest.php', args: ['--filter', '^.*::test_method( with data set .*)?$'] },
                    ],
                    command: 'phpunit.test.file',
                    title: 'Run Test',
                },
                data: { textDocument: { uri: 'PHPUnitTest.php' } },
                range: { end: { character: 5, line: 9 }, start: { character: 11, line: 6 } },
            },
        ]);
    });
});
