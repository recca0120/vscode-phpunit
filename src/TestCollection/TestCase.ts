import type { Position, TestItem } from 'vscode';
import {
    FilterStrategyFactory,
    type ProcessBuilder,
    type TestDefinition,
    TestType,
} from '../PHPUnit';

export class TestCase {
    constructor(private testDefinition: TestDefinition) {}

    get type() {
        return this.testDefinition.type;
    }

    configureProcessBuilder(builder: ProcessBuilder, index: number) {
        return builder
            .clone()
            .setXdebug(builder.getXdebug()?.clone().setIndex(index))
            .setArguments(FilterStrategyFactory.create(this.testDefinition).getFilter());
    }

    inRange = (test: TestItem, position: Position) => {
        if (![TestType.describe, TestType.method].includes(this.type)) {
            return false;
        }

        return position.line >= test.range!.start.line && position.line <= test.range!.end.line;
    };
}
