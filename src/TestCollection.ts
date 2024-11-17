import { Position, Range, TestController, TestItem, Uri } from 'vscode';
import { URI } from 'vscode-uri';
import { PHPUnitXML, TestDefinition as BaseTestDefinition, TestParser } from './PHPUnit';
import { BaseTestCollection } from './PHPUnit/TestCollection';

export type TestDefinition = BaseTestDefinition & {
    testItem: TestItem
    parent?: TestDefinition;
    children: TestDefinition[]
}

export class TestCollection extends BaseTestCollection<TestDefinition> {
    constructor(private ctrl: TestController, phpUnitXML: PHPUnitXML, testParser: TestParser) {
        super(phpUnitXML, testParser);
    }

    delete(uri: URI) {
        this.findFile(uri)?.tests.forEach((test: TestDefinition) => {
            this.ctrl.items.delete(test.id);
        });

        return super.delete(uri);
    }

    protected async parseTests(uri: URI) {
        const ancestors: [{ item: TestController | TestItem, children: TestItem[] }] = [{
            item: this.ctrl, children: [],
        }];

        const ascend = (depth: number) => {
            while (ancestors.length > depth) {
                const finished = ancestors.pop()!;
                if (finished.item.hasOwnProperty('items')) {
                    for (const child of finished.children) {
                        (finished.item as TestController).items.add(child);
                    }
                } else if (finished.item.hasOwnProperty('children')) {
                    for (const child of finished.children) {
                        (finished.item as TestItem).children.add(child);
                    }
                }
            }
        };

        const testDefinitions: TestDefinition[] = [];
        await this.testParser.parseFile(uri.fsPath, {
            onMethod: (testDefinition, index) => {
                const parent = ancestors[ancestors.length - 1];

                const test = this.ctrl.createTestItem(testDefinition.id, testDefinition.label, Uri.file(testDefinition.file!));
                test.sortText = `${index}`;
                test.range = new Range(
                    new Position(testDefinition.start!.line - 1, testDefinition.start!.character),
                    new Position(testDefinition.end!.line - 1, testDefinition.end!.character),
                );

                parent.children.push(test);

                testDefinitions.push(Object.assign(this.convertTest(testDefinition), {
                    testItem: test,
                }));
            },
            onClass: (testDefinition) => {
                ascend(2);
                const parent = ancestors[ancestors.length - 1];

                const suite = this.ctrl.createTestItem(testDefinition.id, testDefinition.label, Uri.file(testDefinition.file!));
                suite.sortText = testDefinition.id;
                suite.canResolveChildren = true;
                suite.range = new Range(
                    new Position(testDefinition.start!.line - 1, testDefinition.start!.character),
                    new Position(testDefinition.end!.line - 1, testDefinition.end!.character),
                );

                parent.children.push(suite);
                ancestors.push({ item: suite, children: [] });
                testDefinitions.push(Object.assign(this.convertTest(testDefinition), {
                    testItem: suite,
                }));
            },
            onNamespace: (testDefinition) => {
                ascend(1);
                const parent = ancestors[ancestors.length - 1];

                let namespace = this.ctrl.items.get(testDefinition.id);
                if (!namespace) {
                    namespace = this.ctrl.createTestItem(testDefinition.id, testDefinition.label);
                }
                namespace.canResolveChildren = true;

                parent.children.push(namespace);
                ancestors.push({ item: namespace, children: [] });
                testDefinitions.push(Object.assign(this.convertTest(testDefinition), {
                    testItem: namespace,
                }));
            },
        });
        ascend(0);

        return testDefinitions;
    }

    protected convertTest(testDefinition: BaseTestDefinition) {
        return testDefinition as any;
    }
}