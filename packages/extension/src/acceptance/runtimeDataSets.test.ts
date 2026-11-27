import { join } from 'node:path';
import { initTreeSitter } from '@vscode-phpunit/phpunit';
import { fixturePath } from '@vscode-phpunit/phpunit/testing';
import { afterEach, beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import type { ExtensionContext, TestItem } from 'vscode';
import { createExtensionContext } from '../../fakes/extensionContext';
import { openWorkspace } from '../../fakes/openWorkspace';
import { childIds, findItem } from '../../test-support/testItems';
import { activateExtension } from './harness';
import { stubs } from './support';

const method = 'Runtime Data Set (Regressions\\RuntimeDataSet)::Runtime keys';

describe.each(stubs.phpUnit)('PHPUnit $name ($phpUnitVersion)', ({ binary }) => {
    const root = fixturePath('phpunit-regressions');
    let context: ExtensionContext;

    beforeAll(async () => initTreeSitter());

    beforeEach(async () => {
        context = createExtensionContext();
        await openWorkspace({
            root,
            settings: {
                php: 'php',
                phpunit: join(fixturePath('phpunit-stub'), binary),
                args: ['-c', join(root, 'runtime-datasets/phpunit.xml')],
            },
        });
    });
    afterEach(() => vi.clearAllMocks());

    describe('data sets only known when the test runs', () => {
        it('adds the data sets PHPUnit reports to the method and passes them', async () => {
            const extension = await activateExtension(context);
            await extension.resolve();
            const { items } = extension.controller;

            expect(childIds(items, method)).toEqual([]);

            await extension.run();

            const dataSets = [`${method} with data set "ba"`, `${method} with data set "dc"`];
            expect(childIds(items, method)).toEqual(dataSets);
            const passed = (extension.testRuns()[0].passed as Mock).mock.calls.map(
                ([item]) => (item as TestItem).id,
            );
            expect(passed).toEqual(expect.arrayContaining(dataSets));
            expect(findItem(items, method)).toBeDefined();
        });
    });
});
