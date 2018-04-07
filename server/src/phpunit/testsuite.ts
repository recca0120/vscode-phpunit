import { JUnit, Test } from './junit';
import { Ast } from './ast';

export class Testsuite {
    constructor(private ast: Ast = new Ast(), private jUnit: JUnit = new JUnit()) {}

    parseAst(code: string): any[] {
        return this.ast.parse(code);
    }

    parseJUnit(code: string): Promise<Test[]> {
        return this.jUnit.parse(code);
    }
}
