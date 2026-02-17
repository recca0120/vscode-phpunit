import { beforeEach, describe, expect, it } from 'vitest';
import { type TestController, tests } from 'vscode';
import { ChainAstParser, PHPUnitXML, TestParser } from '../PHPUnit';
import { pestProject, phpUnitProject } from '../PHPUnit/__tests__/utils';
import { PhpParserAstParser } from '../PHPUnit/TestParser/php-parser/PhpParserAstParser';
import { TreeSitterAstParser } from '../PHPUnit/TestParser/tree-sitter/TreeSitterAstParser';
import { TestHierarchyBuilder } from './TestHierarchyBuilder';

type CODE = {
    testsuite: { name: string; path: string };
    file: string;
    code: string;
};

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
${methods
    .map(
        (name) => `
    public function ${name}() {
        $this->assertTrue(true);
    }
`,
    )
    .join('')}
}`;

describe('TestHierarchyBuilder', () => {
    let ctrl: TestController;
    let configurationFile: string;

    const toTree = (items: import('vscode').TestItemCollection) => {
        const results: { id: string; label: string; children: ReturnType<typeof toTree> }[] = [];
        for (const [, item] of items) {
            results.push({ id: item.id, label: item.label, children: toTree(item.children) });
        }

        return results;
    };

    const givenCodes = (codes: CODE[]) => {
        const testsuites = Object.entries(
            codes
                .map(({ testsuite }) => testsuite)
                .reduce(
                    (items, item) => {
                        if (!(item.name in items)) {
                            items[item.name] = [];
                        }
                        items[item.name].push(item.path);

                        return items;
                    },
                    {} as { [index: string]: string[] },
                ),
        ).map(([name, paths]) => {
            const directories = paths.map((path) => `<directory>${path}</directory>`).join('');

            return `<testsuite name="${name}">${directories}</testsuite>`;
        });

        const phpUnitXml = new PHPUnitXML().load(
            generateXML(`<testsuites>${testsuites.join('')}</testsuites>`),
            configurationFile,
        );

        const astParser = new ChainAstParser([new TreeSitterAstParser(), new PhpParserAstParser()]);
        const testParser = new TestParser(phpUnitXml, astParser);
        const builder = new TestHierarchyBuilder(ctrl, ctrl.items, phpUnitXml);
        for (const { testsuite, file, code } of codes) {
            const result = testParser.parse(code, file, testsuite.name);
            if (result) {
                builder.build(result.tests);
            }
        }
    };

    beforeEach(() => {
        ctrl = tests.createTestController('phpunit', 'PHPUnit');
    });

    describe('PHPUnit', () => {
        beforeEach(() => (configurationFile = phpUnitProject('phpunit.xml')));

        it('no namespace', () => {
            givenCodes([
                {
                    testsuite: { name: 'default', path: 'tests' },
                    file: phpUnitProject('tests/AssertionsTest.php'),
                    code: givenPhp('', 'AssertionsTest', ['test_passed', 'test_failed']),
                },
            ]);

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
            givenCodes([
                {
                    testsuite: { name: 'default', path: 'tests' },
                    file: phpUnitProject('tests/AssertionsTest.php'),
                    code: givenPhp('namespace Tests', 'AssertionsTest', ['test_passed']),
                },
            ]);

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
            givenCodes([
                {
                    testsuite: { name: 'default', path: 'tests' },
                    file: phpUnitProject('tests/AssertionsTest.php'),
                    code: givenPhp('namespace Tests', 'AssertionsTest', ['test_passed']),
                },
                {
                    testsuite: { name: 'default', path: 'tests' },
                    file: phpUnitProject('tests/Assertions2Test.php'),
                    code: givenPhp('namespace Tests', 'Assertions2Test', ['test_passed']),
                },
            ]);

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

        it('two testsuites should group by testsuite name', () => {
            givenCodes([
                {
                    testsuite: { name: 'Unit', path: 'tests/Unit' },
                    file: phpUnitProject('tests/Unit/ExampleTest.php'),
                    code: givenPhp('namespace Tests\\Unit', 'ExampleTest', ['test_passed']),
                },
                {
                    testsuite: { name: 'Feature', path: 'tests/Feature' },
                    file: phpUnitProject('tests/Feature/ExampleTest.php'),
                    code: givenPhp('namespace Tests\\Feature', 'ExampleTest', ['test_passed']),
                },
            ]);

            expect(toTree(ctrl.items)).toEqual([
                {
                    id: 'testsuite:Unit',
                    label: '$(package) Unit',
                    children: [
                        {
                            id: 'Example (Tests\\Unit\\Example)',
                            label: '$(symbol-class) ExampleTest',
                            children: [
                                {
                                    id: 'Example (Tests\\Unit\\Example)::Passed',
                                    label: '$(symbol-method) test_passed',
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
                {
                    id: 'testsuite:Feature',
                    label: '$(package) Feature',
                    children: [
                        {
                            id: 'Example (Tests\\Feature\\Example)',
                            label: '$(symbol-class) ExampleTest',
                            children: [
                                {
                                    id: 'Example (Tests\\Feature\\Example)::Passed',
                                    label: '$(symbol-method) test_passed',
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
            ]);
        });

        it('two testsuites with one having multiple directories', () => {
            givenCodes([
                {
                    testsuite: { name: 'App', path: 'tests/Unit' },
                    file: phpUnitProject('tests/Unit/ExampleTest.php'),
                    code: givenPhp('namespace Tests\\Unit', 'ExampleTest', ['test_unit']),
                },
                {
                    testsuite: { name: 'App', path: 'tests/Feature' },
                    file: phpUnitProject('tests/Feature/LoginTest.php'),
                    code: givenPhp('namespace Tests\\Feature', 'LoginTest', ['test_login']),
                },
                {
                    testsuite: { name: 'Integration', path: 'tests/Integration' },
                    file: phpUnitProject('tests/Integration/ApiTest.php'),
                    code: givenPhp('namespace Tests\\Integration', 'ApiTest', ['test_api']),
                },
            ]);

            expect(toTree(ctrl.items)).toEqual([
                {
                    id: 'testsuite:App',
                    label: '$(package) App',
                    children: [
                        {
                            id: 'Example (Tests\\Unit\\Example)',
                            label: '$(symbol-class) ExampleTest',
                            children: [
                                {
                                    id: 'Example (Tests\\Unit\\Example)::Unit',
                                    label: '$(symbol-method) test_unit',
                                    children: [],
                                },
                            ],
                        },
                        {
                            id: 'Login (Tests\\Feature\\Login)',
                            label: '$(symbol-class) LoginTest',
                            children: [
                                {
                                    id: 'Login (Tests\\Feature\\Login)::Login',
                                    label: '$(symbol-method) test_login',
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
                {
                    id: 'testsuite:Integration',
                    label: '$(package) Integration',
                    children: [
                        {
                            id: 'Api (Tests\\Integration\\Api)',
                            label: '$(symbol-class) ApiTest',
                            children: [
                                {
                                    id: 'Api (Tests\\Integration\\Api)::Api',
                                    label: '$(symbol-method) test_api',
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
            ]);
        });
    });

    describe('re-parse (file change)', () => {
        beforeEach(() => (configurationFile = phpUnitProject('phpunit.xml')));

        it('class children should be replaced, not accumulated, on re-parse', () => {
            const phpUnitXml = new PHPUnitXML().load(
                generateXML(
                    `<testsuites><testsuite name="default"><directory>tests</directory></testsuite></testsuites>`,
                ),
                configurationFile,
            );

            const astParser = new ChainAstParser([
                new TreeSitterAstParser(),
                new PhpParserAstParser(),
            ]);
            const testParser = new TestParser(phpUnitXml, astParser);

            // First parse: class with methods A and B
            const builder1 = new TestHierarchyBuilder(ctrl, ctrl.items);
            const result1 = testParser.parse(
                givenPhp('namespace Tests', 'AssertionsTest', ['test_passed', 'test_failed']),
                phpUnitProject('tests/AssertionsTest.php'),
                'default',
            );
            if (result1) builder1.build(result1.tests);

            // Second parse into new builder: class with only method A
            const builder2 = new TestHierarchyBuilder(ctrl, ctrl.items);
            const result2 = testParser.parse(
                givenPhp('namespace Tests', 'AssertionsTest', ['test_passed']),
                phpUnitProject('tests/AssertionsTest.php'),
                'default',
            );
            if (result2) builder2.build(result2.tests);

            // The class should have exactly 1 method, not 2
            const ns = ctrl.items.get('namespace:Tests');
            expect(ns).toBeDefined();
            const cls = ns?.children.get('Assertions (Tests\\Assertions)');
            expect(cls).toBeDefined();
            const methods: string[] = [];
            if (cls) {
                for (const [, item] of cls.children) {
                    methods.push(item.id);
                }
            }

            expect(methods).toEqual(['Assertions (Tests\\Assertions)::Passed']);
        });
    });

    describe('PEST', () => {
        beforeEach(() => (configurationFile = pestProject('phpunit.xml')));

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
            givenCodes([
                {
                    testsuite: { name: 'default', path: 'tests' },
                    file: pestProject('tests/ExampleTest.php'),
                    code: code,
                },
            ]);

            expect(toTree(ctrl.items)).toEqual([
                {
                    id: 'namespace:Tests',
                    label: '$(symbol-namespace) Tests',
                    children: [
                        {
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
                        },
                    ],
                },
            ]);
        });
    });
});
