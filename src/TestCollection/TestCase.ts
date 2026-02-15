import type { Position, TestItem } from 'vscode';
import {
    type TestDefinition,
    TestType,
} from '../PHPUnit';

export class TestCase {
    constructor(private testDefinition: TestDefinition) {}

    get type() {
        return this.testDefinition.type;
    }

    get definition() {
        return this.testDefinition;
    }

    inRange(test: TestItem, position: Position): boolean {
        if (this.type !== TestType.describe && this.type !== TestType.method) {
            return false;
        }

        return position.line >= test.range!.start.line && position.line <= test.range!.end.line;
    }
}
