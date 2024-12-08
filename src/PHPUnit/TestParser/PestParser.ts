import { Call, Declaration, Program, String } from 'php-parser';
import { pestProject } from '../__tests__/utils';
import { TestDefinition, TestParser, TestType } from './TestParser';

export class PestParser extends TestParser {
    protected parseAst(
        ast: Program,
        file: string,
    ): TestDefinition[] | undefined {
        return this.parseProgram(ast, file).map((method: any, index) => {
            this.eventEmitter.emit(`${TestType.method}`, method, index);

            return method;
        });
    }

    private parseProgram(program: Program, file: string) {
        return program.children
            .map((expressionStatement: any) => expressionStatement.expression)
            .map((call: Call & Declaration) => {
                const loc = call.loc!;
                const start = { line: loc.start.line, character: loc.start.column };
                const end = { line: loc.end.line, character: loc.end.column };
                // "/Users/recca0120/Desktop/vscode-phpunit/src/phpunit/__tests__/fixtures/pest-stub/tests/Unit/ExampleTest.php::example"
                const label = (call.arguments[0] as String).value;
                return {
                    type: TestType.method,
                    id: `${file.replace('/Users/recca0120/Desktop/vscode-phpunit/src/phpunit/__tests__/fixtures/pest-stub/', '')}::${label}`,
                    label: label,
                    method: label,
                    start,
                    end,
                    file,
                };
            });
        // export type TestDefinition = {
        //     type: TestType;
        //     id: string;
        //     label: string;
        //     namespace?: string;
        //     qualifiedClass?: string;
        //     class?: string;
        //     method?: string;
        //     parent?: TestDefinition;
        //     children?: TestDefinition[]
        //     file?: string;
        //     start?: Position;
        //     end?: Position;
        //     annotations?: Annotations;
        // };
    }
}