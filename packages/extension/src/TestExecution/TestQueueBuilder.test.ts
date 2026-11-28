import {
    ChainAstParser,
    PHPUnitXML,
    PhpParserAstParser,
    TestIndex,
    TestParser,
    TestType,
    TreeSitterAstParser,
} from '@vscode-phpunit/phpunit';
import { generateXML, phpUnitProject } from '@vscode-phpunit/phpunit/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { type TestController, TestRunRequest, tests } from 'vscode';
import { URI } from 'vscode-uri';
import { childrenOf } from '../../test-support/testItems';
import { TestTree } from '../TestTree';
import { TestQueueBuilder } from './TestQueueBuilder';

describe('TestQueueBuilder', () => {
    let ctrl: TestController;
    let testTree: TestTree;
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
        const astParser = new ChainAstParser([new TreeSitterAstParser(), new PhpParserAstParser()]);
        const testParser = new TestParser(phpUnitXML, astParser);
        testTree = new TestTree(ctrl, phpUnitXML, new TestIndex(phpUnitXML, testParser));
        builder = new TestQueueBuilder(testTree);
    });

    it('should enqueue test items during build when testRun is provided', async () => {
        await testTree.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

        const testRun = ctrl.createTestRun(new TestRunRequest());
        const request = new TestRunRequest(childrenOf(ctrl.items));
        const queue = await builder.build(request.include ?? [], request, undefined, testRun);

        expect(queue.size).toBeGreaterThan(0);
        expect(testRun.enqueued).toHaveBeenCalledTimes(queue.size);
        for (const testItem of queue.values()) {
            expect(testRun.enqueued).toHaveBeenCalledWith(testItem);
        }
    });

    it('should work without testRun (backward compatible)', async () => {
        await testTree.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

        const request = new TestRunRequest(childrenOf(ctrl.items));
        const queue = await builder.build(request.include ?? [], request);

        expect(queue.size).toBeGreaterThan(0);
    });

    it('should enqueue via buildFromCollection', async () => {
        await testTree.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

        const testRun = ctrl.createTestRun(new TestRunRequest());
        const request = new TestRunRequest();
        const queue = await builder.buildFromCollection(ctrl.items, request, testRun);

        expect(queue.size).toBeGreaterThan(0);
        expect(testRun.enqueued).toHaveBeenCalledTimes(queue.size);
    });

    it('should enqueue dataset children when a method with datasets is queued', async () => {
        await testTree.add(URI.file(phpUnitProject('tests/DataProviderAttributeTest.php')));

        let methodItem: import('vscode').TestItem | undefined;
        for (const [, ns] of ctrl.items) {
            for (const [, cls] of ns.children) {
                for (const [, m] of cls.children) {
                    if (m.children.size > 0) {
                        methodItem = m;
                        break;
                    }
                }
            }
        }
        if (!methodItem) {
            throw new Error('Expected a method TestItem with dataset children');
        }
        expect(methodItem.children.size).toBeGreaterThan(0);

        const testRun = ctrl.createTestRun(new TestRunRequest());
        const include = [methodItem];
        const request = new TestRunRequest(include);
        const queue = await builder.build(include, request, undefined, testRun);

        const types = [...queue.keys()].map((def) => def.type);
        expect(types).toContain(TestType.dataset);
        expect(queue.size).toBeGreaterThan(1);
    });

    it('should exclude items in request.exclude', async () => {
        await testTree.add(URI.file(phpUnitProject('tests/AssertionsTest.php')));

        const allItems = childrenOf(ctrl.items);
        const methods: import('vscode').TestItem[] = [];
        for (const [, ns] of ctrl.items) {
            for (const [, cls] of ns.children) {
                for (const [, m] of cls.children) {
                    methods.push(m);
                }
            }
        }
        const excluded = methods[0];

        const testRun = ctrl.createTestRun(new TestRunRequest());
        const request = new TestRunRequest(allItems, [excluded]);
        const queue = await builder.build(request.include ?? [], request, undefined, testRun);

        const queueIds = [...queue.values()].map((item) => item.id);
        expect(queueIds).not.toContain(excluded.id);
    });
});
