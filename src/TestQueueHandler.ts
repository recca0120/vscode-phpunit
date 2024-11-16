import { TestItem, TestItemCollection, TestRun, TestRunRequest } from 'vscode';
import { Command, TestDefinition, TestRunner } from './PHPUnit';
import { TestCollection } from './TestCollection';

export class TestQueueHandler {
    public queue: { testItem: TestItem }[] = [];

    constructor(private testCollection: TestCollection, private request: TestRunRequest, private run: TestRun) {
    }

    public async discoverTests(testItems: Iterable<TestItem>) {
        for (const testItem of testItems) {
            if (this.request.exclude?.includes(testItem)) {
                continue;
            }

            if (!testItem.canResolveChildren) {
                this.run.enqueued(testItem);
                this.queue.push({ testItem: testItem });
            } else {
                await this.discoverTests(this.gatherTestItems(testItem.children));
            }
        }
    }

    public async runQueue(runner: TestRunner, command: Command) {
        if (!this.request.include) {
            return runner.run(command);
        }

        return await Promise.all(
            this.request.include.map((testItem) =>
                runner.run(command.setArguments(this.parseArguments(testItem))),
            ),
        );
    }

    private parseArguments(testItem: TestItem): string {
        if (!testItem.uri) {
            return this.parseNamespaceFilter(testItem);
        }

        if (!testItem.parent) {
            return testItem.uri.fsPath;
        }

        const testDefinition = this.testCollection.findTest(testItem.id);

        return testDefinition
            ? `${this.parseDependsFilter(testDefinition) ?? ''} ${encodeURIComponent(testDefinition.file)}`
            : '';
    }

    private parseNamespaceFilter(testItem: TestItem) {
        return `--filter '^(${testItem.id.replace(/^namespace:/, '').replace(/\\/g, '\\\\')}.*)( with data set .*)?$'`;
    }

    private parseDependsFilter(testDefinition: TestDefinition) {
        const deps = [testDefinition.method, ...(testDefinition.annotations.depends ?? [])].join('|');

        return testDefinition.children.length > 0 ? '' : `--filter '^.*::(${deps})( with data set .*)?$'`;
    }

    private gatherTestItems(collection: TestItemCollection) {
        const items: TestItem[] = [];
        collection.forEach((item) => items.push(item));

        return items;
    }
}