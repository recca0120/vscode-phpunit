import { inject, injectable } from 'inversify';
import type { TestItem, TestItemCollection, TestRun, TestRunRequest } from 'vscode';
import { TestType } from '../PHPUnit';
import { TestCollection } from '../TestCollection';
import type { TestDefinition } from '../PHPUnit';

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
            if (testDef?.type === TestType.method) {
                queue.set(testDef, testItem);
                testRun?.enqueued(testItem);
            } else {
                await this.build(this.toArray(testItem.children), request, queue, testRun);
            }
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
        collection.forEach((item) => items.push(item));
        return items;
    }
}
