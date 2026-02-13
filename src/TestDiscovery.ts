import { TestItem, TestItemCollection, TestRunRequest } from 'vscode';
import { TestType } from './PHPUnit';
import { TestCase, TestCollection } from './TestCollection';

export class TestDiscovery {
    constructor(private testCollection: TestCollection) {}

    async discover(
        tests: Iterable<TestItem>,
        request: TestRunRequest,
        queue = new Map<TestCase, TestItem>(),
    ): Promise<Map<TestCase, TestItem>> {
        for (const testItem of tests) {
            if (request.exclude?.includes(testItem)) {
                continue;
            }

            const testCase = this.testCollection.getTestCase(testItem);
            if (testCase?.type === TestType.method) {
                queue.set(testCase, testItem);
            } else {
                await this.discover(this.gatherTestItems(testItem.children), request, queue);
            }
        }

        return queue;
    }

    gatherTestItems(collection: TestItemCollection): TestItem[] {
        const testItems: TestItem[] = [];
        collection.forEach((testItem) => testItems.push(testItem));

        return testItems;
    }
}
