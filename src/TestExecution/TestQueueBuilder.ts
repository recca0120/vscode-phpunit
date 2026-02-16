import { inject, injectable } from 'inversify';
import type { TestItem, TestItemCollection, TestRunRequest } from 'vscode';
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
    ): Promise<Map<TestDefinition, TestItem>> {
        for (const testItem of tests) {
            if (request.exclude?.includes(testItem)) {
                continue;
            }

            const testDef = this.testCollection.getTestDefinition(testItem);
            if (testDef?.type === TestType.method) {
                queue.set(testDef, testItem);
            } else {
                await this.build(this.collectItems(testItem.children), request, queue);
            }
        }

        return queue;
    }

    collectItems(collection: TestItemCollection): TestItem[] {
        const testItems: TestItem[] = [];
        collection.forEach((testItem) => testItems.push(testItem));

        return testItems;
    }
}
