import { Position, TestItem } from 'vscode';
import { CommandBuilder, TestDefinition, TestType } from '../PHPUnit';
import { FilterStrategyFactory } from './FilterStrategy';

export class TestCase {
    constructor(private testDefinition: TestDefinition) { }

    get type() {
        return this.testDefinition.type;
    }

    update(command: CommandBuilder) {
        return command.clone().setArguments(FilterStrategyFactory.getStrategy(this.testDefinition).getFilter());
    }

    inRange = (test: TestItem, position: Position) => {
        if (![TestType.describe, TestType.method].includes(this.type)) {
            return false;
        }

        return position.line >= test.range!.start.line && position.line <= test.range!.end.line;
    };
}