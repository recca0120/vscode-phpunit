import { type TestDefinition, TestType } from '@vscode-phpunit/phpunit';
import { inject, injectable } from 'inversify';
import type { TestItem, TestItemCollection, TestRun, TestRunRequest } from 'vscode';
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
            if (testDef?.type !== TestType.method && testDef?.type !== TestType.dataset) {
                await this.build(
                    [...testItem.children].map(([, item]) => item),
                    request,
                    queue,
                    testRun,
                );
                continue;
            }

            queue.set(testDef, testItem);
            testRun?.enqueued(testItem);

            if (testDef.type === TestType.method && testItem.children.size > 0) {
                await this.build(
                    [...testItem.children].map(([, item]) => item),
                    request,
                    queue,
                    testRun,
                );
            }
        }

        return queue;
    }

    buildFromCollection(
        collection: TestItemCollection,
        request: TestRunRequest,
        testRun?: TestRun,
    ): Promise<Map<TestDefinition, TestItem>> {
        return this.build(
            [...collection].map(([, item]) => item),
            request,
            undefined,
            testRun,
        );
    }
}
