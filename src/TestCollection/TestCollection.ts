import { Position, TestController, TestItem } from 'vscode';
import { URI } from 'vscode-uri';
import {
    CustomWeakMap, File, PHPUnitXML, TestCollection as BaseTestCollection, TestDefinition, TestType,
} from '../PHPUnit';
import { TestCase } from './TestCase';
import { TestHierarchyBuilder } from './TestHierarchyBuilder';

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
        for (const type of [TestType.method, TestType.describe]) {
            for (const [test, testCase] of this.getTestCases(uri)) {
                if (testCase.type === type && testCase.inRange(test, position)) {
                    return test;
                }
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
        const { testParser, testDefinitionBuilder } = this.createTestParser();
        const testHierarchyBuilder = new TestHierarchyBuilder(testParser, this.ctrl);
        await testParser.parseFile(uri.fsPath);

        const testData = this.getTestCases(uri);
        for (const [testItem, testCase] of testHierarchyBuilder.get()) {
            testData.set(testItem, testCase);
        }

        return testDefinitionBuilder.get();
    }

    protected deleteFile(file: File<TestDefinition>) {
        this.findTestsByFile(file.uri).forEach((testItem) => {
            testItem.parent ? testItem.parent.children.delete(testItem.id) : this.ctrl.items.delete(testItem.id);
        });

        return super.deleteFile(file);
    }

    private getTestCases(uri: URI) {
        const testData = this.getTestData();
        if (!testData.has(uri.toString())) {
            testData.set(uri.toString(), new CustomWeakMap<TestItem, TestCase>());
        }

        return testData.get(uri.toString())!;
    }

    private getTestData() {
        const workspace = this.getWorkspace();
        if (!this.testItems.has(workspace.fsPath)) {
            this.testItems.set(workspace.fsPath, new Map<string, CustomWeakMap<TestItem, TestCase>>());
        }

        return this.testItems.get(workspace.fsPath)!;
    }
}