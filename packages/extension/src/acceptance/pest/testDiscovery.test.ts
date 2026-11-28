import { join } from 'node:path';
import { initTreeSitter, TestType } from '@vscode-phpunit/phpunit';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExtensionContext } from 'vscode';
import { createExtensionContext } from '../../../fakes/extensionContext';
import { isWatched } from '../../../fakes/fileSystemWatchers';
import { openWorkspace } from '../../../fakes/openWorkspace';
import { childLabels } from '../../../test-support/testItems';
import { icon } from '../../TestTree/TestHierarchyBuilder';
import { activateExtension } from '../harness';
import { stubs } from '../support';

describe.skipIf(stubs.pest.length === 0)('Pest', () => {
    describe.each(stubs.pest)('Pest $name ($pestVersion)', ({ root, binary, args }) => {
        let context: ExtensionContext;

        beforeAll(async () => initTreeSitter());

        beforeEach(async () => {
            context = createExtensionContext();
            await openWorkspace({ root, settings: { php: 'php', phpunit: binary, args: args } });
        });
        afterEach(() => vi.clearAllMocks());

        describe('test discovery', () => {
            it('includes test methods of a trait whose file does not match the testsuite suffix', async () => {
                const extension = await activateExtension(context);
                await extension.resolve();

                expect(
                    childLabels(
                        extension.controller.items,
                        'Shared Trait User (Tests\\Unit\\SharedTraitUser)',
                    ),
                ).toEqual([
                    `${icon(TestType.method)} test_from_shared_trait`,
                    `${icon(TestType.method)} test_own`,
                ]);
            });

            it('includes test methods inherited from a class outside the testsuite directories through composer autoload', async () => {
                const extension = await activateExtension(context);
                await extension.resolve();

                expect(
                    childLabels(
                        extension.controller.items,
                        'Inherits Support Base (Tests\\Unit\\InheritsSupportBase)',
                    ),
                ).toEqual([
                    `${icon(TestType.method)} test_from_support_base`,
                    `${icon(TestType.method)} test_own`,
                ]);
            });

            it('watches composer autoload-dev files outside the testsuite directories', async () => {
                const extension = await activateExtension(context);
                await extension.resolve();
                const supportFile = join(root, 'tests/Support/AbstractSharedTestCase.php');

                const watched = isWatched(supportFile);

                expect(watched).toBe(true);
            });

            it('watches composer.json to reload when the autoload mapping changes', async () => {
                const extension = await activateExtension(context);
                await extension.resolve();
                const composerJson = join(root, 'composer.json');

                const watched = isWatched(composerJson);

                expect(watched).toBe(true);
            });
        });
    });
});
