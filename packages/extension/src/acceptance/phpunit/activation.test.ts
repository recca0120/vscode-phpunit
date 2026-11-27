import { join } from 'node:path';
import { initTreeSitter, TestType } from '@vscode-phpunit/phpunit';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { commands, type ExtensionContext, tests, Uri, window, workspace } from 'vscode';
import { createExtensionContext } from '../../../fakes/extensionContext';
import { openWorkspace } from '../../../fakes/openWorkspace';
import { findItem } from '../../../test-support/testItems';
import { icon } from '../../TestTree/TestHierarchyBuilder';
import { activateExtension } from '../harness';
import { phpUnitSettings, stubs } from '../support';

describe.each(stubs.phpUnit)('PHPUnit $name ($phpUnitVersion)', ({ root, binary, args }) => {
    let context: ExtensionContext;

    beforeAll(async () => initTreeSitter());

    beforeEach(async () => {
        context = createExtensionContext();
        await openWorkspace({ root, settings: phpUnitSettings(binary, args) });
    });
    afterEach(() => vi.clearAllMocks());

    describe('activation', () => {
        it('registers its commands and lists test classes with their methods', async () => {
            const extension = await activateExtension(context);
            const { controller } = extension;
            const uri = Uri.file(join(root, 'tests/AssertionsTest.php'));
            const itemId = `Assertions (Tests\\Assertions)`;

            const parent = findItem(controller.items, itemId);
            expect(parent).toBeDefined();
            const child = parent?.children.get(`${itemId}::Passed`);

            expect(parent).toEqual(
                expect.objectContaining({
                    id: itemId,
                    uri: expect.objectContaining({ fsPath: uri.fsPath }),
                    label: `${icon(TestType.class)} AssertionsTest`,
                }),
            );

            expect(child).toEqual(
                expect.objectContaining({
                    id: `${itemId}::Passed`,
                    uri: expect.objectContaining({ fsPath: uri.fsPath }),
                    label: `${icon(TestType.method)} test_passed`,
                    range: {
                        start: expect.objectContaining({ line: 15, character: 4 }),
                        end: expect.objectContaining({ line: 18, character: 5 }),
                    },
                    tags: expect.arrayContaining([
                        expect.objectContaining({ id: 'group:integration' }),
                    ]),
                }),
            );

            expect(workspace.getConfiguration).toHaveBeenCalledWith('phpunit', expect.anything());
            expect(window.createOutputChannel).toHaveBeenCalledWith('PHPUnit Debug', 'phpunit');
            expect(tests.createTestController).toHaveBeenCalledWith('phpunit', 'PHPUnit');
            for (const cmd of [
                'phpunit.reload',
                'phpunit.run-all',
                'phpunit.run-file',
                'phpunit.run-test-at-cursor',
                'phpunit.run-by-group',
                'phpunit.rerun',
            ]) {
                expect(commands.registerCommand).toHaveBeenCalledWith(cmd, expect.any(Function));
            }
            expect(context.subscriptions.push).toHaveBeenCalledTimes(5);
        });
    });
});
