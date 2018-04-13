import { Ast } from '../../src/phpunit/ast';
import { FilesystemContract, Filesystem } from '../../src/filesystem';
import { projectPath } from '../helpers';
import { TestNode } from '../../src/phpunit';

describe('Ast Test', () => {
    const files: FilesystemContract = new Filesystem();
    const path: string = projectPath('tests/AssertionsTest.php');
    const uri: string = files.uri(path);
    const ast: Ast = new Ast();
    let testNodes: TestNode[] = [];
    beforeAll(async () => {
        const code: string = await files.get(path);
        testNodes = ast.parse(code, uri);
    });

    it('it should be class and method name will equal to class name', () => {
        expect(testNodes[0]).toEqual({
            name: 'Tests\\AssertionsTest',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            uri: uri,
            range: {
                end: {
                    character: 14,
                    line: 6,
                },
                start: {
                    character: 0,
                    line: 6,
                },
            },
        });
    });

    it('it should be test_passed', () => {
        expect(testNodes[1]).toEqual({
            name: 'test_passed',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            uri: uri,
            range: {
                end: {
                    character: 22,
                    line: 8,
                },
                start: {
                    character: 11,
                    line: 8,
                },
            },
        });
    });

    it('it should be test_error', () => {
        expect(testNodes[2]).toEqual({
            name: 'test_error',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            uri: uri,
            range: {
                end: {
                    character: 21,
                    line: 13,
                },
                start: {
                    character: 11,
                    line: 13,
                },
            },
        });
    });

    it('it should be test_assertion_isnt_same', () => {
        expect(testNodes[3]).toEqual({
            name: 'test_assertion_isnt_same',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            uri: uri,
            range: {
                end: {
                    character: 35,
                    line: 18,
                },
                start: {
                    character: 11,
                    line: 18,
                },
            },
        });
    });

    it('it should be it_should_be_annotation_test', () => {
        expect(testNodes[5]).toEqual({
            name: 'it_should_be_annotation_test',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            uri: uri,
            range: {
                end: {
                    character: 39,
                    line: 31,
                },
                start: {
                    character: 11,
                    line: 31,
                },
            },
        });
    });

    it('it should be test_skipped', () => {
        expect(testNodes[6]).toEqual({
            name: 'test_skipped',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            uri: uri,
            range: {
                end: {
                    character: 23,
                    line: 36,
                },
                start: {
                    character: 11,
                    line: 36,
                },
            },
        });
    });

    it('it should be test_incomplete', () => {
        expect(testNodes[7]).toEqual({
            name: 'test_incomplete',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            uri: uri,
            range: {
                end: {
                    character: 26,
                    line: 41,
                },
                start: {
                    character: 11,
                    line: 41,
                },
            },
        });
    });

    it('it should be test_no_assertion', () => {
        expect(testNodes[8]).toEqual({
            name: 'test_no_assertion',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            uri: uri,
            range: {
                end: {
                    character: 28,
                    line: 46,
                },
                start: {
                    character: 11,
                    line: 46,
                },
            },
        });
    });
});
