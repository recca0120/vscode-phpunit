import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
    ChainAstParser,
    PHPUnitXML,
    PhpParserAstParser,
    TeamcityEvent,
    TestIndex,
    TestParser,
    type TestStarted,
    TestType,
    TreeSitterAstParser,
} from '@vscode-phpunit/phpunit';
import { generateXML, pestProject, phpUnitProject } from '@vscode-phpunit/phpunit/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RelativePattern, type TestController, type TestItem, tests, Uri, workspace } from 'vscode';
import { URI } from 'vscode-uri';
import { icon, TestHierarchyBuilder } from './TestHierarchyBuilder';
import { TestTree } from './TestTree';

type CODE = {
    testsuite: { name: string; path: string };
    file: string;
    code: string;
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

describe('TestCollection', () => {
    const root = phpUnitProject('');
    const workspaceFolder = { index: 0, name: 'phpunit', uri: Uri.file(root) };
    let ctrl: TestController;

    const toTree = (items: import('vscode').TestItemCollection) => {
        const results: { id: string; label: string; children: ReturnType<typeof toTree> }[] = [];
        for (const [, item] of items) {
            results.push({ id: item.id, label: item.label, children: toTree(item.children) });
        }

        return results;
    };

    const collectIds = (items: import('vscode').TestItemCollection) => {
        const ids: string[] = [];
        for (const [, item] of items) {
            ids.push(item.id);
        }
        return ids;
    };

    const collectTestItemFiles = (items: import('vscode').TestItemCollection): string[] => {
        const files: string[] = [];
        items.forEach((item: import('vscode').TestItem) => {
            if (item.uri) {
                files.push(item.uri.fsPath);
            }
            files.push(...collectTestItemFiles(item.children));
        });
        return [...new Set(files)];
    };

    const givenTestCollection = (
        text: string,
        configurationFile = phpUnitProject('phpunit.xml'),
    ) => {
        const phpUnitXML = new PHPUnitXML();
        phpUnitXML.load(generateXML(text), configurationFile);

        const astParser = new ChainAstParser([new TreeSitterAstParser(), new PhpParserAstParser()]);
        const testParser = new TestParser(phpUnitXML, astParser);

        return new TestTree(ctrl, phpUnitXML, new TestIndex(phpUnitXML, testParser));
    };

    const givenCodes = (codes: CODE[], configurationFile: string) => {
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
        vi.clearAllMocks();
    });

    describe('tree structure', () => {
        describe('single testsuite', () => {
            it('no namespace', () => {
                givenCodes(
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

            it('with namespace', () => {
                givenCodes(
                    [
                        {
                            testsuite: { name: 'default', path: 'tests' },
                            file: phpUnitProject('tests/AssertionsTest.php'),
                            code: givenPhp('namespace Tests', 'AssertionsTest', ['test_passed']),
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

            it('sibling classes share namespace', () => {
                givenCodes(
                    [
                        {
                            testsuite: { name: 'default', path: 'tests' },
                            file: phpUnitProject('tests/AssertionsTest.php'),
                            code: givenPhp('namespace Tests', 'AssertionsTest', ['test_passed']),
                        },
                        {
                            testsuite: { name: 'default', path: 'tests' },
                            file: phpUnitProject('tests/AttributeTest.php'),
                            code: givenPhp('namespace Tests', 'AttributeTest', ['test_hi']),
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

            it('re-parse replaces children, not accumulates', async () => {
                const collection = givenTestCollection(`
                    <testsuites>
                        <testsuite name="default">
                            <directory>tests</directory>
                        </testsuite>
                    </testsuites>`);

                await collection.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));
                await collection.change(URI.file(phpUnitProject('tests/AssertionsTest.php')));

                const ns = ctrl.items.get('namespace:Tests') as TestItem;
                expect(ns).toBeDefined();
                const classIds = collectIds(ns.children).filter((id) =>
                    id.startsWith('Assertions'),
                );
                expect(classIds).toEqual(['Assertions (Tests\\Assertions)']);
            });

            it('with folder root (multi-workspace)', async () => {
                const collection = givenTestCollection(`
                    <testsuites>
                        <testsuite name="default">
                            <directory>tests</directory>
                        </testsuite>
                    </testsuites>`);

                const folderItem = collection.createFolderRoot(workspaceFolder);
                ctrl.items.add(folderItem);

                await collection.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

                expect(toTree(ctrl.items)).toEqual([
                    {
                        id: `folder:${workspaceFolder.uri.toString()}`,
                        label: `${icon(TestType.workspace)} ${workspaceFolder.name}`,
                        children: [
                            expect.objectContaining({
                                id: 'namespace:Tests',
                                children: [
                                    expect.objectContaining({
                                        id: 'Assertions (Tests\\Assertions)',
                                    }),
                                ],
                            }),
                        ],
                    },
                ]);
            });
        });

        describe('multi-testsuite', () => {
            it('groups by testsuite with namespace prefix stripped', () => {
                givenCodes(
                    [
                        {
                            testsuite: { name: 'Unit', path: 'tests/Unit' },
                            file: phpUnitProject('tests/Unit/ExampleTest.php'),
                            code: givenPhp('namespace Tests\\Unit', 'ExampleTest', ['test_unit']),
                        },
                        {
                            testsuite: { name: 'Feature', path: 'tests/Feature' },
                            file: phpUnitProject('tests/Feature/ExampleTest.php'),
                            code: givenPhp('namespace Tests\\Feature', 'ExampleTest', [
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

            it('deep namespace — only remaining parts shown after prefix stripping', () => {
                givenCodes(
                    [
                        {
                            testsuite: { name: 'Unit', path: 'tests/Unit' },
                            file: phpUnitProject('tests/Unit/SubFolder/ExampleTest.php'),
                            code: givenPhp('namespace Tests\\Unit\\SubFolder', 'ExampleTest', [
                                'test_unit',
                            ]),
                        },
                        {
                            testsuite: { name: 'Feature', path: 'tests/Feature' },
                            file: phpUnitProject('tests/Feature/SubFolder/ExampleTest.php'),
                            code: givenPhp('namespace Tests\\Feature\\SubFolder', 'ExampleTest', [
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

            it('scrambled add order preserves testsuite order and namespace stripping', async () => {
                const collection = givenTestCollection(`
                    <testsuites>
                        <testsuite name="Unit">
                            <directory>tests/Unit</directory>
                        </testsuite>
                        <testsuite name="Feature">
                            <directory>tests/Feature</directory>
                        </testsuite>
                    </testsuites>`);

                await collection.add(
                    URI.file(phpUnitProject('tests/Feature/SubFolder/ExampleTest.php')),
                );
                await collection.add(URI.file(phpUnitProject('tests/Unit/ExampleTest.php')));
                await collection.add(URI.file(phpUnitProject('tests/Feature/ExampleTest.php')));
                await collection.add(
                    URI.file(phpUnitProject('tests/Unit/SubFolder/ExampleTest.php')),
                );

                expect(collectIds(ctrl.items)).toEqual(['testsuite:Feature', 'testsuite:Unit']);

                const unitSuite = ctrl.items.get('testsuite:Unit') as TestItem;
                expect(unitSuite.children.get('namespace:Tests')).toBeUndefined();

                const featureSuite = ctrl.items.get('testsuite:Feature') as TestItem;
                expect(featureSuite.children.get('namespace:Tests')).toBeUndefined();
            });

            it('change updates tree without corrupting other testsuite', async () => {
                const collection = givenTestCollection(`
                    <testsuites>
                        <testsuite name="Unit">
                            <directory>tests/Unit</directory>
                        </testsuite>
                        <testsuite name="Feature">
                            <directory>tests/Feature</directory>
                        </testsuite>
                    </testsuites>`);

                await collection.add(URI.file(phpUnitProject('tests/Feature/ExampleTest.php')));
                await collection.add(URI.file(phpUnitProject('tests/Unit/ExampleTest.php')));

                await collection.change(URI.file(phpUnitProject('tests/Unit/ExampleTest.php')));

                expect(collectIds(ctrl.items)).toEqual(['testsuite:Feature', 'testsuite:Unit']);

                const featureSuite = ctrl.items.get('testsuite:Feature') as TestItem;
                expect(
                    featureSuite.children.get('Example (Tests\\Feature\\Example)'),
                ).toBeDefined();
            });

            it('delete cleans up empty parents', async () => {
                const collection = givenTestCollection(`
                    <testsuites>
                        <testsuite name="Unit">
                            <directory>tests/Unit</directory>
                        </testsuite>
                        <testsuite name="Feature">
                            <directory>tests/Feature</directory>
                        </testsuite>
                    </testsuites>`);

                await collection.add(URI.file(phpUnitProject('tests/Feature/ExampleTest.php')));
                await collection.add(URI.file(phpUnitProject('tests/Unit/ExampleTest.php')));

                await collection.delete(URI.file(phpUnitProject('tests/Unit/ExampleTest.php')));
                expect(collectIds(ctrl.items)).toEqual(['testsuite:Feature']);

                expect(
                    ctrl.items
                        .get('testsuite:Feature')
                        ?.children.get('Example (Tests\\Feature\\Example)'),
                ).toBeDefined();
            });

            it('full lifecycle: scrambled add → change → delete', async () => {
                const collection = givenTestCollection(`
                    <testsuites>
                        <testsuite name="Unit">
                            <directory>tests/Unit</directory>
                        </testsuite>
                        <testsuite name="Feature">
                            <directory>tests/Feature</directory>
                        </testsuite>
                    </testsuites>`);

                const unitExample = URI.file(phpUnitProject('tests/Unit/ExampleTest.php'));
                const unitSubFolder = URI.file(
                    phpUnitProject('tests/Unit/SubFolder/ExampleTest.php'),
                );
                const featureExample = URI.file(phpUnitProject('tests/Feature/ExampleTest.php'));
                const featureSubFolder = URI.file(
                    phpUnitProject('tests/Feature/SubFolder/ExampleTest.php'),
                );

                await collection.add(featureSubFolder);
                await collection.add(unitExample);
                await collection.add(featureExample);
                await collection.add(unitSubFolder);

                expect(collectIds(ctrl.items)).toEqual(['testsuite:Feature', 'testsuite:Unit']);
                expect(
                    ctrl.items.get('testsuite:Unit')?.children.get('namespace:Tests'),
                ).toBeUndefined();
                expect(
                    ctrl.items.get('testsuite:Feature')?.children.get('namespace:Tests'),
                ).toBeUndefined();

                await collection.change(unitExample);
                expect(collectIds(ctrl.items)).toEqual(['testsuite:Feature', 'testsuite:Unit']);
                expect(ctrl.items.get('testsuite:Feature')?.children.size).toBe(2);

                await collection.delete(featureExample);
                expect(collectIds(ctrl.items)).toEqual(['testsuite:Feature', 'testsuite:Unit']);

                await collection.delete(featureSubFolder);
                expect(collectIds(ctrl.items)).toEqual(['testsuite:Unit']);
            });
        });

        it('delete folder removes all tests under that folder', async () => {
            const collection = givenTestCollection(`
                <testsuites>
                    <testsuite name="Unit">
                        <directory>tests/Unit</directory>
                    </testsuite>
                    <testsuite name="Feature">
                        <directory>tests/Feature</directory>
                    </testsuite>
                </testsuites>`);

            await collection.add(URI.file(phpUnitProject('tests/Unit/ExampleTest.php')));
            await collection.add(URI.file(phpUnitProject('tests/Unit/SubFolder/ExampleTest.php')));
            await collection.add(URI.file(phpUnitProject('tests/Feature/ExampleTest.php')));

            expect(collectIds(ctrl.items)).toEqual(['testsuite:Feature', 'testsuite:Unit']);

            await collection.delete(URI.file(phpUnitProject('tests/Unit')));

            expect(collectIds(ctrl.items)).toEqual(['testsuite:Feature']);
        });

        it('file outside all testsuite directories should not appear in tree', async () => {
            const collection = givenTestCollection(`
                <testsuites>
                    <testsuite name="Unit">
                        <directory>tests/Unit</directory>
                    </testsuite>
                    <testsuite name="Feature">
                        <directory>tests/Feature</directory>
                    </testsuite>
                </testsuites>`);

            await collection.add(URI.file(phpUnitProject('tests/Unit/ExampleTest.php')));
            await collection.add(URI.file(phpUnitProject('tests/Feature/ExampleTest.php')));
            await collection.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

            expect(collectIds(ctrl.items)).toEqual(['testsuite:Feature', 'testsuite:Unit']);
            expect(ctrl.items.get('namespace:Tests')).toBeUndefined();
        });

        it('directory and namespace mismatch — full namespace preserved', () => {
            givenCodes(
                [
                    {
                        testsuite: { name: 'Unit', path: 'src/tests' },
                        file: phpUnitProject('src/tests/FooTest.php'),
                        code: givenPhp('namespace App\\Tests', 'FooTest', ['test_foo']),
                    },
                    {
                        testsuite: { name: 'Feature', path: 'integration' },
                        file: phpUnitProject('integration/BarTest.php'),
                        code: givenPhp('namespace Tests\\Feature', 'BarTest', ['test_bar']),
                    },
                ],
                phpUnitProject('phpunit.xml'),
            );

            const unitSuite = ctrl.items.get('testsuite:Unit') as TestItem;
            expect(unitSuite.children.get('namespace:App')).toBeDefined();

            const featureSuite = ctrl.items.get('testsuite:Feature') as TestItem;
            expect(featureSuite.children.get('namespace:Tests')).toBeDefined();
        });

        it('testsuite with multiple directories strips prefix per directory', () => {
            givenCodes(
                [
                    {
                        testsuite: { name: 'Unit', path: 'tests/Unit' },
                        file: phpUnitProject('tests/Unit/UserTest.php'),
                        code: givenPhp('namespace Tests\\Unit', 'UserTest', ['test_user']),
                    },
                    {
                        testsuite: { name: 'Unit', path: 'tests/Unit2' },
                        file: phpUnitProject('tests/Unit2/OrderTest.php'),
                        code: givenPhp('namespace Tests\\Unit2', 'OrderTest', ['test_order']),
                    },
                    {
                        testsuite: { name: 'Feature', path: 'tests/Feature' },
                        file: phpUnitProject('tests/Feature/LoginTest.php'),
                        code: givenPhp('namespace Tests\\Feature', 'LoginTest', ['test_login']),
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

        it('deep directory path matches namespace case-insensitively', () => {
            givenCodes(
                [
                    {
                        testsuite: { name: 'Unit', path: 'tests/unit/models' },
                        file: phpUnitProject('tests/unit/models/UserTest.php'),
                        code: givenPhp('namespace Tests\\Unit\\Models', 'UserTest', [
                            'test_create_user',
                        ]),
                    },
                    {
                        testsuite: { name: 'Feature', path: 'tests/feature' },
                        file: phpUnitProject('tests/feature/LoginTest.php'),
                        code: givenPhp('namespace Tests\\Feature', 'LoginTest', ['test_login']),
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

        it('directory segments not fully matched — no stripping', () => {
            givenCodes(
                [
                    {
                        testsuite: { name: 'Unit', path: 'tests/abc/def' },
                        file: phpUnitProject('tests/abc/def/FooTest.php'),
                        code: givenPhp('namespace Tests\\Def', 'FooTest', ['test_foo']),
                    },
                    {
                        testsuite: { name: 'Feature', path: 'integration/sub' },
                        file: phpUnitProject('integration/sub/BarTest.php'),
                        code: givenPhp('namespace App\\Feature', 'BarTest', ['test_bar']),
                    },
                ],
                phpUnitProject('phpunit.xml'),
            );

            const unitSuite = ctrl.items.get('testsuite:Unit') as TestItem;
            expect(unitSuite.children.get('namespace:Tests')).toBeDefined();

            const featureSuite = ctrl.items.get('testsuite:Feature') as TestItem;
            expect(featureSuite.children.get('namespace:App')).toBeDefined();
        });

        it('testsuite name not in namespace — full namespace preserved (synthetic)', () => {
            givenCodes(
                [
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

        describe('PEST', () => {
            it('nested describe with mixed test/describe (synthetic)', () => {
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
                givenCodes(
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

    describe('static dataset children', () => {
        it('#[TestWith] numeric', () => {
            givenCodes(
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

        it('#[TestWith] with named datasets', () => {
            givenCodes(
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

        it('#[TestWithJson] numeric', () => {
            givenCodes(
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

        it('Pest ->with() named keys', () => {
            givenCodes(
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

        it('Pest ->skip() shows a distinct skipped icon in the label', () => {
            givenCodes(
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

        it('Pest ->todo() shows a distinct todo icon in the label', () => {
            givenCodes(
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

        it('Pest ->todo(assignee:, issue:) shows the assignment info as item description', () => {
            givenCodes(
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

        it('Pest ->skipOnCi() shows a distinct conditional-skip icon and description', () => {
            givenCodes(
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

        it('Pest ->skipLocally() shows a distinct conditional-skip icon and description', () => {
            givenCodes(
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
            givenCodes(
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

        it('Pest ->only() shows a distinct only icon in the label', () => {
            givenCodes(
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

        it('Pest browser test (visit()) shows a distinct browser icon in the label', () => {
            givenCodes(
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

        it('Pest ->with() numeric', () => {
            givenCodes(
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

        it('Pest ->with() tuples', () => {
            givenCodes(
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

        it('Pest ->with()->with() cartesian product (#21)', () => {
            givenCodes(
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

        it('PHPUnit multiple @dataProvider (#13)', () => {
            givenCodes(
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

        it('PHPUnit multiple #[DataProvider] attributes (#13)', () => {
            givenCodes(
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

        it('@dataProvider with return array (named + numeric keys)', () => {
            givenCodes(
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

        it('@dataProvider with yield (named keys)', () => {
            givenCodes(
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

        it('@dataProvider with yield (no keys)', () => {
            givenCodes(
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

        it('#[DataProvider] attribute resolves provider body', () => {
            givenCodes(
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

        it('array_map with range provider resolves dataset children', () => {
            givenCodes(
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

        it('no dataset when no TestWith/TestWithJson attributes', () => {
            givenCodes(
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

    describe('resolveDatasetChild', () => {
        const makeTestStarted = (id: string, name: string): TestStarted =>
            ({
                event: TeamcityEvent.testStarted,
                name,
                id,
                flowId: 1,
            }) as unknown as TestStarted;

        it('creates dataset child with correct TestDefinition in index', async () => {
            const collection = givenTestCollection(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);

            await collection.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const classItem = ns.children.get('Assertions (Tests\\Assertions)') as TestItem;
            const methodItem = classItem.children.get(
                'Assertions (Tests\\Assertions)::Addition provider',
            ) as TestItem;
            expect(methodItem).toBeDefined();

            const childItem = collection.resolveDatasetChild(
                makeTestStarted(methodItem.id, 'addition_provider with data set #0'),
            );
            expect(childItem).toBeDefined();

            expect(methodItem.children.get(childItem?.id ?? '')).toBe(childItem);

            const storedDef = collection.getTestDefinition(childItem as TestItem);
            expect(storedDef).toBeDefined();
            expect(storedDef?.type).toBe(TestType.dataset);

            expect(childItem?.id).toContain('with data set #0');
        });

        it('skips on repeated calls when child already exists', async () => {
            const collection = givenTestCollection(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);

            await collection.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const classItem = ns.children.get('Assertions (Tests\\Assertions)') as TestItem;
            const methodItem = classItem.children.get(
                'Assertions (Tests\\Assertions)::Addition provider',
            ) as TestItem;

            const result = makeTestStarted(methodItem.id, 'addition_provider with data set #0');
            const child1 = collection.resolveDatasetChild(result);
            expect(child1).toBeDefined();

            const child2 = collection.resolveDatasetChild(result);
            expect(child2).toBeUndefined();

            expect(methodItem.children.get(child1?.id ?? '')).toBe(child1);
        });
    });

    describe('parent class outside the testsuite directories', () => {
        const writeProject = async (baseMethods: string[]) => {
            const root = await mkdtemp(join(tmpdir(), 'vscode-phpunit-'));
            await mkdir(join(root, 'tests/Support'), { recursive: true });
            await mkdir(join(root, 'tests/Unit'), { recursive: true });
            await writeFile(
                join(root, 'composer.json'),
                JSON.stringify({ 'autoload-dev': { 'psr-4': { 'Tests\\': 'tests/' } } }),
            );
            const writeBase = (methods: string[]) =>
                writeFile(
                    join(root, 'tests/Support/BaseCase.php'),
                    `<?php

namespace Tests\\Support;

use PHPUnit\\Framework\\TestCase;

abstract class BaseCase extends TestCase
{
${methods.map((name) => `    public function ${name}() {}`).join('\n')}
}
`,
                );
            await writeBase(baseMethods);
            await writeFile(
                join(root, 'tests/Unit/ChildTest.php'),
                `<?php

namespace Tests\\Unit;

use Tests\\Support\\BaseCase;

class ChildTest extends BaseCase
{
}
`,
            );
            return { root, writeBase };
        };

        it('updates the subclass tests when the parent class changes', async () => {
            const { root, writeBase } = await writeProject(['test_a']);
            const collection = givenTestCollection(
                `<testsuites>
                    <testsuite name="Unit">
                        <directory suffix="Test.php">tests/Unit</directory>
                    </testsuite>
                </testsuites>`,
                join(root, 'phpunit.xml'),
            );
            await collection.add(URI.file(join(root, 'tests/Unit/ChildTest.php')));

            await writeBase(['test_a', 'test_b']);
            await collection.change(URI.file(join(root, 'tests/Support/BaseCase.php')));

            const allIds = (items: import('vscode').TestItemCollection): string[] =>
                [...items].flatMap(([id, item]) => [id, ...allIds(item.children)]);
            expect(
                allIds(ctrl.items)
                    .filter((id) => id.startsWith('Child (Tests\\Unit\\Child)::'))
                    .sort(),
            ).toEqual(['Child (Tests\\Unit\\Child)::A', 'Child (Tests\\Unit\\Child)::B']);
            await rm(root, { recursive: true, force: true });
        });
    });

    describe('ancestors indexed after the class', () => {
        const indexInOrder = async (files: Record<string, string>, order: string[]) => {
            const root = await mkdtemp(join(tmpdir(), 'vscode-phpunit-'));
            await mkdir(join(root, 'tests'), { recursive: true });
            for (const [file, code] of Object.entries(files)) {
                await writeFile(join(root, 'tests', file), code);
            }
            const collection = givenTestCollection(
                `<testsuites>
                    <testsuite name="Unit">
                        <directory suffix="Test.php">tests</directory>
                    </testsuite>
                </testsuites>`,
                join(root, 'phpunit.xml'),
            );
            for (const file of order) {
                await collection.add(URI.file(join(root, 'tests', file)));
            }
            await rm(root, { recursive: true, force: true });

            const allIds = (items: import('vscode').TestItemCollection): string[] =>
                [...items].flatMap(([id, item]) => [id, ...allIds(item.children)]);
            return allIds(ctrl.items)
                .filter((id) => id.startsWith('Foo (Tests\\Foo)::'))
                .sort();
        };

        it('includes test methods of a grandparent class indexed last', async () => {
            const ids = await indexInOrder(
                {
                    'FooTest.php': `<?php
namespace Tests;
class FooTest extends Middle
{
    public function test_own() {}
}
`,
                    'Middle.php': `<?php
namespace Tests;
abstract class Middle extends Top
{
    public function test_middle() {}
}
`,
                    'Top.php': `<?php
namespace Tests;
abstract class Top extends \\PHPUnit\\Framework\\TestCase
{
    public function test_top() {}
}
`,
                },
                ['FooTest.php', 'Middle.php', 'Top.php'],
            );

            expect(ids).toEqual([
                'Foo (Tests\\Foo)::Middle',
                'Foo (Tests\\Foo)::Own',
                'Foo (Tests\\Foo)::Top',
            ]);
        });

        it('includes test methods of a nested trait indexed last', async () => {
            const ids = await indexInOrder(
                {
                    'FooTest.php': `<?php
namespace Tests;
class FooTest extends \\PHPUnit\\Framework\\TestCase
{
    use Outer;

    public function test_own() {}
}
`,
                    'Outer.php': `<?php
namespace Tests;
trait Outer
{
    use Inner;

    public function test_outer() {}
}
`,
                    'Inner.php': `<?php
namespace Tests;
trait Inner
{
    public function test_inner() {}
}
`,
                },
                ['FooTest.php', 'Outer.php', 'Inner.php'],
            );

            expect(ids).toEqual([
                'Foo (Tests\\Foo)::Inner',
                'Foo (Tests\\Foo)::Outer',
                'Foo (Tests\\Foo)::Own',
            ]);
        });
    });

    describe('ancestors renamed or removed', () => {
        const writeProject = async (files: Record<string, string>) => {
            const root = await mkdtemp(join(tmpdir(), 'vscode-phpunit-'));
            await mkdir(join(root, 'tests'), { recursive: true });
            for (const [file, code] of Object.entries(files)) {
                await writeFile(join(root, 'tests', file), code);
            }
            const collection = givenTestCollection(
                `<testsuites>
                    <testsuite name="Unit">
                        <directory suffix="Test.php">tests</directory>
                    </testsuite>
                </testsuites>`,
                join(root, 'phpunit.xml'),
            );
            const uriOf = (file: string) => URI.file(join(root, 'tests', file));
            return { root, collection, uriOf };
        };

        const fooIds = () => {
            const allIds = (items: import('vscode').TestItemCollection): string[] =>
                [...items].flatMap(([id, item]) => [id, ...allIds(item.children)]);
            return allIds(ctrl.items)
                .filter((id) => id.startsWith('Foo (Tests\\Foo)::'))
                .sort();
        };

        it('drops the methods of a trait that was renamed', async () => {
            const { root, collection, uriOf } = await writeProject({
                'FooTest.php': `<?php
namespace Tests;
class FooTest extends \\PHPUnit\\Framework\\TestCase
{
    use Shared;

    public function test_own() {}
}
`,
                'Shared.php': `<?php
namespace Tests;
trait Shared
{
    public function test_shared() {}
}
`,
            });
            await collection.add(uriOf('FooTest.php'));
            await collection.add(uriOf('Shared.php'));

            await writeFile(
                join(root, 'tests/Shared.php'),
                `<?php
namespace Tests;
trait Renamed
{
    public function test_shared() {}
}
`,
            );
            await collection.change(uriOf('Shared.php'));

            expect(fooIds()).toEqual(['Foo (Tests\\Foo)::Own']);
            await rm(root, { recursive: true, force: true });
        });

        it('drops the methods of a parent class whose file was deleted', async () => {
            const { root, collection, uriOf } = await writeProject({
                'FooTest.php': `<?php
namespace Tests;
class FooTest extends Base
{
    public function test_own() {}
}
`,
                'Base.php': `<?php
namespace Tests;
abstract class Base extends \\PHPUnit\\Framework\\TestCase
{
    public function test_base() {}
}
`,
            });
            await collection.add(uriOf('FooTest.php'));
            await collection.add(uriOf('Base.php'));

            await rm(join(root, 'tests/Base.php'));
            await collection.delete(uriOf('Base.php'));

            expect(fooIds()).toEqual(['Foo (Tests\\Foo)::Own']);
            await rm(root, { recursive: true, force: true });
        });

        it('drops a class once its parent stops extending TestCase', async () => {
            const { root, collection, uriOf } = await writeProject({
                'FooTest.php': `<?php
namespace Tests;
class FooTest extends Base
{
    public function test_own() {}
}
`,
                'Base.php': `<?php
namespace Tests;
abstract class Base extends \\PHPUnit\\Framework\\TestCase
{
    public function test_base() {}
}
`,
            });
            await collection.add(uriOf('Base.php'));
            await collection.add(uriOf('FooTest.php'));

            await writeFile(
                join(root, 'tests/Base.php'),
                `<?php
namespace Tests;
abstract class Base
{
    public function test_base() {}
}
`,
            );
            await collection.change(uriOf('Base.php'));

            expect(fooIds()).toEqual([]);
            await rm(root, { recursive: true, force: true });
        });
    });

    describe('classes known not to extend TestCase', () => {
        it('ignores classes whose resolved hierarchy does not reach TestCase', async () => {
            const root = await mkdtemp(join(tmpdir(), 'vscode-phpunit-'));
            await mkdir(join(root, 'tests/Unit'), { recursive: true });
            await writeFile(
                join(root, 'tests/Unit/PlainHelperTest.php'),
                `<?php

namespace Tests\\Unit;

class PlainHelperTest
{
    public function test_helper() {}
}
`,
            );
            await writeFile(
                join(root, 'tests/Unit/PlainBase.php'),
                `<?php

namespace Tests\\Unit;

class PlainBase
{
    public function test_base() {}
}
`,
            );
            await writeFile(
                join(root, 'tests/Unit/ExtendsPlainBaseTest.php'),
                `<?php

namespace Tests\\Unit;

class ExtendsPlainBaseTest extends PlainBase
{
    public function test_own() {}
}
`,
            );
            const collection = givenTestCollection(
                `<testsuites>
                    <testsuite name="Unit">
                        <directory suffix="Test.php">tests/Unit</directory>
                    </testsuite>
                </testsuites>`,
                join(root, 'phpunit.xml'),
            );
            await collection.add(URI.file(join(root, 'tests/Unit/PlainBase.php')));
            await collection.add(URI.file(join(root, 'tests/Unit/PlainHelperTest.php')));
            await collection.add(URI.file(join(root, 'tests/Unit/ExtendsPlainBaseTest.php')));

            const allIds = (items: import('vscode').TestItemCollection): string[] =>
                [...items].flatMap(([id, item]) => [id, ...allIds(item.children)]);
            expect(allIds(ctrl.items).filter((id) => id.includes('Plain'))).toEqual([]);
            await rm(root, { recursive: true, force: true });
        });
    });

    describe('index operations', () => {
        it('find groups and tests by group', async () => {
            const collection = givenTestCollection(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);

            await collection.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));
            await collection.add(URI.file(phpUnitProject('tests/AttributeTest.php')));

            expect(collection.findGroups()).toEqual(['integration']);
            expect(collection.findTestsByGroup('integration')).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: 'Assertions (Tests\\Assertions)::Passed',
                    }),
                    expect.objectContaining({
                        id: 'Attribute (Tests\\Attribute)::Hi',
                    }),
                ]),
            );
        });

        it('findTestsByRequest should return matching items by id lookup', async () => {
            const collection = givenTestCollection(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);

            await collection.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

            const testItem = {
                id: 'Assertions (Tests\\Assertions)::Passed',
            } as import('vscode').TestItem;
            const request = { include: [testItem] } as unknown as import('vscode').TestRunRequest;
            const result = collection.findTestsByRequest(request);

            expect(result).toHaveLength(1);
            expect(result?.[0].id).toBe('Assertions (Tests\\Assertions)::Passed');
        });

        it('findTestsByRequest should return undefined for no match', async () => {
            const collection = givenTestCollection(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);

            await collection.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

            const request = {
                include: [{ id: 'nonexistent' } as import('vscode').TestItem],
            } as unknown as import('vscode').TestRunRequest;
            expect(collection.findTestsByRequest(request)).toBeUndefined();
        });

        it('findTestsByRequest should return undefined when no request', () => {
            const collection = givenTestCollection(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);

            expect(collection.findTestsByRequest(undefined)).toBeUndefined();
            expect(
                collection.findTestsByRequest({
                    include: undefined,
                } as unknown as import('vscode').TestRunRequest),
            ).toBeUndefined();
        });

        it('group index should update when tests are re-parsed', async () => {
            const collection = givenTestCollection(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);

            await collection.add(URI.file(phpUnitProject('tests/AttributeTest.php')));
            expect(collection.findGroups()).toEqual(['integration']);

            await collection.add(URI.file(phpUnitProject('tests/AttributeTest.php')));
            expect(collection.findGroups()).toEqual(['integration']);
        });

        it('group index should be empty after reset', async () => {
            const collection = givenTestCollection(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);

            await collection.add(URI.file(phpUnitProject('tests/AttributeTest.php')));
            expect(collection.findGroups()).toEqual(['integration']);

            collection.reset();
            expect(collection.findGroups()).toEqual([]);
        });

        it('workspace folder definition should survive reset', async () => {
            const collection = givenTestCollection(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);

            const folderItem = collection.createFolderRoot(workspaceFolder);
            ctrl.items.add(folderItem);

            await collection.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

            expect(collection.getTestDefinition(folderItem)).toBeDefined();
            expect(collection.getTestDefinition(folderItem)?.type).toBe(TestType.workspace);

            collection.reset();

            expect(collection.getTestDefinition(folderItem)).toBeDefined();
            expect(collection.getTestDefinition(folderItem)?.type).toBe(TestType.workspace);
        });

        it('delete should clean up index', async () => {
            const collection = givenTestCollection(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);

            const file = URI.file(phpUnitProject('tests/AssertionsTest.php'));
            await collection.add(file);

            const itemsBefore = collection.findTestsByFile(file);
            expect(itemsBefore.length).toBeGreaterThan(0);
            expect(collection.getTestDefinition(itemsBefore[0])).toBeDefined();

            await collection.delete(file);

            expect(collection.findTestsByFile(file)).toEqual([]);
            expect(collection.has(file)).toBeFalsy();
        });

        it('change in multi-testsuite keeps index for both suites', async () => {
            const collection = givenTestCollection(`
                <testsuites>
                    <testsuite name="Unit">
                        <directory>tests/Unit</directory>
                    </testsuite>
                    <testsuite name="Feature">
                        <directory>tests/Feature</directory>
                    </testsuite>
                </testsuites>`);

            await collection.add(URI.file(phpUnitProject('tests/Feature/ExampleTest.php')));
            await collection.add(URI.file(phpUnitProject('tests/Unit/ExampleTest.php')));

            await collection.change(URI.file(phpUnitProject('tests/Unit/ExampleTest.php')));

            expect(
                collection.getTestDefinition(ctrl.items.get('testsuite:Unit') as TestItem),
            ).toBeDefined();
            expect(
                collection.getTestDefinition(ctrl.items.get('testsuite:Feature') as TestItem),
            ).toBeDefined();
        });

        it('multi-testsuite — all fixture files discovered', async () => {
            const collection = givenTestCollection(`
                <testsuites>
                    <testsuite name="Feature">
                        <directory>tests/Feature</directory>
                    </testsuite>
                    <testsuite name="Unit">
                        <directory>tests/Unit</directory>
                    </testsuite>
                </testsuites>`);
            const includes: string[] = ['**/*.php'];
            const excludes: string[] = ['**/.git/**', '**/node_modules/**', '**/vendor/**'];

            const includePattern = new RelativePattern(workspaceFolder, `{${includes.join(',')}}`);
            const excludePattern = new RelativePattern(workspaceFolder, `{${excludes.join(',')}}`);
            const files = await workspace.findFiles(includePattern, excludePattern);

            for (const file of files) {
                await collection.add(file);
            }

            for (const [, item] of ctrl.items) {
                expect(item.id).toMatch(/^testsuite:/);
            }
        });

        it('reset should clear testsuite and namespace nodes from tree (#390)', async () => {
            const collection = givenTestCollection(`
                <testsuites>
                    <testsuite name="Unit">
                        <directory>tests/Unit</directory>
                    </testsuite>
                    <testsuite name="Feature">
                        <directory>tests/Feature</directory>
                    </testsuite>
                </testsuites>`);

            await collection.add(URI.file(phpUnitProject('tests/Unit/ExampleTest.php')));
            await collection.add(URI.file(phpUnitProject('tests/Feature/ExampleTest.php')));

            expect(ctrl.items.size).toBeGreaterThan(0);

            collection.reset();

            expect(ctrl.items.size).toBe(0);
        });

        it('add test — all fixture files discovered', async () => {
            const collection = givenTestCollection(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);
            const includes: string[] = ['**/*.php'];
            const excludes: string[] = ['**/.git/**', '**/node_modules/**', '**/vendor/**'];

            const includePattern = new RelativePattern(workspaceFolder, `{${includes.join(',')}}`);
            const excludePattern = new RelativePattern(workspaceFolder, `{${excludes.join(',')}}`);
            const files = await workspace.findFiles(includePattern, excludePattern);

            for (const file of files) {
                await collection.add(file);
            }

            const skips = [
                'phpunit-stub/src/',
                'phpunit-stub\\src\\',
                '/AbstractTest.php',
                '\\AbstractTest.php',
                '/Concerns/SharedTests.php',
                '\\Concerns\\SharedTests.php',
                '/support/RequiredTrait.php',
                '\\support\\RequiredTrait.php',
                '/tests/WithoutSuffixCase.php',
                '\\tests\\WithoutSuffixCase.php',
                '/tests/VendorBaseTestCase.php',
                '\\tests\\VendorBaseTestCase.php',
            ];
            const expectedFiles = files
                .filter((file) => !skips.some((skip) => file.fsPath.includes(skip)))
                .map((file) => file.fsPath)
                .sort();

            const actualFiles = collectTestItemFiles(ctrl.items).sort();

            expect(actualFiles).toEqual(expectedFiles);
        });
    });
});
