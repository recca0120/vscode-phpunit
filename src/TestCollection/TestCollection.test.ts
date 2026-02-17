import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RelativePattern, type TestController, tests, Uri, workspace } from 'vscode';
import { URI } from 'vscode-uri';
import { PHPUnitXML } from '../PHPUnit';
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

    beforeEach(() => {
        ctrl = tests.createTestController('phpunit', 'PHPUnit');
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

        // Re-add same file (simulates file change) - groups should still be correct
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

    it('delete should clean up testItems and index', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite>
            </testsuites>`);

        const file = URI.file(phpUnitProject('tests/AssertionsTest.php'));
        await collection.add(file);

        // Verify items exist
        const itemsBefore = collection.findTestsByFile(file);
        expect(itemsBefore.length).toBeGreaterThan(0);
        const testDef = collection.getTestDefinition(itemsBefore[0]);
        expect(testDef).toBeDefined();

        // Delete
        collection.delete(file);

        // After delete: no test items, no definitions, ctrl.items empty
        expect(collection.findTestsByFile(file)).toEqual([]);
        expect(collection.has(file)).toBeFalsy();
        expect(toTree(ctrl.items)).toEqual([]);
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
                id: 'testsuite:Unit',
                label: '$(package) Unit',
                children: [
                    expect.objectContaining({
                        id: 'Example (Tests\\Unit\\Example)',
                        label: '$(symbol-class) ExampleTest',
                    }),
                ],
            },
            {
                id: 'testsuite:Feature',
                label: '$(package) Feature',
                children: [
                    expect.objectContaining({
                        id: 'Example (Tests\\Feature\\Example)',
                        label: '$(symbol-class) ExampleTest',
                    }),
                ],
            },
        ]);
    });

    it('with folder root (multi-workspace)', async () => {
        const collection = givenTestCollection(`
            <testsuites>
                <testsuite name="default">
                    <directory>tests</directory>
                </testsuite>
            </testsuites>`);

        const folderItem = ctrl.createTestItem('folder:test', '$(folder) phpunit-stub');
        folderItem.canResolveChildren = true;
        ctrl.items.add(folderItem);
        collection.setRootItems(folderItem.children);

        await collection.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

        expect(toTree(ctrl.items)).toEqual([
            {
                id: 'folder:test',
                label: '$(folder) phpunit-stub',
                children: [
                    expect.objectContaining({
                        id: 'namespace:Tests',
                        label: '$(symbol-namespace) Tests',
                        children: [
                            expect.objectContaining({
                                id: 'Assertions (Tests\\Assertions)',
                                label: '$(symbol-class) AssertionsTest',
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
