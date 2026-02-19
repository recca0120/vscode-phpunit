import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RelativePattern, type TestController, type TestItem, tests, Uri, workspace } from 'vscode';
import { URI } from 'vscode-uri';
import { ChainAstParser, PHPUnitXML, TestParser, TestType } from '../PHPUnit';
import { generateXML, pestProject, phpUnitProject } from '../PHPUnit/__tests__/utils';
import { ClassHierarchy } from '../PHPUnit/TestParser/ClassHierarchy';
import { PhpParserAstParser } from '../PHPUnit/TestParser/php-parser/PhpParserAstParser';
import { TreeSitterAstParser } from '../PHPUnit/TestParser/tree-sitter/TreeSitterAstParser';
import { TestCollection } from './TestCollection';
import { icon, TestHierarchyBuilder } from './TestHierarchyBuilder';

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

        const classHierarchy = new ClassHierarchy();
        const astParser = new ChainAstParser([new TreeSitterAstParser(), new PhpParserAstParser()]);
        const testParser = new TestParser(phpUnitXML, astParser);

        return new TestCollection(ctrl, phpUnitXML, testParser, classHierarchy);
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
            let collection: TestCollection;

            beforeEach(() => {
                collection = givenTestCollection(`
                    <testsuites>
                        <testsuite name="default">
                            <directory>tests</directory>
                        </testsuite>
                    </testsuites>`);
            });

            it('no namespace', async () => {
                await collection.add(URI.file(phpUnitProject('tests/NoNamespaceTest.php')));

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

            it('with namespace', async () => {
                await collection.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

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

            it('sibling classes share namespace', async () => {
                await collection.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));
                await collection.add(URI.file(phpUnitProject('tests/AttributeTest.php')));

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
            let collection: TestCollection;

            beforeEach(() => {
                collection = givenTestCollection(`
                    <testsuites>
                        <testsuite name="Unit">
                            <directory>tests/Unit</directory>
                        </testsuite>
                        <testsuite name="Feature">
                            <directory>tests/Feature</directory>
                        </testsuite>
                    </testsuites>`);
            });

            it('groups by testsuite with namespace prefix stripped', async () => {
                await collection.add(URI.file(phpUnitProject('tests/Unit/ExampleTest.php')));
                await collection.add(URI.file(phpUnitProject('tests/Feature/ExampleTest.php')));

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

            it('deep namespace — only remaining parts shown after prefix stripping', async () => {
                await collection.add(
                    URI.file(phpUnitProject('tests/Unit/SubFolder/ExampleTest.php')),
                );
                await collection.add(
                    URI.file(phpUnitProject('tests/Feature/SubFolder/ExampleTest.php')),
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
                await collection.add(URI.file(phpUnitProject('tests/Feature/ExampleTest.php')));
                await collection.add(URI.file(phpUnitProject('tests/Unit/ExampleTest.php')));

                collection.delete(URI.file(phpUnitProject('tests/Unit/ExampleTest.php')));
                expect(collectIds(ctrl.items)).toEqual(['testsuite:Feature']);

                expect(
                    ctrl.items
                        .get('testsuite:Feature')
                        ?.children.get('Example (Tests\\Feature\\Example)'),
                ).toBeDefined();
            });

            it('full lifecycle: scrambled add → change → delete', async () => {
                const unitExample = URI.file(phpUnitProject('tests/Unit/ExampleTest.php'));
                const unitSubFolder = URI.file(
                    phpUnitProject('tests/Unit/SubFolder/ExampleTest.php'),
                );
                const featureExample = URI.file(phpUnitProject('tests/Feature/ExampleTest.php'));
                const featureSubFolder = URI.file(
                    phpUnitProject('tests/Feature/SubFolder/ExampleTest.php'),
                );

                // Phase 1: scrambled add
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

                // Phase 2: change
                await collection.change(unitExample);
                expect(collectIds(ctrl.items)).toEqual(['testsuite:Feature', 'testsuite:Unit']);
                expect(ctrl.items.get('testsuite:Feature')?.children.size).toBe(2);

                // Phase 3: delete one Feature file
                collection.delete(featureExample);
                expect(collectIds(ctrl.items)).toEqual(['testsuite:Feature', 'testsuite:Unit']);

                // Phase 4: delete last Feature file — suite removed
                collection.delete(featureSubFolder);
                expect(collectIds(ctrl.items)).toEqual(['testsuite:Unit']);
            });
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

            // App: name not in namespace → full namespace preserved
            // Integration: name matches → prefix stripped
            expect(toTree(ctrl.items)).toEqual([
                {
                    id: 'testsuite:App',
                    label: `${icon(TestType.testsuite)} App`,
                    children: [
                        {
                            id: 'namespace:Tests',
                            label: `${icon(TestType.namespace)} Tests`,
                            children: [
                                {
                                    id: 'namespace:Feature (Tests\\Feature)',
                                    label: `${icon(TestType.namespace)} Feature`,
                                    children: [
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
                                    id: 'namespace:Unit (Tests\\Unit)',
                                    label: `${icon(TestType.namespace)} Unit`,
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
                                    ],
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

            collection.delete(file);

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
