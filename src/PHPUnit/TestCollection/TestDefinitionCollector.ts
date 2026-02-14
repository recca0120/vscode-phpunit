import type { TestParser } from '../TestParser';
import { type TestDefinition, TestType } from '../types';

export class TestDefinitionCollector {
    private readonly testDefinitions: TestDefinition[] = [];

    constructor(private testParser: TestParser) {
        this.onInit();
    }

    onInit() {
        this.testParser.on(TestType.method, (testDefinition) =>
            this.testDefinitions.push(testDefinition),
        );
        this.testParser.on(TestType.describe, (testDefinition) =>
            this.testDefinitions.push(testDefinition),
        );
        this.testParser.on(TestType.class, (testDefinition) =>
            this.testDefinitions.push(testDefinition),
        );
        this.testParser.on(TestType.namespace, (testDefinition) =>
            this.testDefinitions.push(testDefinition),
        );
    }

    get() {
        return this.testDefinitions;
    }
}
