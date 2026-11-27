import { spawn } from 'node:child_process';
import { initTreeSitter, TestType } from '@vscode-phpunit/phpunit';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { commands, type ExtensionContext, Uri } from 'vscode';
import { createExtensionContext } from '../../fakes/extensionContext';
import { openWorkspace } from '../../fakes/openWorkspace';
import { expectSpawned } from '../../test-support/process';
import { findItem } from '../../test-support/testItems';
import { icon } from '../TestTree/TestHierarchyBuilder';
import { activateExtension } from './harness';
import { phpUnitSettings, stubs } from './support';

let context: ExtensionContext;

beforeAll(async () => initTreeSitter());

beforeEach(() => {
    context = createExtensionContext();
});

describe('multi-root workspace (PHPUnit + Pest)', {
    skip: stubs.phpUnit.length === 0 || stubs.pest.length === 0,
}, () => {
    const [phpUnitStub] = stubs.phpUnit;
    const [pestStub] = stubs.pest;

    beforeEach(async () => {
        await openWorkspace(
            {
                root: phpUnitStub.root,
                name: 'phpunit-stub',
                settings: phpUnitSettings(phpUnitStub.binary, phpUnitStub.args),
            },
            {
                root: pestStub.root,
                name: 'pest-stub',
                settings: phpUnitSettings(pestStub.binary, pestStub.args),
            },
        );
    });
    afterEach(() => vi.clearAllMocks());

    it('lists the tests of each folder under its folder item', async () => {
        const extension = await activateExtension(context);
        const { controller } = extension;

        const phpUnitFolder = findItem(
            controller.items,
            `folder:${Uri.file(phpUnitStub.root).toString()}`,
        );
        const pestFolder = findItem(
            controller.items,
            `folder:${Uri.file(pestStub.root).toString()}`,
        );
        expect(phpUnitFolder).toBeDefined();
        expect(phpUnitFolder?.label).toBe(`${icon(TestType.workspace)} phpunit-stub`);
        expect(pestFolder).toBeDefined();
        expect(pestFolder?.label).toBe(`${icon(TestType.workspace)} pest-stub`);

        if (!phpUnitFolder || !pestFolder) throw new Error('folder item not found');

        const phpUnitItem = findItem(phpUnitFolder.children, 'Assertions (Tests\\Assertions)');
        expect(phpUnitItem).toBeDefined();
        expect(phpUnitItem?.label).toContain('AssertionsTest');

        const pestUnitSuite = findItem(pestFolder.children, 'testsuite:Unit');
        expect(pestUnitSuite).toBeDefined();
        expect(pestUnitSuite?.label).toContain('Unit');

        const pestItem = pestUnitSuite
            ? findItem(pestUnitSuite.children, 'tests/Unit/ExampleTest.php::test_description')
            : undefined;
        expect(pestItem).toBeDefined();
        expect(pestItem?.label).toContain('test_description');
    });

    it('runs a PHPUnit test in its own folder', async () => {
        const extension = await activateExtension(context);
        const { controller } = extension;
        const phpUnitFolder = findItem(
            controller.items,
            `folder:${Uri.file(phpUnitStub.root).toString()}`,
        );
        if (!phpUnitFolder) throw new Error('phpUnitFolder item not found');
        const testItem = findItem(phpUnitFolder.children, 'Assertions (Tests\\Assertions)');
        expect(testItem).toBeDefined();
        await extension.run([testItem]);

        expectSpawned({
            cwd: phpUnitStub.root,
            args: [phpUnitStub.binary, '--colors=always', '--teamcity'],
        });
    });

    it('runs a Pest test in its own folder', async () => {
        const extension = await activateExtension(context);
        const { controller } = extension;
        const pestFolder = findItem(
            controller.items,
            `folder:${Uri.file(pestStub.root).toString()}`,
        );
        if (!pestFolder) throw new Error('pestFolder item not found');
        const pestUnitSuite = findItem(pestFolder.children, 'testsuite:Unit');
        if (!pestUnitSuite) throw new Error('pestUnitSuite item not found');
        const testItem = findItem(
            pestUnitSuite.children,
            'tests/Unit/ExampleTest.php::test_description',
        );
        expect(testItem).toBeDefined();
        await extension.run([testItem]);

        expectSpawned({
            cwd: pestStub.root,
            args: [pestStub.binary, '--colors=always', '--teamcity'],
        });
    });

    it('phpunit.rerun runs the tests of every folder of the previous run', async () => {
        const extension = await activateExtension(context);
        const { controller } = extension;
        const phpUnitFolder = findItem(
            controller.items,
            `folder:${Uri.file(phpUnitStub.root).toString()}`,
        );
        const pestFolder = findItem(
            controller.items,
            `folder:${Uri.file(pestStub.root).toString()}`,
        );
        if (!phpUnitFolder || !pestFolder) throw new Error('folder item not found');
        const include = [
            findItem(phpUnitFolder.children, 'Assertions (Tests\\Assertions)'),
            findItem(pestFolder.children, 'testsuite:Unit'),
        ];
        await extension.run(include);

        vi.mocked(spawn).mockClear();
        await commands.executeCommand('phpunit.rerun');

        expect(spawn).toHaveBeenCalledTimes(2);
    });

    it('runs a Pest testsuite with --testsuite', async () => {
        const extension = await activateExtension(context);
        const { controller } = extension;
        const pestFolder = findItem(
            controller.items,
            `folder:${Uri.file(pestStub.root).toString()}`,
        );
        if (!pestFolder) throw new Error('pestFolder item not found');
        const testItem = findItem(pestFolder.children, 'testsuite:Unit');
        expect(testItem).toBeDefined();
        await extension.run([testItem]);

        expectSpawned({
            cwd: pestStub.root,
            args: [pestStub.binary, '--testsuite=Unit', '--colors=always', '--teamcity'],
        });
    });

    it('running the PHPUnit folder item runs all of its tests in one process', async () => {
        const extension = await activateExtension(context);
        const { controller } = extension;
        const phpUnitFolder = findItem(
            controller.items,
            `folder:${Uri.file(phpUnitStub.root).toString()}`,
        );
        expect(phpUnitFolder).toBeDefined();
        if (!phpUnitFolder) throw new Error('phpUnitFolder item not found');
        await extension.run([phpUnitFolder]);

        expectSpawned({
            cwd: phpUnitStub.root,
            args: [phpUnitStub.binary, '--colors=always', '--teamcity'],
        });
        expect(spawn).toHaveBeenCalledTimes(1);
    });

    it('running the Pest folder item runs all of its tests in one process', async () => {
        const extension = await activateExtension(context);
        const { controller } = extension;
        const pestFolder = findItem(
            controller.items,
            `folder:${Uri.file(pestStub.root).toString()}`,
        );
        expect(pestFolder).toBeDefined();
        if (!pestFolder) throw new Error('pestFolder item not found');
        await extension.run([pestFolder]);

        expectSpawned({
            cwd: pestStub.root,
            args: [pestStub.binary, '--colors=always', '--teamcity'],
        });
        expect(spawn).toHaveBeenCalledTimes(1);
    });
});
