import { TestParser } from '../TestParser';
import { TestDefinition, TestType } from '../types';

export class TestDefinitionBuilder {
    private readonly testDefinitions: TestDefinition[] = [];

    constructor(private testParser: TestParser) {
        this.onInit();
    }

    onInit() {
        this.testParser.on(TestType.method, (testDefinition) => this.testDefinitions.push(testDefinition));
        this.testParser.on(TestType.describe, (testDefinition) => this.testDefinitions.push(testDefinition));
        this.testParser.on(TestType.class, (testDefinition) => this.testDefinitions.push(testDefinition));
        this.testParser.on(TestType.namespace, (testDefinition) => this.testDefinitions.push(testDefinition));
    }

    get() {
        return this.testDefinitions;
    }
}