import { Position, Range, TestController, TestItem, Uri } from 'vscode';
import { URI } from 'vscode-uri';
import {
    Command,
    File,
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

class TestHierarchyBuilder {
    private readonly ancestors: [{ item: TestItem, type: TestType, children: TestItem[] }];

    constructor(private ctrl: TestController) {
        this.ancestors = [{
            item: this.createProxyTestController(), type: TestType.namespace, children: [],
        }];
    }

    ascend(depth: number) {
        while (this.ancestors.length > depth) {
            const finished = this.ancestors.pop()!;
            if (finished.type === TestType.method) {
                finished.item.children.replace(finished.children);
                continue;
            }

            for (const child of finished.children) {
                finished.item.children.add(child);
            }
        }
    };

    addTestItem(testDefinition: TestDefinition, sortText: string) {
        const testItem = this.createTestItem(testDefinition, sortText);
        const parent = this.ancestors[this.ancestors.length - 1];
        parent.children.push(testItem);

        if (testDefinition.type !== TestType.method) {
            this.ancestors.push({ item: testItem, type: testDefinition.type, children: [] });
        }

        return testItem;
    }

    private createTestItem(testDefinition: TestDefinition, sortText: string) {
        let testItem: TestItem | undefined;
        if (testDefinition.type === TestType.namespace) {
            testItem = this.ctrl.items.get(testDefinition.id);
            if (!testItem) {
                testItem = this.ctrl.createTestItem(testDefinition.id, testDefinition.label);
                testItem.canResolveChildren = true;
                testItem.sortText = sortText;
            }

            return testItem;
        }

        testItem = this.ctrl.createTestItem(testDefinition.id, testDefinition.label, Uri.file(testDefinition.file!));
        if (testDefinition.type === TestType.class) {
            testItem.canResolveChildren = true;
        }

        testItem.sortText = sortText;
        testItem.range = this.createRange(testDefinition as any);

        return testItem;
    }

    private createRange(testDefinition: TestDefinition) {
        return new Range(
            new Position(testDefinition.start!.line - 1, testDefinition.start!.character),
            new Position(testDefinition.end!.line - 1, testDefinition.end!.character),
        );
    }

    private createProxyTestController() {
        return new Proxy(this.ctrl, {
            get(target: any, prop) {
                return prop === 'children' ? target.items : target[prop];
            },
        }) as TestItem;
    }
}

export class TestCollection extends BaseTestCollection {
    private testItems = new Map<string, Map<string, CustomWeakMap<TestItem, TestCase>>>();

    constructor(private ctrl: TestController, phpUnitXML: PHPUnitXML) {
        super(phpUnitXML);
    }

    getTestCase(test: TestItem): TestCase | undefined {
        for (const [, testData] of this.getTestItems()) {
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

    reset() {
        for (const [, testData] of this.getTestItems()) {
            for (const [testItem] of testData) {
                testItem.parent ? testItem.parent.children.delete(testItem.id) : this.ctrl.items.delete(testItem.id);
            }
        }

        return super.reset();
    }

    protected deleteFile(file: File<TestDefinition>) {
        this.findTestsByFile(URI.file(file.file)).forEach((testItem) => {
            testItem.parent ? testItem.parent.children.delete(testItem.id) : this.ctrl.items.delete(testItem.id);
        });

        return super.deleteFile(file);
    }

    protected async parseTests(uri: URI) {
        const testData = this.getTestData(uri);

        const testParser = new TestParser();
        const testHierarchyBuilder = new TestHierarchyBuilder(this.ctrl);
        testParser.on(TestType.method, (testDefinition, index) => {
            const test = testHierarchyBuilder.addTestItem(testDefinition, `${index}`);
            testData.set(test, new TestCase(testDefinition));
            testDefinitions.push(testDefinition);
        });
        testParser.on(TestType.class, (testDefinition) => {
            testHierarchyBuilder.ascend(2);

            const test = testHierarchyBuilder.addTestItem(testDefinition, testDefinition.id);
            testData.set(test, new TestCase(testDefinition));
            testDefinitions.push(testDefinition);
        });
        testParser.on(TestType.namespace, (testDefinition) => {
            testHierarchyBuilder.ascend(1);

            const test = testHierarchyBuilder.addTestItem(testDefinition, testDefinition.id);
            testData.set(test, new TestCase(testDefinition));
            testDefinitions.push(testDefinition);
        });

        const testDefinitions: TestDefinition[] = [];
        testParser.on(TestType.method, (testDefinition) => testDefinitions.push(testDefinition));
        testParser.on(TestType.class, (testDefinition) => testDefinitions.push(testDefinition));
        testParser.on(TestType.namespace, (testDefinition) => testDefinitions.push(testDefinition));
        await testParser.parseFile(uri.fsPath);

        testHierarchyBuilder.ascend(0);

        return testDefinitions;
    }

    private getTestData(uri: URI) {
        const testData = this.getTestItems();
        if (!testData.has(uri.fsPath)) {
            testData.set(uri.fsPath, new CustomWeakMap<TestItem, TestCase>());
        }

        return testData.get(uri.fsPath)!;
    }

    private getTestItems() {
        const workspace = this.getWorkspace();
        if (!this.testItems.has(workspace)) {
            this.testItems.set(workspace, new Map<string, CustomWeakMap<TestItem, TestCase>>());
        }

        return this.testItems.get(workspace)!;
    }
}