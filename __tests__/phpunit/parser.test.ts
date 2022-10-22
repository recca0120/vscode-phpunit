import { readFile } from 'fs/promises';
import * as path from 'path';
import { parse, TestCase } from '../../src/phpunit/parser';

const projectPath = (uri: string) => path.join(__dirname, '../project-stub', uri);

describe('Parser Test', () => {
    describe('parse AssertionsTest', () => {
        let tests: TestCase[];
        const filename = projectPath('tests/AssertionsTest.php');
        const namespace = 'Recca0120\\VSCode\\Tests';
        const clazz = 'AssertionsTest';
        const generateId = (method: string) => `${namespace}\\${clazz}::${method}`;
        const givenTest = (method: string) => {
            return tests.find((test) => test.method === method);
        };

        beforeAll(async () => {
            const buffer = await readFile(filename);
            tests = parse(buffer.toString(), filename)!;
        });

        it('parse test_passed', () => {
            const method = 'test_passed';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    filename,
                    id: generateId(method),
                    namespace,
                    clazz,
                    method,
                    start: { line: 12, character: 4 },
                    end: { line: 12, character: 29 },
                })
            );
        });

        it('parse test_failed', () => {
            const method = 'test_failed';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    filename,
                    id: generateId(method),
                    namespace,
                    clazz,
                    method,
                    annotations: { depends: ['test_passed'] },
                    start: { line: 20, character: 4 },
                    end: { line: 20, character: 29 },
                })
            );
        });

        it('parse test_is_not_same', () => {
            const method = 'test_is_not_same';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    filename,
                    id: generateId(method),
                    namespace,
                    clazz,
                    method,
                    start: { line: 25, character: 4 },
                    end: { line: 25, character: 34 },
                })
            );
        });

        it('parse test_risky', () => {
            const method = 'test_risky';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    filename,
                    id: generateId(method),
                    namespace,
                    clazz,
                    method,
                    start: { line: 30, character: 4 },
                    end: { line: 30, character: 28 },
                })
            );
        });

        it('parse annotation_test', () => {
            const method = 'annotation_test';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    filename,
                    id: generateId(method),
                    namespace,
                    clazz,
                    method,
                    start: { line: 38, character: 4 },
                    end: { line: 38, character: 33 },
                })
            );
        });

        it('parse test_skipped', () => {
            const method = 'test_skipped';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    filename,
                    id: generateId(method),
                    namespace,
                    clazz,
                    method,
                    start: { line: 43, character: 4 },
                    end: { line: 43, character: 30 },
                })
            );
        });

        it('parse test_incomplete', () => {
            const method = 'test_incomplete';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    filename,
                    id: generateId(method),
                    namespace,
                    clazz,
                    method,
                    start: { line: 48, character: 4 },
                    end: { line: 48, character: 33 },
                })
            );
        });

        it('parse addition_provider', () => {
            const method = 'addition_provider';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    filename,
                    id: generateId(method),
                    namespace,
                    clazz,
                    method,
                    start: { line: 57, character: 4 },
                    end: { line: 57, character: 52 },
                })
            );
        });
    });
});
