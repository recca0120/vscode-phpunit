import { parse } from 'fast-xml-parser';
import { files } from '../../src/filesystem';
import { JUnit, Test, Type } from '../../src/phpunit';
import { resolve } from 'path';

describe('Testsuite Test', () => {
    it('it should return test case', async () => {
        const junit: JUnit = new JUnit();
        const content: string = await files.get(resolve(__dirname, '../fixtures/junit.xml'));
        const tests: Test[] = junit.parse(content);

        expect(tests[0]).toEqual({
            name: 'testPassed',
            class: 'PHPUnitTest',
            classname: null,
            file: 'C:\\Users\\recca\\github\\tester-phpunit\\tests\\PHPUnitTest.php',
            line: 13,
            time: 0.006241,
            type: Type.PASSED,
        });
    });
});
