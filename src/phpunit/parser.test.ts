import { beforeAll, describe, expect, it } from '@jest/globals';
import { readFile } from 'fs/promises';
import { projectPath } from './__tests__/helper';
import { AttributeParser, parse, Test } from './parser';

const attributeParser = new AttributeParser();
const uniqueId = (namespace: string, _class: string, method: string) => {
    return attributeParser.uniqueId(namespace, _class, method);
};
const qualifiedClass = (namespace: string, _class: string) => {
    return attributeParser.qualifiedClass(namespace, _class);
};

describe('Parser Test', () => {
    let suites: Test[];
    const givenTest = (method: string) => suites[0].children.find((test) => test.method === method);

    describe('parse AssertionsTest', () => {
        const file = projectPath('tests/AssertionsTest.php');
        const namespace = 'Recca0120\\VSCode\\Tests';
        const _class = 'AssertionsTest';

        beforeAll(async () => {
            const buffer = await readFile(file);
            suites = parse(buffer.toString(), file)!;
        });

        it('it should parse test_passed', () => {
            const method = 'test_passed';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    file,
                    id: uniqueId(namespace, _class, method),
                    qualifiedClass: qualifiedClass(namespace, _class),
                    namespace,
                    class: _class,
                    method,
                    start: { line: 12, character: 4 },
                    end: { line: 15, character: 5 },
                    // end: { line: 12, character: 29 },
                })
            );
        });

        it('it should parse test_failed', () => {
            const method = 'test_failed';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    file,
                    id: uniqueId(namespace, _class, method),
                    qualifiedClass: qualifiedClass(namespace, _class),
                    namespace,
                    class: _class,
                    method,
                    annotations: { depends: ['test_passed'] },
                    start: { line: 20, character: 4 },
                    end: { line: 23, character: 5 },
                    // end: { line: 20, character: 29 },
                })
            );
        });

        it('it should parse test_is_not_same', () => {
            const method = 'test_is_not_same';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    file,
                    id: uniqueId(namespace, _class, method),
                    qualifiedClass: qualifiedClass(namespace, _class),
                    namespace,
                    class: _class,
                    method,
                    start: { line: 25, character: 4 },
                    end: { line: 28, character: 5 },
                    // end: { line: 25, character: 34 },
                })
            );
        });

        it('it should parse test_risky', () => {
            const method = 'test_risky';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    file,
                    id: uniqueId(namespace, _class, method),
                    qualifiedClass: qualifiedClass(namespace, _class),
                    namespace,
                    class: _class,
                    method,
                    start: { line: 30, character: 4 },
                    end: { line: 33, character: 5 },
                    // end: { line: 30, character: 28 },
                })
            );
        });

        it('it should parse annotation_test', () => {
            const method = 'annotation_test';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    file,
                    id: uniqueId(namespace, _class, method),
                    qualifiedClass: qualifiedClass(namespace, _class),
                    namespace,
                    class: _class,
                    method,
                    start: { line: 38, character: 4 },
                    end: { line: 41, character: 5 },
                    // end: { line: 38, character: 33 },
                })
            );
        });

        it('it should parse test_skipped', () => {
            const method = 'test_skipped';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    file,
                    id: uniqueId(namespace, _class, method),
                    qualifiedClass: qualifiedClass(namespace, _class),
                    namespace,
                    class: _class,
                    method,
                    start: { line: 43, character: 4 },
                    end: { line: 46, character: 5 },
                    // end: { line: 43, character: 30 },
                })
            );
        });

        it('it should parse test_incomplete', () => {
            const method = 'test_incomplete';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    file,
                    id: uniqueId(namespace, _class, method),
                    qualifiedClass: qualifiedClass(namespace, _class),
                    namespace,
                    class: _class,
                    method,
                    start: { line: 48, character: 4 },
                    end: { line: 51, character: 5 },
                    // end: { line: 48, character: 33 },
                })
            );
        });

        it('it should parse addition_provider', () => {
            const method = 'addition_provider';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    file,
                    id: uniqueId(namespace, _class, method),
                    qualifiedClass: qualifiedClass(namespace, _class),
                    namespace,
                    class: _class,
                    method,
                    annotations: { dataProvider: ['additionProvider'], depends: ['test_passed'] },
                    start: { line: 60, character: 4 },
                    end: { line: 63, character: 5 },
                    // end: { line: 58, character: 52 },
                })
            );
        });
    });

    describe('parse AbstractTest', () => {
        const file = projectPath('tests/AbstractTest.php');

        beforeAll(async () => {
            const buffer = await readFile(file);
            suites = parse(buffer.toString(), file)!;
        });

        it('it should not parse abstract class', () => {
            expect(suites).toHaveLength(0);
        });
    });

    describe('parse StaticMethodTest', () => {
        const file = projectPath('tests/StaticMethodTest.php');
        const namespace = 'Recca0120\\VSCode\\Tests';
        const _class = 'StaticMethodTest';

        beforeAll(async () => {
            const buffer = await readFile(file);
            suites = parse(buffer.toString(), file)!;
        });

        it('it should parse test_static_public_fail', () => {
            const method = 'test_static_public_fail';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    file,
                    id: uniqueId(namespace, _class, method),
                    qualifiedClass: qualifiedClass(namespace, _class),
                    namespace,
                    class: _class,
                    method,
                    start: { line: 9, character: 4 },
                    end: { line: 11, character: 5 },
                    // end: { line: 9, character: 48 },
                })
            );

            expect(suites).toHaveLength(1);
        });
    });

    describe('parse HasPropertyTest', () => {
        const file = projectPath('tests/SubFolder/HasPropertyTest.php');
        const namespace = 'Recca0120\\VSCode\\Tests\\SubFolder';
        const _class = 'HasPropertyTest';

        beforeAll(async () => {
            const buffer = await readFile(file);
            suites = parse(buffer.toString(), file)!;
        });

        it('it should parse property', () => {
            const method = 'property';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    file,
                    id: uniqueId(namespace, _class, method),
                    qualifiedClass: qualifiedClass(namespace, _class),
                    namespace,
                    class: _class,
                    method,
                    start: { line: 17, character: 4 },
                    end: { line: 20, character: 5 },
                    // end: { line: 17, character: 26 },
                })
            );

            expect(suites).toHaveLength(1);
        });
    });

    describe('parse LeadingCommentsTest', () => {
        const file = projectPath('tests/SubFolder/LeadingCommentsTest.php');
        const namespace = 'Recca0120\\VSCode\\Tests\\SubFolder';
        const _class = 'LeadingCommentsTest';

        beforeAll(async () => {
            const buffer = await readFile(file);
            suites = parse(buffer.toString(), file)!;
        });

        it('it should parse firstLeadingComments', () => {
            const method = 'firstLeadingComments';

            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    file,
                    id: uniqueId(namespace, _class, method),
                    qualifiedClass: qualifiedClass(namespace, _class),
                    namespace,
                    class: _class,
                    method,
                    start: { line: 10, character: 4 },
                    end: { line: 13, character: 5 },
                    // end: { line: 10, character: 38 },
                })
            );
        });
    });

    describe('parse UseTraitTest', () => {
        const file = projectPath('tests/SubFolder/UseTraitTest.php');
        const namespace = 'Recca0120\\VSCode\\Tests\\SubFolder';
        const _class = 'UseTraitTest';

        beforeAll(async () => {
            const buffer = await readFile(file);
            suites = parse(buffer.toString(), file)!;
        });

        it('it should parse use_trait', () => {
            const method = 'use_trait';
            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    file,
                    id: uniqueId(namespace, _class, method),
                    qualifiedClass: qualifiedClass(namespace, _class),
                    namespace,
                    class: _class,
                    method,
                    start: { line: 12, character: 4 },
                    end: { line: 15, character: 5 },
                    // end: { line: 12, character: 27 },
                })
            );
        });
    });

    describe('parse AttributeTest', () => {
        const file = projectPath('tests/AttributeTest.php');
        const namespace = 'Recca0120\\VSCode\\Tests';
        const _class = 'AttributeTest';

        beforeAll(async () => {
            const buffer = await readFile(file);
            suites = parse(buffer.toString(), file)!;
        });

        it('parse Test Attribute', () => {
            const method = 'hi';
            expect(givenTest(method)).toEqual(
                expect.objectContaining({
                    file,
                    id: uniqueId(namespace, _class, method),
                    qualifiedClass: qualifiedClass(namespace, _class),
                    namespace,
                    class: _class,
                    method,
                    start: { line: 11, character: 4 },
                    end: { line: 14, character: 5 },
                })
            );
        });
    });
});
