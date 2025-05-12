import { expect } from '@jest/globals';
import { TestController, tests } from 'vscode';
import { PHPUnitXML, TestParser } from '../PHPUnit';
import { pestProject, phpUnitProject } from '../PHPUnit/__tests__/utils';
import { TestHierarchyBuilder } from './TestHierarchyBuilder';

type CODE = {
    testsuite: { name: string, path: string },
    file: string,
    code: string
}

export const generateXML = (text: string) => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="vendor/phpunit/phpunit/phpunit.xsd"
         bootstrap="vendor/autoload.php"
         colors="true"
>
    ${text.trim()}
</phpunit>`;
};

const givenPhp = (namespace: string, className: string, methods: string[]) => `<?php
${namespace};

class ${className} extends TestCase 
{
${methods.map((name) => `
    public function ${name}() {
        $this->assertTrue(true);
    }
`).join('')}
}`;

describe('TestHierarchyBuilder', () => {
    let ctrl: TestController;
    let configurationFile: string;

    const toTree = (items: any) => {
        const results = [] as any[];
        items.forEach((item: any) => {
            results.push({ id: item.id, label: item.label, children: toTree(item.children) });
        });

        return results;
    };

    const givenCodes = (codes: CODE[]) => {
        const testsuites = Object.entries(codes
            .map(({ testsuite }) => testsuite)
            .reduce((items, item) => {
                if (!(item.name in items)) {
                    items[item.name] = [];
                }
                items[item.name].push(item.path);

                return items;
            }, {} as { [index: string]: string[] }))
            .map(([name, paths]) => {
                const directories = paths.map(path => `<directory>${path}</directory>`).join('');

                return `<testsuite name="${name}">${directories}</testsuite>`;
            });

        const phpUnitXml = (new PHPUnitXML()).load(generateXML(
            `<testsuites>${testsuites.join('')}</testsuites>`,
        ), configurationFile);

        const testParser = new TestParser(phpUnitXml);
        const builder = new TestHierarchyBuilder(ctrl, testParser);
        codes.map(({ testsuite, file, code }) => {
            testParser.parse(code, file, testsuite.name);
        });
        builder.get();
    };

    beforeEach(() => {
        ctrl = tests.createTestController('phpUnitTestController', 'PHPUnit');
    });

    describe('PHPUnit', () => {
        beforeEach(() => configurationFile = phpUnitProject('phpunit.xml'));

        it('no namespace', () => {
            givenCodes([{
                testsuite: { name: 'default', path: 'tests' },
                file: phpUnitProject('tests/AssertionsTest.php'),
                code: givenPhp('', 'AssertionsTest', ['test_passed', 'test_failed']),
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
                testsuite: { name: 'default', path: 'tests' },
                file: phpUnitProject('tests/AssertionsTest.php'),
                code: givenPhp('namespace Tests', 'AssertionsTest', ['test_passed']),
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
                testsuite: { name: 'default', path: 'tests' },
                file: phpUnitProject('tests/AssertionsTest.php'),
                code: givenPhp('namespace Tests', 'AssertionsTest', ['test_passed']),
            }, {
                testsuite: { name: 'default', path: 'tests' },
                file: phpUnitProject('tests/Assertions2Test.php'),
                code: givenPhp('namespace Tests', 'Assertions2Test', ['test_passed']),
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

        it('two testsuites', () => {
            givenCodes([{
                testsuite: { name: 'Unit', path: 'tests/Unit' },
                file: phpUnitProject('tests/Feature/ExampleTest.php'),
                code: givenPhp('namespace Tests\\Unit', 'ExampleTest', ['test_passed']),
            }, {
                testsuite: { name: 'Feature', path: 'tests/Feature' },
                file: phpUnitProject('tests/Feature/ExampleTest.php'),
                code: givenPhp('namespace Tests\\Feature', 'ExampleTest', ['test_passed']),
            }]);

            // console.log(toTree(ctrl.items));
        });
    });

    describe('PEST', () => {
        beforeEach(() => configurationFile = pestProject('phpunit.xml'));

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
                testsuite: { name: 'default', path: 'tests' },
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