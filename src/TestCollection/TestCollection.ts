import { Position, TestController, TestItem } from 'vscode';
import { URI } from 'vscode-uri';
import {
    CommandBuilder,
    File,
    PHPUnitXML,
    TestCollection as BaseTestCollection,
    TestDefinition,
    TestDefinitionBuilder,
    TestParser,
    TestType,
} from '../PHPUnit';
import { CustomWeakMap } from '../PHPUnit/utils';
import { TestHierarchyBuilder } from './TestHierarchyBuilder';

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

    update(builder: CommandBuilder) {
        return builder.setArguments(this.getArguments());
    }

    private getArguments(): string {
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
    private testItems = new Map<string, Map<string, CustomWeakMap<TestItem, TestCase>>>();

    constructor(private ctrl: TestController, phpUnitXML: PHPUnitXML) {
        super(phpUnitXML);
    }

    getTestCase(test: TestItem): TestCase | undefined {
        for (const [, testData] of this.getTestData()) {
            const testCase = testData.get(test);
            if (testCase) {
                return testCase;
            }
        }

        return;
    }

    findTestsByFile(uri: URI): TestItem[] {
        const tests = [] as TestItem[];
        for (const [test, testCase] of this.getTestCases(uri)) {
            if (testCase.type === TestType.class) {
                tests.push(test);
            }
        }

        return tests;
    }

    findTestByPosition(uri: URI, position: Position): TestItem | undefined {
        for (const [test, testCase] of this.getTestCases(uri)) {
            if (inRange(test, testCase, position)) {
                return test;
            }
        }

        return;
    }

    reset() {
        for (const [, testData] of this.getTestData()) {
            for (const [testItem] of testData) {
                testItem.parent ? testItem.parent.children.delete(testItem.id) : this.ctrl.items.delete(testItem.id);
            }
        }

        return super.reset();
    }

    protected async parseTests(uri: URI) {
        const testParser = new TestParser();
        const testHierarchyBuilder = new TestHierarchyBuilder(testParser, this.ctrl);
        const testDefinitionBuilder = new TestDefinitionBuilder(testParser);
        await testParser.parseFile(uri.fsPath);

        const testData = this.getTestCases(uri);
        for (const [testItem, testCase] of testHierarchyBuilder.get()) {
            testData.set(testItem, testCase);
        }

        return testDefinitionBuilder.get();
    }

    protected deleteFile(file: File<TestDefinition>) {
        this.findTestsByFile(URI.file(file.file)).forEach((testItem) => {
            testItem.parent ? testItem.parent.children.delete(testItem.id) : this.ctrl.items.delete(testItem.id);
        });

        return super.deleteFile(file);
    }

    private getTestCases(uri: URI) {
        const testData = this.getTestData();
        if (!testData.has(uri.fsPath)) {
            testData.set(uri.fsPath, new CustomWeakMap<TestItem, TestCase>());
        }

        return testData.get(uri.fsPath)!;
    }

    private getTestData() {
        const workspace = this.getWorkspace();
        if (!this.testItems.has(workspace)) {
            this.testItems.set(workspace, new Map<string, CustomWeakMap<TestItem, TestCase>>());
        }

        return this.testItems.get(workspace)!;
    }
}