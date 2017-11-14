import { TestCase, Type } from '../../src/parsers/parser';

import { Filesystem } from '../../src/filesystem';
import { TeamCityParser } from '../../src/parsers/teamcity';
import { TextLineFactory } from '../../src/text-line';
import { resolve as pathResolve } from 'path';

describe('TeamCityParser', () => {
    const files: Filesystem = new Filesystem();
    const files2: Filesystem = new Filesystem();

    const textLineFactory: TextLineFactory = new TextLineFactory(files);
    const parser: TeamCityParser = new TeamCityParser(files2, textLineFactory);

    async function getTestCase(key: number): Promise<TestCase> {
        const testCases: TestCase[] = await parser.parseFile(pathResolve(__dirname, '..', 'fixtures/teamcity.txt'));

        return testCases[key];
    }

    describe('PHPUnit2Test', () => {
        beforeEach(() => {
            spyOn(files, 'getAsync').and.callFake(fileName => {
                return Promise.resolve(files.get(pathResolve(__dirname, '..', 'fixtures/PHPUnit2Test.php')));
            });

            spyOn(files2, 'getAsync').and.callFake(fileName => {
                return Promise.resolve(files.get(pathResolve(__dirname, '..', 'fixtures/teamcity.txt')));
            });
        });

        it('it should parse passed', async () => {
            const testCase = await getTestCase(0);

            expect(testCase).toEqual({
                name: 'testPassed',
                class: 'PHPUnit2Test',
                classname: null,
                file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\tests\\fixtures\\PHPUnit2Test.php',
                line: 13,
                time: 0.02,
                type: Type.PASSED,
            });
        });

        it('it should parse failed', async () => {
            const testCase = await getTestCase(1);

            expect(testCase).toEqual({
                name: 'testFailed',
                class: 'PHPUnit2Test',
                classname: null,
                file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\tests\\fixtures\\PHPUnit2Test.php',
                line: 20,
                time: 0,
                type: Type.FAILURE,
                fault: {
                    message: 'Failed asserting that false is true.',
                    details: [],
                },
            });
        });

        it('it should parse skipped when mark skipped', async () => {
            const testCase = await getTestCase(2);

            expect(testCase).toEqual({
                name: 'testSkipped',
                class: 'PHPUnit2Test',
                classname: null,
                file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\tests\\fixtures\\PHPUnit2Test.php',
                line: 25,
                time: 0,
                type: Type.SKIPPED,
                fault: {
                    message: 'The MySQLi extension is not available.',
                    details: [],
                },
            });
        });

        it('it should parse skipped when mark incomplete', async () => {
            const testCase = await getTestCase(3);

            expect(testCase).toEqual({
                name: 'testIncomplete',
                class: 'PHPUnit2Test',
                classname: null,
                file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\tests\\fixtures\\PHPUnit2Test.php',
                line: 30,
                time: 0,
                type: Type.SKIPPED,
                fault: {
                    message: 'This test has not been implemented yet.',
                    details: [],
                },
            });
        });

        it('it should parse risky when no assertions', async () => {
            const testCase = await getTestCase(4);

            expect(testCase).toEqual({
                name: 'testNoAssertions',
                class: 'PHPUnit2Test',
                classname: null,
                file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\tests\\fixtures\\PHPUnit2Test.php',
                line: 33,
                time: 0,
                type: Type.RISKY,
                fault: {
                    message: 'This test did not perform any assertions',
                    details: [],
                },
            });
        });
    });

    describe('PHPUnitTest', () => {
        beforeEach(() => {
            spyOn(files, 'getAsync').and.callFake(fileName => {
                return Promise.resolve(files.get(pathResolve(__dirname, '..', 'fixtures/PHPUnit2Test.php')));
            });

            spyOn(files2, 'getAsync').and.callFake(fileName => {
                return Promise.resolve(files.get(pathResolve(__dirname, '..', 'fixtures/teamcity.txt')));
            });
        });

        it('it should parse passed', async () => {
            const testCase = await getTestCase(5);

            expect(testCase).toEqual({
                name: 'testPassed',
                class: 'PHPUnitTest',
                classname: null,
                file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\tests\\fixtures\\PHPUnitTest.php',
                line: 13,
                time: 0,
                type: Type.PASSED,
            });
        });

        it('it should parse failed', async () => {
            const testCase = await getTestCase(6);

            expect(testCase).toEqual({
                name: 'testFailed',
                class: 'PHPUnitTest',
                classname: null,
                file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\tests\\fixtures\\PHPUnitTest.php',
                line: 20,
                time: 0,
                type: Type.FAILURE,
                fault: {
                    message: 'Failed asserting that false is true.',
                    details: [],
                },
            });
        });

        it('it should parse skipped when mark skipped', async () => {
            const testCase = await getTestCase(7);

            expect(testCase).toEqual({
                name: 'testSkipped',
                class: 'PHPUnitTest',
                classname: null,
                file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\tests\\fixtures\\PHPUnitTest.php',
                line: 25,
                time: 0,
                type: Type.SKIPPED,
                fault: {
                    message: 'The MySQLi extension is not available.',
                    details: [],
                },
            });
        });

        it('it should parse skipped when mark incomplete', async () => {
            const testCase = await getTestCase(8);

            expect(testCase).toEqual({
                name: 'testIncomplete',
                class: 'PHPUnitTest',
                classname: null,
                file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\tests\\fixtures\\PHPUnitTest.php',
                line: 30,
                time: 0,
                type: Type.SKIPPED,
                fault: {
                    message: 'This test has not been implemented yet.',
                    details: [],
                },
            });
        });

        it('it should parse no assertions', async () => {
            const testCase = await getTestCase(9);

            expect(testCase).toEqual({
                name: 'testNoAssertions',
                class: 'PHPUnitTest',
                classname: null,
                file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\tests\\fixtures\\PHPUnitTest.php',
                line: 33,
                time: 0,
                type: Type.RISKY,
                fault: {
                    message: 'This test did not perform any assertions',
                    details: [],
                },
            });
        });

        it('it should parse array is not same', async () => {
            const testCase = await getTestCase(10);

            expect(testCase).toEqual({
                name: 'testAssertNotEquals',
                class: 'PHPUnitTest',
                classname: null,
                file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\tests\\fixtures\\PHPUnitTest.php',
                line: 39,
                time: 0,
                type: Type.FAILURE,
                fault: {
                    message:
                        "Failed asserting that Array &0 (\n    'e' => 'f'\n    0 => 'g'\n    1 => 'h'\n) is identical to Array &0 (\n    'a' => 'b'\n    'c' => 'd'\n).",
                    details: [],
                },
            });
        });

        it('details has current file', async () => {
            const testCase = await getTestCase(11);

            expect(testCase).toEqual({
                name: 'testDetailsHasCurrentFile',
                class: 'PHPUnitTest',
                classname: null,
                file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\tests\\fixtures\\PHPUnitTest.php',
                line: 31,
                time: 0.99,
                type: Type.FAILURE,
                fault: {
                    message: 'Invalid JSON was returned from the route.',
                    details: [
                        {
                            file:
                                'C:\\Users\\recca\\Desktop\\vscode-phpunit\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Testing\\TestResponse.php',
                            line: 434,
                        },
                        {
                            file:
                                'C:\\Users\\recca\\Desktop\\vscode-phpunit\\vendor\\laravel\\framework\\src\\Illuminate\\Foundation\\Testing\\TestResponse.php',
                            line: 290,
                        },
                    ],
                },
            });
        });
    });
});
