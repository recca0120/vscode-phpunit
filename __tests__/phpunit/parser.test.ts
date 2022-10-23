import { readFile } from 'fs/promises';
import * as path from 'path';
import { AttributeParser, parse, TestCase } from '../../src/phpunit/parser';

const attributeParser = new AttributeParser();
const projectPath = (uri: string) => path.join(__dirname, '../project-stub', uri);
const uniqueId = (namespace: string, clazz: string, method: string) => {
    return attributeParser.uniqueId(namespace, clazz, method);
};
const qualifiedClazz = (namespace: string, clazz: string) => {
    return attributeParser.qualifiedClazz(namespace, clazz);
};

describe('Parser Test', () => {
    let tests: TestCase[];
    const givenTest = (method: string) => tests.find((test) => test.method === method);

    describe('parse AssertionsTest', () => {
        const filename = projectPath('tests/AssertionsTest.php');
        const namespace = 'Recca0120\\VSCode\\Tests';
        const clazz = 'AssertionsTest';

        beforeAll(async () => {
            const buffer = await readFile(filename);
            tests = parse(buffer.toString(), filename)!;
        });

        it('it should parse test_passed', () => {
            const method = 'test_passed';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    filename,
                    id: uniqueId(namespace, clazz, method),
                    qualifiedClazz: qualifiedClazz(namespace, clazz),
                    namespace,
                    clazz,
                    method,
                    start: { line: 12, character: 4 },
                    end: { line: 12, character: 29 },
                })
            );
        });

        it('it should parse test_failed', () => {
            const method = 'test_failed';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    filename,
                    id: uniqueId(namespace, clazz, method),
                    qualifiedClazz: qualifiedClazz(namespace, clazz),
                    namespace,
                    clazz,
                    method,
                    annotations: { depends: ['test_passed'] },
                    start: { line: 20, character: 4 },
                    end: { line: 20, character: 29 },
                })
            );
        });

        it('it should parse test_is_not_same', () => {
            const method = 'test_is_not_same';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    filename,
                    id: uniqueId(namespace, clazz, method),
                    qualifiedClazz: qualifiedClazz(namespace, clazz),
                    namespace,
                    clazz,
                    method,
                    start: { line: 25, character: 4 },
                    end: { line: 25, character: 34 },
                })
            );
        });

        it('it should parse test_risky', () => {
            const method = 'test_risky';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    filename,
                    id: uniqueId(namespace, clazz, method),
                    qualifiedClazz: qualifiedClazz(namespace, clazz),
                    namespace,
                    clazz,
                    method,
                    start: { line: 30, character: 4 },
                    end: { line: 30, character: 28 },
                })
            );
        });

        it('it should parse annotation_test', () => {
            const method = 'annotation_test';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    filename,
                    id: uniqueId(namespace, clazz, method),
                    qualifiedClazz: qualifiedClazz(namespace, clazz),
                    namespace,
                    clazz,
                    method,
                    start: { line: 38, character: 4 },
                    end: { line: 38, character: 33 },
                })
            );
        });

        it('it should parse test_skipped', () => {
            const method = 'test_skipped';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    filename,
                    id: uniqueId(namespace, clazz, method),
                    qualifiedClazz: qualifiedClazz(namespace, clazz),
                    namespace,
                    clazz,
                    method,
                    start: { line: 43, character: 4 },
                    end: { line: 43, character: 30 },
                })
            );
        });

        it('it should parse test_incomplete', () => {
            const method = 'test_incomplete';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    filename,
                    id: uniqueId(namespace, clazz, method),
                    qualifiedClazz: qualifiedClazz(namespace, clazz),
                    namespace,
                    clazz,
                    method,
                    start: { line: 48, character: 4 },
                    end: { line: 48, character: 33 },
                })
            );
        });

        it('it should parse addition_provider', () => {
            const method = 'addition_provider';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    filename,
                    id: uniqueId(namespace, clazz, method),
                    qualifiedClazz: qualifiedClazz(namespace, clazz),
                    namespace,
                    clazz,
                    method,
                    annotations: { dataProvider: ['additionProvider'], depends: ['test_passed'] },
                    start: { line: 58, character: 4 },
                    end: { line: 58, character: 52 },
                })
            );
        });
    });

    describe('parse AbstractTest', () => {
        const filename = projectPath('tests/AbstractTest.php');

        beforeAll(async () => {
            const buffer = await readFile(filename);
            tests = parse(buffer.toString(), filename)!;
        });

        it('it should not parse abstract class', () => {
            expect(tests).toHaveLength(0);
        });
    });

    describe('parse StaticMethodTest', () => {
        const filename = projectPath('tests/StaticMethodTest.php');
        const namespace = 'Recca0120\\VSCode\\Tests';
        const clazz = 'StaticMethodTest';

        beforeAll(async () => {
            const buffer = await readFile(filename);
            tests = parse(buffer.toString(), filename)!;
        });

        it('it should parse test_static_public_fail', () => {
            const method = 'test_static_public_fail';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    filename,
                    id: uniqueId(namespace, clazz, method),
                    qualifiedClazz: qualifiedClazz(namespace, clazz),
                    namespace,
                    clazz,
                    method,
                    start: { line: 9, character: 4 },
                    end: { line: 9, character: 48 },
                })
            );

            expect(tests).toHaveLength(1);
        });
    });

    describe('parse HasPropertyTest', () => {
        const filename = projectPath('tests/SubFolder/HasPropertyTest.php');
        const namespace = 'Recca0120\\VSCode\\Tests\\SubFolder';
        const clazz = 'HasPropertyTest';

        beforeAll(async () => {
            const buffer = await readFile(filename);
            tests = parse(buffer.toString(), filename)!;
        });

        it('it should parse property', () => {
            const method = 'property';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    filename,
                    id: uniqueId(namespace, clazz, method),
                    qualifiedClazz: qualifiedClazz(namespace, clazz),
                    namespace,
                    clazz,
                    method,
                    start: { line: 17, character: 4 },
                    end: { line: 17, character: 26 },
                })
            );

            expect(tests).toHaveLength(1);
        });
    });

    describe('parse LeadingCommentsTest', () => {
        const filename = projectPath('tests/SubFolder/LeadingCommentsTest.php');
        const namespace = 'Recca0120\\VSCode\\Tests\\SubFolder';
        const clazz = 'LeadingCommentsTest';

        beforeAll(async () => {
            const buffer = await readFile(filename);
            tests = parse(buffer.toString(), filename)!;
        });

        it('it should parse firstLeadingComments', () => {
            const method = 'firstLeadingComments';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    filename,
                    id: uniqueId(namespace, clazz, method),
                    qualifiedClazz: qualifiedClazz(namespace, clazz),
                    namespace,
                    clazz,
                    method,
                    start: { line: 10, character: 4 },
                    end: { line: 10, character: 38 },
                })
            );
        });
    });

    describe('parse UseTraitTest', () => {
        const filename = projectPath('tests/SubFolder/UseTraitTest.php');
        const namespace = 'Recca0120\\VSCode\\Tests\\SubFolder';
        const clazz = 'UseTraitTest';

        beforeAll(async () => {
            const buffer = await readFile(filename);
            tests = parse(buffer.toString(), filename)!;
        });

        it('it should parse use_trait', () => {
            const method = 'use_trait';
            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    filename,
                    id: uniqueId(namespace, clazz, method),
                    qualifiedClazz: qualifiedClazz(namespace, clazz),
                    namespace,
                    clazz,
                    method,
                    start: { line: 12, character: 4 },
                    end: { line: 12, character: 27 },
                })
            );
        });
    });
});
