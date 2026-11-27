import { initTreeSitter, TestType } from '@vscode-phpunit/phpunit';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ExtensionContext, Uri, workspace } from 'vscode';
import { createExtensionContext } from '../../../fakes/extensionContext';
import { openWorkspace } from '../../../fakes/openWorkspace';
import { phpUnitFixture } from '../../../test-support/fixtures';
import { childIds, childLabels, countItems, findItem } from '../../../test-support/testItems';
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

    describe('test discovery', () => {
        it('includes test methods of a trait whose file does not match the testsuite suffix', async () => {
            const extension = await activateExtension(context);
            await extension.resolve();

            expect(
                childLabels(
                    extension.controller.items,
                    'Shared Trait User (Tests\\SharedTraitUser)',
                ),
            ).toEqual([
                `${icon(TestType.method)} test_from_shared_trait`,
                `${icon(TestType.method)} test_own`,
            ]);
        });

        it('gives inherited and trait test methods the id of the class PHPUnit runs them on', async () => {
            const extension = await activateExtension(context);
            const { controller } = extension;
            await extension.resolve();

            expect(
                childIds(controller.items, 'Concrete From Abstract (Tests\\ConcreteFromAbstract)'),
            ).toEqual(['Concrete From Abstract (Tests\\ConcreteFromAbstract)::Abstract']);
            expect(
                childIds(controller.items, 'Concrete With Own (Tests\\ConcreteWithOwn)'),
            ).toEqual([
                'Concrete With Own (Tests\\ConcreteWithOwn)::Abstract',
                'Concrete With Own (Tests\\ConcreteWithOwn)::Own method',
            ]);
            expect(
                childIds(controller.items, 'Shared Trait User (Tests\\SharedTraitUser)'),
            ).toEqual([
                'Shared Trait User (Tests\\SharedTraitUser)::From shared trait',
                'Shared Trait User (Tests\\SharedTraitUser)::Own',
            ]);
            expect(childIds(controller.items, 'Use Trait (Tests\\SubFolder\\UseTrait)')).toEqual([
                'Use Trait (Tests\\SubFolder\\UseTrait)::From another',
                'Use Trait (Tests\\SubFolder\\UseTrait)::From trait',
                'Use Trait (Tests\\SubFolder\\UseTrait)::Shared',
                'Use Trait (Tests\\SubFolder\\UseTrait)::Shared alias',
                'Use Trait (Tests\\SubFolder\\UseTrait)::Use trait',
            ]);
        });

        it('includes test methods inherited through a parent class from vendor', async () => {
            const extension = await activateExtension(context);
            await extension.resolve();

            expect(
                childLabels(
                    extension.controller.items,
                    'Extends Vendor Base (Tests\\ExtendsVendorBase)',
                ),
            ).toEqual([
                `${icon(TestType.method)} test_from_vendor_base`,
                `${icon(TestType.method)} test_own`,
            ]);
        });

        it('includes a class whose only tests come from a parent class from vendor', async () => {
            const extension = await activateExtension(context);
            await extension.resolve();

            expect(
                childLabels(
                    extension.controller.items,
                    'Only Inherits Vendor Base (Tests\\OnlyInheritsVendorBase)',
                ),
            ).toEqual([`${icon(TestType.method)} test_from_vendor_base`]);
        });

        it('ignores test classes in files without the default Test.php suffix', async () => {
            const extension = await activateExtension(context);
            await extension.resolve();

            expect(
                findItem(
                    extension.controller.items,
                    'Without Suffix Case (Tests\\WithoutSuffixCase)',
                ),
            ).toBeUndefined();
            expect(
                findItem(extension.controller.items, 'Assertions (Tests\\Assertions)'),
            ).toBeDefined();
        });

        it('includes test methods of a trait loaded with require_once', async () => {
            const extension = await activateExtension(context);
            await extension.resolve();

            expect(
                childLabels(extension.controller.items, 'Require Trait (Tests\\RequireTrait)'),
            ).toEqual([
                `${icon(TestType.method)} test_from_required_trait`,
                `${icon(TestType.method)} test_own`,
            ]);
        });

        it('resolves every test including data provider data sets', async () => {
            const extension = await activateExtension(context);

            const { controller } = extension;

            await extension.resolve();

            expect(countItems(controller.items)).toEqual(110);

            const annotationMulti = findItem(
                controller.items,
                'Data Provider Annotation (Tests\\DataProviderAnnotation)::Multi provider',
            );
            expect(annotationMulti).toBeDefined();
            const annotationChildIds: string[] = [];
            for (const [id] of annotationMulti?.children ?? []) {
                annotationChildIds.push(id);
            }
            expect(annotationChildIds).toEqual([
                'Data Provider Annotation (Tests\\DataProviderAnnotation)::Multi provider with data set "one plus one"',
                'Data Provider Annotation (Tests\\DataProviderAnnotation)::Multi provider with data set #0',
            ]);

            const attributeMulti = findItem(
                controller.items,
                'Data Provider Attribute (Tests\\DataProviderAttribute)::Multi provider',
            );
            expect(attributeMulti).toBeDefined();
            const attributeChildIds: string[] = [];
            for (const [id] of attributeMulti?.children ?? []) {
                attributeChildIds.push(id);
            }
            expect(attributeChildIds).toEqual([
                'Data Provider Attribute (Tests\\DataProviderAttribute)::Multi provider with data set "one plus one"',
                'Data Provider Attribute (Tests\\DataProviderAttribute)::Multi provider with data set #0',
            ]);

            const forLoopProvider = findItem(
                controller.items,
                'Data Provider Loop (Tests\\DataProviderLoop)::For loop provider',
            );
            expect(forLoopProvider).toBeDefined();
            const forLoopChildIds: string[] = [];
            for (const [id] of forLoopProvider?.children ?? []) {
                forLoopChildIds.push(id);
            }
            expect(forLoopChildIds).toEqual([
                'Data Provider Loop (Tests\\DataProviderLoop)::For loop provider with data set "case 0"',
                'Data Provider Loop (Tests\\DataProviderLoop)::For loop provider with data set "case 1"',
                'Data Provider Loop (Tests\\DataProviderLoop)::For loop provider with data set "case 2"',
            ]);

            const foreachArrayProvider = findItem(
                controller.items,
                'Data Provider Loop (Tests\\DataProviderLoop)::Foreach array provider',
            );
            expect(foreachArrayProvider).toBeDefined();
            const foreachArrayChildIds: string[] = [];
            for (const [id] of foreachArrayProvider?.children ?? []) {
                foreachArrayChildIds.push(id);
            }
            expect(foreachArrayChildIds).toEqual([
                'Data Provider Loop (Tests\\DataProviderLoop)::Foreach array provider with data set "alpha"',
                'Data Provider Loop (Tests\\DataProviderLoop)::Foreach array provider with data set "beta"',
                'Data Provider Loop (Tests\\DataProviderLoop)::Foreach array provider with data set "gamma"',
            ]);

            const foreachConstProvider = findItem(
                controller.items,
                'Data Provider Loop (Tests\\DataProviderLoop)::Foreach const provider',
            );
            expect(foreachConstProvider).toBeDefined();
            const foreachConstChildIds: string[] = [];
            for (const [id] of foreachConstProvider?.children ?? []) {
                foreachConstChildIds.push(id);
            }
            expect(foreachConstChildIds).toEqual([
                'Data Provider Loop (Tests\\DataProviderLoop)::Foreach const provider with data set "alpha"',
                'Data Provider Loop (Tests\\DataProviderLoop)::Foreach const provider with data set "beta"',
                'Data Provider Loop (Tests\\DataProviderLoop)::Foreach const provider with data set "gamma"',
            ]);
        });

        it('resolves the tests of a folder without phpunit.xml', async () => {
            const testsRoot = phpUnitFixture.testsFolder;
            await openWorkspace({ root: testsRoot, settings: { args: [] } });

            const extension = await activateExtension(context);

            const { controller } = extension;

            await extension.resolve();

            expect(countItems(controller.items)).toEqual(117);
        });

        it('resolves the tests of the phpunit.xml.dist given with -c', async () => {
            await workspace
                .getConfiguration('phpunit', Uri.file(root))
                .update('args', ['-c', phpUnitFixture.phpUnitXmlDist]);

            const extension = await activateExtension(context);

            const { controller } = extension;

            await extension.resolve();

            expect(countItems(controller.items)).toEqual(12);
        });

        it('refresh rebuilds the tree from the current settings', async () => {
            const extension = await activateExtension(context);

            const { controller } = extension;

            await workspace
                .getConfiguration('phpunit', Uri.file(root))
                .update('args', ['-c', phpUnitFixture.phpUnitXmlDist]);
            await extension.refresh();

            expect(countItems(controller.items)).toEqual(12);
        });
    });
});
