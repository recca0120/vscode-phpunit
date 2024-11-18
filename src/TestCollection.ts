import { Position, Range, TestController, TestItem, Uri } from 'vscode';
import { URI } from 'vscode-uri';
import {
    Command,
    PHPUnitXML,
    TestCollection as BaseTestCollection,
    TestDefinition,
    TestParser,
    TestRunner,
    TestType,
} from './PHPUnit';
import { CustomWeakMap } from './PHPUnit/utils';

const inRange = (test: TestItem, testCase: TestCase, position: Position) => {
    return testCase.type !== TestType.method
        ? false
        : position.line >= test.range!.start.line && position.line <= test.range!.end.line;
};

export class TestCase {
    constructor(private testDefinition: TestDefinition) {}

    get type() {
        return this.testDefinition.type;
    }

    async run(runner: TestRunner, command: Command): Promise<unknown> {
        return runner.run(command.setArguments(this.parseArguments()));
    }

    private parseArguments(): string {
        if (this.testDefinition.type === TestType.namespace) {
            return this.parseNamespaceFilter();
        }

        if (this.testDefinition.type === TestType.class) {
            return this.testDefinition.file!;
        }

        return [
            this.parseDependsFilter(),
            this.testDefinition.file ? encodeURIComponent(this.testDefinition.file) : undefined,
        ].filter((value) => !!value).join(' ');
    }

    private parseNamespaceFilter() {
        return `--filter '^(${this.testDefinition.id.replace(/^namespace:/, '').replace(/\\/g, '\\\\')}.*)( with data set .*)?$'`;
    }

    private parseDependsFilter() {
        const deps = [this.testDefinition.method, ...(this.testDefinition.annotations?.depends ?? [])].join('|');

        return !!this.testDefinition.children && this.testDefinition.children.length > 0 ? '' : `--filter '^.*::(${deps})( with data set .*)?$'`;
    }
}

export class TestCollection extends BaseTestCollection {
    private testData = new Map<string, CustomWeakMap<TestItem, TestCase>>();

    constructor(private ctrl: TestController, phpUnitXML: PHPUnitXML, testParser: TestParser) {
        super(phpUnitXML, testParser);
    }

    getTestCase(test: TestItem): TestCase | undefined {
        for (const [, testData] of this.testData) {
            const testCase = testData.get(test);
            if (testCase) {
                return testCase;
            }
        }

        return;
    }

    findTestsByFile(uri: URI): TestItem[] {
        const tests = [] as TestItem[];
        for (const [test, testCase] of this.getTestData(uri)) {
            if (testCase.type === TestType.class) {
                tests.push(test);
            }
        }

        return tests;
    }

    findTestByPosition(uri: URI, position: Position): TestItem | undefined {
        for (const [test, testCase] of this.getTestData(uri)) {
            if (inRange(test, testCase, position)) {
                return test;
            }
        }

        return;
    }

    delete(uri: URI) {
        this.findTestsByFile(uri).forEach((test) => {
            if (test.parent) {
                test.parent.children.delete(test.id);
            } else {
                this.ctrl.items.delete(test.id);
            }
        });

        return super.delete(uri);
    }

    protected async parseTests(uri: URI) {
        const ancestors: [{ item: TestItem, type: TestType, children: TestItem[] }] = [{
            item: this.proxyCtrl(), type: TestType.namespace, children: [],
        }];

        const ascend = (depth: number) => {
            while (ancestors.length > depth) {
                const finished = ancestors.pop()!;
                if (finished.type === TestType.method) {
                    finished.item.children.replace(finished.children);
                    continue;
                }

                for (const child of finished.children) {
                    finished.item.children.add(child);
                }
            }
        };
        const testData = this.getTestData(uri);

        const testDefinitions: TestDefinition[] = [];
        await this.testParser.parseFile(uri.fsPath, {
            [TestType.method]: (testDefinition, index) => {
                const test = this.createTestItem(testDefinition, `${index}`);
                testData.set(test, new TestCase(testDefinition));

                const parent = ancestors[ancestors.length - 1];
                parent.children.push(test);
                testDefinitions.push(testDefinition);
            },
            [TestType.class]: (testDefinition) => {
                ascend(2);

                const test = this.createTestItem(testDefinition, testDefinition.id);
                testData.set(test, new TestCase(testDefinition));

                const parent = ancestors[ancestors.length - 1];
                parent.children.push(test);
                ancestors.push({ item: test, type: testDefinition.type, children: [] });
                testDefinitions.push(testDefinition);
            },
            [TestType.namespace]: (testDefinition) => {
                ascend(1);

                const test = this.createTestItem(testDefinition, testDefinition.id);
                testData.set(test, new TestCase(testDefinition));

                const parent = ancestors[ancestors.length - 1];
                parent.children.push(test);
                ancestors.push({ item: test, type: testDefinition.type, children: [] });
                testDefinitions.push(testDefinition);
            },
        });
        ascend(0);

        return testDefinitions;
    }

    private getTestData(uri: URI) {
        if (!this.testData.has(uri.fsPath)) {
            this.testData.set(uri.fsPath, new CustomWeakMap<TestItem, TestCase>());
        }

        return this.testData.get(uri.fsPath)!;
    }

    private proxyCtrl() {
        return new Proxy(this.ctrl, {
            get(target: any, prop) {
                return prop === 'children' ? target.items : target[prop];
            },
        }) as TestItem;
    }

    private createTestItem(testDefinition: TestDefinition, sortText: string) {
        if (testDefinition.type === TestType.namespace) {
            let test = this.ctrl.items.get(testDefinition.id);
            if (!test) {
                test = this.ctrl.createTestItem(testDefinition.id, testDefinition.label);
                test.canResolveChildren = true;
                test.sortText = sortText;
            }

            return test;
        }

        const test = this.ctrl.createTestItem(testDefinition.id, testDefinition.label, Uri.file(testDefinition.file!));
        if (testDefinition.type === TestType.class) {
            test.canResolveChildren = true;
        }

        test.sortText = sortText;
        test.range = this.createRange(testDefinition as any);

        return test;
    }

    private createRange(testDefinition: TestDefinition) {
        return new Range(
            new Position(testDefinition.start!.line - 1, testDefinition.start!.character),
            new Position(testDefinition.end!.line - 1, testDefinition.end!.character),
        );
    }
}