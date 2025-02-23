import { expect } from '@jest/globals';
import { TestController, tests } from 'vscode';
import { PHPUnitXML, TestParser } from '../PHPUnit';
import { pestProject, phpUnitProject } from '../PHPUnit/__tests__/utils';
import { TestHierarchyBuilder } from './TestHierarchyBuilder';

function givenPhp(namespace: string, className: string, methods: string[]) {
    return `<?php
${namespace};

class ${className} extends TestCase 
{
${methods.map((name) => `
    public function ${name}() {
        $this->assertTrue(true);
    }
`).join('')}
}`;
}

describe('TestHierarchyBuilder', () => {
    let ctrl: TestController;
    let testParser: TestParser;
    let builder: TestHierarchyBuilder;

    const toTree = (items: any) => {
        const results = [] as any[];
        items.forEach((item: any) => {
            results.push({
                id: item.id,
                label: item.label,
                children: toTree(item.children),
            });
        });

        return results;
    };

    const givenCodes = (files: { file: string, code: string }[]) => {
        files.forEach(({ file, code }) => {
            testParser.parse(code, file);
        });

        builder.get();
    };

    describe('PHPUnit', () => {
        beforeEach(() => {
            ctrl = tests.createTestController('phpUnitTestController', 'PHPUnit');
            const phpUnitXML = new PHPUnitXML().setRoot(phpUnitProject(''));
            testParser = new TestParser(phpUnitXML);
            builder = new TestHierarchyBuilder(testParser, ctrl);
        });

        it('no namespace', () => {
            givenCodes([{
                file: phpUnitProject('tests/AssertionsTest.php'),
                code: givenPhp(
                    '',
                    'AssertionsTest',
                    ['test_passed', 'test_failed'],
                ),
            }]);

            expect(toTree(ctrl.items)).toEqual([
                {
                    id: 'Assertions',
                    label: '$(symbol-class) AssertionsTest',
                    children: [
                        {
                            id: 'Assertions::Passed',
                            label: '$(symbol-method) test_passed',
                            children: [],
                        },
                        {
                            id: 'Assertions::Failed',
                            label: '$(symbol-method) test_failed',
                            children: [],
                        },
                    ],
                },
            ]);
        });

        it('nested namespace', () => {
            givenCodes([{
                file: phpUnitProject('tests/AssertionsTest.php'),
                code: givenPhp(
                    'namespace Tests',
                    'AssertionsTest',
                    ['test_passed'],
                ),
            }]);

            expect(toTree(ctrl.items)).toEqual([
                {
                    id: 'namespace:Tests',
                    label: '$(symbol-namespace) Tests',
                    children: [
                        {
                            id: 'Assertions (Tests\\Assertions)',
                            label: '$(symbol-class) AssertionsTest',
                            children: [
                                {
                                    id: 'Assertions (Tests\\Assertions)::Passed',
                                    label: '$(symbol-method) test_passed',
                                    children: [],
                                },
                            ],
                        },
                    ],
                },

            ]);
        });

        it('sibling namespace', () => {
            givenCodes([{
                file: phpUnitProject('tests/AssertionsTest.php'),
                code: givenPhp(
                    'namespace Tests',
                    'AssertionsTest',
                    ['test_passed'],
                ),
            }, {
                file: phpUnitProject('tests/Assertions2Test.php'),
                code: givenPhp(
                    'namespace Tests',
                    'Assertions2Test',
                    ['test_passed'],
                ),
            }]);

            expect(toTree(ctrl.items)).toEqual([
                {
                    id: 'namespace:Tests',
                    label: '$(symbol-namespace) Tests',
                    children: [
                        {
                            id: 'Assertions (Tests\\Assertions)',
                            label: '$(symbol-class) AssertionsTest',
                            children: [
                                {
                                    id: 'Assertions (Tests\\Assertions)::Passed',
                                    label: '$(symbol-method) test_passed',
                                    children: [],
                                },
                            ],
                        },
                        {
                            id: 'Assertions2 (Tests\\Assertions2)',
                            label: `$(symbol-class) Assertions2Test`,
                            children: [
                                {
                                    id: 'Assertions2 (Tests\\Assertions2)::Passed',
                                    label: '$(symbol-method) test_passed',
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
            ]);
        });
    });

    describe('PEST', () => {
        beforeEach(() => {
            ctrl = tests.createTestController('phpUnitTestController', 'PHPUnit');
            const phpUnitXML = new PHPUnitXML().setRoot(pestProject(''));
            testParser = new TestParser(phpUnitXML);
            builder = new TestHierarchyBuilder(testParser, ctrl);
        });

        it('nested describe', () => {
            const code = `<?php
describe('Given something ...', function () {
    describe('When...', function () {
        it('Then should...', function () {});
    });
});

test('Test1', function () {
    expect(true)->toBe(false);
});

describe('Given something else...', function () {
    describe('When...', function () {
        it('Then should...', function () {});
    });
    
    test('Test2', function () {
        expect(true)->toBe(false);
    });
    
    describe('When also...', function () {
        it('Then should...', function () {});
    });
});

test('Test3', function () {
    expect(true)->toBe(false);
});
`;
            givenCodes([{
                file: pestProject('tests/ExampleTest.php'),
                code: code,
            }]);

            expect(toTree(ctrl.items)).toEqual([{
                id: 'namespace:Tests',
                label: '$(symbol-namespace) Tests',
                children: [{
                    id: 'Tests\\ExampleTest',
                    label: '$(symbol-class) ExampleTest',
                    children: [
                        expect.objectContaining({
                            id: 'tests/ExampleTest.php::`Given something ...`',
                            label: '$(symbol-class) Given something ...',
                        }),
                        {
                            id: 'tests/ExampleTest.php::Test1',
                            label: '$(symbol-method) Test1',
                            children: [],
                        },
                        {
                            id: 'tests/ExampleTest.php::`Given something else...`',
                            label: '$(symbol-class) Given something else...',
                            children: [
                                expect.objectContaining({
                                    id: 'tests/ExampleTest.php::`Given something else...` → `When...`',
                                    label: '$(symbol-class) When...',
                                }),
                                {
                                    id: 'tests/ExampleTest.php::`Given something else...` → Test2',
                                    label: '$(symbol-method) Test2',
                                    children: [],
                                },
                                expect.objectContaining({
                                    id: 'tests/ExampleTest.php::`Given something else...` → `When also...`',
                                    label: '$(symbol-class) When also...',
                                }),
                            ],
                        },
                        {
                            id: 'tests/ExampleTest.php::Test3',
                            label: '$(symbol-method) Test3',
                            children: [],
                        },
                    ],
                }],
            }]);
        });
    });
});