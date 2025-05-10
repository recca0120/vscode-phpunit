import { Position, TestItem } from 'vscode';
import { Builder, TestDefinition, TestType } from '../PHPUnit';
import { FilterStrategyFactory } from '../PHPUnit/CommandBuilder/FilterStrategy';

export class TestCase {
    constructor(private testDefinition: TestDefinition) { }

    get type() {
        return this.testDefinition.type;
    }

    update(builder: Builder) {
        return builder.clone().setArguments(FilterStrategyFactory.getStrategy(this.testDefinition).getFilter());
    }

    inRange = (test: TestItem, position: Position) => {
        if (![TestType.describe, TestType.method].includes(this.type)) {
            return false;
        }

        return position.line >= test.range!.start.line && position.line <= test.range!.end.line;
    };
}