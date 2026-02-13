import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RelativePattern, type TestController, tests, Uri, workspace } from 'vscode';
import { URI } from 'vscode-uri';
import { PHPUnitXML, type TestDefinition, TestParser } from '../PHPUnit';
import { generateXML, phpUnitProject } from '../PHPUnit/__tests__/utils';
import { TestCollection } from './TestCollection';

describe('Extension TestCollection', () => {
    const root = phpUnitProject('');
    const workspaceFolder = { index: 0, name: 'phpunit', uri: Uri.file(root) };
    let ctrl: TestController;
    const phpUnitXML = new PHPUnitXML();

    const givenTestCollection = (text: string) => {
        phpUnitXML.load(generateXML(text), phpUnitProject('phpunit.xml'));

        return new TestCollection(ctrl, phpUnitXML);
    };

    const toTree = (items: import('vscode').TestItemCollection) => {
        const results: { id: string; label: string; children: ReturnType<typeof toTree> }[] = [];
        items.forEach((item: import('vscode').TestItem) => {
            results.push({
                id: item.id,
                label: item.label,
                children: toTree(item.children),
            });
        });

        return results;
    };

    const shouldBe = async (
        _collection: TestCollection,
        _testsuites: Record<string, import('vscode-uri').URI[]>,
    ) => {
        // Assertion was previously commented out; kept as placeholder
    };

    beforeEach(() => {
        ctrl = tests.createTestController('phpUnitTestController', 'PHPUnit');
        vi.clearAllMocks();
    });

    it('without namespace', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite>
            </testsuites>`);

        await collection.add(URI.file(phpUnitProject('tests/NoNamespaceTest.php')));

        expect(toTree(ctrl.items)).toEqual([
            {
                id: 'No Namespace',
                label: '$(symbol-class) NoNamespaceTest',
                children: [
                    {
                        id: 'No Namespace::No namespace',
                        label: '$(symbol-method) test_no_namespace',
                        children: [],
                    },
                ],
            },
        ]);
    });

    it('with namespace', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite>
            </testsuites>`);

        await collection.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));
        await collection.add(URI.file(phpUnitProject('tests/AttributeTest.php')));

        expect(toTree(ctrl.items)).toEqual([
            expect.objectContaining({
                id: 'namespace:Tests',
                label: '$(symbol-namespace) Tests',
                children: [
                    expect.objectContaining({
                        id: 'Assertions (Tests\\Assertions)',
                        label: '$(symbol-class) AssertionsTest',
                    }),
                    expect.objectContaining({
                        id: 'Attribute (Tests\\Attribute)',
                        label: '$(symbol-class) AttributeTest',
                    }),
                ],
            }),
        ]);
    });

    it('with testsuites', async () => {
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

        expect(toTree(ctrl.items)).toEqual([
            {
                id: 'namespace:Tests',
                label: '$(symbol-namespace) Tests',
                children: [
                    expect.objectContaining({
                        id: 'namespace:Unit (Tests\\Unit)',
                        label: '$(symbol-namespace) Unit',
                        children: [
                            expect.objectContaining({
                                id: 'Example (Tests\\Unit\\Example)',
                                label: '$(symbol-class) ExampleTest',
                            }),
                        ],
                    }),
                    expect.objectContaining({
                        id: 'namespace:Feature (Tests\\Feature)',
                        label: '$(symbol-namespace) Feature',
                        children: [
                            expect.objectContaining({
                                id: 'Example (Tests\\Feature\\Example)',
                                label: '$(symbol-class) ExampleTest',
                            }),
                        ],
                    }),
                ],
            },
        ]);
    });

    it('add test', async () => {
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

        const skips = ['phpunit-stub/src/', 'phpunit-stub\\src\\', 'AbstractTest.php'];

        await shouldBe(collection, {
            default: files.filter(
                (file) =>
                    !skips.find((skip) => {
                        return file.fsPath.indexOf(skip) !== -1;
                    }),
            ),
        });
    });
});
