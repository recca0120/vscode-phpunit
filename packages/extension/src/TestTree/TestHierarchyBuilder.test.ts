import {
    ChainAstParser,
    PHPUnitXML,
    PhpParserAstParser,
    TestParser,
    TestType,
    TreeSitterAstParser,
} from '@vscode-phpunit/phpunit';
import { generateXML, pestProject, phpUnitProject } from '@vscode-phpunit/phpunit/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { type TestController, type TestItem, tests } from 'vscode';
import { toTree } from '../../test-support/testItems';
import { icon, TestHierarchyBuilder } from './TestHierarchyBuilder';

type TestFile = {
    testsuite: { name: string; path: string };
    file: string;
    code: string;
};

const phpTestClass = (namespace: string, className: string, methods: string[]) => `<?php
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

const testsuitesXml = (testFiles: TestFile[]) => {
    const directories = new Map<string, string[]>();
    for (const { testsuite } of testFiles) {
        directories.set(testsuite.name, [
            ...(directories.get(testsuite.name) ?? []),
            testsuite.path,
        ]);
    }

    return [...directories]
        .map(([name, paths]) => {
            const xml = paths.map((path) => `<directory>${path}</directory>`).join('');
            return `<testsuite name="${name}">${xml}</testsuite>`;
        })
        .join('');
};

describe('TestHierarchyBuilder', () => {
    let ctrl: TestController;

    const givenTestFiles = (testFiles: TestFile[], configurationFile: string) => {
        const phpUnitXml = new PHPUnitXML().load(
            generateXML(`<testsuites>${testsuitesXml(testFiles)}</testsuites>`),
            configurationFile,
        );

        const astParser = new ChainAstParser([new TreeSitterAstParser(), new PhpParserAstParser()]);
        const testParser = new TestParser(phpUnitXml, astParser);
        const builder = new TestHierarchyBuilder(ctrl, ctrl.items, phpUnitXml);
        for (const { testsuite, file, code } of testFiles) {
            const result = testParser.parse(code, file, testsuite.name);
            if (result) {
                builder.build(result.tests);
            }
        }
    };

    beforeEach(() => {
        ctrl = tests.createTestController('phpunit', 'PHPUnit');
    });

    describe('tree structure', () => {
        describe('single testsuite', () => {
            it('lists a class without a namespace at the root', () => {
                givenTestFiles(
                    [
                        {
                            testsuite: { name: 'default', path: 'tests' },
                            file: phpUnitProject('tests/NoNamespaceTest.php'),
                            code: `<?php
class NoNamespaceTest extends TestCase
{
    public function test_no_namespace() {
        $this->assertTrue(true);
    }
}`,
                        },
                    ],
                    phpUnitProject('phpunit.xml'),
                );

                expect(toTree(ctrl.items)).toEqual([
                    {
                        id: 'No Namespace',
                        label: `${icon(TestType.class)} NoNamespaceTest`,
                        children: [
                            {
                                id: 'No Namespace::No namespace',
                                label: `${icon(TestType.method)} test_no_namespace`,
                                children: [],
                            },
                        ],
                    },
                ]);
            });

            it('nests a class under its namespace', () => {
                givenTestFiles(
                    [
                        {
                            testsuite: { name: 'default', path: 'tests' },
                            file: phpUnitProject('tests/AssertionsTest.php'),
                            code: phpTestClass('namespace Tests', 'AssertionsTest', [
                                'test_passed',
                            ]),
                        },
                    ],
                    phpUnitProject('phpunit.xml'),
                );

                expect(toTree(ctrl.items)).toEqual([
                    {
                        id: 'namespace:Tests',
                        label: `${icon(TestType.namespace)} Tests`,
                        children: [
                            expect.objectContaining({
                                id: 'Assertions (Tests\\Assertions)',
                                label: `${icon(TestType.class)} AssertionsTest`,
                            }),
                        ],
                    },
                ]);
            });

            it('puts the classes of one namespace under a single namespace item', () => {
                givenTestFiles(
                    [
                        {
                            testsuite: { name: 'default', path: 'tests' },
                            file: phpUnitProject('tests/AssertionsTest.php'),
                            code: phpTestClass('namespace Tests', 'AssertionsTest', [
                                'test_passed',
                            ]),
                        },
                        {
                            testsuite: { name: 'default', path: 'tests' },
                            file: phpUnitProject('tests/AttributeTest.php'),
                            code: phpTestClass('namespace Tests', 'AttributeTest', ['test_hi']),
                        },
                    ],
                    phpUnitProject('phpunit.xml'),
                );

                expect(toTree(ctrl.items)).toEqual([
                    {
                        id: 'namespace:Tests',
                        label: `${icon(TestType.namespace)} Tests`,
                        children: [
                            expect.objectContaining({
                                id: 'Assertions (Tests\\Assertions)',
                                label: `${icon(TestType.class)} AssertionsTest`,
                            }),
                            expect.objectContaining({
                                id: 'Attribute (Tests\\Attribute)',
                                label: `${icon(TestType.class)} AttributeTest`,
                            }),
                        ],
                    },
                ]);
            });
        });

        describe('multi-testsuite', () => {
            it('groups classes by testsuite and strips the namespace prefix of its directory', () => {
                givenTestFiles(
                    [
                        {
                            testsuite: { name: 'Unit', path: 'tests/Unit' },
                            file: phpUnitProject('tests/Unit/ExampleTest.php'),
                            code: phpTestClass('namespace Tests\\Unit', 'ExampleTest', [
                                'test_unit',
                            ]),
                        },
                        {
                            testsuite: { name: 'Feature', path: 'tests/Feature' },
                            file: phpUnitProject('tests/Feature/ExampleTest.php'),
                            code: phpTestClass('namespace Tests\\Feature', 'ExampleTest', [
                                'test_feature',
                            ]),
                        },
                    ],
                    phpUnitProject('phpunit.xml'),
                );

                expect(toTree(ctrl.items)).toEqual([
                    {
                        id: 'testsuite:Feature',
                        label: `${icon(TestType.testsuite)} Feature`,
                        children: [
                            expect.objectContaining({
                                id: 'Example (Tests\\Feature\\Example)',
                                label: `${icon(TestType.class)} ExampleTest`,
                            }),
                        ],
                    },
                    {
                        id: 'testsuite:Unit',
                        label: `${icon(TestType.testsuite)} Unit`,
                        children: [
                            expect.objectContaining({
                                id: 'Example (Tests\\Unit\\Example)',
                                label: `${icon(TestType.class)} ExampleTest`,
                            }),
                        ],
                    },
                ]);
            });

            it('shows only the namespace parts left after stripping the prefix', () => {
                givenTestFiles(
                    [
                        {
                            testsuite: { name: 'Unit', path: 'tests/Unit' },
                            file: phpUnitProject('tests/Unit/SubFolder/ExampleTest.php'),
                            code: phpTestClass('namespace Tests\\Unit\\SubFolder', 'ExampleTest', [
                                'test_unit',
                            ]),
                        },
                        {
                            testsuite: { name: 'Feature', path: 'tests/Feature' },
                            file: phpUnitProject('tests/Feature/SubFolder/ExampleTest.php'),
                            code: phpTestClass(
                                'namespace Tests\\Feature\\SubFolder',
                                'ExampleTest',
                                ['test_feature'],
                            ),
                        },
                    ],
                    phpUnitProject('phpunit.xml'),
                );

                expect(toTree(ctrl.items)).toEqual([
                    {
                        id: 'testsuite:Feature',
                        label: `${icon(TestType.testsuite)} Feature`,
                        children: [
                            {
                                id: 'namespace:Sub Folder (Tests\\Feature\\SubFolder)',
                                label: `${icon(TestType.namespace)} SubFolder`,
                                children: [
                                    expect.objectContaining({
                                        id: 'Example (Tests\\Feature\\SubFolder\\Example)',
                                    }),
                                ],
                            },
                        ],
                    },
                    {
                        id: 'testsuite:Unit',
                        label: `${icon(TestType.testsuite)} Unit`,
                        children: [
                            {
                                id: 'namespace:Sub Folder (Tests\\Unit\\SubFolder)',
                                label: `${icon(TestType.namespace)} SubFolder`,
                                children: [
                                    expect.objectContaining({
                                        id: 'Example (Tests\\Unit\\SubFolder\\Example)',
                                    }),
                                ],
                            },
                        ],
                    },
                ]);
            });
        });

        describe('namespace prefix stripping', () => {
            it('keeps the full namespace when it does not match the directory', () => {
                givenTestFiles(
                    [
                        {
                            testsuite: { name: 'Unit', path: 'src/tests' },
                            file: phpUnitProject('src/tests/FooTest.php'),
                            code: phpTestClass('namespace App\\Tests', 'FooTest', ['test_foo']),
                        },
                        {
                            testsuite: { name: 'Feature', path: 'integration' },
                            file: phpUnitProject('integration/BarTest.php'),
                            code: phpTestClass('namespace Tests\\Feature', 'BarTest', ['test_bar']),
                        },
                    ],
                    phpUnitProject('phpunit.xml'),
                );

                const unitSuite = ctrl.items.get('testsuite:Unit') as TestItem;
                expect(unitSuite.children.get('namespace:App')).toBeDefined();

                const featureSuite = ctrl.items.get('testsuite:Feature') as TestItem;
                expect(featureSuite.children.get('namespace:Tests')).toBeDefined();
            });

            it('strips the prefix of each directory of a testsuite', () => {
                givenTestFiles(
                    [
                        {
                            testsuite: { name: 'Unit', path: 'tests/Unit' },
                            file: phpUnitProject('tests/Unit/UserTest.php'),
                            code: phpTestClass('namespace Tests\\Unit', 'UserTest', ['test_user']),
                        },
                        {
                            testsuite: { name: 'Unit', path: 'tests/Unit2' },
                            file: phpUnitProject('tests/Unit2/OrderTest.php'),
                            code: phpTestClass('namespace Tests\\Unit2', 'OrderTest', [
                                'test_order',
                            ]),
                        },
                        {
                            testsuite: { name: 'Feature', path: 'tests/Feature' },
                            file: phpUnitProject('tests/Feature/LoginTest.php'),
                            code: phpTestClass('namespace Tests\\Feature', 'LoginTest', [
                                'test_login',
                            ]),
                        },
                    ],
                    phpUnitProject('phpunit.xml'),
                );

                const unitSuite = ctrl.items.get('testsuite:Unit') as TestItem;
                expect(unitSuite.children.get('namespace:Tests')).toBeUndefined();
                expect(unitSuite.children.get('User (Tests\\Unit\\User)')).toBeDefined();
                expect(unitSuite.children.get('Order (Tests\\Unit2\\Order)')).toBeDefined();

                const featureSuite = ctrl.items.get('testsuite:Feature') as TestItem;
                expect(featureSuite.children.get('namespace:Tests')).toBeUndefined();
                expect(featureSuite.children.get('Login (Tests\\Feature\\Login)')).toBeDefined();
            });

            it('matches a deep directory path to the namespace case-insensitively', () => {
                givenTestFiles(
                    [
                        {
                            testsuite: { name: 'Unit', path: 'tests/unit/models' },
                            file: phpUnitProject('tests/unit/models/UserTest.php'),
                            code: phpTestClass('namespace Tests\\Unit\\Models', 'UserTest', [
                                'test_create_user',
                            ]),
                        },
                        {
                            testsuite: { name: 'Feature', path: 'tests/feature' },
                            file: phpUnitProject('tests/feature/LoginTest.php'),
                            code: phpTestClass('namespace Tests\\Feature', 'LoginTest', [
                                'test_login',
                            ]),
                        },
                    ],
                    phpUnitProject('phpunit.xml'),
                );

                const unitSuite = ctrl.items.get('testsuite:Unit') as TestItem;
                expect(unitSuite.children.get('namespace:Tests')).toBeUndefined();
                expect(unitSuite.children.get('User (Tests\\Unit\\Models\\User)')).toBeDefined();

                const featureSuite = ctrl.items.get('testsuite:Feature') as TestItem;
                expect(featureSuite.children.get('namespace:Tests')).toBeUndefined();
                expect(featureSuite.children.get('Login (Tests\\Feature\\Login)')).toBeDefined();
            });

            it('does not strip when a directory segment only partly matches', () => {
                givenTestFiles(
                    [
                        {
                            testsuite: { name: 'Unit', path: 'tests/abc/def' },
                            file: phpUnitProject('tests/abc/def/FooTest.php'),
                            code: phpTestClass('namespace Tests\\Def', 'FooTest', ['test_foo']),
                        },
                        {
                            testsuite: { name: 'Feature', path: 'integration/sub' },
                            file: phpUnitProject('integration/sub/BarTest.php'),
                            code: phpTestClass('namespace App\\Feature', 'BarTest', ['test_bar']),
                        },
                    ],
                    phpUnitProject('phpunit.xml'),
                );

                const unitSuite = ctrl.items.get('testsuite:Unit') as TestItem;
                expect(unitSuite.children.get('namespace:Tests')).toBeDefined();

                const featureSuite = ctrl.items.get('testsuite:Feature') as TestItem;
                expect(featureSuite.children.get('namespace:App')).toBeDefined();
            });

            it('keeps the full namespace when the testsuite name is not part of it', () => {
                givenTestFiles(
                    [
                        {
                            testsuite: { name: 'App', path: 'tests/Unit' },
                            file: phpUnitProject('tests/Unit/ExampleTest.php'),
                            code: phpTestClass('namespace Tests\\Unit', 'ExampleTest', [
                                'test_unit',
                            ]),
                        },
                        {
                            testsuite: { name: 'App', path: 'tests/Feature' },
                            file: phpUnitProject('tests/Feature/LoginTest.php'),
                            code: phpTestClass('namespace Tests\\Feature', 'LoginTest', [
                                'test_login',
                            ]),
                        },
                        {
                            testsuite: { name: 'Integration', path: 'tests/Integration' },
                            file: phpUnitProject('tests/Integration/ApiTest.php'),
                            code: phpTestClass('namespace Tests\\Integration', 'ApiTest', [
                                'test_api',
                            ]),
                        },
                    ],
                    phpUnitProject('phpunit.xml'),
                );

                expect(toTree(ctrl.items)).toEqual([
                    {
                        id: 'testsuite:App',
                        label: `${icon(TestType.testsuite)} App`,
                        children: [
                            {
                                id: 'Example (Tests\\Unit\\Example)',
                                label: `${icon(TestType.class)} ExampleTest`,
                                children: [
                                    {
                                        id: 'Example (Tests\\Unit\\Example)::Unit',
                                        label: `${icon(TestType.method)} test_unit`,
                                        children: [],
                                    },
                                ],
                            },
                            {
                                id: 'Login (Tests\\Feature\\Login)',
                                label: `${icon(TestType.class)} LoginTest`,
                                children: [
                                    {
                                        id: 'Login (Tests\\Feature\\Login)::Login',
                                        label: `${icon(TestType.method)} test_login`,
                                        children: [],
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        id: 'testsuite:Integration',
                        label: `${icon(TestType.testsuite)} Integration`,
                        children: [
                            {
                                id: 'Api (Tests\\Integration\\Api)',
                                label: `${icon(TestType.class)} ApiTest`,
                                children: [
                                    {
                                        id: 'Api (Tests\\Integration\\Api)::Api',
                                        label: `${icon(TestType.method)} test_api`,
                                        children: [],
                                    },
                                ],
                            },
                        ],
                    },
                ]);
            });
        });

        describe('Pest describe blocks', () => {
            it('keeps tests and nested describes in source order', () => {
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
                givenTestFiles(
                    [
                        {
                            testsuite: { name: 'default', path: 'tests' },
                            file: pestProject('tests/ExampleTest.php'),
                            code: code,
                        },
                    ],
                    pestProject('phpunit.xml'),
                );

                expect(toTree(ctrl.items)).toEqual([
                    {
                        id: 'namespace:Tests',
                        label: `${icon(TestType.namespace)} Tests`,
                        children: [
                            {
                                id: 'Tests\\ExampleTest',
                                label: `${icon(TestType.class)} ExampleTest`,
                                children: [
                                    expect.objectContaining({
                                        id: 'tests/ExampleTest.php::`Given something ...`',
                                        label: `${icon(TestType.class)} Given something ...`,
                                    }),
                                    {
                                        id: 'tests/ExampleTest.php::Test1',
                                        label: `${icon(TestType.method)} Test1`,
                                        children: [],
                                    },
                                    {
                                        id: 'tests/ExampleTest.php::`Given something else...`',
                                        label: `${icon(TestType.class)} Given something else...`,
                                        children: [
                                            expect.objectContaining({
                                                id: 'tests/ExampleTest.php::`Given something else...` → `When...`',
                                                label: `${icon(TestType.class)} When...`,
                                            }),
                                            {
                                                id: 'tests/ExampleTest.php::`Given something else...` → Test2',
                                                label: `${icon(TestType.method)} Test2`,
                                                children: [],
                                            },
                                            expect.objectContaining({
                                                id: 'tests/ExampleTest.php::`Given something else...` → `When also...`',
                                                label: `${icon(TestType.class)} When also...`,
                                            }),
                                        ],
                                    },
                                    {
                                        id: 'tests/ExampleTest.php::Test3',
                                        label: `${icon(TestType.method)} Test3`,
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

    describe('data set children', () => {
        it('lists #[TestWith] data sets by index', () => {
            givenTestFiles(
                [
                    {
                        testsuite: { name: 'default', path: 'tests' },
                        file: phpUnitProject('tests/TestWithTest.php'),
                        code: `<?php
namespace Tests;

use PHPUnit\\Framework\\Attributes\\TestWith;
use PHPUnit\\Framework\\TestCase;

class TestWithTest extends TestCase
{
    #[TestWith([1, 2, 3])]
    #[TestWith([0, 0, 0])]
    public function testAddition(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, $a + $b);
    }
}`,
                    },
                ],
                phpUnitProject('phpunit.xml'),
            );

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const cls = ns.children.get('Test With (Tests\\TestWith)') as TestItem;
            const method = cls.children.get('Test With (Tests\\TestWith)::Addition') as TestItem;
            expect(method).toBeDefined();
            expect(method.children.size).toBe(2);

            const child0 = method.children.get(
                'Test With (Tests\\TestWith)::Addition with data set #0',
            );
            const child1 = method.children.get(
                'Test With (Tests\\TestWith)::Addition with data set #1',
            );
            expect(child0).toBeDefined();
            expect(child1).toBeDefined();
        });

        it('lists named #[TestWith] data sets by name', () => {
            givenTestFiles(
                [
                    {
                        testsuite: { name: 'default', path: 'tests' },
                        file: phpUnitProject('tests/TestWithNamedTest.php'),
                        code: `<?php
namespace Tests;

use PHPUnit\\Framework\\Attributes\\TestWith;
use PHPUnit\\Framework\\TestCase;

class TestWithNamedTest extends TestCase
{
    #[TestWith([0, 0, 0], 'adding zeros')]
    #[TestWith([0, 1, 1], 'zero plus one')]
    public function testAddition(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, $a + $b);
    }
}`,
                    },
                ],
                phpUnitProject('phpunit.xml'),
            );

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const cls = ns.children.get('Test With Named (Tests\\TestWithNamed)') as TestItem;
            const method = cls.children.get(
                'Test With Named (Tests\\TestWithNamed)::Addition',
            ) as TestItem;
            expect(method).toBeDefined();
            expect(method.children.size).toBe(2);

            const child0 = method.children.get(
                'Test With Named (Tests\\TestWithNamed)::Addition with data set "adding zeros"',
            );
            const child1 = method.children.get(
                'Test With Named (Tests\\TestWithNamed)::Addition with data set "zero plus one"',
            );
            expect(child0).toBeDefined();
            expect(child1).toBeDefined();
        });

        it('lists #[TestWithJson] data sets by index', () => {
            givenTestFiles(
                [
                    {
                        testsuite: { name: 'default', path: 'tests' },
                        file: phpUnitProject('tests/TestWithJsonTest.php'),
                        code: `<?php
namespace Tests;

use PHPUnit\\Framework\\Attributes\\TestWithJson;
use PHPUnit\\Framework\\TestCase;

class TestWithJsonTest extends TestCase
{
    #[TestWithJson('[1, 1, 2]')]
    #[TestWithJson('[3, 4, 7]')]
    public function testAddition(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, $a + $b);
    }
}`,
                    },
                ],
                phpUnitProject('phpunit.xml'),
            );

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const cls = ns.children.get('Test With Json (Tests\\TestWithJson)') as TestItem;
            const method = cls.children.get(
                'Test With Json (Tests\\TestWithJson)::Addition',
            ) as TestItem;
            expect(method).toBeDefined();
            expect(method.children.size).toBe(2);

            const child0 = method.children.get(
                'Test With Json (Tests\\TestWithJson)::Addition with data set #0',
            );
            const child1 = method.children.get(
                'Test With Json (Tests\\TestWithJson)::Addition with data set #1',
            );
            expect(child0).toBeDefined();
            expect(child1).toBeDefined();
        });

        it('lists Pest ->with() data sets by key', () => {
            givenTestFiles(
                [
                    {
                        testsuite: { name: 'default', path: 'tests' },
                        file: pestProject('tests/Unit/WithTest.php'),
                        code: `<?php
it('adds numbers', function (int $a, int $b, int $expected) {
    expect($a + $b)->toBe($expected);
})->with([
    'one plus one'   => [1, 1, 2],
    'two plus three' => [2, 3, 5],
]);`,
                    },
                ],
                pestProject('phpunit.xml'),
            );

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const unitNs = ns.children.get('namespace:Unit (Tests\\Unit)') as TestItem;
            const cls = unitNs.children.get('Tests\\Unit\\WithTest') as TestItem;
            const method = cls.children.get('tests/Unit/WithTest.php::it adds numbers') as TestItem;
            expect(method).toBeDefined();
            expect(method.children.size).toBe(2);
            expect(
                method.children.get(
                    'tests/Unit/WithTest.php::it adds numbers with data set "dataset "one plus one""',
                ),
            ).toBeDefined();
            expect(
                method.children.get(
                    'tests/Unit/WithTest.php::it adds numbers with data set "dataset "two plus three""',
                ),
            ).toBeDefined();
        });

        it('lists Pest ->with() single values by value', () => {
            givenTestFiles(
                [
                    {
                        testsuite: { name: 'default', path: 'tests' },
                        file: pestProject('tests/Unit/WithNumericTest.php'),
                        code: `<?php
it('validates emails', function (string $email) {
    expect($email)->not->toBeEmpty();
})->with(['alice@example.com', 'bob@example.com']);`,
                    },
                ],
                pestProject('phpunit.xml'),
            );

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const unitNs = ns.children.get('namespace:Unit (Tests\\Unit)') as TestItem;
            const cls = unitNs.children.get('Tests\\Unit\\WithNumericTest') as TestItem;
            const method = cls.children.get(
                'tests/Unit/WithNumericTest.php::it validates emails',
            ) as TestItem;
            expect(method).toBeDefined();
            expect(method.children.size).toBe(2);
            expect(
                method.children.get(
                    `tests/Unit/WithNumericTest.php::it validates emails with data set "('alice@example.com')"`,
                ),
            ).toBeDefined();
            expect(
                method.children.get(
                    `tests/Unit/WithNumericTest.php::it validates emails with data set "('bob@example.com')"`,
                ),
            ).toBeDefined();
        });

        it('lists Pest ->with() tuples by their values', () => {
            givenTestFiles(
                [
                    {
                        testsuite: { name: 'default', path: 'tests' },
                        file: pestProject('tests/Unit/WithTuplesTest.php'),
                        code: `<?php
it('multiplies numbers', function (int $a, int $b, int $expected) {
    expect($a * $b)->toBe($expected);
})->with([[2, 3, 6], [4, 5, 20]]);`,
                    },
                ],
                pestProject('phpunit.xml'),
            );

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const unitNs = ns.children.get('namespace:Unit (Tests\\Unit)') as TestItem;
            const cls = unitNs.children.get('Tests\\Unit\\WithTuplesTest') as TestItem;
            const method = cls.children.get(
                'tests/Unit/WithTuplesTest.php::it multiplies numbers',
            ) as TestItem;
            expect(method).toBeDefined();
            expect(method.children.size).toBe(2);
            expect(
                method.children.get(
                    'tests/Unit/WithTuplesTest.php::it multiplies numbers with data set "(2, 3, 6)"',
                ),
            ).toBeDefined();
            expect(
                method.children.get(
                    'tests/Unit/WithTuplesTest.php::it multiplies numbers with data set "(4, 5, 20)"',
                ),
            ).toBeDefined();
        });

        it('lists every combination of chained Pest ->with() data sets (#21)', () => {
            givenTestFiles(
                [
                    {
                        testsuite: { name: 'default', path: 'tests' },
                        file: pestProject('tests/Unit/WithCombinedTest.php'),
                        code: `<?php
it('business closed', function (string $business, string $day) {
    expect(true)->toBeTrue();
})->with(['Office', 'Bank'])->with(['Saturday', 'Sunday']);`,
                    },
                ],
                pestProject('phpunit.xml'),
            );

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const unitNs = ns.children.get('namespace:Unit (Tests\\Unit)') as TestItem;
            const cls = unitNs.children.get('Tests\\Unit\\WithCombinedTest') as TestItem;
            const method = cls.children.get(
                'tests/Unit/WithCombinedTest.php::it business closed',
            ) as TestItem;
            expect(method).toBeDefined();
            expect(method.children.size).toBe(4);
            expect(
                method.children.get(
                    `tests/Unit/WithCombinedTest.php::it business closed with data set "('Office') / ('Saturday')"`,
                ),
            ).toBeDefined();
            expect(
                method.children.get(
                    `tests/Unit/WithCombinedTest.php::it business closed with data set "('Office') / ('Sunday')"`,
                ),
            ).toBeDefined();
            expect(
                method.children.get(
                    `tests/Unit/WithCombinedTest.php::it business closed with data set "('Bank') / ('Saturday')"`,
                ),
            ).toBeDefined();
            expect(
                method.children.get(
                    `tests/Unit/WithCombinedTest.php::it business closed with data set "('Bank') / ('Sunday')"`,
                ),
            ).toBeDefined();
        });

        it('lists the data sets of every @dataProvider of a method (#13)', () => {
            givenTestFiles(
                [
                    {
                        testsuite: { name: 'default', path: 'tests' },
                        file: phpUnitProject('tests/MultiProviderTest.php'),
                        code: `<?php
namespace Tests;

use PHPUnit\\Framework\\TestCase;

class MultiProviderTest extends TestCase
{
    /**
     * @dataProvider providerA
     * @dataProvider providerB
     */
    public function test_add(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, $a + $b);
    }

    public static function providerA(): array
    {
        return ['one plus one' => [1, 1, 2]];
    }

    public static function providerB(): array
    {
        return [[2, 3, 5]];
    }
}`,
                    },
                ],
                phpUnitProject('phpunit.xml'),
            );

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const cls = ns.children.get('Multi Provider (Tests\\MultiProvider)') as TestItem;
            const method = cls.children.get(
                'Multi Provider (Tests\\MultiProvider)::Add',
            ) as TestItem;
            expect(method).toBeDefined();
            expect(method.children.size).toBe(2);

            expect(
                method.children.get(
                    'Multi Provider (Tests\\MultiProvider)::Add with data set "one plus one"',
                ),
            ).toBeDefined();
            expect(
                method.children.get('Multi Provider (Tests\\MultiProvider)::Add with data set #0'),
            ).toBeDefined();
        });

        it('lists the data sets of every #[DataProvider] attribute of a method (#13)', () => {
            givenTestFiles(
                [
                    {
                        testsuite: { name: 'default', path: 'tests' },
                        file: phpUnitProject('tests/MultiAttrProviderTest.php'),
                        code: `<?php
namespace Tests;

use PHPUnit\\Framework\\Attributes\\DataProvider;
use PHPUnit\\Framework\\TestCase;

class MultiAttrProviderTest extends TestCase
{
    #[DataProvider('providerA')]
    #[DataProvider('providerB')]
    public function test_add(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, $a + $b);
    }

    public static function providerA(): array
    {
        return ['one plus one' => [1, 1, 2]];
    }

    public static function providerB(): array
    {
        return [[2, 3, 5]];
    }
}`,
                    },
                ],
                phpUnitProject('phpunit.xml'),
            );

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const cls = ns.children.get(
                'Multi Attr Provider (Tests\\MultiAttrProvider)',
            ) as TestItem;
            const method = cls.children.get(
                'Multi Attr Provider (Tests\\MultiAttrProvider)::Add',
            ) as TestItem;
            expect(method).toBeDefined();
            expect(method.children.size).toBe(2);

            expect(
                method.children.get(
                    'Multi Attr Provider (Tests\\MultiAttrProvider)::Add with data set "one plus one"',
                ),
            ).toBeDefined();
            expect(
                method.children.get(
                    'Multi Attr Provider (Tests\\MultiAttrProvider)::Add with data set #0',
                ),
            ).toBeDefined();
        });

        it('lists the named and numeric keys of a @dataProvider that returns an array', () => {
            givenTestFiles(
                [
                    {
                        testsuite: { name: 'default', path: 'tests' },
                        file: phpUnitProject('tests/ReturnProviderTest.php'),
                        code: `<?php
namespace Tests;

use PHPUnit\\Framework\\TestCase;

class ReturnProviderTest extends TestCase
{
    /**
     * @dataProvider addProvider
     */
    public function test_add(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, $a + $b);
    }

    public static function addProvider(): array
    {
        return [
            'one plus one' => [1, 1, 2],
            [2, 3, 5],
        ];
    }
}`,
                    },
                ],
                phpUnitProject('phpunit.xml'),
            );

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const cls = ns.children.get('Return Provider (Tests\\ReturnProvider)') as TestItem;
            const method = cls.children.get(
                'Return Provider (Tests\\ReturnProvider)::Add',
            ) as TestItem;
            expect(method).toBeDefined();
            expect(method.children.size).toBe(2);

            const child0 = method.children.get(
                'Return Provider (Tests\\ReturnProvider)::Add with data set "one plus one"',
            );
            const child1 = method.children.get(
                'Return Provider (Tests\\ReturnProvider)::Add with data set #0',
            );
            expect(child0).toBeDefined();
            expect(child1).toBeDefined();
        });

        it('lists the keys of a @dataProvider that yields named data sets', () => {
            givenTestFiles(
                [
                    {
                        testsuite: { name: 'default', path: 'tests' },
                        file: phpUnitProject('tests/YieldProviderTest.php'),
                        code: `<?php
namespace Tests;

use Generator;
use PHPUnit\\Framework\\TestCase;

class YieldProviderTest extends TestCase
{
    /**
     * @dataProvider yieldProvider
     */
    public function test_yield(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, $a + $b);
    }

    public static function yieldProvider(): Generator
    {
        yield 'first' => [1, 0, 1];
        yield 'second' => [0, 1, 1];
    }
}`,
                    },
                ],
                phpUnitProject('phpunit.xml'),
            );

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const cls = ns.children.get('Yield Provider (Tests\\YieldProvider)') as TestItem;
            const method = cls.children.get(
                'Yield Provider (Tests\\YieldProvider)::Yield',
            ) as TestItem;
            expect(method).toBeDefined();
            expect(method.children.size).toBe(2);

            const child0 = method.children.get(
                'Yield Provider (Tests\\YieldProvider)::Yield with data set "first"',
            );
            const child1 = method.children.get(
                'Yield Provider (Tests\\YieldProvider)::Yield with data set "second"',
            );
            expect(child0).toBeDefined();
            expect(child1).toBeDefined();
        });

        it('lists a @dataProvider that yields without keys by index', () => {
            givenTestFiles(
                [
                    {
                        testsuite: { name: 'default', path: 'tests' },
                        file: phpUnitProject('tests/YieldNumericTest.php'),
                        code: `<?php
namespace Tests;

use Generator;
use PHPUnit\\Framework\\TestCase;

class YieldNumericTest extends TestCase
{
    /**
     * @dataProvider yieldProvider
     */
    public function test_yield(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, $a + $b);
    }

    public static function yieldProvider(): Generator
    {
        yield [0, 0, 0];
        yield [0, 1, 1];
    }
}`,
                    },
                ],
                phpUnitProject('phpunit.xml'),
            );

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const cls = ns.children.get('Yield Numeric (Tests\\YieldNumeric)') as TestItem;
            const method = cls.children.get(
                'Yield Numeric (Tests\\YieldNumeric)::Yield',
            ) as TestItem;
            expect(method).toBeDefined();
            expect(method.children.size).toBe(2);

            const child0 = method.children.get(
                'Yield Numeric (Tests\\YieldNumeric)::Yield with data set #0',
            );
            const child1 = method.children.get(
                'Yield Numeric (Tests\\YieldNumeric)::Yield with data set #1',
            );
            expect(child0).toBeDefined();
            expect(child1).toBeDefined();
        });

        it('lists the data sets returned by a #[DataProvider] method', () => {
            givenTestFiles(
                [
                    {
                        testsuite: { name: 'default', path: 'tests' },
                        file: phpUnitProject('tests/AttrProviderTest.php'),
                        code: `<?php
namespace Tests;

use PHPUnit\\Framework\\Attributes\\DataProvider;
use PHPUnit\\Framework\\TestCase;

class AttrProviderTest extends TestCase
{
    #[DataProvider('addProvider')]
    public function testAdd(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, $a + $b);
    }

    public static function addProvider(): array
    {
        return [
            'sum' => [1, 2, 3],
            [4, 5, 9],
        ];
    }
}`,
                    },
                ],
                phpUnitProject('phpunit.xml'),
            );

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const cls = ns.children.get('Attr Provider (Tests\\AttrProvider)') as TestItem;
            const method = cls.children.get('Attr Provider (Tests\\AttrProvider)::Add') as TestItem;
            expect(method).toBeDefined();
            expect(method.children.size).toBe(2);

            const child0 = method.children.get(
                'Attr Provider (Tests\\AttrProvider)::Add with data set "sum"',
            );
            const child1 = method.children.get(
                'Attr Provider (Tests\\AttrProvider)::Add with data set #0',
            );
            expect(child0).toBeDefined();
            expect(child1).toBeDefined();
        });

        it('lists the data sets of a provider built with array_map and range', () => {
            givenTestFiles(
                [
                    {
                        testsuite: { name: 'default', path: 'tests' },
                        file: phpUnitProject('tests/DynamicProviderTest.php'),
                        code: `<?php
namespace Tests;

use PHPUnit\\Framework\\TestCase;

class DynamicProviderTest extends TestCase
{
    /**
     * @dataProvider dynamicProvider
     */
    public function test_dynamic(int $v): void
    {
        $this->assertTrue($v > 0);
    }

    public static function dynamicProvider(): array
    {
        return array_map(fn($i) => [$i], range(1, 5));
    }
}`,
                    },
                ],
                phpUnitProject('phpunit.xml'),
            );

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const cls = ns.children.get('Dynamic Provider (Tests\\DynamicProvider)') as TestItem;
            const method = cls.children.get(
                'Dynamic Provider (Tests\\DynamicProvider)::Dynamic',
            ) as TestItem;
            expect(method).toBeDefined();
            expect(method.children.size).toBe(5);
        });

        it('gives a method without data attributes no data set children', () => {
            givenTestFiles(
                [
                    {
                        testsuite: { name: 'default', path: 'tests' },
                        file: phpUnitProject('tests/NoDatasetTest.php'),
                        code: `<?php
namespace Tests;

use PHPUnit\\Framework\\TestCase;

class NoDatasetTest extends TestCase
{
    public function test_plain(): void
    {
        $this->assertTrue(true);
    }
}`,
                    },
                ],
                phpUnitProject('phpunit.xml'),
            );

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const cls = ns.children.get('No Dataset (Tests\\NoDataset)') as TestItem;
            const method = cls.children.get('No Dataset (Tests\\NoDataset)::Plain') as TestItem;
            expect(method).toBeDefined();
            expect(method.children.size).toBe(0);
        });
    });

    describe('Pest modifiers', () => {
        it('->skip() shows the skipped icon in the label', () => {
            givenTestFiles(
                [
                    {
                        testsuite: { name: 'default', path: 'tests' },
                        file: pestProject('tests/Unit/SkipTest.php'),
                        code: `<?php
it('does something', function () {
    expect(true)->toBeTrue();
})->skip('not ready yet');`,
                    },
                ],
                pestProject('phpunit.xml'),
            );

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const unitNs = ns.children.get('namespace:Unit (Tests\\Unit)') as TestItem;
            const cls = unitNs.children.get('Tests\\Unit\\SkipTest') as TestItem;
            const method = cls.children.get(
                'tests/Unit/SkipTest.php::it does something',
            ) as TestItem;
            expect(method).toBeDefined();
            expect(method.label).toBe('$(circle-slash) it does something');
        });

        it('->todo() shows the todo icon in the label', () => {
            givenTestFiles(
                [
                    {
                        testsuite: { name: 'default', path: 'tests' },
                        file: pestProject('tests/Unit/TodoTest.php'),
                        code: `<?php
it('does something', function () {
    expect(true)->toBeTrue();
})->todo();`,
                    },
                ],
                pestProject('phpunit.xml'),
            );

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const unitNs = ns.children.get('namespace:Unit (Tests\\Unit)') as TestItem;
            const cls = unitNs.children.get('Tests\\Unit\\TodoTest') as TestItem;
            const method = cls.children.get(
                'tests/Unit/TodoTest.php::it does something',
            ) as TestItem;
            expect(method).toBeDefined();
            expect(method.label).toBe('$(issue-draft) it does something');
        });

        it('->todo(assignee:, issue:) shows the assignment as the item description', () => {
            givenTestFiles(
                [
                    {
                        testsuite: { name: 'default', path: 'tests' },
                        file: pestProject('tests/Unit/TodoAssignedTest.php'),
                        code: `<?php
it('does something', function () {
    expect(true)->toBeTrue();
})->todo(assignee: 'taylor@laravel.com', issue: 123);`,
                    },
                ],
                pestProject('phpunit.xml'),
            );

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const unitNs = ns.children.get('namespace:Unit (Tests\\Unit)') as TestItem;
            const cls = unitNs.children.get('Tests\\Unit\\TodoAssignedTest') as TestItem;
            const method = cls.children.get(
                'tests/Unit/TodoAssignedTest.php::it does something',
            ) as TestItem;
            expect(method).toBeDefined();
            expect(method.label).toBe('$(issue-draft) it does something');
            expect(method.description).toBe('assigned: taylor@laravel.com, issue #123');
        });

        it('->skipOnCi() shows the conditional-skip icon and description', () => {
            givenTestFiles(
                [
                    {
                        testsuite: { name: 'default', path: 'tests' },
                        file: pestProject('tests/Unit/SkipOnCiTest.php'),
                        code: `<?php
it('needs a real server', function () {
    expect(true)->toBeTrue();
})->skipOnCi();`,
                    },
                ],
                pestProject('phpunit.xml'),
            );

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const unitNs = ns.children.get('namespace:Unit (Tests\\Unit)') as TestItem;
            const cls = unitNs.children.get('Tests\\Unit\\SkipOnCiTest') as TestItem;
            const method = cls.children.get(
                'tests/Unit/SkipOnCiTest.php::it needs a real server',
            ) as TestItem;
            expect(method).toBeDefined();
            expect(method.label).toBe('$(question) it needs a real server');
            expect(method.description).toBe('skips on CI');
        });

        it('->skipLocally() shows the conditional-skip icon and description', () => {
            givenTestFiles(
                [
                    {
                        testsuite: { name: 'default', path: 'tests' },
                        file: pestProject('tests/Unit/SkipLocallyTest.php'),
                        code: `<?php
it('needs local docker', function () {
    expect(true)->toBeTrue();
})->skipLocally();`,
                    },
                ],
                pestProject('phpunit.xml'),
            );

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const unitNs = ns.children.get('namespace:Unit (Tests\\Unit)') as TestItem;
            const cls = unitNs.children.get('Tests\\Unit\\SkipLocallyTest') as TestItem;
            const method = cls.children.get(
                'tests/Unit/SkipLocallyTest.php::it needs local docker',
            ) as TestItem;
            expect(method).toBeDefined();
            expect(method.label).toBe('$(question) it needs local docker');
            expect(method.description).toBe('skips locally');
        });

        it('does not show a conditional-skip description when ->skip() already applies', () => {
            givenTestFiles(
                [
                    {
                        testsuite: { name: 'default', path: 'tests' },
                        file: pestProject('tests/Unit/SkipAndSkipOnCiTest.php'),
                        code: `<?php
it('needs a real server', function () {
    expect(true)->toBeTrue();
})->skip()->skipOnCi();`,
                    },
                ],
                pestProject('phpunit.xml'),
            );

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const unitNs = ns.children.get('namespace:Unit (Tests\\Unit)') as TestItem;
            const cls = unitNs.children.get('Tests\\Unit\\SkipAndSkipOnCiTest') as TestItem;
            const method = cls.children.get(
                'tests/Unit/SkipAndSkipOnCiTest.php::it needs a real server',
            ) as TestItem;
            expect(method).toBeDefined();
            expect(method.label).toBe('$(circle-slash) it needs a real server');
            expect(method.description).toBeUndefined();
        });

        it('->only() shows the only icon in the label', () => {
            givenTestFiles(
                [
                    {
                        testsuite: { name: 'default', path: 'tests' },
                        file: pestProject('tests/Unit/OnlyTest.php'),
                        code: `<?php
it('does something', function () {
    expect(true)->toBeTrue();
})->only();`,
                    },
                ],
                pestProject('phpunit.xml'),
            );

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const unitNs = ns.children.get('namespace:Unit (Tests\\Unit)') as TestItem;
            const cls = unitNs.children.get('Tests\\Unit\\OnlyTest') as TestItem;
            const method = cls.children.get(
                'tests/Unit/OnlyTest.php::it does something',
            ) as TestItem;
            expect(method).toBeDefined();
            expect(method.label).toBe('$(target) it does something');
        });

        it('a browser test (visit()) shows the browser icon in the label', () => {
            givenTestFiles(
                [
                    {
                        testsuite: { name: 'default', path: 'tests' },
                        file: pestProject('tests/Unit/BrowserTest.php'),
                        code: `<?php
it('may welcome the user', function () {
    $page = visit('/');
    $page->assertSee('Welcome');
});`,
                    },
                ],
                pestProject('phpunit.xml'),
            );

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const unitNs = ns.children.get('namespace:Unit (Tests\\Unit)') as TestItem;
            const cls = unitNs.children.get('Tests\\Unit\\BrowserTest') as TestItem;
            const method = cls.children.get(
                'tests/Unit/BrowserTest.php::it may welcome the user',
            ) as TestItem;
            expect(method).toBeDefined();
            expect(method.label).toBe('$(globe) it may welcome the user');
        });
    });
});
