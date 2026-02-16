import type { TestParser } from '../TestParser';
import { type TestDefinition, TestType } from '../types';

export class TestDefinitionCollector {
    private readonly testDefinitions: TestDefinition[] = [];

    constructor(private testParser: TestParser) {
        this.onInit();
    }

    onInit() {
        for (const type of [
            TestType.method,
            TestType.describe,
            TestType.class,
            TestType.namespace,
        ] as const) {
            this.testParser.on(type, (testDefinition) => this.testDefinitions.push(testDefinition));
        }
    }

    get() {
        return this.testDefinitions;
    }
}
