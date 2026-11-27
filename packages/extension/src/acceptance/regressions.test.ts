import { join } from 'node:path';
import { initTreeSitter } from '@vscode-phpunit/phpunit';
import { fixturePath } from '@vscode-phpunit/phpunit/testing';
import { afterEach, beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import type { ExtensionContext, TestItem, TestItemCollection } from 'vscode';
import { createExtensionContext } from '../../fakes/extensionContext';
import { openWorkspace } from '../../fakes/openWorkspace';
import { activateAndRun, stubs } from './support';

const leafIds = (items: TestItemCollection): string[] => {
    const ids: string[] = [];
    items.forEach((item: TestItem) => {
        ids.push(...(item.children.size > 0 ? leafIds(item.children) : [item.id]));
    });
    return ids;
};

const passedIds = (passed: Mock) => passed.mock.calls.map(([item]) => (item as TestItem).id);

describe.each(stubs.phpUnit)('regression fixtures on PHPUnit $name', ({ binary }) => {
    const root = fixturePath('phpunit-regressions');
    let context: ExtensionContext;

    beforeAll(async () => initTreeSitter());

    beforeEach(async () => {
        context = createExtensionContext();
        await openWorkspace({
            root,
            settings: {
                php: 'php',
                phpunit: `../phpunit-stub/${binary}`,
                args: ['-c', join(root, 'regressions/phpunit.xml')],
            },
        });
    });
    afterEach(() => vi.clearAllMocks());

    it('every test item the extension discovers passes when PHPUnit runs it', async () => {
        const extension = await activateAndRun(context);
        const { passed, failed } = extension.testRuns()[0];
        const discovered = leafIds(extension.controller.items);

        expect(discovered).toHaveLength(14);
        expect(passedIds(passed as Mock)).toEqual(expect.arrayContaining(discovered));
        expect(failed).not.toHaveBeenCalled();
    });
});

describe.each(stubs.pest)('regression fixtures on Pest $name', ({ name, root, binary }) => {
    let context: ExtensionContext;

    beforeAll(async () => initTreeSitter());

    beforeEach(async () => {
        context = createExtensionContext();
        await openWorkspace({
            root,
            settings: {
                php: 'php',
                phpunit: binary,
                args: [
                    '-c',
                    join(root, `${name}/phpunit.regressions.xml`),
                    '--test-directory=../tests',
                ],
            },
        });
    });
    afterEach(() => vi.clearAllMocks());

    it('every test item the extension discovers passes when Pest runs it', async () => {
        const extension = await activateAndRun(context);
        const { passed, failed } = extension.testRuns()[0];
        const discovered = leafIds(extension.controller.items);

        expect(discovered).toHaveLength(1);
        expect(passedIds(passed as Mock)).toEqual(expect.arrayContaining(discovered));
        expect(failed).not.toHaveBeenCalled();
    });
});
