import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
    ChainAstParser,
    PHPUnitXML,
    PhpParserAstParser,
    TestIndex,
    TestParser,
    type TestStarted,
    TestType,
    TreeSitterAstParser,
} from '@vscode-phpunit/phpunit';
import { generateXML, phpUnitProject } from '@vscode-phpunit/phpunit/testing';
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { RelativePattern, type TestController, type TestItem, tests, Uri, workspace } from 'vscode';
import { URI } from 'vscode-uri';
import { testStarted } from '../../test-support/teamcity';
import { allIds, collectIds, filesOf, toTree } from '../../test-support/testItems';
import { icon } from './TestHierarchyBuilder';
import { TestTree } from './TestTree';

describe('TestTree', () => {
    const root = phpUnitProject('');
    const workspaceFolder = { index: 0, name: 'phpunit', uri: Uri.file(root) };
    let ctrl: TestController;

    const givenTestTree = (text: string, configurationFile = phpUnitProject('phpunit.xml')) => {
        const phpUnitXML = new PHPUnitXML();
        phpUnitXML.load(generateXML(text), configurationFile);

        const astParser = new ChainAstParser([new TreeSitterAstParser(), new PhpParserAstParser()]);
        const testParser = new TestParser(phpUnitXML, astParser);

        return new TestTree(ctrl, phpUnitXML, new TestIndex(phpUnitXML, testParser));
    };

    beforeEach(() => {
        ctrl = tests.createTestController('phpunit', 'PHPUnit');
        vi.clearAllMocks();
    });

    describe('tree structure', () => {
        describe('single testsuite', () => {
            it('re-parse replaces children, not accumulates', async () => {
                const testTree = givenTestTree(`
                    <testsuites>
                        <testsuite name="default">
                            <directory>tests</directory>
                        </testsuite>
                    </testsuites>`);

                await testTree.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));
                await testTree.update(URI.file(phpUnitProject('tests/AssertionsTest.php')));

                const ns = ctrl.items.get('namespace:Tests') as TestItem;
                expect(ns).toBeDefined();
                const classIds = collectIds(ns.children).filter((id) =>
                    id.startsWith('Assertions'),
                );
                expect(classIds).toEqual(['Assertions (Tests\\Assertions)']);
            });

            it('with folder root (multi-workspace)', async () => {
                const testTree = givenTestTree(`
                    <testsuites>
                        <testsuite name="default">
                            <directory>tests</directory>
                        </testsuite>
                    </testsuites>`);

                const folderItem = testTree.createFolderRoot(workspaceFolder);
                ctrl.items.add(folderItem);

                await testTree.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

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
            it('scrambled add order preserves testsuite order and namespace stripping', async () => {
                const testTree = givenTestTree(`
                    <testsuites>
                        <testsuite name="Unit">
                            <directory>tests/Unit</directory>
                        </testsuite>
                        <testsuite name="Feature">
                            <directory>tests/Feature</directory>
                        </testsuite>
                    </testsuites>`);

                await testTree.add(
                    URI.file(phpUnitProject('tests/Feature/SubFolder/ExampleTest.php')),
                );
                await testTree.add(URI.file(phpUnitProject('tests/Unit/ExampleTest.php')));
                await testTree.add(URI.file(phpUnitProject('tests/Feature/ExampleTest.php')));
                await testTree.add(
                    URI.file(phpUnitProject('tests/Unit/SubFolder/ExampleTest.php')),
                );

                expect(collectIds(ctrl.items)).toEqual(['testsuite:Feature', 'testsuite:Unit']);

                const unitSuite = ctrl.items.get('testsuite:Unit') as TestItem;
                expect(unitSuite.children.get('namespace:Tests')).toBeUndefined();

                const featureSuite = ctrl.items.get('testsuite:Feature') as TestItem;
                expect(featureSuite.children.get('namespace:Tests')).toBeUndefined();
            });

            it('update keeps the tree of the other testsuite intact', async () => {
                const testTree = givenTestTree(`
                    <testsuites>
                        <testsuite name="Unit">
                            <directory>tests/Unit</directory>
                        </testsuite>
                        <testsuite name="Feature">
                            <directory>tests/Feature</directory>
                        </testsuite>
                    </testsuites>`);

                await testTree.add(URI.file(phpUnitProject('tests/Feature/ExampleTest.php')));
                await testTree.add(URI.file(phpUnitProject('tests/Unit/ExampleTest.php')));

                await testTree.update(URI.file(phpUnitProject('tests/Unit/ExampleTest.php')));

                expect(collectIds(ctrl.items)).toEqual(['testsuite:Feature', 'testsuite:Unit']);

                const featureSuite = ctrl.items.get('testsuite:Feature') as TestItem;
                expect(
                    featureSuite.children.get('Example (Tests\\Feature\\Example)'),
                ).toBeDefined();
            });

            it('remove cleans up empty parents', async () => {
                const testTree = givenTestTree(`
                    <testsuites>
                        <testsuite name="Unit">
                            <directory>tests/Unit</directory>
                        </testsuite>
                        <testsuite name="Feature">
                            <directory>tests/Feature</directory>
                        </testsuite>
                    </testsuites>`);

                await testTree.add(URI.file(phpUnitProject('tests/Feature/ExampleTest.php')));
                await testTree.add(URI.file(phpUnitProject('tests/Unit/ExampleTest.php')));

                await testTree.remove(URI.file(phpUnitProject('tests/Unit/ExampleTest.php')));
                expect(collectIds(ctrl.items)).toEqual(['testsuite:Feature']);

                expect(
                    ctrl.items
                        .get('testsuite:Feature')
                        ?.children.get('Example (Tests\\Feature\\Example)'),
                ).toBeDefined();
            });

            it('full lifecycle: scrambled add → update → remove', async () => {
                const testTree = givenTestTree(`
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

                await testTree.add(featureSubFolder);
                await testTree.add(unitExample);
                await testTree.add(featureExample);
                await testTree.add(unitSubFolder);

                expect(collectIds(ctrl.items)).toEqual(['testsuite:Feature', 'testsuite:Unit']);
                expect(
                    ctrl.items.get('testsuite:Unit')?.children.get('namespace:Tests'),
                ).toBeUndefined();
                expect(
                    ctrl.items.get('testsuite:Feature')?.children.get('namespace:Tests'),
                ).toBeUndefined();

                await testTree.update(unitExample);
                expect(collectIds(ctrl.items)).toEqual(['testsuite:Feature', 'testsuite:Unit']);
                expect(ctrl.items.get('testsuite:Feature')?.children.size).toBe(2);

                await testTree.remove(featureExample);
                expect(collectIds(ctrl.items)).toEqual(['testsuite:Feature', 'testsuite:Unit']);

                await testTree.remove(featureSubFolder);
                expect(collectIds(ctrl.items)).toEqual(['testsuite:Unit']);
            });
        });

        it('remove of a folder removes all tests under that folder', async () => {
            const testTree = givenTestTree(`
                <testsuites>
                    <testsuite name="Unit">
                        <directory>tests/Unit</directory>
                    </testsuite>
                    <testsuite name="Feature">
                        <directory>tests/Feature</directory>
                    </testsuite>
                </testsuites>`);

            await testTree.add(URI.file(phpUnitProject('tests/Unit/ExampleTest.php')));
            await testTree.add(URI.file(phpUnitProject('tests/Unit/SubFolder/ExampleTest.php')));
            await testTree.add(URI.file(phpUnitProject('tests/Feature/ExampleTest.php')));

            expect(collectIds(ctrl.items)).toEqual(['testsuite:Feature', 'testsuite:Unit']);

            await testTree.remove(URI.file(phpUnitProject('tests/Unit')));

            expect(collectIds(ctrl.items)).toEqual(['testsuite:Feature']);
        });

        it('file outside all testsuite directories should not appear in tree', async () => {
            const testTree = givenTestTree(`
                <testsuites>
                    <testsuite name="Unit">
                        <directory>tests/Unit</directory>
                    </testsuite>
                    <testsuite name="Feature">
                        <directory>tests/Feature</directory>
                    </testsuite>
                </testsuites>`);

            await testTree.add(URI.file(phpUnitProject('tests/Unit/ExampleTest.php')));
            await testTree.add(URI.file(phpUnitProject('tests/Feature/ExampleTest.php')));
            await testTree.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

            expect(collectIds(ctrl.items)).toEqual(['testsuite:Feature', 'testsuite:Unit']);
            expect(ctrl.items.get('namespace:Tests')).toBeUndefined();
        });
    });

    describe('addDatasetChild', () => {
        const makeTestStarted = (id: string, name: string): TestStarted =>
            testStarted({ name, id });

        it('creates dataset child with correct TestDefinition in index', async () => {
            const testTree = givenTestTree(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);

            await testTree.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const classItem = ns.children.get('Assertions (Tests\\Assertions)') as TestItem;
            const methodItem = classItem.children.get(
                'Assertions (Tests\\Assertions)::Addition provider',
            ) as TestItem;
            expect(methodItem).toBeDefined();

            const childItem = testTree.addDatasetChild(
                makeTestStarted(methodItem.id, 'addition_provider with data set #0'),
            );
            expect(childItem).toBeDefined();

            expect(methodItem.children.get(childItem?.id ?? '')).toBe(childItem);

            const storedDef = testTree.definitionOf(childItem as TestItem);
            expect(storedDef).toBeDefined();
            expect(storedDef?.type).toBe(TestType.dataset);

            expect(childItem?.id).toContain('with data set #0');
        });

        it('skips on repeated calls when child already exists', async () => {
            const testTree = givenTestTree(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);

            await testTree.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

            const ns = ctrl.items.get('namespace:Tests') as TestItem;
            const classItem = ns.children.get('Assertions (Tests\\Assertions)') as TestItem;
            const methodItem = classItem.children.get(
                'Assertions (Tests\\Assertions)::Addition provider',
            ) as TestItem;

            const result = makeTestStarted(methodItem.id, 'addition_provider with data set #0');
            const child1 = testTree.addDatasetChild(result);
            expect(child1).toBeDefined();

            const child2 = testTree.addDatasetChild(result);
            expect(child2).toBeUndefined();

            expect(methodItem.children.get(child1?.id ?? '')).toBe(child1);
        });
    });

    describe('parent class outside the testsuite directories', () => {
        const writeProject = async (baseMethods: string[]) => {
            const root = await mkdtemp(join(tmpdir(), 'vscode-phpunit-'));
            onTestFinished(() => rm(root, { recursive: true, force: true }));
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
            const testTree = givenTestTree(
                `<testsuites>
                    <testsuite name="Unit">
                        <directory suffix="Test.php">tests/Unit</directory>
                    </testsuite>
                </testsuites>`,
                join(root, 'phpunit.xml'),
            );
            await testTree.add(URI.file(join(root, 'tests/Unit/ChildTest.php')));

            await writeBase(['test_a', 'test_b']);
            await testTree.update(URI.file(join(root, 'tests/Support/BaseCase.php')));
            expect(
                allIds(ctrl.items)
                    .filter((id) => id.startsWith('Child (Tests\\Unit\\Child)::'))
                    .sort(),
            ).toEqual(['Child (Tests\\Unit\\Child)::A', 'Child (Tests\\Unit\\Child)::B']);
        });
    });

    describe('ancestors indexed after the class', () => {
        const indexInOrder = async (files: Record<string, string>, order: string[]) => {
            const root = await mkdtemp(join(tmpdir(), 'vscode-phpunit-'));
            onTestFinished(() => rm(root, { recursive: true, force: true }));
            await mkdir(join(root, 'tests'), { recursive: true });
            for (const [file, code] of Object.entries(files)) {
                await writeFile(join(root, 'tests', file), code);
            }
            const testTree = givenTestTree(
                `<testsuites>
                    <testsuite name="Unit">
                        <directory suffix="Test.php">tests</directory>
                    </testsuite>
                </testsuites>`,
                join(root, 'phpunit.xml'),
            );
            for (const file of order) {
                await testTree.add(URI.file(join(root, 'tests', file)));
            }
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
            onTestFinished(() => rm(root, { recursive: true, force: true }));
            await mkdir(join(root, 'tests'), { recursive: true });
            for (const [file, code] of Object.entries(files)) {
                await writeFile(join(root, 'tests', file), code);
            }
            const testTree = givenTestTree(
                `<testsuites>
                    <testsuite name="Unit">
                        <directory suffix="Test.php">tests</directory>
                    </testsuite>
                </testsuites>`,
                join(root, 'phpunit.xml'),
            );
            const uriOf = (file: string) => URI.file(join(root, 'tests', file));
            return { root, testTree, uriOf };
        };

        const fooIds = () => {
            return allIds(ctrl.items)
                .filter((id) => id.startsWith('Foo (Tests\\Foo)::'))
                .sort();
        };

        it('drops the methods of a trait that was renamed', async () => {
            const { root, testTree, uriOf } = await writeProject({
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
            await testTree.add(uriOf('FooTest.php'));
            await testTree.add(uriOf('Shared.php'));

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
            await testTree.update(uriOf('Shared.php'));

            expect(fooIds()).toEqual(['Foo (Tests\\Foo)::Own']);
        });

        it('drops the methods of a parent class whose file was deleted', async () => {
            const { root, testTree, uriOf } = await writeProject({
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
            await testTree.add(uriOf('FooTest.php'));
            await testTree.add(uriOf('Base.php'));

            await rm(join(root, 'tests/Base.php'));
            await testTree.remove(uriOf('Base.php'));

            expect(fooIds()).toEqual(['Foo (Tests\\Foo)::Own']);
        });

        it('drops a class once its parent stops extending TestCase', async () => {
            const { root, testTree, uriOf } = await writeProject({
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
            await testTree.add(uriOf('Base.php'));
            await testTree.add(uriOf('FooTest.php'));

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
            await testTree.update(uriOf('Base.php'));

            expect(fooIds()).toEqual([]);
        });
    });

    describe('classes known not to extend TestCase', () => {
        it('ignores classes whose resolved hierarchy does not reach TestCase', async () => {
            const root = await mkdtemp(join(tmpdir(), 'vscode-phpunit-'));
            onTestFinished(() => rm(root, { recursive: true, force: true }));
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
            const testTree = givenTestTree(
                `<testsuites>
                    <testsuite name="Unit">
                        <directory suffix="Test.php">tests/Unit</directory>
                    </testsuite>
                </testsuites>`,
                join(root, 'phpunit.xml'),
            );
            await testTree.add(URI.file(join(root, 'tests/Unit/PlainBase.php')));
            await testTree.add(URI.file(join(root, 'tests/Unit/PlainHelperTest.php')));
            await testTree.add(URI.file(join(root, 'tests/Unit/ExtendsPlainBaseTest.php')));
            expect(allIds(ctrl.items).filter((id) => id.includes('Plain'))).toEqual([]);
        });
    });

    describe('index operations', () => {
        it('find groups and tests by group', async () => {
            const testTree = givenTestTree(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);

            await testTree.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));
            await testTree.add(URI.file(phpUnitProject('tests/AttributeTest.php')));

            expect(testTree.groups()).toEqual(['integration']);
            expect(testTree.itemsInGroup('integration')).toEqual(
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

        it('itemsOf should return matching items by id lookup', async () => {
            const testTree = givenTestTree(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);

            await testTree.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

            const testItem = {
                id: 'Assertions (Tests\\Assertions)::Passed',
            } as import('vscode').TestItem;
            const request = { include: [testItem] } as unknown as import('vscode').TestRunRequest;
            const result = testTree.itemsOf(request);

            expect(result).toHaveLength(1);
            expect(result?.[0].id).toBe('Assertions (Tests\\Assertions)::Passed');
        });

        it('itemsOf should return undefined for no match', async () => {
            const testTree = givenTestTree(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);

            await testTree.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

            const request = {
                include: [{ id: 'nonexistent' } as import('vscode').TestItem],
            } as unknown as import('vscode').TestRunRequest;
            expect(testTree.itemsOf(request)).toBeUndefined();
        });

        it('itemsOf should return undefined when no request', () => {
            const testTree = givenTestTree(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);

            expect(testTree.itemsOf(undefined)).toBeUndefined();
            expect(
                testTree.itemsOf({
                    include: undefined,
                } as unknown as import('vscode').TestRunRequest),
            ).toBeUndefined();
        });

        it('group index should update when tests are re-parsed', async () => {
            const testTree = givenTestTree(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);

            await testTree.add(URI.file(phpUnitProject('tests/AttributeTest.php')));
            expect(testTree.groups()).toEqual(['integration']);

            await testTree.add(URI.file(phpUnitProject('tests/AttributeTest.php')));
            expect(testTree.groups()).toEqual(['integration']);
        });

        it('group index should be empty after clear', async () => {
            const testTree = givenTestTree(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);

            await testTree.add(URI.file(phpUnitProject('tests/AttributeTest.php')));
            expect(testTree.groups()).toEqual(['integration']);

            testTree.clear();
            expect(testTree.groups()).toEqual([]);
        });

        it('workspace folder definition should survive clear', async () => {
            const testTree = givenTestTree(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);

            const folderItem = testTree.createFolderRoot(workspaceFolder);
            ctrl.items.add(folderItem);

            await testTree.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

            expect(testTree.definitionOf(folderItem)).toBeDefined();
            expect(testTree.definitionOf(folderItem)?.type).toBe(TestType.workspace);

            testTree.clear();

            expect(testTree.definitionOf(folderItem)).toBeDefined();
            expect(testTree.definitionOf(folderItem)?.type).toBe(TestType.workspace);
        });

        it('remove should clean up index', async () => {
            const testTree = givenTestTree(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`);

            const file = URI.file(phpUnitProject('tests/AssertionsTest.php'));
            await testTree.add(file);

            const itemsBefore = testTree.itemsInFile(file);
            expect(itemsBefore.length).toBeGreaterThan(0);
            expect(testTree.definitionOf(itemsBefore[0])).toBeDefined();

            await testTree.remove(file);

            expect(testTree.itemsInFile(file)).toEqual([]);
            expect(testTree.has(file)).toBeFalsy();
        });

        it('update in multi-testsuite keeps index for both suites', async () => {
            const testTree = givenTestTree(`
                <testsuites>
                    <testsuite name="Unit">
                        <directory>tests/Unit</directory>
                    </testsuite>
                    <testsuite name="Feature">
                        <directory>tests/Feature</directory>
                    </testsuite>
                </testsuites>`);

            await testTree.add(URI.file(phpUnitProject('tests/Feature/ExampleTest.php')));
            await testTree.add(URI.file(phpUnitProject('tests/Unit/ExampleTest.php')));

            await testTree.update(URI.file(phpUnitProject('tests/Unit/ExampleTest.php')));

            expect(
                testTree.definitionOf(ctrl.items.get('testsuite:Unit') as TestItem),
            ).toBeDefined();
            expect(
                testTree.definitionOf(ctrl.items.get('testsuite:Feature') as TestItem),
            ).toBeDefined();
        });

        it('multi-testsuite — all fixture files discovered', async () => {
            const testTree = givenTestTree(`
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
                await testTree.add(file);
            }

            for (const [, item] of ctrl.items) {
                expect(item.id).toMatch(/^testsuite:/);
            }
        });

        it('clear should remove testsuite and namespace nodes from tree (#390)', async () => {
            const testTree = givenTestTree(`
                <testsuites>
                    <testsuite name="Unit">
                        <directory>tests/Unit</directory>
                    </testsuite>
                    <testsuite name="Feature">
                        <directory>tests/Feature</directory>
                    </testsuite>
                </testsuites>`);

            await testTree.add(URI.file(phpUnitProject('tests/Unit/ExampleTest.php')));
            await testTree.add(URI.file(phpUnitProject('tests/Feature/ExampleTest.php')));

            expect(ctrl.items.size).toBeGreaterThan(0);

            testTree.clear();

            expect(ctrl.items.size).toBe(0);
        });

        it('add test — all fixture files discovered', async () => {
            const testTree = givenTestTree(`
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
                await testTree.add(file);
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

            const actualFiles = filesOf(ctrl.items).sort();

            expect(actualFiles).toEqual(expectedFiles);
        });
    });
});
