import {
    ChainAstParser,
    ClassHierarchy,
    generateXML,
    PHPUnitXML,
    PhpParserAstParser,
    phpUnitProject,
    TestParser,
    TreeSitterAstParser,
} from '@vscode-phpunit/phpunit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type TestController, type TestRun, tests } from 'vscode';
import { URI } from 'vscode-uri';
import { TestCollection } from '../TestCollection';
import { TestQueueBuilder } from './TestQueueBuilder';

describe('TestQueueBuilder', () => {
    let ctrl: TestController;
    let collection: TestCollection;
    let builder: TestQueueBuilder;
    const phpUnitXML = new PHPUnitXML();

    beforeEach(() => {
        ctrl = tests.createTestController('phpunit', 'PHPUnit');
        phpUnitXML.load(
            generateXML(`
                <testsuites>
                    <testsuite name="default">
                        <directory>tests</directory>
                    </testsuite>
                </testsuites>`),
            phpUnitProject('phpunit.xml'),
        );
        const classHierarchy = new ClassHierarchy();
        const astParser = new ChainAstParser([new TreeSitterAstParser(), new PhpParserAstParser()]);
        const testParser = new TestParser(phpUnitXML, astParser);
        collection = new TestCollection(ctrl, phpUnitXML, testParser, classHierarchy);
        builder = new TestQueueBuilder(collection);
    });

    it('should enqueue test items during build when testRun is provided', async () => {
        await collection.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

        const testRun = { enqueued: vi.fn() } as unknown as TestRun;
        const request = {
            include: [...toArray(ctrl.items)],
        } as unknown as import('vscode').TestRunRequest;
        const queue = await builder.build(request.include ?? [], request, undefined, testRun);

        expect(queue.size).toBeGreaterThan(0);
        expect(testRun.enqueued).toHaveBeenCalledTimes(queue.size);
        for (const testItem of queue.values()) {
            expect(testRun.enqueued).toHaveBeenCalledWith(testItem);
        }
    });

    it('should work without testRun (backward compatible)', async () => {
        await collection.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

        const request = {
            include: [...toArray(ctrl.items)],
        } as unknown as import('vscode').TestRunRequest;
        const queue = await builder.build(request.include ?? [], request);

        expect(queue.size).toBeGreaterThan(0);
    });

    it('should enqueue via buildFromCollection', async () => {
        await collection.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

        const testRun = { enqueued: vi.fn() } as unknown as TestRun;
        const request = {} as unknown as import('vscode').TestRunRequest;
        const queue = await builder.buildFromCollection(ctrl.items, request, testRun);

        expect(queue.size).toBeGreaterThan(0);
        expect(testRun.enqueued).toHaveBeenCalledTimes(queue.size);
    });

    it('should exclude items in request.exclude', async () => {
        await collection.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

        const allItems = [...toArray(ctrl.items)];
        // Get first method item to exclude
        const methods: import('vscode').TestItem[] = [];
        for (const [, ns] of ctrl.items) {
            for (const [, cls] of ns.children) {
                for (const [, m] of cls.children) {
                    methods.push(m);
                }
            }
        }
        const excluded = methods[0];

        const testRun = { enqueued: vi.fn() } as unknown as TestRun;
        const request = {
            include: allItems,
            exclude: [excluded],
        } as unknown as import('vscode').TestRunRequest;
        const queue = await builder.build(request.include ?? [], request, undefined, testRun);

        const queueIds = [...queue.values()].map((item) => item.id);
        expect(queueIds).not.toContain(excluded.id);
    });
});

function toArray(collection: import('vscode').TestItemCollection): import('vscode').TestItem[] {
    const items: import('vscode').TestItem[] = [];
    for (const [, item] of collection) {
        items.push(item);
    }
    return items;
}
