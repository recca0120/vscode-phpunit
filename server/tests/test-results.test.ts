import { TestResults } from '../src/test-results';
import { projectPath } from './helpers';
import { Argument } from '../src/argument';
import { Test, Type } from '../src/common';
import { Filesystem, Factory as FilesystemFactory } from '../src/filesystem';
import { JUnitParser } from '../src/junit-parser';

describe('TestResults Test', () => {
    it('it should get tests', async () => {
        const xml: string = projectPath('junit.xml');
        const output: string = 'output';
        const args: Argument = new Argument().set(['--log-junit', xml]);

        const files: Filesystem = new FilesystemFactory().create();
        spyOn(files, 'get').and.returnValue('junit content');
        spyOn(files, 'unlink').and.returnValue(true);

        const expected: Test[] = [
            {
                name: 'foo',
                class: 'foo',
                classname: 'foo',
                file: 'foo',
                line: 0,
                time: 0,
                type: Type.PASSED,
            },
        ];

        const parser: JUnitParser = new JUnitParser();
        spyOn(parser, 'parse').and.returnValue(expected);

        const testResults: TestResults = new TestResults(output, args, files, parser);
        const tests: Test[] = await testResults.getTests();

        expect(tests).toEqual(expected);
        expect(files.get).toBeCalledWith(xml);
        expect(files.unlink).toBeCalledWith(xml);
    });
});
