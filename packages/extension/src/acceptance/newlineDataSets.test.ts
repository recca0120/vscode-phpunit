import { join } from 'node:path';
import { initTreeSitter } from '@vscode-phpunit/phpunit';
import { fixturePath } from '@vscode-phpunit/phpunit/testing';
import { afterEach, beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import type { ExtensionContext, TestItem } from 'vscode';
import { createExtensionContext } from '../../fakes/extensionContext';
import { openWorkspace } from '../../fakes/openWorkspace';
import { childIds } from '../../test-support/testItems';
import { activateExtension } from './harness';
import { stubs } from './support';

const method = 'Newline Data Set (Regressions\\NewlineDataSet)::Key';

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
                args: ['-c', join(root, 'newline-datasets/phpunit.xml')],
            },
        });
    });
    afterEach(() => vi.clearAllMocks());

    describe('a data set key with a newline', () => {
        it('passes the listed data set PHPUnit reports', async () => {
            const extension = await activateExtension(context);
            await extension.resolve();
            const { items } = extension.controller;
            const dataSets = [
                `${method} with data set "first\nsecond"`,
                `${method} with data set "plain"`,
            ];
            expect(childIds(items, method)).toEqual(dataSets);

            await extension.run();

            expect(childIds(items, method)).toEqual(dataSets);
            const passed = (extension.testRuns()[0].passed as Mock).mock.calls.map(
                ([item]) => (item as TestItem).id,
            );
            expect(passed).toEqual(expect.arrayContaining(dataSets));
        });
    });
});
