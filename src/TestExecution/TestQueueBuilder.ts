import { inject, injectable } from 'inversify';
import type { TestItem, TestItemCollection, TestRun, TestRunRequest } from 'vscode';
import type { TestDefinition } from '../PHPUnit';
import { TestType } from '../PHPUnit';
import { TestCollection } from '../TestCollection';

@injectable()
export class TestQueueBuilder {
    constructor(@inject(TestCollection) private testCollection: TestCollection) {}

    async build(
        tests: Iterable<TestItem>,
        request: TestRunRequest,
        queue = new Map<TestDefinition, TestItem>(),
        testRun?: TestRun,
    ): Promise<Map<TestDefinition, TestItem>> {
        for (const testItem of tests) {
            if (request.exclude?.includes(testItem)) {
                continue;
            }

            const testDef = this.testCollection.getTestDefinition(testItem);
            if (testDef?.type !== TestType.method) {
                await this.build(this.toArray(testItem.children), request, queue, testRun);
                continue;
            }

            queue.set(testDef, testItem);
            testRun?.enqueued(testItem);
        }

        return queue;
    }

    buildFromCollection(
        collection: TestItemCollection,
        request: TestRunRequest,
        testRun?: TestRun,
    ): Promise<Map<TestDefinition, TestItem>> {
        return this.build(this.toArray(collection), request, undefined, testRun);
    }

    private toArray(collection: TestItemCollection): TestItem[] {
        const items: TestItem[] = [];
        for (const [, item] of collection) {
            items.push(item);
        }
        return items;
    }
}
